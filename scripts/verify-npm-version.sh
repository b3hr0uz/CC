#!/bin/bash

# npm Version Verification Script for ContextCleanse
# Verifies npm 11.5.2 is correctly installed in both local and Docker environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 npm Version Verification for ContextCleanse${NC}"
echo -e "${BLUE}==============================================${NC}"

# Check local npm version
echo -e "${YELLOW}📦 Checking local npm version...${NC}"
LOCAL_NPM_VERSION=$(npm --version)
echo -e "Local npm version: ${GREEN}$LOCAL_NPM_VERSION${NC}"

if [ "$LOCAL_NPM_VERSION" = "11.5.2" ]; then
    echo -e "${GREEN}✅ Local npm version is correct (11.5.2)${NC}"
else
    echo -e "${RED}❌ Local npm version mismatch. Expected: 11.5.2, Got: $LOCAL_NPM_VERSION${NC}"
    echo -e "${YELLOW}💡 Run: npm install -g npm@11.5.2${NC}"
fi

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed or not in PATH${NC}"
    exit 1
fi

# Test npm version in Docker container
echo -e "${YELLOW}🐳 Checking npm version in Docker container...${NC}"

# Create a temporary Dockerfile for testing
cat > Dockerfile.npm-test <<EOF
FROM node:22-alpine

# Install system dependencies
RUN apk add --no-cache curl

# Enable Corepack for pnpm/yarn support
RUN corepack enable

# Upgrade npm to specific version
RUN npm install -g npm@11.5.2

# Verify npm version
RUN echo "npm version in container: \$(npm --version)"
EOF

# Build a minimal test container
docker build \
    -t contextcleanse/npm-test:latest \
    -f Dockerfile.npm-test \
    .

# Get npm version from container
DOCKER_NPM_VERSION=$(docker run --rm contextcleanse/npm-test:latest npm --version 2>/dev/null || echo "ERROR")

if [ "$DOCKER_NPM_VERSION" = "11.5.2" ]; then
    echo -e "Docker npm version: ${GREEN}$DOCKER_NPM_VERSION${NC}"
    echo -e "${GREEN}✅ Docker npm version is correct (11.5.2)${NC}"
else
    echo -e "Docker npm version: ${RED}$DOCKER_NPM_VERSION${NC}"
    echo -e "${RED}❌ Docker npm version mismatch. Expected: 11.5.2, Got: $DOCKER_NPM_VERSION${NC}"
fi

# Clean up test image and temporary Dockerfile
docker rmi contextcleanse/npm-test:latest &>/dev/null || true
rm -f Dockerfile.npm-test

# Check package.json engines field
echo -e "${YELLOW}📄 Checking package.json engines field...${NC}"
if [ -f "frontend/package.json" ]; then
    if grep -q '"npm": ">=11.5.2"' frontend/package.json; then
        echo -e "${GREEN}✅ package.json engines field is correctly set${NC}"
    else
        echo -e "${RED}❌ package.json engines field missing or incorrect${NC}"
        echo -e "${YELLOW}💡 Add engines field to frontend/package.json:${NC}"
        echo -e '  "engines": {'
        echo -e '    "node": ">=18.0.0",'
        echo -e '    "npm": ">=11.5.2"'
        echo -e '  },'
    fi
else
    echo -e "${RED}❌ frontend/package.json not found${NC}"
fi

# Summary
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "Local npm: ${GREEN}$LOCAL_NPM_VERSION${NC}"
echo -e "Docker npm: ${GREEN}$DOCKER_NPM_VERSION${NC}"

if [ "$LOCAL_NPM_VERSION" = "11.5.2" ] && [ "$DOCKER_NPM_VERSION" = "11.5.2" ]; then
    echo -e "${GREEN}🎉 All npm versions are correctly set to 11.5.2!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some npm versions need attention${NC}"
    exit 1
fi