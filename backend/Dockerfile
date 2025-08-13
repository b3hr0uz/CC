# syntax=docker/dockerfile:1.7
# Backend Dockerfile for ContextCleanse - Optimized with latest BuildKit features

# ==========================================
# Dependencies Stage - For better caching
# ==========================================
FROM python:3.11-slim AS deps

# Install system dependencies (classic builder compatible)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create app user for security
RUN groupadd --gid 1000 appuser \
    && useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser

# Set working directory
WORKDIR /app

# Copy requirements first for optimal layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ==========================================
# Application Stage - Final optimized image
# ==========================================
FROM python:3.11-slim AS app

# Install only runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create app user (same as deps stage)
RUN groupadd --gid 1000 appuser \
    && useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser

# Set working directory
WORKDIR /app

# Copy Python packages from deps stage
COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# Create directory for data with proper permissions
RUN mkdir -p /app/data/spambase && \
    chown -R appuser:appuser /app

# Copy application code (exclude unnecessary files via .dockerignore)
COPY --chown=appuser:appuser app/ ./app/

# Switch to non-root user for security
USER appuser

# Add health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD ["python", "-c", "import requests; requests.get('http://localhost:8000/health', timeout=10)"]

# Expose port
EXPOSE 8000

# Run the application with production settings
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"] 