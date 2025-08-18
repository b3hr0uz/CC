"""
Enhanced logging configuration for ContextCleanse API
Provides structured, detailed logging with performance metrics and business context
"""

import logging
import json
import time
from datetime import datetime
from typing import Any, Dict, Optional
from contextlib import asynccontextmanager
import sys
from pathlib import Path

class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors and structured output"""
    
    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
        'RESET': '\033[0m'      # Reset
    }
    
    def format(self, record):
        # Add color to level name
        levelname = record.levelname
        if levelname in self.COLORS:
            colored_level = f"{self.COLORS[levelname]}{levelname:<8}{self.COLORS['RESET']}"
        else:
            colored_level = f"{levelname:<8}"
        
        # Create structured log entry
        timestamp = datetime.fromtimestamp(record.created).strftime('%H:%M:%S.%f')[:-3]
        
        # Build the log message
        parts = [
            f"🕒 {timestamp}",
            f"📍 {colored_level}",
            f"📄 {record.name}",
        ]
        
        # Add extra context if available
        if hasattr(record, 'user_id'):
            parts.append(f"👤 User:{record.user_id}")
        
        if hasattr(record, 'request_id'):
            parts.append(f"🔍 ReqID:{record.request_id}")
            
        if hasattr(record, 'duration_ms'):
            parts.append(f"⏱️  {record.duration_ms}ms")
            
        if hasattr(record, 'model_name'):
            parts.append(f"🤖 Model:{record.model_name}")
            
        if hasattr(record, 'email_count'):
            parts.append(f"📧 Emails:{record.email_count}")
        
        parts.append(f"💬 {record.getMessage()}")
        
        return " | ".join(parts)

class ContextCleanseLogger:
    """Enhanced logger for ContextCleanse with business context"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.setup_logger()
    
    def setup_logger(self):
        """Configure the logger with enhanced formatting"""
        if not self.logger.handlers:
            # Console handler with colors
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setFormatter(ColoredFormatter())
            
            # File handler for persistent logs
            log_dir = Path("logs")
            log_dir.mkdir(exist_ok=True)
            file_handler = logging.FileHandler(log_dir / "contextcleanse.log")
            file_handler.setFormatter(logging.Formatter(
                '%(asctime)s | %(levelname)-8s | %(name)s | %(message)s'
            ))
            
            self.logger.addHandler(console_handler)
            self.logger.addHandler(file_handler)
            self.logger.setLevel(logging.INFO)
    
    def log_api_request(self, method: str, path: str, client_ip: str, 
                       user_agent: str = None, user_id: str = None,
                       request_id: str = None):
        """Log incoming API requests"""
        extra = {}
        if user_id:
            extra['user_id'] = user_id
        if request_id:
            extra['request_id'] = request_id
            
        self.logger.info(
            f"🌐 {method} {path} from {client_ip} | Agent: {user_agent or 'Unknown'}",
            extra=extra
        )
    
    def log_api_response(self, method: str, path: str, status_code: int, 
                        duration_ms: float, response_size: int = None,
                        user_id: str = None, request_id: str = None):
        """Log API responses with performance metrics"""
        extra = {'duration_ms': f"{duration_ms:.2f}"}
        if user_id:
            extra['user_id'] = user_id
        if request_id:
            extra['request_id'] = request_id
            
        status_emoji = "✅" if status_code < 400 else "⚠️" if status_code < 500 else "❌"
        size_info = f" | Size: {response_size}B" if response_size else ""
        
        self.logger.info(
            f"{status_emoji} {method} {path} → {status_code}{size_info}",
            extra=extra
        )
    
    def log_ml_operation(self, operation: str, model_name: str = None, 
                        duration_ms: float = None, success: bool = True,
                        details: Dict[str, Any] = None):
        """Log ML operations with context"""
        extra = {}
        if model_name:
            extra['model_name'] = model_name
        if duration_ms:
            extra['duration_ms'] = f"{duration_ms:.2f}"
            
        emoji = "🤖" if success else "🔥"
        status = "SUCCESS" if success else "FAILED"
        details_str = ""
        if details:
            details_str = " | " + " | ".join([f"{k}:{v}" for k, v in details.items()])
            
        self.logger.info(
            f"{emoji} ML {operation} {status}{details_str}",
            extra=extra
        )
    
    def log_email_operation(self, operation: str, email_count: int = None,
                           user_email: str = None, duration_ms: float = None,
                           success: bool = True):
        """Log email-related operations"""
        extra = {}
        if email_count:
            extra['email_count'] = email_count
        if duration_ms:
            extra['duration_ms'] = f"{duration_ms:.2f}"
            
        emoji = "📧" if success else "📧💥"
        status = "SUCCESS" if success else "FAILED"
        user_info = f" for {user_email}" if user_email else ""
        
        self.logger.info(
            f"{emoji} Email {operation} {status}{user_info}",
            extra=extra
        )
    
    def log_database_operation(self, operation: str, table: str = None,
                              duration_ms: float = None, rows_affected: int = None,
                              success: bool = True):
        """Log database operations"""
        extra = {}
        if duration_ms:
            extra['duration_ms'] = f"{duration_ms:.2f}"
            
        emoji = "🗄️" if success else "🗄️💥"
        status = "SUCCESS" if success else "FAILED"
        table_info = f" on {table}" if table else ""
        rows_info = f" | Rows: {rows_affected}" if rows_affected else ""
        
        self.logger.info(
            f"{emoji} DB {operation} {status}{table_info}{rows_info}",
            extra=extra
        )
    
    def log_performance_metric(self, metric_name: str, value: float, 
                              unit: str = "ms", context: Dict[str, Any] = None):
        """Log performance metrics"""
        context_str = ""
        if context:
            context_str = " | " + " | ".join([f"{k}:{v}" for k, v in context.items()])
            
        self.logger.info(f"📊 Performance: {metric_name} = {value}{unit}{context_str}")
    
    def log_user_action(self, action: str, user_id: str = None, 
                       details: Dict[str, Any] = None, success: bool = True):
        """Log user actions and interactions"""
        extra = {}
        if user_id:
            extra['user_id'] = user_id
            
        emoji = "👤" if success else "👤💥"
        status = "SUCCESS" if success else "FAILED"
        details_str = ""
        if details:
            details_str = " | " + " | ".join([f"{k}:{v}" for k, v in details.items()])
            
        self.logger.info(
            f"{emoji} User action: {action} {status}{details_str}",
            extra=extra
        )
    
    def error(self, message: str, error: Exception = None, context: Dict[str, Any] = None):
        """Enhanced error logging"""
        extra = {}
        if context:
            extra.update(context)
            
        error_info = ""
        if error:
            error_info = f" | Error: {type(error).__name__}: {str(error)}"
            
        self.logger.error(f"❌ {message}{error_info}", extra=extra, exc_info=error)
    
    def warning(self, message: str, context: Dict[str, Any] = None):
        """Enhanced warning logging"""
        extra = context or {}
        self.logger.warning(f"⚠️ {message}", extra=extra)
    
    def info(self, message: str, context: Dict[str, Any] = None):
        """Enhanced info logging"""
        extra = context or {}
        self.logger.info(f"ℹ️ {message}", extra=extra)
    
    def debug(self, message: str, context: Dict[str, Any] = None):
        """Enhanced debug logging"""
        extra = context or {}
        self.logger.debug(f"🔍 {message}", extra=extra)

# Create global logger instance
def get_logger(name: str) -> ContextCleanseLogger:
    """Get enhanced logger instance"""
    return ContextCleanseLogger(name)

@asynccontextmanager
async def log_async_operation(logger: ContextCleanseLogger, operation: str, 
                             context: Dict[str, Any] = None):
    """Context manager for logging async operations with timing"""
    start_time = time.time()
    op_context = context or {}
    
    try:
        logger.info(f"🚀 Starting {operation}", op_context)
        yield
        duration_ms = (time.time() - start_time) * 1000
        logger.info(f"✅ Completed {operation}", {**op_context, 'duration_ms': f"{duration_ms:.2f}"})
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        logger.error(f"Failed {operation}", e, {**op_context, 'duration_ms': f"{duration_ms:.2f}"})
        raise
