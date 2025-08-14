# syntax=docker/dockerfile:1.4
# Frontend Dockerfile for ContextCleanse - Optimized with latest BuildKit features
# Supports Next.js 15.4.5 with advanced optimizations and precompilation

# ==========================================
# Base Stage - Common base for all stages
# ==========================================
FROM node:22-alpine AS base

# Install system dependencies (classic builder compatible)
RUN apk add --no-cache \
    libc6-compat \
    curl \
    dumb-init \
    bash \
    ca-certificates && \
    rm -rf /var/cache/apk/* /tmp/*

# Enable Corepack for pnpm/yarn support
RUN corepack enable

# Upgrade npm to exact version for consistency
RUN --mount=type=cache,target=/root/.npm \
    npm install -g npm@latest --no-audit --no-fund

# Create app user for security with proper permissions
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/.next/cache && \
    chown -R nextjs:nodejs /app

# Set working directory
WORKDIR /app

# Set optimal Node.js flags for performance
ENV NODE_OPTIONS="--max-old-space-size=4096 --no-warnings"
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false

# ==========================================
# Dependencies Stage - Optimized dependency caching
# ==========================================
FROM base AS deps

# Copy package files for dependency installation with proper ordering
COPY package.json package-lock.json* ./

# Install production dependencies (include devDependencies for CSS/build tools)
RUN npm ci \
    --ignore-scripts \
    --no-audit \
    --no-fund \
    --prefer-offline && \
    # Clean npm cache to reduce layer size
    npm cache clean --force

# ==========================================
# Build Stage - Advanced Next.js compilation with optimizations
# ==========================================
FROM base AS builder

# Copy package files first for better caching
COPY package.json package-lock.json* ./

# Install all dependencies with advanced caching
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    --mount=type=cache,target=/app/.next/cache,sharing=locked \
    npm ci \
    --ignore-scripts \
    --no-audit \
    --no-fund \
    --prefer-offline

# Copy source code in optimal order (leverage .dockerignore)
COPY next.config.js ./
COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY .eslintrc.json ./
COPY public ./public
COPY app ./app
COPY lib ./lib
COPY types ./types
COPY components ./components

# Set optimized build environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true
ENV NEXT_PRIVATE_DEBUG_CACHE=1

# Create .next directory with proper permissions for caching
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

# Run complete precompilation pipeline with error handling
RUN set -e && \
    echo "🔍 Starting build pipeline..." && \
    npm run type-check && \
    echo "✅ Type check completed" && \
    # Linting with auto-fix
    npm run lint:fix && \
    echo "✅ Linting completed" && \
    # Build without prebuild script to avoid cleaning .next directory
    npx next build && \
    echo "✅ Build completed" && \
    # Clean unnecessary cache files (avoid cache directory itself)
    find .next/cache -name "*.tsbuildinfo" -delete 2>/dev/null || true && \
    find .next/cache -name "eslint" -type d -exec rm -rf {} + 2>/dev/null || true && \
    rm -rf node_modules/.cache && \
    # Verify build output
    echo "📁 Build output:" && \
    ls -la .next/ && \
    echo "📊 Build statistics:" && \
    du -sh .next/* 2>/dev/null || echo "No build output found"

# Debug and verify standalone build
RUN echo "🔍 Build completed! Checking build output..." && \
    ls -la .next/ && \
    echo "📁 Checking for standalone directory..." && \
    ls -la .next/standalone/ 2>/dev/null || echo "⚠️ No standalone directory found" && \
    echo "📁 Checking for static directory..." && \
    ls -la .next/static/ 2>/dev/null || echo "⚠️ No static directory found" && \
    echo "🔧 Next.js config check..." && \
    node -e "console.log('NODE_ENV:', process.env.NODE_ENV); console.log('DOCKER_BUILD:', process.env.DOCKER_BUILD); const config = require('./next.config.js'); console.log('Config output:', config.output);"

# ==========================================
# Development Stage - Optimized for fast development workflow
# ==========================================
FROM base AS development

# Copy package files for dependency installation
COPY package.json package-lock.json* ./

# Install all dependencies
RUN npm ci \
    --ignore-scripts \
    --no-audit \
    --no-fund \
    --prefer-offline

# Copy configuration files first for better caching
COPY next.config.js ./
COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Copy source code
COPY app ./app
COPY lib ./lib
COPY types ./types
COPY components ./components
COPY public ./public

# Set optimized development environment
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PRIVATE_DEBUG_CACHE=1

# Create all necessary Next.js directories with proper permissions
RUN mkdir -p .next/cache .next/server .next/server/pages .next/server/app && \
    chown -R nextjs:nodejs /app && \
    chmod -R 777 /app/.next

# Switch to non-root user for security
USER nextjs

# Expose port for Next.js development server
EXPOSE 3000

# Add optimized health check for development
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use regular dev mode for stable development experience
CMD ["npm", "run", "dev"]

# ==========================================
# Production Stage - Ultra-optimized runtime image
# ==========================================
FROM base AS production

# Set optimized production environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy production dependencies (minimal set from deps stage)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy package.json for npm commands
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copy build output (handle both standalone and regular builds)
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy source directories needed for Next.js runtime (fallback for non-standalone builds)
COPY --from=builder --chown=nextjs:nodejs /app/app ./app
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/components ./components
COPY --from=builder --chown=nextjs:nodejs /app/types ./types

# Copy configuration files needed for Next.js runtime
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./next.config.js
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json

# Copy standalone files if they exist, otherwise use regular build
RUN if [ -d ".next/standalone" ]; then \
      echo "✅ Using standalone build"; \
      cp -r .next/standalone/* . 2>/dev/null || true; \
      # Copy static files to standalone directory
      mkdir -p .next/static && cp -r .next/static .next/standalone/.next/ 2>/dev/null || true; \
    else \
      echo "⚠️ No standalone build found, using regular build"; \
    fi

# Create necessary directories with proper permissions
RUN mkdir -p /app/.next/cache /app/logs && \
    chown -R nextjs:nodejs /app/.next /app/logs

# Switch to non-root user for security
USER nextjs

# Expose port for the Next.js application
EXPOSE 3000

# Add optimized health check for production
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Add labels for better image management
LABEL org.opencontainers.image.title="ContextCleanse Frontend"
LABEL org.opencontainers.image.description="Optimized Next.js frontend with precompilation and caching"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/your-org/contextcleanse"

# Use dumb-init for proper signal handling and run Next.js (standalone or regular)
CMD echo "🚀 Starting Next.js server" && \
    if [ -f "server.js" ]; then \
      echo "✅ Running standalone server"; \
      exec dumb-init node server.js; \
    else \
      echo "⚠️ Running with npm start"; \
      exec dumb-init npm start; \
    fi