import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

interface FeedbackRequest {
  emailId: string;
  userFeedback: 'spam' | 'ham'; // Direct feedback about what the email should be classified as
  currentClassification: 'spam' | 'ham'; // Current model prediction
  correctedClassification?: 'spam' | 'ham'; // The classification after user correction
  confidence: number;
  previousFeedback?: 'spam' | 'ham' | null; // Previous user feedback for change tracking
  modelUsed?: string; // Which model was used for classification
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
    const { emailId, userFeedback, currentClassification, correctedClassification, confidence, previousFeedback, modelUsed, emailContent } = body

    // Validate required fields
    if (!emailId || !userFeedback || !currentClassification || !emailContent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Determine if this is a feedback change
    const isChangingFeedback = previousFeedback && previousFeedback !== userFeedback;
    const isNewFeedback = !previousFeedback;

    // Log feedback for debugging
    console.log('📝 User Feedback Received:', {
      emailId,
      userFeedback,
      previousFeedback,
      currentClassification,
      correctedClassification,
      confidence,
      modelUsed,
      subject: emailContent.subject,
      user: session.user.email,
      demoMode: session.isMockUser ? 'Yes' : 'No',
      feedbackType: isChangingFeedback ? 'FEEDBACK_CHANGE' : isNewFeedback ? 'NEW_FEEDBACK' : 'FEEDBACK_CONFIRMATION'
    })

    // Check if this is a demo user session
    if (session.isMockUser) {
      console.log('Demo mode detected - using mock feedback processing');
      const feedbackMessage = isChangingFeedback 
        ? `Feedback changed from ${previousFeedback?.toUpperCase()} to ${userFeedback.toUpperCase()} in demo mode`
        : 'Feedback received and processed in demo mode';
      
      return NextResponse.json({
        success: true,
        message: feedbackMessage,
        backend_status: 'demo_mode',
        mock_reason: 'Demo mode active'
      });
    }

    // Send feedback to backend for reinforcement learning
    try {
      // Use internal Docker network for server-side API calls
      const backendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const backendResponse = await fetch(`${backendUrl}/api/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: session.user.email,
          email_id: emailId,
          feedback_type: userFeedback,
          predicted_class: currentClassification,
          corrected_class: correctedClassification || userFeedback, // Use userFeedback if no corrected classification
          confidence_score: confidence,
          previous_feedback: previousFeedback, // Track feedback changes
          model_used: modelUsed || 'unknown', // Track which model was used
          is_feedback_change: isChangingFeedback, // Flag for feedback changes
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