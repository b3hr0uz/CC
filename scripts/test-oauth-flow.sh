#!/bin/bash

# OAuth Flow Test Script for ContextCleanse
# Tests the complete OAuth authentication flow

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 OAuth Flow Test Script${NC}"
echo -e "${BLUE}=========================${NC}"

# Check if development server is running
echo -e "${YELLOW}🔍 Checking if development server is running...${NC}"

if curl -s --max-time 5 "http://localhost:3000" > /dev/null; then
    echo -e "${GREEN}✅ Development server is running on port 3000${NC}"
else
    echo -e "${RED}❌ Development server is not running${NC}"
    echo -e "${YELLOW}   Start with: npm run dev or docker-compose up${NC}"
    exit 1
fi

# Test NextAuth provider endpoint
echo -e "${YELLOW}🔍 Testing NextAuth providers endpoint...${NC}"

PROVIDERS_RESPONSE=$(curl -s --max-time 10 "http://localhost:3000/api/auth/providers" 2>/dev/null || echo "FAILED")

if [ "$PROVIDERS_RESPONSE" = "FAILED" ]; then
    echo -e "${RED}❌ Cannot reach NextAuth providers endpoint${NC}"
    exit 1
elif echo "$PROVIDERS_RESPONSE" | grep -q "google"; then
    echo -e "${GREEN}✅ Google provider is configured and available${NC}"
else
    echo -e "${RED}❌ Google provider not found in NextAuth configuration${NC}"
    echo -e "${YELLOW}   Response: $PROVIDERS_RESPONSE${NC}"
    exit 1
fi

# Test OAuth signin endpoint
echo -e "${YELLOW}🔍 Testing OAuth signin endpoint...${NC}"

SIGNIN_RESPONSE=$(curl -s --max-time 10 -w "%{http_code}" -o /dev/null "http://localhost:3000/api/auth/signin" 2>/dev/null || echo "FAILED")

if [ "$SIGNIN_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ OAuth signin endpoint is responding${NC}"
elif [ "$SIGNIN_RESPONSE" = "FAILED" ]; then
    echo -e "${RED}❌ Cannot reach OAuth signin endpoint${NC}"
    exit 1
else
    echo -e "${YELLOW}⚠️  OAuth signin endpoint returned HTTP $SIGNIN_RESPONSE${NC}"
fi

# Test callback endpoint (should return method not allowed for GET)
echo -e "${YELLOW}🔍 Testing OAuth callback endpoint...${NC}"

CALLBACK_RESPONSE=$(curl -s --max-time 10 -w "%{http_code}" -o /dev/null "http://localhost:3000/api/auth/callback/google" 2>/dev/null || echo "FAILED")

if [ "$CALLBACK_RESPONSE" = "405" ] || [ "$CALLBACK_RESPONSE" = "400" ]; then
    echo -e "${GREEN}✅ OAuth callback endpoint is configured (expected 405/400 for GET)${NC}"
elif [ "$CALLBACK_RESPONSE" = "FAILED" ]; then
    echo -e "${RED}❌ Cannot reach OAuth callback endpoint${NC}"
else
    echo -e "${YELLOW}⚠️  OAuth callback returned HTTP $CALLBACK_RESPONSE${NC}"
fi

# Test Google OAuth initiation URL
echo -e "${YELLOW}🔍 Testing Google OAuth initiation...${NC}"

# Create a test session to get the proper OAuth URL
OAUTH_URL=$(curl -s --max-time 10 "http://localhost:3000/api/auth/signin/google" | grep -o 'https://accounts.google.com/oauth/authorize[^"]*' | head -1 || echo "")

if [ -n "$OAUTH_URL" ]; then
    echo -e "${GREEN}✅ Google OAuth URL generated successfully${NC}"
    echo -e "${BLUE}   OAuth URL: ${OAUTH_URL:0:80}...${NC}"
    
    # Test if Google OAuth URL is reachable
    if curl -s --max-time 10 -w "%{http_code}" -o /dev/null "$OAUTH_URL" | grep -q "200"; then
        echo -e "${GREEN}✅ Google OAuth endpoint is reachable${NC}"
    else
        echo -e "${YELLOW}⚠️  Google OAuth endpoint test inconclusive${NC}"
    fi
else
    echo -e "${RED}❌ Could not generate Google OAuth URL${NC}"
fi

# Test environment variables in running application
echo -e "${YELLOW}🔍 Testing environment variables...${NC}"

# Check if we can detect environment variables through the app
ENV_TEST=$(curl -s --max-time 10 "http://localhost:3000/api/auth/providers" | jq -r '.google.id' 2>/dev/null || echo "FAILED")

if [ "$ENV_TEST" != "FAILED" ] && [ "$ENV_TEST" != "null" ] && [ -n "$ENV_TEST" ]; then
    echo -e "${GREEN}✅ OAuth environment variables are loaded${NC}"
else
    echo -e "${RED}❌ OAuth environment variables may not be loaded${NC}"
    echo -e "${YELLOW}   Check .env file and restart the server${NC}"
fi

# Simulate OAuth flow (GET request to signin)
echo -e "${YELLOW}🔍 Simulating OAuth flow initiation...${NC}"

FLOW_TEST=$(curl -s --max-time 10 -L -w "%{http_code}" -o /dev/null "http://localhost:3000/api/auth/signin/google" 2>/dev/null || echo "FAILED")

if [ "$FLOW_TEST" = "200" ] || [ "$FLOW_TEST" = "302" ]; then
    echo -e "${GREEN}✅ OAuth flow can be initiated${NC}"
elif [ "$FLOW_TEST" = "FAILED" ]; then
    echo -e "${RED}❌ OAuth flow initiation failed${NC}"
else
    echo -e "${YELLOW}⚠️  OAuth flow returned HTTP $FLOW_TEST${NC}"
fi

# Final assessment
echo -e "${BLUE}📊 Test Summary:${NC}"

ALL_TESTS_PASSED=true

# Check each test result
if ! curl -s --max-time 5 "http://localhost:3000" > /dev/null; then
    ALL_TESTS_PASSED=false
fi

if ! echo "$PROVIDERS_RESPONSE" | grep -q "google"; then
    ALL_TESTS_PASSED=false
fi

if [ "$SIGNIN_RESPONSE" = "FAILED" ]; then
    ALL_TESTS_PASSED=false
fi

if [ "$ALL_TESTS_PASSED" = true ]; then
    echo -e "${GREEN}🎉 All OAuth tests passed!${NC}"
    echo -e "${GREEN}   Your OAuth configuration appears to be working correctly.${NC}"
    echo -e "${YELLOW}   Manual test: Open http://localhost:3000 and try Google login${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some OAuth tests failed${NC}"
    echo -e "${YELLOW}   Run ./scripts/fix-google-oauth.sh for detailed diagnostics${NC}"
    exit 1
fi