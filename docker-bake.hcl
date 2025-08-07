# Docker Bake file for ContextCleanse - Advanced BuildKit build orchestration
# Run with: docker buildx bake

# Define variables for reuse
variable "REGISTRY" {
  default = "contextcleanse"
}

variable "VERSION" {
  default = "latest"
}

variable "BUILD_DATE" {
  default = ""
}

variable "GIT_COMMIT" {
  default = ""
}

# Default group - builds both frontend and backend
group "default" {
  targets = ["backend", "frontend"]
}

# Production group - optimized for production deployment
group "production" {
  targets = ["backend-prod", "frontend-prod"]
}

# Development group - optimized for local development
group "development" {
  targets = ["backend-dev", "frontend-dev"]
}

# Backend target configurations
target "backend" {
  context = "./backend"
  dockerfile = "Dockerfile"
  target = "app"
  
  tags = [
    "${REGISTRY}/backend:${VERSION}",
    "${REGISTRY}/backend:latest"
  ]
  
  cache-from = [
    "type=local,src=/tmp/.buildx-cache/backend",
    "type=registry,ref=${REGISTRY}/backend:buildcache"
  ]
  
  cache-to = [
    "type=local,dest=/tmp/.buildx-cache/backend,mode=max",
    "type=registry,ref=${REGISTRY}/backend:buildcache,mode=max"
  ]
  
  args = {
    BUILDKIT_INLINE_CACHE = "1"
    BUILD_DATE = "${BUILD_DATE}"
    GIT_COMMIT = "${GIT_COMMIT}"
  }
  
  labels = {
    "org.opencontainers.image.title" = "ContextCleanse Backend"
    "org.opencontainers.image.description" = "FastAPI backend with ML models and RL optimization"
    "org.opencontainers.image.version" = "${VERSION}"
    "org.opencontainers.image.created" = "${BUILD_DATE}"
    "org.opencontainers.image.revision" = "${GIT_COMMIT}"
    "org.opencontainers.image.source" = "https://github.com/contextcleanse/contextcleanse"
  }
}

# Backend development target
target "backend-dev" {
  inherits = ["backend"]
  target = "app"
  tags = ["${REGISTRY}/backend:dev"]
  
  args = {
    NODE_ENV = "development"
  }
}

# Backend production target
target "backend-prod" {
  inherits = ["backend"]
  target = "app"
  tags = [
    "${REGISTRY}/backend:prod",
    "${REGISTRY}/backend:${VERSION}"
  ]

  args = {
    NODE_ENV = "production"
  }
}

# Frontend target configurations
target "frontend" {
  context = "./frontend"
  dockerfile = "Dockerfile"
  target = "development"
  
  tags = [
    "${REGISTRY}/frontend:${VERSION}",
    "${REGISTRY}/frontend:latest"
  ]
  
  cache-from = [
    "type=local,src=/tmp/.buildx-cache/frontend",
    "type=registry,ref=${REGISTRY}/frontend:buildcache"
  ]
  
  cache-to = [
    "type=local,dest=/tmp/.buildx-cache/frontend,mode=max",
    "type=registry,ref=${REGISTRY}/frontend:buildcache,mode=max"
  ]
  
  args = {
    BUILDKIT_INLINE_CACHE = "1"
    BUILD_DATE = "${BUILD_DATE}"
    GIT_COMMIT = "${GIT_COMMIT}"
  }
  
  labels = {
    "org.opencontainers.image.title" = "ContextCleanse Frontend"
    "org.opencontainers.image.description" = "Next.js frontend with Assistant and training interface"
    "org.opencontainers.image.version" = "${VERSION}"
    "org.opencontainers.image.created" = "${BUILD_DATE}"
    "org.opencontainers.image.revision" = "${GIT_COMMIT}"
    "org.opencontainers.image.source" = "https://github.com/contextcleanse/contextcleanse"
  }
}

# Frontend development target
target "frontend-dev" {
  inherits = ["frontend"]
  target = "development"
  tags = ["${REGISTRY}/frontend:dev"]
  
  args = {
    NODE_ENV = "development"
  }
}

# Frontend production target
target "frontend-prod" {
  inherits = ["frontend"]
  target = "production"
  tags = [
    "${REGISTRY}/frontend:prod",
    "${REGISTRY}/frontend:${VERSION}"
  ]
  
  args = {
    NODE_ENV = "production"
  }
}

# Multi-platform targets
target "backend-multiplatform" {
  inherits = ["backend"]
  platforms = [
    "linux/amd64",
    "linux/arm64"
  ]
}

target "frontend-multiplatform" {
  inherits = ["frontend"]
  platforms = [
    "linux/amd64",
    "linux/arm64"
  ]
}

# All multi-platform group
group "multiplatform" {
  targets = ["backend-multiplatform", "frontend-multiplatform"]
}