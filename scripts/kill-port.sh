#!/bin/bash

# Kill process using a specific port
# Usage: ./kill-port.sh <port>
# Mac/Linux compatible version

# Colors for output
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Check if port argument is provided
if [ -z "$1" ]; then
    echo -e "${RED}Usage: $0 <port>${NC}"
    echo -e "${GRAY}Example: $0 3001${NC}"
    exit 1
fi

PORT=$1

# Validate port is a number
if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}Error: Port must be a number${NC}"
    exit 1
fi

echo -e "${CYAN}Finding process using port $PORT...${NC}"

# Find PIDs using lsof (Mac/Linux compatible)
PIDS=$(lsof -ti :$PORT 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo -e "${GREEN}✅ No process found using port $PORT${NC}"
    exit 0
fi

KILLED=false

for PID in $PIDS; do
    # Get process info
    PROC_NAME=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
    
    if [ "$PROC_NAME" != "unknown" ] && [ -n "$PROC_NAME" ]; then
        echo -e "${YELLOW}Found process: $PROC_NAME (PID: $PID)${NC}"
        echo -e "${YELLOW}Killing process...${NC}"
        
        if kill -9 $PID 2>/dev/null; then
            echo -e "${GREEN}✅ Process $PID killed successfully${NC}"
            KILLED=true
        else
            echo -e "${YELLOW}⚠️  Could not kill process $PID${NC}"
            echo -e "${GRAY}   Try running with sudo: sudo $0 $PORT${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Process with PID $PID not found (may have already exited)${NC}"
    fi
done

if [ "$KILLED" = false ]; then
    echo -e "${RED}❌ Could not kill any processes. Try running with sudo:${NC}"
    echo -e "${YELLOW}   sudo $0 $PORT${NC}"
    exit 1
fi

