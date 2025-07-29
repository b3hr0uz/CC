'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { 
  Mail, Search, RefreshCw, AlertCircle, 
  CheckCircle, Clock, Tag, Inbox, Shield,
  ThumbsUp, ThumbsDown
} from 'lucide-react';
import type { EmailData } from '../../lib/gmail';

interface ExtendedEmailData extends EmailData {
  classification?: 'spam' | 'ham';
  confidence?: number;
  tags?: string[];
  timestamp?: string;
  read?: boolean;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [emails, setEmails] = useState<ExtendedEmailData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, spam, ham
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [emailError, setEmailError] = useState<{type: string, message: string} | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [emailLimit, setEmailLimit] = useState(20); // New state for controlling sample size
  const [userFeedback, setUserFeedback] = useState<{[emailId: string]: 'correct' | 'incorrect' | null}>({});

  // Handle user feedback for email classification
  const handleUserFeedback = async (emailId: string, isCorrect: boolean) => {
    const feedbackType = isCorrect ? 'correct' : 'incorrect';
    
    // Update local state immediately for UI responsiveness
    setUserFeedback(prev => ({
      ...prev,
      [emailId]: feedbackType
    }));

    try {
      // Send feedback to backend for reinforcement learning
      const email = emails.find(e => e.id === emailId);
      if (!email) return;

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId,
          userFeedback: feedbackType,
          currentClassification: email.classification,
          confidence: email.confidence,
          emailContent: {
            subject: email.subject,
            from: email.from,
            preview: email.preview
          }
        }),
      });

      if (!response.ok) {
        console.error('Failed to submit feedback');
        // Optionally revert the UI state on error
      } else {
        console.log('✅ Feedback submitted successfully');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  useEffect(() => {
    const fetchEmails = async () => {
      console.log('🔄 fetchEmails called - using updated error handling');
      try {
        setLoading(true);
        setEmailError(null);
        const response = await fetch(`/api/emails?limit=${emailLimit}`); // Use dynamic limit
        
        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch {
            errorData = { error: 'Network error' };
          }
          
          console.log('📧 Email fetch error:', response.status, errorData);
          
          if (response.status === 403 && (errorData as {code?: string}).code === 'INSUFFICIENT_SCOPE') {
            console.log('🔐 Insufficient scope error - using demo data');
            setEmailError({
              type: 'auth',
              message: 'Gmail access not authorized. Using demo data instead.'
            });
          } else if (response.status === 401) {
            console.log('🔒 Authentication error - session expired');
            setEmailError({
              type: 'auth',
              message: 'Session expired. Please sign in again to access Gmail.'
            });
          } else {
            console.log('⚠️ Generic error - using demo data');
            setEmailError({
              type: 'error',
              message: 'Unable to connect to Gmail. Using demo data instead.'
            });
          }
          
          console.log('📋 Loading mock data...');
          setUsingMockData(true);
          setEmails(getMockEmails());
          return; // Don't throw, just use mock data
        }

        console.log('✅ Gmail API success - processing emails');
        const data = await response.json();
        
        // Convert Gmail emails to our format and add mock classification for now
        const emailsWithClassification: ExtendedEmailData[] = data.emails.map((email: EmailData) => ({
          ...email,
          timestamp: email.date,
          read: email.isRead,
          // Mock classification - in real app, this would come from ML model
          classification: Math.random() > 0.7 ? 'spam' : 'ham',
          confidence: Math.random() * 0.3 + 0.7, // Random confidence between 0.7-1.0
          tags: generateTags(email.subject, email.from),
        }));

        setEmails(emailsWithClassification);
        setUsingMockData(false);
        setEmailError(null); // Clear any previous errors
      } catch (error) {
        console.error('Error fetching emails:', error);
        setEmailError({
          type: 'error',
          message: 'Unable to fetch emails. Using demo data instead.'
        });
        setUsingMockData(true);
        setEmails(getMockEmails());
      } finally {
        setLoading(false);
      }
    };

    if (status === 'loading') return; // Still loading session
    
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (session) {
      fetchEmails();
    }
  }, [session, status, router, emailLimit]);

  const getMockEmails = (): ExtendedEmailData[] => {
    const mockEmailTemplates = [
      {
        subject: 'Welcome to ContextCleanse!',
        from: 'welcome@contextcleanse.ai',
        preview: 'Welcome to ContextCleanse! We are excited to have you on board.',
        classification: 'ham' as const,
        confidence: 0.95,
        tags: ['welcome'],
        read: false
      },
      {
        subject: 'URGENT: Claim your prize now!', 
        from: 'winner@suspicious-lottery.fake',
        preview: 'You have won a prize! Click here to claim it now!',
        classification: 'spam' as const,
        confidence: 0.98,
        tags: ['suspicious'],
        read: false
      },
      {
        subject: 'Weekly Team Update',
        from: 'manager@company.com',
        preview: 'Here is the weekly team update. Please review it before our meeting.',
        classification: 'ham' as const,
        confidence: 0.89,
        tags: ['work'],
        read: true
      },
      {
        subject: 'Limited Time Offer - Buy Now!',
        from: 'deals@spamstore.net',
        preview: 'Special discount available for the next 24 hours only!',
        classification: 'spam' as const,
        confidence: 0.92,
        tags: ['promotional'],
        read: false
      },
      {
        subject: 'Meeting Reminder: Project Review',
        from: 'calendar@workplace.com',
        preview: 'Reminder about your upcoming project review meeting.',
        classification: 'ham' as const,
        confidence: 0.87,
        tags: ['meeting'],
        read: false
      },
      {
        subject: 'Free Money - No Strings Attached!',
        from: 'money@scammer.fake',
        preview: 'Get free money with no questions asked! Act now!',
        classification: 'spam' as const,
        confidence: 0.99,
        tags: ['scam'],
        read: false
      },
      {
        subject: 'Your Invoice #12345',
        from: 'billing@service.com',
        preview: 'Your monthly invoice is ready for review.',
        classification: 'ham' as const,
        confidence: 0.91,
        tags: ['billing'],
        read: true
      },
      {
        subject: 'Congratulations Winner!!!',
        from: 'lottery@fake-contest.org',
        preview: 'You are our lucky winner! Click to claim your million dollars!',
        classification: 'spam' as const,
        confidence: 0.97,
        tags: ['lottery', 'suspicious'],
        read: false
      }
    ];

    const mockEmails: ExtendedEmailData[] = [];
    
    for (let i = 0; i < emailLimit; i++) {
      const template = mockEmailTemplates[i % mockEmailTemplates.length];
      const timeOffset = i * 3600000; // 1 hour apart
      
      mockEmails.push({
        id: `mock-${i + 1}`,
        subject: template.subject + (i >= mockEmailTemplates.length ? ` (${Math.floor(i / mockEmailTemplates.length) + 1})` : ''),
        from: template.from,
        date: new Date(Date.now() - timeOffset).toISOString(),
        isRead: template.read,
        preview: template.preview,
        threadId: `thread-${i + 1}`,
        classification: template.classification,
        confidence: template.confidence + (Math.random() * 0.1 - 0.05), // Small variation
        tags: template.tags,
        timestamp: new Date(Date.now() - timeOffset).toISOString(),
        read: template.read
      });
    }
    
    return mockEmails;
  };

  const fetchEmails = async () => {
    console.log('🔄 fetchEmails called - using updated error handling');
    try {
      setLoading(true);
      setEmailError(null);
      const response = await fetch(`/api/emails?limit=${emailLimit}`); // Use dynamic limit
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'Network error' };
        }
        
        console.log('📧 Email fetch error:', response.status, errorData);
        
        if (response.status === 403 && (errorData as {code?: string}).code === 'INSUFFICIENT_SCOPE') {
          console.log('🔐 Insufficient scope error - using demo data');
          setEmailError({
            type: 'auth',
            message: 'Gmail access not authorized. Using demo data instead.'
          });
        } else if (response.status === 401) {
          console.log('🔒 Authentication error - session expired');
          setEmailError({
            type: 'auth',
            message: 'Session expired. Please sign in again to access Gmail.'
          });
        } else {
          console.log('⚠️ Generic error - using demo data');
          setEmailError({
            type: 'error',
            message: 'Unable to connect to Gmail. Using demo data instead.'
          });
        }
        
        console.log('📋 Loading mock data...');
        setUsingMockData(true);
        setEmails(getMockEmails());
        return; // Don't throw, just use mock data
      }

      console.log('✅ Gmail API success - processing emails');
      const data = await response.json();
      
      // Convert Gmail emails to our format and add mock classification for now
      const emailsWithClassification: ExtendedEmailData[] = data.emails.map((email: EmailData) => ({
        ...email,
        timestamp: email.date,
        read: email.isRead,
        // Mock classification - in real app, this would come from ML model
        classification: Math.random() > 0.7 ? 'spam' : 'ham',
        confidence: Math.random() * 0.3 + 0.7, // Random confidence between 0.7-1.0
        tags: generateTags(email.subject, email.from),
      }));

      setEmails(emailsWithClassification);
      setUsingMockData(false);
      setEmailError(null); // Clear any previous errors
    } catch (error) {
      console.error('Error fetching emails:', error);
      setEmailError({
        type: 'error',
        message: 'Unable to fetch emails. Using demo data instead.'
      });
      setUsingMockData(true);
      setEmails(getMockEmails());
    } finally {
      setLoading(false);
    }
  };

  const generateTags = (subject: string, from: string): string[] => {
    const tags = [];
    if (subject.toLowerCase().includes('newsletter') || subject.toLowerCase().includes('update')) {
      tags.push('newsletter');
    }
    if (subject.toLowerCase().includes('security') || subject.toLowerCase().includes('alert')) {
      tags.push('security');
    }
    if (subject.toLowerCase().includes('bill') || subject.toLowerCase().includes('payment')) {
      tags.push('billing');
    }
    if (from.includes('github.com')) {
      tags.push('github');
    }
    if (from.includes('google.com')) {
      tags.push('google');
    }
    return tags.slice(0, 2); // Limit to 2 tags
  };

  const stats = {
    total: emails.length,
    spam: emails.filter(e => e.classification === 'spam').length,
    ham: emails.filter(e => e.classification === 'ham').length,
    unread: emails.filter(e => !e.read).length,
    accuracy: 94.2
  };

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.from.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || email.classification === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchEmails();
    setIsRefreshing(false);
  };

  const handleReauth = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Syncing...' : 'Sync Emails'}
            </button>
          </div>
        </header>

        {/* Error notification for Gmail access issues */}
        {emailError && (
          <div className="mx-6 mt-4 mb-4">
            <div className={`p-4 rounded-lg border ${
              emailError.type === 'auth' 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${
                    emailError.type === 'auth' 
                      ? 'bg-blue-100' 
                      : 'bg-yellow-100'
                  }`}>
                    {emailError.type === 'auth' ? (
                      <Shield className={`h-5 w-5 ${
                        emailError.type === 'auth' ? 'text-blue-600' : 'text-yellow-600'
                      }`} />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className={`text-sm font-medium ${
                      emailError.type === 'auth' ? 'text-blue-800' : 'text-yellow-800'
                    }`}>
                      {emailError.type === 'auth' ? 'Gmail Access Required' : 'Connection Issue'}
                    </h3>
                    <p className={`text-sm mt-1 ${
                      emailError.type === 'auth' ? 'text-blue-700' : 'text-yellow-700'
                    }`}>
                      {emailError.message}
                      {usingMockData && ' You can explore the interface with sample data below.'}
                    </p>
                  </div>
                </div>
                {emailError.type === 'auth' && (
                  <button
                    onClick={handleReauth}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Grant Gmail Access
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mock data indicator */}
        {usingMockData && (
          <div className="mx-6 mb-4">
            <div className="flex items-center px-3 py-2 bg-gray-100 rounded-lg">
              <Tag className="h-4 w-4 text-gray-600 mr-2" />
              <span className="text-sm text-gray-600 font-medium">Demo Mode</span>
              <span className="text-sm text-gray-500 ml-2">- Showing sample emails for demonstration</span>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Inbox className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Mail className="h-5 w-5 text-orange-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Unread</p>
                  <p className="text-xl font-bold text-gray-900">{stats.unread}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Ham</p>
                  <p className="text-xl font-bold text-gray-900">{stats.ham}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Spam</p>
                  <p className="text-xl font-bold text-gray-900">{stats.spam}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 pb-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search emails..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Emails</option>
                  <option value="ham">Ham Only</option>
                  <option value="spam">Spam Only</option>
                </select>
              </div>

              <div className="text-sm text-gray-600">
                <div className="flex items-center space-x-3">
                  <span>Showing {filteredEmails.length} of {emails.length} emails</span>
                  <div className="flex items-center space-x-2">
                    <label htmlFor="email-limit" className="text-gray-500">
                      Sample size:
                    </label>
                    <input
                      id="email-limit"
                      type="number"
                      min="1"
                      max="100"
                      value={emailLimit}
                      onChange={(e) => {
                        const newLimit = Math.max(1, Math.min(100, parseInt(e.target.value) || 20));
                        setEmailLimit(newLimit);
                      }}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-gray-500">emails</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 px-6 pb-6 overflow-hidden">
          <div className="bg-white rounded-lg shadow h-full flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Latest Emails</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="ml-3 text-gray-600">Loading emails...</span>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredEmails.map((email) => (
                  <div key={email.id} className={`p-4 hover:bg-gray-50 transition-colors ${!email.read ? 'bg-blue-50/30' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`flex-shrink-0 w-3 h-3 rounded-full ${
                            email.classification === 'spam' ? 'bg-red-500' : 'bg-green-500'
                          }`}></div>
                          <p className={`text-sm font-medium truncate ${!email.read ? 'text-gray-900' : 'text-gray-600'}`}>
                            {email.from}
                          </p>
                          {!email.read && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              New
                            </span>
                          )}
                          <div className="flex items-center space-x-2">
                            {email.tags?.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <h3 className={`text-base font-semibold mb-1 ${!email.read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {email.subject}
                        </h3>
                        
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {email.preview || 'No preview available'}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTime(email.timestamp || email.date)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 ml-6">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          email.classification === 'spam' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {email.classification === 'spam' ? (
                            <AlertCircle className="h-4 w-4 mr-1" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-1" />
                          )}
                          {email.classification === 'spam' ? 'Spam' : 'Ham'}
                        </div>
                        
                        <div className="mt-2 text-xs text-gray-500 text-center">
                          {Math.round((email.confidence || 0) * 100)}% confidence
                        </div>
                        
                        {/* User Feedback Buttons */}
                        <div className="mt-3 flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleUserFeedback(email.id, true)}
                            disabled={userFeedback[email.id] === 'correct'}
                            className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${
                              userFeedback[email.id] === 'correct'
                                ? 'bg-green-100 border-green-300 text-green-700'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-green-50 hover:border-green-300 hover:text-green-600'
                            }`}
                            title="Classification is correct"
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => handleUserFeedback(email.id, false)}
                            disabled={userFeedback[email.id] === 'incorrect'}
                            className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${
                              userFeedback[email.id] === 'incorrect'
                                ? 'bg-red-100 border-red-300 text-red-700'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                            }`}
                            title="Classification is incorrect"
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </button>
                        </div>
                        
                        {/* Feedback Status */}
                        {userFeedback[email.id] && (
                          <div className="mt-2 text-xs text-center">
                            <span className={`px-2 py-1 rounded-full ${
                              userFeedback[email.id] === 'correct'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {userFeedback[email.id] === 'correct' ? '✓ Feedback: Correct' : '✗ Feedback: Incorrect'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  ))}
                  
                  {filteredEmails.length === 0 && !loading && (
                    <div className="text-center py-12">
                      <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No emails found matching your criteria</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}