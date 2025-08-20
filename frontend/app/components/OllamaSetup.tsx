'use client';

import React, { useState, useEffect } from 'react';
import { Download, Terminal, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';

interface OllamaSetupProps {
  onOllamaReady?: () => void;
}

interface OllamaInstallStep {
  id: string;
  title: string;
  description: string;
  command?: string;
  status: 'pending' | 'installing' | 'complete' | 'error';
}

export default function OllamaSetup({ onOllamaReady }: OllamaSetupProps) {
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [installSteps, setInstallSteps] = useState<OllamaInstallStep[]>([
    {
      id: 'install',
      title: 'Install Ollama',
      description: 'Download and install Ollama on your system',
      status: 'pending'
    },
    {
      id: 'start',
      title: 'Start Ollama Service',
      description: 'Run Ollama in the background',
      command: 'ollama serve',
      status: 'pending'
    },
    {
      id: 'model',
      title: 'Install llama3 8b Model',
      description: 'Download the llama3:8b model for AI assistance',
      command: 'ollama pull llama3:8b',
      status: 'pending'
    }
  ]);
  const [isChecking, setIsChecking] = useState(false);

  const detectOS = () => {
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

  const getInstallCommand = () => {
    const os = detectOS();
    
    switch (os) {
      case 'windows':
        return 'Download from https://ollama.com/download/windows or use winget install Ollama.Ollama';
      case 'macos':
        return 'Download from https://ollama.com/download/macos or use brew install ollama';
      case 'linux':
        return 'curl -fsSL https://ollama.com/install.sh | sh';
      default:
        return 'Visit https://ollama.com/download for your platform';
    }
  };

  const checkOllamaStatus = async () => {
    setIsChecking(true);
    
    try {
      // Check if Ollama is running
      const response = await fetch('/api/assistant/chat', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.available) {
          // Check if llama3 model is available
          const hasLlama3 = data.models?.some((model: any) => 
            model.name.includes('llama3') && (model.name.includes('8b') || model.name.includes('latest'))
          );
          
          setInstallSteps(prev => prev.map(step => {
            if (step.id === 'install' || step.id === 'start') {
              return { ...step, status: 'complete' };
            }
            if (step.id === 'model') {
              return { ...step, status: hasLlama3 ? 'complete' : 'pending' };
            }
            return step;
          }));
          
          if (hasLlama3) {
            onOllamaReady?.();
            return true;
          }
        } else {
          setInstallSteps(prev => prev.map(step => 
            step.id === 'install' ? { ...step, status: 'complete' } : 
            step.id === 'start' ? { ...step, status: 'error' } : step
          ));
        }
      } else {
        // Ollama not available
        setInstallSteps(prev => prev.map(step => ({ ...step, status: 'pending' })));
      }
    } catch (error) {
      console.error('Ollama status check failed:', error);
      setInstallSteps(prev => prev.map(step => ({ ...step, status: 'pending' })));
    } finally {
      setIsChecking(false);
    }
    
    return false;
  };

  useEffect(() => {
    checkOllamaStatus();
  }, []);

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'installing':
        return (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
        );
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-400"></div>;
    }
  };

  if (!isSetupMode) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-6 mx-4 my-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">
              Ollama Not Available
            </h3>
            <p className="text-gray-300 mb-4">
              The AI Assistant requires Ollama with the llama3:8b model to provide intelligent responses. 
              Currently, the system will use fallback responses based on your email data.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={checkOllamaStatus}
                disabled={isChecking}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors"
              >
                {isChecking ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {isChecking ? 'Checking...' : 'Check Again'}
              </button>
              
              <button
                onClick={() => setIsSetupMode(true)}
                className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Setup Ollama
              </button>
              
              <a
                href="https://ollama.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit Ollama.com
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 mx-4 my-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">Setup Ollama for AI Assistant</h3>
        <button
          onClick={() => setIsSetupMode(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-4">
        {installSteps.map((step, index) => (
          <div key={step.id} className="flex items-start space-x-4">
            <div className="flex-shrink-0 mt-1">
              {getStepIcon(step.status)}
            </div>
            
            <div className="flex-1">
              <h4 className="text-lg font-medium text-white mb-1">
                {index + 1}. {step.title}
              </h4>
              <p className="text-gray-300 mb-2">{step.description}</p>
              
              {step.id === 'install' && (
                <div className="bg-gray-900 rounded-lg p-3 mb-2">
                  <p className="text-sm text-gray-300 mb-2">
                    <strong>For {detectOS()}:</strong>
                  </p>
                  <code className="text-sm text-green-400 bg-black px-2 py-1 rounded">
                    {getInstallCommand()}
                  </code>
                </div>
              )}
              
              {step.command && step.id !== 'install' && (
                <div className="bg-gray-900 rounded-lg p-3 mb-2">
                  <div className="flex items-center space-x-2">
                    <Terminal className="h-4 w-4 text-gray-400" />
                    <code className="text-sm text-green-400">{step.command}</code>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-600">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={checkOllamaStatus}
            disabled={isChecking}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors"
          >
            {isChecking ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {isChecking ? 'Checking Status...' : 'Test Connection'}
          </button>
          
          <a
            href="https://github.com/ollama/ollama#quickstart"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Installation Guide
          </a>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600 rounded-lg">
        <p className="text-sm text-blue-300">
          <strong>Note:</strong> After installing Ollama, make sure to keep it running in the background with <code>ollama serve</code>. 
          The llama3:8b model is approximately 4.7GB and provides the best balance of performance and resource usage.
        </p>
      </div>
    </div>
  );
}
