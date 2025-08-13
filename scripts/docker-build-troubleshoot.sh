#!/bin/bash

# Docker Build Troubleshooting Script for ContextCleanse
# This script addresses common Docker build issues including EOF errors and resource exhaustion

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 Docker Build Troubleshooter for ContextCleanse${NC}"

# Function to check Docker daemon status
check_docker_daemon() {
    echo -e "${YELLOW}📋 Checking Docker daemon status...${NC}"
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker daemon is not running or accessible${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker daemon is running${NC}"
}

# Function to check system resources
check_system_resources() {
    echo -e "${YELLOW}📋 Checking system resources...${NC}"
    
    # Check available disk space
    DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -gt 85 ]; then
        echo -e "${RED}⚠️  Warning: Disk usage is ${DISK_USAGE}% - consider freeing space${NC}"
    else
        echo -e "${GREEN}✅ Disk space OK (${DISK_USAGE}% used)${NC}"
    fi
    
    # Check available memory
    if command -v free >/dev/null 2>&1; then
        MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", ($3/$2) * 100}')
        echo -e "${GREEN}📊 Memory usage: ${MEM_USAGE}%${NC}"
        if [ "$MEM_USAGE" -gt 80 ]; then
            echo -e "${YELLOW}⚠️  High memory usage detected - build may be slower${NC}"
        fi
    fi
}

# Function to optimize Docker settings for build
optimize_docker_settings() {
    echo -e "${YELLOW}🔧 Optimizing Docker settings for build...${NC}"
    
    # Set BuildKit variables for better performance
    export DOCKER_BUILDKIT=1
    export BUILDKIT_PROGRESS=plain
    export BUILDKIT_TTY_LOG_LINES=10
    
    # Set Docker Compose variables
    export COMPOSE_DOCKER_CLI_BUILD=1
    export DOCKER_CLI_HINTS=false
    
    echo -e "${GREEN}✅ Docker environment optimized${NC}"
}

# Function to clean Docker system aggressively
aggressive_docker_clean() {
    echo -e "${YELLOW}🧹 Performing aggressive Docker cleanup...${NC}"
    
    # Stop all containers
    if [ "$(docker ps -q)" ]; then
        echo "Stopping all running containers..."
        docker stop $(docker ps -q) 2>/dev/null || true
    fi
    
    # Remove all containers
    if [ "$(docker ps -aq)" ]; then
        echo "Removing all containers..."
        docker rm $(docker ps -aq) 2>/dev/null || true
    fi
    
    # Remove all images except base images
    echo "Removing dangling images..."
    docker image prune -f 2>/dev/null || true
    
    # Remove all build cache
    echo "Removing all build cache..."
    docker builder prune -af 2>/dev/null || true
    
    # Remove all volumes (be careful with this)
    echo "Removing unused volumes..."
    docker volume prune -f 2>/dev/null || true
    
    # Remove all networks
    echo "Removing unused networks..."
    docker network prune -f 2>/dev/null || true
    
    # System prune with force
    echo "Final system prune..."
    docker system prune -af --volumes 2>/dev/null || true
    
    echo -e "${GREEN}✅ Aggressive cleanup completed${NC}"
}

# Function to restart Docker daemon (Windows/WSL specific)
restart_docker_wsl() {
    echo -e "${YELLOW}🔄 Restarting Docker in WSL environment...${NC}"
    
    if command -v wsl.exe >/dev/null 2>&1; then
        echo "Detected WSL environment"
        echo "Restarting Docker Desktop..."
        
        # Kill Docker Desktop processes
        taskkill.exe //F //IM "Docker Desktop.exe" 2>/dev/null || true
        taskkill.exe //F //IM "com.docker.service" 2>/dev/null || true
        
        sleep 5
        
        # Start Docker Desktop
        cmd.exe /c "start \"\" \"C:\Program Files\Docker\Docker\Docker Desktop.exe\"" 2>/dev/null || true
        
        echo "Waiting for Docker to restart..."
        sleep 30
        
        # Wait for Docker to be ready
        for i in {1..60}; do
            if docker info >/dev/null 2>&1; then
                echo -e "${GREEN}✅ Docker restarted successfully${NC}"
                return 0
            fi
            echo "Waiting for Docker... ($i/60)"
            sleep 2
        done
        
        echo -e "${RED}❌ Docker failed to restart properly${NC}"
        return 1
    fi
}

# Function to build with retry mechanism
build_with_retry() {
    local max_retries=3
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        echo -e "${YELLOW}🏗️  Attempt $((retry_count + 1))/$max_retries: Starting Docker build...${NC}"
        
        if docker compose build --no-cache --parallel; then
            echo -e "${GREEN}✅ Build completed successfully!${NC}"
            return 0
        else
            echo -e "${RED}❌ Build failed on attempt $((retry_count + 1))${NC}"
            retry_count=$((retry_count + 1))
            
            if [ $retry_count -lt $max_retries ]; then
                echo -e "${YELLOW}🔄 Cleaning up before retry...${NC}"
                docker compose down --remove-orphans 2>/dev/null || true
                docker system prune -f 2>/dev/null || true
                
                echo -e "${YELLOW}⏳ Waiting 10 seconds before retry...${NC}"
                sleep 10
            fi
        fi
    done
    
    echo -e "${RED}❌ Build failed after $max_retries attempts${NC}"
    return 1
}

# Function to start services with health checks
start_with_health_checks() {
    echo -e "${YELLOW}🚀 Starting services with health checks...${NC}"
    
    # Start services and wait for health checks
    if docker compose up --wait --remove-orphans; then
        echo -e "${GREEN}✅ All services started successfully!${NC}"
        
        # Show service status
        echo -e "${YELLOW}📊 Service Status:${NC}"
        docker compose ps
        
        return 0
    else
        echo -e "${RED}❌ Failed to start services${NC}"
        echo -e "${YELLOW}📋 Service logs:${NC}"
        docker compose logs --tail=50
        return 1
    fi
}

# Main execution
main() {
    echo -e "${GREEN}Starting Docker build troubleshooting process...${NC}"
    
    # Check prerequisites
    check_docker_daemon
    check_system_resources
    
    # Optimize settings
    optimize_docker_settings
    
    # Parse command line arguments
    case "${1:-build}" in
        "clean")
            aggressive_docker_clean
            ;;
        "restart")
            restart_docker_wsl
            ;;
        "build")
            # Stop existing services
            echo -e "${YELLOW}🛑 Stopping existing services...${NC}"
            docker compose down --remove-orphans 2>/dev/null || true
            
            # Clean system
            aggressive_docker_clean
            
            # Build with retry
            if build_with_retry; then
                start_with_health_checks
            else
                echo -e "${RED}❌ Build process failed completely${NC}"
                echo -e "${YELLOW}💡 Try running: $0 restart${NC}"
                exit 1
            fi
            ;;
        "full")
            restart_docker_wsl
            aggressive_docker_clean
            build_with_retry
            start_with_health_checks
            ;;
        *)
            echo "Usage: $0 [build|clean|restart|full]"
            echo "  build   - Clean and build (default)"
            echo "  clean   - Aggressive cleanup only"
            echo "  restart - Restart Docker daemon"
            echo "  full    - Complete restart, clean, and build"
            ;;
    esac
}

# Run main function with all arguments
main "$@"