#!/bin/bash

# Dixi Development Server Startup Script
# Usage: ./start-dev.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting Dixi Development Environment..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Kill any existing processes on our ports
echo "🔄 Cleaning up existing processes..."
for port in 3000 3001 3002 5001; do
    pid=$(lsof -ti :$port 2>/dev/null) || true
    if [ -n "$pid" ]; then
        echo "   Killing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
    fi
done
sleep 1

# Check for required dependencies
echo ""
echo "📦 Checking dependencies..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi
echo "   ✅ Node.js $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi
echo "   ✅ npm $(npm --version)"

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "⚠️  Python not found. Vision service will not start."
    PYTHON_CMD=""
fi
if [ -n "$PYTHON_CMD" ]; then
    echo "   ✅ Python $($PYTHON_CMD --version 2>&1 | cut -d' ' -f2)"
fi

# Check Ollama
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "   ✅ Ollama running"
else
    echo "   ⚠️  Ollama not running (AI will use fallback or fail)"
fi

echo ""
echo "🏗️  Starting services..."

# Start Backend (in background)
echo -e "${CYAN}   Starting Backend (port 3001)...${NC}"
cd "$SCRIPT_DIR/packages/backend"
npm run dev > /dev/null 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Start Frontend (in background)
echo -e "${CYAN}   Starting Frontend (port 3000)...${NC}"
cd "$SCRIPT_DIR/packages/frontend"
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# Start Vision Service (in background)
if [ -n "$PYTHON_CMD" ]; then
    echo -e "${CYAN}   Starting Vision Service (port 5001)...${NC}"
    cd "$SCRIPT_DIR/packages/vision"
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    $PYTHON_CMD main.py > /dev/null 2>&1 &
    VISION_PID=$!
    echo "   Vision PID: $VISION_PID"
fi

cd "$SCRIPT_DIR"

# Wait for services to start
echo ""
echo "⏳ Waiting for services to initialize..."
sleep 3

# Check service status
echo ""
echo "📊 Service Status:"

# Check Backend
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Backend:  http://localhost:3001${NC}"
else
    echo -e "   ${YELLOW}⏳ Backend:  Starting...${NC}"
fi

# Check Frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Frontend: http://localhost:3000${NC}"
else
    echo -e "   ${YELLOW}⏳ Frontend: Starting...${NC}"
fi

# Check Vision
if [ -n "$PYTHON_CMD" ]; then
    if curl -s http://localhost:5001/health > /dev/null 2>&1; then
        echo -e "   ${GREEN}✅ Vision:   http://localhost:5001${NC}"
    else
        echo -e "   ${YELLOW}⏳ Vision:   Starting...${NC}"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Dixi is starting!${NC}"
echo ""
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo "   Vision:   http://localhost:5001"
echo ""
echo "   Press Ctrl+C to stop all services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Wait for user interrupt
wait
