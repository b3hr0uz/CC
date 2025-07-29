import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { GmailService } from '../../../lib/gmail'
import { authOptions } from '../../../lib/auth'

// Enhanced cache with user-specific keys and request deduplication
const emailCache = new Map<string, { data: EmailData[]; timestamp: number; etag: string }>()
const requestInProgress = new Map<string, Promise<EmailData[]>>()

// Cache TTL configurations
const DEMO_CACHE_TTL = 5 * 60 * 1000 // 5 minutes for demo mode
const USER_CACHE_TTL = 3 * 60 * 1000  // 3 minutes for real users
const MAX_CACHE_ENTRIES = 100 // Prevent memory bloat

interface EmailData {
  id: string
  from: string
  subject: string
  preview: string
  date: string
  isRead: boolean
  threadId: string
}

// Cache cleanup function
function cleanupCache() {
  if (emailCache.size > MAX_CACHE_ENTRIES) {
    const entries = Array.from(emailCache.entries())
    // Remove oldest 25% of entries
    const entriesToRemove = entries
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, Math.floor(entries.length * 0.25))
    
    entriesToRemove.forEach(([key]) => emailCache.delete(key))
    console.log(`🧹 Cleaned up ${entriesToRemove.length} old cache entries`)
  }
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
    const userId = session.user?.email || 'unknown'
    
    // Create user-specific cache key for better cache segmentation
    const cacheKey = session.isMockUser 
      ? `mock-emails-${limit}` 
      : `user-${userId}-emails-${limit}`

    // Check for existing request in progress (request deduplication)
    const existingRequest = requestInProgress.get(cacheKey)
    if (existingRequest) {
      console.log(`🔄 Request deduplication: waiting for existing request for ${cacheKey}`)
      const emails = await existingRequest
      return NextResponse.json(
        { emails },
        {
          headers: {
            'Cache-Control': session.isMockUser ? 'public, max-age=300' : 'private, max-age=180',
            'X-Cache': 'DEDUP',
            'X-Response-Time': `${Date.now() - startTime}ms`
          }
        }
      )
    }

    // Check cache with enhanced key structure
    const cached = emailCache.get(cacheKey)
    const cacheTTL = session.isMockUser ? DEMO_CACHE_TTL : USER_CACHE_TTL
    
    if (cached && (Date.now() - cached.timestamp) < cacheTTL) {
      console.log(`📦 Cache hit for ${cacheKey} (age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`)
      return NextResponse.json(
        { emails: cached.data },
        {
          headers: {
            'Cache-Control': session.isMockUser ? 'public, max-age=300' : 'private, max-age=180',
            'X-Cache': 'HIT',
            'X-Response-Time': `${Date.now() - startTime}ms`,
            'ETag': cached.etag
          }
        }
      )
    }

    // Create promise for request deduplication
    const emailsPromise = fetchEmailsWithOptimizations(session, limit)
    requestInProgress.set(cacheKey, emailsPromise)

    try {
      const emails = await emailsPromise
      
      // Generate ETag for cache validation
      const etag = `"${Buffer.from(JSON.stringify(emails.map(e => e.id + e.date))).toString('base64')}"`
      
      // Cache the results with enhanced metadata
      emailCache.set(cacheKey, { 
        data: emails, 
        timestamp: Date.now(),
        etag 
      })
      
      // Periodic cache cleanup
      cleanupCache()

      const responseTime = Date.now() - startTime
      console.log(`📧 Fetched ${emails.length} emails for ${userId} in ${responseTime}ms`)

      return NextResponse.json(
        { emails },
        {
          headers: {
            'Cache-Control': session.isMockUser ? 'public, max-age=300' : 'private, max-age=180',
            'X-Cache': 'MISS',
            'X-Response-Time': `${responseTime}ms`,
            'X-Email-Count': emails.length.toString(),
            'ETag': etag
          }
        }
      )
    } finally {
      // Clean up request tracking
      requestInProgress.delete(cacheKey)
    }
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
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch emails',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Optimized email fetching function
async function fetchEmailsWithOptimizations(session: { isMockUser?: boolean; accessToken?: string }, limit: number): Promise<EmailData[]> {
  // Handle mock/demo users with enhanced mock data
  if (session.isMockUser) {
    // Simulate variable response time for realism
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100))
    return generateMockEmails(limit)
  }

  // For real Gmail users with optimizations
  const gmailService = new GmailService(session.accessToken as string)
  return await gmailService.getEmails(limit)
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