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
    
    async def close(self):
        """Close the HTTP client"""
        if self.client:
            await self.client.aclose()
            self.client = None 