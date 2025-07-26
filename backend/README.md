# ContextCleanse Backend

## Requirements

- **Python 3.11+** (required)
- PostgreSQL 16+ with pgvector extension
- Redis 7+

## Quick Start

### 1. Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements.txt

# Or using the modern approach with pyproject.toml
pip install -e .
```

### 2. Environment Setup

Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

### 3. Database Setup

Ensure PostgreSQL with pgvector extension is running:

```bash
# The application will automatically create tables and enable pgvector
python -m app.main
```

### 4. Run Development Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Architecture

- **FastAPI**: Modern, fast web framework
- **SQLAlchemy**: Database ORM with async support
- **Alembic**: Database migrations
- **Pydantic**: Data validation and serialization
- **scikit-learn**: Machine learning models
- **pgvector**: Vector similarity search

## Development

### Code Quality

```bash
# Format code
black app/

# Sort imports
isort app/

# Run tests
pytest
```

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

## Docker

The backend runs in a Docker container with Python 3.11:

```bash
docker build -t contextcleanse-backend .
docker run -p 8000:8000 contextcleanse-backend
``` 