import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { GmailService } from '../../../lib/gmail'
import { authOptions } from '../../../lib/auth'

// Simple cache for demo mode users
const demoCache = new Map<string, { data: EmailData[]; timestamp: number }>()
const DEMO_CACHE_TTL = 2 * 60 * 1000 // 2 minutes for demo mode

interface EmailData {
  id: string
  from: string
  subject: string
  preview: string
  date: string
  isRead: boolean
  threadId: string
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated or no access token' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    // Handle mock/demo users with different caching strategy
    if (session.isMockUser) {
      const cacheKey = `mock-emails-${limit}`
      const cached = demoCache.get(cacheKey)
      
      if (cached && (Date.now() - cached.timestamp) < DEMO_CACHE_TTL) {
        console.log(`📦 Demo cache hit for ${limit} emails`)
        return NextResponse.json(
          { emails: cached.data },
          {
            headers: {
              'Cache-Control': 'public, max-age=120', // 2 minutes
              'X-Cache': 'HIT',
              'X-Response-Time': `${Date.now() - startTime}ms`
            }
          }
        )
      }

      // Generate mock data for demo users
      const mockEmails = generateMockEmails(limit)
      demoCache.set(cacheKey, { data: mockEmails, timestamp: Date.now() })
      
      return NextResponse.json(
        { emails: mockEmails },
        {
          headers: {
            'Cache-Control': 'public, max-age=120',
            'X-Cache': 'MISS',
            'X-Response-Time': `${Date.now() - startTime}ms`
          }
        }
      )
    }

    // For real Gmail users
    const gmailService = new GmailService(session.accessToken as string)
    const emails = await gmailService.getEmails(limit)

    const responseTime = Date.now() - startTime
    console.log(`📧 Fetched ${emails.length} emails in ${responseTime}ms`)

    return NextResponse.json(
      { emails },
      {
        headers: {
          'Cache-Control': 'private, max-age=180', // 3 minutes for real users
          'X-Response-Time': `${responseTime}ms`,
          'X-Email-Count': emails.length.toString()
        }
      }
    )
  } catch (error: unknown) {
    console.error('Error fetching emails:', error)
    
    // Check if it's an authentication/scope error
    if (typeof error === 'object' && error !== null && ('code' in error || 'status' in error)) {
      const errorWithCode = error as { code?: number; status?: number };
      if (errorWithCode.code === 403 || errorWithCode.status === 403) {
        return NextResponse.json(
          { 
            error: 'Gmail access not authorized. Please sign out and sign in again to grant Gmail permissions.',
            code: 'INSUFFICIENT_SCOPE'
          },
          { status: 403 }
        )
      }
      
      // Check if it's an authentication error
      if (errorWithCode.code === 401 || errorWithCode.status === 401) {
        return NextResponse.json(
          { 
            error: 'Authentication expired. Please sign in again.',
            code: 'AUTH_EXPIRED'
          },
          { status: 401 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch emails from Gmail' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated or no access token' },
        { status: 401 }
      )
    }

    const { messageId } = await request.json()
    
    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      )
    }

    // Handle mock users
    if (session.isMockUser) {
      const mockContent = generateMockEmailContent(messageId)
      
      return NextResponse.json(
        { content: mockContent },
        {
          headers: {
            'Cache-Control': 'private, max-age=900', // 15 minutes for content
            'X-Response-Time': `${Date.now() - startTime}ms`
          }
        }
      )
    }

    const gmailService = new GmailService(session.accessToken as string)
    const content = await gmailService.getEmailContent(messageId)

    const responseTime = Date.now() - startTime
    console.log(`📄 Fetched email content for ${messageId} in ${responseTime}ms`)

    return NextResponse.json(
      { content },
      {
        headers: {
          'Cache-Control': 'private, max-age=900', // 15 minutes
          'X-Response-Time': `${responseTime}ms`
        }
      }
    )
  } catch (error: unknown) {
    console.error('Error fetching email content:', error)
    
    // Check if it's an authentication/scope error
    if (typeof error === 'object' && error !== null && ('code' in error || 'status' in error)) {
      const errorWithCode = error as { code?: number; status?: number };
      if (errorWithCode.code === 403 || errorWithCode.status === 403) {
        return NextResponse.json(
          { 
            error: 'Gmail access not authorized. Please sign out and sign in again to grant Gmail permissions.',
            code: 'INSUFFICIENT_SCOPE'
          },
          { status: 403 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch email content' },
      { status: 500 }
    )
  }
}

// Helper function to generate mock emails for demo users
function generateMockEmails(limit: number) {
  const mockEmails = []
  const senders = [
    'newsletter@company.com',
    'support@service.com', 
    'noreply@bank.com',
    'updates@social.com',
    'info@retailer.com'
  ]
  
  const subjects = [
    'Weekly Newsletter - Industry Updates',
    'Your Account Statement is Ready',
    'Special Offer: 50% Off Everything',
    'Security Alert: New Login Detected',
    'Monthly Report - October 2024'
  ]

  for (let i = 0; i < limit; i++) {
    const isSpam = Math.random() > 0.7
    const sender = senders[Math.floor(Math.random() * senders.length)]
    const subject = subjects[Math.floor(Math.random() * subjects.length)]
    
    mockEmails.push({
      id: `mock-${i}-${Date.now()}`,
      from: sender,
      subject: isSpam ? `[SPAM] ${subject}` : subject,
      preview: `This is a mock email preview for demo purposes. Email ${i + 1} of ${limit}.`,
      date: new Date(Date.now() - i * 3600000).toISOString(), // 1 hour intervals
      isRead: Math.random() > 0.3,
      threadId: `thread-${i}`
    })
  }

  return mockEmails
}

// Helper function to generate mock email content
function generateMockEmailContent(messageId: string) {
  return `
This is mock email content for message ID: ${messageId}

Dear User,

This is a demonstration email content generated for the ContextCleanse demo mode.

In a real implementation, this would contain the actual email content retrieved from Gmail.

Key features of the optimized email system:
- Intelligent caching with TTL
- Batch processing for better performance
- Error handling and graceful fallbacks
- Mock data for development and demo purposes

Best regards,
ContextCleanse Demo System

---
Generated at: ${new Date().toISOString()}
Message ID: ${messageId}
  `.trim()
}