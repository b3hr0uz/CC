#!/bin/bash

# Next.js Build Optimization Script
# Precompiles and caches all required pages for faster load times

set -e

echo "🚀 Starting Next.js Build Optimization..."

cd frontend

echo "📦 Installing dependencies..."
npm ci --prefer-offline --no-audit

echo "🧹 Cleaning previous builds..."
npm run clean

echo "🔍 Type checking..."
npm run type-check

echo "🎯 Linting and fixing issues..."
npm run lint:fix

echo "🏗️  Building with optimizations..."
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

# Enable build optimizations
export NEXT_PRIVATE_STANDALONE=true
export NEXT_PRIVATE_DEBUG_CACHE=1

npm run build

echo "📊 Analyzing build output..."
npm run build:analyze

echo "🧪 Testing production build..."
timeout 30s npm run start:production &
SERVER_PID=$!
sleep 5

# Test critical pages
PAGES=("/" "/dashboard" "/training" "/assistant" "/privacy" "/terms")
BASE_URL="http://localhost:3000"

for page in "${PAGES[@]}"; do
    echo "🌐 Testing $BASE_URL$page"
    if curl -f -s "$BASE_URL$page" > /dev/null; then
        echo "✅ $page loads successfully"
    else
        echo "❌ $page failed to load"
    fi
done

# Stop test server
kill $SERVER_PID 2>/dev/null || true

echo "📈 Build size analysis:"
echo "$(du -sh .next)"
echo "$(find .next -name "*.js" -type f | wc -l) JavaScript files generated"
echo "$(find .next -name "*.html" -type f | wc -l) HTML files pre-rendered"

echo "✅ Next.js Build Optimization Complete!"
echo ""
echo "📋 Performance Tips:"
echo "   • Use 'npm run dev:turbo' for faster development"
echo "   • Run 'npm run precompile' before deployment"
echo "   • Monitor .next/cache for build cache effectiveness"
echo "   • Check .next/static for optimized assets"
echo ""
echo "🏃 Ready for production deployment!"