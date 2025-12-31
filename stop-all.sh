#!/bin/bash

# Dixi Stop All Services Script
# Usage: ./stop-all.sh

echo "🛑 Stopping Dixi Services..."
echo ""

# Kill processes on all service ports
PORTS=(3000 3001 3002 5001)
for port in "${PORTS[@]}"; do
    pid=$(lsof -ti :$port 2>/dev/null) || true
    if [ -n "$pid" ]; then
        echo "   Stopping process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
    fi
done

# Stop any Docker containers
if command -v docker &> /dev/null; then
    if docker ps -q --filter "name=dixi" | grep -q .; then
        echo "   Stopping Docker containers..."
        docker-compose down 2>/dev/null || true
    fi
fi

echo ""
echo "✅ All Dixi services stopped."
