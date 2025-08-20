import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface ChatRequest {
  message: string;
  context?: string;
  model?: string;
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
    const { message, context, model = 'llama3:8b' } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // WSL Ollama configuration
    const getOllamaUrl = () => {
      if (process.env.NEXT_PUBLIC_OLLAMA_HOST) {
        return `http://${process.env.NEXT_PUBLIC_OLLAMA_HOST}`;
      }
      // Use localhost for Linux, host.docker.internal for Windows Docker
      return process.env.OLLAMA_HOST || 'http://localhost:11434';
    };

    const ollamaUrl = getOllamaUrl();
    console.log(`🤖 Streaming from Ollama at: ${ollamaUrl}`);

    // Prepare the prompt with context if provided
    let prompt = message;
    if (context) {
      prompt = `Context: ${context}\n\nUser Question: ${message}\n\nPlease provide a helpful response based on the context provided above.`;
    }

    try {
      // Create a streaming response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Query Ollama with streaming enabled
            const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model,
                prompt,
                stream: true, // Enable streaming
                options: {
                  temperature: 0.7,
                  top_p: 0.9,
                  num_predict: 500,
                  stop: ['User:', 'Human:']
                }
              }),
              signal: AbortSignal.timeout(60000) // Extended timeout for streaming
            });

            if (!ollamaResponse.ok) {
              throw new Error(`Ollama request failed: ${ollamaResponse.status}`);
            }

            const reader = ollamaResponse.body?.getReader();
            if (!reader) {
              throw new Error('No response stream available');
            }

            const decoder = new TextDecoder();

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                  try {
                    const data = JSON.parse(line);
                    
                    if (data.response) {
                      // Send the response chunk to the client
                      controller.enqueue(
                        new TextEncoder().encode(`data: ${JSON.stringify({
                          type: 'content',
                          content: data.response,
                          done: data.done || false
                        })}\n\n`)
                      );
                    }

                    if (data.done) {
                      controller.enqueue(
                        new TextEncoder().encode(`data: ${JSON.stringify({
                          type: 'done',
                          content: '',
                          done: true
                        })}\n\n`)
                      );
                      break;
                    }
                  } catch (parseError) {
                    console.warn('Failed to parse streaming chunk:', parseError);
                  }
                }
              }
            } finally {
              reader.releaseLock();
            }

            controller.close();
          } catch (streamError) {
            console.error('Streaming error:', streamError);
            
            // Send error message to client
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({
                type: 'error',
                content: `⚠️ **Ollama Service Unavailable**

I'm unable to connect to the Ollama service in WSL. To use the Assistant, please:

1. **In WSL Terminal**: Run \`ollama serve\` to start the service
2. **Pull the model**: Run \`ollama pull llama3:8b\`
3. **Verify**: Run \`ollama list\` to see installed models

Current Ollama URL: ${ollamaUrl}`,
                error: streamError instanceof Error ? streamError.message : 'Unknown error',
                done: true
              })}\n\n`)
            );
            
            controller.close();
          }
        }
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });

    } catch (error) {
      console.error('Chat stream error:', error);
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        model,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Stream API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
