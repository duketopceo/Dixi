# Quick Start Guide

## Start All Services

Run this single command:
```powershell
.\start-dev.ps1
```

This will open 3 PowerShell windows:
1. **Vision Service** (Python) - Port 5000
2. **Backend** (Node.js) - Port 3001 + WebSocket 3002
3. **Frontend** (React) - Port 3000

## Stop All Services

```powershell
.\stop-all.ps1
```

## Check Service Status

```powershell
.\check-services.ps1
```

## Manual Start (if script doesn't work)

**Terminal 1 - Vision Service:**
```powershell
cd packages\vision
python main.py
```

**Terminal 2 - Backend:**
```powershell
cd packages\backend
npm run dev
```

**Terminal 3 - Frontend:**
```powershell
cd packages\frontend
npm run dev
```

## Troubleshooting

### Backend not starting?
- Check if port 3001 is already in use: `netstat -an | findstr 3001`
- Make sure you're in `packages\backend` directory
- Run `npm install` if dependencies are missing

### Frontend can't connect to backend?
- Make sure backend is running on port 3001
- Check browser console for errors
- Verify `http://localhost:3001/health` responds

### Vision service not starting?
- Make sure Python is installed: `python --version`
- Install dependencies: `pip install -r packages\vision\requirements.txt`
- Check if camera is available (optional)

## Access Points

- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Backend Health**: http://localhost:3001/health
- **Vision Service**: http://localhost:5000
- **WebSocket**: ws://localhost:3002

