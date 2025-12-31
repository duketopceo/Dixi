#!/bin/bash

# Start Dixi App in Development Mode (without Docker)
# This starts backend, frontend, and vision service using npm/python directly
# Mac/Linux compatible version

set -e

# Colors for output
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Starting Dixi App (Development Mode)${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if Python is available
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo -e "${YELLOW}Warning: Python not found. Vision service will not start.${NC}"
    echo -e "${YELLOW}  Install Python or use Docker Compose for full service stack.${NC}"
    echo ""
fi

# Check if we're on macOS
IS_MAC=false
if [[ "$OSTYPE" == "darwin"* ]]; then
    IS_MAC=true
fi

# Function to start a service in a new terminal window (macOS) or background
start_service() {
    local name="$1"
    local dir="$2"
    local cmd="$3"
    
    if $IS_MAC; then
        # Use osascript to open a new Terminal window on macOS
        osascript <<EOF
tell application "Terminal"
    activate
    do script "cd '$dir' && echo '${name} Starting...' && $cmd"
end tell
EOF
    else
        # For Linux, use a subshell in background with output to log file
        echo -e "${GRAY}Starting $name in background...${NC}"
        (cd "$dir" && $cmd > "/tmp/dixi-${name// /-}.log" 2>&1) &
    fi
}

# Start Vision Service (Python/Flask)
VISION_PATH="$SCRIPT_DIR/packages/vision"
if [ -d "$VISION_PATH" ]; then
    echo -e "${YELLOW}Starting Vision Service on port 5001...${NC}"
    # Check for virtual environment first
    if [ -f "$VISION_PATH/venv/bin/activate" ]; then
        start_service "Vision Service" "$VISION_PATH" "source venv/bin/activate && python main.py"
    elif [ -n "$PYTHON_CMD" ]; then
        start_service "Vision Service" "$VISION_PATH" "$PYTHON_CMD main.py"
    else
        echo -e "${YELLOW}Skipping Vision Service (Python not found)...${NC}"
    fi
    sleep 2
else
    echo -e "${YELLOW}  Vision directory not found: $VISION_PATH${NC}"
fi

# Start Backend
echo -e "${YELLOW}Starting Backend on port 3001...${NC}"
BACKEND_PATH="$SCRIPT_DIR/packages/backend"
if [ -d "$BACKEND_PATH" ]; then
    start_service "Backend" "$BACKEND_PATH" "npm run dev"
    sleep 3
else
    echo -e "${YELLOW}  Backend directory not found: $BACKEND_PATH${NC}"
fi

# Start Frontend
echo -e "${YELLOW}Starting Frontend on port 3000...${NC}"
FRONTEND_PATH="$SCRIPT_DIR/packages/frontend"
if [ -d "$FRONTEND_PATH" ]; then
    start_service "Frontend" "$FRONTEND_PATH" "npm run dev"
else
    echo -e "${YELLOW}  Frontend directory not found: $FRONTEND_PATH${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Services Starting!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

if $IS_MAC; then
    echo -e "${CYAN}Three Terminal windows have opened:${NC}"
else
    echo -e "${CYAN}Services started in background. Check logs in /tmp/:${NC}"
fi

if [ -n "$PYTHON_CMD" ]; then
    echo -e "${WHITE}  - Vision Service: http://localhost:5001${NC}"
fi
echo -e "${WHITE}  - Backend: http://localhost:3001${NC}"
echo -e "${WHITE}  - Frontend: http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}Wait 10-15 seconds for services to start, then:${NC}"
echo -e "${WHITE}  Open http://localhost:3000 in your browser${NC}"
echo ""
echo -e "${CYAN}To stop all services, run: ./stop-all.sh${NC}"
if ! $IS_MAC; then
    echo -e "${GRAY}Or close the terminal windows manually${NC}"
fi
echo ""

