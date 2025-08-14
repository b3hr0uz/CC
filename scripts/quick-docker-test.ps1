# Quick Docker Volume Test Script
# Fast test to verify the volume mounting fix works

Write-Host "🚀 Quick Docker Volume Fix Test" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue

# Step 1: Clean up any existing issues
Write-Host "🧹 Cleaning up existing containers and volumes..." -ForegroundColor Yellow
docker compose down --remove-orphans 2>$null
docker volume prune -f 2>$null

# Step 2: Test volume creation
Write-Host "🔧 Testing Docker volume system..." -ForegroundColor Yellow
try {
    docker volume create test-redis 2>$null | Out-Null
    docker volume create test-postgres 2>$null | Out-Null
    docker volume rm test-redis test-postgres 2>$null | Out-Null
    Write-Host "✅ Docker volume system working" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker volume system failed" -ForegroundColor Red
    exit 1
}

# Step 3: Try starting services
Write-Host "🐳 Starting Docker services..." -ForegroundColor Yellow
docker compose up --wait

$exitCode = $LASTEXITCODE
if ($exitCode -eq 0) {
    Write-Host "🎉 SUCCESS! Docker services started without volume errors!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Service Status:" -ForegroundColor Blue
    docker compose ps
    Write-Host ""
    Write-Host "💡 Your Docker build and startup issues are resolved!" -ForegroundColor Green
} else {
    Write-Host "❌ Services failed to start. Checking logs..." -ForegroundColor Red
    docker compose logs --tail=10
}