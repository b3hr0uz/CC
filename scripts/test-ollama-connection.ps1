# Test Ollama Connection Script for Windows
# This script tests the connection to your Windows Ollama installation

param(
    [string]$OllamaUrl = "http://localhost:11434",
    [switch]$Detailed = $false
)

Write-Host "🔍 Testing Ollama Connection for ContextCleanse Assistant" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "Target URL: $OllamaUrl" -ForegroundColor Gray
Write-Host ""

# Test 1: Basic API connectivity
Write-Host "1. Testing API connectivity..." -ForegroundColor Blue
try {
    $response = Invoke-WebRequest -Uri "$OllamaUrl/api/tags" -TimeoutSec 10 -UseBasicParsing
    Write-Host "✅ API is accessible (HTTP $($response.StatusCode))" -ForegroundColor Green
    
    $models = ($response.Content | ConvertFrom-Json).models
    Write-Host "✅ Found $($models.Count) model(s)" -ForegroundColor Green
    
    if ($Detailed) {
        foreach ($model in $models) {
            $sizeGB = [math]::Round($model.size / 1GB, 1)
            Write-Host "   • $($model.name) (${sizeGB}GB)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ API connectivity failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure Ollama is running with: ollama serve" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 2: Check for llama3:latest (Windows default)
Write-Host "2. Checking for llama3:latest model..." -ForegroundColor Blue
$hasLlama3Latest = $models | Where-Object { $_.name -eq "llama3:latest" }
if ($hasLlama3Latest) {
    Write-Host "✅ llama3:latest model found (perfect for Windows)" -ForegroundColor Green
    $sizeGB = [math]::Round($hasLlama3Latest.size / 1GB, 1)
    Write-Host "   Size: ${sizeGB}GB, Modified: $($hasLlama3Latest.modified_at)" -ForegroundColor Gray
} else {
    Write-Host "⚠️  llama3:latest not found" -ForegroundColor Yellow
    Write-Host "Available models:" -ForegroundColor Yellow
    foreach ($model in $models) {
        Write-Host "   • $($model.name)" -ForegroundColor Gray
    }
    Write-Host "Consider installing: ollama pull llama3:latest" -ForegroundColor Yellow
}

Write-Host ""

# Test 3: Performance test with first available model
if ($models.Count -gt 0) {
    $testModel = $hasLlama3Latest ? "llama3:latest" : $models[0].name
    Write-Host "3. Testing inference with model: $testModel..." -ForegroundColor Blue
    
    $testBody = @{
        model = $testModel
        prompt = "Hello! Please respond with just 'OK' to confirm you're working."
        stream = $false
    } | ConvertTo-Json
    
    $startTime = Get-Date
    try {
        $inferenceResponse = Invoke-WebRequest -Uri "$OllamaUrl/api/generate" -Method POST -Body $testBody -ContentType "application/json" -TimeoutSec 30 -UseBasicParsing
        $endTime = Get-Date
        $duration = [math]::Round(($endTime - $startTime).TotalSeconds, 2)
        
        $result = $inferenceResponse.Content | ConvertFrom-Json
        if ($result.response) {
            Write-Host "✅ Inference test successful (${duration}s)" -ForegroundColor Green
            $responseText = $result.response.Trim()
            Write-Host "🤖 Model response: $responseText" -ForegroundColor Cyan
        } else {
            Write-Host "⚠️  Model responded but no content generated" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Inference test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "3. ⚠️  No models available for testing" -ForegroundColor Yellow
}

Write-Host ""

# Test 4: Docker compatibility check
Write-Host "4. Docker compatibility check..." -ForegroundColor Blue
try {
    # Test using host.docker.internal (Docker Desktop for Windows)
    $dockerUrl = "http://host.docker.internal:11434"
    $dockerResponse = Invoke-WebRequest -Uri "$dockerUrl/api/tags" -TimeoutSec 5 -UseBasicParsing
    Write-Host "✅ Docker host access working ($dockerUrl)" -ForegroundColor Green
    Write-Host "   ContextCleanse Docker containers will be able to connect" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Docker host access may have issues" -ForegroundColor Yellow
    Write-Host "   This is normal if not using Docker Desktop" -ForegroundColor Gray
    if ($Detailed) {
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
    }
}

Write-Host ""

# Test 5: Network configuration check
Write-Host "5. Network configuration check..." -ForegroundColor Blue

# Check if port is listening
$portCheck = netstat -an | Select-String ":11434.*LISTENING"
if ($portCheck) {
    Write-Host "✅ Port 11434 is listening" -ForegroundColor Green
    if ($Detailed) {
        Write-Host "   $($portCheck.Line.Trim())" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Port 11434 may not be listening" -ForegroundColor Yellow
}

# Check Windows Firewall
try {
    $firewallRules = Get-NetFirewallRule | Where-Object { 
        $_.DisplayName -like "*ollama*" -or $_.DisplayName -like "*11434*" 
    } -ErrorAction SilentlyContinue
    
    if ($firewallRules) {
        Write-Host "✅ Found Windows Firewall rules for Ollama" -ForegroundColor Green
        if ($Detailed) {
            $firewallRules | ForEach-Object {
                Write-Host "   • $($_.DisplayName): $($_.Action)" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "ℹ️  No specific Windows Firewall rules found" -ForegroundColor Yellow
        Write-Host "   This is usually fine for localhost connections" -ForegroundColor Gray
    }
} catch {
    Write-Host "ℹ️  Cannot check Windows Firewall (access denied)" -ForegroundColor Yellow
}

Write-Host ""

# Summary
Write-Host "📋 Summary" -ForegroundColor Cyan
Write-Host "==========" -ForegroundColor Cyan

$overallStatus = "Good"
$issues = @()

if (-not $models -or $models.Count -eq 0) {
    $overallStatus = "Issues Found"
    $issues += "No models installed"
}

if (-not $hasLlama3Latest) {
    $overallStatus = "Minor Issues"
    $issues += "Recommended model (llama3:latest) not found"
}

if ($issues.Count -eq 0) {
    Write-Host "🎉 Your Ollama setup is ready for ContextCleanse!" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Configuration matches your Windows setup:" -ForegroundColor Green
    Write-Host "   • API URL: $OllamaUrl" -ForegroundColor Gray
    Write-Host "   • Default Model: llama3:latest" -ForegroundColor Gray
    Write-Host "   • Docker Support: host.docker.internal:11434" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🚀 Next steps:" -ForegroundColor Cyan
    Write-Host "1. Start your ContextCleanse application" -ForegroundColor Gray
    Write-Host "2. Navigate to the Assistant page" -ForegroundColor Gray
    Write-Host "3. The Assistant should automatically detect your Ollama setup" -ForegroundColor Gray
} else {
    Write-Host "⚠️  Status: $overallStatus" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Issues found:" -ForegroundColor Yellow
    foreach ($issue in $issues) {
        Write-Host "• $issue" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "🔧 Recommended actions:" -ForegroundColor Cyan
    if ($issues -contains "No models installed") {
        Write-Host "• Install a model: ollama pull llama3:latest" -ForegroundColor Gray
    }
    if ($issues -contains "Recommended model (llama3:latest) not found") {
        Write-Host "• Install Windows-optimized model: ollama pull llama3:latest" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "ℹ️  For more help, see: docs/ollama-setup-guide.md" -ForegroundColor Gray