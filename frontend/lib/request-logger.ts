/**
 * Custom request logger for structured frontend logging
 */

export interface LogData {
  timestamp: string;
  method: string;
  path: string;
  status?: number;
  duration?: number;
  userAgent?: string;
  ip?: string;
  error?: string;
  userId?: string;
}

class RequestLogger {
  private static instance: RequestLogger;
  private isDevelopment = process.env.NODE_ENV === 'development';

  static getInstance(): RequestLogger {
    if (!RequestLogger.instance) {
      RequestLogger.instance = new RequestLogger();
    }
    return RequestLogger.instance;
  }

  private formatTimestamp(): string {
    return new Date().toISOString().split('T')[1].substring(0, 8);
  }

  private getStatusEmoji(status: number): string {
    if (status >= 200 && status < 300) return '✅';
    if (status >= 300 && status < 400) return '↩️';
    if (status >= 400 && status < 500) return '⚠️';
    if (status >= 500) return '❌';
    return '📡';
  }

  private getMethodEmoji(method: string): string {
    switch (method.toUpperCase()) {
      case 'GET': return '📥';
      case 'POST': return '📤';
      case 'PUT': return '🔄';
      case 'DELETE': return '🗑️';
      case 'PATCH': return '🔧';
      default: return '🌐';
    }
  }

  logRequest(data: LogData): void {
    const time = this.formatTimestamp();
    const methodEmoji = this.getMethodEmoji(data.method);
    const statusEmoji = data.status ? this.getStatusEmoji(data.status) : '⏳';
    
    if (data.status) {
      // Request completed
      const duration = data.duration ? `${data.duration}ms` : 'N/A';
      const userInfo = data.userId ? ` | 👤 ${data.userId}` : '';
      
      console.log(
        `🕒 ${time} | ${statusEmoji} ${methodEmoji} ${data.method} ${data.path} → ${data.status} | ⏱️ ${duration}${userInfo}`
      );
    } else {
      // Request started
      const userInfo = data.userId ? ` | 👤 ${data.userId}` : '';
      console.log(`🕒 ${time} | ${methodEmoji} ${data.method} ${data.path} | 🚀 Started${userInfo}`);
    }
  }

  logError(error: Error, path?: string): void {
    const time = this.formatTimestamp();
    console.error(`🕒 ${time} | ❌ ERROR${path ? ` on ${path}` : ''}: ${error.message}`);
    
    if (this.isDevelopment && error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }

  logAuth(action: string, userId?: string, success: boolean = true): void {
    const time = this.formatTimestamp();
    const emoji = success ? '🔐' : '🚫';
    const userInfo = userId ? ` | 👤 ${userId}` : '';
    
    console.log(`🕒 ${time} | ${emoji} AUTH: ${action}${userInfo}`);
  }

  logAPI(endpoint: string, method: string, status: number, duration: number): void {
    const time = this.formatTimestamp();
    const methodEmoji = this.getMethodEmoji(method);
    const statusEmoji = this.getStatusEmoji(status);
    
    console.log(
      `🕒 ${time} | ${statusEmoji} ${methodEmoji} API ${method} ${endpoint} → ${status} | ⏱️ ${duration}ms`
    );
  }
}

export const logger = RequestLogger.getInstance();
