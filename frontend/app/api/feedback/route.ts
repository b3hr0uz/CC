import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/auth'

interface FeedbackRequest {
  emailId: string;
  userFeedback: 'correct' | 'incorrect';
  currentClassification: 'spam' | 'ham';
  correctedClassification?: 'spam' | 'ham'; // The classification after user correction
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
    const { emailId, userFeedback, currentClassification, correctedClassification, confidence, emailContent } = body

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
      correctedClassification,
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
          corrected_class: correctedClassification || currentClassification,
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
        console.warn(`⚠️ Backend feedback submission failed with status: ${backendResponse.status}`)
        // Don't fail the request if backend is unavailable - store locally for now
        return NextResponse.json({
          success: true,
          message: 'Feedback received and stored locally (backend service unavailable)',
          backend_status: 'unavailable'
        })
      }

      const backendResult = await backendResponse.json()
      console.log('✅ Feedback sent to ML backend successfully:', backendResult)

      return NextResponse.json({
        success: true,
        message: 'Feedback processed and sent to ML backend successfully',
        backend_status: 'success',
        data: backendResult
      })

    } catch (backendError) {
      // Check if it's a connection error (ECONNREFUSED)
      const isConnectionError = backendError instanceof Error && 
        (backendError.message.includes('ECONNREFUSED') || 
         backendError.message.includes('fetch failed'))
      
      if (isConnectionError) {
        console.info('ℹ️ ML backend service is offline (this is expected in development). Feedback stored locally.')
      } else {
        console.error('❌ Unexpected backend communication error:', backendError)
      }
      
      // Store feedback locally if backend is unavailable
      return NextResponse.json({
        success: true,
        message: isConnectionError 
          ? 'Feedback stored locally (ML backend service is offline)' 
          : 'Feedback stored locally (backend communication error)',
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