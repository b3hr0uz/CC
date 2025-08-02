#!/bin/bash

# ContextCleanse Docker Compose Migration Helper
# Helps migrate from old separate files to unified configuration

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
    echo "║            ContextCleanse Migration Helper                   ║"
    echo "║         Unified Docker Compose Configuration                 ║"
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
    echo "This script helps you migrate to the new unified Docker Compose configuration."
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "COMMANDS:"
    echo "  migrate    - Migrate from old configuration to new unified setup"
    echo "  backup     - Backup current configuration before migration"
    echo "  cleanup    - Clean up old configuration files (after migration)"
    echo "  validate   - Validate new configuration"
    echo "  compare    - Compare old vs new configuration"
    echo "  help       - Show this help message"
    echo ""
}

backup_old_config() {
    print_status "Backing up current configuration..."
    
    local backup_dir="backups/docker-compose-backup-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup existing docker-compose files
    [ -f docker-compose.yml ] && cp docker-compose.yml "$backup_dir/"
    [ -f docker-compose.override.yml ] && cp docker-compose.override.yml "$backup_dir/"
    [ -f .env ] && cp .env "$backup_dir/"
    
    print_success "Configuration backed up to $backup_dir"
}

validate_new_config() {
    print_status "Validating new Docker Compose configuration..."
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose not found"
        return 1
    fi
    
    # Validate configuration
    if docker-compose config --quiet; then
        print_success "Docker Compose configuration is valid"
    else
        print_error "Docker Compose configuration has errors"
        return 1
    fi
    
    # Check for required files
    local required_files=("docker-compose.yml" ".env.example" "scripts/docker-compose-manager.sh")
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            print_success "Found required file: $file"
        else
            print_error "Missing required file: $file"
            return 1
        fi
    done
    
    return 0
}

show_migration_summary() {
    print_banner
    echo "Migration Summary"
    echo "=================="
    echo ""
    echo "✅ IMPROVEMENTS:"
    echo "   • Unified configuration for all environments"
    echo "   • Enhanced security with read-only filesystems"
    echo "   • Optimized resource management"
    echo "   • Comprehensive health checks"
    echo "   • Advanced caching and build optimization"
    echo "   • Production-ready with Nginx support"
    echo "   • Centralized logging and monitoring"
    echo ""
    echo "🔧 NEW FEATURES:"
    echo "   • Environment-specific build targets"
    echo "   • Configurable resource limits"
    echo "   • Volume path customization"
    echo "   • Service profiles (nginx, production)"
    echo "   • Enhanced development workflow"
    echo ""
    echo "📊 CONFIGURATION:"
    echo "   • All settings via environment variables"
    echo "   • Comprehensive .env.example provided"
    echo "   • Backward compatible defaults"
    echo ""
    echo "🛠️  MANAGEMENT:"
    echo "   • New docker-compose-manager.sh script"
    echo "   • Easy environment switching"
    echo "   • Built-in backup and monitoring"
    echo "   • Health check validation"
    echo ""
}

compare_configurations() {
    print_status "Comparing old vs new configuration..."
    
    echo ""
    echo "OLD SETUP (Multiple Files):"
    echo "──────────────────────────────"
    echo "• docker-compose.yml        - Base configuration"
    echo "• docker-compose.override.yml - Development overrides"

    echo ""
    echo "NEW SETUP (Unified):"
    echo "──────────────────────────────"
    echo "• docker-compose.yml        - Unified configuration for all environments"
    echo "• .env                      - Environment-specific variables"
    echo "• scripts/docker-compose-manager.sh - Management automation"
    echo ""
    
    # Compare service counts
    local old_services=0
    local new_services=0
    
    if [ -f docker-compose.override.yml ]; then
        old_services=$(grep -c "^  [a-zA-Z]" docker-compose.override.yml || echo 0)
    fi
    
    new_services=$(grep -c "^  [a-zA-Z]" docker-compose.yml || echo 0)
    
    echo "SERVICE COMPARISON:"
    echo "• Old configuration: $old_services services"
    echo "• New configuration: $new_services services"
    echo ""
}

migrate_configuration() {
    print_status "Starting migration to unified Docker Compose configuration..."
    
    # Check if already migrated
    if grep -q "Unified Docker Compose Configuration" docker-compose.yml 2>/dev/null; then
        print_warning "Already using unified configuration"
        return 0
    fi
    
    # Backup current configuration
    backup_old_config
    
    # Show what will be migrated
    compare_configurations
    
    print_warning "This will replace your current docker-compose.yml file."
    print_warning "Continue with migration? (y/N)"
    read -r response
    case "$response" in
        [yY][eE][sS]|[yY]) 
            ;;
        *) 
            print_status "Migration cancelled"
            return 0
            ;;
    esac
    
    # The new configuration should already be in place if this script exists
    if validate_new_config; then
        print_success "Migration validation successful!"
        
        # Create .env if it doesn't exist
        if [ ! -f .env ] && [ -f .env.example ]; then
            cp .env.example .env
            print_success "Created .env from .env.example"
            print_warning "Please review and update .env with your specific configuration"
        fi
        
        show_migration_summary
        
        print_status ""
        print_status "NEXT STEPS:"
        print_status "1. Review and update .env file with your configuration"
        print_status "2. Run: ./scripts/docker-compose-manager.sh init"
        print_status "3. Start development: ./scripts/docker-compose-manager.sh dev"
        print_status "4. Or start production: ./scripts/docker-compose-manager.sh prod"
        print_status ""
        print_status "For help: ./scripts/docker-compose-manager.sh help"
        
    else
        print_error "Migration validation failed"
        return 1
    fi
}

cleanup_old_files() {
    print_status "Cleaning up old configuration files..."
    
    print_warning "This will remove old Docker Compose configuration files."
    print_warning "Make sure you have successfully migrated and tested the new setup."
    print_warning ""
    print_warning "Files to be removed:"
    [ -f docker-compose.override.yml ] && echo "  - docker-compose.override.yml"

    print_warning ""
    print_warning "Continue? (y/N)"
    read -r response
    case "$response" in
        [yY][eE][sS]|[yY]) 
            ;;
        *) 
            print_status "Cleanup cancelled"
            return 0
            ;;
    esac
    
    local removed=0
    if [ -f docker-compose.override.yml ]; then
        rm docker-compose.override.yml
        print_success "Removed docker-compose.override.yml"
        ((removed++))
    fi
    

    
    if [ $removed -eq 0 ]; then
        print_status "No old configuration files found"
    else
        print_success "Cleaned up $removed old configuration files"
    fi
}

# Main command processing
case "${1:-help}" in
    migrate)
        migrate_configuration
        ;;
    backup)
        backup_old_config
        ;;
    cleanup)
        cleanup_old_files
        ;;
    validate)
        validate_new_config
        ;;
    compare)
        compare_configurations
        ;;
    help|*)
        show_help
        ;;
esac