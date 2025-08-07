# Ollama Diagnostic Script for ContextCleanse (Windows)
# This script helps diagnose Ollama connectivity and setup issues on Windows

param(
    [switch]$Detailed = $false
)

Write-Host "🔍 ContextCleanse Ollama Diagnostics (Windows)" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date)" -ForegroundColor Gray
Write-Host ""

# System Information
Write-Host "📊 System Information" -ForegroundColor Cyan
Write-Host "OS: $($env:OS) $(Get-WmiObject -Class Win32_OperatingSystem | Select-Object -ExpandProperty Caption)"
Write-Host "Architecture: $env:PROCESSOR_ARCHITECTURE"
$totalRAM = [math]::Round((Get-WmiObject -Class Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
Write-Host "Memory: ${totalRAM}GB total"
Write-Host ""

# Check Ollama Installation
Write-Host "🔧 Ollama Installation Check" -ForegroundColor Cyan

# Check if ollama command is available
$ollamaFound = $false
$ollamaPath = $null

try {
    $ollamaPath = Get-Command ollama -ErrorAction Stop | Select-Object -ExpandProperty Source
    $ollamaFound = $true
    Write-Host "✅ Ollama command found" -ForegroundColor Green
    Write-Host "Location: $ollamaPath" -ForegroundColor Gray
    
    # Check version
    try {
        $version = & ollama --version 2>$null
        Write-Host "Version: $version" -ForegroundColor Gray
    } catch {
        Write-Host "⚠️  Could not determine Ollama version" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Ollama command not found in PATH" -ForegroundColor Red
    
    # Check common installation locations
    $commonPaths = @(
        "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe",
        "$env:PROGRAMFILES\Ollama\ollama.exe",
        "$env:PROGRAMFILES(X86)\Ollama\ollama.exe"
    )
    
    Write-Host "Checking common installation locations..." -ForegroundColor Gray
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            Write-Host "✅ Found Ollama at: $path" -ForegroundColor Green
            $ollamaFound = $true
            $ollamaPath = $path
            break
        }
    }
    
    if (-not $ollamaFound) {
        Write-Host "❌ Ollama not found in common locations" -ForegroundColor Red
        Write-Host "Installation needed - see setup instructions below" -ForegroundColor Yellow
    }
}
Write-Host ""

# Check Ollama Process
Write-Host "🚀 Ollama Process Check" -ForegroundColor Cyan

$ollamaProcesses = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
if ($ollamaProcesses) {
    Write-Host "✅ Ollama process is running" -ForegroundColor Green
    foreach ($process in $ollamaProcesses) {
        Write-Host "Process ID: $($process.Id), CPU: $([math]::Round($process.CPU, 2))s, Memory: $([math]::Round($process.WorkingSet64 / 1MB, 1))MB" -ForegroundColor Gray
    }
} else {
    Write-Host "❌ Ollama process not running" -ForegroundColor Red
    
    # Check if Ollama service exists
    $service = Get-Service -Name "Ollama*" -ErrorAction SilentlyContinue
    if ($service) {
        Write-Host "Service Status: $($service.Status)" -ForegroundColor Gray
        if ($service.Status -eq "Stopped") {
            Write-Host "⚠️  Ollama service exists but is stopped - try starting it" -ForegroundColor Yellow
        }
    } else {
        Write-Host "No Ollama Windows service found" -ForegroundColor Gray
    }
}
Write-Host ""

# Check Network Connectivity
Write-Host "🌐 Network Connectivity Check" -ForegroundColor Cyan

# Check if port 11434 is listening
$portListening = $false
try {
    $netstat = netstat -an | Select-String ":11434"
    if ($netstat) {
        Write-Host "✅ Port 11434 is listening" -ForegroundColor Green
        if ($Detailed) {
            $netstat | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
        }
        $portListening = $true
    } else {
        Write-Host "❌ Port 11434 is not listening" -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️  Cannot check port status" -ForegroundColor Yellow
}

# Test HTTP connectivity
Write-Host "Testing HTTP connectivity to Ollama API..." -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ HTTP API responding (200 OK)" -ForegroundColor Green
        
        # Parse and display models
        try {
            $modelData = $response.Content | ConvertFrom-Json
            if ($modelData.models) {
                $modelCount = $modelData.models.Count
                Write-Host "Available models: $modelCount" -ForegroundColor Gray
                
                if ($modelCount -gt 0) {
                    Write-Host "Installed models:" -ForegroundColor Gray
                    foreach ($model in $modelData.models) {
                        $sizeGB = [math]::Round($model.size / 1GB, 1)
                        Write-Host "  • $($model.name) (${sizeGB}GB)" -ForegroundColor Gray
                    }
                } else {
                    Write-Host "⚠️  No models installed" -ForegroundColor Yellow
                }
            }
        } catch {
            Write-Host "API responding but cannot parse model data" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ HTTP API error (code: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Cannot connect to HTTP API" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Check Windows Firewall (basic check)
Write-Host "🔥 Windows Firewall Check" -ForegroundColor Cyan

try {
    $firewallProfiles = Get-NetFirewallProfile | Where-Object { $_.Enabled -eq $true }
    if ($firewallProfiles) {
        Write-Host "Active firewall profiles: $($firewallProfiles.Name -join ', ')" -ForegroundColor Gray
        
        # Check for Ollama-related rules
        $ollamaRules = Get-NetFirewallRule | Where-Object { 
            $_.DisplayName -like "*ollama*" -or $_.DisplayName -like "*11434*"
        } -ErrorAction SilentlyContinue
        
        if ($ollamaRules) {
            Write-Host "✅ Found Ollama-related firewall rules" -ForegroundColor Green
            if ($Detailed) {
                $ollamaRules | ForEach-Object {
                    Write-Host "  • $($_.DisplayName): $($_.Action)" -ForegroundColor Gray
                }
            }
        } else {
            Write-Host "⚠️  No specific Ollama firewall rules found" -ForegroundColor Yellow
            Write-Host "   (This may be OK if using default Windows firewall settings)" -ForegroundColor Gray
        }
    } else {
        Write-Host "✅ Windows Firewall appears to be disabled" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Cannot check Windows Firewall status" -ForegroundColor Yellow
}
Write-Host ""

# Model Recommendations
Write-Host "🤖 Model Recommendations" -ForegroundColor Cyan

if ($ollamaFound) {
    try {
        if ($ollamaPath -and (Test-Path $ollamaPath)) {
            $modelList = & $ollamaPath list 2>$null
        } else {
            $modelList = & ollama list 2>$null
        }
        
        if ($modelList -and $modelList.Count -gt 1) {
            Write-Host "✅ Current models installed:" -ForegroundColor Green
            $modelList | Select-Object -Skip 1 | Where-Object { $_.Trim() -ne "" } | ForEach-Object {
                $modelName = ($_ -split '\s+')[0]
                if ($modelName) {
                    Write-Host "  • $modelName" -ForegroundColor Gray
                }
            }
        } else {
            Write-Host "⚠️  No models currently installed" -ForegroundColor Yellow
        }
        
        Write-Host "Recommended models for ContextCleanse:" -ForegroundColor Gray
        Write-Host "  • llama3:latest (Best for Windows - ~4.7GB)" -ForegroundColor Gray
        Write-Host "  • llama3.1:8b (Alternative - ~4.7GB)" -ForegroundColor Gray
        Write-Host "  • llama2:latest (Lighter option - ~3.8GB)" -ForegroundColor Gray
        
        # Check if recommended model exists
        if ($modelList -and ($modelList -join ' ') -match 'llama3:latest') {
            Write-Host "✅ Recommended model (llama3:latest) is installed" -ForegroundColor Green
        } elseif ($modelList -and ($modelList -join ' ') -match 'llama3.1:8b') {
            Write-Host "✅ Alternative model (llama3.1:8b) is installed" -ForegroundColor Green
        } else {
            Write-Host "⚠️  No recommended models installed" -ForegroundColor Yellow
            Write-Host "Install with: ollama pull llama3:latest" -ForegroundColor Gray
        }
    } catch {
        Write-Host "⚠️  Cannot check installed models" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Cannot check models (Ollama not found)" -ForegroundColor Yellow
}
Write-Host ""

# Performance Test
Write-Host "⚡ Performance Test" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    $modelData = $response.Content | ConvertFrom-Json
    
    if ($modelData.models -and $modelData.models.Count -gt 0) {
        $firstModel = $modelData.models[0].name
        Write-Host "Testing inference with model: $firstModel" -ForegroundColor Gray
        
        $startTime = Get-Date
        
        $testBody = @{
            model = $firstModel
            prompt = "Hello"
            stream = $false
        } | ConvertTo-Json
        
        try {
            $testResponse = Invoke-WebRequest -Uri "http://localhost:11434/api/generate" -Method POST -Body $testBody -ContentType "application/json" -TimeoutSec 30 -UseBasicParsing -ErrorAction Stop
            $endTime = Get-Date
            $duration = [math]::Round(($endTime - $startTime).TotalSeconds, 1)
            
            if ($testResponse.StatusCode -eq 200) {
                $responseData = $testResponse.Content | ConvertFrom-Json
                if ($responseData.response) {
                    Write-Host "✅ Inference test successful (${duration}s)" -ForegroundColor Green
                    $responsePreview = $responseData.response.Substring(0, [Math]::Min(50, $responseData.response.Length))
                    Write-Host "Response preview: $responsePreview..." -ForegroundColor Gray
                } else {
                    Write-Host "❌ Inference test failed (no response generated)" -ForegroundColor Red
                }
            } else {
                Write-Host "❌ Inference test failed (HTTP $($testResponse.StatusCode))" -ForegroundColor Red
            }
        } catch {
            Write-Host "❌ Inference test failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️  Cannot perform inference test (no models available)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Cannot perform inference test (API unavailable)" -ForegroundColor Yellow
}
Write-Host ""

# Summary and Recommendations
Write-Host "📋 Summary and Recommendations" -ForegroundColor Cyan

# Determine overall status
$issuesFound = 0

if (-not $ollamaFound) {
    Write-Host "❌ ISSUE: Ollama not installed" -ForegroundColor Red
    $issuesFound++
}

if (-not (Get-Process -Name "ollama" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ ISSUE: Ollama not running" -ForegroundColor Red
    $issuesFound++
}

try {
    Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop | Out-Null
} catch {
    Write-Host "❌ ISSUE: API not accessible" -ForegroundColor Red
    $issuesFound++
}

if ($ollamaFound) {
    try {
        if ($ollamaPath -and (Test-Path $ollamaPath)) {
            $modelList = & $ollamaPath list 2>$null
        } else {
            $modelList = & ollama list 2>$null
        }
        
        if (-not $modelList -or $modelList.Count -le 1) {
            Write-Host "⚠️  ISSUE: No models installed" -ForegroundColor Yellow
            $issuesFound++
        }
    } catch {
        Write-Host "⚠️  Cannot verify model installation" -ForegroundColor Yellow
    }
}

Write-Host ""
if ($issuesFound -eq 0) {
    Write-Host "🎉 Ollama appears to be working correctly!" -ForegroundColor Green
    Write-Host "ContextCleanse LLM Assistant should be functional" -ForegroundColor Gray
} else {
    Write-Host "Found $issuesFound issue(s) that need attention" -ForegroundColor Red
    
    Write-Host ""
    Write-Host "🔧 Suggested Actions:" -ForegroundColor Cyan
    
    if (-not $ollamaFound) {
        Write-Host "1. Install Ollama:" -ForegroundColor Yellow
        Write-Host "   • Download OllamaSetup.exe from https://ollama.com/download" -ForegroundColor Gray
        Write-Host "   • Run installer (no admin rights needed)" -ForegroundColor Gray
        Write-Host "   • Or run: .\scripts\setup-ollama.ps1" -ForegroundColor Gray
    }
    
    if (-not (Get-Process -Name "ollama" -ErrorAction SilentlyContinue)) {
        Write-Host "2. Start Ollama:" -ForegroundColor Yellow
        Write-Host "   • Open Command Prompt or PowerShell" -ForegroundColor Gray
        Write-Host "   • Run: ollama serve" -ForegroundColor Gray
        Write-Host "   • Keep the window open (Ollama runs in foreground)" -ForegroundColor Gray
    }
    
    if ($ollamaFound) {
        try {
            if ($ollamaPath -and (Test-Path $ollamaPath)) {
                $modelList = & $ollamaPath list 2>$null
            } else {
                $modelList = & ollama list 2>$null
            }
            
            if (-not $modelList -or $modelList.Count -le 1) {
                Write-Host "3. Install a model:" -ForegroundColor Yellow
                Write-Host "   • Run: ollama pull llama3:latest" -ForegroundColor Gray
                Write-Host "   • This will download ~4.7GB (may take time)" -ForegroundColor Gray
            }
        } catch {
            Write-Host "3. Install a model: ollama pull llama3:latest" -ForegroundColor Yellow
        }
    }
    
    Write-Host "4. Check Windows Firewall:" -ForegroundColor Yellow
    Write-Host "   • Ensure port 11434 is allowed" -ForegroundColor Gray
    Write-Host "   • Windows may prompt for firewall permission" -ForegroundColor Gray
    
    Write-Host "5. Review setup guide:" -ForegroundColor Yellow
    Write-Host "   • See docs\ollama-setup-guide.md for detailed instructions" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🔗 Useful Links:" -ForegroundColor Cyan
Write-Host "• Setup Guide: docs\ollama-setup-guide.md" -ForegroundColor Gray
Write-Host "• Ollama Documentation: https://ollama.com/docs" -ForegroundColor Gray
Write-Host "• Windows Setup: https://ollama.com/docs/windows" -ForegroundColor Gray

Write-Host ""
Write-Host "Run this diagnostic script again after making changes to verify fixes" -ForegroundColor Gray
Write-Host "Use -Detailed switch for more verbose output" -ForegroundColor Gray