"""
API v1 router setup
"""
from fastapi import APIRouter
from .endpoints import feedback, spam

# Create main API v1 router
api_router = APIRouter()

# Include all endpoint routers with their prefixes
api_router.include_router(
    feedback.router, 
    prefix="/feedback", 
    tags=["feedback"]
)

api_router.include_router(
    spam.router, 
    prefix="/spam", 
    tags=["spam"]
)