#!/bin/bash

# Stop All Dixi Services
# This script stops all running services (Docker and npm/python processes)
# Mac/Linux compatible version

# Colors for output
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Stopping All Dixi Services${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Step 1: Stop Docker Compose services
echo -e "${YELLOW}Step 1: Stopping Docker Compose services...${NC}"
if command -v docker-compose &> /dev/null; then
    docker-compose down 2>/dev/null || true
    echo -e "${GREEN}  Docker Compose services stopped${NC}"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    docker compose down 2>/dev/null || true
    echo -e "${GREEN}  Docker Compose services stopped${NC}"
else
    echo -e "${YELLOW}  Docker Compose not found, skipping...${NC}"
fi

# Step 2: Kill processes on service ports (3000, 3001, 3002, 5000)
echo ""
echo -e "${YELLOW}Step 2: Stopping processes on service ports...${NC}"

PORTS=(3000 3001 3002 5000)

for PORT in "${PORTS[@]}"; do
    # Find PIDs using lsof (Mac/Linux compatible)
    PIDS=$(lsof -ti :$PORT 2>/dev/null || true)
    
    if [ -n "$PIDS" ]; then
        for PID in $PIDS; do
            # Get process name
            PROC_NAME=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
            
            # Only kill node, npm, or python processes
            if [[ "$PROC_NAME" == *"node"* ]] || [[ "$PROC_NAME" == *"npm"* ]] || [[ "$PROC_NAME" == *"python"* ]] || [[ "$PROC_NAME" == *"Python"* ]]; then
                echo -e "${GRAY}  Stopping $PROC_NAME on port $PORT (PID: $PID)...${NC}"
                kill -9 $PID 2>/dev/null || true
            fi
        done
    fi
done

echo -e "${GREEN}  Port cleanup complete${NC}"

# Step 3: Kill any remaining node/python processes that might be related to Dixi
echo ""
echo -e "${YELLOW}Step 3: Cleaning up any remaining Dixi processes...${NC}"

# Get the script directory to check for Dixi-related processes
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Find and kill node processes in the Dixi directory
DIXI_NODE_PIDS=$(pgrep -f "node.*$SCRIPT_DIR" 2>/dev/null || true)
if [ -n "$DIXI_NODE_PIDS" ]; then
    for PID in $DIXI_NODE_PIDS; do
        echo -e "${GRAY}  Stopping Dixi node process (PID: $PID)...${NC}"
        kill -9 $PID 2>/dev/null || true
    done
fi

# Find and kill python processes in the Dixi directory
DIXI_PYTHON_PIDS=$(pgrep -f "python.*$SCRIPT_DIR" 2>/dev/null || true)
if [ -n "$DIXI_PYTHON_PIDS" ]; then
    for PID in $DIXI_PYTHON_PIDS; do
        echo -e "${GRAY}  Stopping Dixi python process (PID: $PID)...${NC}"
        kill -9 $PID 2>/dev/null || true
    done
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All Services Stopped!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${CYAN}To start services again, run:${NC}"
echo -e "${WHITE}  ./start-dev.sh${NC}"
echo -e "${WHITE}  OR${NC}"
echo -e "${WHITE}  docker-compose up${NC}"
echo ""

