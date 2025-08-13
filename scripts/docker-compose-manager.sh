#!/bin/bash

# Docker Compose Environment Manager for ContextCleanse
# Simplifies management of different deployment scenarios

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_banner() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                 ContextCleanse Docker Manager                ║"
    echo "║            Unified Environment Management Tool               ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

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

show_help() {
    print_banner
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "COMMANDS:"
    echo "  dev        - Start development environment"
    echo "  prod       - Start production environment"
    echo "  staging    - Start staging environment"
    echo "  build      - Build all services"
    echo "  stop       - Stop all services"
    echo "  restart    - Restart all services"
    echo "  logs       - Show service logs"
    echo "  status     - Show service status"
    echo "  clean      - Clean up containers and volumes"
    echo "  init       - Initialize environment (first-time setup)"
    echo "  backup     - Backup database and volumes"
    echo "  restore    - Restore from backup"
    echo "  monitor    - Monitor resource usage"
    echo "  test       - Run health checks"
    echo ""
    echo "OPTIONS:"
    echo "  -f, --force       - Force operation (skip confirmations)"
    echo "  -v, --verbose     - Verbose output"
    echo "  -h, --help        - Show this help message"
    echo ""
    echo "EXAMPLES:"
    echo "  $0 dev                    # Start development environment"
    echo "  $0 prod --force           # Start production without confirmation"
    echo "  $0 logs frontend          # Show frontend service logs"
    echo "  $0 build --verbose        # Build with verbose output"
    echo ""
}

check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

setup_environment() {
    local env_type=$1
    print_status "Setting up $env_type environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            print_status "Created .env from .env.example"
        else
            print_warning ".env.example not found, creating minimal .env"
            echo "ENVIRONMENT=$env_type" > .env
        fi
    fi
    
    # Update environment in .env file
    if grep -q "^ENVIRONMENT=" .env; then
        sed -i "s/^ENVIRONMENT=.*/ENVIRONMENT=$env_type/" .env
    else
        echo "ENVIRONMENT=$env_type" >> .env
    fi
    
    # Set NODE_ENV based on environment
    local node_env="development"
    case $env_type in
        production|prod)
            node_env="production"
            ;;
        staging)
            node_env="production"
            ;;
        development|dev)
            node_env="development"
            ;;
    esac
    
    if grep -q "^NODE_ENV=" .env; then
        sed -i "s/^NODE_ENV=.*/NODE_ENV=$node_env/" .env
    else
        echo "NODE_ENV=$node_env" >> .env
    fi
    
    print_success "Environment configured for $env_type"
}

create_directories() {
    print_status "Creating required directories..."
    
    # Create volume directories
    mkdir -p volumes/postgres volumes/redis volumes/backend/logs
    mkdir -p nginx/logs nginx/ssl
    
    # Set proper permissions
    chmod 755 volumes/postgres volumes/redis volumes/backend/logs
    chmod 755 nginx/logs nginx/ssl
    
    print_success "Directories created successfully"
}

start_development() {
    print_status "Starting development environment..."
    
    setup_environment "development"
    create_directories
    
    # Set development-specific environment variables
    export FRONTEND_BUILD_TARGET=development
    export BACKEND_BUILD_TARGET=development
    export FRONTEND_VOLUME_TYPE=bind
    export FRONTEND_READ_ONLY=false
    export BACKEND_READ_ONLY=false
    
    # Prefer BuildKit + Bake, fallback to classic compose build
    export DOCKER_BUILDKIT=1
    export COMPOSE_BAKE=true

    if ! docker compose up -d --build; then
        print_warning "Bake build failed. Falling back to classic docker compose build..."
        export DOCKER_BUILDKIT=0
        export COMPOSE_BAKE=false
        docker compose up -d --build
    fi
    
    print_success "Development environment started!"
    print_status "Services available at:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend:  http://localhost:8000"
    echo "  Database: localhost:5432"
}

start_production() {
    print_status "Starting production environment..."
    
    if [ "$FORCE" != "true" ]; then
        print_warning "This will start production environment. Continue? (y/N)"
        read -r response
        case "$response" in
            [yY][eE][sS]|[yY]) 
                ;;
            *) 
                print_status "Operation cancelled"
                exit 0
                ;;
        esac
    fi
    
    setup_environment "production"
    create_directories
    
    # Set production-specific environment variables
    export FRONTEND_BUILD_TARGET=production
    export BACKEND_BUILD_TARGET=production
    export FRONTEND_VOLUME_TYPE=volume
    export FRONTEND_READ_ONLY=true
    export BACKEND_READ_ONLY=true
    
    # Start with nginx proxy (prefer Bake, fallback to classic)
    export DOCKER_BUILDKIT=1
    export COMPOSE_BAKE=true

    if ! docker compose --profile production up -d --build; then
        print_warning "Bake build failed. Falling back to classic docker compose build..."
        export DOCKER_BUILDKIT=0
        export COMPOSE_BAKE=false
        docker compose --profile production up -d --build
    fi
    
    print_success "Production environment started!"
    print_status "Services available at:"
    echo "  Frontend: http://localhost (via nginx)"
    echo "  Direct:   http://localhost:3000"
    echo "  Backend:  http://localhost:8000"
}

start_staging() {
    print_status "Starting staging environment..."
    
    setup_environment "staging"
    create_directories
    
    # Set staging-specific environment variables (production-like but with development features)
    export FRONTEND_BUILD_TARGET=production
    export BACKEND_BUILD_TARGET=production
    export FRONTEND_VOLUME_TYPE=volume
    export FRONTEND_READ_ONLY=false
    export BACKEND_READ_ONLY=false
    
    export DOCKER_BUILDKIT=1
    export COMPOSE_BAKE=true
    if ! docker compose up -d --build; then
        print_warning "Bake build failed. Falling back to classic docker compose build..."
        export DOCKER_BUILDKIT=0
        export COMPOSE_BAKE=false
        docker compose up -d --build
    fi
    
    print_success "Staging environment started!"
}

build_services() {
    print_status "Building all services..."

    local builder_mode=${BUILDER_MODE:-bake}

    if [ "$builder_mode" = "classic" ]; then
        export DOCKER_BUILDKIT=0
        export COMPOSE_BAKE=false
        if [ "$VERBOSE" = "true" ]; then
            docker compose build --progress=plain
        else
            docker compose build
        fi
    else
        # Default: BuildKit + Bake
        export DOCKER_BUILDKIT=1
        export COMPOSE_BAKE=true
        if [ "$VERBOSE" = "true" ]; then
            if ! docker compose build --progress=plain; then
                print_warning "Bake build failed. Falling back to classic docker compose build..."
                export DOCKER_BUILDKIT=0
                export COMPOSE_BAKE=false
                docker compose build --progress=plain
            fi
        else
            if ! docker compose build; then
                print_warning "Bake build failed. Falling back to classic docker compose build..."
                export DOCKER_BUILDKIT=0
                export COMPOSE_BAKE=false
                docker compose build
            fi
        fi
    fi

    print_success "All services built successfully!"
}

show_logs() {
    local service=$1
    if [ -n "$service" ]; then
        print_status "Showing logs for $service..."
        docker compose logs -f "$service"
    else
        print_status "Showing logs for all services..."
        docker compose logs -f
    fi
}

show_status() {
    print_status "Service status:"
    docker compose ps
    
    print_status "\nResource usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

stop_services() {
    print_status "Stopping all services..."
    docker compose down
    print_success "All services stopped"
}

restart_services() {
    print_status "Restarting all services..."
    docker compose restart
    print_success "All services restarted"
}

clean_environment() {
    print_warning "This will remove all containers, networks, and optionally volumes"
    
    if [ "$FORCE" != "true" ]; then
        print_warning "Continue? (y/N)"
        read -r response
        case "$response" in
            [yY][eE][sS]|[yY]) 
                ;;
            *) 
                print_status "Operation cancelled"
                exit 0
                ;;
        esac
    fi
    
    print_status "Removing containers and networks..."
    docker compose down --remove-orphans
    
    print_warning "Remove volumes as well? (y/N)"
    read -r response
    case "$response" in
        [yY][eE][sS]|[yY]) 
            docker compose down -v
            print_status "Volumes removed"
            ;;
    esac
    
    # Clean up Docker system
    docker system prune -f
    
    print_success "Environment cleaned successfully"
}

backup_data() {
    print_status "Creating backup..."
    
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup database
    if docker compose ps db | grep -q "Up"; then
        print_status "Backing up database..."
        docker compose exec db pg_dump -U contextcleanse contextcleanse > "$backup_dir/database.sql"
    fi
    
    # Backup volumes
    print_status "Backing up volumes..."
    cp -r volumes "$backup_dir/" 2>/dev/null || true
    
    print_success "Backup created at $backup_dir"
}

monitor_resources() {
    print_status "Monitoring resource usage (Press Ctrl+C to stop)..."
    
    while true; do
        clear
        print_banner
        echo "Real-time Resource Monitoring"
        echo "=============================="
        docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
        sleep 5
    done
}

run_health_checks() {
    print_status "Running health checks..."
    
    local services=("frontend" "backend" "db" "redis")
    local failed=0
    
    for service in "${services[@]}"; do
        print_status "Checking $service..."
        
        if docker compose ps "$service" | grep -q "Up"; then
            local health=$(docker compose ps "$service" --format json | jq -r '.[0].Health // "unknown"')
            case $health in
                "healthy")
                    print_success "$service is healthy"
                    ;;
                "unhealthy")
                    print_error "$service is unhealthy"
                    ((failed++))
                    ;;
                *)
                    print_warning "$service health status unknown"
                    ;;
            esac
        else
            print_error "$service is not running"
            ((failed++))
        fi
    done
    
    if [ $failed -eq 0 ]; then
        print_success "All health checks passed!"
    else
        print_error "$failed service(s) failed health checks"
        exit 1
    fi
}

initialize_environment() {
    print_status "Initializing ContextCleanse environment..."
    
    check_prerequisites
    create_directories
    
    # Copy environment file if it doesn't exist
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            print_success "Created .env from .env.example"
            print_warning "Please edit .env file with your configuration"
        else
            print_error ".env.example not found"
            exit 1
        fi
    fi
    
    # Build initial images
    build_services
    
    print_success "Environment initialized successfully!"
    print_status "Next steps:"
    echo "  1. Edit .env file with your configuration"
    echo "  2. Run '$0 dev' to start development environment"
    echo "  3. Run '$0 prod' to start production environment"
}

# Parse command line arguments
FORCE=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--force)
            FORCE=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            COMMAND=$1
            SERVICE=$2
            shift
            ;;
    esac
done

# Main command processing
case "${COMMAND:-help}" in
    dev|development)
        check_prerequisites
        start_development
        ;;
    prod|production)
        check_prerequisites
        start_production
        ;;
    staging)
        check_prerequisites
        start_staging
        ;;
    build)
        check_prerequisites
        build_services
        ;;
    logs)
        show_logs "$SERVICE"
        ;;
    status)
        show_status
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    clean)
        clean_environment
        ;;
    backup)
        backup_data
        ;;
    monitor)
        monitor_resources
        ;;
    test)
        run_health_checks
        ;;
    init|initialize)
        initialize_environment
        ;;
    help|*)
        show_help
        ;;
esac