# syntax=docker/dockerfile:1.7-labs
# Frontend Dockerfile for ContextCleanse - Optimized with latest BuildKit features

# ==========================================
# Base Stage - Common base for all stages
# ==========================================
FROM node:22-alpine AS base

# Install system dependencies with cache mount
RUN --mount=type=cache,target=/var/cache/apk,sharing=locked \
    apk add --no-cache \
    libc6-compat \
    curl \
    dumb-init

# Enable Corepack for pnpm/yarn support
RUN corepack enable

# Upgrade npm to specific version
RUN npm install -g npm@11.5.2

# Create app user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set working directory
WORKDIR /app

# ==========================================
# Dependencies Stage - For better caching
# ==========================================
FROM base AS deps

# Copy package files for dependency installation
COPY package.json package-lock.json* ./

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production --ignore-scripts

# ==========================================
# Build Stage - Application building
# ==========================================
FROM base AS builder

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies) with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts

# Copy source code (optimized with .dockerignore)  
COPY . .

# Set build environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# ==========================================
# Development Stage - For development use
# ==========================================
FROM base AS development

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts

# Copy source code
COPY . .

# Set development environment
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=10s --retries=3 \
    CMD ["curl", "-f", "http://localhost:3000/api/health", "||", "exit", "1"]

# Run in development mode
CMD ["npm", "run", "dev"]

# ==========================================
# Production Stage - Final optimized image
# ==========================================
FROM base AS production

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy production dependencies from deps stage
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD ["curl", "-f", "http://localhost:3000/api/health", "||", "exit", "1"]

# Run the application
CMD ["dumb-init", "node", "server.js"]