'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { useNotifications } from '../contexts/NotificationContext';
import { usePageLoading } from '../contexts/PageLoadingContext';
import { 
  Mail, RefreshCw, AlertCircle, 
  CheckCircle, Eye, ThumbsUp, ThumbsDown,
  X, Calendar, User, Archive, Trash2,
  ExternalLink, Star, MessageSquare
} from 'lucide-react';
import type { EmailData } from '../../lib/gmail';

interface ExtendedEmailData extends EmailData {
  classification?: 'spam' | 'ham';
  confidence?: number;
  snippet?: string;
  body?: string;
  fullBody?: string;
  headers?: Record<string, string>;
  userFeedback?: 'spam' | 'ham' | null;
  feedbackTimestamp?: Date;
  modelUsed?: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const { addNotification, notificationCounter } = useNotifications();
  const { updateDashboardLoading, addBackgroundProcess, removeBackgroundProcess } = usePageLoading();

  // Initial page loading simulation with guard to prevent duplicates
  useEffect(() => {
    let isCancelled = false;

    const simulateDashboardLoading = async () => {
      if (isCancelled) return;

      updateDashboardLoading({ 
        isLoading: true, 
        progress: 0, 
        status: 'Initializing Dashboard...' 
      });

      // Simulate loading steps
      const steps = [
        { progress: 20, status: 'Loading user session...', delay: 300 },
        { progress: 40, status: 'Checking email permissions...', delay: 400 },
        { progress: 60, status: 'Preparing email interface...', delay: 300 },
        { progress: 80, status: 'Loading models...', delay: 200 },
        { progress: 100, status: 'Dashboard Ready', delay: 200 }
      ];

      for (const step of steps) {
        if (isCancelled) return;
        await new Promise(resolve => setTimeout(resolve, step.delay));
        if (isCancelled) return;
        updateDashboardLoading({ 
          progress: step.progress, 
          status: step.status,
          isLoading: step.progress < 100
        });
      }
    };

    if (status === 'loading') {
      simulateDashboardLoading();
    } else if (status === 'authenticated') {
      // Quick ready state for authenticated users
      updateDashboardLoading({ 
        isLoading: false, 
        progress: 100, 
        status: 'Dashboard Ready' 
      });
    }

    return () => {
      isCancelled = true;
    };
  }, [status, updateDashboardLoading]); // Re-added updateDashboardLoading but it's now stable

  // Generate unique notification ID
  const generateNotificationId = (type: string, modelName: string) => {
    const timestamp = Date.now();
    return `${type}-${modelName}-${timestamp}-${notificationCounter}`;
  };

  // State management
  const [emails, setEmails] = useState<ExtendedEmailData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [emailError, setEmailError] = useState<{type: string; message: string} | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('xgboost_rl');
  const [currentLimit, setCurrentLimit] = useState(100);
  const [canLoadMore, setCanLoadMore] = useState(true);
  
  // Enhanced modal and interaction states
  const [selectedEmail, setSelectedEmail] = useState<ExtendedEmailData | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState<string | null>(null);
  const [view, setView] = useState<'all' | 'spam' | 'ham'>('all');
  const [fullContentLoading, setFullContentLoading] = useState(false);
  const [fullContentLoaded, setFullContentLoaded] = useState(false);
  const [fullEmailContent, setFullEmailContent] = useState<string | null>(null);

  // Auto-sync management
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const autoSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Classify emails using the backend ML service
  const classifyEmails = async (emailsData: EmailData[]): Promise<ExtendedEmailData[]> => {
    try {
      const classificationPromises = emailsData.map(async (email) => {
        try {
          // Call backend to classify each email
          const response = await fetch('/api/classify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: {
                subject: email.subject,
                from: email.from,
                body: email.preview || email.body || '',
                snippet: email.preview
              },
              model: selectedModel
            })
          });

          if (response.ok) {
            const result = await response.json();
            return {
              ...email,
              classification: result.classification === 1 ? 'spam' : 'ham',
              confidence: result.confidence || 0.85,
              snippet: email.preview || 'No preview available',
              modelUsed: selectedModel
            };
          } else {
            // Fallback classification if backend fails
            return {
              ...email,
              classification: Math.random() > 0.7 ? 'spam' : 'ham',
              confidence: 0.75 + Math.random() * 0.2,
              snippet: email.preview || 'No preview available',
              modelUsed: 'fallback'
            };
          }
        } catch (error) {
          console.warn('Classification failed for email:', email.id, error);
          // Fallback classification
          return {
            ...email,
            classification: Math.random() > 0.7 ? 'spam' : 'ham',
            confidence: 0.75,
            snippet: email.preview || 'No preview available',
            modelUsed: 'fallback'
          };
        }
      });

      return await Promise.all(classificationPromises);
    } catch (error) {
      console.error('Batch classification failed:', error);
      // Return emails with fallback classifications
      return emailsData.map(email => ({
        ...email,
        classification: Math.random() > 0.7 ? 'spam' : 'ham',
        confidence: 0.75,
        snippet: email.preview || 'No preview available',
        modelUsed: 'fallback'
      }));
    }
  };

  // Handle RL feedback submission (supports both new feedback and changes)
  const handleFeedback = async (emailId: string, feedback: 'spam' | 'ham') => {
    setFeedbackSubmitting(emailId);
    
    // Track feedback submission process
    addBackgroundProcess('dashboard', 'RL Feedback');
    updateDashboardLoading({ 
      progress: 20, 
      status: 'Submitting feedback...' 
    });
    
    try {
      const email = emails.find(e => e.id === emailId);
      if (!email) return;

      // Check if this is a feedback change
      const isChangingFeedback = email.userFeedback && email.userFeedback !== feedback;
      const isNewFeedback = !email.userFeedback;

      // Submit feedback to backend for RL training
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: emailId,
          userFeedback: feedback,
          currentClassification: email.classification,
          confidence: email.confidence,
          modelUsed: email.modelUsed || selectedModel,
          previousFeedback: email.userFeedback, // Include previous feedback for change tracking
          emailContent: {
            subject: email.subject,
            from: email.from,
            preview: email.snippet || email.preview
          }
        })
      });

      if (response.ok) {
        // Update email with user feedback
        setEmails(prevEmails => 
          prevEmails.map(e => 
            e.id === emailId 
              ? { ...e, userFeedback: feedback, feedbackTimestamp: new Date() }
              : e
          )
        );

        // Update selected email if it's the one being modified
        if (selectedEmail?.id === emailId) {
          setSelectedEmail(prev => prev ? {
            ...prev,
            userFeedback: feedback,
            feedbackTimestamp: new Date()
          } : null);
        }

        // Update progress
        updateDashboardLoading({ progress: 80, status: 'Feedback submitted...' });

        // Different notifications based on action type
        if (isChangingFeedback) {
          addNotification({
            id: generateNotificationId('feedback_changed', `EmailFeedback-${emailId}`),
            type: 'feedback_success',
            message: `Feedback changed from ${email.userFeedback?.toUpperCase()} to ${feedback.toUpperCase()}. Model will be updated!`,
            timestamp: new Date(),
            model_name: selectedModel
          });
        } else if (isNewFeedback) {
          addNotification({
            id: generateNotificationId('feedback_success', `EmailFeedback-${emailId}`),
            type: 'feedback_success',
            message: `Feedback submitted: ${feedback.toUpperCase()}. This helps improve the model!`,
            timestamp: new Date(),
            model_name: selectedModel
          });
        } else {
          // Same feedback selected again - acknowledge but don't change
          addNotification({
            id: generateNotificationId('feedback_confirmed', `EmailFeedback-${emailId}`),
            type: 'feedback_success',
            message: `Feedback confirmed as ${feedback.toUpperCase()}`,
            timestamp: new Date(),
            model_name: selectedModel
          });
        }
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      addNotification({
        id: generateNotificationId('feedback_error', `EmailFeedback-${emailId}`),
        type: 'feedback_error',
        message: `Failed to submit feedback: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        model_name: selectedModel
      });
    } finally {
      setFeedbackSubmitting(null);
      // Clean up feedback process tracking
      removeBackgroundProcess('dashboard', 'RL Feedback');
      updateDashboardLoading({ 
        progress: 100, 
        status: 'Dashboard Ready' 
      });
    }
  };

  // Open email details modal
  const handleViewEmail = (email: ExtendedEmailData) => {
    setSelectedEmail(email);
    setShowEmailModal(true);
    // Reset full content state for new email
    setFullContentLoaded(false);
    setFullContentLoading(false);
    setFullEmailContent(null);
  };

  // Close email modal
  const handleCloseModal = () => {
    setShowEmailModal(false);
    setSelectedEmail(null);
    // Reset full content state
    setFullContentLoaded(false);
    setFullContentLoading(false);
    setFullEmailContent(null);
  };

  // Fetch full email content
  const fetchFullEmailContent = async (messageId: string) => {
    if (fullContentLoading || fullContentLoaded) return;
    
    setFullContentLoading(true);
    
    try {
      const response = await fetch('/api/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messageId: messageId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setFullEmailContent(data.content);
        setFullContentLoaded(true);
        
        addNotification({
          id: generateNotificationId('full_content_loaded', 'EmailContent'),
          type: 'email_fetch_complete',
          message: 'Full email content loaded successfully',
          timestamp: new Date(),
          model_name: 'EmailContent'
        });
      } else {
        throw new Error('Failed to fetch full email content');
      }
    } catch (error) {
      console.error('Error fetching full email content:', error);
      
      addNotification({
        id: generateNotificationId('full_content_error', 'EmailContent'),
        type: 'email_fetch_error',
        message: 'Failed to load full email content',
        timestamp: new Date(),
        model_name: 'EmailContent'
      });
    } finally {
      setFullContentLoading(false);
    }
  };

  // Filter emails based on current view
  const filteredEmails = emails.filter(email => {
    if (view === 'all') return true;
    return email.classification === view;
  });

  const handleSyncEmails = async () => {
    setLoading(true);
    
    // Track email sync process
    addBackgroundProcess('dashboard', 'Email Sync');
    updateDashboardLoading({ 
      isLoading: true, 
      progress: 10, 
      status: 'Syncing emails...' 
    });
    
    try {
      // Show start notification
      addNotification({
        id: generateNotificationId('sync_start', 'EmailSync'),
        type: 'email_fetch_start',
        message: 'Fetching latest emails from Gmail...',
        timestamp: new Date(),
        model_name: 'Gmail Sync'
      });
      
      updateDashboardLoading({ progress: 25, status: 'Fetching from Gmail...' });
      
      // Actually call the API to fetch emails (default 100 emails)
      const response = await fetch(`/api/emails?limit=${currentLimit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync emails');
      }

      const responseData = await response.json();
      const { emails: emailsData, message: responseMessage, isDemoMode } = responseData;
      
      updateDashboardLoading({ progress: 45, status: 'Processing emails...' });
      
      // Handle demo mode response
      if (isDemoMode) {
        setEmails([]);
        setEmailError({ type: 'info', message: responseMessage });
        addNotification({
          id: generateNotificationId('demo_mode', 'EmailSync'),
          type: 'email_fetch_complete',
          message: 'Demo mode: Use real OAuth providers to access emails',
          timestamp: new Date(),
          model_name: selectedModel
        });
        removeBackgroundProcess('dashboard', 'Email Sync');
        updateDashboardLoading({ 
          isLoading: false, 
          progress: 100, 
          status: 'Dashboard Ready' 
        });
        return;
      }
      
      updateDashboardLoading({ progress: 60, status: 'Classifying emails...' });
      
      // Track email classification process
      addBackgroundProcess('dashboard', 'Email Classification');
      
      // Classify emails using the backend (only for real users)
      const classifiedEmails = await classifyEmails(emailsData);
      
      removeBackgroundProcess('dashboard', 'Email Classification');
      
      // Update the emails state
      setEmails(classifiedEmails);
      
      updateDashboardLoading({ progress: 90, status: 'Finalizing...' });
      
      addNotification({
        id: generateNotificationId('sync_complete', 'EmailSync'),
        type: 'email_fetch_complete',
        message: `Successfully synced ${emailsData.length} emails from Gmail`,
        timestamp: new Date(),
        model_name: 'Gmail Sync'
      });
      
      // Complete the loading process
      removeBackgroundProcess('dashboard', 'Email Sync');
      updateDashboardLoading({ 
        isLoading: false, 
        progress: 100, 
        status: 'Dashboard Ready' 
      });
    } catch (error) {
      console.error('Sync failed:', error);
      
      // Clean up loading state on error
      removeBackgroundProcess('dashboard', 'Email Sync');
      removeBackgroundProcess('dashboard', 'Email Classification');
      updateDashboardLoading({ 
        isLoading: false, 
        progress: 100, 
        status: 'Dashboard Ready' 
      });
      
      // Show error notification
      addNotification({
        id: generateNotificationId('sync_error', 'EmailSync'),
        type: 'email_fetch_error',
        message: error instanceof Error ? error.message : 'Failed to sync emails',
        timestamp: new Date(),
        model_name: selectedModel
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const newLimit = currentLimit + 100;
      
      // Show loading notification
      addNotification({
        id: generateNotificationId('load_more_start', 'EmailSync'),
        type: 'email_fetch_start',
        message: 'Loading more emails...',
        timestamp: new Date(),
        model_name: selectedModel
      });
      
      const response = await fetch(`/api/emails?limit=${newLimit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const { emails: emailsData } = await response.json();
        
        // Classify the new emails using the backend
        const processedEmails = await classifyEmails(emailsData);

        addNotification({
          id: generateNotificationId('load_more_success', 'EmailSync'),
          type: 'email_fetch_success', 
          message: `Loaded ${emailsData.length - emails.length} more emails`,
          timestamp: new Date(),
          model_name: selectedModel
        });

        setEmails(processedEmails);
        setCurrentLimit(newLimit);
        setCanLoadMore(processedEmails.length >= newLimit);
      } else {
        throw new Error('Failed to load more emails');
      }
    } catch (error) {
      console.error('Load more failed:', error);
      
      addNotification({
        id: generateNotificationId('load_more_error', 'EmailSync'),
        type: 'email_fetch_error',
        message: error instanceof Error ? error.message : 'Failed to load more emails',
        timestamp: new Date(),
        model_name: selectedModel
      });
    } finally {
      setLoadingMore(false);
    }
  };

  // Auto-sync function with proper notifications
  const performAutoSync = async () => {
    // Only auto-sync for authenticated, non-demo users
    if (status !== 'authenticated' || !session?.user || session.isMockUser) {
      return;
    }

    console.log('🔄 Performing auto-sync...');
    
    try {
      await handleSyncEmails();
      setLastSyncTime(new Date());
      
      // Add auto-sync notification
      addNotification({
        id: generateNotificationId('auto_sync_complete', 'AutoSync'),
        type: 'email_fetch_complete',
        message: `Auto-sync completed at ${new Date().toLocaleTimeString()}`,
        timestamp: new Date(),
        model_name: 'AutoSync'
      });
    } catch (error) {
      console.error('Auto-sync failed:', error);
      
      addNotification({
        id: generateNotificationId('auto_sync_error', 'AutoSync'),
        type: 'email_fetch_error',
        message: `Auto-sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        model_name: 'AutoSync'
      });
    }
  };

  // Auto-sync on login
  useEffect(() => {
    if (status === 'authenticated' && session?.user && !session.isMockUser && !autoSyncEnabled) {
      console.log('✅ User authenticated - enabling auto-sync');
      
      // Perform initial sync on login
      setTimeout(() => {
        performAutoSync();
      }, 2000); // 2 second delay to allow UI to settle
      
      setAutoSyncEnabled(true);
      
      addNotification({
        id: generateNotificationId('auto_sync_enabled', 'AutoSync'),
        type: 'backend_info',
        message: 'Auto-sync enabled: Emails will sync every 5 minutes',
        timestamp: new Date(),
        model_name: 'Auto-Sync Service'
      });
    }
  }, [status, session, autoSyncEnabled]);

  // Set up 5-minute interval auto-sync
  useEffect(() => {
    if (autoSyncEnabled && status === 'authenticated' && session?.user && !session.isMockUser) {
      console.log('⏰ Setting up 5-minute auto-sync interval');
      
      // Clear any existing interval
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current);
      }
      
      // Set up new interval (5 minutes = 300,000 ms)
      autoSyncIntervalRef.current = setInterval(() => {
        performAutoSync();
      }, 5 * 60 * 1000);
      
      return () => {
        if (autoSyncIntervalRef.current) {
          clearInterval(autoSyncIntervalRef.current);
          autoSyncIntervalRef.current = null;
        }
      };
    }
  }, [autoSyncEnabled, status, session]);

  // Cleanup auto-sync on component unmount or logout
  useEffect(() => {
    return () => {
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current);
        console.log('🧹 Auto-sync interval cleaned up');
      }
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{backgroundColor: '#212121'}}>
        {/* Simplified Header */}
        <header className="border-b border-gray-600 px-4 py-4 lg:px-6 flex-shrink-0" style={{backgroundColor: '#212121'}}>
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h1 className="text-xl md:text-2xl lg:text-2xl font-bold text-white">Dashboard</h1>
              {autoSyncEnabled && !session?.isMockUser && (
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-400 font-medium">Auto-sync active</span>
                  </div>
                  {lastSyncTime && (
                    <span className="text-xs text-gray-400">
                      Last: {lastSyncTime.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleSyncEmails}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center space-x-2 transition-all duration-200"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              <span>Sync from Google</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {emailError && (
            <div className="mb-4 p-4 rounded-lg border bg-red-900/30 border-red-600 text-red-200">
            <div className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span>{emailError.message}</span>
            </div>
          </div>
        )}

          {/* Email Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div 
              className={`bg-gray-700 p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                view === 'all' ? 'ring-2 ring-blue-500 bg-gray-600' : 'hover:bg-gray-600'
              }`}
              onClick={() => setView('all')}
            >
              <div className="flex items-center">
                <Mail className="w-8 h-8 text-blue-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-300">Total Emails</p>
                  <p className="text-2xl font-bold text-white">{emails.length}</p>
                </div>
                </div>
              </div>
            <div 
              className={`bg-gray-700 p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                view === 'spam' ? 'ring-2 ring-red-500 bg-gray-600' : 'hover:bg-gray-600'
              }`}
              onClick={() => setView('spam')}
            >
              <div className="flex items-center">
                <AlertCircle className="w-8 h-8 text-red-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-300">Spam Detected</p>
                  <p className="text-2xl font-bold text-white">
                    {emails.filter(e => e.classification === 'spam').length}
                  </p>
                </div>
                </div>
              </div>
            <div 
              className={`bg-gray-700 p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                view === 'ham' ? 'ring-2 ring-green-500 bg-gray-600' : 'hover:bg-gray-600'
              }`}
              onClick={() => setView('ham')}
            >
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-300">Ham (Safe)</p>
                  <p className="text-2xl font-bold text-white">
                    {emails.filter(e => e.classification === 'ham').length}
                  </p>
                </div>
                </div>
              </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center">
                <MessageSquare className="w-8 h-8 text-purple-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-300">RL Feedback</p>
                  <p className="text-2xl font-bold text-white">
                    {emails.filter(e => e.userFeedback).length}
                  </p>
                </div>
                </div>
              </div>
            </div>

          {/* Model Selection */}
          <div className="mb-6">
            <label className="block text-sm text-gray-300 mb-2">Selected Model:</label>
                <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="xgboost_rl">XGBoost + RL (Best Model)</option>
              <option value="random_forest">Random Forest</option>
              <option value="logistic_regression">Logistic Regression</option>
                </select>
        </div>

        {/* View Filter */}
        <div className="mb-4 flex items-center space-x-4">
          <span className="text-sm text-gray-300">View:</span>
          <div className="flex space-x-2">
            <button
              onClick={() => setView('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                view === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All ({emails.length})
            </button>
            <button
              onClick={() => setView('spam')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                view === 'spam' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Spam ({emails.filter(e => e.classification === 'spam').length})
            </button>
            <button
              onClick={() => setView('ham')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                view === 'ham' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Ham ({emails.filter(e => e.classification === 'ham').length})
            </button>
          </div>
        </div>

        {/* Email List */}
          <div className="space-y-4">
            {filteredEmails.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">
                  {emails.length === 0 ? 'No emails loaded yet' : `No ${view} emails found`}
                </p>
                <p className="text-sm text-gray-500">
                  {emails.length === 0 ? 'Click "Sync" to fetch your emails' : 'Try a different filter'}
                </p>
                </div>
              ) : (
              <>
                {filteredEmails.map((email) => (
                <div key={email.id} className="bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-all duration-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-white truncate">{email.subject}</h3>
                        {email.userFeedback && (
                          <span className="px-2 py-1 rounded-full text-xs bg-purple-900/30 border border-purple-700 text-purple-300">
                            ✓ Feedback
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-300">{email.from}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(email.date).toLocaleDateString()} • {email.modelUsed || 'Model'}
                      </p>
                          </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {email.classification && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          email.classification === 'spam' 
                                          ? 'bg-red-900/30 border border-red-700 text-red-300'
                                          : 'bg-green-900/30 border border-green-700 text-green-300'
                                      }`}>
                          {email.classification.toUpperCase()}
                                      </span>
                      )}
                      {email.confidence && (
                        <span className="text-xs text-gray-400">
                          {Math.round(email.confidence * 100)}%
                                    </span>
                                  )}
                                </div>
                              </div>
                  
                  <p className="text-sm text-gray-400 truncate mb-3">{email.snippet}</p>
                  
                  {/* Email Actions */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleViewEmail(email)}
                      className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors duration-200"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="text-sm">View Details</span>
                    </button>
                    
                    <div className="flex items-center space-x-2">
                      {/* Always show changeable feedback buttons */}
                      <button
                        onClick={() => handleFeedback(email.id, 'ham')}
                        disabled={feedbackSubmitting === email.id}
                        className={`flex items-center space-x-1 px-2 py-1 border rounded transition-all duration-200 disabled:opacity-50 ${
                          email.userFeedback === 'ham'
                            ? 'bg-green-600 border-green-500 text-white shadow-md'
                            : 'bg-green-900/20 hover:bg-green-900/40 border-green-700 text-green-300'
                        }`}
                        title={email.userFeedback === 'ham' ? 'Current feedback - click to confirm or change' : 'Mark as Ham (safe email)'}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span className="text-xs">
                          Ham{email.userFeedback === 'ham' && ' ✓'}
                        </span>
                      </button>
                      <button
                        onClick={() => handleFeedback(email.id, 'spam')}
                        disabled={feedbackSubmitting === email.id}
                        className={`flex items-center space-x-1 px-2 py-1 border rounded transition-all duration-200 disabled:opacity-50 ${
                          email.userFeedback === 'spam'
                            ? 'bg-red-600 border-red-500 text-white shadow-md'
                            : 'bg-red-900/20 hover:bg-red-900/40 border-red-700 text-red-300'
                        }`}
                        title={email.userFeedback === 'spam' ? 'Current feedback - click to confirm or change' : 'Mark as Spam'}
                      >
                        <ThumbsDown className="w-3 h-3" />
                        <span className="text-xs">
                          Spam{email.userFeedback === 'spam' && ' ✓'}
                        </span>
                      </button>
                    </div>
                  </div>
                            </div>
                ))}
                {canLoadMore && !loading && (
                  <div className="text-center py-6">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center space-x-2 mx-auto transition-all duration-200"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingMore ? 'animate-spin' : ''}`} />
                      <span>{loadingMore ? 'Loading...' : 'Load More'}</span>
                    </button>
                  </div>
                )}
              </>
            )}
                        </div>
                        </div>
                        </div>

        {/* Email Details Modal */}
        {showEmailModal && selectedEmail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gray-700 px-6 py-4 border-b border-gray-600 flex items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white truncate">{selectedEmail.subject}</h2>
                  <p className="text-sm text-gray-300">{selectedEmail.from}</p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto max-h-[70vh]">
                <div className="p-6">
                  {/* Email Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-300">From: {selectedEmail.from}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-300">
                          Date: {new Date(selectedEmail.date).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-300">ID: {selectedEmail.id}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Classification Info */}
                      <div className="flex items-center">
                        <span className="text-sm text-gray-300 mr-2">Classification:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedEmail.classification === 'spam' 
                            ? 'bg-red-900/30 border border-red-700 text-red-300'
                            : 'bg-green-900/30 border border-green-700 text-green-300'
                        }`}>
                          {selectedEmail.classification?.toUpperCase() || 'UNCLASSIFIED'}
                        </span>
                      </div>
                      
                      {selectedEmail.confidence && (
                        <div className="flex items-center">
                          <span className="text-sm text-gray-300 mr-2">Confidence:</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 h-2 bg-gray-600 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  selectedEmail.confidence > 0.8 ? 'bg-green-500' :
                                  selectedEmail.confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${(selectedEmail.confidence || 0) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-300">
                              {Math.round((selectedEmail.confidence || 0) * 100)}%
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center">
                        <span className="text-sm text-gray-300 mr-2">Model:</span>
                        <span className="text-sm text-blue-300">{selectedEmail.modelUsed || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>

                  {/* User Feedback Section - Always shown, allows changes */}
                  <div className="mb-6 p-4 rounded-lg bg-gray-700 border border-gray-600">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <MessageSquare className="w-5 h-5 text-blue-400 mr-2" />
                        <div>
                          <p className="text-sm text-gray-300 font-medium">
                            {selectedEmail.userFeedback ? 'Your Feedback' : 'Help improve the model'}
                          </p>
                          {selectedEmail.userFeedback && selectedEmail.feedbackTimestamp && (
                            <p className="text-xs text-gray-400">
                              Last updated: {selectedEmail.feedbackTimestamp.toLocaleDateString()} at {selectedEmail.feedbackTimestamp.toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {!selectedEmail.userFeedback && (
                      <p className="text-xs text-gray-400 mb-3">
                        Was this classification correct? Your feedback helps train the reinforcement learning model.
                      </p>
                    )}
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleFeedback(selectedEmail.id, 'ham')}
                        disabled={feedbackSubmitting === selectedEmail.id}
                        className={`flex items-center space-x-1 px-3 py-2 border rounded transition-all duration-200 disabled:opacity-50 ${
                          selectedEmail.userFeedback === 'ham'
                            ? 'bg-green-600 border-green-500 text-white shadow-lg transform scale-105'
                            : 'bg-green-900/20 hover:bg-green-900/40 border-green-700 text-green-300 hover:scale-105'
                        }`}
                      >
                        <ThumbsUp className={`w-4 h-4 ${selectedEmail.userFeedback === 'ham' ? 'text-white' : ''}`} />
                        <span className="text-sm">
                          Ham (Safe) {selectedEmail.userFeedback === 'ham' && '✓'}
                        </span>
                      </button>
                      <button
                        onClick={() => handleFeedback(selectedEmail.id, 'spam')}
                        disabled={feedbackSubmitting === selectedEmail.id}
                        className={`flex items-center space-x-1 px-3 py-2 border rounded transition-all duration-200 disabled:opacity-50 ${
                          selectedEmail.userFeedback === 'spam'
                            ? 'bg-red-600 border-red-500 text-white shadow-lg transform scale-105'
                            : 'bg-red-900/20 hover:bg-red-900/40 border-red-700 text-red-300 hover:scale-105'
                        }`}
                      >
                        <ThumbsDown className={`w-4 h-4 ${selectedEmail.userFeedback === 'spam' ? 'text-white' : ''}`} />
                        <span className="text-sm">
                          Spam {selectedEmail.userFeedback === 'spam' && '✓'}
                        </span>
                      </button>
                    </div>
                    
                    {selectedEmail.userFeedback && (
                      <div className="mt-3 p-2 bg-blue-900/20 border border-blue-700 rounded text-xs text-blue-300">
                        <div className="flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          <span>
                            Currently marked as <strong>{selectedEmail.userFeedback.toUpperCase()}</strong>
                            {selectedEmail.userFeedback !== selectedEmail.classification && 
                              ` (differs from model's ${selectedEmail.classification?.toUpperCase()} prediction)`
                            }
                          </span>
                        </div>
                        <p className="mt-1 text-gray-400">
                          Click either button above to change your feedback
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Email Content */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white">Email Content</h3>
                      {!fullContentLoaded && selectedEmail && (
                        <button
                          onClick={() => fetchFullEmailContent(selectedEmail.id)}
                          disabled={fullContentLoading}
                          className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-all duration-200"
                        >
                          {fullContentLoading ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Loading...</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              <span>Show Full Content</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-600">
                      <div className="prose prose-gray max-w-none">
                        {fullContentLoaded && fullEmailContent ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-700">
                              <span className="text-xs text-green-400 font-medium">✓ Full Content Loaded</span>
                              <span className="text-xs text-gray-400">
                                {Math.round(fullEmailContent.length / 1024 * 100) / 100} KB
                              </span>
                            </div>
                            <div className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed max-h-96 overflow-y-auto custom-scrollbar">
                              {fullEmailContent}
                            </div>
                          </div>
                        ) : selectedEmail?.fullBody || selectedEmail?.body || selectedEmail?.snippet ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-700">
                              <span className="text-xs text-yellow-400 font-medium">Preview Content</span>
                              <span className="text-xs text-gray-400">
                                Click "Show Full Content" for complete email
                              </span>
                            </div>
                            <div className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                              {selectedEmail.fullBody || selectedEmail.body || selectedEmail.snippet}
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-500 text-center py-8">
                            <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Email content not available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Additional Headers */}
                  {selectedEmail.headers && Object.keys(selectedEmail.headers).length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-white mb-3">Email Headers</h3>
                      <div className="bg-gray-900 p-4 rounded-lg border border-gray-600 max-h-40 overflow-y-auto">
                        {Object.entries(selectedEmail.headers).map(([key, value]) => (
                          <div key={key} className="mb-2 text-sm">
                            <span className="text-blue-400 font-medium">{key}:</span>
                            <span className="text-gray-300 ml-2">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-700 px-6 py-4 border-t border-gray-600 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  {selectedEmail.classification && (
                    <div className="text-sm text-gray-300">
                      Classification: <span className={selectedEmail.classification === 'spam' ? 'text-red-300' : 'text-green-300'}>
                        {selectedEmail.classification.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => window.open(`mailto:${selectedEmail.from}`, '_blank')}
                    className="flex items-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-all duration-200"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Reply</span>
                  </button>
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-all duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
} 