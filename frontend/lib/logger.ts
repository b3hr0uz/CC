/**
 * Enhanced logging system for ContextCleanse Frontend
 * Provides structured, detailed logging with user context and performance metrics
 */

interface LogContext {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  page?: string;
  component?: string;
  requestId?: string;
  duration?: number;
  [key: string]: any;
}

interface APICallContext extends LogContext {
  method: string;
  url: string;
  status?: number;
  responseSize?: number;
  requestBody?: any;
  responseData?: any;
}

interface UserActionContext extends LogContext {
  action: string;
  target?: string;
  value?: any;
  metadata?: Record<string, any>;
}

interface PerformanceContext extends LogContext {
  metric: string;
  value: number;
  unit?: string;
  threshold?: number;
}

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class ContextCleanseLogger {
  private static instance: ContextCleanseLogger;
  private logLevel: LogLevel = LogLevel.INFO;
  private sessionId: string;
  private userId?: string;
  private context: Record<string, any> = {};

  private constructor() {
    this.sessionId = this.generateSessionId();
    if (typeof window !== 'undefined') {
      this.setupGlobalErrorHandling();
      this.logSessionStart();
    }
  }

  static getInstance(): ContextCleanseLogger {
    if (!ContextCleanseLogger.instance) {
      ContextCleanseLogger.instance = new ContextCleanseLogger();
    }
    return ContextCleanseLogger.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getTimestamp(): string {
    return new Date().toISOString().split('T')[1].split('.')[0];
  }

  private formatMessage(
    level: string,
    message: string,
    context: LogContext = {},
    emoji: string = 'ℹ️'
  ): string {
    const timestamp = this.getTimestamp();
    const parts = [
      `🕒 ${timestamp}`,
      `📍 ${level.padEnd(8)}`,
      `🌐 Frontend`,
    ];

    // Add context information
    if (context.userId || this.userId) {
      parts.push(`👤 User:${context.userId || this.userId}`);
    }

    if (context.sessionId || this.sessionId) {
      parts.push(`🔍 Session:${(context.sessionId || this.sessionId).slice(-8)}`);
    }

    if (context.page) {
      parts.push(`📄 Page:${context.page}`);
    }

    if (context.component) {
      parts.push(`🧩 Component:${context.component}`);
    }

    if (context.duration !== undefined) {
      parts.push(`⏱️ ${context.duration}ms`);
    }

    if (context.requestId) {
      parts.push(`🔗 ReqID:${context.requestId}`);
    }

    parts.push(`💬 ${emoji} ${message}`);

    return parts.join(' | ');
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private logToConsole(level: LogLevel, message: string, data?: any) {
    const methods = [console.debug, console.info, console.warn, console.error];
    const method = methods[level] || console.info;
    
    if (data) {
      method(message, data);
    } else {
      method(message);
    }
  }

  private async sendToBackend(level: string, message: string, context: LogContext) {
    // Only send important logs to backend to avoid spam, and only on client side
    if (typeof window === 'undefined') return;
    
    if (level === 'ERROR' || level === 'WARN') {
      try {
        await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level,
            message,
            context: {
              ...context,
              sessionId: this.sessionId,
              userId: this.userId,
              timestamp: new Date().toISOString(),
              userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
              url: typeof window !== 'undefined' ? window.location.href : 'server'
            }
          })
        });
      } catch (error) {
        // Silently fail - don't log errors about logging
      }
    }
  }

  // Public logging methods
  setUserId(userId: string) {
    this.userId = userId;
    this.info('User session started', { userId });
  }

  setContext(key: string, value: any) {
    this.context[key] = value;
  }

  debug(message: string, context: LogContext = {}) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const formattedMessage = this.formatMessage('DEBUG', message, context, '🔍');
    this.logToConsole(LogLevel.DEBUG, formattedMessage, context);
  }

  info(message: string, context: LogContext = {}) {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const formattedMessage = this.formatMessage('INFO', message, context, 'ℹ️');
    this.logToConsole(LogLevel.INFO, formattedMessage, context);
  }

  warn(message: string, context: LogContext = {}) {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const formattedMessage = this.formatMessage('WARNING', message, context, '⚠️');
    this.logToConsole(LogLevel.WARN, formattedMessage, context);
    this.sendToBackend('WARN', message, context);
  }

  error(message: string, error?: Error, context: LogContext = {}) {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const errorContext = {
      ...context,
      errorName: error?.name,
      errorMessage: error?.message,
      errorStack: error?.stack
    };
    
    const formattedMessage = this.formatMessage('ERROR', message, errorContext, '❌');
    this.logToConsole(LogLevel.ERROR, formattedMessage, errorContext);
    this.sendToBackend('ERROR', message, errorContext);
  }

  // Specialized logging methods
  logPageView(page: string, loadTime?: number) {
    const context: LogContext = { page };
    if (loadTime !== undefined) {
      context.duration = loadTime;
    }
    
    this.info(`Page loaded: ${page}`, context);
  }

  logAPICall(context: APICallContext) {
    const { method, url, status, duration, requestBody, responseData, ...rest } = context;
    
    const emoji = status && status >= 400 ? '❌' : '✅';
    const message = `API ${method} ${url} → ${status || 'pending'}`;
    
    const logContext = {
      ...rest,
      duration,
      method,
      url,
      status,
      hasRequestBody: !!requestBody,
      responseSize: responseData ? JSON.stringify(responseData).length : undefined
    };

    if (status && status >= 400) {
      this.warn(message, logContext);
    } else {
      this.info(message, logContext);
    }

    // Log slow API calls
    if (duration && duration > 2000) {
      this.warn(`Slow API call detected`, {
        ...logContext,
        threshold: 2000
      });
    }
  }

  logUserAction(context: UserActionContext) {
    const { action, target, value, metadata, ...rest } = context;
    
    let message = `User action: ${action}`;
    if (target) message += ` on ${target}`;
    
    const logContext = {
      ...rest,
      action,
      target,
      value,
      metadata
    };

    this.info(message, logContext);
  }

  logPerformance(context: PerformanceContext) {
    const { metric, value, unit = 'ms', threshold, ...rest } = context;
    
    const message = `Performance: ${metric} = ${value}${unit}`;
    const logContext = { ...rest, metric, value, unit, threshold };

    // Log as warning if threshold exceeded
    if (threshold && value > threshold) {
      this.warn(`Performance threshold exceeded: ${message}`, logContext);
    } else {
      this.info(message, logContext);
    }
  }

  logEmailSync(emailCount: number, duration: number, success: boolean = true) {
    const emoji = success ? '📧' : '📧💥';
    const status = success ? 'SUCCESS' : 'FAILED';
    const message = `Email sync ${status}: ${emailCount} emails`;
    
    this.info(message, {
      component: 'EmailSync',
      emailCount,
      duration,
      success
    });
  }

  logModelTraining(modelName: string, duration: number, success: boolean = true, metrics?: Record<string, any>) {
    const emoji = success ? '🤖' : '🔥';
    const status = success ? 'SUCCESS' : 'FAILED';
    const message = `Model training ${status}: ${modelName}`;
    
    this.info(message, {
      component: 'ModelTraining',
      modelName,
      duration,
      success,
      metrics
    });
  }

  logSpamDetection(emailCount: number, spamCount: number, confidence: number, modelName: string) {
    const spamRate = ((spamCount / emailCount) * 100).toFixed(1);
    const message = `Spam detection completed: ${spamCount}/${emailCount} emails (${spamRate}%)`;
    
    this.info(message, {
      component: 'SpamDetection',
      emailCount,
      spamCount,
      spamRate: `${spamRate}%`,
      avgConfidence: confidence.toFixed(3),
      modelName
    });
  }

  logComponentMount(componentName: string, props?: Record<string, any>) {
    this.debug(`Component mounted: ${componentName}`, {
      component: componentName,
      props: props ? Object.keys(props) : undefined
    });
  }

  logComponentUnmount(componentName: string, duration?: number) {
    this.debug(`Component unmounted: ${componentName}`, {
      component: componentName,
      mountDuration: duration
    });
  }

  logRouteChange(from: string, to: string, duration?: number) {
    this.info(`Route changed: ${from} → ${to}`, {
      component: 'Router',
      fromRoute: from,
      toRoute: to,
      duration
    });
  }

  private logSessionStart() {
    if (typeof window === 'undefined') return;
    
    this.info('Frontend session started', {
      sessionId: this.sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'server',
      language: typeof navigator !== 'undefined' ? navigator.language : 'server',
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'server'
    });
  }

  private setupGlobalErrorHandling() {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('error', (event) => {
      this.error('Global error caught', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled promise rejection', event.reason instanceof Error ? event.reason : new Error(event.reason), {
        type: 'unhandledrejection'
      });
    });
  }

  // Performance monitoring
  startTimer(name: string): () => void {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.logPerformance({
        metric: name,
        value: Math.round(duration),
        unit: 'ms'
      });
      return duration;
    };
  }

  measureAsync<T>(name: string, asyncFn: () => Promise<T>): Promise<T> {
    const endTimer = this.startTimer(name);
    return asyncFn().finally(endTimer);
  }
}

// Create singleton instance
export const logger = ContextCleanseLogger.getInstance();

// React Hook for component logging
export function useLogger(componentName: string) {
  const componentLogger = {
    debug: (message: string, context?: LogContext) => 
      logger.debug(message, { ...context, component: componentName }),
    
    info: (message: string, context?: LogContext) => 
      logger.info(message, { ...context, component: componentName }),
    
    warn: (message: string, context?: LogContext) => 
      logger.warn(message, { ...context, component: componentName }),
    
    error: (message: string, error?: Error, context?: LogContext) => 
      logger.error(message, error, { ...context, component: componentName }),
    
    logMount: (props?: Record<string, any>) => 
      logger.logComponentMount(componentName, props),
    
    logUnmount: (duration?: number) => 
      logger.logComponentUnmount(componentName, duration),
    
    startTimer: (name: string) => logger.startTimer(`${componentName}.${name}`),
    
    measureAsync: <T>(name: string, asyncFn: () => Promise<T>) => 
      logger.measureAsync(`${componentName}.${name}`, asyncFn)
  };

  return componentLogger;
}

// API call wrapper with automatic logging
export async function loggedAPICall<T>(
  url: string,
  options: RequestInit = {},
  context: Partial<APICallContext> = {}
): Promise<T> {
  const startTime = performance.now();
  const method = options.method || 'GET';
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  // Log request start
  logger.debug(`Starting API call: ${method} ${url}`, {
    ...context,
    method,
    url,
    requestId
  });

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Request-ID': requestId,
        ...options.headers
      }
    });

    const duration = Math.round(performance.now() - startTime);
    const responseData = await response.json();

    // Log API call completion
    logger.logAPICall({
      ...context,
      method,
      url,
      status: response.status,
      duration,
      requestId,
      requestBody: options.body,
      responseData,
      responseSize: JSON.stringify(responseData).length
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return responseData;
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);
    
    logger.logAPICall({
      ...context,
      method,
      url,
      status: 0,
      duration,
      requestId,
      requestBody: options.body
    });

    logger.error(`API call failed: ${method} ${url}`, error as Error, {
      ...context,
      requestId,
      duration
    });

    throw error;
  }
}

export default logger;
