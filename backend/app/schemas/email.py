"""
Pydantic schemas for email-related operations
"""

from pydantic import BaseModel, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID


class EmailBase(BaseModel):
    """Base email schema"""
    sender: Optional[str] = None
    recipient: Optional[str] = None
    subject: Optional[str] = None
    content: str
    content_type: str = "text/plain"
    
    @validator('content')
    def content_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Email content cannot be empty')
        return v


class EmailCreate(EmailBase):
    """Schema for creating emails"""
    source: str = "api"


class EmailUpdate(BaseModel):
    """Schema for updating emails"""
    subject: Optional[str] = None
    user_feedback: Optional[str] = None
    feedback_time: Optional[datetime] = None


class SpamPrediction(BaseModel):
    """Schema for spam prediction results"""
    is_spam: bool
    spam_probability: float
    confidence_score: float
    model_version: str
    features: Optional[Dict[str, Any]] = None


class EmailResponse(EmailBase):
    """Schema for email responses"""
    id: UUID
    is_spam: Optional[bool] = None
    spam_probability: Optional[float] = None
    confidence_score: Optional[float] = None
    model_version: Optional[str] = None
    processed: bool = False
    processing_error: Optional[str] = None
    user_feedback: Optional[str] = None
    feedback_time: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    source: Optional[str] = None
    
    class Config:
        from_attributes = True


class EmailList(BaseModel):
    """Schema for paginated email lists"""
    emails: List[EmailResponse]
    total: int
    page: int
    per_page: int
    pages: int


class EmailStats(BaseModel):
    """Schema for email statistics"""
    total_emails: int
    spam_emails: int
    ham_emails: int
    processed_emails: int
    pending_emails: int
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    last_updated: Optional[datetime] = None 