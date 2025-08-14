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

# Add root-level convenience routes that frontend expects
@api_router.get("/compare")
async def compare_models_root():
    """Root-level compare endpoint that redirects to feedback/models/compare"""
    from .endpoints.feedback import compare_models
    return await compare_models()

@api_router.get("/statistics") 
async def get_statistics_root():
    """Root-level statistics endpoint"""
    from .endpoints.feedback import get_dataset_statistics
    return await get_dataset_statistics()