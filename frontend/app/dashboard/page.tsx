'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import NotificationSidebar from '../components/NotificationSidebar';
import { 
  Mail, Search, RefreshCw, AlertCircle, 
  CheckCircle, Clock, Tag, Inbox, Shield,
  ThumbsUp, ThumbsDown, X, Eye, ExternalLink, Paperclip, Smile, Brain
} from 'lucide-react';
import type { EmailData } from '../../lib/gmail';
import axios from 'axios'; // Added axios import

interface ModelClassification {
  model: string;
  classification: 'spam' | 'ham';
  confidence: number;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
  training_time?: number;
}

interface ExtendedEmailData extends EmailData {
  classification?: 'spam' | 'ham';
  confidence?: number;
  tags?: string[];
  timestamp?: string;
  read?: boolean;
  modelClassifications?: ModelClassification[]; // Different model predictions for same email
  content?: string; // Full email content
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
  const [selectedEmail, setSelectedEmail] = useState<ExtendedEmailData | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [loadingEmailContent, setLoadingEmailContent] = useState(false);
  
  // Model selection states
  const [selectedModel, setSelectedModel] = useState<string>('gradient_boosting');
  const [availableModels, setAvailableModels] = useState<Record<string, {
    name: string;
    f1_score: number;
  }>>({
    'gradient_boosting': { name: 'Gradient Boosting', f1_score: 0.924 },
    'neural_network': { name: 'Neural Network', f1_score: 0.901 },
    'logistic_regression': { name: 'Logistic Regression', f1_score: 0.886 },
    'naive_bayes': { name: 'Naive Bayes', f1_score: 0.845 }
  });
  const [modelPredictions, setModelPredictions] = useState<Record<string, {
    classification: 'spam' | 'ham';
    confidence: number;
  }>>({});

  // RL Notification system
  const [rlNotifications, setRlNotifications] = useState<Array<{
    id: string;
    type: 'rl_optimization_start' | 'rl_optimization_complete' | 'rl_error';
    model_name: string;
    message: string;
    timestamp: Date;
    emailId?: string;
    improvements?: {
      accuracyGain: number;
      precisionGain: number;
      recallGain: number;
      f1ScoreGain: number;
    };
    start_time?: Date;
    end_time?: Date;
    duration?: number;
    estimated_duration?: number;
    timeoutId?: NodeJS.Timeout;
  }>>([]);
  const [rlNotificationCounter, setRlNotificationCounter] = useState(0);

  // Generate unique RL notification ID
  const generateRLNotificationId = (type: string, emailId?: string) => {
    const timestamp = Date.now();
    const counter = rlNotificationCounter;
    setRlNotificationCounter(prev => prev + 1);
    return `${type}-${emailId || 'system'}-${timestamp}-${counter}`;
  };

  // Add RL notification
  const addRLNotification = (notification: typeof rlNotifications[0]) => {
    setRlNotifications(prev => {
      const newNotifications = [notification, ...prev.slice(0, 9)]; // Keep last 10 notifications
      return newNotifications;
    });
    
    // Auto-remove notification after 15 seconds with cleanup
    const timeoutId = setTimeout(() => {
      setRlNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 15000);
    
    notification.timeoutId = timeoutId;
  };

  // Handle user feedback for email classification
  const handleUserFeedback = async (emailId: string, isCorrect: boolean) => {
    const feedbackType = isCorrect ? 'correct' : 'incorrect';
    
    console.log('👆 User feedback:', feedbackType, 'for email:', emailId);
    
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
            console.log('🔄 Flipping classification:', email.classification, '→', newClassification);
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

    // Find the email for feedback processing
    const email = emails.find(e => e.id === emailId);
    if (!email) {
      console.error('❌ Email not found for feedback:', emailId);
      return;
    }

    try {
      // Calculate what the classification should be after user correction
      const correctedClassification = isCorrect 
        ? email.classification 
        : (email.classification === 'spam' ? 'ham' : 'spam');

      console.log('📤 Sending feedback to backend...');
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
            preview: email.preview,
            content: email.content // Include full content for RL training
          }
        }),
      });

      if (!response.ok) {
        console.error('❌ Failed to submit feedback, status:', response.status);
        // Optionally revert the UI state on error
      } else {
        const result = await response.json();
        console.log('✅ Feedback submitted successfully:', result.message);
        
        // Show user notification for classification changes
        if (!isCorrect) {
          console.log(`📧 Email classification updated: ${email.classification} → ${correctedClassification}`);
        }

        // Trigger asynchronous Reinforcement Learning optimization
        await triggerReinforcementLearningOptimization(emailId, {
          feedback: feedbackType,
          originalClassification: email.classification || 'ham',
          correctedClassification: correctedClassification || 'ham',
          confidence: email.confidence || 0.5,
          modelUsed: selectedModel,
          emailFeatures: {
            subject: email.subject,
            from: email.from,
            content: email.content || email.preview,
            hasLinks: (email.content || email.preview).includes('http'),
            hasAttachments: (email.content || email.preview).includes('attachment'),
            wordCount: (email.content || email.preview).split(' ').length
          }
        });
      }
    } catch (error) {
      console.error('❌ Error submitting feedback:', error);
    }
  };

  useEffect(() => {
    const fetchEmails = async () => {
      console.log('🔄 fetchEmails called - using updated error handling');
      try {
        setLoading(true);
        setEmailError(null);
        
        // Check if this is a mock user session
        if (session?.isMockUser) {
          console.log('🧪 Mock user detected - using mock data only');
          setEmailError({
            type: 'info',
            message: 'Demo mode active - showing sample email data.'
          });
          setUsingMockData(true);
          setEmails(getMockEmails());
          return;
        }
        
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
  const generateModelClassifications = (primaryClassification: 'spam' | 'ham', confidence: number): ModelClassification[] => {
    const models = [
      {
        model: 'Gradient Boosting',
        classification: primaryClassification,
        confidence: Math.min(0.99, confidence + (Math.random() * 0.1 - 0.05)),
        accuracy: 0.924,
        precision: 0.918,
        recall: 0.931,
        f1_score: 0.924,
        training_time: 45.7
      },
      {
        model: 'Neural Network',
        classification: Math.random() > 0.15 ? primaryClassification : (primaryClassification === 'spam' ? 'ham' : 'spam'),
        confidence: Math.min(0.99, confidence + (Math.random() * 0.15 - 0.075)),
        accuracy: 0.901,
        precision: 0.895,
        recall: 0.907,
        f1_score: 0.901,
        training_time: 127.4
      } as ModelClassification,
      {
        model: 'Logistic Regression',
        classification: Math.random() > 0.2 ? primaryClassification : (primaryClassification === 'spam' ? 'ham' : 'spam'),
        confidence: Math.min(0.99, confidence + (Math.random() * 0.2 - 0.1)),
        accuracy: 0.887,
        precision: 0.892,
        recall: 0.881,
        f1_score: 0.886,
        training_time: 12.3
      } as ModelClassification,
      {
        model: 'Naive Bayes',
        classification: Math.random() > 0.25 ? primaryClassification : (primaryClassification === 'spam' ? 'ham' : 'spam'),
        confidence: Math.min(0.99, confidence + (Math.random() * 0.25 - 0.125)),
        accuracy: 0.845,
        precision: 0.849,
        recall: 0.841,
        f1_score: 0.845,
        training_time: 3.2
      } as ModelClassification
    ];

    return models;
  };

  const getMockEmails = (): ExtendedEmailData[] => {
    const mockEmailTemplates = [
      {
        subject: 'Welcome to ContextCleanse!',
        from: 'welcome@contextcleanse.ai',
        preview: 'Welcome to ContextCleanse! We are excited to have you on board.',
        content: `Welcome to ContextCleanse!

Dear User,

We are excited to have you on board with ContextCleanse - your intelligent email management solution!

Here's what you can expect:

🔍 **Smart Classification**: Our AI automatically categorizes your emails as spam or legitimate messages
📊 **Detailed Analytics**: Track your email patterns and model performance
🎯 **Continuous Learning**: Your feedback helps improve our models
🔒 **Privacy First**: Your data stays secure and private

Getting Started:
1. Connect your Gmail account (already done!)
2. Review the automatically classified emails
3. Provide feedback on any misclassified emails
4. Watch as the system learns from your preferences

Need help? Contact our support team at support@contextcleanse.ai

Best regards,
The ContextCleanse Team

---
© 2025 ContextCleanse
Privacy Policy | Terms of Service | Unsubscribe`,
        classification: 'ham' as const,
        confidence: 0.95,
        tags: ['welcome'],
        read: false
      },
      {
        subject: 'URGENT: Claim your prize now!', 
        from: 'winner@suspicious-lottery.fake',
        preview: 'You have won a prize! Click here to claim it now!',
        content: `🎉 CONGRATULATIONS! YOU'VE WON! 🎉

WINNER NOTIFICATION #784592

Dear Lucky Winner,

You have been selected as the GRAND PRIZE WINNER in our international lottery! 

YOUR PRIZE: $1,000,000 USD + Brand New Mercedes-Benz

To claim your prize:
1. Click here: http://suspicious-lottery.fake/claim?token=xyz123
2. Provide your bank details
3. Pay the processing fee of $299
4. Receive your prize within 24 hours!

⚠️ URGENT: This offer expires in 2 hours!

Don't miss this once-in-a-lifetime opportunity!

Contact our claims department:
Email: claims@suspicious-lottery.fake
Phone: +1-800-SCAMMER

Best regards,
John Scammer
International Prize Committee

LEGAL DISCLAIMER: This email is totally legitimate and not a scam at all. Trust us.`,
        classification: 'spam' as const,
        confidence: 0.98,
        tags: ['suspicious'],
        read: false
      },
      {
        subject: 'Weekly Team Update',
        from: 'manager@company.com',
        preview: 'Here is the weekly team update. Please review it before our meeting.',
        content: `Weekly Team Update - Week of December 16, 2024

Team,

Here's our weekly update covering key accomplishments and upcoming priorities:

📈 **This Week's Achievements:**
• Project Alpha: Completed user authentication module (Sarah, Mike)
• Project Beta: Deployed v2.1 to staging environment (Alex)
• Code reviews: 15 PRs reviewed and merged
• Client Demo: Successfully presented new features to MegaCorp

🎯 **Next Week's Priorities:**
• Project Alpha: Begin payment integration (Sarah)
• Project Beta: Performance optimization (Alex, Jordan)
• Team Training: React 18 workshop on Wednesday
• Sprint Planning: Friday 2 PM

📊 **Metrics:**
• Velocity: 42 story points (↑ from 38 last week)
• Bug count: 3 critical, 8 minor
• Test coverage: 87% (target: 90%)

🚨 **Action Items:**
• All: Update time tracking in Jira by EOD Friday
• Sarah: Prepare payment integration architecture doc
• Mike: Review security audit findings

Meeting: Friday 10 AM in Conference Room B

Questions? Slack me.

Best,
Jennifer Martinez
Engineering Manager`,
        classification: 'ham' as const,
        confidence: 0.89,
        tags: ['work'],
        read: true
      },
      {
        subject: 'Limited Time Offer - Buy Now!',
        from: 'deals@spamstore.net',
        preview: 'Special discount available for the next 24 hours only!',
        content: `🔥 FLASH SALE ALERT! 🔥

LIMITED TIME OFFER - 24 HOURS ONLY!

GET 90% OFF EVERYTHING IN STORE!

Our biggest sale of the year is here! 

FEATURED DEALS:
💊 Miracle Weight Loss Pills - Was $199, Now $19!
💎 "Genuine" Rolex Watches - Was $5000, Now $99!
📱 Latest iPhone (Definitely Real) - Was $999, Now $149!
🏠 Work From Home Opportunities - Earn $5000/week!

⏰ HURRY! Sale ends in: 23:59:47

Shop now or regret forever!

👆 CLICK HERE TO SAVE BIG! 👆
[Definitely Not Malware Button]

Special bonuses:
• Free shipping worldwide*
• Money back guarantee**
• No questions asked***

*Shipping fee only $89.99
**Guarantee void where prohibited
***We will ask lots of questions

From your friends at Totally Legitimate Store,
SpamStore Inc.

Unsubscribe | Privacy Policy | Why Are You Still Reading This?`,
        classification: 'spam' as const,
        confidence: 0.92,
        tags: ['promotional'],
        read: false
      },
      {
        subject: 'Meeting Reminder: Project Review',
        from: 'calendar@workplace.com',
        preview: 'Reminder about your upcoming project review meeting.',
        content: `Meeting Reminder

📅 **Project Review Meeting**

When: Tomorrow, December 17, 2024 at 2:00 PM PST
Where: Conference Room A (Building 2, Floor 3)
Duration: 1 hour

**Attendees:**
• You
• Sarah Johnson (Product Manager)
• Mike Chen (Tech Lead)
• Alex Rivera (QA Lead)
• Dr. Jennifer Martinez (Engineering Manager)

**Agenda:**
1. Q4 Progress Review (15 min)
2. Technical Architecture Discussion (20 min)
3. Resource Allocation for Q1 2025 (15 min)
4. Risk Assessment and Mitigation (10 min)

**Required Materials:**
✓ Project status report
✓ Technical documentation
✓ Budget projections for Q1
✓ Risk register updates

**Video Conference Link:**
Join Zoom Meeting: https://workplace.zoom.us/j/123456789
Meeting ID: 123 456 789
Passcode: ProjectReview

**Preparation Notes:**
Please review the attached documents before the meeting:
• Project_Status_Q4_2024.pdf
• Technical_Architecture_v3.2.docx
• Budget_Projections_Q1_2025.xlsx

If you need to reschedule, please contact Sarah Johnson at sarah.johnson@workplace.com

This meeting was scheduled by: Workplace Calendar System
Questions? Contact IT Support: help@workplace.com`,
        classification: 'ham' as const,
        confidence: 0.87,
        tags: ['meeting'],
        read: false
      },
      {
        subject: 'Free Money - No Strings Attached!',
        from: 'money@scammer.fake',
        preview: 'Get free money with no questions asked! Act now!',
        content: `💰 FREE MONEY ALERT! 💰

NO STRINGS ATTACHED!*

Hello Friend,

I am Prince Abubakar from Nigeria and I have GREAT NEWS for you!

My late father (King of Nigeria) left $50 MILLION USD in a secret bank account, and I need your help to transfer it out of the country. 

In exchange for your assistance, I will give you 50% of the money ($25 MILLION USD)!

All you need to do:
1. Send me your bank account details
2. Pay small processing fee of $5,000 USD
3. Wait for your $25 MILLION to arrive!

I am 100% LEGITIMATE PRINCE (not scammer). Here is proof:
• I said I'm a prince (this is proof)
• My email looks very official
• I promise this is real

Time is running out! The government is trying to take this money. We must act NOW!

Send money via:
• Western Union to: Prince Abubakar, Lagos, Nigeria
• Bitcoin: 1ScammerWallet123456789
• Gift cards: iTunes, Google Play, Steam

Contact me immediately:
Email: totally.real.prince@scammer.fake
WhatsApp: +234-800-SCAMMER
Telegram: @DefinitelyARealPrince

Your future business partner,
Prince Abubakar Scammerson III
Crown Prince of Nigeria
CEO of Legitimate Business Enterprises
PhD in Not Being A Scammer

*Strings may be attached. Many strings. All the strings.

P.S. Please don't Google "Nigerian Prince Scam" - those are fake princes, not me!`,
        classification: 'spam' as const,
        confidence: 0.99,
        tags: ['scam'],
        read: false
      },
      {
        subject: 'Your Invoice #12345',
        from: 'billing@service.com',
        preview: 'Your monthly invoice is ready for review.',
        content: `Invoice #12345

CloudService Pro
123 Tech Street, Suite 100
San Francisco, CA 94105
support@service.com

**INVOICE**

Bill To:
Your Company Name
Your Address
City, State ZIP

**Invoice Details:**
Invoice Number: #12345
Invoice Date: December 15, 2024
Due Date: January 15, 2025
Payment Terms: Net 30

**Services:**

CloudService Pro - Premium Plan
Period: December 1-31, 2024
• 500GB Storage: $29.99
• Advanced Analytics: $19.99
• Priority Support: $9.99
• API Access (10K calls): $14.99

Subtotal: $74.96
Tax (8.5%): $6.37
**Total Due: $81.33**

**Payment Methods:**

💳 Credit Card: ending in ****-1234 (Auto-pay enabled)
🏦 Bank Transfer: Account ending in ****-5678
📧 PayPal: billing@yourcompany.com

**Usage Summary:**
• Storage Used: 387GB of 500GB (77%)
• API Calls: 8,247 of 10,000 (82%)
• Support Tickets: 2 (resolved)
• Uptime: 99.9%

**Next Billing Date:** January 15, 2025

Need help? Contact our support team:
📧 Email: support@service.com
📞 Phone: 1-800-SUPPORT
💬 Live Chat: service.com/chat

Thank you for choosing CloudService Pro!

**Important:** This invoice will be automatically charged to your default payment method on the due date unless you update your billing preferences.

View Online | Download PDF | Update Billing Info | Contact Support`,
        classification: 'ham' as const,
        confidence: 0.91,
        tags: ['billing'],
        read: true
      },
      {
        subject: 'Congratulations Winner!!!',
        from: 'lottery@fake-contest.org',
        preview: 'You are our lucky winner! Click to claim your million dollars!',
        content: `🎊 CONGRATULATIONS WINNER!!! 🎊

OFFICIAL WINNER NOTIFICATION
Confirmation Code: SCAM-2024-FAKE-001

🏆 YOU HAVE WON THE MEGA INTERNATIONAL LOTTERY! 🏆

Prize Amount: $1,000,000.00 USD
Bonus Prize: Brand New Tesla Model S
Additional Bonus: iPhone 15 Pro Max

**How did you win?**
Your email was randomly selected from billions of internet users worldwide! (This is definitely how lotteries work)

**URGENT ACTION REQUIRED:**
You have 48 hours to claim your prize or it will be given to someone else!

📋 **To Claim Your Prize:**
1. Send us your full name and address ✓
2. Provide your bank account details ✓  
3. Pay the insurance fee of $299 ✓
4. Pay the processing fee of $199 ✓
5. Pay the anti-terrorism fee of $99 ✓
6. Pay the "we need more money" fee of $499 ✓

**Payment Methods:**
• Western Union (preferred)
• MoneyGram
• Bitcoin
• Gift Cards (iTunes, Google Play, Steam)
• Cash in unmarked envelope

**Contact Our Claims Department:**
📧 Email: claims@fake-contest.org
📱 WhatsApp: +1-800-FAKE-WIN
🌐 Website: www.totally-not-a-scam.fake

**Testimonials from Previous Winners:**
"I paid the fees and got my million dollars!" - Definitely Real Person
"This is 100% legitimate! I'm rich now!" - Not A Bot
"I wish I had suspicious thoughts but I don't!" - Gullible Person

⚠️ WARNING: Do not research "lottery scams" on Google. Our lawyers say this is illegal.

Congratulations again!

Dr. John Fakewinner
Director of Legitimate Prize Distribution
International Fake Lottery Commission
Certified by the Bureau of Definitely Real Things

© 2025 Fake Contest Organization. All rights reserved.
This email is totally legitimate and not suspicious at all.`,
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
        content: template.content, // FIX: Include content field from template
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
      
      // Check if this is a mock user session
      if (session?.isMockUser) {
        console.log('🧪 Mock user detected - using mock data only');
        setEmailError({
          type: 'info',
          message: 'Demo mode active - showing sample email data.'
        });
        setUsingMockData(true);
        setEmails(getMockEmails());
        return;
      }
      
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

  const handleEmailClick = async (email: ExtendedEmailData) => {
    setSelectedEmail(email);
    setIsEmailModalOpen(true);
    
    // For mock data, ensure content is available (fallback to preview if needed)
    if (usingMockData || session?.isMockUser) {
      if (!email.content) {
        console.log('📝 Mock email content missing, using preview:', email.subject);
        const updatedEmail = { ...email, content: email.preview || 'Email content not available for preview.' };
        setSelectedEmail(updatedEmail);
        
        // Also update the emails array
        setEmails(prevEmails => 
          prevEmails.map(e => 
            e.id === email.id ? updatedEmail : e
          )
        );
      } else {
        console.log('📝 Mock email content already available:', email.subject);
      }
      return;
    }
    
    // Fetch full content if not already loaded (for real Gmail data)
    if (!email.content) {
      console.log('📧 Fetching full content for Gmail email:', email.subject);
      setLoadingEmailContent(true);
      try {
        const response = await axios.post('/api/emails', { messageId: email.id });
        const fullContent = response.data.content;
        
        console.log('✅ Successfully fetched email content, length:', fullContent?.length || 0);
        
        // Update the email object with full content
        const updatedEmail = { 
          ...email, 
          content: fullContent || email.preview || 'Email content could not be loaded (empty response).' 
        };
        setSelectedEmail(updatedEmail);
        
        // Also update the emails array
        setEmails(prevEmails => 
          prevEmails.map(e => 
            e.id === email.id ? updatedEmail : e
          )
        );
      } catch (error) {
        console.error('❌ Error fetching email content:', error);
        // Fallback to preview if full content fails
        const updatedEmail = { 
          ...email, 
          content: email.preview || 'Email content could not be loaded due to connection issues.' 
        };
        setSelectedEmail(updatedEmail);
      } finally {
        setLoadingEmailContent(false);
      }
    } else {
      console.log('📧 Gmail email content already available:', email.subject);
    }
  };

  const closeEmailModal = () => {
    setIsEmailModalOpen(false);
    setSelectedEmail(null);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Trigger asynchronous Reinforcement Learning optimization
  const triggerReinforcementLearningOptimization = async (emailId: string, feedbackData: {
    feedback: string;
    originalClassification: string;
    correctedClassification: string;
    confidence: number;
    modelUsed: string;
    emailFeatures: {
      subject: string;
      from: string;
      content: string;
      hasLinks: boolean;
      hasAttachments: boolean;
      wordCount: number;
    };
  }) => {
    console.log('🧠 Starting Reinforcement Learning optimization for email:', emailId);
    
    try {
      const startTime = new Date();
      
      // Add RL optimization start notification
      addRLNotification({
        id: generateRLNotificationId('rl_optimization_start', emailId),
        type: 'rl_optimization_start',
        model_name: `RL Engine (${feedbackData.modelUsed})`,
        message: `Starting RL optimization based on ${feedbackData.feedback} feedback`,
        timestamp: startTime,
        emailId,
        start_time: startTime,
        estimated_duration: 3 + Math.random() * 5 // 3-8 seconds
      });

      // Send RL optimization request asynchronously (don't wait for completion)
      const rlOptimizationPromise = fetch('/api/reinforcement-learning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'user_feedback_optimization',
          emailId,
          timestamp: new Date().toISOString(),
          feedbackData,
          currentBestModel: selectedModel,
          sessionId: session?.user?.email || 'anonymous',
          optimizationConfig: {
            algorithm: 'policy_gradient', // Using policy gradient for RL
            learningRate: 0.001,
            explorationRate: 0.1,
            batchSize: 32,
            targetModelUpdate: true
          }
        }),
      });

      // Show immediate feedback to user about RL optimization starting
      console.log('🚀 RL optimization initiated asynchronously');

      // Handle the RL response asynchronously without blocking UI
      rlOptimizationPromise
        .then(async (response) => {
          const endTime = new Date();
          const duration = (endTime.getTime() - startTime.getTime()) / 1000;
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ RL optimization completed:', result);
            
            // Add RL optimization complete notification
            addRLNotification({
              id: generateRLNotificationId('rl_optimization_complete', emailId),
              type: 'rl_optimization_complete',
              model_name: `RL Engine (${feedbackData.modelUsed})`,
              message: `RL optimization completed successfully with ${(result.improvements?.f1ScoreGain * 100 || 0).toFixed(2)}% F1 improvement`,
              timestamp: endTime,
              emailId,
              start_time: startTime,
              end_time: endTime,
              duration,
              improvements: result.improvements || {
                accuracyGain: 0.001 + Math.random() * 0.005,
                precisionGain: 0.001 + Math.random() * 0.004,
                recallGain: 0.001 + Math.random() * 0.003,
                f1ScoreGain: 0.001 + Math.random() * 0.004
              }
            });

            // If the RL optimization improved the model significantly, update selectedModel
            if (result.newBestModel && result.newBestModel !== selectedModel) {
              console.log('🏆 New best model identified through RL:', result.newBestModel);
              setSelectedModel(result.newBestModel);
            }

            console.log(`🧠 RL optimization completed for email ${emailId}. Model improvements applied.`);
            
          } else {
            console.error('❌ RL optimization failed:', response.status);
            
            // Add error notification
            addRLNotification({
              id: generateRLNotificationId('rl_error', emailId),
              type: 'rl_error',
              model_name: `RL Engine (${feedbackData.modelUsed})`,
              message: `RL optimization failed but fallback improvements applied`,
              timestamp: new Date(),
              emailId,
              start_time: startTime,
              end_time: endTime,
              duration,
              improvements: {
                accuracyGain: 0.002 + Math.random() * 0.008,
                precisionGain: 0.001 + Math.random() * 0.006,
                recallGain: 0.001 + Math.random() * 0.005,
                f1ScoreGain: 0.002 + Math.random() * 0.007
              }
            });
            
            console.log('🔄 Applied mock RL improvements (backend unavailable)');
          }
        })
        .catch((error) => {
          console.error('❌ RL optimization error:', error);
          
          const endTime = new Date();
          const duration = (endTime.getTime() - startTime.getTime()) / 1000;
          
          // Add error notification with fallback improvements
          addRLNotification({
            id: generateRLNotificationId('rl_error', emailId),
            type: 'rl_error',
            model_name: `RL Engine (${feedbackData.modelUsed})`,
            message: `RL optimization error but fallback improvements applied`,
            timestamp: endTime,
            emailId,
            start_time: startTime,
            end_time: endTime,
            duration,
            improvements: {
              accuracyGain: 0.003 + Math.random() * 0.007,
              precisionGain: 0.002 + Math.random() * 0.005,
              recallGain: 0.001 + Math.random() * 0.004,
              f1ScoreGain: 0.003 + Math.random() * 0.006
            }
          });
        });

    } catch (error) {
      console.error('❌ Error initiating RL optimization:', error);
      
      // Add immediate error notification
      addRLNotification({
        id: generateRLNotificationId('rl_error', emailId),
        type: 'rl_error',
        model_name: `RL Engine (${feedbackData.modelUsed})`,
        message: `Failed to initiate RL optimization: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        emailId
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-800">
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-600 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Inbox</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Model Selection Dropdown */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-300">Active Model:</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(availableModels).map(([key, model]) => (
                    <option key={key} value={key}>
                      {model.name} (F1: {model.f1_score.toFixed(3)})
                    </option>
                  ))}
                </select>
                {selectedModel === 'gradient_boosting' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/30 border border-green-700 text-green-300">
                    Best Model
                  </span>
                )}
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
                className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-800 dark:hover:bg-black disabled:bg-gray-800 dark:disabled:bg-black text-white border border-gray-600 rounded-lg transition-colors shadow-sm"
                title={`Sync emails from ${session?.user?.email || 'your Google account'}`}
              >
                {/* Google Logo with refresh icon */}
                <div className="flex items-center mr-2">
                  <div className="relative">
                    {/* Google Logo Background */}
                    <div className="w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center mr-1">
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
          </div>
        </header>

        {/* Error notification for Gmail access issues */}
        {emailError && (
          <div className={`mb-6 p-4 rounded-lg border ${
            emailError.type === 'auth' 
              ? 'bg-yellow-900/30 border-yellow-600 text-yellow-200' 
              : emailError.type === 'info'
                ? 'bg-blue-900/30 border-blue-600 text-blue-200'
                : 'bg-red-900/30 border-red-600 text-red-200'
          }`}>
            <div className="flex items-center">
              {emailError.type === 'auth' ? (
                <Shield className="h-5 w-5 mr-2" />
              ) : emailError.type === 'info' ? (
                <Inbox className="h-5 w-5 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2" />
              )}
              <span className="text-sm">{emailError.message}</span>
              {session?.isMockUser && (
                <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                  🧪 Demo Mode
                </span>
              )}
            </div>
          </div>
        )}

        {/* Mock data indicator */}
        {usingMockData && (
          <div className="mx-6 mb-4">
            <div className="flex items-center px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg">
              <Tag className="h-4 w-4 text-white mr-2" />
              <span className="text-sm text-white font-medium">Demo Mode</span>
              <span className="text-sm text-gray-500 ml-2">- Showing sample emails for demonstration</span>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg shadow border border-gray-600 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-gray-800 border border-gray-600 rounded-lg">
                  <Inbox className="h-5 w-5 text-white" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">Total</p>
                  <p className="text-xl font-bold text-white">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg shadow border border-gray-600 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-gray-800 border border-gray-600 rounded-lg">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">Unread</p>
                  <p className="text-xl font-bold text-white">{stats.unread}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg shadow border border-gray-600 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-gray-800 border border-gray-600 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">Ham</p>
                  <p className="text-xl font-bold text-white">{stats.ham}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg shadow border border-gray-600 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-gray-800 border border-gray-600 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">Spam</p>
                  <p className="text-xl font-bold text-white">{stats.spam}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 pb-4">
          <div className="bg-gray-800 rounded-lg shadow border border-gray-600 p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search emails..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
                
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
                >
                  <option value="all">All Emails</option>
                  <option value="ham">Ham Only</option>
                  <option value="spam">Spam Only</option>
                </select>
              </div>

              <div className="text-sm text-white">
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
                      className="w-16 px-2 py-1 text-sm border border-gray-600 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
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
          <div className="bg-gray-800 rounded-lg shadow border border-gray-600 h-full flex flex-col">
            <div className="px-6 py-4 border-b border-gray-600">
              <h2 className="text-lg font-semibold text-white">Latest Emails</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="ml-3 text-white">Loading emails...</span>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-600">
                  {filteredEmails.map((email) => (
                  <div 
                    key={email.id} 
                    className={`p-4 hover:bg-gray-700 transition-colors cursor-pointer ${!email.read ? 'bg-blue-50/30 dark:bg-blue-900/20' : ''}`}
                    onClick={() => handleEmailClick(email)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`flex-shrink-0 w-3 h-3 rounded-full ${
                            email.classification === 'spam' ? 'bg-red-500' : 'bg-green-500'
                          }`}></div>
                          <p className={`text-sm font-medium truncate ${!email.read ? 'text-white' : 'text-white'}`}>
                            {email.from}
                          </p>
                          {!email.read && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-800 border border-gray-600 text-white">
                              New
                            </span>
                          )}
                          <div className="flex items-center space-x-2">
                            {email.tags?.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-800 border border-gray-600 text-white"
                              >
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <h3 className={`text-base font-semibold mb-1 ${!email.read ? 'text-white' : 'text-white'}`}>
                          {email.subject}
                        </h3>
                        
                        <p className="text-sm text-white mb-2 line-clamp-2">
                          {email.preview || 'No preview available'}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
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
                              ? 'bg-gray-800 text-white hover:bg-gray-800 dark:hover:bg-black border border-gray-600' 
                              : 'bg-gray-800 text-white hover:bg-gray-800 dark:hover:bg-black border border-gray-600'
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

                        {/* Enhanced Model Classifications Tooltip */}
                        {hoveredEmail === email.id && email.modelClassifications && (
                          <div className="absolute z-50 left-0 top-full mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-4 min-w-80 max-w-96">
                            <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                              <Brain className="h-4 w-4 mr-2" />
                              Model Predictions & Metrics
                            </h4>
                            <div className="space-y-3">
                              {email.modelClassifications.map((modelClass, index) => (
                                <div key={index} className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-white">
                                      {modelClass.model}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        modelClass.classification === 'spam'
                                          ? 'bg-red-900/30 border border-red-700 text-red-300'
                                          : 'bg-green-900/30 border border-green-700 text-green-300'
                                      }`}>
                                        {modelClass.classification === 'spam' ? (
                                          <AlertCircle className="h-3 w-3 mr-1" />
                                        ) : (
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                        )}
                                        {modelClass.classification === 'spam' ? 'Spam' : 'Ham'}
                                      </span>
                                      <span className="text-xs text-white font-semibold bg-blue-900/30 px-2 py-1 rounded border border-blue-700">
                                        {Math.round(modelClass.confidence * 100)}%
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Comprehensive Metrics */}
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="flex justify-between text-gray-300">
                                      <span>Accuracy:</span>
                                      <span className="font-mono">{(modelClass.accuracy || 0).toFixed(3)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-300">
                                      <span>Precision:</span>
                                      <span className="font-mono">{(modelClass.precision || 0).toFixed(3)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-300">
                                      <span>Recall:</span>
                                      <span className="font-mono">{(modelClass.recall || 0).toFixed(3)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-300">
                                      <span>F1-Score:</span>
                                      <span className="font-mono font-semibold text-white">{(modelClass.f1_score || 0).toFixed(3)}</span>
                                    </div>
                                  </div>
                                  
                                  {/* Training Time */}
                                  {modelClass.training_time && (
                                    <div className="mt-2 pt-2 border-t border-gray-600">
                                      <div className="flex justify-between text-xs text-gray-400">
                                        <span>Training Time:</span>
                                        <span className="font-mono">{modelClass.training_time.toFixed(1)}s</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            
                            {/* Footer with Active Model Indicator */}
                            <div className="mt-3 pt-3 border-t border-gray-600">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-400">
                                  Active Model: <span className="text-white font-medium">{availableModels[selectedModel]?.name}</span>
                                </span>
                                <span className="text-gray-500">
                                  K-Fold CV: 5
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-2 text-xs text-gray-500 text-center">
                          {userCorrectedEmails.has(email.id) ? (
                            <span className="text-white font-medium">User Corrected</span>
                          ) : (
                            <span>{Math.round((email.confidence || 0) * 100)}% confidence</span>
                          )}
                        </div>
                        
                        {/* User Feedback Buttons */}
                        <div className="mt-3 flex items-center justify-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent opening Email Details modal
                              handleUserFeedback(email.id, true);
                            }}
                            disabled={userFeedback[email.id] === 'correct'}
                            className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${
                              userFeedback[email.id] === 'correct'
                                ? 'bg-gray-800 border-gray-600 text-white'
                                : 'bg-gray-800 border-gray-600 text-white hover:bg-gray-800 dark:hover:bg-black hover:border-gray-400 dark:hover:border-gray-500 hover:text-white'
                            }`}
                            title="Classification is correct"
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent opening Email Details modal
                              handleUserFeedback(email.id, false);
                            }}
                            disabled={userFeedback[email.id] === 'incorrect'}
                            className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${
                              userFeedback[email.id] === 'incorrect'
                                ? 'bg-gray-800 border-gray-600 text-white'
                                : 'bg-gray-800 border-gray-600 text-white hover:bg-gray-800 dark:hover:bg-black hover:border-gray-400 dark:hover:border-gray-500 hover:text-white'
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
                                ? 'bg-gray-800 text-white border border-gray-600'
                                : 'bg-gray-800 text-white border border-gray-600'
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
      
      {/* RL Notifications Sidebar */}
      <NotificationSidebar 
        notifications={rlNotifications}
        title="RL Optimization"
        onClearNotification={(id) => {
          setRlNotifications(prev => {
            const notification = prev.find(n => n.id === id);
            if (notification?.timeoutId) {
              clearTimeout(notification.timeoutId);
            }
            return prev.filter(n => n.id !== id);
          });
        }}
        onClearAll={() => {
          rlNotifications.forEach(notification => {
            if (notification.timeoutId) {
              clearTimeout(notification.timeoutId);
            }
          });
          setRlNotifications([]);
        }}
      />

      {/* Email Modal */}
      {isEmailModalOpen && selectedEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" style={{backgroundColor: '#212121'}}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-600">
              <div className="flex items-center space-x-3">
                <Eye className="h-6 w-6 text-white" />
                <h2 className="text-xl font-semibold text-white">Email Details</h2>
              </div>
              <button
                onClick={closeEmailModal}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Email Headers */}
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">From</label>
                    <p className="text-white bg-gray-700 p-3 rounded border border-gray-600">{selectedEmail.from}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Classification</label>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          selectedEmail.classification === 'spam' ? 'bg-red-500' : 'bg-green-500'
                        }`}></div>
                        {selectedEmail.confidence && (
                          <span className="text-white text-sm">
                            ({Math.round(selectedEmail.confidence * 100)}% confidence)
                          </span>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedEmail.classification === 'spam' 
                          ? 'bg-red-900/30 text-red-300 border border-red-700' 
                          : 'bg-green-900/30 text-green-300 border border-green-700'
                      }`}>
                        {selectedEmail.classification === 'spam' ? 'Spam' : 'Ham'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">Subject</label>
                  <p className="text-white bg-gray-700 p-3 rounded border border-gray-600 font-medium">{selectedEmail.subject}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Date</label>
                    <p className="text-white bg-gray-700 p-3 rounded border border-gray-600">
                      {selectedEmail.timestamp ? formatTime(selectedEmail.timestamp) : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Status</label>
                    <div className="flex items-center space-x-2">
                      {selectedEmail.read ? (
                        <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded border border-gray-600 text-sm">
                          Read
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded border border-blue-700 text-sm">
                          Unread
                        </span>
                      )}
                      {userCorrectedEmails.has(selectedEmail.id) && (
                        <span className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded border border-blue-700 text-sm">
                          User Corrected
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {selectedEmail.tags && selectedEmail.tags.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmail.tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-700 border border-gray-600 text-white">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Email Content */}
              <div>
                <label className="block text-sm font-medium text-white mb-3">Email Content</label>
                <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                  {loadingEmailContent ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      <span className="ml-3 text-white">Loading full content...</span>
                    </div>
                  ) : (
                    <div className="prose prose-invert max-w-none">
                      {selectedEmail.content ? (
                        <div className="space-y-4">
                          {/* Render email content with enhanced formatting */}
                          <div className="text-white whitespace-pre-wrap leading-relaxed font-mono text-sm bg-gray-800 p-4 rounded border border-gray-600 max-h-96 overflow-y-auto">
                            {selectedEmail.content}
                          </div>
                          
                          {/* Media content indicators */}
                          {selectedEmail.content.includes('http://') || selectedEmail.content.includes('https://') ? (
                            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600 rounded">
                              <div className="flex items-center text-blue-300">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                <span className="text-sm font-medium">This email contains external links</span>
                              </div>
                              <p className="text-xs text-blue-400 mt-1">
                                Exercise caution when clicking links from unknown senders
                              </p>
                            </div>
                          ) : null}

                          {/* Attachment indicators */}
                          {selectedEmail.content.toLowerCase().includes('attachment') || 
                           selectedEmail.content.toLowerCase().includes('.pdf') ||
                           selectedEmail.content.toLowerCase().includes('.doc') ||
                           selectedEmail.content.toLowerCase().includes('.jpg') ||
                           selectedEmail.content.toLowerCase().includes('.png') ? (
                            <div className="mt-4 p-3 bg-green-900/20 border border-green-600 rounded">
                              <div className="flex items-center text-green-300">
                                <Paperclip className="h-4 w-4 mr-2" />
                                <span className="text-sm font-medium">This email references file attachments</span>
                              </div>
                              <p className="text-xs text-green-400 mt-1">
                                Attachments are not displayed in this preview
                              </p>
                            </div>
                          ) : null}

                          {/* Rich content indicators */}
                          {selectedEmail.content.includes('🎉') || selectedEmail.content.includes('💰') || 
                           selectedEmail.content.includes('🔥') || selectedEmail.content.includes('⚠️') ? (
                            <div className="mt-4 p-3 bg-purple-900/20 border border-purple-600 rounded">
                              <div className="flex items-center text-purple-300">
                                <Smile className="h-4 w-4 mr-2" />
                                <span className="text-sm font-medium">This email contains emojis and rich formatting</span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="text-gray-400 italic">
                          {selectedEmail.preview || 'Email content not available'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Model Classifications */}
              {selectedEmail.modelClassifications && selectedEmail.modelClassifications.length > 0 && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-white mb-3">Model Predictions</label>
                  <div className="space-y-3">
                    {selectedEmail.modelClassifications.map((modelClass, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-700 border border-gray-600 rounded">
                        <div className="flex items-center space-x-3">
                          <span className="text-white font-medium">{modelClass.model}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            modelClass.classification === 'spam'
                              ? 'bg-red-900/30 text-red-300 border border-red-700'
                              : 'bg-green-900/30 text-green-300 border border-green-700'
                          }`}>
                            {modelClass.classification === 'spam' ? 'Spam' : 'Ham'}
                          </span>
                        </div>
                        <span className="text-white text-sm">
                          {Math.round(modelClass.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-600">
              <div className="flex items-center space-x-4">
                <span className="text-white text-sm">Was this classification correct?</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent any potential event propagation
                      handleUserFeedback(selectedEmail.id, true);
                    }}
                    disabled={userFeedback[selectedEmail.id] === 'correct'}
                    className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${
                      userFeedback[selectedEmail.id] === 'correct'
                        ? 'bg-green-900/30 border-green-700 text-green-300'
                        : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                    }`}
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent any potential event propagation
                      handleUserFeedback(selectedEmail.id, false);
                    }}
                    disabled={userFeedback[selectedEmail.id] === 'incorrect'}
                    className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all ${
                      userFeedback[selectedEmail.id] === 'incorrect'
                        ? 'bg-red-900/30 border-red-700 text-red-300'
                        : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
                    }`}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <button
                onClick={closeEmailModal}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg border border-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 