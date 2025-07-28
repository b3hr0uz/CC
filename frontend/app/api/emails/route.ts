import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { GmailService } from '../../../lib/gmail'
import { authOptions } from '../../../lib/auth'

export async function GET(request: NextRequest) {
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

    const gmailService = new GmailService(session.accessToken as string)
    const emails = await gmailService.getEmails(limit)

    return NextResponse.json({ emails })
  } catch (error: any) {
    console.error('Error fetching emails:', error)
    
    // Check if it's an authentication/scope error
    if (error.code === 403 || error.status === 403) {
      return NextResponse.json(
        { 
          error: 'Gmail access not authorized. Please sign out and sign in again to grant Gmail permissions.',
          code: 'INSUFFICIENT_SCOPE'
        },
        { status: 403 }
      )
    }
    
    // Check if it's an authentication error
    if (error.code === 401 || error.status === 401) {
      return NextResponse.json(
        { 
          error: 'Authentication expired. Please sign in again.',
          code: 'AUTH_EXPIRED'
        },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch emails from Gmail' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const gmailService = new GmailService(session.accessToken as string)
    const content = await gmailService.getEmailContent(messageId)

    return NextResponse.json({ content })
  } catch (error: any) {
    console.error('Error fetching email content:', error)
    
    // Check if it's an authentication/scope error
    if (error.code === 403 || error.status === 403) {
      return NextResponse.json(
        { 
          error: 'Gmail access not authorized. Please sign out and sign in again to grant Gmail permissions.',
          code: 'INSUFFICIENT_SCOPE'
        },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch email content' },
      { status: 500 }
    )
  }
}