'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Bot, Send, Loader2, Search, Database, 
  Settings, RefreshCw, Zap, Activity, Download, AlertCircle
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import axios from 'axios';

interface EmailEmbedding {
  id: string;
  subject: string;
  from: string;
  content: string;
  embedding: number[];
  timestamp: Date;
  classification?: 'spam' | 'ham';
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sources?: EmailEmbedding[];
  processing?: boolean;
}

interface OllamaModel {
  name: string;
  model: string;
  size: number;
  modified_at: string;
  digest: string;
  details: {
    parameter_size: string;
    quantization_level: string;
    family: string;
  };
}

interface SystemResources {
  totalMemoryGB: number;
  availableMemoryGB: number;
  recommendedMaxModelSizeGB: number;
}

interface OllamaConfig {
  apiUrl: string;
  defaultModel: string;
  alternativeModels: string[];
  timeout: number;
  streamSupport: boolean;
}

interface OllamaStatus {
  available: boolean;
  model: string;
  status: string;
  loading: boolean;
  availableModels: OllamaModel[];
  systemResources: SystemResources | null;
  isDownloading: boolean;
  downloadProgress: number;
  config: OllamaConfig;
  setupInstructions?: string[];
}

interface RAGStats {
  totalEmbeddings: number;
  lastUpdated: Date | null;
  searchableEmails: number;
  vectorDimensions: number;
}

// OS Detection and Configuration
const detectOS = (): 'windows' | 'macos' | 'linux' | 'unknown' => {
  if (typeof window === 'undefined') return 'unknown';
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform.toLowerCase();
  
  if (platform.includes('win') || userAgent.includes('windows')) {
    return 'windows';
  } else if (platform.includes('mac') || userAgent.includes('mac')) {
    return 'macos';
  } else if (platform.includes('linux') || userAgent.includes('linux')) {
    return 'linux';
  }
  
  return 'unknown';
};

// OS-specific Ollama configurations
const getOllamaConfig = (): OllamaConfig => {
  const os = detectOS();
  
  // Check for Docker environment variable for host Ollama access
  const dockerOllamaHost = process.env.NEXT_PUBLIC_OLLAMA_HOST;
  const baseApiUrl = dockerOllamaHost 
    ? `http://${dockerOllamaHost}` 
    : 'http://localhost:11434';
  
  switch (os) {
    case 'windows':
      return {
        apiUrl: baseApiUrl,
        defaultModel: 'llama3:latest', // Matches typical Windows Ollama installation
        alternativeModels: ['llama3.1:8b', 'llama3:8b', 'llama2:latest', 'codellama:latest'],
        timeout: 12000, // Extended timeout for Docker bridge network + Windows
        streamSupport: true
      };
    
    case 'macos':
    case 'linux':
      return {
        apiUrl: baseApiUrl,
        defaultModel: 'llama3.1:8b', // macOS/Linux users typically prefer newer versions
        alternativeModels: ['llama3:latest', 'llama3:8b', 'llama2:latest', 'codellama:latest'],
        timeout: dockerOllamaHost ? 10000 : 6000, // Extended timeout for Docker network
        streamSupport: true
      };
    
    default:
      return {
        apiUrl: baseApiUrl,
        defaultModel: 'llama3.1:8b',
        alternativeModels: ['llama3:latest', 'llama3:8b', 'llama2:latest'],
        timeout: dockerOllamaHost ? 10000 : 7000, // Extended timeout for Docker network
        streamSupport: true
      };
  }
};

export default function AssistantPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Core states
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [emailEmbeddings, setEmailEmbeddings] = useState<EmailEmbedding[]>([]);
  
  // Ollama states with OS-specific configuration
  const ollamaConfig = getOllamaConfig();
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>({
    available: false,
    model: ollamaConfig.defaultModel,
    status: 'Checking...',
    loading: true,
    availableModels: [],
    systemResources: null,
    isDownloading: false,
    downloadProgress: 0,
    config: ollamaConfig
  });
  
  // RAG states
  const [ragStats, setRagStats] = useState<RAGStats>({
    totalEmbeddings: 0,
    lastUpdated: null,
    searchableEmails: 0,
    vectorDimensions: 384
  });
  
  // UI states
  const [showSettings, setShowSettings] = useState(false);
  const [isLoadingEmbeddings, setIsLoadingEmbeddings] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Authentication check
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/');
      return;
    }
  }, [session, status, router]);

  // Initialize on component mount
  useEffect(() => {
    initializeAssistant();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-refresh embeddings every 5 minutes if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      loadEmailEmbeddings();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  const initializeAssistant = async () => {
    console.log('🤖 Initializing Assistant...');
    
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: `system-${Date.now()}`,
      type: 'system',
      content: 'Initializing...\n\nWelcome to your email assistant powered by Ollama and RAG pipelines.\n\nI can help you:\n• Query your email history with semantic search\n• Analyze email patterns and trends\n• Answer questions about your communications\n• Provide insights based on your email data\n\nInitializing local Ollama service and loading email embeddings...',
      timestamp: new Date()
    };
    
    setMessages([welcomeMessage]);
    
    // Check Ollama status - will be called inline
    // Load email embeddings - will be called inline
    
    // Update welcome message when ready
    setTimeout(() => {
      if (ollamaStatus.available && ragStats.totalEmbeddings > 0) {
        const readyMessage: ChatMessage = {
          id: `system-ready-${Date.now()}`,
          type: 'system',
          content: `✅ **Assistant Ready**\n\n🧠 **Ollama**: ${ollamaStatus.model} - ${ollamaStatus.status}\n📧 **Email Database**: ${ragStats.searchableEmails.toLocaleString()} searchable emails\n🔍 **Vector Search**: ${ragStats.totalEmbeddings.toLocaleString()} embeddings loaded\n\nYou can now ask me anything about your emails!`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, readyMessage]);
      }
    }, 2000);
  };

  const checkOllamaStatus = async () => {
    try {
      setOllamaStatus(prev => ({ ...prev, loading: true }));
      
      // Check if Ollama is running locally using OS-specific config
      const response = await axios.get(`${ollamaConfig.apiUrl}/api/tags`, {
        timeout: ollamaConfig.timeout
      });
      
             const models: OllamaModel[] = response.data.models || [];
       console.log(`🔍 Detected OS: ${detectOS()}, Available models:`, models.map(m => m.name));
       
       // Try to find the default model for this OS first
       let selectedModel = models.find((model: OllamaModel) => 
         model.name === ollamaConfig.defaultModel
       );
       
       // If default model not found, try alternatives
       if (!selectedModel) {
         for (const altModel of ollamaConfig.alternativeModels) {
           selectedModel = models.find((model: OllamaModel) => model.name === altModel);
           if (selectedModel) break;
         }
       }
       
       // Fallback to any llama model
       if (!selectedModel) {
         selectedModel = models.find((model: OllamaModel) => 
           model.name.toLowerCase().includes('llama')
         );
       }
      
      if (selectedModel) {
        console.log(`✅ Selected model for ${detectOS()}: ${selectedModel.name}`);
        setOllamaStatus(prev => ({
          ...prev,
          available: true,
          model: selectedModel.name,
          status: `Ready (${detectOS()})`,  
          loading: false,
          availableModels: models
        }));
      } else {
        const suggestedModel = ollamaConfig.defaultModel;
        setOllamaStatus(prev => ({
          ...prev,
          available: false,
          model: suggestedModel,
          status: `No compatible models found - run: ollama pull ${suggestedModel}`,
          loading: false
        }));
      }
    } catch (error) {
      console.error('Ollama check failed:', error);
      const currentOS = detectOS();
      const suggestedModel = ollamaConfig.defaultModel;
      
      // Generate platform-specific error message and setup guidance
      let statusMessage = '';
      let setupInstructions: string[] = [];
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          statusMessage = `Ollama not running on ${currentOS}`;
          
          switch (currentOS) {
            case 'windows':
              setupInstructions = [
                '1. Open Command Prompt or PowerShell',
                '2. Start Ollama: ollama serve',
                '3. Keep the window open (Ollama runs in foreground)',
                `4. If model missing: ollama pull ${suggestedModel}`,
                '5. Test connection: scripts/test-ollama-connection.ps1',
                'Alternative: Run scripts/setup-ollama.ps1 for full setup'
              ];
              break;
            case 'macos':
              setupInstructions = [
                '1. Install: brew install ollama (or download .dmg)',
                '2. Start: ollama serve (or open Ollama app)',
                `3. Install model: ollama pull ${suggestedModel}`,
                'Alternative: Run ./scripts/setup-ollama.sh'
              ];
              break;
            case 'linux':
              setupInstructions = [
                '1. Install: curl -fsSL https://ollama.com/install.sh | sh',
                '2. Start: ollama serve (or systemctl start ollama)',
                `3. Install model: ollama pull ${suggestedModel}`,
                'Alternative: Run ./scripts/setup-ollama.sh'
              ];
              break;
            default:
              setupInstructions = [
                '1. Visit https://ollama.com for installation instructions',
                '2. Start Ollama service on your platform',
                `3. Install model: ollama pull ${suggestedModel}`
              ];
          }
        } else if (error.code === 'ETIMEDOUT') {
          statusMessage = `Ollama service timeout (may be starting up)`;
          setupInstructions = [
            'Ollama may be starting up. Please wait a moment and try again.',
            'If problem persists, restart Ollama service.'
          ];
        } else {
          statusMessage = `Connection error: ${error.message}`;
          setupInstructions = [
            'Check if Ollama is running on http://localhost:11434',
            'Verify firewall settings allow port 11434'
          ];
        }
      } else {
        statusMessage = `Unexpected error: ${error}`;
        setupInstructions = ['Please check the browser console for more details'];
      }
      
      setOllamaStatus(prev => ({
        ...prev,
        available: false,
        model: suggestedModel,
        status: statusMessage,
        loading: false,
        setupInstructions: setupInstructions
      }));
    }
  };

  const pullModel = async (modelName: string) => {
    if (!ollamaStatus.systemResources) {
      console.error('System resources not available');
      return;
    }

    try {
      setOllamaStatus(prev => ({
        ...prev,
        isDownloading: true,
        downloadProgress: 0,
        status: `Downloading ${modelName}...`
      }));

      console.log(`🚀 Starting download of ${modelName}...`);

      // Use streaming to show progress with OS-specific config
      const response = await fetch(`${ollamaConfig.apiUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          stream: ollamaConfig.streamSupport
        })
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (data.status === 'downloading' && data.total && data.completed) {
              const progress = (data.completed / data.total) * 100;
              setOllamaStatus(prev => ({
                ...prev,
                downloadProgress: Math.round(progress),
                status: `Downloading ${modelName}... ${Math.round(progress)}%`
              }));
            } else if (data.status === 'success') {
              console.log(`✅ Successfully downloaded ${modelName}`);
              // Refresh available models
              await checkOllamaStatus();
              return;
            }
                     } catch {
             // Ignore parsing errors for streaming chunks
           }
        }
      }
    } catch (error) {
      console.error(`❌ Failed to download ${modelName}:`, error);
      setOllamaStatus(prev => ({
        ...prev,
        isDownloading: false,
        status: `Failed to download ${modelName}. Check connection.`
      }));
    }
  };

  const changeModel = async (modelName: string) => {
    setOllamaStatus(prev => ({
      ...prev,
      model: modelName,
      status: `Switched to ${modelName}`
    }));
    console.log(`🔄 Switched to model: ${modelName}`);
  };

  const getModelSizeGB = (sizeBytes: number): number => {
    return sizeBytes / (1024 * 1024 * 1024);
  };

  const getRecommendedModels = () => {
    const os = detectOS();
    
    // OS-specific model recommendations
    const baseModels = [
      { name: 'llama3.2:1b', displayName: 'Llama 3.2 1B', size: 1.3, description: 'Lightweight, good for basic tasks' },
      { name: 'llama3.2:3b', displayName: 'Llama 3.2 3B', size: 2.0, description: 'Balanced performance and size' },
      { name: 'qwen2.5:0.5b', displayName: 'Qwen2.5 0.5B', size: 0.4, description: 'Ultra-lightweight, fastest' },
      { name: 'qwen2.5:1.5b', displayName: 'Qwen2.5 1.5B', size: 1.0, description: 'Compact and efficient' },
      { name: 'qwen2.5:3b', displayName: 'Qwen2.5 3B', size: 2.0, description: 'Good balance of speed and quality' },
      { name: 'llama3.1:8b', displayName: 'Llama 3.1 8B', size: 4.7, description: 'High quality, recommended' },
      { name: 'qwen2.5:7b', displayName: 'Qwen2.5 7B', size: 4.4, description: 'Excellent performance' },
      { name: 'llama3.2:latest', displayName: 'Llama 3.2 Latest', size: 2.0, description: 'Latest stable version' },
      { name: 'phi3:3.8b', displayName: 'Phi-3 3.8B', size: 2.2, description: 'Microsoft\'s efficient model' },
      { name: 'gemma2:2b', displayName: 'Gemma 2 2B', size: 1.6, description: 'Google\'s compact model' }
    ];
    
    switch (os) {
      case 'windows':
        // For Windows users, prioritize models that work well with their setup
        return [
          { name: 'llama3:8b', displayName: 'Llama 3 8B', size: 4.7, description: '⭐ Recommended for Windows - Compatible with llama3:latest' },
          { name: 'llama3.1:8b', displayName: 'Llama 3.1 8B', size: 4.7, description: 'Latest version of Llama 3' },
          { name: 'codellama:7b', displayName: 'Code Llama 7B', size: 3.8, description: 'Great for code assistance' },
          { name: 'phi3:3.8b', displayName: 'Phi-3 3.8B', size: 2.2, description: 'Microsoft model - optimized for Windows' },
          ...baseModels.filter(m => !['llama3.1:8b', 'phi3:3.8b'].includes(m.name))
        ];
      
      case 'macos':
        // For macOS users, prioritize newer models and efficiency
        return [
          { name: 'llama3.1:8b', displayName: 'Llama 3.1 8B', size: 4.7, description: '⭐ Recommended for macOS - Latest stable' },
          { name: 'qwen2.5:7b', displayName: 'Qwen2.5 7B', size: 4.4, description: 'Excellent performance on Apple Silicon' },
          { name: 'gemma2:2b', displayName: 'Gemma 2 2B', size: 1.6, description: 'Google model - efficient on macOS' },
          { name: 'llama3.2:3b', displayName: 'Llama 3.2 3B', size: 2.0, description: 'Balanced for Mac systems' },
          ...baseModels.filter(m => !['llama3.1:8b', 'qwen2.5:7b', 'gemma2:2b', 'llama3.2:3b'].includes(m.name))
        ];
      
      case 'linux':
        // For Linux users, prioritize performance and variety
        return [
          { name: 'llama3.1:8b', displayName: 'Llama 3.1 8B', size: 4.7, description: '⭐ Recommended for Linux - Best performance' },
          { name: 'qwen2.5:7b', displayName: 'Qwen2.5 7B', size: 4.4, description: 'Excellent on Linux systems' },
          { name: 'codellama:7b', displayName: 'Code Llama 7B', size: 3.8, description: 'Perfect for development work' },
          { name: 'mistral:7b', displayName: 'Mistral 7B', size: 4.1, description: 'High quality alternative' },
          ...baseModels.filter(m => !['llama3.1:8b', 'qwen2.5:7b'].includes(m.name))
        ];
      
      default:
        return baseModels;
    }
  };

  const loadEmailEmbeddings = async () => {
    try {
      setIsLoadingEmbeddings(true);
      console.log('📧 Loading email embeddings for RAG pipeline...');
      
      // First, fetch recent emails
      const emailsResponse = await axios.get('/api/emails', {
        params: { limit: 200 } // Get more emails for better RAG
      });
      
      const emails = emailsResponse.data.emails || [];
      console.log(`📬 Fetched ${emails.length} emails for embedding`);
      
      // Generate embeddings for each email  
      const embeddingsPromises = emails.map(async (email: { id: string; subject: string; from: string; content: string; date: string; classification?: string }): Promise<EmailEmbedding | null> => {
        try {
          // Create combined text for embedding
          const combinedText = `Subject: ${email.subject}\nFrom: ${email.from}\nContent: ${email.content}`;
          
          // Generate embedding using a lightweight embedding model (simulated)
          const embedding = await generateTextEmbedding(combinedText);
          
          return {
            id: email.id,
            subject: email.subject,
            from: email.from,
            content: email.content,
            embedding,
            timestamp: new Date(email.date),
            classification: email.classification as 'spam' | 'ham' | undefined
          };
        } catch (error) {
          console.warn(`Failed to generate embedding for email ${email.id}:`, error);
          return null;
        }
      });
      
      const embeddings = (await Promise.all(embeddingsPromises)).filter(Boolean) as EmailEmbedding[];
      
      setEmailEmbeddings(embeddings);
      setRagStats({
        totalEmbeddings: embeddings.length,
        lastUpdated: new Date(),
        searchableEmails: embeddings.length,
        vectorDimensions: 384 // Simulated embedding dimension
      });
      
      console.log(`✅ Generated ${embeddings.length} email embeddings for RAG`);
    } catch (error) {
      console.error('Failed to load email embeddings:', error);
    } finally {
      setIsLoadingEmbeddings(false);
    }
  };

  // Simulated text embedding generation (in production, use proper embedding model)
  const generateTextEmbedding = async (text: string): Promise<number[]> => {
    // This is a simplified embedding simulation
    // In production, use a proper embedding model like sentence-transformers
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0);
    
    // Simple hash-based embedding simulation
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (let j = 0; j < word.length; j++) {
        const charCode = word.charCodeAt(j);
        embedding[charCode % 384] += Math.sin(charCode * (i + 1)) * 0.1;
      }
    }
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  };

  // Semantic search through email embeddings
  const semanticSearch = async (query: string, topK: number = 5): Promise<EmailEmbedding[]> => {
    if (emailEmbeddings.length === 0) return [];
    
    try {
      // Generate embedding for the query
      const queryEmbedding = await generateTextEmbedding(query);
      
      // Calculate cosine similarity with all email embeddings
      const similarities = emailEmbeddings.map(email => {
        const similarity = cosineSimilarity(queryEmbedding, email.embedding);
        return { email, similarity };
      });
      
      // Sort by similarity and return top K
      similarities.sort((a, b) => b.similarity - a.similarity);
      return similarities.slice(0, topK).map(item => item.email);
    } catch (error) {
      console.error('Semantic search failed:', error);
      return [];
    }
  };

  // Calculate cosine similarity between two vectors
  const cosineSimilarity = (a: number[], b: number[]): number => {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    const query = inputMessage.trim();
    setInputMessage('');
    setIsProcessing(true);
    
    try {
      // Step 1: Semantic search for relevant emails
      const relevantEmails = await semanticSearch(query, 5);
      
      // Step 2: Prepare context from relevant emails
      const emailContext = relevantEmails.map(email => {
        // Safely handle potentially undefined content
        const content = email.content || '[No content available]';
        const truncatedContent = content.length > 300 ? content.slice(0, 300) + '...' : content;
        
        return `Email from ${email.from || 'Unknown sender'} (${email.timestamp?.toLocaleDateString() || 'Unknown date'}):\nSubject: ${email.subject || '[No subject]'}\nContent: ${truncatedContent}`;
      }).join('\n\n---\n\n');
      
      // Step 3: Create prompt for Ollama
      const systemPrompt = `You are an intelligent email assistant with access to the user's email data. Use the provided email context to answer questions accurately and helpfully.

Email Context:
${emailContext}

Instructions:
- Answer based on the provided email context when relevant
- Be conversational and helpful
- If the context doesn't contain relevant information, say so politely
- Summarize insights from multiple emails when appropriate
- Protect privacy by not sharing sensitive information unnecessarily`;
      
      const userPrompt = `User Question: ${query}

Please provide a helpful response based on the email context provided.`;
      
      // Step 4: Query Ollama (if available) or provide fallback response
      let assistantResponse = '';
      
      if (ollamaStatus.available) {
        try {
          const ollamaResponse = await axios.post(`${ollamaConfig.apiUrl}/api/generate`, {
            model: ollamaStatus.model,
            prompt: `${systemPrompt}\n\n${userPrompt}`,
            stream: false,
            options: {
              temperature: 0.7,
              top_p: 0.9,
              num_predict: 500
            }
          }, { timeout: ollamaConfig.timeout * 4 }); // Use 4x the base timeout for generation
          
          assistantResponse = ollamaResponse.data.response || 'Sorry, I could not generate a response.';
        } catch (error) {
          console.error('Ollama request failed:', error);
          assistantResponse = '⚠️ Ollama is not responding. Using fallback response based on email analysis.';
        }
      } else {
        assistantResponse = '⚠️ Ollama is not available. Please ensure Ollama is running with `ollama serve` and the llama3.1:8b model is installed.';
      }
      
      // Fallback analysis if Ollama failed
      if (assistantResponse.includes('⚠️') && relevantEmails.length > 0) {
        assistantResponse += `\n\n📊 **Based on your email data:**\n\nI found ${relevantEmails.length} relevant emails:\n${relevantEmails.map(email => 
          `• From ${email.from || 'Unknown sender'}: "${email.subject || '[No subject]'}" (${email.timestamp?.toLocaleDateString() || 'Unknown date'})`
        ).join('\n')}`;
      }
      
      const botMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: assistantResponse,
        timestamp: new Date(),
        sources: relevantEmails.length > 0 ? relevantEmails : undefined
      };
      
      setMessages(prev => [...prev, botMessage]);
      
    } catch (error) {
      console.error('Message processing failed:', error);
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: '❌ Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex h-screen bg-gray-800 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-800">
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-600 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center">
                <Bot className="h-6 w-6 mr-2 text-blue-400" />
                Assistant
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Ollama Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${ollamaStatus.available ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-300">
                  {ollamaStatus.loading ? 'Checking...' : ollamaStatus.status}
                </span>
              </div>
              
              {/* Settings Toggle */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-lg bg-gray-700 border border-gray-600 text-white hover:bg-gray-600 transition-colors"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-gray-700 border-b border-gray-600 px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* RAG Stats */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                <h3 className="text-white font-semibold mb-3 flex items-center">
                  <Database className="h-4 w-4 mr-2 text-blue-400" />
                  RAG Pipeline
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Embeddings:</span>
                    <span className="text-white">{ragStats.totalEmbeddings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Searchable Emails:</span>
                    <span className="text-white">{ragStats.searchableEmails.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Updated:</span>
                    <span className="text-white">
                      {ragStats.lastUpdated ? ragStats.lastUpdated.toLocaleTimeString() : 'Never'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ollama Status & Model Management */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                <h3 className="text-white font-semibold mb-3 flex items-center">
                  <Activity className="h-4 w-4 mr-2 text-green-400" />
                  Ollama Service
                  <span className="ml-2 text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
                    {detectOS().toUpperCase()}
                  </span>
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className={`${ollamaStatus.available ? 'text-green-400' : 'text-red-400'}`}>
                      {ollamaStatus.status}
                    </span>
                  </div>
                  
                  {/* Setup Instructions (when Ollama is not available) */}
                  {!ollamaStatus.available && ollamaStatus.setupInstructions && ollamaStatus.setupInstructions.length > 0 && (
                    <div className="mt-3 p-3 bg-amber-900/20 border border-amber-700 rounded-lg">
                      <h4 className="text-amber-400 font-medium mb-2 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Setup Required ({detectOS()})
                      </h4>
                      <ol className="text-xs text-gray-300 space-y-1">
                        {ollamaStatus.setupInstructions.map((instruction, index) => (
                          <li key={index} className="flex">
                            <span className="text-amber-400 mr-2">•</span>
                            <span>{instruction}</span>
                          </li>
                        ))}
                      </ol>
                      <div className="mt-2 pt-2 border-t border-amber-700/30">
                        <p className="text-xs text-gray-400">
                          📖 See <code className="bg-gray-800 px-1 rounded">docs/ollama-setup-guide.md</code> for detailed instructions
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">API URL:</span>
                    <span className="text-blue-400 text-xs">{ollamaConfig.apiUrl}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-400">Timeout:</span>
                    <span className="text-gray-300 text-xs">{ollamaConfig.timeout}ms</span>
                  </div>
                  
                  {/* Model Selection */}
                  {ollamaStatus.availableModels.length > 0 && (
                    <div>
                      <label className="block text-gray-400 mb-1">Current Model:</label>
                      <select
                        value={ollamaStatus.model}
                        onChange={(e) => changeModel(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 text-white text-xs rounded px-2 py-1"
                        disabled={ollamaStatus.isDownloading}
                      >
                        {ollamaStatus.availableModels.map((model) => (
                          <option key={model.name} value={model.name}>
                            {model.name} ({(getModelSizeGB(model.size)).toFixed(1)}GB)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Download Progress */}
                  {ollamaStatus.isDownloading && (
                    <div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${ollamaStatus.downloadProgress}%` }}
                        />
                      </div>
                      <div className="text-xs text-blue-400 mt-1">
                        {ollamaStatus.downloadProgress}% downloaded
                      </div>
                    </div>
                  )}

                  <button
                    onClick={checkOllamaStatus}
                    disabled={ollamaStatus.loading || ollamaStatus.isDownloading}
                    className="w-full mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                  >
                    {ollamaStatus.loading ? 'Checking...' : 'Refresh Status'}
                  </button>
                </div>
              </div>

              {/* Model Downloads */}
              {ollamaStatus.available && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                  <h3 className="text-white font-semibold mb-3 flex items-center">
                    <Download className="h-4 w-4 mr-2 text-purple-400" />
                    Download Models
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {getRecommendedModels()
                      .filter(model => !ollamaStatus.availableModels.some(available => available.name === model.name))
                      .slice(0, 4) // Show only first 4 to save space
                      .map((model) => {
                        const tooLarge = !!(ollamaStatus.systemResources && model.size > ollamaStatus.systemResources.recommendedMaxModelSizeGB);
                        
                        return (
                          <div key={model.name} className="flex justify-between items-center p-2 bg-gray-700 rounded text-xs">
                            <div className="flex-1">
                              <div className="text-white font-medium">{model.displayName}</div>
                              <div className="text-gray-400">
                                {model.size.toFixed(1)}GB
                                {tooLarge && <span className="text-red-400 ml-1">⚠️</span>}
                              </div>
                            </div>
                            <button
                              onClick={() => pullModel(model.name)}
                              disabled={ollamaStatus.isDownloading || tooLarge}
                              className={`px-2 py-1 rounded text-xs ${
                                tooLarge 
                                  ? 'bg-red-600 text-white cursor-not-allowed opacity-50'
                                  : 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50'
                              }`}
                            >
                              {tooLarge ? 'Too Large' : 'Get'}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                  
                  {ollamaStatus.systemResources && (
                    <div className="mt-2 text-xs text-gray-500">
                      Max recommended: {ollamaStatus.systemResources.recommendedMaxModelSizeGB.toFixed(1)}GB
                    </div>
                  )}
                </div>
              )}

              {/* Controls */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                <h3 className="text-white font-semibold mb-3 flex items-center">
                  <Zap className="h-4 w-4 mr-2 text-yellow-400" />
                  Controls
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">Auto-refresh embeddings</span>
                  </label>
                  
                  <button
                    onClick={loadEmailEmbeddings}
                    disabled={isLoadingEmbeddings}
                    className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                  >
                    {isLoadingEmbeddings ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {isLoadingEmbeddings ? 'Loading...' : 'Refresh Embeddings'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl rounded-lg p-4 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.type === 'system'
                      ? 'bg-gray-700 border border-gray-600 text-gray-200'
                      : 'bg-gray-800 border border-gray-600 text-white'
                  }`}
                >
                  {message.type !== 'user' && (
                    <div className="flex items-center mb-2">
                      <Bot className="h-4 w-4 mr-2 text-blue-400" />
                      <span className="text-sm font-medium text-blue-400">
                        Assistant
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  
                  <div className="prose prose-invert max-w-none">
                    {message.content.split('\n').map((line, index) => (
                      <p key={index} className="mb-2 last:mb-0">
                        {line.startsWith('**') && line.endsWith('**') ? (
                          <strong>{line.slice(2, -2)}</strong>
                        ) : line.startsWith('•') ? (
                          <span className="ml-4">{line}</span>
                        ) : (
                          line
                        )}
                      </p>
                    ))}
                  </div>
                  
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-600">
                      <div className="text-xs text-gray-400 mb-2 flex items-center">
                        <Search className="h-3 w-3 mr-1" />
                        Sources ({message.sources.length} emails)
                      </div>
                      <div className="space-y-1">
                        {message.sources.slice(0, 3).map((source) => (
                          <div key={source.id} className="text-xs bg-gray-700 rounded p-2">
                            <div className="font-medium text-blue-300">{source.subject}</div>
                            <div className="text-gray-400">From: {source.from}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    <span className="text-gray-300">Searching emails and generating response...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-600 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-4">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your emails..."
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={1}
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isProcessing}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <span>
                {ragStats.searchableEmails > 0 
                  ? `${ragStats.searchableEmails.toLocaleString()} emails available for search`
                  : 'Loading email database...'
                }
              </span>
              <span>Press Enter to send, Shift+Enter for new line</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}