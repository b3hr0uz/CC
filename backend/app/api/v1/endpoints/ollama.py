"""
Ollama model management API endpoints
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class ModelDownloadRequest(BaseModel):
    """Request model for downloading Ollama models"""
    model_name: str
    force: bool = False


class ModelRemoveRequest(BaseModel):
    """Request model for removing Ollama models"""
    model_name: str


@router.get("/models", response_model=Dict[str, Any])
async def list_ollama_models():
    """
    List all available Ollama models with resource information
    Equivalent to 'ollama list' command but with enhanced details
    
    In non-demo mode: Returns error if Ollama not available (NO MOCK DATA)
    In demo mode: Would return mock data (if explicitly requested)
    """
    try:
        from app.services.ollama_service import OllamaService
        
        ollama_service = OllamaService()
        await ollama_service.initialize()
        
        # Never use mock data in production/non-demo mode
        models_info = await ollama_service.list_models(use_mock_for_demo=False)
        
        return {
            "status": "success",
            "data": models_info,
            "message": f"Found {models_info.get('total_models', 0)} Ollama models"
        }
        
    except ConnectionError as e:
        # Ollama service not available - return proper error instead of mock data
        logger.warning(f"Ollama service not available: {e}")
        return {
            "status": "error",
            "data": {
                "models": [],
                "total_models": 0,
                "error": "Ollama service not available",
                "details": str(e)
            },
            "message": "Ollama service is not running or not accessible"
        }
    except Exception as e:
        logger.error(f"Failed to list Ollama models: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list models: {str(e)}")


@router.post("/models/download", response_model=Dict[str, Any])
async def download_ollama_model(
    request: ModelDownloadRequest,
    background_tasks: BackgroundTasks
):
    """
    Download/pull an Ollama model with storage and RAM checks
    """
    try:
        from app.services.ollama_service import OllamaService
        
        ollama_service = OllamaService()
        await ollama_service.initialize()
        
        if not ollama_service.ready:
            return {
                "status": "error",
                "message": "Ollama service not available. Please ensure Ollama is installed and running.",
                "mock": True
            }
        
        # Check if model already exists
        existing_models = await ollama_service.list_models()
        model_names = [m["name"] for m in existing_models.get("models", [])]
        
        if request.model_name in model_names and not request.force:
            return {
                "status": "success",
                "message": f"Model {request.model_name} already exists. Use force=true to re-download.",
                "model_name": request.model_name,
                "already_exists": True
            }
        
        # Start download
        result = await ollama_service.download_model(request.model_name, request.force)
        
        if result["success"]:
            return {
                "status": "success",
                "data": result,
                "message": f"Successfully initiated download of {request.model_name}"
            }
        else:
            return {
                "status": "error",
                "data": result,
                "message": result.get("error", "Download failed")
            }
        
    except Exception as e:
        logger.error(f"Failed to download model {request.model_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")


@router.delete("/models/{model_name}", response_model=Dict[str, Any])
async def remove_ollama_model(model_name: str):
    """
    Remove/delete an Ollama model to free up storage space
    """
    try:
        from app.services.ollama_service import OllamaService
        
        ollama_service = OllamaService()
        await ollama_service.initialize()
        
        if not ollama_service.ready:
            return {
                "status": "error",
                "message": "Ollama service not available. Please ensure Ollama is installed and running.",
                "mock": True
            }
        
        # Check if model exists
        existing_models = await ollama_service.list_models()
        model_names = [m["name"] for m in existing_models.get("models", [])]
        
        if model_name not in model_names:
            return {
                "status": "error",
                "message": f"Model {model_name} not found",
                "model_name": model_name,
                "available_models": model_names
            }
        
        # Remove model
        result = await ollama_service.remove_model(model_name)
        
        if result["success"]:
            return {
                "status": "success",
                "data": result,
                "message": f"Successfully removed {model_name}"
            }
        else:
            return {
                "status": "error",
                "data": result,
                "message": result.get("error", "Removal failed")
            }
        
    except Exception as e:
        logger.error(f"Failed to remove model {model_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Removal failed: {str(e)}")


@router.get("/system/resources", response_model=Dict[str, Any])
async def get_system_resources():
    """
    Get system resource information (RAM, storage) for model management decisions
    """
    try:
        from app.services.ollama_service import OllamaService
        
        ollama_service = OllamaService()
        system_info = await ollama_service._get_system_resources()
        
        return {
            "status": "success",
            "data": system_info,
            "message": "System resources retrieved successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to get system resources: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get system info: {str(e)}")


@router.get("/recommendations", response_model=Dict[str, Any])
async def get_model_recommendations():
    """
    Get AI-powered recommendations for model management based on system resources
    """
    try:
        from app.services.ollama_service import OllamaService
        
        ollama_service = OllamaService()
        await ollama_service.initialize()
        
        models_info = await ollama_service.list_models()
        
        return {
            "status": "success",
            "data": {
                "recommendations": models_info.get("recommendations", []),
                "system_resources": models_info.get("system_resources", {}),
                "current_usage": {
                    "total_models": models_info.get("total_models", 0),
                    "total_storage_gb": models_info.get("total_storage_gb", 0),
                    "estimated_total_ram_gb": models_info.get("estimated_total_ram_gb", 0)
                }
            },
            "message": "Recommendations generated successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to generate recommendations: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {str(e)}")


@router.post("/health", response_model=Dict[str, Any])
async def check_ollama_health():
    """
    Health check for Ollama service
    """
    try:
        from app.services.ollama_service import OllamaService
        
        ollama_service = OllamaService()
        await ollama_service.initialize()
        
        is_healthy = await ollama_service.health_check()
        
        return {
            "status": "success" if is_healthy else "error",
            "data": {
                "healthy": is_healthy,
                "ready": ollama_service.ready,
                "base_url": ollama_service.base_url,
                "default_model": ollama_service.model,
                "embedding_model": ollama_service.embedding_model
            },
            "message": "Ollama is running and accessible" if is_healthy else "Ollama service is not accessible"
        }
        
    except Exception as e:
        logger.error(f"Ollama health check failed: {e}")
        return {
            "status": "error",
            "data": {
                "healthy": False,
                "ready": False,
                "error": str(e)
            },
            "message": f"Health check failed: {str(e)}"
        }