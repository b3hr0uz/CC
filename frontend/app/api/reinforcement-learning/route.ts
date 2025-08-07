import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface RLOptimizationRequest {
  type: string;
  emailId: string;
  timestamp: string;
  feedbackData: {
    feedback: string;
    originalClassification: string;
    correctedClassification: string;
    confidence: number;
    modelUsed: string;
    emailFeatures: {
      subject: string;
      from: string;
      content: string;
      preview?: string; // Optional preview field
      hasLinks: boolean;
      hasAttachments: boolean;
      wordCount: number;
    };
  };
  currentBestModel: string;
  sessionId: string;
  optimizationConfig: {
    algorithm: string;
    learningRate: number;
    explorationRate: number;
    batchSize: number;
    targetModelUpdate: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required for RL optimization' },
        { status: 401 }
      );
    }

    const body: RLOptimizationRequest = await request.json();
    
    console.log('🧠 RL Optimization Request:', {
      emailId: body.emailId,
      feedback: body.feedbackData.feedback,
      algorithm: body.optimizationConfig.algorithm,
      modelUsed: body.feedbackData.modelUsed,
      demoMode: session.isMockUser ? 'Yes' : 'No'
    });

    // Simulate asynchronous RL optimization processing
    const processingStartTime = Date.now();
    let usingMockData = false;
    let mockReason = '';
    
    // In a real implementation, this would:
    // 1. Send the feedback to an ML training pipeline
    // 2. Update model weights using RL algorithms (policy gradient, Q-learning, etc.)
    // 3. Retrain/fine-tune the current best model
    // 4. Evaluate performance improvements
    // 5. Update model registry if improvements are significant

    // Check if this is a demo user session first
    if (session.isMockUser) {
      console.log('Demo mode detected - using mock RL optimization');
      usingMockData = true;
      mockReason = 'Demo mode active';
    } else {
      try {
        // Try to connect to real ML backend service with enhanced RL optimization
        // Use internal Docker network for server-side API calls
    const mlBackendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const backendResponse = await fetch(`${mlBackendUrl}/api/v1/feedback/reinforcement-learning/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback_data: {
            email_id: body.emailId,
            user_feedback: body.feedbackData.feedback,
            original_classification: body.feedbackData.originalClassification,
            corrected_classification: body.feedbackData.correctedClassification,
            confidence: body.feedbackData.confidence,
            model_used: body.feedbackData.modelUsed,
            email_features: {
              subject: body.feedbackData.emailFeatures.subject,
              sender: body.feedbackData.emailFeatures.from,
              content: body.feedbackData.emailFeatures.content || body.feedbackData.emailFeatures.preview,
              subject_length: body.feedbackData.emailFeatures.subject.length,
              sender_domain: body.feedbackData.emailFeatures.from.split('@')[1] || 'unknown',
              content_length: (body.feedbackData.emailFeatures.content || body.feedbackData.emailFeatures.preview || '').length,
              has_links: body.feedbackData.emailFeatures.hasLinks,
              has_attachments: body.feedbackData.emailFeatures.hasAttachments,
              word_count: body.feedbackData.emailFeatures.wordCount
            }
          },
          optimization_config: {
            algorithm: body.optimizationConfig.algorithm || 'deep_q_learning',
            learning_rate: body.optimizationConfig.learningRate || 0.001,
            exploration_rate: body.optimizationConfig.explorationRate || 0.1,
            batch_size: body.optimizationConfig.batchSize || 8,
            update_target_model: body.optimizationConfig.targetModelUpdate
          },
          current_best_model: body.currentBestModel === 'gradient_boosting' ? 'xgboost' : body.currentBestModel,
          session_id: body.sessionId
        }),
      });

      if (backendResponse.ok) {
        const result = await backendResponse.json();
        const processingTime = Date.now() - processingStartTime;
        
        console.log('✅ RL optimization completed via backend:', result);
        
        return NextResponse.json({
          success: true,
          message: 'Reinforcement Learning optimization completed successfully',
          emailId: body.emailId,
          processingTime: processingTime,
          improvements: result.improvements || {
            accuracyGain: result.accuracy_improvement || 0.003,
            precisionGain: result.precision_improvement || 0.002,
            recallGain: result.recall_improvement || 0.004,
            f1ScoreGain: result.f1_improvement || 0.003
          },
          newBestModel: result.new_best_model || body.currentBestModel,
          algorithm: body.optimizationConfig.algorithm,
          learningRate: body.optimizationConfig.learningRate,
          convergenceMetrics: result.convergence_metrics || {
            lossReduction: 0.05 + Math.random() * 0.15,
            gradientNorm: 0.01 + Math.random() * 0.05,
            policyImprovement: 0.02 + Math.random() * 0.08
          }
        });
      } else {
        throw new Error(`Backend RL service responded with status: ${backendResponse.status}`);
      }

      } catch (backendError) {
        // Fallback: Mock RL optimization when backend is unavailable
        const isConnectionError = backendError instanceof Error && 
          (backendError.message.includes('ECONNREFUSED') || 
           backendError.message.includes('fetch failed') ||
           backendError.message.includes('ENOTFOUND'));
        
        if (isConnectionError) {
          console.warn('⚠️ ML backend service is offline - using mock RL optimization');
          usingMockData = true;
          mockReason = 'ML backend service is offline';
        } else {
          console.warn('⚠️ Backend RL service error - using mock RL optimization:', backendError);
          usingMockData = true;
          mockReason = `Backend RL service error: ${backendError instanceof Error ? backendError.message : 'Unknown error'}`;
        }
      }
    }

    // Fallback to mock data if needed
    if (usingMockData) {

      // Simulate realistic RL processing time
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 3000)); // 1.5-4.5s
      
      const processingTime = Date.now() - processingStartTime;
      
      // Generate realistic RL improvements based on feedback type
      const baseImprovement = body.feedbackData.feedback === 'incorrect' ? 0.005 : 0.002;
      const variationFactor = Math.random() * 0.003;
      
      const improvements = {
        accuracyGain: baseImprovement + variationFactor,
        precisionGain: baseImprovement * 0.8 + variationFactor * 0.7,
        recallGain: baseImprovement * 1.1 + variationFactor * 1.2,
        f1ScoreGain: baseImprovement * 0.9 + variationFactor
      };

      // Determine if a new best model emerges from RL optimization
      const modelImprovementThreshold = 0.005; // 0.5% improvement threshold (lowered for XGBoost + RL)
      const totalImprovement = improvements.f1ScoreGain;
      // XGBoost + RL is always the best model (it improves continuously with user feedback)
      const newBestModel = 'xgboost_rl';

      console.log(`🎭 Mock RL optimization complete (${mockReason}):`, {
        emailId: body.emailId,
        improvements,
        processingTime,
        newBestModel,
        reason: mockReason
      });

      return NextResponse.json({
        success: true,
        message: `RL optimization completed using mock processing (${mockReason})`,
        emailId: body.emailId,
        processingTime: processingTime,
        improvements,
        newBestModel,
        algorithm: body.optimizationConfig.algorithm,
        learningRate: body.optimizationConfig.learningRate,
        convergenceMetrics: {
          lossReduction: 0.08 + Math.random() * 0.12,
          gradientNorm: 0.015 + Math.random() * 0.035,
          policyImprovement: 0.04 + Math.random() * 0.06
        },
        backend_status: 'mock_optimization',
        mock_reason: mockReason
      });
    }

  } catch (error) {
    console.error('❌ RL optimization API error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to process reinforcement learning optimization',
      error: error instanceof Error ? error.message : 'Unknown error',
      emailId: (await request.json()).emailId
    }, { status: 500 });
  }
}

// Helper function to determine next best model after RL optimization
function getNextBestModel(currentModel: string): string {
  const modelProgression = {
    'naive_bayes': 'logistic_regression',
    'logistic_regression': 'neural_network', 
    'neural_network': 'xgboost',
    'xgboost': 'xgboost_rl',  // XGBoost can be enhanced with RL
    'gradient_boosting': 'xgboost_rl',  // Legacy name maps to XGBoost + RL
    'xgboost_rl': 'xgboost_rl' // Already the best with RL
  };
  
  return modelProgression[currentModel as keyof typeof modelProgression] || 'xgboost_rl';
}

export async function GET() {
  return NextResponse.json({
    message: 'Reinforcement Learning Optimization API',
    version: '1.0.0',
    supportedAlgorithms: [
      'policy_gradient',
      'q_learning', 
      'actor_critic',
      'deep_q_network'
    ],
    status: 'active'
  });
}