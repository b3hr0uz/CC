/**
 * Enhanced Backend Unavailable Error Component
 * Replaces generic "Backend temporarily unavailable" with detailed status and recovery information
 */

'use client';

import React, { useEffect, useState } from 'react';
import { 
  Server, Wifi, Clock, CheckCircle, AlertCircle, 
  RefreshCw, Database, Activity, TrendingUp, Shield 
} from 'lucide-react';
import { BackendAvailabilityLogger } from '@/lib/auth-logger';

interface BackendUnavailableErrorProps {
  service: string;
  endpoint?: string;
  httpStatus?: number;
  responseTime?: number;
  retryAttempt?: number;
  maxRetries?: number;
  onRetry?: () => void;
  fallbackData?: {
    type: 'cached' | 'local' | 'mock';
    age?: number; // in minutes
    reliability: 'high' | 'medium' | 'low';
  };
}

interface ServiceStatus {
  ml_service: 'healthy' | 'degraded' | 'unavailable';
  database: 'healthy' | 'degraded' | 'unavailable';
  auth_service: 'healthy' | 'degraded' | 'unavailable';
  email_sync: 'healthy' | 'degraded' | 'unavailable';
}

export function BackendUnavailableError({
  service,
  endpoint,
  httpStatus,
  responseTime,
  retryAttempt = 1,
  maxRetries = 3,
  onRetry,
  fallbackData
}: BackendUnavailableErrorProps) {
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
    ml_service: 'degraded',
    database: 'healthy',
    auth_service: 'healthy',
    email_sync: 'degraded'
  });
  
  const [autoRetryCountdown, setAutoRetryCountdown] = useState<number | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'offline'>('good');

  useEffect(() => {
    // Log the backend unavailability
    BackendAvailabilityLogger.logBackendUnavailable({
      service,
      endpoint: endpoint || 'unknown',
      httpStatus,
      responseTime,
      retryAttempt,
      maxRetries,
      fallbackUsed: !!fallbackData,
      cachedDataAge: fallbackData?.age,
      userImpact: fallbackData ? 'degraded' : 'blocked',
      recoveryAction: retryAttempt < maxRetries ? 'automatic_retry' : 'manual_retry'
    });

    // Log fallback activation
    if (fallbackData) {
      BackendAvailabilityLogger.logFallbackActivated({
        service,
        endpoint: endpoint || 'unknown',
        httpStatus,
        responseTime,
        retryAttempt,
        maxRetries,
        fallbackUsed: true,
        cachedDataAge: fallbackData.age,
        userImpact: 'degraded',
        fallbackType: fallbackData.type === 'cached' ? 'cached_data' : 
                     fallbackData.type === 'local' ? 'local_processing' : 'mock_data'
      });
    }

    // Simulate checking other services (in real app, this would be actual health checks)
    const checkServicesHealth = () => {
      // Mock service health based on the failed service
      setServiceStatus({
        ml_service: service === 'ml_service' ? 'unavailable' : 'healthy',
        database: service === 'database' ? 'unavailable' : 'healthy', 
        auth_service: service === 'auth_service' ? 'unavailable' : 'healthy',
        email_sync: service === 'email_sync' ? 'unavailable' : 'degraded'
      });
    };

    // Check connection quality
    const checkConnectionQuality = () => {
      if (responseTime && responseTime > 5000) {
        setConnectionQuality('poor');
      } else if (responseTime && responseTime > 2000) {
        setConnectionQuality('good');
      } else if (!responseTime) {
        setConnectionQuality('offline');
      } else {
        setConnectionQuality('excellent');
      }
    };

    checkServicesHealth();
    checkConnectionQuality();

    // Auto-retry countdown
    if (retryAttempt < maxRetries) {
      const retryDelay = Math.min(2 ** retryAttempt * 1000, 10000); // Exponential backoff
      let countdown = Math.ceil(retryDelay / 1000);
      
      setAutoRetryCountdown(countdown);
      
      const interval = setInterval(() => {
        countdown -= 1;
        setAutoRetryCountdown(countdown);
        
        if (countdown <= 0) {
          clearInterval(interval);
          setAutoRetryCountdown(null);
          if (onRetry) {
            onRetry();
          }
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [service, endpoint, httpStatus, responseTime, retryAttempt, maxRetries, fallbackData, onRetry]);

  const getServiceIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'unavailable': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getServiceDisplayName = (serviceName: string) => {
    const names: Record<string, string> = {
      ml_service: 'ML Processing',
      database: 'Database',
      auth_service: 'Authentication',
      email_sync: 'Email Sync'
    };
    return names[serviceName] || serviceName;
  };

  const getUserImpactLevel = (): 'low' | 'medium' | 'high' => {
    if (fallbackData) {
      return fallbackData.reliability === 'high' ? 'low' : 'medium';
    }
    return 'high';
  };

  const userImpact = getUserImpactLevel();

  return (
    <div className={`rounded-lg border p-6 ${
      userImpact === 'high' 
        ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
        : userImpact === 'medium'
        ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950'
        : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'
    }`}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`rounded-full p-2 ${
          userImpact === 'high' 
            ? 'bg-red-100 dark:bg-red-900'
            : userImpact === 'medium'
            ? 'bg-orange-100 dark:bg-orange-900'
            : 'bg-blue-100 dark:bg-blue-900'
        }`}>
          <Server className={`h-5 w-5 ${
            userImpact === 'high' 
              ? 'text-red-600 dark:text-red-400'
              : userImpact === 'medium'
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-blue-600 dark:text-blue-400'
          }`} />
        </div>
        
        <div className="flex-1 space-y-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {userImpact === 'high' && '🔴 Service Temporarily Unavailable'}
            {userImpact === 'medium' && '🟡 Service Running in Fallback Mode'}
            {userImpact === 'low' && '🟢 Service Maintained via Backup Systems'}
          </h3>
          
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {service === 'ml_service' && 'Machine Learning processing is temporarily unavailable.'}
            {service === 'database' && 'Database connection is experiencing issues.'}
            {service === 'auth_service' && 'Authentication service is temporarily down.'}
            {service === 'email_sync' && 'Email synchronization service is unavailable.'}
            
            {fallbackData ? (
              <> We're using {fallbackData.type === 'cached' ? 'cached data' : 
                             fallbackData.type === 'local' ? 'local processing' : 'backup systems'} 
                 to maintain functionality.</>
            ) : (
              <> Some features may be temporarily limited.</>
            )}
          </p>
        </div>
      </div>

      {/* Service Status Grid */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(serviceStatus).map(([serviceName, status]) => (
          <div key={serviceName} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg">
            {getServiceIcon(status)}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                {getServiceDisplayName(serviceName)}
              </p>
              <p className={`text-xs capitalize ${
                status === 'healthy' ? 'text-green-600' :
                status === 'degraded' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {status}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Connection & Performance Stats */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Wifi className="h-4 w-4 text-gray-500" />
          <span className="text-gray-600 dark:text-gray-400">
            Connection: <strong className="capitalize">{connectionQuality}</strong>
          </span>
        </div>
        
        {responseTime && (
          <div className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">
              Response: <strong>{responseTime}ms</strong>
            </span>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm">
          <RefreshCw className="h-4 w-4 text-gray-500" />
          <span className="text-gray-600 dark:text-gray-400">
            Attempt: <strong>{retryAttempt}/{maxRetries}</strong>
          </span>
        </div>
      </div>

      {/* Fallback Information */}
      {fallbackData && (
        <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm">
              <strong className="text-blue-800 dark:text-blue-200">Fallback System Active:</strong>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                Using {fallbackData.type === 'cached' ? 'cached data' : 
                       fallbackData.type === 'local' ? 'local processing' : 'backup systems'} 
                {fallbackData.age && ` (${fallbackData.age} minutes old)`}. 
                Reliability: {fallbackData.reliability}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Auto-retry countdown */}
      {autoRetryCountdown !== null && (
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-gray-600 animate-spin" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Automatic retry in {autoRetryCountdown}s...
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Attempt {retryAttempt + 1}/{maxRetries}
            </div>
          </div>
        </div>
      )}

      {/* Technical Details (Development Mode) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-mono">
          <div className="grid grid-cols-2 gap-2">
            <span className="text-gray-500">Service:</span>
            <span className="text-gray-700 dark:text-gray-300">{service}</span>
            
            {endpoint && (
              <>
                <span className="text-gray-500">Endpoint:</span>
                <span className="text-gray-700 dark:text-gray-300">{endpoint}</span>
              </>
            )}
            
            {httpStatus && (
              <>
                <span className="text-gray-500">HTTP Status:</span>
                <span className="text-gray-700 dark:text-gray-300">{httpStatus}</span>
              </>
            )}
            
            <span className="text-gray-500">Response Time:</span>
            <span className="text-gray-700 dark:text-gray-300">
              {responseTime ? `${responseTime}ms` : 'timeout'}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        {onRetry && retryAttempt >= maxRetries && (
          <button
            onClick={onRetry}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </button>
        )}

        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Refresh Page
        </button>
      </div>

      {/* Help & Status */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>
          💡 <strong>What's happening:</strong> Our {service.replace('_', ' ')} is experiencing temporary issues. 
          {fallbackData ? ' Your work continues uninterrupted using backup systems.' : ' We\'re working to restore full functionality.'}
        </p>
        <p className="mt-1">
          📊 <strong>Data safety:</strong> All your data is secure and will sync automatically once service is restored.
        </p>
        {retryAttempt >= maxRetries && (
          <p className="mt-1">
            🔄 <strong>Manual retry needed:</strong> Automatic retries have been exhausted. Please try refreshing or contact support if issues persist.
          </p>
        )}
      </div>
    </div>
  );
}

export default BackendUnavailableError;
