# Docker Optimization Guide for ContextCleanse

This guide explains the comprehensive Docker optimizations implemented for ContextCleanse frontend, focusing on performance, security, and build efficiency.

## 🚀 Quick Start

### Development
```bash
# Use optimized development setup
docker-compose up --build

# Or use Turbo mode with optimized build script
./scripts/docker-build-optimized.sh
docker run -p 3000:3000 contextcleanse-frontend:dev
```

### Production
```bash
# Build and run production-optimized containers
FRONTEND_BUILD_TARGET=production NODE_ENV=production docker-compose up --build -d

# Or use the optimization script
./scripts/docker-build-optimized.sh
docker run -p 3000:3000 contextcleanse-frontend:prod
```

## 🏗️ Architecture Overview

The Dockerfile uses a **multi-stage build approach** with four optimized stages:

1. **Base Stage**: Common foundation with Node.js 22 Alpine
2. **Dependencies Stage**: Optimized dependency installation with caching
3. **Builder Stage**: Advanced Next.js compilation with precompilation pipeline
4. **Development Stage**: Fast development experience with Turbo mode
5. **Production Stage**: Ultra-optimized runtime image

## ⚡ Key Optimizations

### Build Performance

- **BuildKit Advanced Caching**: Leverages `--mount=type=cache` for npm and Next.js cache
- **Layer Optimization**: Strategic COPY order to maximize cache hits
- **Parallel Processing**: Multi-stage builds allow parallel dependency and build operations
- **Filesystem Cache**: Persistent webpack cache at `.next/cache/webpack`

### Runtime Performance

- **Standalone Output**: Next.js standalone mode for minimal runtime dependencies
- **Precompilation Pipeline**: Type checking, linting, and building in single stage
- **Turbo Mode**: Development uses `npm run dev:turbo` for fastest HMR
- **Server Warmup**: Automatic API warmup for faster initial requests

### Security Hardening

- **Non-root User**: All processes run as `nextjs:nodejs` (UID 1001:GID 1001)
- **Read-only Filesystem**: Production containers use read-only root filesystem
- **Minimal Base**: Alpine Linux reduces attack surface
- **Security Labels**: OCI-compliant image labels for better management

### Size Optimization

- **Multi-stage Builds**: Only production dependencies in final image
- **Selective Copying**: `.dockerignore` excludes unnecessary files
- **Cache Cleanup**: Automatic cleanup of build artifacts
- **Minimal Runtime**: Standalone mode eliminates unnecessary Node.js modules

## 📊 Performance Metrics

Expected improvements with optimized Dockerfile:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Build Time | ~5-8 min | ~2-4 min | ~50-60% faster |
| Image Size (Dev) | ~800MB | ~600MB | ~25% smaller |
| Image Size (Prod) | ~400MB | ~250MB | ~37% smaller |
| Cold Start | ~3-5s | ~1-2s | ~60% faster |
| Cache Hit Rate | ~30% | ~80% | ~167% better |

## 🔧 Configuration Details

### Environment Variables

#### Base Configuration
```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=4096 --no-warnings"
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false
```

#### Build Optimization
```dockerfile
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true
ENV NEXT_PRIVATE_STANDALONE=true
ENV NEXT_PRIVATE_DEBUG_CACHE=1
```

### Advanced Caching Strategy

The Dockerfile implements multiple caching layers:

1. **System Package Cache**: `--mount=type=cache,target=/var/cache/apk`
2. **NPM Cache**: `--mount=type=cache,target=/root/.npm`
3. **Next.js Cache**: `--mount=type=cache,target=/app/.next/cache`
4. **Build Cache**: Persistent across builds with `sharing=locked`

### Health Checks

Optimized health checks for different environments:

#### Development
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1
```

#### Production
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1
```

## 🐛 Troubleshooting

### Common Issues

#### Build Cache Issues
```bash
# Clear all Docker build cache
docker builder prune -af

# Clear Next.js cache specifically
docker run --rm -v $(pwd)/frontend:/app -w /app node:22-alpine rm -rf .next/cache
```

#### Permission Issues
```bash
# Fix ownership issues in development
docker-compose exec frontend chown -R nextjs:nodejs /app/.next
```

#### Memory Issues
```bash
# Increase Docker Desktop memory limit to 4GB+
# Or set memory limits in docker-compose.yml
```

### Performance Debugging

#### Analyze Build Performance
```bash
# Use the optimization script with analysis
./scripts/docker-build-optimized.sh

# Manual build with timing
time docker build --progress=plain -t test-build frontend/
```

#### Monitor Runtime Performance
```bash
# Container resource usage
docker stats contextcleanse-frontend

# Next.js bundle analysis
docker run --rm contextcleanse-frontend:latest npm run build:analyze
```

## 🚀 Advanced Usage

### Custom Build Arguments

```bash
# Build with custom optimization flags
docker build \
  --build-arg NODE_ENV=production \
  --build-arg NEXT_TELEMETRY_DISABLED=1 \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  --target production \
  -t contextcleanse-frontend:custom \
  frontend/
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Build optimized Docker image
  run: |
    docker build \
      --cache-from ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest \
      --build-arg BUILDKIT_INLINE_CACHE=1 \
      --tag ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
      --tag ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest \
      frontend/
```

### Production Deployment

```bash
# Using docker-compose for production
FRONTEND_BUILD_TARGET=production ENVIRONMENT=production docker-compose up -d

# With custom resource limits
docker run -d \
  --name contextcleanse-frontend \
  --memory=1g \
  --cpus=1 \
  --restart=unless-stopped \
  -p 3000:3000 \
  contextcleanse-frontend:prod
```

## 📈 Monitoring and Maintenance

### Health Monitoring
```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' contextcleanse-frontend

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' contextcleanse-frontend
```

### Performance Monitoring
```bash
# Monitor resource usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

# Check build cache effectiveness
docker system df
```

### Updates and Maintenance
```bash
# Update base images
docker build --no-cache --pull -t contextcleanse-frontend:latest frontend/

# Clean up unused resources
docker system prune -af
docker volume prune -f
```

## 🔗 Related Resources

- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [Docker BuildKit Documentation](https://docs.docker.com/build/buildkit/)
- [Multi-stage Build Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Alpine Linux Security](https://alpinelinux.org/posts/Alpine-Linux-has-switched-to-OpenSSL.html)

## 📝 Version History

- **v1.0.0**: Initial optimized Dockerfile with multi-stage builds
- **v1.1.0**: Added BuildKit advanced caching and security hardening
- **v1.2.0**: Integrated Next.js 15.4.5 optimizations and precompilation pipeline
- **v1.3.0**: Added Turbo mode, server warmup, and comprehensive monitoring