import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';

// Interface for classification request
interface ClassificationRequest {
  emailId: string;
  subject: string;
  from: string;
  content: string;
  modelKey?: string; // Optional specific model to use
}

// Interface for classification response
interface ClassificationResponse {
  emailId: string;
  classification: 'spam' | 'ham';
  confidence: number;
  modelUsed: string;
  timestamp: string;
  processingTime: number;
  allModelPredictions?: Array<{
    model: string;
    classification: 'spam' | 'ham';
    confidence: number;
  }>;
}

// Interface for model performance metrics
interface ModelPerformance {
  name: string;
  f1_score: number;
  accuracy: number;
  precision: number;
  recall: number;
  trained: boolean;
}

// Interface for RL optimization data
interface RLOptimization {
  emailId: string;
  targetModel: string;
  originalClassification: string;
  correctedClassification: string;
  confidence: number;
  improvements: {
    f1ScoreGain: number;
    accuracyGain: number;
    precisionGain: number;
    recallGain: number;
  };
}

// Mock model performance data (in real app, this would come from training results)
const MOCK_MODEL_PERFORMANCE = {
  'gradient_boosting': {
    name: 'Gradient Boosting',
    f1_score: 0.924,
    accuracy: 0.918,
    precision: 0.931,
    recall: 0.917,
    trained: true
  },
  'neural_network': {
    name: 'Neural Network',
    f1_score: 0.901,
    accuracy: 0.895,
    precision: 0.908,
    recall: 0.894,
    trained: true
  },
  'logistic_regression': {
    name: 'Logistic Regression', 
    f1_score: 0.886,
    accuracy: 0.882,
    precision: 0.893,
    recall: 0.879,
    trained: true
  },
  'svm': {
    name: 'Support Vector Machine',
    f1_score: 0.891,
    accuracy: 0.887,
    precision: 0.896,
    recall: 0.886,
    trained: true
  },
  'random_forest': {
    name: 'Random Forest',
    f1_score: 0.913,
    accuracy: 0.909,
    precision: 0.918,
    recall: 0.908,
    trained: true
  }
};

// Enhanced function to get RL-optimized model performance
const getRLEnhancedModelPerformance = (rlOptimizationsHeader?: string): Record<string, ModelPerformance> => {
  // Create a copy of base performance metrics
  const enhancedPerformance = JSON.parse(JSON.stringify(MOCK_MODEL_PERFORMANCE)) as Record<string, ModelPerformance>;
  
  try {
    // Check for RL optimization data from request header
    if (rlOptimizationsHeader) {
      const rlOptimizations: RLOptimization[] = JSON.parse(rlOptimizationsHeader);
      
      if (rlOptimizations.length > 0) {
        // Aggregate RL improvements for gradient_boosting (best model)
        let totalAccuracyGain = 0;
        let totalPrecisionGain = 0;
        let totalRecallGain = 0;
        let totalF1ScoreGain = 0;
        
        rlOptimizations.forEach((opt: RLOptimization) => {
          if (opt.targetModel === 'best') {
            totalAccuracyGain += opt.improvements?.accuracyGain || 0;
            totalPrecisionGain += opt.improvements?.precisionGain || 0;
            totalRecallGain += opt.improvements?.recallGain || 0;
            totalF1ScoreGain += opt.improvements?.f1ScoreGain || 0;
          }
        });
        
        // Apply improvements to gradient_boosting (best model) if any improvements found
        if (totalF1ScoreGain > 0) {
          const originalMetrics = enhancedPerformance.gradient_boosting;
          enhancedPerformance.gradient_boosting = {
            ...originalMetrics,
            name: 'Gradient Boosting + RL',
            accuracy: Math.min(0.999, originalMetrics.accuracy + totalAccuracyGain),
            precision: Math.min(0.999, originalMetrics.precision + totalPrecisionGain),
            recall: Math.min(0.999, originalMetrics.recall + totalRecallGain),
            f1_score: Math.min(0.999, originalMetrics.f1_score + totalF1ScoreGain),
          };
          
          console.log(`🧠 Applied ${rlOptimizations.length} RL optimizations to gradient_boosting model (F1 gain: +${(totalF1ScoreGain * 100).toFixed(2)}%)`);
        }
      }
    }
  } catch {
    console.log('📝 No RL optimizations found or parsing failed, using base model performance');
  }
  
  return enhancedPerformance;
};

// Function to simulate model prediction based on email content
function simulateModelPrediction(
  emailContent: { subject: string; from: string; content: string },
  modelKey: string,
  modelPerformance: Record<string, ModelPerformance> // Added modelPerformance parameter
): { classification: 'spam' | 'ham'; confidence: number } {
  
  const model = modelPerformance[modelKey as keyof typeof modelPerformance];
  if (!model || !model.trained) {
    throw new Error(`Model ${modelKey} is not trained or available`);
  }

  // Spam indicators for realistic classification
  const spamKeywords = [
    'urgent', 'winner', 'congratulations', 'claim', 'lottery', 'prize',
    'free', 'offer', 'limited time', 'act now', 'click here', 'nigeria',
    'inheritance', 'million', 'dollars', 'bank', 'transfer', 'verify',
    'suspended', 'account', 'security', 'paypal', 'amazon', 'apple'
  ];

  const hamKeywords = [
    'meeting', 'project', 'team', 'schedule', 'report', 'update',
    'review', 'discussion', 'presentation', 'deadline', 'task',
    'client', 'customer', 'service', 'support', 'invoice', 'receipt'
  ];

  // Combine all text for analysis
  const fullText = `${emailContent.subject} ${emailContent.from} ${emailContent.content}`.toLowerCase();
  
  // Count spam and ham indicators
  const spamScore = spamKeywords.filter(keyword => fullText.includes(keyword)).length;
  const hamScore = hamKeywords.filter(keyword => fullText.includes(keyword)).length;
  
  // Base spam probability influenced by model performance
  let spamProbability = 0.2; // Base probability
  
  // Adjust based on content analysis
  if (spamScore > hamScore) {
    spamProbability = Math.min(0.95, 0.7 + (spamScore * 0.05));
  } else if (hamScore > spamScore) {
    spamProbability = Math.max(0.05, 0.3 - (hamScore * 0.05));
  } else {
    // Add some randomness for realistic variation
    spamProbability = 0.3 + (Math.random() * 0.4);
  }
  
  // Adjust confidence based on model performance
  const baseConfidence = model.f1_score;
  const confidenceVariance = 0.1;
  const confidence = Math.max(0.5, Math.min(0.99, 
    baseConfidence + (Math.random() - 0.5) * confidenceVariance
  ));
  
  return {
    classification: spamProbability > 0.5 ? 'spam' : 'ham',
    confidence: confidence
  };
}

// Get all model predictions for comparison
function getAllModelPredictions(
  emailContent: { subject: string; from: string; content: string },
  modelPerformance: Record<string, ModelPerformance> // Added modelPerformance parameter
): Array<{ model: string; classification: 'spam' | 'ham'; confidence: number }> {
  
  return Object.keys(modelPerformance).map(modelKey => {
    const prediction = simulateModelPrediction(emailContent, modelKey, modelPerformance);
    return {
      model: modelKey,
      classification: prediction.classification,
      confidence: prediction.confidence
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required for email classification' },
        { status: 401 }
      );
    }

    const body: ClassificationRequest = await request.json();
    const { emailId, subject, from, content, modelKey } = body;

    if (!emailId || !subject || !from || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: emailId, subject, from, content' },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    
    // Get RL-enhanced model performance for real-time classification
    const ENHANCED_MODEL_PERFORMANCE = getRLEnhancedModelPerformance(
      request.headers.get('X-RL-Optimizations') || undefined
    );
    
    // Simulate processing delay (realistic model inference time)
    const processingDelay = Math.random() * 500 + 200; // 200-700ms
    await new Promise(resolve => setTimeout(resolve, processingDelay));

    const emailContent = { subject, from, content };
    
    let primaryPrediction;
    let modelUsed;
    let allPredictions;

    if (modelKey && ENHANCED_MODEL_PERFORMANCE[modelKey as keyof typeof ENHANCED_MODEL_PERFORMANCE]) {
      // Use specific model with RL enhancements
      primaryPrediction = simulateModelPrediction(emailContent, modelKey, ENHANCED_MODEL_PERFORMANCE);
      modelUsed = modelKey;
      // Still get all predictions for comparison
      allPredictions = getAllModelPredictions(emailContent, ENHANCED_MODEL_PERFORMANCE);
    } else {
      // Use best performing model (highest F1-score) with RL enhancements
      const bestModel = Object.entries(ENHANCED_MODEL_PERFORMANCE)
        .filter(([, model]) => model.trained)
        .sort(([, a], [, b]) => b.f1_score - a.f1_score)[0];
      
      if (!bestModel) {
        return NextResponse.json(
          { error: 'No trained models available for classification' },
          { status: 503 }
        );
      }

      modelUsed = bestModel[0];
      primaryPrediction = simulateModelPrediction(emailContent, modelUsed, ENHANCED_MODEL_PERFORMANCE);
      allPredictions = getAllModelPredictions(emailContent, ENHANCED_MODEL_PERFORMANCE);
    }

    const processingTime = Date.now() - startTime;

    const response: ClassificationResponse = {
      emailId,
      classification: primaryPrediction.classification,
      confidence: primaryPrediction.confidence,
      modelUsed: ENHANCED_MODEL_PERFORMANCE[modelUsed]?.name || modelUsed,
      timestamp: new Date().toISOString(),
      processingTime,
      allModelPredictions: allPredictions?.map(pred => ({
        ...pred,
        model: ENHANCED_MODEL_PERFORMANCE[pred.model]?.name || pred.model
      }))
    };

    console.log(`📧 Email classification complete:`, {
      emailId,
      classification: response.classification,
      confidence: response.confidence.toFixed(3),
      modelUsed,
      processingTime: `${processingTime}ms`
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error classifying email:', error);
    return NextResponse.json(
      { error: 'Internal server error during classification' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Email classification API',
    version: '1.0.0',
    supportedModels: Object.keys(MOCK_MODEL_PERFORMANCE),
    capabilities: [
      'Real-time email classification',
      'Multi-model predictions',
      'Confidence scoring',
      'Performance tracking'
    ]
  });
}