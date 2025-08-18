'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AppLayout from '../components/AppLayout';
import { useNotifications } from '../contexts/NotificationContext';
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
  const { addNotification } = useNotifications();

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

  // Handle RL feedback submission
  const handleFeedback = async (emailId: string, feedback: 'spam' | 'ham') => {
    setFeedbackSubmitting(emailId);
    try {
      const email = emails.find(e => e.id === emailId);
      if (!email) return;

      // Submit feedback to backend for RL training
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_id: emailId,
          user_feedback: feedback,
          model_prediction: email.classification,
          confidence: email.confidence,
          model_used: email.modelUsed || selectedModel,
          email_content: {
            subject: email.subject,
            from: email.from,
            body: email.snippet || email.preview
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

        addNotification({
          id: `feedback-${emailId}`,
          type: 'feedback_success',
          message: `Feedback submitted: ${feedback.toUpperCase()}. This helps improve the model!`,
          timestamp: new Date(),
          model_name: selectedModel
        });
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      addNotification({
        id: `feedback-error-${emailId}`,
        type: 'feedback_error',
        message: `Failed to submit feedback: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        model_name: selectedModel
      });
    } finally {
      setFeedbackSubmitting(null);
    }
  };

  // Open email details modal
  const handleViewEmail = (email: ExtendedEmailData) => {
    setSelectedEmail(email);
    setShowEmailModal(true);
  };

  // Close email modal
  const handleCloseModal = () => {
    setShowEmailModal(false);
    setSelectedEmail(null);
  };

  // Filter emails based on current view
  const filteredEmails = emails.filter(email => {
    if (view === 'all') return true;
    return email.classification === view;
  });

  const handleSyncEmails = async () => {
        setLoading(true);
    try {
      // Show start notification
          addNotification({
        id: 'sync-start',
      type: 'email_fetch_start',
        message: 'Fetching latest emails...',
      timestamp: new Date(),
        model_name: selectedModel
      });
      
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

      const { emails: emailsData } = await response.json();
      
      // Classify emails using the backend
      const classifiedEmails = await classifyEmails(emailsData);
      
      // Update the emails state
      setEmails(classifiedEmails);
      
        addNotification({
        id: 'sync-complete',
          type: 'email_fetch_complete',
        message: `Successfully synced ${emails.length} emails`,
          timestamp: new Date(),
        model_name: selectedModel
      });
    } catch (error) {
      console.error('Sync failed:', error);
      
      // Show error notification
      addNotification({
        id: 'sync-error',
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
        id: 'load-more-start',
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
          id: 'load-more-success',
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
        id: 'load-more-error',
        type: 'email_fetch_error',
        message: error instanceof Error ? error.message : 'Failed to load more emails',
        timestamp: new Date(),
        model_name: selectedModel
      });
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <AppLayout showNotificationSidebar={true}>
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-800">
        {/* Simplified Header */}
        <header className="bg-gray-800 border-b border-gray-600 px-4 py-4 lg:px-6 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h1 className="text-xl md:text-2xl lg:text-2xl font-bold text-white">Dashboard</h1>
            <button
              onClick={handleSyncEmails}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center space-x-2 transition-all duration-200"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync</span>
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
                      {!email.userFeedback && (
                        <>
                          <button
                            onClick={() => handleFeedback(email.id, 'ham')}
                            disabled={feedbackSubmitting === email.id}
                            className="flex items-center space-x-1 px-2 py-1 bg-green-900/20 hover:bg-green-900/40 border border-green-700 text-green-300 rounded transition-all duration-200 disabled:opacity-50"
                          >
                            <ThumbsUp className="w-3 h-3" />
                            <span className="text-xs">Ham</span>
                          </button>
                          <button
                            onClick={() => handleFeedback(email.id, 'spam')}
                            disabled={feedbackSubmitting === email.id}
                            className="flex items-center space-x-1 px-2 py-1 bg-red-900/20 hover:bg-red-900/40 border border-red-700 text-red-300 rounded transition-all duration-200 disabled:opacity-50"
                          >
                            <ThumbsDown className="w-3 h-3" />
                            <span className="text-xs">Spam</span>
                          </button>
                        </>
                      )}
                      
                      {email.userFeedback && (
                        <span className={`px-2 py-1 rounded text-xs ${
                          email.userFeedback === 'spam' 
                            ? 'bg-red-900/30 border border-red-700 text-red-300' 
                            : 'bg-green-900/30 border border-green-700 text-green-300'
                        }`}>
                          ✓ Marked as {email.userFeedback.toUpperCase()}
                        </span>
                      )}
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

                  {/* User Feedback Section */}
                  {selectedEmail.userFeedback ? (
                    <div className="mb-6 p-4 rounded-lg bg-purple-900/20 border border-purple-700">
                      <div className="flex items-center">
                        <MessageSquare className="w-5 h-5 text-purple-400 mr-2" />
                        <span className="text-sm text-purple-300 font-medium">User Feedback Provided</span>
                      </div>
                      <p className="text-sm text-gray-300 mt-2">
                        Marked as <strong>{selectedEmail.userFeedback.toUpperCase()}</strong>
                        {selectedEmail.feedbackTimestamp && (
                          <> on {selectedEmail.feedbackTimestamp.toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="mb-6 p-4 rounded-lg bg-gray-700 border border-gray-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-300 font-medium mb-2">Help improve the model</p>
                          <p className="text-xs text-gray-400">
                            Was this classification correct? Your feedback helps train the reinforcement learning model.
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleFeedback(selectedEmail.id, 'ham')}
                            disabled={feedbackSubmitting === selectedEmail.id}
                            className="flex items-center space-x-1 px-3 py-2 bg-green-900/20 hover:bg-green-900/40 border border-green-700 text-green-300 rounded transition-all duration-200 disabled:opacity-50"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span className="text-sm">Ham (Safe)</span>
                          </button>
                          <button
                            onClick={() => handleFeedback(selectedEmail.id, 'spam')}
                            disabled={feedbackSubmitting === selectedEmail.id}
                            className="flex items-center space-x-1 px-3 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-700 text-red-300 rounded transition-all duration-200 disabled:opacity-50"
                          >
                            <ThumbsDown className="w-4 h-4" />
                            <span className="text-sm">Spam</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Email Content */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Email Content</h3>
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-600">
                      <div className="prose prose-gray max-w-none">
                        {selectedEmail.fullBody || selectedEmail.body || selectedEmail.snippet ? (
                          <div className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                            {selectedEmail.fullBody || selectedEmail.body || selectedEmail.snippet}
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
    </AppLayout>
  );
} 