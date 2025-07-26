"""
Email classification API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from pydantic import BaseModel
import time
from loguru import logger

from app.core.database import get_db
from app.services.ml_service import MLService
from app.models.email import Email
from app.schemas.email import EmailCreate, EmailResponse, SpamPrediction

router = APIRouter()


class SpamCheckRequest(BaseModel):
    """Request model for spam check"""
    content: str
    sender: str = None
    subject: str = None
    recipient: str = None


class SpamCheckResponse(BaseModel):
    """Response model for spam check"""
    is_spam: bool
    confidence: float
    spam_probability: float
    processing_time_ms: float
    model_version: str
    features: Dict[str, Any] = None


@router.post("/check", response_model=SpamCheckResponse)
async def check_spam(
    request: SpamCheckRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Check if email content is spam
    Target: <300ms response time, ≥90% precision/recall
    """
    start_time = time.time()
    
    try:
        # Get ML service from app state
        from app.main import app
        ml_service: MLService = app.state.ml_service
        
        if not ml_service.is_ready():
            raise HTTPException(status_code=503, detail="ML service not ready")
        
        # Predict spam
        prediction = await ml_service.predict_spam(
            content=request.content,
            sender=request.sender,
            subject=request.subject
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        # Store email in background for analysis
        background_tasks.add_task(
            store_email_prediction,
            db=db,
            request=request,
            prediction=prediction,
            processing_time=processing_time
        )
        
        return SpamCheckResponse(
            is_spam=prediction["is_spam"],
            confidence=prediction["confidence"],
            spam_probability=prediction["probability"],
            processing_time_ms=processing_time,
            model_version=prediction["model_version"],
            features=prediction.get("features") if prediction.get("features") else {}
        )
        
    except Exception as e:
        logger.error(f"Spam check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Spam check failed: {str(e)}")


@router.post("/batch", response_model=List[SpamCheckResponse])
async def check_spam_batch(
    requests: List[SpamCheckRequest],
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Batch spam checking for multiple emails
    """
    if len(requests) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 emails per batch")
    
    start_time = time.time()
    
    try:
        from app.main import app
        ml_service: MLService = app.state.ml_service
        
        if not ml_service.is_ready():
            raise HTTPException(status_code=503, detail="ML service not ready")
        
        # Process batch
        results = []
        for request in requests:
            prediction = await ml_service.predict_spam(
                content=request.content,
                sender=request.sender,
                subject=request.subject
            )
            
            processing_time = (time.time() - start_time) * 1000
            
            results.append(SpamCheckResponse(
                is_spam=prediction["is_spam"],
                confidence=prediction["confidence"],
                spam_probability=prediction["probability"],
                processing_time_ms=processing_time / len(requests),
                model_version=prediction["model_version"]
            ))
            
            # Store in background
            background_tasks.add_task(
                store_email_prediction,
                db=db,
                request=request,
                prediction=prediction,
                processing_time=processing_time / len(requests)
            )
        
        return results
        
    except Exception as e:
        logger.error(f"Batch spam check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Batch spam check failed: {str(e)}")


@router.get("/stats")
async def get_spam_stats(db: AsyncSession = Depends(get_db)):
    """Get email classification statistics"""
    try:
        # This would be implemented with proper database queries
        # For now, return mock data
        return {
            "total_emails_processed": 1000,
            "spam_detected": 150,
            "ham_detected": 850,
            "accuracy": 0.95,
            "precision": 0.93,
            "recall": 0.96,
            "avg_processing_time_ms": 120,
            "last_updated": "2024-01-01T00:00:00Z"
        }
    except Exception as e:
        logger.error(f"Failed to get spam stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get statistics")


async def store_email_prediction(
    db: AsyncSession,
    request: SpamCheckRequest,
    prediction: Dict[str, Any],
    processing_time: float
):
    """Background task to store email and prediction in database"""
    try:
        email = Email(
            sender=request.sender,
            recipient=request.recipient,
            subject=request.subject,
            content=request.content,
            is_spam=prediction["is_spam"],
            spam_probability=prediction["probability"],
            confidence_score=prediction["confidence"],
            model_version=prediction["model_version"],
            features=prediction.get("features"),
            processed=True,
            source="api"
        )
        
        db.add(email)
        await db.commit()
        
    except Exception as e:
        logger.error(f"Failed to store email prediction: {e}")
        await db.rollback() 