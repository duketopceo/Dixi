#!/bin/bash

# Kill process on a specific port
# Usage: ./scripts/kill-port.sh <PORT>

PORT=$1

if [ -z "$PORT" ]; then
    echo "Usage: ./scripts/kill-port.sh <PORT>"
    echo "Example: ./scripts/kill-port.sh 3001"
    exit 1
fi

echo "🔍 Finding process using port $PORT..."
PID=$(lsof -ti :$PORT 2>/dev/null) || true

if [ -n "$PID" ]; then
    echo "   Found process: $PID"
    echo "   Killing..."
    kill -9 $PID
    echo "✅ Process on port $PORT killed successfully"
else
    echo "✅ No process found using port $PORT"
fi
