/**
 * Enhanced authentication logging for ContextCleanse
 * Provides detailed context for auth failures instead of generic messages
 */

import { logger } from './logger';

interface AuthContext {
  userId?: string;
  sessionId?: string;
  tokenType?: 'access' | 'refresh' | 'id';
  provider?: 'google' | 'apple' | 'microsoft';
  lastActivity?: Date;
  tokenAge?: number; // in minutes
  action?: string; // what user was trying to do
  endpoint?: string; // API endpoint that triggered auth check
}

interface BackendAvailabilityContext {
  service: string;
  endpoint: string;
  httpStatus?: number;
  responseTime?: number;
  retryAttempt?: number;
  maxRetries?: number;
  fallbackUsed?: boolean;
  cachedDataAge?: number; // in minutes
  userImpact: 'none' | 'degraded' | 'blocked';
  recoveryAction?: string;
}

export class AuthLogger {
  
  static logTokenExpiration(context: AuthContext) {
    const {
      userId,
      sessionId,
      tokenType = 'access',
      provider,
      lastActivity,
      tokenAge,
      action,
      endpoint
    } = context;

    // Calculate session details
    const sessionDuration = lastActivity ? 
      Math.round((Date.now() - lastActivity.getTime()) / (1000 * 60)) : 
      undefined;
    
    const tokenAgeHours = tokenAge ? Math.round(tokenAge / 60 * 100) / 100 : undefined;

    logger.warn('🔐 Authentication token expired - user action required', {
      component: 'AuthSystem',
      userId,
      sessionId,
      tokenType,
      provider,
      tokenAgeMinutes: tokenAge,
      tokenAgeHours,
      sessionDurationMinutes: sessionDuration,
      lastActivity: lastActivity?.toISOString(),
      triggeredByAction: action,
      triggeredByEndpoint: endpoint,
      userImpact: 'blocked',
      recoveryAction: 'User must sign out and sign in again',
      securityLevel: 'normal', // vs 'suspicious' if very quick expiration
      autoRetryPossible: false
    });

    // Log user experience impact
    logger.logUserAction({
      action: 'AUTH_TOKEN_EXPIRED',
      component: 'AuthSystem',
      userId,
      sessionId,
      metadata: {
        wasUserActive: sessionDuration ? sessionDuration < 30 : undefined,
        tokenType,
        provider,
        interruptedAction: action
      }
    });

    // Log performance impact
    logger.logPerformance({
      metric: 'auth_token_lifetime',
      value: tokenAge || 0,
      unit: 'minutes',
      threshold: 60, // Expected minimum lifetime
      component: 'AuthSystem',
      userId,
      metadata: { tokenType, provider }
    });
  }

  static logAuthRecoveryAttempt(success: boolean, context: AuthContext) {
    const message = success ? 
      '✅ User successfully re-authenticated after token expiration' :
      '❌ User failed to re-authenticate - potential UX issue';
    
    const logMethod = success ? 'info' : 'warn';
    
    logger[logMethod](message, {
      component: 'AuthRecovery',
      userId: context.userId,
      sessionId: context.sessionId,
      provider: context.provider,
      recoverySuccess: success,
      originalAction: context.action,
      userExperienceFlow: success ? 'smooth' : 'interrupted'
    });
  }

  static logSuspiciousAuthActivity(context: AuthContext & { reason: string }) {
    logger.error('🚨 Suspicious authentication activity detected', undefined, {
      component: 'AuthSecurity',
      userId: context.userId,
      sessionId: context.sessionId,
      provider: context.provider,
      suspiciousReason: context.reason,
      tokenAge: context.tokenAge,
      lastActivity: context.lastActivity?.toISOString(),
      requiresInvestigation: true,
      securityThreat: 'medium'
    });
  }
}

export class BackendAvailabilityLogger {
  
  static logBackendUnavailable(context: BackendAvailabilityContext) {
    const {
      service,
      endpoint,
      httpStatus,
      responseTime,
      retryAttempt = 0,
      maxRetries = 3,
      fallbackUsed,
      cachedDataAge,
      userImpact,
      recoveryAction
    } = context;

    const severity = userImpact === 'blocked' ? 'error' : 
                    userImpact === 'degraded' ? 'warn' : 'info';

    const emoji = userImpact === 'blocked' ? '🔴' : 
                 userImpact === 'degraded' ? '🟡' : '🟢';

    const logMethod = severity as 'error' | 'warn' | 'info';

    logger[logMethod](`${emoji} Backend service unavailable - ${this.getUserImpactDescription(userImpact)}`, {
      component: 'BackendConnectivity',
      service,
      endpoint,
      httpStatus,
      responseTimeMs: responseTime,
      retryAttempt,
      maxRetries,
      retryProgress: `${retryAttempt}/${maxRetries}`,
      fallbackActive: fallbackUsed,
      cachedDataAgeMinutes: cachedDataAge,
      userImpact,
      recoveryAction,
      serviceHealth: 'degraded',
      automaticRetry: retryAttempt < maxRetries,
      escalationNeeded: retryAttempt >= maxRetries
    });

    // Log performance impact
    if (responseTime) {
      logger.logPerformance({
        metric: `${service}_response_time`,
        value: responseTime,
        unit: 'ms',
        threshold: 5000,
        component: 'BackendService',
        metadata: { service, endpoint, status: 'failed' }
      });
    }

    // Log user experience impact
    logger.logUserAction({
      action: 'BACKEND_SERVICE_UNAVAILABLE',
      component: 'BackendService',
      metadata: {
        service,
        userImpact,
        fallbackUsed,
        dataFreshness: cachedDataAge ? `${cachedDataAge}min old` : 'live'
      }
    });
  }

  static logFallbackActivated(context: BackendAvailabilityContext & { 
    fallbackType: 'cached_data' | 'local_processing' | 'mock_data' 
  }) {
    logger.info('🛡️ Fallback system activated - maintaining user experience', {
      component: 'FallbackSystem',
      service: context.service,
      fallbackType: context.fallbackType,
      cachedDataAgeMinutes: context.cachedDataAge,
      userImpactMitigated: true,
      serviceContinuity: 'maintained',
      dataReliability: context.fallbackType === 'cached_data' ? 'high' : 
                      context.fallbackType === 'local_processing' ? 'medium' : 'low',
      backgroundRecovery: 'active'
    });
  }

  static logServiceRecovery(service: string, downtime: number, context?: any) {
    logger.info('💚 Backend service recovered - full functionality restored', {
      component: 'ServiceRecovery',
      service,
      downtimeMinutes: Math.round(downtime / 1000 / 60 * 100) / 100,
      serviceHealth: 'healthy',
      userImpact: 'resolved',
      systemStatus: 'normal',
      fallbackDeactivated: true,
      ...context
    });

    // Log recovery performance
    logger.logPerformance({
      metric: 'service_recovery_time',
      value: downtime,
      unit: 'ms',
      component: 'ServiceRecovery',
      metadata: { service }
    });
  }

  private static getUserImpactDescription(impact: BackendAvailabilityContext['userImpact']): string {
    switch (impact) {
      case 'none': return 'no user impact (fallback active)';
      case 'degraded': return 'reduced functionality (cached data in use)';
      case 'blocked': return 'user action blocked (manual retry required)';
      default: return 'unknown impact';
    }
  }
}

// Enhanced error boundary logging
export class ErrorBoundaryLogger {
  
  static logUnhandledError(error: Error, errorInfo: any, userContext: any) {
    logger.error('💥 Unhandled application error - user experience disrupted', error, {
      component: 'ErrorBoundary',
      errorBoundary: true,
      userId: userContext.userId,
      sessionId: userContext.sessionId,
      currentPage: userContext.currentPage,
      userAgent: navigator.userAgent,
      componentStack: errorInfo.componentStack,
      errorStack: error.stack,
      userImpact: 'severe',
      recoveryAction: 'Page reload recommended',
      debugInfo: {
        timestamp: new Date().toISOString(),
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 'unknown',
        connectionType: (navigator as any).connection?.effectiveType || 'unknown'
      }
    });
  }
}

export { AuthLogger as default };
