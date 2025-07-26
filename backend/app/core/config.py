"""
Configuration settings for Context Cleanse API
"""

from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings
from pydantic import validator
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "Context Cleanse API"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str = "postgresql://cc_user:cc_secure_pass_2024@localhost:5432/context_cleanse"
    DATABASE_ECHO: bool = False
    
    # Ollama LLM Service
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama2:7b"
    OLLAMA_EMBEDDING_MODEL: str = "nomic-embed-text"
    
    # Machine Learning
    ML_MODELS_PATH: str = "/app/models"
    SPAM_MODEL_NAME: str = "spam_classifier.onnx"
    VECTORIZER_NAME: str = "tfidf_vectorizer.pkl"
    
    # Embeddings
    SENTENCE_TRANSFORMER_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384
    
    # Performance Settings
    MAX_EMAIL_LENGTH: int = 10000
    BATCH_SIZE: int = 32
    MAX_CONCURRENT_REQUESTS: int = 10
    
    # Security
    SECRET_KEY: str = "context-cleanse-secret-key-change-in-production"
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1", "0.0.0.0", "*"]
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # OAuth - Google
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/auth/google/callback"
    
    # OAuth - Microsoft
    MICROSOFT_CLIENT_ID: str = ""
    MICROSOFT_CLIENT_SECRET: str = ""
    MICROSOFT_TENANT_ID: str = "common"  # Use 'common' for multi-tenant
    MICROSOFT_REDIRECT_URI: str = "http://localhost:3000/auth/microsoft/callback"
    
    # OAuth - Apple
    APPLE_CLIENT_ID: str = ""
    APPLE_TEAM_ID: str = ""
    APPLE_KEY_ID: str = ""
    APPLE_PRIVATE_KEY: str = ""  # Path to private key file or key content
    APPLE_REDIRECT_URI: str = "http://localhost:3000/auth/apple/callback"
    
    # Frontend URLs
    FRONTEND_URL: str = "http://localhost:3000"
    FRONTEND_AUTH_SUCCESS_URL: str = "http://localhost:3000/dashboard"
    FRONTEND_AUTH_ERROR_URL: str = "http://localhost:3000/auth/error"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}"
    
    # Email Processing
    SPAM_THRESHOLD: float = 0.5
    CONFIDENCE_THRESHOLD: float = 0.8
    
    # RAG Assistant Settings
    RAG_TOP_K: int = 5
    RAG_SIMILARITY_THRESHOLD: float = 0.7
    MAX_CONTEXT_LENGTH: int = 4000
    
    # Redis Cache (optional)
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL: int = 3600  # 1 hour
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    @validator("ALLOWED_HOSTS", pre=True)
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v
    
    @validator("DATABASE_URL", pre=True)
    def validate_database_url(cls, v):
        if not v:
            raise ValueError("DATABASE_URL is required")
        return v
    
    @property
    def oauth_providers_configured(self) -> List[str]:
        """Get list of configured OAuth providers"""
        providers = []
        if self.GOOGLE_CLIENT_ID and self.GOOGLE_CLIENT_SECRET:
            providers.append("google")
        if self.MICROSOFT_CLIENT_ID and self.MICROSOFT_CLIENT_SECRET:
            providers.append("microsoft") 
        if self.APPLE_CLIENT_ID and self.APPLE_TEAM_ID:
            providers.append("apple")
        return providers


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings() 