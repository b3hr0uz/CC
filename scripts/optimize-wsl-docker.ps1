# WSL Docker Optimization Script
# This script optimizes WSL configuration for better Docker build performance

param(
    [switch]$Apply,
    [switch]$Backup,
    [switch]$Restore
)

$Colors = @{
    Red = "Red"
    Green = "Green" 
    Yellow = "Yellow"
    White = "White"
    Blue = "Blue"
}

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Get-WSLDistribution {
    try {
        $wslList = wsl --list --quiet
        $distributions = $wslList | Where-Object { $_ -and $_.Trim() -ne "" }
        return $distributions[0].Trim()
    }
    catch {
        return $null
    }
}

function Test-WSLRunning {
    try {
        wsl --list --running --quiet | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Backup-WSLConfig {
    $distro = Get-WSLDistribution
    if (-not $distro) {
        Write-ColorOutput "❌ No WSL distribution found" -Color Red
        return $false
    }
    
    Write-ColorOutput "📦 Backing up current WSL configuration..." -Color Yellow
    
    try {
        # Create backup in Windows
        $backupPath = "$PSScriptRoot\..\configs\wsl.conf.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        
        # Try to get current config
        $currentConfig = wsl -d $distro -e cat /etc/wsl.conf 2>$null
        if ($currentConfig) {
            $currentConfig | Out-File -FilePath $backupPath -Encoding UTF8
            Write-ColorOutput "✅ Backup created: $backupPath" -Color Green
        } else {
            Write-ColorOutput "⚠️  No existing /etc/wsl.conf found (this is normal)" -Color Yellow
        }
        return $true
    }
    catch {
        Write-ColorOutput "❌ Failed to backup: $($_.Exception.Message)" -Color Red
        return $false
    }
}

function Apply-OptimizedConfig {
    $distro = Get-WSLDistribution
    if (-not $distro) {
        Write-ColorOutput "❌ No WSL distribution found" -Color Red
        return $false
    }
    
    Write-ColorOutput "🔧 Applying optimized WSL configuration..." -Color Yellow
    
    $configPath = "$PSScriptRoot\..\configs\wsl.conf.optimized"
    if (-not (Test-Path $configPath)) {
        Write-ColorOutput "❌ Optimized config file not found: $configPath" -Color Red
        return $false
    }
    
    try {
        # Copy optimized config to WSL
        $configContent = Get-Content $configPath -Raw
        
        # Create the config in WSL
        wsl -d $distro -e sudo sh -c "echo '$configContent' > /etc/wsl.conf"
        
        # Verify it was created
        $applied = wsl -d $distro -e cat /etc/wsl.conf 2>$null
        if ($applied) {
            Write-ColorOutput "✅ Optimized configuration applied successfully!" -Color Green
            return $true
        } else {
            Write-ColorOutput "❌ Failed to apply configuration" -Color Red
            return $false
        }
    }
    catch {
        Write-ColorOutput "❌ Error applying config: $($_.Exception.Message)" -Color Red
        return $false
    }
}

function Restart-WSLSafely {
    Write-ColorOutput "🔄 Restarting WSL to apply changes..." -Color Yellow
    
    try {
        # Shutdown WSL completely
        Write-Host "Shutting down WSL..."
        wsl --shutdown
        
        # Wait a moment
        Start-Sleep -Seconds 5
        
        # Start WSL again
        Write-Host "Starting WSL..."
        wsl --list --running | Out-Null
        
        # Test if it's working
        $distro = Get-WSLDistribution
        if ($distro) {
            $test = wsl -d $distro -e echo "WSL is working" 2>$null
            if ($test -eq "WSL is working") {
                Write-ColorOutput "✅ WSL restarted successfully!" -Color Green
                return $true
            }
        }
        
        Write-ColorOutput "❌ WSL restart verification failed" -Color Red
        return $false
    }
    catch {
        Write-ColorOutput "❌ Failed to restart WSL: $($_.Exception.Message)" -Color Red
        return $false
    }
}

function Show-SystemRequirements {
    Write-ColorOutput "📋 System Requirements Check" -Color Blue
    
    # Check available memory
    $totalMemGB = [math]::Round((Get-WmiObject -Class Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
    Write-Host "💾 Total System Memory: ${totalMemGB}GB"
    
    if ($totalMemGB -lt 8) {
        Write-ColorOutput "⚠️  Warning: Less than 8GB RAM detected. Consider reducing memory allocation in config." -Color Yellow
    } else {
        Write-ColorOutput "✅ Sufficient memory for Docker builds" -Color Green
    }
    
    # Check CPU cores
    $cpuCores = (Get-WmiObject -Class Win32_Processor).NumberOfCores
    Write-Host "🖥️  CPU Cores: $cpuCores"
    
    if ($cpuCores -lt 4) {
        Write-ColorOutput "⚠️  Warning: Less than 4 CPU cores. Consider reducing processor allocation in config." -Color Yellow
    } else {
        Write-ColorOutput "✅ Sufficient CPU cores for Docker builds" -Color Green
    }
}

function Show-ConfigDifferences {
    Write-ColorOutput "🔍 Configuration Improvements" -Color Blue
    Write-Host ""
    Write-ColorOutput "Current Config:" -Color Yellow
    Write-Host "  [boot]"
    Write-Host "  systemd=true"
    Write-Host "  [user]"
    Write-Host "  default=b3h"
    Write-Host ""
    
    Write-ColorOutput "Optimized Config Adds:" -Color Green
    Write-Host "  • 8GB memory allocation (prevents OOM kills)"
    Write-Host "  • 4GB swap space (handles memory spikes)"
    Write-Host "  • 4 CPU cores (faster parallel builds)"
    Write-Host "  • Better network configuration"
    Write-Host "  • Optimized file system mounting"
    Write-Host "  • Memory reclaim for efficiency"
    Write-Host "  • Kernel parameters for better containerization"
    Write-Host ""
}

# Main execution
Write-ColorOutput "🐧 WSL Docker Optimization Tool" -Color Blue
Write-ColorOutput "===============================" -Color Blue

if (-not $Apply -and -not $Backup -and -not $Restore) {
    Write-ColorOutput "Usage:" -Color White
    Write-Host "  .\optimize-wsl-docker.ps1 -Apply    # Apply optimized configuration"
    Write-Host "  .\optimize-wsl-docker.ps1 -Backup   # Backup current configuration only"
    Write-Host ""
    
    Show-SystemRequirements
    Write-Host ""
    Show-ConfigDifferences
    Write-Host ""
    Write-ColorOutput "💡 Run with -Apply to optimize your WSL configuration for Docker builds" -Color Yellow
    exit 0
}

if ($Backup) {
    if (Backup-WSLConfig) {
        Write-ColorOutput "✅ Backup completed successfully!" -Color Green
    } else {
        exit 1
    }
}

if ($Apply) {
    Write-ColorOutput "🚀 Starting WSL optimization process..." -Color Green
    
    # Check system requirements
    Show-SystemRequirements
    Write-Host ""
    
    # Backup first
    if (-not (Backup-WSLConfig)) {
        Write-ColorOutput "❌ Backup failed. Aborting optimization." -Color Red
        exit 1
    }
    
    # Apply optimized config
    if (-not (Apply-OptimizedConfig)) {
        Write-ColorOutput "❌ Configuration application failed" -Color Red
        exit 1
    }
    
    # Restart WSL
    if (-not (Restart-WSLSafely)) {
        Write-ColorOutput "❌ WSL restart failed" -Color Red
        exit 1
    }
    
    Write-ColorOutput "🎉 WSL optimization completed successfully!" -Color Green
    Write-ColorOutput "Your WSL is now optimized for Docker builds!" -Color Green
    Write-Host ""
    Write-ColorOutput "Next steps:" -Color Yellow
    Write-Host "  1. Test Docker build: cd to your project directory"
    Write-Host "  2. Run: .\scripts\docker-build-troubleshoot.ps1 build"
    Write-Host ""
}

Write-ColorOutput "Done! 🚀" -Color Green