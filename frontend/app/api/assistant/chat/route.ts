import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface ChatRequest {
  message: string;
  context?: string;
  model?: string;
}

interface OllamaResponse {
  response: string;
  done: boolean;
  context?: number[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: ChatRequest = await request.json();
    const { message, context, model = 'llama3.1:8b' } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Check if Ollama is available
    try {
      const healthCheck = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (!healthCheck.ok) {
        throw new Error('Ollama not available');
      }

      // Prepare the prompt with context if provided
      let prompt = message;
      if (context) {
        prompt = `Context: ${context}\n\nUser Question: ${message}\n\nPlease provide a helpful response based on the context provided above.`;
      }

      // Query Ollama
      const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            num_predict: 500,
            stop: ['User:', 'Human:']
          }
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (!ollamaResponse.ok) {
        throw new Error(`Ollama request failed: ${ollamaResponse.status}`);
      }

      const result: OllamaResponse = await ollamaResponse.json();

      return NextResponse.json({
        success: true,
        response: result.response || 'Sorry, I could not generate a response.',
        model,
        timestamp: new Date().toISOString()
      });

    } catch (ollamaError) {
      console.error('Ollama request failed:', ollamaError);
      
      // Fallback response when Ollama is not available
      return NextResponse.json({
        success: false,
        response: `⚠️ **Ollama Service Unavailable**

I'm unable to connect to the local Ollama service. To use the LLM Assistant, please:

1. **Install Ollama**: Download from https://ollama.com/library/llama3.1:8b
2. **Start the service**: Run \`ollama serve\` in your terminal
3. **Pull the model**: Run \`ollama pull llama3.1:8b\`

**Fallback Analysis**: ${context ? `Based on the provided context, I can see information about your emails, but I need Ollama to provide intelligent responses.` : 'Please provide your question and I\'ll try to help when Ollama is available.'}`,
        model,
        error: 'Ollama service not available',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check Ollama status
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        const models = data.models || [];
        const llamaModel = models.find((model: any) => 
          model.name.includes('llama3.1') && model.name.includes('8b')
        );

        return NextResponse.json({
          available: true,
          model: llamaModel?.name || 'llama3.1:8b',
          status: llamaModel ? 'Ready' : 'Model not found',
          models: models.map((m: any) => ({ name: m.name, size: m.size }))
        });
      } else {
        throw new Error('Ollama not responding');
      }
    } catch (error) {
      return NextResponse.json({
        available: false,
        model: 'llama3.1:8b',
        status: 'Ollama service not running',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}