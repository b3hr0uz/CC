# Assistant with RAG Pipeline Setup Guide

## Overview

The **Assistant** feature integrates [Ollama](https://www.ollama.com/library/llama3.1:8b) with **Llama 3.1 8B** and a custom **RAG (Retrieval-Augmented Generation) pipeline** to provide context-aware query answering based on your email data.

## 🚀 Quick Start

### 1. Install Ollama

```bash
# Download and install Ollama from https://ollama.com
# Or use package managers:

# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# Download installer from https://ollama.com/download/windows
```

### 2. Pull Llama 3.1 8B Model

```bash
# Pull the 8B parameter model (recommended for local development)
ollama pull llama3.1:8b

# Alternative: Use smaller 7B model for lower resource usage
ollama pull llama3.1:7b
```

### 3. Start Ollama Service

```bash
# Start the Ollama service (runs on localhost:11434)
ollama serve
```

### 4. Verify Installation

```bash
# Check available models
ollama list

# Test the model
ollama run llama3.1:8b "Hello, how are you?"
```

## 📧 RAG Pipeline Features

### Vector Database
- **In-Memory Storage**: Fast access to email embeddings
- **Semantic Search**: Find relevant emails based on meaning, not just keywords
- **Real-time Updates**: Automatically refreshes as new emails arrive
- **Similarity Scoring**: Cosine similarity for precise content matching

### Email Embeddings
- **384-Dimensional Vectors**: Compact yet effective representations
- **Combined Content**: Subject, sender, and body text embedded together
- **Metadata Preservation**: Maintains email metadata for filtering
- **Batch Processing**: Efficient handling of large email volumes

### Context-Aware Responses
- **Relevant Email Retrieval**: Finds 3-5 most relevant emails per query
- **Source Attribution**: Shows which emails informed the response
- **Smart Filtering**: Considers sender reputation and email types
- **Contextual Understanding**: Maintains conversation context

## 🎯 Example Queries

### Email Analysis
```
"Show me all emails from IBM this month"
"What are the main topics in my recent newsletters?"
"Find emails about project deadlines"
"Summarize my conversations with john@company.com"
```

### Pattern Recognition
```
"What time of day do I receive the most important emails?"
"Which senders email me most frequently?"
"Show me trends in my email classification accuracy"
"Find emails similar to this spam example"
```

### Content Search
```
"Find emails mentioning budget planning"
"Show me all calendar invitations from last week"
"What are the most common spam topics I receive?"
"Find emails with attachments from trusted senders"
```

### Business Intelligence
```
"Analyze my email patterns for productivity insights"
"What's the ratio of work vs personal emails?"
"Show me email volume trends over the past quarter"
"Identify my most active email conversations"
```

## ⚙️ Configuration Options

### Ollama Settings
- **Model**: llama3.1:8b (default), llama3.1:7b, llama3.1:70b
- **Temperature**: 0.7 (balance between creativity and consistency)
- **Max Tokens**: 500 (response length limit)
- **Top-P**: 0.9 (nucleus sampling for better responses)

### RAG Parameters
- **Top-K Results**: 5 (number of relevant emails to retrieve)
- **Similarity Threshold**: 0.1 (minimum relevance score)
- **Auto-Refresh**: 5 minutes (embedding update frequency)
- **Vector Dimensions**: 384 (embedding size)

### Performance Tuning
```javascript
// In assistant/page.tsx
const RAG_CONFIG = {
  topK: 5,              // Increase for more context
  threshold: 0.1,       // Lower for more results
  maxEmailsToEmbed: 200, // Limit for memory usage
  refreshInterval: 300000 // 5 minutes in milliseconds
};
```

## 🔧 API Endpoints

### Chat Interface
```typescript
POST /api/assistant/chat
{
  "message": "Your question here",
  "context": "Optional email context",
  "model": "llama3.1:8b"
}
```

### Embedding Management
```typescript
POST /api/assistant/embeddings
{
  "emails": [...], // Array of email objects
  "regenerate": false
}
```

### Vector Search
```typescript
PUT /api/assistant/embeddings
{
  "query": "Search query",
  "embeddings": [...], // Email embeddings array
  "topK": 5,
  "threshold": 0.1
}
```

### Database Operations
```typescript
// Add documents
POST /api/assistant/vector-db
{
  "documents": [...],
  "clear_existing": false
}

// Search database
PUT /api/assistant/vector-db
{
  "query_embedding": [...],
  "top_k": 5,
  "threshold": 0.1,
  "filters": { "classification": "ham" }
}
```

## 🛠️ Production Recommendations

### Vector Database Upgrade
```bash
# For production, consider these vector databases:

# 1. PostgreSQL with pgvector
docker run --name postgres-vector \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=contextcleanse \
  -p 5432:5432 \
  -d ankane/pgvector

# 2. Pinecone (cloud-based)
pip install pinecone-client

# 3. Weaviate (self-hosted)
docker run -p 8080:8080 cr.weaviate.io/semitechnologies/weaviate:1.22.1

# 4. Chroma (lightweight)
pip install chromadb
```

### Embedding Model Upgrade
```python
# Replace simple hash-based embeddings with proper models:

# 1. Sentence Transformers
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode(texts)

# 2. OpenAI Embeddings
import openai
response = openai.Embedding.create(
    model="text-embedding-ada-002",
    input=text
)

# 3. Hugging Face Transformers
from transformers import AutoTokenizer, AutoModel
tokenizer = AutoTokenizer.from_pretrained('bert-base-uncased')
model = AutoModel.from_pretrained('bert-base-uncased')
```

### Scaling Considerations
- **Memory Usage**: Current implementation stores all embeddings in memory
- **Batch Processing**: Process large email volumes in chunks
- **Caching**: Implement Redis caching for frequently accessed embeddings
- **Load Balancing**: Distribute Ollama requests across multiple instances
- **Database Indexing**: Use approximate nearest neighbor algorithms (HNSW, IVF)

## 🔍 Troubleshooting

### Common Issues

#### Ollama Not Starting
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Kill existing processes
pkill ollama

# Restart service
ollama serve
```

#### Model Not Found
```bash
# List available models
ollama list

# Pull missing model
ollama pull llama3.1:8b

# Check model status
ollama show llama3.1:8b
```

#### Memory Issues
```bash
# Monitor memory usage
ollama ps

# Use smaller model
ollama pull llama3.1:7b

# Limit concurrent requests
export OLLAMA_MAX_LOADED_MODELS=1
```

#### Slow Responses
- Reduce `topK` value (fewer emails to process)
- Increase `threshold` (more selective results)
- Use GPU acceleration if available
- Consider quantized models for faster inference

## 📊 Performance Metrics

### Typical Performance
- **Email Embedding**: ~10ms per email
- **Semantic Search**: ~50ms for 200 emails
- **Ollama Response**: 2-10 seconds (depending on model and query complexity)
- **Total Response Time**: 3-15 seconds end-to-end

### Resource Requirements
- **Memory**: 4-8GB for llama3.1:8b model
- **CPU**: Multi-core recommended for concurrent users
- **Storage**: ~5GB for model files
- **Network**: Minimal (local inference)

## 🎨 UI Features

### Interactive Chat Interface
- **Real-time Responses**: Streaming chat experience
- **Source Attribution**: Click to view source emails
- **Message History**: Persistent conversation context
- **Auto-scroll**: Smooth message navigation

### Settings Panel
- **Ollama Status**: Real-time service monitoring
- **RAG Statistics**: Embedding count and freshness
- **Auto-refresh**: Configurable update intervals
- **Manual Controls**: Force refresh and status checks

### Responsive Design
- **Mobile Friendly**: Optimized for all screen sizes
- **Dark Theme**: Consistent with app styling
- **Loading States**: Clear progress indicators
- **Error Handling**: Graceful degradation when services unavailable

## 🔒 Security Considerations

### Local Processing
- **No Data Leaves Your System**: All processing happens locally
- **Privacy Preserved**: Email content never sent to external APIs
- **Secure Communication**: All requests through authenticated endpoints
- **Session Management**: Proper authentication required for all features

### Data Protection
- **Temporary Storage**: Embeddings stored in memory only
- **No Persistent Logs**: Query history not permanently stored
- **Encrypted Transit**: HTTPS for all internal communications
- **Access Control**: User-specific data isolation

## 📈 Future Enhancements

### Planned Features
- **Multi-modal RAG**: Support for email attachments and images
- **Advanced Filtering**: Date ranges, sender groups, topic clustering
- **Email Summarization**: Automatic digest generation
- **Conversation Threading**: Contextual email chain analysis
- **Performance Analytics**: Usage statistics and optimization insights

### Integration Possibilities
- **Calendar Integration**: Analyze meeting invitations and schedule conflicts
- **Contact Intelligence**: Relationship mapping and communication patterns
- **Workflow Automation**: AI-powered email routing and responses
- **Business Intelligence**: Advanced analytics and reporting dashboards

## 📚 Additional Resources

- **Ollama Documentation**: https://ollama.com/docs
- **Llama 3.1 Model Card**: https://ollama.com/library/llama3.1:8b
- **RAG Pipeline Best Practices**: https://docs.llamaindex.ai/en/stable/
- **Vector Database Comparison**: https://www.pinecone.io/learn/vector-database/
- **Semantic Search Guide**: https://huggingface.co/blog/getting-started-with-embeddings