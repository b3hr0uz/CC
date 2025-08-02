# Unified Docker Compose Guide for ContextCleanse

This guide explains the comprehensive, unified Docker Compose configuration that merges the best features from development, staging, and production environments into a single, highly configurable setup.

## 🎯 Overview

The unified `docker-compose.yml` incorporates comprehensive optimizations including:
- Development workflow optimizations with hot-reloading
- Production security and performance configurations
- Enhanced resource management and monitoring
- Environment-specific customization through variables

## 🚀 Quick Start

### Using the Management Script (Recommended)

```bash
# Initialize environment (first time setup)
./scripts/docker-compose-manager.sh init

# Start development environment
./scripts/docker-compose-manager.sh dev

# Start production environment
./scripts/docker-compose-manager.sh prod

# Start staging environment
./scripts/docker-compose-manager.sh staging
```

### Manual Docker Compose Commands

```bash
# Development
ENVIRONMENT=development docker-compose up -d

# Production
ENVIRONMENT=production docker-compose --profile production up -d

# Staging
ENVIRONMENT=staging docker-compose up -d
```

## 🔧 Configuration

### Environment Variables

The configuration uses a comprehensive set of environment variables for maximum flexibility:

#### Core Environment
```bash
ENVIRONMENT=development|staging|production
NODE_ENV=development|production
```

#### Database Configuration
```bash
POSTGRES_DB=contextcleanse
POSTGRES_USER=contextcleanse
POSTGRES_PASSWORD=contextcleanse_password
POSTGRES_MAX_CONNECTIONS=200
POSTGRES_SHARED_BUFFERS=512MB
POSTGRES_EFFECTIVE_CACHE=2GB
```

#### Frontend Configuration
```bash
FRONTEND_PORT=3000
FRONTEND_BUILD_TARGET=development|production
FRONTEND_MEMORY_LIMIT=2G
FRONTEND_READ_ONLY=false|true
```

#### Backend Configuration
```bash
BACKEND_PORT=8000
BACKEND_BUILD_TARGET=development|production
BACKEND_MEMORY_LIMIT=4G
BACKEND_READ_ONLY=false|true
```

See `.env.example` for complete configuration options.

## 🏗️ Architecture

### Service Overview

1. **Database (db)**: PostgreSQL 16 with pgvector extension
2. **Backend**: FastAPI with ML capabilities
3. **Frontend**: Next.js with precompilation optimizations
4. **Redis**: Caching and session storage
5. **Nginx**: Optional reverse proxy (production profile)

### Multi-Environment Support

#### Development Environment
- **Build Target**: development
- **Volumes**: Bind mounts for hot reloading
- **Security**: Disabled (read_only: false)
- **Resources**: Generous limits for development
- **Caching**: Optimized for fast rebuilds

#### Staging Environment
- **Build Target**: production
- **Volumes**: Named volumes
- **Security**: Partially enabled
- **Resources**: Production-like limits
- **Caching**: Full optimization

#### Production Environment
- **Build Target**: production
- **Volumes**: Named volumes with persistence
- **Security**: Full hardening (read_only: true)
- **Resources**: Optimized limits
- **Monitoring**: Enhanced logging and health checks
- **Nginx**: Reverse proxy with SSL support

## 📊 Resource Management

### Automatic Resource Allocation

| Service  | Development | Staging | Production |
|----------|-------------|---------|------------|
| Frontend | 2G / 1 CPU  | 2G / 1 CPU | 1G / 1 CPU |
| Backend  | 4G / 2 CPU  | 4G / 2 CPU | 4G / 2 CPU |
| Database | 2G / 1 CPU  | 2G / 1 CPU | 2G / 1 CPU |
| Redis    | 512M / 0.5  | 512M / 0.5 | 512M / 0.5 |

### Volume Management

- **Database**: Persistent volumes with backup labels
- **Redis**: Configurable persistence
- **Frontend**: Development volumes for hot reloading
- **Logs**: Centralized logging volumes

## 🔐 Security Features

### Production Security Hardening

- **Read-only Filesystems**: Prevents runtime modifications
- **Tmpfs Mounts**: Secure temporary file storage
- **Non-root Users**: All services run as non-root
- **Resource Limits**: Prevents resource exhaustion
- **Network Isolation**: Custom bridge networks

### Development Security

- **Flexible Permissions**: Allows development workflows
- **Debug Access**: Easy container access for debugging
- **Volume Mounts**: Direct file system access

## 🔍 Monitoring & Logging

### Health Checks

All services include comprehensive health checks:
- **Frontend**: HTTP health endpoint
- **Backend**: API health endpoint
- **Database**: PostgreSQL ready check
- **Redis**: Redis ping command

### Logging Configuration

- **JSON Format**: Structured logging for analysis
- **Log Rotation**: Automatic log rotation
- **Size Limits**: Prevents disk space issues
- **Service Labels**: Easy log filtering

### Resource Monitoring

```bash
# Real-time monitoring
./scripts/docker-compose-manager.sh monitor

# Service status
./scripts/docker-compose-manager.sh status

# Health checks
./scripts/docker-compose-manager.sh test
```

## 🛠️ Management Commands

### Using the Docker Compose Manager

```bash
# Environment Management
./scripts/docker-compose-manager.sh dev      # Start development
./scripts/docker-compose-manager.sh prod     # Start production
./scripts/docker-compose-manager.sh staging  # Start staging

# Service Management
./scripts/docker-compose-manager.sh build    # Build all services
./scripts/docker-compose-manager.sh stop     # Stop all services
./scripts/docker-compose-manager.sh restart  # Restart services

# Monitoring
./scripts/docker-compose-manager.sh logs     # View all logs
./scripts/docker-compose-manager.sh logs frontend  # Service-specific logs
./scripts/docker-compose-manager.sh status   # Service status
./scripts/docker-compose-manager.sh monitor  # Real-time monitoring

# Maintenance
./scripts/docker-compose-manager.sh clean    # Clean environment
./scripts/docker-compose-manager.sh backup   # Backup data
./scripts/docker-compose-manager.sh test     # Health checks
```

### Manual Commands

```bash
# Start specific environment
ENVIRONMENT=development docker-compose up -d

# Build with cache optimization
DOCKER_BUILDKIT=1 docker-compose build

# View logs with follow
docker-compose logs -f frontend

# Scale services
docker-compose up -d --scale backend=2

# Resource usage
docker stats
```

## 🚦 Profiles

### Available Profiles

- **Default**: Core services (db, backend, frontend, redis)
- **nginx**: Includes Nginx reverse proxy
- **production**: Full production stack with Nginx

### Using Profiles

```bash
# Start with Nginx
docker-compose --profile nginx up -d

# Start production stack
docker-compose --profile production up -d

# Start specific profile
docker-compose --profile nginx --profile production up -d
```

## 🔧 Customization

### Custom Volume Paths

```bash
# Set custom volume paths
export POSTGRES_DATA_PATH=/custom/postgres
export REDIS_DATA_PATH=/custom/redis
export BACKEND_LOGS_PATH=/custom/logs

docker-compose up -d
```

### Network Configuration

```bash
# Custom network settings
export NETWORK_SUBNET=172.21.0.0/16
export NETWORK_GATEWAY=172.21.0.1

docker-compose up -d
```

### Resource Overrides

```bash
# Custom resource limits
export FRONTEND_MEMORY_LIMIT=4G
export BACKEND_CPU_LIMIT=4
export POSTGRES_MAX_CONNECTIONS=500

docker-compose up -d
```

## 🐛 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and rebuild
docker-compose build --no-cache

# Check BuildKit status
docker buildx version
```

#### Permission Issues
```bash
# Fix volume permissions
sudo chown -R $USER:$USER volumes/
chmod -R 755 volumes/
```

#### Resource Issues
```bash
# Check available resources
docker system df
docker system prune

# Monitor resource usage
docker stats
```

#### Network Issues
```bash
# Recreate network
docker-compose down
docker network prune
docker-compose up -d
```

### Debugging

```bash
# Access container shell
docker-compose exec frontend sh
docker-compose exec backend bash

# Check service logs
docker-compose logs --tail 100 frontend

# Inspect container
docker inspect cc_frontend
```

## 📈 Performance Optimization

### Development Optimization
- **Bind Mounts**: Instant file sync
- **Hot Reloading**: Fast development cycles
- **Cache Volumes**: Optimized dependency caching

### Production Optimization
- **Multi-stage Builds**: Minimal image sizes
- **Resource Limits**: Optimal resource allocation
- **Health Checks**: Fast failure detection
- **Logging**: Structured log analysis

### Database Optimization
- **Connection Pooling**: Efficient connection management
- **Memory Settings**: Optimized for ML workloads
- **Parallel Processing**: Enhanced query performance

## 🔄 Migration Guide

### From Old Setup

1. **Backup Current Data**:
   ```bash
   ./scripts/docker-compose-manager.sh backup
   ```

2. **Stop Old Services**:
   ```bash
   docker-compose -f docker-compose.old.yml down
   ```

3. **Initialize New Setup**:
   ```bash
   ./scripts/docker-compose-manager.sh init
   ```

4. **Start New Environment**:
   ```bash
   ./scripts/docker-compose-manager.sh dev
   ```

### Configuration Migration

1. Copy existing `.env` settings to new `.env` format
2. Update volume paths if customized
3. Verify resource limits for your hardware
4. Test health checks and monitoring

## 📚 Additional Resources

- [Docker Optimization Guide](./docker-optimization-guide.md)
- [Next.js Precompilation Guide](../frontend/README.md)
- [FastAPI Backend Guide](../backend/README.md)
- [Database Setup Guide](./database-setup.md)

## 🎉 Benefits

### Unified Configuration
- ✅ Single docker-compose.yml for all environments
- ✅ Environment-specific optimizations
- ✅ Consistent service definitions

### Enhanced Performance
- ✅ Optimized resource allocation
- ✅ Advanced caching strategies
- ✅ Multi-stage build optimization

### Production Ready
- ✅ Security hardening
- ✅ Comprehensive monitoring
- ✅ Automated health checks

### Developer Experience
- ✅ Hot reloading support
- ✅ Easy environment switching
- ✅ Comprehensive management scripts