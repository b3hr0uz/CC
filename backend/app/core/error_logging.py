"""
Enhanced error logging for ContextCleanse Backend
Provides detailed context for errors instead of generic messages
"""

import time
from typing import Dict, Any, Optional
from fastapi import HTTPException, Request
import traceback
from datetime import datetime, timedelta

from .logging import get_logger

logger = get_logger(__name__)

class AuthErrorLogger:
    """Enhanced logging for authentication errors"""
    
    @staticmethod
    def log_token_expiration(user_id: str = None, token_type: str = "access", 
                           provider: str = None, request: Request = None,
                           token_issued_at: datetime = None):
        """Log detailed token expiration context"""
        
        # Calculate token age
        token_age_minutes = None
        if token_issued_at:
            token_age_minutes = (datetime.utcnow() - token_issued_at).total_seconds() / 60
        
        # Extract request context
        endpoint = str(request.url.path) if request else "unknown"
        user_agent = request.headers.get("user-agent", "unknown") if request else "unknown"
        client_ip = request.client.host if request and request.client else "unknown"
        
        context = {
            'user_id': user_id,
            'token_type': token_type,
            'provider': provider,
            'token_age_minutes': round(token_age_minutes, 2) if token_age_minutes else None,
            'endpoint': endpoint,
            'client_ip': client_ip,
            'user_agent': user_agent,
            'security_event': True,
            'requires_user_action': True
        }
        
        logger.error("🔐 Authentication token expired - blocking request", context=context)
        
        # Log suspicious activity if token expired very quickly
        if token_age_minutes and token_age_minutes < 5:
            logger.warning("🚨 Suspicious: Token expired very quickly", {
                **context,
                'suspicious_activity': True,
                'investigation_needed': True
            })
    
    @staticmethod
    def log_auth_failure(reason: str, user_id: str = None, provider: str = None,
                        request: Request = None, attempt_count: int = 1):
        """Log authentication failures with context"""
        
        context = {
            'user_id': user_id,
            'provider': provider,
            'failure_reason': reason,
            'attempt_count': attempt_count,
            'client_ip': request.client.host if request and request.client else "unknown",
            'endpoint': str(request.url.path) if request else "unknown",
            'security_event': True,
            'brute_force_risk': attempt_count > 3
        }
        
        if attempt_count > 3:
            logger.error("🚨 Multiple authentication failures - potential brute force", context=context)
        else:
            logger.warning("🔒 Authentication failure", context=context)

class ServiceAvailabilityLogger:
    """Enhanced logging for service availability issues"""
    
    @staticmethod
    def log_service_unavailable(service_name: str, error: Exception = None,
                               endpoint: str = None, user_id: str = None,
                               fallback_used: bool = False, cached_data_age: int = None):
        """Log service unavailability with detailed context"""
        
        context = {
            'service': service_name,
            'endpoint': endpoint,
            'user_id': user_id,
            'fallback_active': fallback_used,
            'cached_data_age_minutes': cached_data_age,
            'error_type': type(error).__name__ if error else 'unknown',
            'error_message': str(error) if error else 'unknown',
            'service_health': 'degraded',
            'user_impact': 'none' if fallback_used else 'degraded'
        }
        
        if fallback_used:
            logger.warning(f"🟡 {service_name} unavailable - fallback active", context=context)
        else:
            logger.error(f"🔴 {service_name} unavailable - user impact", context=context)
    
    @staticmethod
    def log_fallback_activation(service_name: str, fallback_type: str,
                              data_age: int = None, user_id: str = None):
        """Log fallback system activation"""
        
        context = {
            'service': service_name,
            'fallback_type': fallback_type,
            'data_age_minutes': data_age,
            'user_id': user_id,
            'service_continuity': 'maintained',
            'user_experience': 'preserved'
        }
        
        logger.info(f"🛡️ Fallback activated for {service_name}", context=context)
    
    @staticmethod
    def log_service_recovery(service_name: str, downtime_seconds: float,
                           user_id: str = None):
        """Log service recovery"""
        
        downtime_minutes = round(downtime_seconds / 60, 2)
        
        context = {
            'service': service_name,
            'downtime_seconds': round(downtime_seconds, 2),
            'downtime_minutes': downtime_minutes,
            'user_id': user_id,
            'service_health': 'healthy',
            'fallback_deactivated': True,
            'full_functionality': 'restored'
        }
        
        logger.info(f"💚 {service_name} service recovered", context=context)

class MLErrorLogger:
    """Enhanced logging for ML operation errors"""
    
    @staticmethod
    def log_model_failure(model_name: str, operation: str, error: Exception,
                         input_data: Dict[str, Any] = None, user_id: str = None):
        """Log ML model failures with context"""
        
        context = {
            'model_name': model_name,
            'operation': operation,
            'user_id': user_id,
            'error_type': type(error).__name__,
            'error_message': str(error),
            'input_data_provided': bool(input_data),
            'model_health': 'failed',
            'fallback_recommended': True
        }
        
        if input_data:
            context['input_features'] = len(input_data) if isinstance(input_data, dict) else 'unknown'
        
        logger.error(f"🤖 ML model {operation} failed", error, context)
    
    @staticmethod
    def log_training_failure(model_name: str, error: Exception, 
                           dataset_size: int = None, user_id: str = None):
        """Log model training failures"""
        
        context = {
            'model_name': model_name,
            'operation': 'training',
            'user_id': user_id,
            'dataset_size': dataset_size,
            'error_type': type(error).__name__,
            'error_message': str(error),
            'training_status': 'failed',
            'model_availability': 'degraded'
        }
        
        logger.error(f"🔥 Model training failed for {model_name}", error, context)

class DatabaseErrorLogger:
    """Enhanced logging for database errors"""
    
    @staticmethod
    def log_connection_failure(error: Exception, retry_attempt: int = 1,
                             max_retries: int = 3):
        """Log database connection failures"""
        
        context = {
            'error_type': type(error).__name__,
            'error_message': str(error),
            'retry_attempt': retry_attempt,
            'max_retries': max_retries,
            'connection_status': 'failed',
            'automatic_retry': retry_attempt < max_retries,
            'escalation_needed': retry_attempt >= max_retries
        }
        
        if retry_attempt >= max_retries:
            logger.error("🗄️ Database connection failed - max retries exceeded", error, context)
        else:
            logger.warning(f"🗄️ Database connection failed - retry {retry_attempt}/{max_retries}", context=context)
    
    @staticmethod
    def log_query_performance_issue(query: str, duration_ms: float, 
                                  threshold_ms: float = 1000):
        """Log slow database queries"""
        
        context = {
            'query': query[:100] + '...' if len(query) > 100 else query,
            'duration_ms': round(duration_ms, 2),
            'threshold_ms': threshold_ms,
            'performance_impact': 'high' if duration_ms > threshold_ms * 2 else 'medium',
            'optimization_needed': True
        }
        
        logger.warning("🐌 Slow database query detected", context=context)

# Context manager for error tracking
class ErrorTracker:
    """Context manager for tracking operations and their errors"""
    
    def __init__(self, operation_name: str, user_id: str = None, 
                 context: Dict[str, Any] = None):
        self.operation_name = operation_name
        self.user_id = user_id
        self.context = context or {}
        self.start_time = None
        
    def __enter__(self):
        self.start_time = time.time()
        logger.debug(f"🚀 Starting {self.operation_name}", self.context)
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration_ms = (time.time() - self.start_time) * 1000
        
        context = {
            **self.context,
            'duration_ms': round(duration_ms, 2),
            'user_id': self.user_id
        }
        
        if exc_type is None:
            logger.info(f"✅ {self.operation_name} completed", context=context)
        else:
            context.update({
                'error_type': exc_type.__name__,
                'error_message': str(exc_val),
                'traceback': traceback.format_exception(exc_type, exc_val, exc_tb)[-5:],
                'operation_failed': True
            })
            logger.error(f"❌ {self.operation_name} failed", exc_val, context)
        
        return False  # Don't suppress exceptions

# Utility functions for common error scenarios
def log_api_error(endpoint: str, error: Exception, request: Request = None,
                 user_id: str = None):
    """Helper function to log API errors with context"""
    
    context = {
        'endpoint': endpoint,
        'user_id': user_id,
        'error_type': type(error).__name__,
        'error_message': str(error),
        'client_ip': request.client.host if request and request.client else 'unknown',
        'user_agent': request.headers.get('user-agent', 'unknown') if request else 'unknown',
        'api_error': True
    }
    
    logger.error(f"🌐 API error at {endpoint}", error, context)

def log_validation_error(field: str, value: Any, error_message: str,
                        user_id: str = None):
    """Helper function to log validation errors"""
    
    context = {
        'validation_field': field,
        'invalid_value': str(value)[:100],  # Limit value length
        'validation_error': error_message,
        'user_id': user_id,
        'input_validation': 'failed'
    }
    
    logger.warning(f"📝 Input validation failed for {field}", context=context)
