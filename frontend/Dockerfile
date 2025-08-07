# syntax=docker/dockerfile:1.7-labs
# Frontend Dockerfile for ContextCleanse - Optimized with latest BuildKit features
# Supports Next.js 15.4.5 with advanced optimizations and precompilation

# ==========================================
# Base Stage - Common base for all stages
# ==========================================
FROM node:22-alpine AS base

# Install system dependencies with cache mount and optimization
RUN --mount=type=cache,target=/var/cache/apk,sharing=locked \
    --mount=type=cache,target=/tmp,sharing=locked \
    apk add --no-cache \
    libc6-compat \
    curl \
    dumb-init \
    bash \
    ca-certificates && \
    # Clean up package manager cache
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

# Install production dependencies with advanced caching and optimization
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    --mount=type=cache,target=/app/.next/cache,sharing=locked \
    npm ci --only=production \
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

# Install all dependencies with advanced caching and optimization
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
COPY public ./public
COPY app ./app
COPY lib ./lib
COPY types ./types
COPY components ./components

# Set optimized build environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD=true
ENV NEXT_PRIVATE_STANDALONE=true
ENV NEXT_PRIVATE_DEBUG_CACHE=1

# Create .next directory with proper permissions for caching
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

# Run complete precompilation pipeline with caching
RUN --mount=type=cache,target=/app/.next/cache,sharing=locked \
    --mount=type=cache,target=/root/.npm,sharing=locked \
    # Type checking for early error detection
    npm run type-check && \
    # Linting with auto-fix
    npm run lint:fix && \
    # Optimized production build with all enhancements
    npm run build && \
    # Clean unnecessary files to reduce image size
    rm -rf .next/cache/.tsbuildinfo \
           .next/cache/eslint \
           node_modules/.cache && \
    # Verify build output
    ls -la .next/

# Verify standalone build was created
RUN test -f .next/standalone/server.js || (echo "Standalone build failed!" && exit 1)

# ==========================================
# Development Stage - Optimized for fast development workflow
# ==========================================
FROM base AS development

# Copy package files for dependency installation
COPY package.json package-lock.json* ./

# Install all dependencies with advanced caching
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    --mount=type=cache,target=/app/.next/cache,sharing=locked \
    npm ci \
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

# Copy the complete standalone build from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy essential configuration files
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./

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

# Use dumb-init for proper signal handling and run the optimized server
CMD ["dumb-init", "node", "server.js"]