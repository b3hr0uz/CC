# Docker Build Troubleshooting Script for ContextCleanse (PowerShell)
# This script addresses common Docker build issues including EOF errors and resource exhaustion

param(
    [Parameter(Position=0)]
    [ValidateSet("build", "clean", "restart", "full")]
    [string]$Action = "build"
)

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    White = "White"
}

function Write-ColorOutput {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "🔧 Docker Build Troubleshooter for ContextCleanse" -Color Green

# Function to check Docker daemon status
function Test-DockerDaemon {
    Write-ColorOutput "📋 Checking Docker daemon status..." -Color Yellow
    
    try {
        docker info | Out-Null
        Write-ColorOutput "✅ Docker daemon is running" -Color Green
        return $true
    }
    catch {
        Write-ColorOutput "❌ Docker daemon is not running or accessible" -Color Red
        return $false
    }
}

# Function to check system resources
function Test-SystemResources {
    Write-ColorOutput "📋 Checking system resources..." -Color Yellow
    
    # Check available disk space
    try {
        $disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
        $diskUsagePercent = [math]::Round(((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100), 2)
        
        if ($diskUsagePercent -gt 85) {
            Write-ColorOutput "⚠️  Warning: Disk usage is $diskUsagePercent% - consider freeing space" -Color Red
        } else {
            Write-ColorOutput "✅ Disk space OK ($diskUsagePercent% used)" -Color Green
        }
        
        # Check available memory
        $memory = Get-WmiObject -Class Win32_ComputerSystem
        $totalMemGB = [math]::Round($memory.TotalPhysicalMemory / 1GB, 2)
        Write-ColorOutput "📊 Total Physical Memory: ${totalMemGB}GB" -Color Green
        
    } catch {
        Write-ColorOutput "⚠️  Could not check system resources" -Color Yellow
    }
}

# Function to optimize Docker settings for build
function Set-DockerOptimization {
    Write-ColorOutput "🔧 Optimizing Docker settings for build..." -Color Yellow
    
    # Set environment variables for better performance
    $env:DOCKER_BUILDKIT = "1"
    $env:BUILDKIT_PROGRESS = "plain"
    $env:BUILDKIT_TTY_LOG_LINES = "10"
    $env:COMPOSE_DOCKER_CLI_BUILD = "1"
    $env:DOCKER_CLI_HINTS = "false"
    
    Write-ColorOutput "✅ Docker environment optimized" -Color Green
}

# Function to clean Docker system aggressively
function Clear-DockerSystem {
    Write-ColorOutput "🧹 Performing aggressive Docker cleanup..." -Color Yellow
    
    try {
        # Stop all containers
        $runningContainers = docker ps -q
        if ($runningContainers) {
            Write-Host "Stopping all running containers..."
            docker stop $runningContainers 2>$null
        }
        
        # Remove all containers
        $allContainers = docker ps -aq
        if ($allContainers) {
            Write-Host "Removing all containers..."
            docker rm $allContainers 2>$null
        }
        
        # Remove dangling images
        Write-Host "Removing dangling images..."
        docker image prune -f 2>$null
        
        # Remove all build cache
        Write-Host "Removing all build cache..."
        docker builder prune -af 2>$null
        
        # Remove unused volumes
        Write-Host "Removing unused volumes..."
        docker volume prune -f 2>$null
        
        # Remove unused networks
        Write-Host "Removing unused networks..."
        docker network prune -f 2>$null
        
        # Final system prune
        Write-Host "Final system prune..."
        docker system prune -af --volumes 2>$null
        
        Write-ColorOutput "✅ Aggressive cleanup completed" -Color Green
    }
    catch {
        Write-ColorOutput "⚠️  Some cleanup operations failed, but continuing..." -Color Yellow
    }
}

# Function to restart Docker Desktop
function Restart-DockerDesktop {
    Write-ColorOutput "🔄 Restarting Docker Desktop..." -Color Yellow
    
    try {
        # Kill Docker Desktop processes
        Write-Host "Stopping Docker Desktop..."
        Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue | Stop-Process -Force
        Get-Process -Name "com.docker.service" -ErrorAction SilentlyContinue | Stop-Process -Force
        
        Start-Sleep -Seconds 5
        
        # Start Docker Desktop
        $dockerPath = "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe"
        if (Test-Path $dockerPath) {
            Write-Host "Starting Docker Desktop..."
            Start-Process -FilePath $dockerPath
            
            Write-Host "Waiting for Docker to restart..."
            Start-Sleep -Seconds 30
            
            # Wait for Docker to be ready
            for ($i = 1; $i -le 60; $i++) {
                try {
                    docker info | Out-Null
                    Write-ColorOutput "✅ Docker restarted successfully" -Color Green
                    return $true
                }
                catch {
                    Write-Host "Waiting for Docker... ($i/60)"
                    Start-Sleep -Seconds 2
                }
            }
            
            Write-ColorOutput "❌ Docker failed to restart properly" -Color Red
            return $false
        } else {
            Write-ColorOutput "❌ Docker Desktop not found at expected path" -Color Red
            return $false
        }
    }
    catch {
        Write-ColorOutput "❌ Failed to restart Docker Desktop: $($_.Exception.Message)" -Color Red
        return $false
    }
}

# Function to build with retry mechanism
function Start-BuildWithRetry {
    $maxRetries = 3
    $retryCount = 0
    
    while ($retryCount -lt $maxRetries) {
        $attempt = $retryCount + 1
        Write-ColorOutput "🏗️  Attempt $attempt/$maxRetries`: Starting Docker build..." -Color Yellow
        
        try {
            docker compose build --no-cache --parallel
            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput "✅ Build completed successfully!" -Color Green
                return $true
            } else {
                throw "Docker build failed with exit code $LASTEXITCODE"
            }
        }
        catch {
            Write-ColorOutput "❌ Build failed on attempt $attempt" -Color Red
            $retryCount++
            
            if ($retryCount -lt $maxRetries) {
                Write-ColorOutput "🔄 Cleaning up before retry..." -Color Yellow
                docker compose down --remove-orphans 2>$null
                docker system prune -f 2>$null
                
                Write-ColorOutput "⏳ Waiting 10 seconds before retry..." -Color Yellow
                Start-Sleep -Seconds 10
            }
        }
    }
    
    Write-ColorOutput "❌ Build failed after $maxRetries attempts" -Color Red
    return $false
}

# Function to start services with health checks
function Start-ServicesWithHealthChecks {
    Write-ColorOutput "🚀 Starting services with health checks..." -Color Yellow
    
    try {
        docker compose up --wait --remove-orphans
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ All services started successfully!" -Color Green
            
            # Show service status
            Write-ColorOutput "📊 Service Status:" -Color Yellow
            docker compose ps
            
            return $true
        } else {
            throw "Failed to start services"
        }
    }
    catch {
        Write-ColorOutput "❌ Failed to start services" -Color Red
        Write-ColorOutput "📋 Service logs:" -Color Yellow
        docker compose logs --tail=50
        return $false
    }
}

# Main execution
Write-ColorOutput "Starting Docker build troubleshooting process..." -Color Green

# Check prerequisites
if (-not (Test-DockerDaemon)) {
    Write-ColorOutput "Docker daemon check failed. Exiting." -Color Red
    exit 1
}

Test-SystemResources
Set-DockerOptimization

# Execute based on action parameter
switch ($Action) {
    "clean" {
        Clear-DockerSystem
    }
    "restart" {
        if (-not (Restart-DockerDesktop)) {
            exit 1
        }
    }
    "build" {
        # Stop existing services
        Write-ColorOutput "🛑 Stopping existing services..." -Color Yellow
        docker compose down --remove-orphans 2>$null
        
        # Clean system
        Clear-DockerSystem
        
        # Build with retry
        if (Start-BuildWithRetry) {
            if (-not (Start-ServicesWithHealthChecks)) {
                exit 1
            }
        } else {
            Write-ColorOutput "❌ Build process failed completely" -Color Red
            Write-ColorOutput "💡 Try running: .\docker-build-troubleshoot.ps1 restart" -Color Yellow
            exit 1
        }
    }
    "full" {
        if (-not (Restart-DockerDesktop)) { exit 1 }
        Clear-DockerSystem
        if (-not (Start-BuildWithRetry)) { exit 1 }
        if (-not (Start-ServicesWithHealthChecks)) { exit 1 }
    }
    default {
        Write-ColorOutput "Usage: .\docker-build-troubleshoot.ps1 [build|clean|restart|full]" -Color White
        Write-ColorOutput "  build   - Clean and build (default)" -Color White
        Write-ColorOutput "  clean   - Aggressive cleanup only" -Color White  
        Write-ColorOutput "  restart - Restart Docker Desktop" -Color White
        Write-ColorOutput "  full    - Complete restart, clean, and build" -Color White
    }
}