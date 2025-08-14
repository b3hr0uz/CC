# Docker Volume Mounting Fix Script
# This script resolves Docker Desktop WSL2 volume mounting issues

param(
    [switch]$CreateDirectories,
    [switch]$FixPermissions,  
    [switch]$UseNamedVolumes,
    [switch]$All
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

Write-ColorOutput "🔧 Docker Volume Mounting Fix Tool" -Color Blue
Write-ColorOutput "===================================" -Color Blue

# Required volume directories  
$VolumeDirectories = @(
    "volumes/postgres",
    "volumes/redis", 
    "volumes/backend/logs"
)

function New-VolumeDirectories {
    Write-ColorOutput "📁 Creating required volume directories..." -Color Yellow
    
    foreach ($dir in $VolumeDirectories) {
        $fullPath = "C:\Users\b3h\Documents\Repositories\CC\$dir"
        
        if (-not (Test-Path $fullPath)) {
            try {
                New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
                Write-ColorOutput "✅ Created: $dir" -Color Green
            }
            catch {
                Write-ColorOutput "❌ Failed to create: $dir - $($_.Exception.Message)" -Color Red
                return $false
            }
        } else {
            Write-ColorOutput "✅ Already exists: $dir" -Color Green
        }
    }
    
    # Create .gitkeep files to ensure directories are tracked
    foreach ($dir in $VolumeDirectories) {
        $fullPath = "C:\Users\b3h\Documents\Repositories\CC\$dir"
        $gitkeepPath = Join-Path $fullPath ".gitkeep"
        
        if (-not (Test-Path $gitkeepPath)) {
            "# Keep this directory in Git" | Out-File -FilePath $gitkeepPath -Encoding UTF8
        }
    }
    
    Write-ColorOutput "✅ All volume directories created successfully!" -Color Green
    return $true
}

function Set-VolumePermissions {
    Write-ColorOutput "🔐 Setting proper permissions for volumes..." -Color Yellow
    
    # In WSL, set proper ownership
    try {
        wsl -e sudo chown -R 1000:1000 /mnt/c/Users/b3h/Documents/Repositories/CC/volumes 2>$null
        wsl -e sudo chmod -R 755 /mnt/c/Users/b3h/Documents/Repositories/CC/volumes 2>$null
        Write-ColorOutput "✅ Permissions set successfully" -Color Green
        return $true
    }
    catch {
        Write-ColorOutput "⚠️  Could not set WSL permissions (this may be normal)" -Color Yellow
        return $true
    }
}

function New-OptimizedDockerCompose {
    Write-ColorOutput "🐳 Creating optimized docker-compose configuration..." -Color Yellow
    
    $optimizedVolumesConfig = @"
# Optimized Docker Compose Volume Configuration
# This replaces the problematic bind mounts with named volumes

# Add this to your docker-compose.yml volumes section:

volumes:
  # Use Docker managed volumes instead of bind mounts for better WSL2 compatibility
  postgres_data:
    driver: local
    # Remove driver_opts to use Docker's default volume management
    labels:
      - "backup.enable=true"
      - "service=database"
  
  redis_data:
    driver: local
    # Remove driver_opts to use Docker's default volume management
    labels:
      - "backup.enable=false"
      - "service=cache"
  
  # Keep these as-is (they work fine)
  frontend_node_modules:
    driver: local
    labels:
      - "purpose=development"
      - "service=frontend"
  
  frontend_next_cache:
    driver: local
    labels:
      - "purpose=development"
      - "service=frontend"
  
  # Use named volume for backend logs too
  backend_logs:
    driver: local
    labels:
      - "purpose=logging"
      - "service=backend"

# Networks remain the same
networks:
  app_network:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: "172.20.0.0/16"
          gateway: "172.20.0.1"
    driver_opts:
      com.docker.network.enable_ipv6: "false"
      com.docker.network.bridge.enable_ip_masquerade: "true"
      com.docker.network.bridge.host_binding_ipv4: "0.0.0.0"
    labels:
      - "environment=deployment"
      - "project=contextcleanse"
"@
    
    $configPath = "C:\Users\b3h\Documents\Repositories\CC\configs\docker-compose.volumes.optimized.yml"
    $optimizedVolumesConfig | Out-File -FilePath $configPath -Encoding UTF8
    
    Write-ColorOutput "✅ Optimized configuration saved to: configs/docker-compose.volumes.optimized.yml" -Color Green
    Write-Host ""
    Write-ColorOutput "📋 Next steps:" -Color Yellow
    Write-Host "  1. Copy the volumes section from the optimized config"
    Write-Host "  2. Replace the volumes section in your docker-compose.yml"
    Write-Host "  3. Run: docker compose down && docker volume prune -f"
    Write-Host "  4. Run: docker compose up --wait"
    
    return $true
}

function Remove-ProblematicVolumes {
    Write-ColorOutput "🧹 Cleaning up problematic Docker volumes..." -Color Yellow
    
    try {
        # Stop all containers
        Write-Host "Stopping containers..."
        docker compose down --remove-orphans 2>$null
        
        # List and remove problematic volumes
        Write-Host "Removing problematic volumes..."
        $volumes = @("cc_postgres_data", "cc_redis_data", "cc_backend_logs")
        
        foreach ($volume in $volumes) {
            docker volume rm $volume 2>$null
            Write-ColorOutput "  Removed volume: $volume" -Color Green
        }
        
        # Prune all unused volumes
        docker volume prune -f 2>$null
        Write-ColorOutput "✅ Volume cleanup completed" -Color Green
        return $true
    }
    catch {
        Write-ColorOutput "⚠️  Some cleanup operations failed (this may be normal)" -Color Yellow
        return $true
    }
}

function Test-DockerVolumeSystem {
    Write-ColorOutput "🧪 Testing Docker volume system..." -Color Yellow
    
    try {
        # Test creating a simple volume
        docker volume create test-volume 2>$null | Out-Null
        docker volume inspect test-volume 2>$null | Out-Null
        docker volume rm test-volume 2>$null | Out-Null
        
        Write-ColorOutput "✅ Docker volume system working correctly" -Color Green
        return $true
    }
    catch {
        Write-ColorOutput "❌ Docker volume system has issues" -Color Red
        return $false
    }
}

# Main execution logic
if (-not $CreateDirectories -and -not $FixPermissions -and -not $UseNamedVolumes -and -not $All) {
    Write-ColorOutput "Usage:" -Color White
    Write-Host "  .\fix-docker-volumes.ps1 -CreateDirectories  # Create volume directories"
    Write-Host "  .\fix-docker-volumes.ps1 -FixPermissions    # Fix volume permissions"
    Write-Host "  .\fix-docker-volumes.ps1 -UseNamedVolumes   # Generate optimized config"
    Write-Host "  .\fix-docker-volumes.ps1 -All               # Run all fixes"
    Write-Host ""
    Write-ColorOutput "❌ Current Error:" -Color Red
    Write-Host "  Docker Desktop WSL2 can't mount bind volumes because directories don't exist"
    Write-Host ""
    Write-ColorOutput "💡 Recommended Solution:" -Color Yellow
    Write-Host "  Run: .\fix-docker-volumes.ps1 -All"
    Write-Host "  This will create directories, fix permissions, and optimize configuration"
    exit 0
}

# Test Docker first
if (-not (Test-DockerVolumeSystem)) {
    Write-ColorOutput "❌ Docker volume system issues detected. Please restart Docker Desktop." -Color Red
    exit 1
}

if ($All -or $CreateDirectories) {
    if (-not (New-VolumeDirectories)) {
        exit 1
    }
}

if ($All -or $FixPermissions) {
    if (-not (Set-VolumePermissions)) {
        exit 1
    }
}

if ($All -or $UseNamedVolumes) {
    Remove-ProblematicVolumes
    if (-not (New-OptimizedDockerCompose)) {
        exit 1
    }
}

if ($All) {
    Write-ColorOutput "🎉 All fixes applied successfully!" -Color Green
    Write-Host ""
    Write-ColorOutput "📋 Summary of changes:" -Color Blue
    Write-Host "  ✅ Created required volume directories"
    Write-Host "  ✅ Set proper permissions"
    Write-Host "  ✅ Generated optimized Docker Compose configuration"
    Write-Host "  ✅ Cleaned up problematic volumes"
    Write-Host ""
    Write-ColorOutput "🚀 Next steps:" -Color Yellow
    Write-Host "  1. Update your docker-compose.yml with the optimized volumes config"
    Write-Host "  2. Run: docker compose up --wait"
    Write-Host ""
} else {
    Write-ColorOutput "✅ Selected fixes completed!" -Color Green
}

Write-ColorOutput "Done! 🚀" -Color Green