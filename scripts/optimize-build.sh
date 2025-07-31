#!/bin/bash

# ContextCleanse Build Optimization Script
# Leverages latest BuildKit features for optimal Docker builds

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 ContextCleanse Build Optimization Script${NC}"
echo -e "${BLUE}===========================================${NC}"

# Verify npm version
echo -e "${BLUE}📦 npm version: $(npm --version)${NC}"

# Check if BuildKit is enabled
if [ "$DOCKER_BUILDKIT" != "1" ]; then
    echo -e "${YELLOW}⚠️  Enabling BuildKit...${NC}"
    export DOCKER_BUILDKIT=1
    export COMPOSE_DOCKER_CLI_BUILD=1
fi

# Check if buildx is available
if ! docker buildx version > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker Buildx is not available. Please install Docker Desktop or Docker CE with Buildx.${NC}"
    exit 1
fi

# Create and use a buildx builder with advanced features
BUILDER_NAME="contextcleanse-builder"

echo -e "${YELLOW}🔧 Setting up optimized builder...${NC}"

# Remove existing builder if it exists
docker buildx rm "$BUILDER_NAME" > /dev/null 2>&1 || true

# Create new builder with advanced cache and build features
docker buildx create \
    --name "$BUILDER_NAME" \
    --driver docker-container \
    --driver-opt network=host \
    --driver-opt image=moby/buildkit:latest \
    --use \
    --bootstrap

echo -e "${GREEN}✅ Builder '$BUILDER_NAME' created and activated${NC}"

# Display builder information
echo -e "${BLUE}📊 Builder Information:${NC}"
docker buildx inspect

# Function to build with advanced caching
build_with_cache() {
    local service=$1
    local target=${2:-""}
    
    echo -e "${YELLOW}🏗️  Building $service with advanced caching...${NC}"
    
    local cache_from_args=""
    local cache_to_args=""
    
    # Setup cache arguments
    if [ -n "$REGISTRY" ]; then
        cache_from_args="--cache-from type=registry,ref=$REGISTRY/$service:buildcache"
        cache_to_args="--cache-to type=registry,ref=$REGISTRY/$service:buildcache,mode=max"
    else
        cache_from_args="--cache-from type=local,src=/tmp/.buildx-cache/$service"
        cache_to_args="--cache-to type=local,dest=/tmp/.buildx-cache/$service,mode=max"
    fi
    
    # Add target if specified
    local target_arg=""
    if [ -n "$target" ]; then
        target_arg="--target $target"
    fi
    
    # Build with all optimizations
    docker buildx build \
        --builder "$BUILDER_NAME" \
        --platform linux/amd64 \
        $target_arg \
        $cache_from_args \
        $cache_to_args \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg GIT_COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')" \
        --tag "contextcleanse/$service:latest" \
        --load \
        "./$service"
    
    echo -e "${GREEN}✅ $service build completed${NC}"
}

# Main build logic
case "${1:-all}" in
    "backend")
        build_with_cache "backend" "app"
        ;;
    "frontend")
        build_with_cache "frontend" "development"
        ;;
    "production")
        echo -e "${YELLOW}🚀 Building production images...${NC}"
        build_with_cache "backend" "app"
        build_with_cache "frontend" "production"
        ;;
    "bake")
        echo -e "${YELLOW}🧁 Using Docker Bake for advanced build...${NC}"
        if [ -f "docker-bake.hcl" ]; then
            docker buildx bake \
                --builder "$BUILDER_NAME" \
                --set "*.platform=linux/amd64" \
                --set "*.args.BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
                --set "*.args.GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
        else
            echo -e "${RED}❌ docker-bake.hcl not found${NC}"
            exit 1
        fi
        ;;
    "multiplatform")
        echo -e "${YELLOW}🌐 Building multi-platform images...${NC}"
        if [ -f "docker-bake.hcl" ]; then
            docker buildx bake \
                --builder "$BUILDER_NAME" \
                multiplatform \
                --set "*.args.BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
                --set "*.args.GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
        else
            echo -e "${RED}❌ docker-bake.hcl not found for multiplatform build${NC}"
            exit 1
        fi
        ;;
    "all"|*)
        echo -e "${YELLOW}🏗️  Building all services...${NC}"
        build_with_cache "backend" "app"
        build_with_cache "frontend" "development"
        ;;
esac

# Display build summary
echo -e "${BLUE}📋 Build Summary:${NC}"
docker images --filter "reference=contextcleanse/*:latest" --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

# Show cache usage if available
echo -e "${BLUE}💾 Build Cache Usage:${NC}"
docker system df

echo -e "${GREEN}🎉 Build optimization complete!${NC}"
echo -e "${YELLOW}💡 Tips:${NC}"
echo -e "  • Use 'docker-compose up' to start services"
echo -e "  • Use './build-scripts/optimize-build.sh bake' for advanced builds"
echo -e "  • Use './build-scripts/optimize-build.sh multiplatform' for ARM64 support"