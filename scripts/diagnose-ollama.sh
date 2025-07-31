#!/bin/bash

# Ollama Diagnostic Script for ContextCleanse
# This script helps diagnose Ollama connectivity and setup issues

set -e

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

print_header "🔍 ContextCleanse Ollama Diagnostics"
print_header "======================================"

OS=$(detect_os)
print_info "Operating System: $OS"
print_info "Timestamp: $(date)"
echo ""

# System Information
print_header "📊 System Information"
echo "OS Type: $OSTYPE"
echo "Architecture: $(uname -m)"
if command_exists free; then
    echo "Memory: $(free -h | grep '^Mem:' | awk '{print $2}' | tr -d '\n') total"
elif [[ "$OS" == "macos" ]]; then
    echo "Memory: $(system_profiler SPHardwareDataType | grep "Memory:" | awk '{print $2, $3}')"
fi
echo ""

# Check Ollama Installation
print_header "🔧 Ollama Installation Check"

if command_exists ollama; then
    print_status "Ollama command found"
    OLLAMA_PATH=$(which ollama)
    print_info "Location: $OLLAMA_PATH"
    
    # Check version
    if ollama --version > /dev/null 2>&1; then
        VERSION=$(ollama --version 2>/dev/null | head -n1 || echo "Unknown")
        print_info "Version: $VERSION"
    else
        print_warning "Could not determine Ollama version"
    fi
else
    print_error "Ollama command not found in PATH"
    print_info "Installation needed - see setup instructions below"
fi
echo ""

# Check Ollama Process
print_header "🚀 Ollama Process Check"

if [[ "$OS" == "macos" ]]; then
    if pgrep -f "ollama serve" > /dev/null || pgrep -f "Ollama" > /dev/null; then
        print_status "Ollama process is running"
        OLLAMA_PID=$(pgrep -f "ollama serve" || pgrep -f "Ollama" || echo "unknown")
        print_info "Process ID: $OLLAMA_PID"
    else
        print_error "Ollama process not running"
    fi
elif [[ "$OS" == "linux" ]]; then
    if pgrep -f "ollama serve" > /dev/null; then
        print_status "Ollama process is running"
        OLLAMA_PID=$(pgrep -f "ollama serve")
        print_info "Process ID: $OLLAMA_PID"
        
        # Check if systemd service exists
        if command_exists systemctl; then
            if systemctl list-unit-files | grep -q ollama; then
                SERVICE_STATUS=$(systemctl is-active ollama 2>/dev/null || echo "inactive")
                print_info "Systemd service status: $SERVICE_STATUS"
            else
                print_info "No systemd service configured"
            fi
        fi
    else
        print_error "Ollama process not running"
        
        # Check if systemd service exists but not running
        if command_exists systemctl && systemctl list-unit-files | grep -q ollama; then
            print_warning "Systemd service exists but not active - try: sudo systemctl start ollama"
        fi
    fi
fi
echo ""

# Check Network Connectivity
print_header "🌐 Network Connectivity Check"

# Check if port 11434 is listening
if command_exists netstat; then
    if netstat -an | grep -q ":11434"; then
        print_status "Port 11434 is listening"
    else
        print_error "Port 11434 is not listening"
    fi
elif command_exists ss; then
    if ss -an | grep -q ":11434"; then
        print_status "Port 11434 is listening"
    else
        print_error "Port 11434 is not listening"
    fi
elif command_exists lsof; then
    if lsof -i :11434 > /dev/null 2>&1; then
        print_status "Port 11434 is listening"
    else
        print_error "Port 11434 is not listening"
    fi
else
    print_warning "Cannot check port status (netstat/ss/lsof not available)"
fi

# Test HTTP connectivity
print_info "Testing HTTP connectivity to Ollama API..."

HTTP_TEST_RESULT=""
if command_exists curl; then
    if HTTP_RESPONSE=$(curl -s --max-time 5 -w "%{http_code}" http://localhost:11434/api/tags 2>/dev/null); then
        HTTP_CODE="${HTTP_RESPONSE: -3}"
        if [[ "$HTTP_CODE" == "200" ]]; then
            print_status "HTTP API responding (200 OK)"
            
            # Parse and display models
            MODEL_DATA=$(echo "$HTTP_RESPONSE" | head -c -3)  # Remove HTTP code
            if command_exists jq && echo "$MODEL_DATA" | jq -e '.models' > /dev/null 2>&1; then
                MODEL_COUNT=$(echo "$MODEL_DATA" | jq '.models | length')
                print_info "Available models: $MODEL_COUNT"
                
                if [[ "$MODEL_COUNT" -gt 0 ]]; then
                    print_info "Installed models:"
                    echo "$MODEL_DATA" | jq -r '.models[] | "  • \(.name) (\(.size) bytes)"'
                else
                    print_warning "No models installed"
                fi
            else
                print_info "API responding but cannot parse model data"
            fi
        else
            print_error "HTTP API error (code: $HTTP_CODE)"
        fi
    else
        print_error "Cannot connect to HTTP API"
    fi
else
    print_warning "curl not available for HTTP testing"
fi
echo ""

# Check Firewall (basic check)
print_header "🔥 Firewall Check (Basic)"

if [[ "$OS" == "linux" ]]; then
    if command_exists ufw; then
        UFW_STATUS=$(ufw status 2>/dev/null | head -n1 || echo "inactive")
        print_info "UFW status: $UFW_STATUS"
        if ufw status | grep -q "11434"; then
            print_status "Port 11434 has UFW rules"
        else
            print_warning "No specific UFW rules for port 11434 found"
        fi
    elif command_exists firewall-cmd; then
        if firewall-cmd --state > /dev/null 2>&1; then
            print_info "Firewalld is running"
            if firewall-cmd --list-ports | grep -q "11434"; then
                print_status "Port 11434 is allowed in firewalld"
            else
                print_warning "Port 11434 not explicitly allowed in firewalld"
            fi
        else
            print_info "Firewalld not running"
        fi
    else
        print_info "No common firewall tools detected"
    fi
elif [[ "$OS" == "macos" ]]; then
    if pfctl -sr 2>/dev/null | grep -q "block"; then
        print_info "macOS firewall (pfctl) has some rules"
    else
        print_info "macOS firewall appears to be permissive"
    fi
fi
echo ""

# Model Recommendations
print_header "🤖 Model Recommendations"

if command_exists ollama && ollama list > /dev/null 2>&1; then
    CURRENT_MODELS=$(ollama list | tail -n +2 | awk '{print $1}' | grep -v '^$' || true)
    
    if [[ -n "$CURRENT_MODELS" ]]; then
        print_status "Current models installed:"
        echo "$CURRENT_MODELS" | while read -r model; do
            echo "  • $model"
        done
    else
        print_warning "No models currently installed"
    fi
    
    print_info "Recommended models for ContextCleanse:"
    echo "  • llama3.1:8b (Best balance - ~4.7GB)"
    echo "  • llama3:latest (Alternative - ~4.7GB)"
    echo "  • llama2:latest (Lighter option - ~3.8GB)"
    
    # Check if recommended model exists
    if echo "$CURRENT_MODELS" | grep -q "llama3.1:8b"; then
        print_status "Recommended model (llama3.1:8b) is installed"
    elif echo "$CURRENT_MODELS" | grep -q "llama3:latest"; then
        print_status "Alternative model (llama3:latest) is installed"
    else
        print_warning "No recommended models installed"
        print_info "Install with: ollama pull llama3.1:8b"
    fi
else
    print_warning "Cannot check installed models"
fi
echo ""

# Performance Test
print_header "⚡ Performance Test"

if HTTP_RESPONSE=$(curl -s --max-time 5 http://localhost:11434/api/tags 2>/dev/null) && echo "$HTTP_RESPONSE" | jq -e '.models[0]' > /dev/null 2>&1; then
    FIRST_MODEL=$(echo "$HTTP_RESPONSE" | jq -r '.models[0].name')
    print_info "Testing inference with model: $FIRST_MODEL"
    
    START_TIME=$(date +%s)
    TEST_RESPONSE=$(curl -s --max-time 30 -X POST http://localhost:11434/api/generate \
        -H "Content-Type: application/json" \
        -d "{\"model\":\"$FIRST_MODEL\",\"prompt\":\"Hello\",\"stream\":false}" 2>/dev/null || echo "")
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    if [[ -n "$TEST_RESPONSE" ]] && echo "$TEST_RESPONSE" | jq -e '.response' > /dev/null 2>&1; then
        print_status "Inference test successful (${DURATION}s)"
        RESPONSE_TEXT=$(echo "$TEST_RESPONSE" | jq -r '.response' | tr -d '\n' | cut -c1-50)
        print_info "Response preview: $RESPONSE_TEXT..."
    else
        print_error "Inference test failed"
    fi
else
    print_warning "Cannot perform inference test (no models or API unavailable)"
fi
echo ""

# Summary and Recommendations
print_header "📋 Summary and Recommendations"

# Determine overall status
ISSUES_FOUND=0

if ! command_exists ollama; then
    print_error "ISSUE: Ollama not installed"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if ! pgrep -f "ollama" > /dev/null 2>&1; then
    print_error "ISSUE: Ollama not running"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if ! curl -s --max-time 5 http://localhost:11434/api/tags > /dev/null 2>&1; then
    print_error "ISSUE: API not accessible"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if command_exists ollama && ollama list 2>/dev/null | grep -q "NAME"; then
    MODEL_COUNT=$(ollama list 2>/dev/null | tail -n +2 | grep -c "." || echo "0")
    if [[ "$MODEL_COUNT" -eq 0 ]]; then
        print_warning "ISSUE: No models installed"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
fi

echo ""
if [[ $ISSUES_FOUND -eq 0 ]]; then
    print_status "🎉 Ollama appears to be working correctly!"
    print_info "ContextCleanse LLM Assistant should be functional"
else
    print_error "Found $ISSUES_FOUND issue(s) that need attention"
    
    print_header "🔧 Suggested Actions:"
    
    if ! command_exists ollama; then
        case $OS in
            "macos")
                echo "1. Install Ollama: brew install ollama"
                echo "   Or download from: https://ollama.com/download"
                ;;
            "linux")
                echo "1. Install Ollama: curl -fsSL https://ollama.com/install.sh | sh"
                ;;
            *)
                echo "1. Install Ollama from: https://ollama.com/download"
                ;;
        esac
    fi
    
    if ! pgrep -f "ollama" > /dev/null 2>&1; then
        echo "2. Start Ollama: ollama serve"
        if [[ "$OS" == "linux" ]] && command_exists systemctl; then
            echo "   Or: sudo systemctl start ollama"
        fi
    fi
    
    if command_exists ollama && ollama list 2>/dev/null | grep -q "NAME"; then
        MODEL_COUNT=$(ollama list 2>/dev/null | tail -n +2 | grep -c "." || echo "0")
        if [[ "$MODEL_COUNT" -eq 0 ]]; then
            echo "3. Install a model: ollama pull llama3.1:8b"
        fi
    fi
    
    echo "4. Check firewall settings for port 11434"
    echo "5. Review docs/ollama-setup-guide.md for detailed instructions"
fi

echo ""
print_header "🔗 Useful Links:"
echo "• Setup Guide: docs/ollama-setup-guide.md"
echo "• Ollama Documentation: https://ollama.com/docs"
echo "• ContextCleanse Issues: [Your GitHub Issues URL]"

echo ""
print_info "Run this diagnostic script again after making changes to verify fixes"