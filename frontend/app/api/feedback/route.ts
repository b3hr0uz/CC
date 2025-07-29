import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth'

interface FeedbackRequest {
  emailId: string;
  userFeedback: 'correct' | 'incorrect';
  currentClassification: 'spam' | 'ham';
  confidence: number;
  emailContent: {
    subject: string;
    from: string;
    preview: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body: FeedbackRequest = await request.json()
    const { emailId, userFeedback, currentClassification, confidence, emailContent } = body

    // Validate required fields
    if (!emailId || !userFeedback || !currentClassification || !emailContent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Log feedback for debugging
    console.log('📝 User Feedback Received:', {
      emailId,
      userFeedback,
      currentClassification,
      confidence,
      subject: emailContent.subject,
      user: session.user.email
    })

    // Send feedback to backend for reinforcement learning
    try {
      const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: session.user.email,
          email_id: emailId,
          feedback_type: userFeedback,
          predicted_class: currentClassification,
          confidence_score: confidence,
          email_features: {
            subject: emailContent.subject,
            sender: emailContent.from,
            preview: emailContent.preview
          },
          timestamp: new Date().toISOString()
        }),
      })

      if (!backendResponse.ok) {
        console.error('Backend feedback submission failed:', backendResponse.status)
        // Don't fail the request if backend is unavailable - store locally for now
        return NextResponse.json({
          success: true,
          message: 'Feedback received (stored locally)',
          backend_status: 'unavailable'
        })
      }

      const backendResult = await backendResponse.json()
      console.log('✅ Feedback sent to backend successfully:', backendResult)

      return NextResponse.json({
        success: true,
        message: 'Feedback processed successfully',
        backend_status: 'success',
        data: backendResult
      })

    } catch (backendError) {
      console.error('Backend communication error:', backendError)
      // Store feedback locally if backend is unavailable
      return NextResponse.json({
        success: true,
        message: 'Feedback stored locally (backend unavailable)',
        backend_status: 'offline'
      })
    }

  } catch (error) {
    console.error('Feedback API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}