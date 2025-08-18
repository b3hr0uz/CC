/**
 * Enhanced Authentication Error Component
 * Replaces generic "Authentication token expired" message with actionable intelligence
 */

'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Clock, Shield, User, ExternalLink } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { AuthLogger } from '@/lib/auth-logger';

interface AuthErrorProps {
  tokenType?: 'access' | 'refresh' | 'id';
  provider?: 'google' | 'apple' | 'microsoft';
  lastActivity?: Date;
  action?: string; // What the user was trying to do
  endpoint?: string; // API endpoint that failed
  onRetry?: () => void;
}

export function AuthError({
  tokenType = 'access',
  provider,
  lastActivity,
  action,
  endpoint,
  onRetry
}: AuthErrorProps) {
  const { data: session } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [sessionStats, setSessionStats] = useState<{
    duration: string;
    tokenAge: string;
    provider: string;
  } | null>(null);

  useEffect(() => {
    // Calculate session statistics
    const now = new Date();
    const sessionStart = session?.user ? new Date(session.expires).getTime() - (24 * 60 * 60 * 1000) : now;
    const duration = Math.round((now.getTime() - sessionStart) / (1000 * 60));
    
    const tokenAge = lastActivity ? 
      Math.round((now.getTime() - lastActivity.getTime()) / (1000 * 60)) : 
      duration;

    setSessionStats({
      duration: duration > 60 ? `${Math.round(duration / 60)}h ${duration % 60}m` : `${duration}m`,
      tokenAge: tokenAge > 60 ? `${Math.round(tokenAge / 60)}h ${tokenAge % 60}m` : `${tokenAge}m`,
      provider: provider || session?.user?.provider || 'unknown'
    });

    // Log detailed auth error
    AuthLogger.logTokenExpiration({
      userId: session?.user?.id,
      sessionId: session?.user?.sessionId,
      tokenType,
      provider: provider || session?.user?.provider,
      lastActivity,
      tokenAge,
      action,
      endpoint
    });
  }, [session, tokenType, provider, lastActivity, action, endpoint, tokenAge]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    
    try {
      AuthLogger.logAuthRecoveryAttempt(false, {
        userId: session?.user?.id,
        sessionId: session?.user?.sessionId,
        provider: provider || session?.user?.provider,
        action: 'manual_signout'
      });
      
      await signOut({ callbackUrl: '/login?reason=token_expired' });
    } catch (error) {
      console.error('Sign out failed:', error);
      setIsSigningOut(false);
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      AuthLogger.logAuthRecoveryAttempt(true, {
        userId: session?.user?.id,
        sessionId: session?.user?.sessionId,
        provider: provider || session?.user?.provider,
        action: 'retry_with_refresh'
      });
      onRetry();
    }
  };

  const getSecurityLevel = (): 'normal' | 'suspicious' => {
    if (!sessionStats) return 'normal';
    
    const tokenAgeMinutes = parseInt(sessionStats.tokenAge);
    return tokenAgeMinutes < 30 ? 'suspicious' : 'normal';
  };

  const securityLevel = getSecurityLevel();

  return (
    <div className={`rounded-lg border p-6 ${
      securityLevel === 'suspicious' 
        ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
        : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950'
    }`}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`rounded-full p-2 ${
          securityLevel === 'suspicious' 
            ? 'bg-red-100 dark:bg-red-900'
            : 'bg-amber-100 dark:bg-amber-900'
        }`}>
          {securityLevel === 'suspicious' ? (
            <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          )}
        </div>
        
        <div className="flex-1 space-y-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {securityLevel === 'suspicious' 
              ? '🔒 Security Alert: Unusual Token Expiration'
              : '⏰ Authentication Session Expired'
            }
          </h3>
          
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {action ? (
              <>Your authentication expired while trying to <strong>{action}</strong>.</>
            ) : (
              <>Your authentication session has expired and needs to be refreshed.</>
            )}
          </p>
        </div>
      </div>

      {/* Session Details */}
      {sessionStats && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">
              Session: <strong>{sessionStats.duration}</strong>
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">
              Token Age: <strong>{sessionStats.tokenAge}</strong>
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">
              Provider: <strong className="capitalize">{sessionStats.provider}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Security Warning */}
      {securityLevel === 'suspicious' && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/50 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="text-sm">
              <strong className="text-red-800 dark:text-red-200">Unusual Activity Detected:</strong>
              <p className="text-red-700 dark:text-red-300 mt-1">
                Your token expired unusually quickly ({sessionStats?.tokenAge}). This could indicate a security issue.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Technical Context (Development Mode) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-mono">
          <div className="grid grid-cols-2 gap-2">
            <span className="text-gray-500">Token Type:</span>
            <span className="text-gray-700 dark:text-gray-300">{tokenType}</span>
            
            {endpoint && (
              <>
                <span className="text-gray-500">Failed Endpoint:</span>
                <span className="text-gray-700 dark:text-gray-300">{endpoint}</span>
              </>
            )}
            
            <span className="text-gray-500">Session ID:</span>
            <span className="text-gray-700 dark:text-gray-300">
              {session?.user?.sessionId?.slice(-8) || 'unknown'}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            securityLevel === 'suspicious'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-amber-600 hover:bg-amber-700 text-white'
          } disabled:opacity-50`}
        >
          {isSigningOut ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
          {isSigningOut ? 'Signing Out...' : 'Sign Out & Sign In Again'}
        </button>

        {onRetry && tokenType === 'access' && (
          <button
            onClick={handleRetry}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Try Refresh Token
          </button>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>
          💡 <strong>Why this happened:</strong> Authentication tokens expire for security. 
          {securityLevel === 'suspicious' && ' The quick expiration suggests a potential security issue.'}
        </p>
        <p className="mt-1">
          🔒 <strong>Your data is safe:</strong> All your work is automatically saved and will be restored after re-authentication.
        </p>
      </div>
    </div>
  );
}

export default AuthError;
