"""
Ollama service for local LLM interactions
"""

import httpx
import asyncio
from typing import Dict, Any, List, Optional
from loguru import logger

from app.core.config import get_settings

settings = get_settings()


class OllamaService:
    """Service for interacting with Ollama local LLM"""
    
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL
        self.embedding_model = settings.OLLAMA_EMBEDDING_MODEL
        self.client = None
        self.ready = False
    
    async def initialize(self):
        """Initialize Ollama service"""
        try:
            logger.info("Initializing Ollama service...")
            
            # Create HTTP client
            self.client = httpx.AsyncClient(timeout=30.0)
            
            # Check if Ollama is available
            if await self.health_check():
                # Try to pull the model if not available
                await self._ensure_model_available()
                self.ready = True
                logger.info(f"✅ Ollama service ready (model: {self.model})")
            else:
                logger.warning("Ollama service not available, using mock responses")
                self.ready = False
                
        except Exception as e:
            logger.error(f"Failed to initialize Ollama service: {e}")
            self.ready = False
    
    async def health_check(self) -> bool:
        """Check if Ollama service is healthy"""
        try:
            if not self.client:
                return False
                
            response = await self.client.get(f"{self.base_url}/api/version")
            return response.status_code == 200
            
        except Exception as e:
            logger.debug(f"Ollama health check failed: {e}")
            return False
    
    async def _ensure_model_available(self):
        """Ensure the LLM model is pulled and available"""
        try:
            # Check if model exists
            response = await self.client.get(f"{self.base_url}/api/tags")
            if response.status_code == 200:
                models = response.json().get("models", [])
                model_names = [model["name"] for model in models]
                
                if self.model not in model_names:
                    logger.info(f"Pulling model {self.model}...")
                    # This would trigger model pull in a real scenario
                    # For development, we'll just log it
                    logger.info(f"Model {self.model} pull would be triggered here")
                else:
                    logger.info(f"Model {self.model} is available")
            
        except Exception as e:
            logger.warning(f"Could not verify model availability: {e}")
    
    async def generate_response(
        self,
        prompt: str,
        context: Optional[str] = None,
        max_tokens: int = 500,
        temperature: float = 0.7
    ) -> Dict[str, Any]:
        """
        Generate response from Ollama LLM
        
        Args:
            prompt: User prompt/question
            context: Additional context for RAG
            max_tokens: Maximum tokens to generate
            temperature: Generation temperature (0-1)
        
        Returns:
            Dict with response and metadata
        """
        if not self.ready or not await self.health_check():
            return await self._mock_response(prompt)
        
        try:
            # Build the full prompt with context
            full_prompt = prompt
            if context:
                full_prompt = f"Context: {context}\n\nQuestion: {prompt}"
            
            # Prepare request payload
            payload = {
                "model": self.model,
                "prompt": full_prompt,
                "stream": False,
                "options": {
                    "num_predict": max_tokens,
                    "temperature": temperature,
                    "top_p": 0.9,
                    "stop": ["</s>", "[INST]", "[/INST]"]
                }
            }
            
            # Make request to Ollama
            response = await self.client.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=60.0
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "response": result.get("response", ""),
                    "model": self.model,
                    "tokens_used": result.get("eval_count", 0),
                    "generation_time": result.get("total_duration", 0) / 1_000_000_000,  # Convert to seconds
                    "success": True
                }
            else:
                logger.error(f"Ollama generation failed: {response.status_code}")
                return await self._mock_response(prompt)
                
        except Exception as e:
            logger.error(f"Ollama generation error: {e}")
            return await self._mock_response(prompt)
    
    async def generate_embeddings(self, texts: List[str]) -> Dict[str, Any]:
        """
        Generate embeddings for texts using Ollama
        
        Args:
            texts: List of texts to embed
            
        Returns:
            Dict with embeddings and metadata
        """
        if not self.ready or not await self.health_check():
            return await self._mock_embeddings(texts)
        
        try:
            all_embeddings = []
            
            for text in texts:
                payload = {
                    "model": self.embedding_model,
                    "prompt": text
                }
                
                response = await self.client.post(
                    f"{self.base_url}/api/embeddings",
                    json=payload
                )
                
                if response.status_code == 200:
                    result = response.json()
                    embedding = result.get("embedding", [])
                    all_embeddings.append(embedding)
                else:
                    logger.warning(f"Failed to generate embedding for text: {text[:50]}...")
                    all_embeddings.append([0.0] * 384)  # Fallback embedding
            
            return {
                "embeddings": all_embeddings,
                "model": self.embedding_model,
                "dimension": len(all_embeddings[0]) if all_embeddings else 0,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Ollama embeddings error: {e}")
            return await self._mock_embeddings(texts)
    
    async def _mock_response(self, prompt: str) -> Dict[str, Any]:
        """Generate mock response for development"""
        mock_responses = {
            "spam": "This appears to be a legitimate email. The content doesn't contain typical spam indicators.",
            "ham": "This looks like a normal email communication.",
            "default": f"I understand you're asking about: {prompt[:100]}... This is a mock response for development purposes."
        }
        
        # Simple keyword matching for demo
        response_key = "default"
        if "spam" in prompt.lower():
            response_key = "spam"
        elif any(word in prompt.lower() for word in ["email", "message", "communication"]):
            response_key = "ham"
        
        return {
            "response": mock_responses[response_key],
            "model": "mock-llm",
            "tokens_used": len(prompt.split()) + 20,
            "generation_time": 0.5,
            "success": True,
            "mock": True
        }
    
    async def _mock_embeddings(self, texts: List[str]) -> Dict[str, Any]:
        """Generate mock embeddings for development"""
        import random
        
        # Generate random embeddings with consistent dimension
        embeddings = []
        for text in texts:
            # Use text hash as seed for consistent embeddings
            random.seed(hash(text) % (2**32))
            embedding = [random.uniform(-1, 1) for _ in range(384)]
            embeddings.append(embedding)
        
        return {
            "embeddings": embeddings,
            "model": "mock-embeddings",
            "dimension": 384,
            "success": True,
            "mock": True
        }
    
    async def list_models(self, use_mock_for_demo: bool = False) -> Dict[str, Any]:
        """List all available Ollama models with detailed information"""
        try:
            if not self.client:
                if use_mock_for_demo:
                    return await self._mock_model_list()
                else:
                    raise ConnectionError("Ollama client not available - service not running")
            
            response = await self.client.get(f"{self.base_url}/api/tags")
            if response.status_code == 200:
                data = response.json()
                models = data.get("models", [])
                
                # Enhanced model information with storage and RAM estimates
                enhanced_models = []
                for model in models:
                    model_info = {
                        "name": model.get("name", ""),
                        "size": model.get("size", 0),
                        "size_gb": round(model.get("size", 0) / (1024**3), 2),
                        "modified_at": model.get("modified_at", ""),
                        "digest": model.get("digest", ""),
                        "details": model.get("details", {}),
                        "estimated_ram_gb": self._estimate_ram_usage(model.get("size", 0)),
                        "model_type": self._get_model_type(model.get("name", "")),
                        "parameters": self._extract_parameters(model.get("name", ""))
                    }
                    enhanced_models.append(model_info)
                
                # Sort by size (largest first)
                enhanced_models.sort(key=lambda x: x["size"], reverse=True)
                
                # System resource info
                system_info = await self._get_system_resources()
                
                return {
                    "models": enhanced_models,
                    "total_models": len(enhanced_models),
                    "total_storage_gb": round(sum(m["size"] for m in models) / (1024**3), 2),
                    "estimated_total_ram_gb": sum(m["estimated_ram_gb"] for m in enhanced_models),
                    "system_resources": system_info,
                    "recommendations": self._get_model_recommendations(enhanced_models, system_info),
                    "success": True
                }
            else:
                if use_mock_for_demo:
                    logger.warning(f"Failed to list models: {response.status_code}, using mock data for demo")
                    return await self._mock_model_list()
                else:
                    raise ConnectionError(f"Ollama API returned status {response.status_code}")
                
        except Exception as e:
            if use_mock_for_demo:
                logger.warning(f"Error listing models: {e}, using mock data for demo")
                return await self._mock_model_list()
            else:
                logger.error(f"Error listing models: {e}")
                raise
    
    async def download_model(self, model_name: str, force: bool = False) -> Dict[str, Any]:
        """Download/pull an Ollama model with progress tracking"""
        try:
            if not self.client:
                return {
                    "success": False,
                    "error": "Ollama client not available",
                    "mock": True
                }
            
            # Check system resources before downloading
            system_info = await self._get_system_resources()
            estimated_size = self._estimate_model_size(model_name)
            
            # Storage check
            if system_info["available_storage_gb"] < estimated_size * 1.2:  # 20% buffer
                return {
                    "success": False,
                    "error": f"Insufficient storage space. Need {estimated_size:.1f}GB, available {system_info['available_storage_gb']:.1f}GB",
                    "required_storage_gb": estimated_size,
                    "available_storage_gb": system_info["available_storage_gb"]
                }
            
            # RAM check
            estimated_ram = self._estimate_ram_usage(estimated_size * 1024**3)
            if system_info["available_ram_gb"] < estimated_ram:
                logger.warning(f"Limited RAM for {model_name}. Estimated need: {estimated_ram}GB, available: {system_info['available_ram_gb']:.1f}GB")
            
            # Start model pull
            logger.info(f"Downloading model: {model_name} (estimated size: {estimated_size:.1f}GB)")
            
            payload = {
                "name": model_name,
                "insecure": False,
                "stream": False  # For simplicity, disable streaming
            }
            
            response = await self.client.post(
                f"{self.base_url}/api/pull",
                json=payload,
                timeout=1800.0  # 30 minutes timeout for large models
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "model_name": model_name,
                    "status": result.get("status", "completed"),
                    "message": f"Successfully downloaded {model_name}",
                    "estimated_size_gb": estimated_size,
                    "estimated_ram_gb": estimated_ram
                }
            else:
                error_msg = f"Failed to download {model_name}: HTTP {response.status_code}"
                logger.error(error_msg)
                return {
                    "success": False,
                    "error": error_msg,
                    "model_name": model_name
                }
                
        except Exception as e:
            error_msg = f"Error downloading model {model_name}: {e}"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg,
                "model_name": model_name
            }
    
    async def remove_model(self, model_name: str) -> Dict[str, Any]:
        """Remove/delete an Ollama model to free up storage"""
        try:
            if not self.client:
                return {
                    "success": False,
                    "error": "Ollama client not available",
                    "mock": True
                }
            
            # Get model info before deletion
            models_info = await self.list_models()
            model_info = None
            for model in models_info.get("models", []):
                if model["name"] == model_name:
                    model_info = model
                    break
            
            payload = {"name": model_name}
            
            response = await self.client.delete(
                f"{self.base_url}/api/delete",
                json=payload
            )
            
            if response.status_code == 200:
                freed_storage = model_info["size_gb"] if model_info else 0
                return {
                    "success": True,
                    "model_name": model_name,
                    "message": f"Successfully removed {model_name}",
                    "freed_storage_gb": freed_storage,
                    "freed_ram_estimate_gb": model_info["estimated_ram_gb"] if model_info else 0
                }
            else:
                error_msg = f"Failed to remove {model_name}: HTTP {response.status_code}"
                logger.error(error_msg)
                return {
                    "success": False,
                    "error": error_msg,
                    "model_name": model_name
                }
                
        except Exception as e:
            error_msg = f"Error removing model {model_name}: {e}"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg,
                "model_name": model_name
            }
    
    def _estimate_model_size(self, model_name: str) -> float:
        """Estimate model size in GB based on model name"""
        # Common model size estimates
        size_estimates = {
            "llama2:7b": 3.8,
            "llama2:13b": 7.3,
            "llama2:70b": 39.0,
            "mistral:7b": 4.1,
            "codellama:7b": 3.8,
            "codellama:13b": 7.3,
            "phi:2.7b": 1.6,
            "gemma:2b": 1.4,
            "gemma:7b": 4.8,
            "qwen:4b": 2.3,
            "qwen:7b": 4.2,
            "nomic-embed-text": 0.3
        }
        
        # Extract base model name
        base_name = model_name.split(":")[0] + ":" + model_name.split(":")[1] if ":" in model_name else model_name
        
        return size_estimates.get(base_name, 4.0)  # Default 4GB estimate
    
    def _estimate_ram_usage(self, size_bytes: int) -> float:
        """Estimate RAM usage based on model size"""
        size_gb = size_bytes / (1024**3)
        # RAM usage is typically 1.2-1.5x model size for inference
        return round(size_gb * 1.3, 1)
    
    def _get_model_type(self, model_name: str) -> str:
        """Determine model type from name"""
        if "embed" in model_name.lower():
            return "embedding"
        elif "code" in model_name.lower():
            return "code"
        elif "instruct" in model_name.lower():
            return "instruct"
        else:
            return "chat"
    
    def _extract_parameters(self, model_name: str) -> str:
        """Extract parameter count from model name"""
        import re
        match = re.search(r'(\d+\.?\d*)b', model_name.lower())
        return f"{match.group(1)}B" if match else "Unknown"
    
    async def _get_system_resources(self) -> Dict[str, Any]:
        """Get system resource information"""
        try:
            import psutil
            import shutil
            
            # Memory info
            memory = psutil.virtual_memory()
            
            # Disk space (where Ollama models are stored)
            disk_usage = shutil.disk_usage("/")
            
            return {
                "total_ram_gb": round(memory.total / (1024**3), 1),
                "available_ram_gb": round(memory.available / (1024**3), 1),
                "ram_usage_percent": memory.percent,
                "total_storage_gb": round(disk_usage.total / (1024**3), 1),
                "available_storage_gb": round(disk_usage.free / (1024**3), 1),
                "storage_usage_percent": round((disk_usage.used / disk_usage.total) * 100, 1)
            }
        except ImportError:
            # Fallback when psutil not available
            return {
                "total_ram_gb": 16.0,  # Conservative estimate
                "available_ram_gb": 8.0,
                "ram_usage_percent": 50.0,
                "total_storage_gb": 500.0,
                "available_storage_gb": 100.0,
                "storage_usage_percent": 80.0,
                "note": "Estimated values - install psutil for accurate readings"
            }
    
    def _get_model_recommendations(self, models: List[Dict], system_info: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on system resources and current models"""
        recommendations = []
        
        total_ram = system_info.get("total_ram_gb", 16)
        available_storage = system_info.get("available_storage_gb", 100)
        
        # RAM recommendations
        if total_ram < 8:
            recommendations.append("⚠️ Limited RAM detected. Consider using smaller models (2B-7B parameters)")
        elif total_ram >= 32:
            recommendations.append("✅ Ample RAM available. Can run larger models (13B+ parameters)")
        
        # Storage recommendations
        if available_storage < 10:
            recommendations.append("🔴 Low storage space. Consider removing unused models")
        elif available_storage < 50:
            recommendations.append("⚠️ Moderate storage space. Monitor disk usage when downloading models")
        
        # Model-specific recommendations
        large_models = [m for m in models if m.get("size_gb", 0) > 10]
        if large_models and total_ram < 16:
            recommendations.append("💡 Large models detected but limited RAM. Performance may be affected")
        
        if not models:
            recommendations.append("📥 No models installed. Consider downloading a starter model like 'llama2:7b'")
        
        return recommendations
    
    async def _mock_model_list(self) -> Dict[str, Any]:
        """Mock model list for development/testing"""
        return {
            "models": [
                {
                    "name": "llama2:7b",
                    "size": 3800000000,
                    "size_gb": 3.8,
                    "modified_at": "2024-01-01T00:00:00Z",
                    "digest": "mock-digest-1",
                    "details": {"family": "llama"},
                    "estimated_ram_gb": 4.9,
                    "model_type": "chat",
                    "parameters": "7B"
                }
            ],
            "total_models": 1,
            "total_storage_gb": 3.8,
            "estimated_total_ram_gb": 4.9,
            "system_resources": await self._get_system_resources(),
            "recommendations": ["📥 Mock data - Ollama not available"],
            "success": True,
            "mock": True
        }
    
    async def close(self):
        """Close the HTTP client"""
        if self.client:
            await self.client.aclose()
            self.client = None 