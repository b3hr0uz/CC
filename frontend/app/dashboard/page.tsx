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

interface ModelClassification {
  model: string;
  classification: 'spam' | 'ham';
  confidence: number;
}

interface ExtendedEmailData extends EmailData {
  classification?: 'spam' | 'ham';
  confidence?: number;
  tags?: string[];
  timestamp?: string;
  read?: boolean;
  modelClassifications?: ModelClassification[]; // Different model predictions for same email
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
  const [userCorrectedEmails, setUserCorrectedEmails] = useState<Set<string>>(new Set());
  const [hoveredEmail, setHoveredEmail] = useState<string | null>(null);

  // Handle user feedback for email classification
  const handleUserFeedback = async (emailId: string, isCorrect: boolean) => {
    const feedbackType = isCorrect ? 'correct' : 'incorrect';
    
    // Update local state immediately for UI responsiveness
    setUserFeedback(prev => ({
      ...prev,
      [emailId]: feedbackType
    }));

    // If feedback indicates incorrect classification, update the email's classification
    if (!isCorrect) {
      // Track this email as user-corrected
      setUserCorrectedEmails(prev => new Set(prev).add(emailId));
      
      setEmails(prevEmails => 
        prevEmails.map(email => {
          if (email.id === emailId) {
            // Flip the classification: spam -> ham, ham -> spam
            const newClassification = email.classification === 'spam' ? 'ham' : 'spam';
            return {
              ...email,
              classification: newClassification as 'spam' | 'ham',
              // Optionally adjust confidence to reflect user correction
              confidence: 0.95 // High confidence since user corrected it
            };
          }
          return email;
        })
      );
    }

    try {
      // Send feedback to backend for reinforcement learning
      const email = emails.find(e => e.id === emailId);
      if (!email) return;

      // Calculate what the classification should be after user correction
      const correctedClassification = isCorrect 
        ? email.classification 
        : (email.classification === 'spam' ? 'ham' : 'spam');

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId,
          userFeedback: feedbackType,
          currentClassification: email.classification,
          correctedClassification: correctedClassification,
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
        
        // Show user notification for classification changes
        if (!isCorrect) {
          console.log(`📧 Email classification updated: ${email.classification} → ${correctedClassification}`);
        }
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

  // Helper function to generate model classifications for an email
  const generateModelClassifications = (primaryClass: 'spam' | 'ham', primaryConfidence: number): ModelClassification[] => {
    const models = ['Logistic Regression', 'Gradient Boosting', 'Naive Bayes', 'Neural Network'];
    const classifications: ModelClassification[] = [];
    
    models.forEach((model, index) => {
      let classification = primaryClass;
      let confidence = primaryConfidence;
      
      // Add some variation - sometimes models disagree
      if (Math.random() < 0.2) { // 20% chance of different classification
        classification = primaryClass === 'spam' ? 'ham' : 'spam';
        confidence = 0.5 + Math.random() * 0.3; // Lower confidence for disagreement
      } else {
        // Add small confidence variations
        confidence = Math.max(0.5, Math.min(0.99, confidence + (Math.random() * 0.2 - 0.1)));
      }
      
      classifications.push({
        model,
        classification,
        confidence
      });
    });
    
    return classifications;
  };

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
      
      const emailConfidence = template.confidence + (Math.random() * 0.1 - 0.05); // Small variation
      
      mockEmails.push({
        id: `mock-${i + 1}`,
        subject: template.subject + (i >= mockEmailTemplates.length ? ` (${Math.floor(i / mockEmailTemplates.length) + 1})` : ''),
        from: template.from,
        date: new Date(Date.now() - timeOffset).toISOString(),
        isRead: template.read,
        preview: template.preview,
        threadId: `thread-${i + 1}`,
        classification: template.classification,
        confidence: emailConfidence,
        tags: template.tags,
        timestamp: new Date(Date.now() - timeOffset).toISOString(),
        read: template.read,
        modelClassifications: generateModelClassifications(template.classification, emailConfidence)
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
        <header className="bg-white dark:bg-dark-bg border-b border-gray-200 dark:border-gray-600 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inbox</h1>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors shadow-sm"
              title={`Sync emails from ${session?.user?.email || 'your Google account'}`}
            >
              {/* Google Logo with refresh icon */}
              <div className="flex items-center mr-2">
                <div className="relative">
                  {/* Google Logo Background */}
                  <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center mr-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                </div>
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </div>
              <span className="font-medium">
                {isRefreshing ? 'Syncing Gmail...' : 'Sync Gmail'}
              </span>
            </button>
          </div>
        </header>

        {/* Error notification for Gmail access issues */}
        {emailError && (
          <div className="mx-6 mt-4 mb-4">
            <div className={`p-4 rounded-lg border ${
              emailError.type === 'auth' 
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${
                    emailError.type === 'auth' 
                      ? 'bg-blue-100 dark:bg-blue-800/30' 
                      : 'bg-yellow-100 dark:bg-yellow-800/30'
                  }`}>
                    {emailError.type === 'auth' ? (
                      <Shield className={`h-5 w-5 ${
                        emailError.type === 'auth' ? 'text-blue-600 dark:text-blue-400' : 'text-yellow-600 dark:text-yellow-400'
                      }`} />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className={`text-sm font-medium ${
                      emailError.type === 'auth' ? 'text-blue-800 dark:text-blue-200' : 'text-yellow-800 dark:text-yellow-200'
                    }`}>
                      {emailError.type === 'auth' ? 'Gmail Access Required' : 'Connection Issue'}
                    </h3>
                    <p className={`text-sm mt-1 ${
                      emailError.type === 'auth' ? 'text-blue-700 dark:text-blue-300' : 'text-yellow-700 dark:text-yellow-300'
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
            <div className="flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Tag className="h-4 w-4 text-gray-600 dark:text-gray-300 mr-2" />
              <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">Demo Mode</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">- Showing sample emails for demonstration</span>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-dark-bg rounded-lg shadow border border-gray-200 dark:border-gray-600 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Inbox className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-bg rounded-lg shadow border border-gray-200 dark:border-gray-600 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Mail className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Unread</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.unread}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-bg rounded-lg shadow border border-gray-200 dark:border-gray-600 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Ham</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.ham}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-bg rounded-lg shadow border border-gray-200 dark:border-gray-600 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Spam</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.spam}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 pb-4">
          <div className="bg-white dark:bg-dark-bg rounded-lg shadow border border-gray-200 dark:border-gray-600 p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search emails..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
                
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                >
                  <option value="all">All Emails</option>
                  <option value="ham">Ham Only</option>
                  <option value="spam">Spam Only</option>
                </select>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center space-x-3">
                  <span>Showing {filteredEmails.length} of {emails.length} emails</span>
                  <div className="flex items-center space-x-2">
                    <label htmlFor="email-limit" className="text-gray-500 dark:text-gray-400">
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
                      className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-dark-bg text-gray-900 dark:text-white"
                    />
                    <span className="text-gray-500 dark:text-gray-400">emails</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 px-6 pb-6 overflow-hidden">
          <div className="bg-white dark:bg-dark-bg rounded-lg shadow border border-gray-200 dark:border-gray-600 h-full flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Emails</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-300">Loading emails...</span>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-600">
                  {filteredEmails.map((email) => (
                  <div key={email.id} className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!email.read ? 'bg-blue-50/30 dark:bg-blue-900/20' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`flex-shrink-0 w-3 h-3 rounded-full ${
                            email.classification === 'spam' ? 'bg-red-500' : 'bg-green-500'
                          }`}></div>
                          <p className={`text-sm font-medium truncate ${!email.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                            {email.from}
                          </p>
                          {!email.read && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                              New
                            </span>
                          )}
                          <div className="flex items-center space-x-2">
                            {email.tags?.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
                              >
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <h3 className={`text-base font-semibold mb-1 ${!email.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                          {email.subject}
                        </h3>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {email.preview || 'No preview available'}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTime(email.timestamp || email.date)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 ml-6 relative">
                        <div 
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-all ${
                            email.classification === 'spam' 
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50' 
                              : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                          } ${userCorrectedEmails.has(email.id) ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
                          onMouseEnter={() => setHoveredEmail(email.id)}
                          onMouseLeave={() => setHoveredEmail(null)}
                        >
                          {email.classification === 'spam' ? (
                            <AlertCircle className="h-4 w-4 mr-1" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-1" />
                          )}
                          {email.classification === 'spam' ? 'Spam' : 'Ham'}
                          {userCorrectedEmails.has(email.id) && (
                            <span className="ml-1 text-xs">✓</span>
                          )}
                        </div>

                        {/* Model Classifications Tooltip */}
                        {hoveredEmail === email.id && email.modelClassifications && (
                          <div className="absolute z-50 left-0 top-full mt-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 min-w-64">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                              Model Classifications
                            </h4>
                            <div className="space-y-2">
                              {email.modelClassifications.map((modelClass, index) => (
                                <div key={index} className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600 dark:text-gray-300">
                                    {modelClass.model}:
                                  </span>
                                  <div className="flex items-center space-x-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      modelClass.classification === 'spam'
                                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                        : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                    }`}>
                                      {modelClass.classification === 'spam' ? (
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                      ) : (
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                      )}
                                      {modelClass.classification === 'spam' ? 'Spam' : 'Ham'}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {Math.round(modelClass.confidence * 100)}%
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Hover to see how different ML models classified this email
                              </p>
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                          {userCorrectedEmails.has(email.id) ? (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">User Corrected</span>
                          ) : (
                            <span>{Math.round((email.confidence || 0) * 100)}% confidence</span>
                          )}
                        </div>
                        
                        {/* User Feedback Buttons */}
                        <div className="mt-3 flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleUserFeedback(email.id, true)}
                            disabled={userFeedback[email.id] === 'correct'}
                            className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${
                              userFeedback[email.id] === 'correct'
                                ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400'
                                : 'bg-white dark:bg-dark-bg border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 hover:text-green-600 dark:hover:text-green-400'
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
                                ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400'
                                : 'bg-white dark:bg-dark-bg border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 hover:text-red-600 dark:hover:text-red-400'
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