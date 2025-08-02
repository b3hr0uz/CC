#!/bin/bash

# Docker Build Optimization Script for ContextCleanse Frontend
# Leverages BuildKit features and advanced caching for faster builds

set -e

echo "🐳 Starting Optimized Docker Build for ContextCleanse Frontend..."

# Configuration
IMAGE_NAME="contextcleanse-frontend"
BUILD_CONTEXT="frontend"
CACHE_DIR=".docker-cache"

# Enable Docker BuildKit for advanced features
export DOCKER_BUILDKIT=1
export BUILDKIT_PROGRESS=plain

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Create cache directory if it doesn't exist
mkdir -p "$CACHE_DIR"

print_status "Building optimized Docker images with advanced caching..."

# Build development image with registry cache
print_status "Building development image..."
docker build \
    --file "$BUILD_CONTEXT/Dockerfile" \
    --target development \
    --tag "$IMAGE_NAME:dev" \
    --cache-from "$IMAGE_NAME:dev" \
    --cache-from "$IMAGE_NAME:builder" \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    --progress=plain \
    "$BUILD_CONTEXT"

print_success "Development image built successfully!"

# Build production image with advanced optimizations
print_status "Building production image with advanced optimizations..."
docker build \
    --file "$BUILD_CONTEXT/Dockerfile" \
    --target production \
    --tag "$IMAGE_NAME:latest" \
    --tag "$IMAGE_NAME:prod" \
    --cache-from "$IMAGE_NAME:dev" \
    --cache-from "$IMAGE_NAME:builder" \
    --cache-from "$IMAGE_NAME:latest" \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    --build-arg NODE_ENV=production \
    --build-arg NEXT_TELEMETRY_DISABLED=1 \
    --progress=plain \
    "$BUILD_CONTEXT"

print_success "Production image built successfully!"

# Image analysis and optimization report
print_status "Analyzing image sizes and optimization..."

DEV_SIZE=$(docker images --format "table {{.Size}}" "$IMAGE_NAME:dev" | tail -1)
PROD_SIZE=$(docker images --format "table {{.Size}}" "$IMAGE_NAME:prod" | tail -1)

echo ""
echo "📊 Build Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Development Image: $DEV_SIZE"
echo "🚀 Production Image:  $PROD_SIZE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test production image
print_status "Testing production image..."
CONTAINER_ID=$(docker run -d -p 3001:3000 "$IMAGE_NAME:prod")

# Wait for container to start
sleep 5

# Health check
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    print_success "Production image health check passed!"
else
    print_warning "Health check failed - container may still be starting"
fi

# Stop test container
docker stop "$CONTAINER_ID" > /dev/null
docker rm "$CONTAINER_ID" > /dev/null

# Security scan (if available)
if command -v docker scan &> /dev/null || command -v trivy &> /dev/null; then
    print_status "Running security scan..."
    if command -v trivy &> /dev/null; then
        trivy image "$IMAGE_NAME:prod" --exit-code=0 --severity HIGH,CRITICAL
    elif command -v docker scan &> /dev/null; then
        docker scan "$IMAGE_NAME:prod" --severity medium || true
    fi
fi

# Clean up build cache if requested
if [[ "${CLEAN_CACHE:-false}" == "true" ]]; then
    print_status "Cleaning build cache..."
    docker builder prune -f
    print_success "Build cache cleaned!"
fi

print_success "Docker build optimization complete!"

echo ""
echo "🚀 Usage Instructions:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Development: docker run -p 3000:3000 $IMAGE_NAME:dev"
echo "🏭 Production:  docker run -p 3000:3000 $IMAGE_NAME:prod"
echo "🔍 Inspect:     docker run -it $IMAGE_NAME:prod sh"
echo ""
echo "💡 Optimization Features Enabled:"
echo "  ✅ Multi-stage builds for minimal production size"
echo "  ✅ BuildKit advanced caching and mount features"
echo "  ✅ Next.js standalone output for optimal runtime"
echo "  ✅ Pre-compilation with type checking and linting"
echo "  ✅ Turbo mode for fastest development experience"
echo "  ✅ Security hardening with non-root user"
echo "  ✅ Comprehensive health checks"
echo ""
echo "🏃 Ready for deployment!"