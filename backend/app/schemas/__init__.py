"""
Pydantic schemas for Context Cleanse API
"""

from .email import *

__all__ = [
    "EmailBase",
    "EmailCreate", 
    "EmailUpdate",
    "EmailResponse",
    "EmailList",
    "EmailStats",
    "SpamPrediction"
] 