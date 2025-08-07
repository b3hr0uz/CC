"""
Authentication service for JWT token management
"""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import jwt
from passlib.context import CryptContext
from loguru import logger

from app.core.config import get_settings

settings = get_settings()


class AuthService:
    """Service for handling authentication and JWT tokens"""
    
    def __init__(self):
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.secret_key = settings.SECRET_KEY
        self.algorithm = "HS256"
        self.access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
        self.refresh_token_expire_days = settings.REFRESH_TOKEN_EXPIRE_DAYS
    
    def create_access_token(self, user_id: str, additional_claims: Dict[str, Any] = None) -> str:
        """Create JWT access token"""
        now = datetime.utcnow()
        expire = now + timedelta(minutes=self.access_token_expire_minutes)
        
        payload = {
            "sub": str(user_id),
            "iat": now,
            "exp": expire,
            "type": "access"
        }
        
        if additional_claims:
            payload.update(additional_claims)
        
        try:
            token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
            return token
        except Exception as e:
            logger.error(f"Failed to create access token: {e}")
            raise
    
    def create_refresh_token(self, user_id: str) -> str:
        """Create JWT refresh token"""
        now = datetime.utcnow()
        expire = now + timedelta(days=self.refresh_token_expire_days)
        
        payload = {
            "sub": str(user_id),
            "iat": now,
            "exp": expire,
            "type": "refresh"
        }
        
        try:
            token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
            return token
        except Exception as e:
            logger.error(f"Failed to create refresh token: {e}")
            raise
    
    def verify_access_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode access token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Check token type
            if payload.get("type") != "access":
                raise jwt.InvalidTokenError("Invalid token type")
            
            # Check expiration
            if datetime.utcfromtimestamp(payload["exp"]) < datetime.utcnow():
                raise jwt.ExpiredSignatureError("Token expired")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Access token expired")
            raise
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid access token: {e}")
            raise
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            raise
    
    def verify_refresh_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode refresh token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Check token type
            if payload.get("type") != "refresh":
                raise jwt.InvalidTokenError("Invalid token type")
            
            # Check expiration
            if datetime.utcfromtimestamp(payload["exp"]) < datetime.utcnow():
                raise jwt.ExpiredSignatureError("Token expired")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Refresh token expired")
            raise
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid refresh token: {e}")
            raise
        except Exception as e:
            logger.error(f"Refresh token verification failed: {e}")
            raise
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        try:
            return self.pwd_context.hash(password)
        except Exception as e:
            logger.error(f"Password hashing failed: {e}")
            raise
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        try:
            return self.pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            logger.error(f"Password verification failed: {e}")
            return False
    
    def decode_token(self, token: str, verify_exp: bool = True) -> Dict[str, Any]:
        """Decode JWT token without verification (for debugging)"""
        try:
            options = {"verify_exp": verify_exp, "verify_signature": False}
            payload = jwt.decode(token, options=options)
            return payload
        except Exception as e:
            logger.error(f"Token decoding failed: {e}")
            raise
    
    def is_token_expired(self, token: str) -> bool:
        """Check if token is expired without verifying signature"""
        try:
            payload = self.decode_token(token, verify_exp=False)
            exp = payload.get("exp")
            if exp:
                return datetime.utcfromtimestamp(exp) < datetime.utcnow()
            return True
        except Exception:
            return True
    
    def get_token_remaining_time(self, token: str) -> Optional[timedelta]:
        """Get remaining time before token expires"""
        try:
            payload = self.decode_token(token, verify_exp=False)
            exp = payload.get("exp")
            if exp:
                exp_datetime = datetime.utcfromtimestamp(exp)
                remaining = exp_datetime - datetime.utcnow()
                return remaining if remaining.total_seconds() > 0 else None
            return None
        except Exception:
            return None 