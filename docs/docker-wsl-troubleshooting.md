# Docker Desktop WSL Troubleshooting Guide

## 🐳 Common WSL Docker Issues & Solutions

### Issue 1: Docker Desktop Not Running

**Symptoms:**
- `unable to get image` errors
- `error during connect` messages
- `The system cannot find the file specified`

**Solutions:**

#### Option A: Start Docker Desktop (Windows GUI)
1. Press `Win + R`, type `Docker Desktop`, press Enter
2. Wait for Docker Desktop to fully start (whale icon in system tray)
3. Ensure it shows "Engine running" status

#### Option B: Start via Command Line
```bash
# From PowerShell as Administrator
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

### Issue 2: WSL Integration Not Enabled

**Fix WSL Integration:**

1. Open Docker Desktop
2. Go to Settings (gear icon)
3. Navigate to **Resources** → **WSL Integration**
4. Enable:
   - ✅ **Enable integration with my default WSL distro**
   - ✅ **Ubuntu** (or your WSL distribution)
5. Click **Apply & Restart**

### Issue 3: WSL Version Compatibility

**Check WSL Version:**
```bash
wsl --list --verbose
```

**Expected Output:**
```
  NAME      STATE           VERSION
* Ubuntu    Running         2
```

**If WSL 1, upgrade to WSL 2:**
```powershell
# Run in PowerShell as Administrator
wsl --set-version Ubuntu 2
```

### Issue 4: Docker Daemon Not Accessible

**Test Docker Connection:**
```bash
# Test basic Docker connectivity
docker version
docker info
```

**If fails, restart Docker service:**
```bash
# Option 1: Restart Docker Desktop completely
# Close Docker Desktop → Restart → Wait for engine

# Option 2: Reset Docker Desktop
# Settings → Troubleshoot → Reset to factory defaults
```

## 🛠️ Step-by-Step Setup Verification

### Step 1: Verify Docker Installation

```bash
# Check Docker is installed and running
docker --version
docker-compose --version
```

**Expected Output:**
```
Docker version 24.0.x, build...
Docker Compose version v2.x.x
```

### Step 2: Test Docker Functionality

```bash
# Test with simple container
docker run hello-world
```

**Expected:** Success message from hello-world container

### Step 3: Test WSL File System Access

```bash
# Ensure Docker can access WSL filesystem
docker run --rm -v $(pwd):/workspace alpine ls -la /workspace
```

**Expected:** List of files in current directory

### Step 4: Test Docker Compose

```bash
# Create simple test
echo 'services:
  test:
    image: alpine
    command: echo "Docker Compose works!"' > test-compose.yml

docker-compose -f test-compose.yml up
rm test-compose.yml
```

## 🚨 Advanced Troubleshooting

### Reset Docker Desktop Completely

1. Close Docker Desktop
2. Open PowerShell as Administrator:
```powershell
# Stop all Docker processes
Get-Process "*docker*" | Stop-Process -Force

# Clean Docker data (WARNING: removes all containers/images)
Remove-Item -Path "$env:APPDATA\Docker" -Recurse -Force
Remove-Item -Path "$env:LOCALAPPDATA\Docker" -Recurse -Force
```
3. Restart Docker Desktop
4. Re-enable WSL integration

### Alternative: Use Docker via Windows

If WSL continues to have issues, you can run Docker commands from Windows:

```bash
# From WSL, use Windows Docker
alias docker='docker.exe'
alias docker-compose='docker-compose.exe'

# Or use PowerShell directly
powershell.exe -Command "docker-compose up -d"
```

### Check Windows Hyper-V and Virtualization

1. **Enable Hyper-V** (if not enabled):
   - Control Panel → Programs → Windows Features
   - ✅ Hyper-V
   - Restart computer

2. **Check Virtualization in BIOS**:
   - Ensure Intel VT-x/AMD-V is enabled
   - Reboot → Enter BIOS → Enable virtualization

## 📋 Context Cleanse Specific Setup

### After Fixing Docker, Run Context Cleanse:

```bash
cd /mnt/c/Users/b3h/Documents/Repositories/CC

# Ensure environment variables are set
cp .env.example .env
# Edit .env with your OAuth credentials

# Start the services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Service Access Points:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/docs
- **Database**: localhost:5432

## 🔧 Quick Fix Commands

```bash
# Quick Docker restart sequence
docker-compose down
docker system prune -f
docker-compose up -d

# Force rebuild if needed
docker-compose up -d --build

# Check service health
docker-compose ps
docker-compose logs backend
docker-compose logs frontend
```

## 💡 Pro Tips

1. **Always use absolute paths** in WSL when mounting volumes
2. **Restart Docker Desktop** after any Windows updates
3. **Use PowerShell as Administrator** for Docker operations if WSL fails
4. **Check Windows Defender** - sometimes blocks Docker operations
5. **Ensure sufficient disk space** - Docker images can be large

## 📞 Still Not Working?

If Docker still doesn't work:

1. **Check Docker Desktop logs**:
   - Docker Desktop → Troubleshoot → View logs

2. **Use Docker without WSL**:
   - Use PowerShell/CMD directly
   - Or use GitHub Codespaces/VS Code Dev Containers

3. **Alternative development setup**:
   - Run services individually (Python backend, Node frontend)
   - Use cloud databases instead of local PostgreSQL 