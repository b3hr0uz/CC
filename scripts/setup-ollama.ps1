# Ollama Setup Script for Windows
# This script installs Ollama and sets up the Assistant on Windows

param(
    [string]$InstallPath = "$env:LOCALAPPDATA\Programs\Ollama",
    [string]$Model = "llama3:latest",
    [switch]$Force = $false
)

Write-Host "🚀 Setting up Ollama for ContextCleanse Assistant on Windows" -ForegroundColor Green
Write-Host "=============================================================" -ForegroundColor Cyan

# Check if running as Administrator (not required but useful for troubleshooting)
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if ($isAdmin) {
    Write-Host "✅ Running as Administrator" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Running as regular user (this is fine for Ollama)" -ForegroundColor Yellow
}

# Function to check if Ollama is running
function Test-OllamaService {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 5 -UseBasicParsing
        return $true
    } catch {
        return $false
    }
}

# Function to download and install Ollama
function Install-Ollama {
    param([string]$InstallDir)
    
    Write-Host "📥 Downloading Ollama installer..." -ForegroundColor Blue
    
    $installerUrl = "https://ollama.com/download/OllamaSetup.exe"
    $installerPath = "$env:TEMP\OllamaSetup.exe"
    
    try {
        # Download installer
        Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath -UseBasicParsing
        Write-Host "✅ Downloaded Ollama installer" -ForegroundColor Green
        
        # Run installer
        Write-Host "🔧 Installing Ollama..." -ForegroundColor Blue
        if ($InstallDir -and $InstallDir -ne "$env:LOCALAPPDATA\Programs\Ollama") {
            Start-Process -FilePath $installerPath -ArgumentList "/S", "/DIR=$InstallDir" -Wait
        } else {
            Start-Process -FilePath $installerPath -ArgumentList "/S" -Wait
        }
        
        # Clean up installer
        Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
        
        Write-Host "✅ Ollama installed successfully" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Failed to install Ollama: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to start Ollama service
function Start-OllamaService {
    Write-Host "🚀 Starting Ollama service..." -ForegroundColor Blue
    
    try {
        # Try to find Ollama executable
        $ollamaPath = $null
        $possiblePaths = @(
            "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe",
            "$InstallPath\ollama.exe",
            "ollama.exe"  # In PATH
        )
        
        foreach ($path in $possiblePaths) {
            if (Test-Path $path -ErrorAction SilentlyContinue) {
                $ollamaPath = $path
                break
            } elseif ($path -eq "ollama.exe") {
                # Check if in PATH
                try {
                    $null = Get-Command ollama -ErrorAction Stop
                    $ollamaPath = "ollama"
                    break
                } catch {
                    continue
                }
            }
        }
        
        if (-not $ollamaPath) {
            Write-Host "❌ Ollama executable not found. Please check installation." -ForegroundColor Red
            return $false
        }
        
        Write-Host "✅ Found Ollama at: $ollamaPath" -ForegroundColor Green
        
        # Start Ollama in background
        Start-Process -FilePath $ollamaPath -ArgumentList "serve" -WindowStyle Hidden
        
        # Wait for service to start
        Write-Host "⏳ Waiting for Ollama service to start..." -ForegroundColor Yellow
        $maxWait = 30
        $waited = 0
        
        while ($waited -lt $maxWait) {
            if (Test-OllamaService) {
                Write-Host "✅ Ollama service is running!" -ForegroundColor Green
                return $true
            }
            Start-Sleep -Seconds 2
            $waited += 2
            Write-Host "." -NoNewline -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "⚠️  Ollama service may be starting slowly. Please wait a moment and try again." -ForegroundColor Yellow
        return $false
        
    } catch {
        Write-Host "❌ Failed to start Ollama service: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to download a model
function Install-OllamaModel {
    param([string]$ModelName)
    
    Write-Host "📦 Installing model: $ModelName..." -ForegroundColor Blue
    
    try {
        # Use PowerShell to run ollama pull
        $process = Start-Process -FilePath "ollama" -ArgumentList "pull", $ModelName -PassThru -NoNewWindow -Wait
        
        if ($process.ExitCode -eq 0) {
            Write-Host "✅ Model $ModelName installed successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Failed to install model $ModelName (Exit code: $($process.ExitCode))" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Failed to install model $ModelName: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to test model
function Test-OllamaModel {
    param([string]$ModelName)
    
    Write-Host "🧪 Testing model: $ModelName..." -ForegroundColor Blue
    
    try {
        $body = @{
            model = $ModelName
            prompt = "Hello! Respond with just 'OK' if you're working."
            stream = $false
        } | ConvertTo-Json
        
        $response = Invoke-WebRequest -Uri "http://localhost:11434/api/generate" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 30 -UseBasicParsing
        $result = $response.Content | ConvertFrom-Json
        
        if ($result.response -and $result.done) {
            Write-Host "✅ Model $ModelName is working correctly" -ForegroundColor Green
            Write-Host "🤖 Response: $($result.response.Trim())" -ForegroundColor Cyan
            return $true
        } else {
            Write-Host "⚠️  Model $ModelName responded but may have issues" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "❌ Failed to test model $ModelName: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Main execution
Write-Host "🔍 Checking current Ollama status..." -ForegroundColor Blue

$isOllamaRunning = Test-OllamaService
if ($isOllamaRunning -and -not $Force) {
    Write-Host "✅ Ollama is already running!" -ForegroundColor Green
    
    # List available models
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing
        $models = ($response.Content | ConvertFrom-Json).models
        
        if ($models.Count -gt 0) {
            Write-Host "📚 Available models:" -ForegroundColor Cyan
            foreach ($model in $models) {
                Write-Host "  • $($model.name) (Modified: $($model.modified_at))" -ForegroundColor Gray
            }
            
            # Check if desired model exists
            $hasDesiredModel = $models | Where-Object { $_.name -eq $Model }
            if ($hasDesiredModel) {
                Write-Host "✅ Model $Model is already available!" -ForegroundColor Green
                Write-Host "🚀 Your Assistant is ready to use!" -ForegroundColor Green
                exit 0
            }
        } else {
            Write-Host "⚠️  No models found. Will install $Model" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Could not list models, but Ollama is running" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Ollama is not running. Installing..." -ForegroundColor Red
    
    # Install Ollama
    $installSuccess = Install-Ollama -InstallDir $InstallPath
    if (-not $installSuccess) {
        Write-Host "❌ Installation failed. Please try manual installation from https://ollama.com" -ForegroundColor Red
        exit 1
    }
    
    # Start Ollama service
    $serviceStarted = Start-OllamaService
    if (-not $serviceStarted) {
        Write-Host "❌ Failed to start Ollama service. Please try running 'ollama serve' manually." -ForegroundColor Red
        exit 1
    }
}

# Install the desired model
Write-Host "📦 Installing model: $Model..." -ForegroundColor Blue
$modelInstalled = Install-OllamaModel -ModelName $Model
if ($modelInstalled) {
    # Test the model
    $modelWorks = Test-OllamaModel -ModelName $Model
    if ($modelWorks) {
        Write-Host "🎉 Setup completed successfully!" -ForegroundColor Green
        Write-Host "✅ Ollama is running on http://localhost:11434" -ForegroundColor Green
        Write-Host "🤖 Model $Model is ready" -ForegroundColor Green
        Write-Host "🚀 Your ContextCleanse Assistant is now ready to use!" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  Model installation failed. You can try installing it manually with:" -ForegroundColor Yellow
    Write-Host "   ollama pull $Model" -ForegroundColor Gray
}

Write-Host ""
Write-Host "📖 Next steps:" -ForegroundColor Cyan
Write-Host "1. Open your ContextCleanse application" -ForegroundColor Gray
Write-Host "2. Navigate to the Assistant page" -ForegroundColor Gray
Write-Host "3. The Assistant should now be available!" -ForegroundColor Gray
Write-Host ""
Write-Host "🔧 Troubleshooting:" -ForegroundColor Cyan
Write-Host "- If issues persist, run: ollama serve" -ForegroundColor Gray
Write-Host "- Check Windows Firewall for port 11434" -ForegroundColor Gray
Write-Host "- Visit http://localhost:11434 in your browser to test" -ForegroundColor Gray