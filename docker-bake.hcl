variable "REGISTRY" {
  default = "contextcleanse"
}

variable "VERSION" {
  default = "latest"
}

group "default" {
  targets = ["backend", "frontend"]
}

target "backend" {
  context = "./backend"
  dockerfile = "Dockerfile"
  target = "app"
  
  tags = [
    "${REGISTRY}/backend:${VERSION}",
    "${REGISTRY}/backend:latest"
  ]
  
  cache-from = [
    "type=local,src=/tmp/.buildx-cache/backend"
  ]
  
  cache-to = [
    "type=local,dest=/tmp/.buildx-cache/backend,mode=max"
  ]
  
  args = {
    BUILDKIT_INLINE_CACHE = "1"
  }
}

target "frontend" {
  context = "./frontend"
  dockerfile = "Dockerfile"
  target = "development"
  
  tags = [
    "${REGISTRY}/frontend:${VERSION}",
    "${REGISTRY}/frontend:latest"
  ]
  
  cache-from = [
    "type=local,src=/tmp/.buildx-cache/frontend"
  ]
  
  cache-to = [
    "type=local,dest=/tmp/.buildx-cache/frontend,mode=max"
  ]
  
  args = {
    BUILDKIT_INLINE_CACHE = "1"
  }
}
