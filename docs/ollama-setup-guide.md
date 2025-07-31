# Ollama Setup Guide for ContextCleanse LLM Assistant

This guide provides comprehensive instructions for setting up Ollama on Windows, Linux, and macOS to enable the LLM Assistant feature in ContextCleanse.

## Quick Start

### Automated Setup Scripts

We provide automated setup scripts for all platforms:

**Windows (PowerShell)**:
```powershell
# Run as Administrator (optional but recommended)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\scripts\setup-ollama.ps1
```

**Linux/macOS (Bash)**:
```bash
chmod +x scripts/setup-ollama.sh
./scripts/setup-ollama.sh
```

## Manual Installation Instructions

### Windows Installation

#### Method 1: Official Installer (Recommended)
1. **Download**: Visit https://ollama.com/download
2. **Install**: Download and run `OllamaSetup.exe`
   - No administrator privileges required
   - Installs to `%LOCALAPPDATA%\Programs\Ollama` by default
3. **Verify**: Open Command Prompt or PowerShell and run:
   ```cmd
   ollama --version
   ```

#### Method 2: Custom Installation Path
```powershell
# Download installer
$installerUrl = "https://ollama.com/download/OllamaSetup.exe"
$installerPath = "$env:TEMP\OllamaSetup.exe"
Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath

# Install to custom directory
Start-Process -FilePath $installerPath -ArgumentList "/S", "/DIR=D:\Ollama" -Wait
```

#### Starting Ollama on Windows
```powershell
# Start Ollama service
ollama serve

# Or run in background
Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
```

#### Windows Troubleshooting
- **Firewall**: Ensure Windows Firewall allows port 11434
- **Antivirus**: Some antivirus software may flag Ollama - add exception
- **PATH**: If `ollama` command not found, add installation directory to PATH
- **Admin Rights**: While not required, running as admin can resolve some issues

### Linux Installation

#### Method 1: Official Script (Recommended)
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

#### Method 2: Manual Installation
```bash
# Remove old libraries if upgrading
sudo rm -rf /usr/lib/ollama

# Download and extract (AMD64)
curl -L https://ollama.com/download/ollama-linux-amd64.tgz -o ollama-linux-amd64.tgz
sudo tar -C /usr -xzf ollama-linux-amd64.tgz

# For ARM64 systems
curl -L https://ollama.com/download/ollama-linux-arm64.tgz -o ollama-linux-arm64.tgz
sudo tar -C /usr -xzf ollama-linux-arm64.tgz
```

#### Method 3: Package Managers
```bash
# Arch Linux
sudo pacman -S ollama

# Gentoo
sudo emerge --ask app-misc/ollama

# Using Homebrew on Linux
brew install ollama
```

#### Setting up Systemd Service (Linux)
```bash
# Create service user
sudo useradd -r -s /bin/false -m -d /usr/share/ollama ollama

# Create systemd service file
sudo tee /etc/systemd/system/ollama.service > /dev/null <<EOF
[Unit]
Description=Ollama Service
After=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
User=ollama
Group=ollama
Restart=always
RestartSec=3
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
Environment="HOME=/usr/share/ollama"
WorkingDirectory=/usr/share/ollama

[Install]
WantedBy=default.target
EOF

# Start and enable service
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama
```

#### Linux Troubleshooting
- **Permissions**: Ensure user has access to `/usr/share/ollama`
- **Firewall**: Check `ufw` or `iptables` rules for port 11434
- **SELinux**: On RHEL/CentOS, may need to configure SELinux policies
- **GPU Drivers**: Install NVIDIA or AMD drivers for GPU acceleration

### macOS Installation

#### Method 1: Official DMG (Recommended)
1. **Download**: Visit https://ollama.com/download
2. **Install**: Download `ollama.dmg`
3. **Mount**: Double-click to mount the DMG
4. **Install**: Drag Ollama app to Applications folder
5. **Launch**: Open Ollama from Applications

#### Method 2: Homebrew
```bash
brew install ollama
```

#### Method 3: Manual Binary
```bash
# Download and install manually
curl -L https://ollama.com/download/ollama-darwin -o ollama
chmod +x ollama
sudo mv ollama /usr/local/bin/
```

#### Starting Ollama on macOS
The Ollama app will automatically start the service. Alternatively:
```bash
ollama serve
```

#### macOS Troubleshooting
- **Gatekeeper**: First launch may require "Allow" in Security preferences
- **PATH**: CLI may need to be linked to `/usr/local/bin/ollama`
- **Permissions**: Grant necessary permissions when prompted
- **M1/M2 Macs**: Ensure you download the ARM64 version

## Model Installation

### Recommended Models for ContextCleanse

#### Primary Model (Recommended)
```bash
# Best balance of performance and resource usage
ollama pull llama3.1:8b
```

#### Alternative Models
```bash
# Smaller, faster models
ollama pull llama3:latest        # ~4.7GB
ollama pull llama2:latest        # ~3.8GB

# Larger, more capable models (if you have resources)
ollama pull llama3.1:70b         # ~40GB
ollama pull codellama:latest     # Code-focused model
```

### Model Management
```bash
# List installed models
ollama list

# Remove a model
ollama rm model_name

# Update a model
ollama pull model_name
```

## Configuration and Testing

### API Endpoint Testing
Test your Ollama installation:

**Windows (PowerShell)**:
```powershell
# Test API availability
Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing

# Test model generation
$body = '{"model":"llama3.1:8b", "prompt":"Hello! Say OK if working.", "stream":false}'
(Invoke-WebRequest -Method POST -Body $body -Uri "http://localhost:11434/api/generate" -ContentType "application/json").Content | ConvertFrom-Json
```

**Linux/macOS (curl)**:
```bash
# Test API availability
curl http://localhost:11434/api/tags

# Test model generation
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.1:8b", "prompt":"Hello! Say OK if working.", "stream":false}'
```

### Environment Variables

#### Windows
```powershell
# Set environment variables in PowerShell
$env:OLLAMA_HOST = "0.0.0.0:11434"
$env:OLLAMA_MODELS = "D:\OllamaModels"
```

#### Linux/macOS
```bash
# Add to ~/.bashrc or ~/.zshrc
export OLLAMA_HOST="0.0.0.0:11434"
export OLLAMA_MODELS="/custom/model/path"
```

#### macOS (for App)
```bash
# Set environment variables for macOS app
launchctl setenv OLLAMA_HOST "0.0.0.0:11434"
launchctl setenv OLLAMA_MODELS "/custom/model/path"
# Restart Ollama app after setting
```

## Integration with ContextCleanse

### Automatic Detection
ContextCleanse automatically detects your operating system and configures the appropriate Ollama settings:

- **Windows**: Uses `llama3:latest` as default model
- **Linux/macOS**: Uses `llama3.1:8b` as default model
- **API URL**: `http://localhost:11434` (standard for all platforms)

### Manual Configuration
If needed, you can override the default configuration in the assistant settings.

## Troubleshooting Common Issues

### Issue: "Connection Refused" or "Service Unavailable"

**Solutions**:
1. **Check if Ollama is running**:
   ```bash
   # Check process
   ps aux | grep ollama  # Linux/macOS
   tasklist | findstr ollama  # Windows
   ```

2. **Start Ollama service**:
   ```bash
   ollama serve
   ```

3. **Check port availability**:
   ```bash
   netstat -an | grep 11434  # Linux/macOS
   netstat -an | findstr 11434  # Windows
   ```

### Issue: "Model Not Found"

**Solutions**:
1. **List available models**:
   ```bash
   ollama list
   ```

2. **Install required model**:
   ```bash
   ollama pull llama3.1:8b
   ```

### Issue: "Insufficient Memory"

**Solutions**:
1. **Check system resources**: Ensure you have at least 8GB RAM for 8B models
2. **Use smaller model**: Try `llama3:latest` or `llama2:latest`
3. **Close other applications**: Free up memory

### Issue: Slow Performance

**Solutions**:
1. **GPU Acceleration**: Install appropriate GPU drivers
2. **Model Size**: Use smaller models for faster inference
3. **System Resources**: Ensure adequate RAM and CPU

## Advanced Configuration

### Custom API Host
```bash
# Bind to all interfaces (be careful with security)
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

### Custom Model Storage
```bash
# Set custom model directory
OLLAMA_MODELS=/path/to/models ollama serve
```

### Multiple Models
You can run multiple models and switch between them in ContextCleanse:
```bash
ollama pull llama3.1:8b
ollama pull codellama:latest
ollama pull llama2:latest
```

## Security Considerations

### Network Access
- By default, Ollama only accepts connections from localhost
- Only bind to external interfaces if necessary and secure
- Consider using reverse proxy with authentication for remote access

### Model Safety
- Models run locally - no data sent to external services
- Review model capabilities and limitations
- Be aware of potential biases in model responses

## Performance Optimization

### Hardware Requirements
- **Minimum**: 8GB RAM, 4-core CPU
- **Recommended**: 16GB+ RAM, 8-core CPU, dedicated GPU
- **Storage**: At least 10GB free space for models

### GPU Acceleration
- **NVIDIA**: Ensure CUDA drivers are installed
- **AMD**: Install ROCm for Linux support
- **Apple Silicon**: Native optimization included

## Getting Help

### Resources
- **Official Docs**: https://ollama.com/docs
- **GitHub Issues**: https://github.com/ollama/ollama/issues
- **Community**: Discord and Reddit communities

### ContextCleanse Integration
- Check the Assistant page for real-time status
- Review browser console for error messages
- Use diagnostic tools in the application

---

## Quick Reference Commands

### Installation Commands
```bash
# Windows
.\scripts\setup-ollama.ps1

# Linux/macOS
./scripts/setup-ollama.sh

# Manual install (Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Manual install (macOS Homebrew)
brew install ollama
```

### Common Operations
```bash
# Start service
ollama serve

# Install model
ollama pull llama3.1:8b

# List models
ollama list

# Test API
curl http://localhost:11434/api/tags

# Remove model
ollama rm model_name
```

This comprehensive guide should help you set up Ollama successfully on any supported platform for use with ContextCleanse's LLM Assistant feature.