# Quick Start Guide

## Prerequisites

- **Node.js** (v18+): https://nodejs.org/
- **Python 3** (for Vision service): https://www.python.org/
- **Ollama** (for AI): https://ollama.ai/

## Start All Services

### Mac/Linux

First, make scripts executable (one-time setup):
```bash
chmod +x start-dev.sh stop-all.sh scripts/*.sh
```

Then start all services:
```bash
./start-dev.sh
```

### Windows

```powershell
.\start-dev.ps1
```

This will open 3 terminal windows:
1. **Vision Service** (Python) - Port 5001
2. **Backend** (Node.js) - Port 3001 + WebSocket 3002
3. **Frontend** (React) - Port 3000

## Stop All Services

### Mac/Linux
```bash
./stop-all.sh
```

### Windows
```powershell
.\stop-all.ps1
```

## Run System Tests

### Mac/Linux
```bash
./scripts/test_everything.sh
```

### Windows
```powershell
.\scripts\test_everything.ps1
```

Or use npm (cross-platform):
```bash
npm run test:system
```

## Kill a Specific Port

### Mac/Linux
```bash
./scripts/kill-port.sh 3001
```

### Windows
```powershell
.\scripts\kill-port.ps1 -Port 3001
```

Or use npm (cross-platform):
```bash
npm run kill-port 3001
```

## Manual Start (if script doesn't work)

**Terminal 1 - Vision Service:**

Mac/Linux:
```bash
cd packages/vision
python3 main.py
```

Windows:
```powershell
cd packages\vision
python main.py
```

**Terminal 2 - Backend:**
```bash
cd packages/backend
npm run dev
```

**Terminal 3 - Frontend:**
```bash
cd packages/frontend
npm run dev
```

## Troubleshooting

### Backend not starting?

Check if port 3001 is already in use:

Mac/Linux:
```bash
lsof -i :3001
```

Windows:
```powershell
netstat -an | findstr 3001
```

- Make sure you're in `packages/backend` directory
- Run `npm install` if dependencies are missing

### Frontend can't connect to backend?
- Make sure backend is running on port 3001
- Check browser console for errors
- Verify `http://localhost:3001/health` responds

### Vision service not starting?

Check Python is installed:
```bash
python3 --version  # Mac/Linux
python --version   # Windows
```

Install dependencies:
```bash
pip install -r packages/vision/requirements.txt
```

### Port already in use?

Mac/Linux:
```bash
# Find and kill process on port
lsof -ti :3001 | xargs kill -9

# Or use the kill-port script
./scripts/kill-port.sh 3001
```

Windows:
```powershell
# Use the kill-port script
.\scripts\kill-port.ps1 -Port 3001
```

## Access Points

- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Backend Health**: http://localhost:3001/health
- **Vision Service**: http://localhost:5001
- **WebSocket**: ws://localhost:3002
