# Tutorial 1: Installation

Video tutorial script for installing Dixi.

## Video Duration: 5-7 minutes

## Script

### 00:00 - 00:30: Introduction

**Narration**:
"Hello! In this tutorial, we'll walk through installing Dixi, an AI-powered interactive projection system that uses gesture recognition. We'll cover all prerequisites and get Dixi running on your machine. Let's get started!"

**On-Screen Actions**:
- Show Dixi demo (gestures controlling projections)
- Display system requirements

**Screenshot**: Dixi in action with hand gestures

---

### 00:30 - 01:30: Prerequisites Check

**Narration**:
"First, let's make sure your system meets the requirements. You'll need Node.js version 20 or higher, Python 3.10 or higher, and Docker with Docker Compose. A camera is required for gesture detection, and a GPU is optional but recommended for better AI performance."

**On-Screen Actions**:
```bash
# Check Node.js
node --version  # Should be v20.x.x or higher

# Check Python
python3 --version  # Should be 3.10.x or higher

# Check Docker
docker --version
docker-compose --version

# Check camera
ls /dev/video0
```

**Screenshot**: Terminal showing all version checks passing

---

### 01:30 - 02:30: Installing Node.js

**Narration**:
"If you don't have Node.js 20, let's install it using nvm, the Node Version Manager. This is the recommended approach as it lets you easily switch between Node versions."

**On-Screen Actions**:
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node.js 20
nvm install 20
nvm use 20

# Verify
node --version
```

**Screenshot**: nvm installation complete, Node.js 20 running

---

### 02:30 - 03:30: Installing Python and System Dependencies

**Narration**:
"Next, we need Python 3.10 and some system libraries for computer vision. On Ubuntu, we'll use apt-get. If you're on macOS, use Homebrew instead."

**On-Screen Actions**:
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y \
    python3.10 \
    python3-pip \
    python3-dev \
    libopencv-dev \
    python3-opencv

# macOS
brew install python@3.10 opencv
```

**Screenshot**: Package installation progress

---

### 03:30 - 04:30: Installing Docker

**Narration**:
"Docker makes it easy to run all Dixi services in isolated containers. Let's install Docker and Docker Compose."

**On-Screen Actions**:
```bash
# Install Docker (Ubuntu)
curl -fsSL https://get.docker.com | sh

# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in
exit

# Verify
docker run hello-world
```

**Screenshot**: Docker hello-world running successfully

---

### 04:30 - 05:00: Installing Ollama

**Narration**:
"Ollama powers the AI features in Dixi. It's a simple, local AI runtime that runs models like Llama 3.2."

**On-Screen Actions**:
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull the model (this may take a few minutes)
ollama pull llama3.2:latest

# Verify
ollama list
```

**Screenshot**: Ollama downloading and installing llama3.2 model

---

### 05:00 - 06:00: Cloning and Setting Up Dixi

**Narration**:
"Now let's clone the Dixi repository and set up the environment variables."

**On-Screen Actions**:
```bash
# Clone repository
git clone https://github.com/duketopceo/Dixi.git
cd Dixi

# Create environment file
cp .env.example .env

# Open in editor
nano .env
```

**Screenshot**: Repository cloned, .env file open in editor

**On-Screen**: Show key environment variables to configure

---

### 06:00 - 06:45: Installing Dependencies

**Narration**:
"With everything set up, let's install all the project dependencies. This includes packages for the frontend, backend, and vision service."

**On-Screen Actions**:
```bash
# Install all dependencies
npm run install:all

# This runs:
# - npm install (root)
# - npm install (frontend)
# - npm install (backend)
# - pip install -r requirements.txt (vision)
```

**Screenshot**: npm installing dependencies with progress

---

### 06:45 - 07:00: Verification

**Narration**:
"Let's verify everything is installed correctly before we move to the next tutorial where we'll run Dixi for the first time!"

**On-Screen Actions**:
```bash
# Check installation
which node
which python3
which docker
which ollama

# Verify project structure
ls -la packages/
```

**Screenshot**: All commands showing successful installation

**Outro Text**: "Installation complete! Next: First Run Tutorial"

---

## Key Points to Emphasize

1. Check all prerequisites first
2. Use nvm for Node.js (recommended)
3. Ollama model download takes time
4. Camera permissions may need configuration
5. Docker requires log out/in after installation

## Common Issues to Address

1. **Permission denied on Docker**: Need to add user to docker group
2. **Ollama not in PATH**: May need to restart terminal
3. **Python version mismatch**: Use python3.10 explicitly
4. **Camera not found**: Check /dev/video0 permissions

## Next Steps

Point viewers to Tutorial 02: First Run

---

*Video tutorial script - Last updated: 2025-12-21*
