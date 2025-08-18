# Backend Dockerfile for ContextCleanse - Standard Docker Build

# ==========================================
# Single Stage Build - Simplified for standard Docker
# ==========================================
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

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

# Create directory for data with proper permissions
RUN mkdir -p /app/data/spambase /app/logs && \
    chown -R appuser:appuser /app

# Copy application code
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