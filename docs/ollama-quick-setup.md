# Ollama Quick Setup for ContextCleanse

## Overview
The ContextCleanse AI Assistant uses Ollama to provide intelligent responses using local LLM models. This guide will help you set up Ollama with the llama3:8b model.

## Installation

### Windows (WSL/Linux)
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
ollama serve &

# Install llama3:8b model (recommended)
ollama pull llama3:8b

# Alternative: Install llama3:latest
ollama pull llama3:latest
```

### Windows (Native)
1. Download Ollama installer from [https://ollama.com/download/windows](https://ollama.com/download/windows)
2. Run the installer
3. Open Command Prompt or PowerShell as Administrator
4. Start Ollama service:
   ```cmd
   ollama serve
   ```
5. Install the model:
   ```cmd
   ollama pull llama3:8b
   ```

### macOS
```bash
# Using Homebrew
brew install ollama

# Or download from https://ollama.com/download/macos

# Start Ollama service
ollama serve &

# Install llama3:8b model
ollama pull llama3:8b
```

## Verification

1. Check if Ollama is running:
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. Test the model:
   ```bash
   ollama run llama3:8b "Hello, how are you?"
   ```

## ContextCleanse Integration

Once Ollama is running with the llama3:8b model:

1. Navigate to the Assistant page in ContextCleanse
2. The system will automatically detect Ollama
3. You should see a green status indicator
4. Start chatting with your AI assistant!

## Troubleshooting

### Ollama Not Detected
- Ensure Ollama service is running: `ollama serve`
- Check if port 11434 is accessible: `netstat -an | grep 11434`
- Restart the ContextCleanse frontend container

### Model Not Available
- Install the model: `ollama pull llama3:8b`
- List available models: `ollama list`
- Try alternative models: `llama3:latest`, `llama2:latest`

### Performance Issues
- The llama3:8b model requires ~4.7GB of RAM
- For lower-end systems, try: `ollama pull llama2:latest` (~3.8GB)
- Monitor system resources during AI responses

## System Requirements

- **Minimum RAM**: 8GB (4GB available for model)
- **Recommended RAM**: 16GB or more
- **Storage**: ~5GB for llama3:8b model
- **Network**: Internet connection for initial model download

## Docker Environment

If running ContextCleanse in Docker and Ollama on the host:

1. Set environment variable in Docker Compose:
   ```yaml
   environment:
     - NEXT_PUBLIC_OLLAMA_HOST=host.docker.internal:11434
   ```

2. Or for Linux Docker:
   ```yaml
   environment:
     - NEXT_PUBLIC_OLLAMA_HOST=172.17.0.1:11434
   ```

## Need Help?

1. Check the ContextCleanse Assistant page for the built-in setup guide
2. Visit [https://ollama.com/docs](https://ollama.com/docs) for detailed Ollama documentation
3. Ensure your system meets the minimum requirements

---

**Note**: The AI Assistant will work with fallback responses based on your email data even without Ollama, but Ollama provides much better conversational AI capabilities.
