"""
Enhanced logging middleware for FastAPI
Automatically logs all requests/responses with performance metrics and context
"""

import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import StreamingResponse
import json

from ..core.logging import get_logger

logger = get_logger(__name__)

class EnhancedLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all HTTP requests and responses with detailed context"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate unique request ID
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id
        
        # Extract request information
        start_time = time.time()
        client_ip = self.get_client_ip(request)
        user_agent = request.headers.get("user-agent", "Unknown")
        method = request.method
        path = str(request.url.path)
        query_params = str(request.url.query) if request.url.query else None
        
        # Get request body size
        request_size = request.headers.get("content-length", "0")
        
        # Log incoming request
        logger.log_api_request(
            method=method,
            path=f"{path}{'?' + query_params if query_params else ''}",
            client_ip=client_ip,
            user_agent=user_agent,
            request_id=request_id
        )
        
        # Log request body for POST/PUT requests (excluding large files)
        if method in ["POST", "PUT", "PATCH"] and int(request_size) < 10000:
            try:
                body = await request.body()
                if body:
                    logger.debug(f"Request body: {body.decode()[:500]}...", {
                        'request_id': request_id
                    })
            except Exception:
                pass
        
        # Process request
        try:
            response = await call_next(request)
            
            # Calculate response time
            duration_ms = (time.time() - start_time) * 1000
            
            # Get response size if available
            response_size = None
            if hasattr(response, 'headers') and 'content-length' in response.headers:
                response_size = response.headers['content-length']
            
            # Log successful response
            logger.log_api_response(
                method=method,
                path=path,
                status_code=response.status_code,
                duration_ms=duration_ms,
                response_size=int(response_size) if response_size else None,
                request_id=request_id
            )
            
            # Log slow requests
            if duration_ms > 1000:  # Log requests slower than 1 second
                logger.warning(f"Slow request detected", {
                    'request_id': request_id,
                    'duration_ms': f"{duration_ms:.2f}",
                    'path': path,
                    'method': method
                })
            
            # Add request ID to response headers for tracing
            response.headers["X-Request-ID"] = request_id
            
            return response
            
        except Exception as e:
            # Calculate response time for failed requests
            duration_ms = (time.time() - start_time) * 1000
            
            # Log failed request
            logger.error(f"Request failed", e, {
                'request_id': request_id,
                'duration_ms': f"{duration_ms:.2f}",
                'path': path,
                'method': method,
                'client_ip': client_ip
            })
            
            raise
    
    def get_client_ip(self, request: Request) -> str:
        """Extract client IP from request headers"""
        # Check for forwarded IP (behind proxy/load balancer)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        forwarded = request.headers.get("x-forwarded")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to direct client IP
        if request.client:
            return request.client.host
        
        return "unknown"

class DatabaseLoggingMixin:
    """Mixin to add database operation logging"""
    
    def __init__(self):
        self.logger = get_logger(self.__class__.__name__)
    
    def log_db_query(self, query: str, params: dict = None, duration_ms: float = None):
        """Log database query execution"""
        params_str = f" | Params: {params}" if params else ""
        duration_str = f" | Duration: {duration_ms:.2f}ms" if duration_ms else ""
        
        self.logger.debug(f"🔍 DB Query: {query[:100]}...{params_str}{duration_str}")
    
    def log_db_result(self, operation: str, rows_affected: int = None, success: bool = True):
        """Log database operation results"""
        self.logger.log_database_operation(
            operation=operation,
            rows_affected=rows_affected,
            success=success
        )

class MLLoggingMixin:
    """Mixin to add ML operation logging"""
    
    def __init__(self):
        self.logger = get_logger(self.__class__.__name__)
    
    def log_model_training(self, model_name: str, duration_ms: float, 
                          metrics: dict = None, success: bool = True):
        """Log model training operations"""
        details = {}
        if metrics:
            details.update(metrics)
        
        self.logger.log_ml_operation(
            operation="TRAINING",
            model_name=model_name,
            duration_ms=duration_ms,
            success=success,
            details=details
        )
    
    def log_model_prediction(self, model_name: str, input_count: int,
                           confidence: float = None, duration_ms: float = None):
        """Log model prediction operations"""
        details = {'input_count': input_count}
        if confidence:
            details['confidence'] = f"{confidence:.3f}"
        
        self.logger.log_ml_operation(
            operation="PREDICTION",
            model_name=model_name,
            duration_ms=duration_ms,
            details=details
        )
    
    def log_model_loading(self, model_name: str, duration_ms: float, success: bool = True):
        """Log model loading operations"""
        self.logger.log_ml_operation(
            operation="LOADING",
            model_name=model_name,
            duration_ms=duration_ms,
            success=success
        )

class EmailLoggingMixin:
    """Mixin to add email operation logging"""
    
    def __init__(self):
        self.logger = get_logger(self.__class__.__name__)
    
    def log_email_fetch(self, user_email: str, count: int, duration_ms: float,
                       success: bool = True):
        """Log email fetching operations"""
        self.logger.log_email_operation(
            operation="FETCH",
            email_count=count,
            user_email=user_email,
            duration_ms=duration_ms,
            success=success
        )
    
    def log_email_classification(self, email_count: int, model_name: str,
                               duration_ms: float, accuracy: float = None):
        """Log email classification operations"""
        details = {'model': model_name}
        if accuracy:
            details['accuracy'] = f"{accuracy:.3f}"
        
        self.logger.log_ml_operation(
            operation="EMAIL_CLASSIFICATION",
            duration_ms=duration_ms,
            details=details
        )
    
    def log_spam_detection(self, email_count: int, spam_detected: int,
                          confidence_avg: float, duration_ms: float):
        """Log spam detection results"""
        details = {
            'total_emails': email_count,
            'spam_detected': spam_detected,
            'spam_rate': f"{(spam_detected/email_count)*100:.1f}%",
            'avg_confidence': f"{confidence_avg:.3f}"
        }
        
        self.logger.log_ml_operation(
            operation="SPAM_DETECTION",
            duration_ms=duration_ms,
            details=details
        )
