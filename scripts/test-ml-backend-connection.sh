#!/bin/bash

# ML Backend Connection Test Script
# This script tests all the ML backend endpoints that were previously failing

echo "🔧 ML Backend Connection Test"
echo "============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test basic backend availability
echo -e "\n1. ${YELLOW}Testing basic backend availability...${NC}"
if curl -f -s http://localhost:8000/models/available > /dev/null; then
    echo -e "   ${GREEN}✅ Backend is responding${NC}"
else
    echo -e "   ${RED}❌ Backend is not responding${NC}"
    exit 1
fi

# Test v1 API endpoints
echo -e "\n2. ${YELLOW}Testing v1 API endpoints...${NC}"

# Test models compare endpoint
echo -e "   Testing /api/v1/feedback/models/compare..."
if curl -f -s http://localhost:8000/api/v1/feedback/models/compare | jq -e '.success' > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Models compare endpoint working${NC}"
else
    echo -e "   ${RED}❌ Models compare endpoint failed${NC}"
fi

# Test dataset statistics endpoint
echo -e "   Testing /api/v1/feedback/dataset/statistics..."
if curl -f -s http://localhost:8000/api/v1/feedback/dataset/statistics | jq -e '.total_samples' > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Dataset statistics endpoint working${NC}"
else
    echo -e "   ${RED}❌ Dataset statistics endpoint failed${NC}"
fi

# Test optimal k-fold endpoint
echo -e "\n3. ${YELLOW}Testing optimal k-fold endpoint...${NC}"
if curl -f -s -X POST http://localhost:8000/models/optimal-kfold \
    -H "Content-Type: application/json" \
    -d '{"k_folds": 5, "test_model": "xgboost"}' | jq -e '.optimal_k' > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Optimal k-fold endpoint working${NC}"
else
    echo -e "   ${RED}❌ Optimal k-fold endpoint failed${NC}"
fi

# Test classification endpoint
echo -e "\n4. ${YELLOW}Testing email classification endpoint...${NC}"
if curl -f -s -X POST http://localhost:8000/api/v1/spam/check \
    -H "Content-Type: application/json" \
    -d '{"features": [0.1, 0.2, 0.3]}' > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Classification endpoint working${NC}"
else
    echo -e "   ${YELLOW}⚠️ Classification endpoint may need training${NC}"
fi

# Check Docker containers
echo -e "\n5. ${YELLOW}Checking Docker containers...${NC}"
echo -e "   Backend container:"
if docker ps --format "table {{.Names}}\t{{.Status}}" | grep cc_backend | grep -q "Up"; then
    echo -e "   ${GREEN}✅ cc_backend container is running${NC}"
else
    echo -e "   ${RED}❌ cc_backend container is not running${NC}"
fi

echo -e "   Frontend container:"
if docker ps --format "table {{.Names}}\t{{.Status}}" | grep cc_frontend | grep -q "Up"; then
    echo -e "   ${GREEN}✅ cc_frontend container is running${NC}"
else
    echo -e "   ${RED}❌ cc_frontend container is not running${NC}"
fi

# Check network connectivity between containers
echo -e "\n6. ${YELLOW}Testing container-to-container connectivity...${NC}"
if docker exec cc_frontend curl -f -s http://backend:8000/models/available > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Frontend can reach backend via internal network${NC}"
else
    echo -e "   ${RED}❌ Frontend cannot reach backend via internal network${NC}"
fi

echo -e "\n${GREEN}🎉 ML Backend Connection Test Complete!${NC}"
echo -e "\nNext steps:"
echo -e "1. Visit http://localhost:3000 to test the frontend"
echo -e "2. Check the Training page to verify model loading"
echo -e "3. Try email classification on the Dashboard"

# Show recent backend logs
echo -e "\n${YELLOW}Recent backend logs:${NC}"
docker logs cc_backend --tail 5