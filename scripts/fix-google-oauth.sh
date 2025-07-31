#!/bin/bash

# Google OAuth Fix Script for ContextCleanse
# Diagnoses and fixes common Google OAuth authentication issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Google OAuth Diagnostic & Fix Script${NC}"
echo -e "${BLUE}=====================================Ν${NC}"

# Check if required environment files exist
echo -e "${YELLOW}📂 Checking environment files...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    exit 1
else
    echo -e "${GREEN}✅ .env file found${NC}"
fi

if [ ! -f "frontend/.env.local" ]; then
    echo -e "${RED}❌ frontend/.env.local file not found${NC}"
else
    echo -e "${GREEN}✅ frontend/.env.local file found${NC}"
fi

# Check environment variables
echo -e "${YELLOW}🔍 Checking OAuth environment variables...${NC}"

check_env_var() {
    local var_name=$1
    local file_path=$2
    
    if grep -q "^${var_name}=" "$file_path" 2>/dev/null; then
        local value=$(grep "^${var_name}=" "$file_path" | cut -d'=' -f2)
        if [ -n "$value" ] && [ "$value" != "your-value-here" ]; then
            echo -e "${GREEN}✅ $var_name is set in $file_path${NC}"
            return 0
        else
            echo -e "${RED}❌ $var_name is empty or placeholder in $file_path${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ $var_name not found in $file_path${NC}"
        return 1
    fi
}

# Check required variables
VARS_OK=true

if ! check_env_var "AUTH_GOOGLE_ID" ".env"; then
    VARS_OK=false
fi

if ! check_env_var "AUTH_GOOGLE_SECRET" ".env"; then
    VARS_OK=false
fi

if ! check_env_var "NEXTAUTH_URL" ".env"; then
    VARS_OK=false
fi

if ! check_env_var "NEXTAUTH_SECRET" ".env"; then
    VARS_OK=false
fi

# Validate Google OAuth credentials format
echo -e "${YELLOW}🔍 Validating Google OAuth credentials...${NC}"

if grep -q "^AUTH_GOOGLE_ID=" ".env"; then
    GOOGLE_ID=$(grep "^AUTH_GOOGLE_ID=" ".env" | cut -d'=' -f2)
    if [[ $GOOGLE_ID =~ ^[0-9]+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com$ ]]; then
        echo -e "${GREEN}✅ Google Client ID format is valid${NC}"
    else
        echo -e "${RED}❌ Google Client ID format is invalid${NC}"
        echo -e "${YELLOW}   Expected format: xxxxxxxxx-xxxxxxxx.apps.googleusercontent.com${NC}"
        VARS_OK=false
    fi
fi

if grep -q "^AUTH_GOOGLE_SECRET=" ".env"; then
    GOOGLE_SECRET=$(grep "^AUTH_GOOGLE_SECRET=" ".env" | cut -d'=' -f2)
    if [[ $GOOGLE_SECRET =~ ^GOCSPX- ]]; then
        echo -e "${GREEN}✅ Google Client Secret format is valid${NC}"
    else
        echo -e "${RED}❌ Google Client Secret format is invalid${NC}"
        echo -e "${YELLOW}   Expected format: GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx${NC}"
        VARS_OK=false
    fi
fi

# Check NextAuth configuration
echo -e "${YELLOW}🔍 Checking NextAuth configuration...${NC}"

if command -v node &> /dev/null; then
    echo -e "${GREEN}✅ Node.js is available${NC}"
    
    # Check if NextAuth config file exists
    if [ -f "frontend/lib/auth.ts" ]; then
        echo -e "${GREEN}✅ NextAuth config file exists${NC}"
        
        # Check if Google provider is configured
        if grep -q "GoogleProvider" "frontend/lib/auth.ts"; then
            echo -e "${GREEN}✅ Google provider is configured${NC}"
        else
            echo -e "${RED}❌ Google provider not found in NextAuth config${NC}"
            VARS_OK=false
        fi
    else
        echo -e "${RED}❌ NextAuth config file not found${NC}"
        VARS_OK=false
    fi
else
    echo -e "${YELLOW}⚠️  Node.js not available for detailed checks${NC}"
fi

# Check network connectivity
echo -e "${YELLOW}🌐 Checking network connectivity...${NC}"

if curl -s --max-time 5 https://accounts.google.com > /dev/null; then
    echo -e "${GREEN}✅ Can reach Google OAuth servers${NC}"
else
    echo -e "${RED}❌ Cannot reach Google OAuth servers${NC}"
    echo -e "${YELLOW}   Check your internet connection${NC}"
fi

# Check Docker environment
echo -e "${YELLOW}🐳 Checking Docker environment...${NC}"

if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker is available${NC}"
    
    # Check if containers are running
    if docker-compose ps | grep -q "cc_frontend"; then
        echo -e "${GREEN}✅ Frontend container is running${NC}"
        
        # Check environment variables in container
        if docker-compose exec -T frontend printenv | grep -q "AUTH_GOOGLE_ID"; then
            echo -e "${GREEN}✅ OAuth environment variables are available in container${NC}"
        else
            echo -e "${RED}❌ OAuth environment variables not available in container${NC}"
            echo -e "${YELLOW}   Try: docker-compose down && docker-compose up --build${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Frontend container is not running${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Docker not available${NC}"
fi

# Provide recommendations
echo -e "${BLUE}📋 Recommendations:${NC}"

if [ "$VARS_OK" = false ]; then
    echo -e "${RED}❌ Environment variables need attention${NC}"
    echo -e "${YELLOW}   1. Ensure all OAuth variables are set correctly${NC}"
    echo -e "${YELLOW}   2. Check Google Cloud Console configuration${NC}"
    echo -e "${YELLOW}   3. Verify redirect URIs match your domain${NC}"
else
    echo -e "${GREEN}✅ Environment variables look good${NC}"
fi

echo -e "${YELLOW}🔧 Next Steps:${NC}"
echo -e "   1. Restart the development server: ${BLUE}npm run dev${NC}"
echo -e "   2. Check browser console for additional errors"
echo -e "   3. Verify Google Cloud Console settings:"
echo -e "      - Authorized JavaScript origins: ${BLUE}http://localhost:3000${NC}"
echo -e "      - Authorized redirect URIs: ${BLUE}http://localhost:3000/api/auth/callback/google${NC}"
echo -e "   4. If issues persist, check the OAuth troubleshooting guide"

# Test OAuth callback URL
echo -e "${YELLOW}🔗 Testing OAuth callback URL...${NC}"

if curl -s --max-time 5 "http://localhost:3000/api/auth/callback/google" | grep -q "error"; then
    echo -e "${YELLOW}⚠️  OAuth callback endpoint responded with error (expected without auth)${NC}"
elif curl -s --max-time 5 "http://localhost:3000/api/auth/callback/google" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ OAuth callback endpoint is reachable${NC}"
else
    echo -e "${RED}❌ Cannot reach OAuth callback endpoint${NC}"
    echo -e "${YELLOW}   Make sure the development server is running on port 3000${NC}"
fi

if [ "$VARS_OK" = true ]; then
    echo -e "${GREEN}🎉 OAuth configuration appears to be correct!${NC}"
    echo -e "${GREEN}   If you're still experiencing issues, check the Google Cloud Console settings${NC}"
    exit 0
else
    echo -e "${RED}⚠️  OAuth configuration needs attention${NC}"
    exit 1
fi