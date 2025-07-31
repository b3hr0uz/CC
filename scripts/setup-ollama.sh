#!/bin/bash

# Ollama Setup Script for Linux and macOS
# This script installs Ollama and sets up the LLM Assistant

set -e

# Default values
MODEL="llama3.1:8b"
FORCE=false
INSTALL_METHOD="auto"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo -e "${CYAN}$1${NC}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--model)
            MODEL="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        --method)
            INSTALL_METHOD="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -m, --model MODEL    Specify model to install (default: llama3.1:8b)"
            echo "  -f, --force          Force reinstallation even if Ollama is running"
            echo "  --method METHOD      Installation method: auto, script, manual, homebrew, package"
            echo "  -h, --help           Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)

print_header "🚀 Setting up Ollama for ContextCleanse LLM Assistant"
print_header "============================================================="
print_info "Detected OS: $OS"
print_info "Target model: $MODEL"
print_info "Installation method: $INSTALL_METHOD"

# Function to check if Ollama is running
check_ollama_service() {
    if curl -s --max-time 5 http://localhost:11434/api/tags > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Ollama on Linux
install_ollama_linux() {
    print_info "Installing Ollama on Linux..."
    
    case $INSTALL_METHOD in
        "script"|"auto")
            print_info "Using official installation script..."
            curl -fsSL https://ollama.com/install.sh | sh
            ;;
        "manual")
            print_info "Manual installation..."
            # Remove old libraries if upgrading
            sudo rm -rf /usr/lib/ollama 2>/dev/null || true
            
            # Detect architecture
            ARCH=$(uname -m)
            if [[ "$ARCH" == "x86_64" ]]; then
                DOWNLOAD_URL="https://ollama.com/download/ollama-linux-amd64.tgz"
                FILENAME="ollama-linux-amd64.tgz"
            elif [[ "$ARCH" == "aarch64" ]] || [[ "$ARCH" == "arm64" ]]; then
                DOWNLOAD_URL="https://ollama.com/download/ollama-linux-arm64.tgz"
                FILENAME="ollama-linux-arm64.tgz"
            else
                print_error "Unsupported architecture: $ARCH"
                return 1
            fi
            
            print_info "Downloading Ollama for $ARCH..."
            curl -L "$DOWNLOAD_URL" -o "$FILENAME"
            sudo tar -C /usr -xzf "$FILENAME"
            rm "$FILENAME"
            ;;
        "package")
            # Try package managers
            if command_exists pacman; then
                print_info "Installing with Pacman (Arch Linux)..."
                sudo pacman -S --noconfirm ollama
            elif command_exists emerge; then
                print_info "Installing with Portage (Gentoo)..."
                sudo emerge --ask app-misc/ollama
            elif command_exists apt-get; then
                print_warning "Ollama not available in Ubuntu/Debian repos. Using script method..."
                curl -fsSL https://ollama.com/install.sh | sh
            elif command_exists yum; then
                print_warning "Ollama not available in RHEL/CentOS repos. Using script method..."
                curl -fsSL https://ollama.com/install.sh | sh
            else
                print_error "No supported package manager found"
                return 1
            fi
            ;;
        *)
            print_error "Unknown installation method: $INSTALL_METHOD"
            return 1
            ;;
    esac
}

# Function to install Ollama on macOS
install_ollama_macos() {
    print_info "Installing Ollama on macOS..."
    
    case $INSTALL_METHOD in
        "homebrew"|"auto")
            if command_exists brew; then
                print_info "Installing with Homebrew..."
                brew install ollama
            else
                print_warning "Homebrew not found. Using manual installation..."
                install_ollama_macos_manual
            fi
            ;;
        "manual")
            install_ollama_macos_manual
            ;;
        *)
            print_error "Unknown installation method for macOS: $INSTALL_METHOD"
            return 1
            ;;
    esac
}

install_ollama_macos_manual() {
    print_info "Manual installation for macOS..."
    print_info "Please download and install Ollama manually:"
    print_info "1. Visit https://ollama.com/download"
    print_info "2. Download ollama.dmg for macOS"
    print_info "3. Mount the DMG and drag Ollama to Applications folder"
    print_info "4. Run Ollama from Applications"
    print_warning "Continuing with assumption that Ollama will be installed..."
}

# Function to start Ollama service
start_ollama_service() {
    print_info "Starting Ollama service..."
    
    if [[ "$OS" == "macos" ]]; then
        # On macOS, Ollama might be running as an app
        if pgrep -f "Ollama" > /dev/null; then
            print_status "Ollama app is already running"
            return 0
        fi
        
        # Try to start Ollama
        if command_exists ollama; then
            print_info "Starting Ollama server..."
            nohup ollama serve > /dev/null 2>&1 &
        else
            print_warning "Ollama command not found. Please make sure it's in your PATH or start the Ollama app"
            return 1
        fi
    else
        # Linux
        if command_exists systemctl && systemctl list-unit-files | grep -q ollama; then
            print_info "Starting Ollama systemd service..."
            sudo systemctl start ollama
            sudo systemctl enable ollama
        elif command_exists ollama; then
            print_info "Starting Ollama server..."
            nohup ollama serve > /dev/null 2>&1 &
        else
            print_error "Ollama not found in PATH"
            return 1
        fi
    fi
    
    # Wait for service to start
    print_info "Waiting for Ollama service to start..."
    local max_wait=30
    local waited=0
    
    while [ $waited -lt $max_wait ]; do
        if check_ollama_service; then
            print_status "Ollama service is running!"
            return 0
        fi
        sleep 2
        waited=$((waited + 2))
        echo -n "."
    done
    
    echo ""
    print_warning "Ollama service may be starting slowly. Please wait a moment and try again."
    return 1
}

# Function to install a model
install_ollama_model() {
    local model_name="$1"
    print_info "Installing model: $model_name..."
    
    if ! command_exists ollama; then
        print_error "Ollama command not found"
        return 1
    fi
    
    if ollama pull "$model_name"; then
        print_status "Model $model_name installed successfully"
        return 0
    else
        print_error "Failed to install model $model_name"
        return 1
    fi
}

# Function to test model
test_ollama_model() {
    local model_name="$1"
    print_info "Testing model: $model_name..."
    
    local response
    response=$(curl -s --max-time 30 -X POST http://localhost:11434/api/generate \
        -H "Content-Type: application/json" \
        -d "{\"model\":\"$model_name\",\"prompt\":\"Hello! Respond with just 'OK' if you're working.\",\"stream\":false}")
    
    if echo "$response" | jq -e '.response' > /dev/null 2>&1; then
        local model_response
        model_response=$(echo "$response" | jq -r '.response' | tr -d '\n' | xargs)
        print_status "Model $model_name is working correctly"
        print_header "🤖 Response: $model_response"
        return 0
    else
        print_error "Failed to test model $model_name"
        return 1
    fi
}

# Main execution
print_info "Checking current Ollama status..."

if check_ollama_service && [ "$FORCE" != true ]; then
    print_status "Ollama is already running!"
    
    # List available models
    if curl -s http://localhost:11434/api/tags | jq -e '.models' > /dev/null 2>&1; then
        print_header "📚 Available models:"
        curl -s http://localhost:11434/api/tags | jq -r '.models[] | "  • \(.name) (Modified: \(.modified_at))"'
        
        # Check if desired model exists
        local has_model
        has_model=$(curl -s http://localhost:11434/api/tags | jq -r --arg model "$MODEL" '.models[] | select(.name == $model) | .name')
        
        if [ -n "$has_model" ]; then
            print_status "Model $MODEL is already available!"
            print_status "🚀 Your LLM Assistant is ready to use!"
            exit 0
        fi
    else
        print_warning "No models found. Will install $MODEL"
    fi
else
    print_error "Ollama is not running. Installing..."
    
    # Install Ollama based on OS
    if [ "$OS" == "linux" ]; then
        if ! install_ollama_linux; then
            print_error "Installation failed. Please try manual installation from https://ollama.com"
            exit 1
        fi
    elif [ "$OS" == "macos" ]; then
        if ! install_ollama_macos; then
            print_error "Installation failed. Please try manual installation from https://ollama.com"
            exit 1
        fi
    else
        print_error "Unsupported OS: $OS"
        exit 1
    fi
    
    # Start Ollama service
    if ! start_ollama_service; then
        print_error "Failed to start Ollama service. Please try running 'ollama serve' manually."
        exit 1
    fi
fi

# Install the desired model
print_info "Installing model: $MODEL..."
if install_ollama_model "$MODEL"; then
    # Test the model
    if test_ollama_model "$MODEL"; then
        print_header "🎉 Setup completed successfully!"
        print_status "✅ Ollama is running on http://localhost:11434"
        print_status "🤖 Model $MODEL is ready"
        print_status "🚀 Your ContextCleanse LLM Assistant is now ready to use!"
    fi
else
    print_warning "Model installation failed. You can try installing it manually with:"
    print_info "   ollama pull $MODEL"
fi

echo ""
print_header "📖 Next steps:"
echo "1. Open your ContextCleanse application"
echo "2. Navigate to the Assistant page"
echo "3. The LLM Assistant should now be available!"
echo ""
print_header "🔧 Troubleshooting:"
echo "- If issues persist, run: ollama serve"
echo "- Check firewall for port 11434"
echo "- Visit http://localhost:11434 in your browser to test"

# Set up system service (Linux)
if [ "$OS" == "linux" ] && command_exists systemctl && ! systemctl list-unit-files | grep -q ollama; then
    print_info "Setting up systemd service..."
    if command_exists ollama; then
        # Create systemd service
        sudo tee /etc/systemd/system/ollama.service > /dev/null <<EOF
[Unit]
Description=Ollama Service
After=network-online.target

[Service]
ExecStart=$(which ollama) serve
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
        
        # Create ollama user
        sudo useradd -r -s /bin/false -m -d /usr/share/ollama ollama 2>/dev/null || true
        
        # Enable and start service
        sudo systemctl daemon-reload
        sudo systemctl enable ollama
        print_status "Systemd service configured"
    fi
fi