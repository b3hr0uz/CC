"""
API v1 router setup
"""
from fastapi import APIRouter
from .endpoints import feedback, spam, embeddings, ollama

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

api_router.include_router(
    embeddings.router, 
    prefix="/embeddings", 
    tags=["embeddings"]
)

api_router.include_router(
    ollama.router, 
    prefix="/ollama", 
    tags=["ollama"]
)