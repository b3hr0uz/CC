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
    precision: 0.889,
    recall: 0.883,
    trained: true
  },
  'naive_bayes': {
    name: 'Naive Bayes',
    f1_score: 0.845,
    accuracy: 0.841,
    precision: 0.852,
    recall: 0.838,
    trained: true
  }
};

// Function to simulate model prediction based on email content
function simulateModelPrediction(
  emailContent: { subject: string; from: string; content: string },
  modelKey: string
): { classification: 'spam' | 'ham'; confidence: number } {
  
  const model = MOCK_MODEL_PERFORMANCE[modelKey as keyof typeof MOCK_MODEL_PERFORMANCE];
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
  emailContent: { subject: string; from: string; content: string }
): Array<{ model: string; classification: 'spam' | 'ham'; confidence: number }> {
  
  return Object.keys(MOCK_MODEL_PERFORMANCE).map(modelKey => {
    const prediction = simulateModelPrediction(emailContent, modelKey);
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
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
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
    
    // Simulate processing delay (realistic model inference time)
    const processingDelay = Math.random() * 500 + 200; // 200-700ms
    await new Promise(resolve => setTimeout(resolve, processingDelay));

    const emailContent = { subject, from, content };
    
    let primaryPrediction;
    let modelUsed;
    let allPredictions;

    if (modelKey && MOCK_MODEL_PERFORMANCE[modelKey as keyof typeof MOCK_MODEL_PERFORMANCE]) {
      // Use specific model
      primaryPrediction = simulateModelPrediction(emailContent, modelKey);
      modelUsed = modelKey;
      // Still get all predictions for comparison
      allPredictions = getAllModelPredictions(emailContent);
    } else {
      // Use best performing model (highest F1-score)
      const bestModel = Object.entries(MOCK_MODEL_PERFORMANCE)
        .filter(([, model]) => model.trained)
        .sort(([, a], [, b]) => b.f1_score - a.f1_score)[0];
      
      if (!bestModel) {
        return NextResponse.json(
          { error: 'No trained models available for classification' },
          { status: 503 }
        );
      }

      modelUsed = bestModel[0];
      primaryPrediction = simulateModelPrediction(emailContent, modelUsed);
      allPredictions = getAllModelPredictions(emailContent);
    }

    const processingTime = Date.now() - startTime;

    const response: ClassificationResponse = {
      emailId,
      classification: primaryPrediction.classification,
      confidence: primaryPrediction.confidence,
      modelUsed,
      timestamp: new Date().toISOString(),
      processingTime,
      allModelPredictions: allPredictions
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