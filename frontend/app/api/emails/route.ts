import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { GmailService } from '@/lib/gmail'
import { authOptions } from '@/lib/auth'

// Enhanced cache with user-specific keys and request deduplication
const emailCache = new Map<string, { data: EmailData[]; timestamp: number; etag: string }>()
const requestInProgress = new Map<string, Promise<EmailData[]>>()

// Cache TTL configurations
const DEMO_CACHE_TTL = 5 * 60 * 1000 // 5 minutes for demo mode
const USER_CACHE_TTL = 3 * 60 * 1000  // 3 minutes for real users
const MAX_CACHE_ENTRIES = 100 // Prevent memory bloat

// Mock email content generator for demo users
function generateMockEmailContent(messageId: string): string {
  return `This is a mock email content for message ID: ${messageId}. In demo mode, actual email content is not fetched from Gmail for privacy reasons.`
}

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

    // Check if there was an error refreshing the token
    if (session.error === "RefreshAccessTokenError") {
      return NextResponse.json(
        { 
          error: 'Authentication token expired. Please sign out and sign in again.',
          code: 'TOKEN_EXPIRED'
        },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const userId = session.user?.email || 'unknown'
    
    // Create user-specific cache key for authenticated users
    const cacheKey = `user-${userId}-emails-${limit}`

    // Check for existing request in progress (request deduplication)
    const existingRequest = requestInProgress.get(cacheKey)
    if (existingRequest) {
      console.log(`🔄 Request deduplication: waiting for existing request for ${cacheKey}`)
      const emails = await existingRequest
      return NextResponse.json(
        { emails },
        {
          headers: {
            'Cache-Control': 'private, max-age=180',
            'X-Cache': 'DEDUP',
            'X-Response-Time': `${Date.now() - startTime}ms`
          }
        }
      )
    }

    // Check cache for authenticated users
    const cached = emailCache.get(cacheKey)
    const cacheTTL = USER_CACHE_TTL
    
    if (cached && (Date.now() - cached.timestamp) < cacheTTL) {
      console.log(`📦 Cache hit for ${cacheKey} (age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`)
      return NextResponse.json(
        { emails: cached.data },
        {
          headers: {
            'Cache-Control': 'private, max-age=180',
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
            'Cache-Control': 'private, max-age=180',
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
      if (errorWithCode.code === 401 || errorWithCode.status === 401) {
        return NextResponse.json(
          { 
            error: 'Gmail authentication failed. Please sign out and sign in again to refresh your access.',
            code: 'AUTH_FAILED'
          },
          { status: 401 }
        )
      } else if (errorWithCode.code === 403 || errorWithCode.status === 403) {
        return NextResponse.json(
          { 
            error: 'Gmail access not authorized. Please sign out and sign in again to grant Gmail permissions.',
            code: 'INSUFFICIENT_SCOPE'
          },
          { status: 403 }
        )
      }
    }

    // Check if the error message contains authentication-related keywords
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('authentication failed') || errorMessage.includes('sign out and sign in')) {
      return NextResponse.json(
        { 
          error: errorMessage,
          code: 'AUTH_FAILED'
        },
        { status: 401 }
      )
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

// Real email fetching function - only works with authenticated Gmail users
async function fetchEmailsWithOptimizations(session: { accessToken?: string }, limit: number): Promise<EmailData[]> {
  if (!session.accessToken) {
    throw new Error('No access token available for Gmail API')
  }

  // Use real Gmail service for authenticated users
  const gmailService = new GmailService(session.accessToken)
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

    // Check if there was an error refreshing the token
    if (session.error === "RefreshAccessTokenError") {
      return NextResponse.json(
        { 
          error: 'Authentication token expired. Please sign out and sign in again.',
          code: 'TOKEN_EXPIRED'
        },
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
      if (errorWithCode.code === 401 || errorWithCode.status === 401) {
        return NextResponse.json(
          { 
            error: 'Gmail authentication failed. Please sign out and sign in again to refresh your access.',
            code: 'AUTH_FAILED'
          },
          { status: 401 }
        )
      } else if (errorWithCode.code === 403 || errorWithCode.status === 403) {
        return NextResponse.json(
          { 
            error: 'Gmail access not authorized. Please sign out and sign in again to grant Gmail permissions.',
            code: 'INSUFFICIENT_SCOPE'
          },
          { status: 403 }
        )
      }
    }

    // Check if the error message contains authentication-related keywords
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('authentication failed') || errorMessage.includes('sign out and sign in')) {
      return NextResponse.json(
        { 
          error: errorMessage,
          code: 'AUTH_FAILED'
        },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch email content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

