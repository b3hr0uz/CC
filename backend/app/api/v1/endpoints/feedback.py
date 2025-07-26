"""
Feedback API endpoints for user corrections and model improvements
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

from app.core.database import get_db
from app.models.feedback import Feedback

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