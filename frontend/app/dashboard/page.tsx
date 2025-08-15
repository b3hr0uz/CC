'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AppLayout from '../components/AppLayout';
import { useNotifications } from '../contexts/NotificationContext';
import { 
  Mail, RefreshCw, AlertCircle, 
  CheckCircle
} from 'lucide-react';
import type { EmailData } from '../../lib/gmail';

interface ExtendedEmailData extends EmailData {
  classification?: 'spam' | 'ham';
  confidence?: number;
  snippet?: string;
}

export default function DashboardPage() {
  const { addNotification } = useNotifications();

  // State management
  const [emails, setEmails] = useState<ExtendedEmailData[]>([]);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<{type: string; message: string} | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('xgboost_rl');

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
      
      // Actually call the API to fetch emails
      const response = await fetch('/api/emails?limit=20', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync emails');
      }

      const { emails } = await response.json();
      
      // Update the emails state
      setEmails(emails);
      
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center">
                <Mail className="w-8 h-8 text-blue-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-300">Total Emails</p>
                  <p className="text-2xl font-bold text-white">{emails.length}</p>
                </div>
                </div>
              </div>
            <div className="bg-gray-700 p-4 rounded-lg">
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
            <div className="bg-gray-700 p-4 rounded-lg">
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

        {/* Email List */}
          <div className="space-y-4">
            {emails.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No emails loaded yet</p>
                <p className="text-sm text-gray-500">Click &quot;Sync&quot; to fetch your emails</p>
                </div>
              ) : (
              emails.slice(0, 10).map((email) => (
                <div key={email.id} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white truncate">{email.subject}</h3>
                      <p className="text-sm text-gray-300">{email.from}</p>
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
                  <p className="text-sm text-gray-400 truncate">{email.snippet}</p>
                            </div>
              ))
                          )}
                        </div>
                        </div>
                        </div>
    </AppLayout>
  );
} 