# Context Cleanse - Development Guide

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose**: Latest version
- **Git**: For version control
- **Node.js**: 18+ (for local frontend development)
- **Python**: 3.11+ (required for backend development)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd CC
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` file with your OAuth credentials:

```bash
# Required: At least one OAuth provider
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Optional: Microsoft OAuth
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"

# Optional: Apple OAuth (requires Apple Developer Account)
APPLE_CLIENT_ID="your-apple-client-id"
APPLE_TEAM_ID="your-apple-team-id"
APPLE_KEY_ID="your-apple-key-id"
APPLE_PRIVATE_KEY="path-to-apple-private-key.p8"
```

### 3. Start Development Environment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 4. Access Services

- **Frontend Dashboard**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **Database**: localhost:5432
- **Ollama**: http://localhost:11434

## 🏗️ Architecture Overview

```
Context Cleanse/
├── backend/          # FastAPI + ML models + OAuth
├── frontend/         # Next.js 14 dashboard
├── ml/              # ML training & processing
├── database/        # PostgreSQL + pgvector setup
├── docker/          # Container configurations
└── docs/           # Documentation
```

### Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend API** | FastAPI, Python 3.11+ | REST API, ML inference, OAuth |
| **Frontend** | Next.js 14, TypeScript, Tailwind | Admin dashboard, user interface |
| **Database** | PostgreSQL + pgvector | Email storage, embeddings |
| **ML Models** | scikit-learn, ONNX, SBERT | Spam detection, embeddings |
| **LLM** | Ollama (local) | RAG assistant responses |
| **Auth** | OAuth 2.0 | Google, Microsoft, Apple sign-in |
| **Infrastructure** | Docker, Docker Compose | Container orchestration |

## 🔧 Development Workflows

### Backend Development

```bash
# Install dependencies locally
cd backend
pip install -r requirements.txt

# Run FastAPI development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Run tests
pytest

# Database migrations
alembic upgrade head
```

### Frontend Development

```bash
# Install dependencies
cd frontend
npm install

# Run development server
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build
```

### ML Model Development

```bash
# Training environment
cd ml
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Train spam detection model
python scripts/train_spam_model.py

# Generate embeddings
python scripts/generate_embeddings.py
```

## 🔐 OAuth Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`

### Microsoft OAuth Setup

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory → App registrations
3. Create new registration
4. Add redirect URI: `http://localhost:3000/auth/microsoft/callback`
5. Generate client secret

### Apple OAuth Setup

1. [Apple Developer Account](https://developer.apple.com/) required
2. Create new App ID and Service ID
3. Generate private key for Sign in with Apple
4. Configure domain and redirect URL

## 📊 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Spam Detection | <300ms | TBD |
| Spam Accuracy | ≥90% precision/recall | TBD |
| Assistant Response | <2s | TBD |
| Database Queries | <100ms avg | TBD |

## Testing Strategy

### Unit Tests
```bash
# Backend tests
cd backend
pytest tests/ -v

# Frontend tests
cd frontend
npm test
```

### Integration Tests
```bash
# API integration tests
pytest tests/integration/ -v

# End-to-end tests
npm run test:e2e
```

### Performance Tests
```bash
# Load testing with locust
cd tests/performance
locust -f spam_load_test.py
```

## 🚨 Troubleshooting

### Common Issues

**1. OAuth Not Working**
- Check redirect URIs match exactly
- Verify client IDs and secrets
- Check CORS settings

**2. Database Connection Failed**
- Ensure PostgreSQL is running
- Check DATABASE_URL format
- Verify user permissions

**3. ML Models Not Loading**
- Check ML_MODELS_PATH exists
- Verify model files are present
- Check file permissions

**4. Ollama Service Unavailable**
- Ensure Ollama container is running
- Check OLLAMA_BASE_URL
- Pull required models: `docker exec cc-ollama ollama pull llama2:7b`

### Debug Commands

```bash
# Check service status
docker-compose ps

# View service logs
docker-compose logs [service-name]

# Access service shell
docker-compose exec backend bash
docker-compose exec frontend sh

# Database access
docker-compose exec database psql -U cc_user -d context_cleanse

# Reset environment
docker-compose down -v
docker-compose up -d
```

## 📝 API Documentation

### Authentication Endpoints
- `GET /api/v1/auth/providers` - List OAuth providers
- `GET /api/v1/auth/oauth/{provider}` - Initiate OAuth flow
- `POST /api/v1/auth/oauth/{provider}/callback` - Handle callback
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user

### Spam Detection Endpoints
- `POST /api/v1/spam/check` - Check single email
- `POST /api/v1/spam/batch` - Batch email checking
- `GET /api/v1/spam/stats` - Get detection statistics

### Assistant Endpoints
- `POST /api/v1/assistant/ask` - Ask RAG assistant
- `POST /api/v1/assistant/analyze-email` - Analyze email
- `GET /api/v1/assistant/context/stats` - Knowledge base stats

## 🔄 Deployment

### Production Environment

```bash
# Production build
FRONTEND_BUILD_TARGET=production ENVIRONMENT=production docker-compose up -d

# Environment variables
export ENVIRONMENT=production
export DEBUG=false
export SECRET_KEY="your-secure-secret-key"
```

### Health Checks

All services include health check endpoints:
- Backend: `GET /health`
- Frontend: `GET /api/health`
- Database: Built-in PostgreSQL health check
- Ollama: `GET /api/version`

## 📋 Development Checklist

### Before Committing
- [ ] Code passes linting (`npm run lint`, `flake8`)
- [ ] All tests pass
- [ ] Type checking passes
- [ ] Environment variables documented
- [ ] API changes documented

### Before Deploying
- [ ] Production environment variables set
- [ ] Database migrations applied
- [ ] ML models trained and available
- [ ] OAuth providers configured
- [ ] Health checks passing
- [ ] Performance targets met

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Follow development checklist
4. Submit pull request with clear description

## 📞 Support

For development questions and issues:
- Check this documentation first
- Review logs: `docker-compose logs`
- Create issue with reproduction steps
- Contact development team 