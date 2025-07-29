"""
Feedback API endpoints for user corrections and model improvements
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel
import logging
from datetime import datetime
import json
import os

from app.core.database import get_db
from app.models.feedback import Feedback
from app.services.ml_service import get_ml_service

logger = logging.getLogger(__name__)

router = APIRouter()


class FeedbackCreate(BaseModel):
    """Schema for creating feedback"""
    email_id: UUID
    feedback_type: str = "spam_classification"
    original_prediction: str
    user_correction: str
    is_correct: bool
    confidence_rating: Optional[float] = None
    feedback_text: Optional[str] = None


class FeedbackResponse(BaseModel):
    """Schema for feedback responses"""
    id: UUID
    email_id: UUID
    feedback_type: str
    original_prediction: str
    user_correction: str
    is_correct: bool
    confidence_rating: Optional[float] = None
    feedback_text: Optional[str] = None
    processed: bool = False
    created_at: str
    
    class Config:
        from_attributes = True


class EmailFeatures(BaseModel):
    subject: str
    sender: str
    preview: str

class FeedbackRequest(BaseModel):
    user_id: str
    email_id: str
    feedback_type: str  # 'correct' or 'incorrect'
    predicted_class: str  # 'spam' or 'ham'
    confidence_score: float
    email_features: EmailFeatures
    timestamp: str

class FeedbackResponse(BaseModel):
    success: bool
    message: str
    feedback_id: Optional[str] = None
    model_updated: bool = False
    new_prediction: Optional[Dict[str, Any]] = None

# Store feedback data (in production, use proper database)
FEEDBACK_STORAGE = []


@router.post("/", response_model=FeedbackResponse)
async def submit_feedback(
    feedback_data: FeedbackCreate,
    db: AsyncSession = Depends(get_db)
):
    """Submit user feedback on predictions"""
    try:
        feedback = Feedback(
            email_id=feedback_data.email_id,
            feedback_type=feedback_data.feedback_type,
            original_prediction=feedback_data.original_prediction,
            user_correction=feedback_data.user_correction,
            is_correct=feedback_data.is_correct,
            confidence_rating=feedback_data.confidence_rating,
            feedback_text=feedback_data.feedback_text,
            processed=False
        )
        
        db.add(feedback)
        await db.commit()
        await db.refresh(feedback)
        
        return FeedbackResponse.from_orm(feedback)
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to submit feedback: {str(e)}")


@router.get("/", response_model=List[FeedbackResponse])
async def get_feedback(
    feedback_type: Optional[str] = Query(None),
    processed: Optional[bool] = Query(None),
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get feedback records"""
    try:
        query = select(Feedback)
        
        if feedback_type:
            query = query.where(Feedback.feedback_type == feedback_type)
        if processed is not None:
            query = query.where(Feedback.processed == processed)
            
        query = query.order_by(Feedback.created_at.desc()).limit(limit)
        
        result = await db.execute(query)
        feedback_records = result.scalars().all()
        
        return [FeedbackResponse.from_orm(fb) for fb in feedback_records]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get feedback: {str(e)}")


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(feedback: FeedbackRequest):
    """
    Submit user feedback for email classification.
    Implements reinforcement learning to improve model accuracy.
    """
    try:
        logger.info(f"📝 Received feedback from {feedback.user_id} for email {feedback.email_id}")
        
        # Generate feedback ID
        feedback_id = f"fb_{feedback.user_id}_{feedback.email_id}_{int(datetime.now().timestamp())}"
        
        # Store feedback data
        feedback_data = {
            "id": feedback_id,
            "user_id": feedback.user_id,
            "email_id": feedback.email_id,
            "feedback_type": feedback.feedback_type,
            "predicted_class": feedback.predicted_class,
            "confidence_score": feedback.confidence_score,
            "email_features": feedback.email_features.dict(),
            "timestamp": feedback.timestamp,
            "processed": False
        }
        
        FEEDBACK_STORAGE.append(feedback_data)
        
        # Process reinforcement learning
        ml_service = get_ml_service()
        model_updated = False
        new_prediction = None
        
        try:
            # Determine correct label based on feedback
            if feedback.feedback_type == "correct":
                # User confirms the classification is correct - positive reinforcement
                correct_label = feedback.predicted_class
                reward = 1.0
            else:
                # User says classification is incorrect - negative reinforcement
                correct_label = "ham" if feedback.predicted_class == "spam" else "spam"
                reward = -1.0
            
            logger.info(f"🎯 Applying reinforcement learning: {feedback.feedback_type} feedback, reward: {reward}")
            
            # Extract features from email for training
            email_text = f"{feedback.email_features.subject} {feedback.email_features.sender} {feedback.email_features.preview}"
            
            # Apply reinforcement learning update
            update_result = ml_service.apply_feedback_learning(
                email_text=email_text,
                predicted_class=feedback.predicted_class,
                correct_class=correct_label,
                confidence=feedback.confidence_score,
                reward=reward,
                user_id=feedback.user_id
            )
            
            if update_result.get("model_updated"):
                model_updated = True
                # Get new prediction with updated model
                new_prediction = ml_service.predict_email_class(email_text)
                logger.info(f"✅ Model updated! New prediction: {new_prediction}")
            
            # Mark feedback as processed
            feedback_data["processed"] = True
            feedback_data["reward"] = reward
            feedback_data["correct_label"] = correct_label
            
        except Exception as ml_error:
            logger.error(f"❌ ML processing error: {ml_error}")
            # Continue without failing - feedback is still stored
        
        # Save feedback to file for persistence (in production, use proper database)
        try:
            feedback_file = "data/user_feedback.json"
            os.makedirs(os.path.dirname(feedback_file), exist_ok=True)
            
            existing_feedback = []
            if os.path.exists(feedback_file):
                with open(feedback_file, 'r') as f:
                    existing_feedback = json.load(f)
            
            existing_feedback.append(feedback_data)
            
            with open(feedback_file, 'w') as f:
                json.dump(existing_feedback, f, indent=2)
                
        except Exception as save_error:
            logger.error(f"❌ Error saving feedback to file: {save_error}")
        
        return FeedbackResponse(
            success=True,
            message=f"Feedback processed successfully. Model {'updated' if model_updated else 'will be updated in next training cycle'}.",
            feedback_id=feedback_id,
            model_updated=model_updated,
            new_prediction=new_prediction
        )
        
    except Exception as e:
        logger.error(f"❌ Error processing feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing feedback: {str(e)}")


@router.get("/stats")
async def get_feedback_stats(db: AsyncSession = Depends(get_db)):
    """Get feedback statistics"""
    try:
        # Total feedback
        total_result = await db.execute(select(func.count(Feedback.id)))
        total_feedback = total_result.scalar()
        
        # Correct predictions
        correct_result = await db.execute(
            select(func.count(Feedback.id)).where(Feedback.is_correct == True)
        )
        correct_predictions = correct_result.scalar()
        
        # Accuracy
        accuracy = (correct_predictions / total_feedback) if total_feedback > 0 else 0
        
        return {
            "total_feedback": total_feedback,
            "correct_predictions": correct_predictions,
            "incorrect_predictions": total_feedback - correct_predictions,
            "accuracy": accuracy,
            "improvement_needed": total_feedback - correct_predictions
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get feedback stats: {str(e)}")


@router.get("/feedback/stats")
async def get_feedback_stats():
    """Get feedback statistics for monitoring."""
    try:
        total_feedback = len(FEEDBACK_STORAGE)
        correct_feedback = len([f for f in FEEDBACK_STORAGE if f["feedback_type"] == "correct"])
        incorrect_feedback = len([f for f in FEEDBACK_STORAGE if f["feedback_type"] == "incorrect"])
        processed_feedback = len([f for f in FEEDBACK_STORAGE if f.get("processed", False)])
        
        return {
            "total_feedback": total_feedback,
            "correct_feedback": correct_feedback,
            "incorrect_feedback": incorrect_feedback,  
            "processed_feedback": processed_feedback,
            "accuracy_rate": correct_feedback / total_feedback if total_feedback > 0 else 0,
            "recent_feedback": FEEDBACK_STORAGE[-5:] if FEEDBACK_STORAGE else []
        }
    except Exception as e:
        logger.error(f"❌ Error getting feedback stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")


@router.put("/{feedback_id}/process")
async def process_feedback(
    feedback_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Mark feedback as processed"""
    try:
        result = await db.execute(
            select(Feedback).where(Feedback.id == feedback_id)
        )
        feedback = result.scalar_one_or_none()
        
        if not feedback:
            raise HTTPException(status_code=404, detail="Feedback not found")
        
        feedback.processed = True
        await db.commit()
        
        return {"message": "Feedback marked as processed"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process feedback: {str(e)}") 