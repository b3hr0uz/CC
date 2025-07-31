#!/bin/bash

# ContextCleanse LLM Assistant Startup Script
# This script helps set up and start the LLM Assistant feature with Ollama

set -e

echo "🤖 ContextCleanse LLM Assistant Setup"
echo "===================================="

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed. Installing Ollama..."
    
    # Detect OS and install accordingly
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -fsSL https://ollama.com/install.sh | sh
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install ollama
        else
            echo "Please install Homebrew first: https://brew.sh"
            exit 1
        fi
    else
        echo "Please manually install Ollama from: https://ollama.com"
        exit 1
    fi
else
    echo "✅ Ollama is already installed"
fi

# Check if Ollama service is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "🚀 Starting Ollama service..."
    ollama serve &
    
    # Wait for service to start
    echo "⏳ Waiting for Ollama service to start..."
    sleep 5
    
    # Check if service started successfully
    for i in {1..10}; do
        if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
            echo "✅ Ollama service is running"
            break
        fi
        echo "   Attempt $i/10..."
        sleep 2
    done
else
    echo "✅ Ollama service is already running"
fi

# Check if llama3.1:8b model is available
echo "🔍 Checking for Llama 3.1 8B model..."
if ollama list | grep -q "llama3.1.*8b"; then
    echo "✅ Llama 3.1 8B model is available"
else
    echo "📥 Downloading Llama 3.1 8B model (this may take a few minutes)..."
    ollama pull llama3.1:8b
    echo "✅ Llama 3.1 8B model downloaded successfully"
fi

# Test the model
echo "🧪 Testing Llama 3.1 8B model..."
if echo "Hello, how are you?" | ollama run llama3.1:8b > /dev/null 2>&1; then
    echo "✅ Model is working correctly"
else
    echo "❌ Model test failed. Please check your installation."
    exit 1
fi

# Display status
echo ""
echo "🎉 LLM Assistant is ready!"
echo ""
echo "📊 Status:"
echo "   • Ollama service: Running on http://localhost:11434"
echo "   • Model: llama3.1:8b"
echo "   • API endpoint: http://localhost:3000/api/assistant/chat"
echo ""
echo "🚀 Next steps:"
echo "   1. Start your ContextCleanse application: npm run dev"
echo "   2. Navigate to the Assistant page in the sidebar"
echo "   3. Ask questions about your emails!"
echo ""
echo "💡 Example queries:"
echo "   • 'Show me emails from last week'"
echo "   • 'What are the main topics in my newsletters?'"
echo "   • 'Find emails about meetings'"
echo ""
echo "📚 For detailed documentation, see: docs/assistant-rag-setup.md"