# Troubleshooting Guide

Complete troubleshooting guide for the Dixi interactive projection system.

## Table of Contents

- [Quick Diagnostics Script](#quick-diagnostics-script)
- [Installation Issues](#installation-issues)
- [Camera Issues](#camera-issues)
- [Ollama Connection Issues](#ollama-connection-issues)
- [WebSocket Connection Issues](#websocket-connection-issues)
- [Port Conflicts](#port-conflicts)
- [High Latency Debugging](#high-latency-debugging)
- [Memory Leak Detection](#memory-leak-detection)
- [Frontend Issues](#frontend-issues)
- [Docker Container Problems](#docker-container-problems)
- [Vision Service Issues](#vision-service-issues)
- [Performance Profiling](#performance-profiling)
- [Error Code Reference](#error-code-reference)
- [How to Get Help](#how-to-get-help)

---

## Quick Diagnostics Script

Run this script first to gather system information:

```bash
#!/bin/bash
# dixi-diagnostics.sh

echo "===== Dixi Diagnostics ====="
echo "Date: $(date)"
echo ""

echo "=== System Information ==="
uname -a
echo "CPU: $(lscpu | grep 'Model name' | cut -d ':' -f 2 | xargs)"
echo "Memory: $(free -h | awk '/^Mem:/ {print $2}')"
echo "GPU: $(lspci | grep -i vga)"
echo ""

echo "=== Docker Status ==="
docker --version
docker-compose --version
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "=== Port Status ==="
echo "Port 3001 (Backend):"
nc -zv localhost 3001 2>&1
echo "Port 5000 (Vision):"
nc -zv localhost 5000 2>&1
echo "Port 5173 (Frontend):"
nc -zv localhost 5173 2>&1
echo "Port 11434 (Ollama):"
nc -zv localhost 11434 2>&1
echo ""

echo "=== Service Health ==="
echo "Backend:"
curl -s http://localhost:3001/api/health | jq '.'
echo "Vision:"
curl -s http://localhost:5000/health | jq '.'
echo "Ollama:"
curl -s http://localhost:11434/api/tags | jq '.models | length'
echo ""

echo "=== Camera Devices ==="
ls -l /dev/video* 2>&1
echo ""

echo "=== Recent Errors ==="
echo "Backend errors (last 10):"
docker logs dixi-backend 2>&1 | grep -i error | tail -10
echo "Vision errors (last 10):"
docker logs dixi-vision 2>&1 | grep -i error | tail -10
echo ""

echo "=== Resource Usage ==="
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
echo ""

echo "===== Diagnostics Complete ====="
```

**Usage**:
```bash
chmod +x dixi-diagnostics.sh
./dixi-diagnostics.sh > diagnostics-output.txt
```

---

## Installation Issues

### Issue: `npm install` fails with permission errors

**Symptoms**:
```
EACCES: permission denied, mkdir '/usr/local/lib/node_modules'
```

**Solutions**:

1. **Use nvm (Recommended)**:
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js
nvm install 20
nvm use 20

# Try again
npm install
```

2. **Fix npm permissions**:
```bash
# Change npm default directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

---

### Issue: Python dependencies fail to install

**Symptoms**:
```
ERROR: Could not build wheels for opencv-python
```

**Solutions**:

1. **Install system dependencies**:
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y python3-dev python3-pip
sudo apt-get install -y libopencv-dev python3-opencv
sudo apt-get install -y build-essential cmake

# macOS
brew install opencv python@3.10
```

2. **Use pre-built wheels**:
```bash
pip install --only-binary :all: opencv-python mediapipe
```

3. **Upgrade pip**:
```bash
pip install --upgrade pip setuptools wheel
```

---

### Issue: MediaPipe model file not found

**Symptoms**:
```
ERROR: Model file not found at packages/vision/hand_landmarker.task
```

**Solutions**:

```bash
# Download model file
cd packages/vision
wget https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task

# Verify file exists
ls -lh hand_landmarker.task
# Should be ~9-10 MB
```

---

### Issue: Docker build fails

**Symptoms**:
```
ERROR [internal] load metadata for docker.io/library/node:20
```

**Solutions**:

1. **Check Docker daemon**:
```bash
sudo systemctl status docker
sudo systemctl start docker
```

2. **Check internet connection**:
```bash
ping -c 3 docker.io
```

3. **Use cache**:
```bash
docker-compose build --no-cache
```

---

## Camera Issues

### Issue: Camera not detected

**Symptoms**:
```
ERROR: Camera unavailable - No camera device found
```

**Diagnostic Steps**:

1. **Check camera device**:
```bash
# List video devices
ls -l /dev/video*

# Check camera with v4l2
sudo apt-get install v4l-utils
v4l2-ctl --list-devices

# Test camera
ffplay /dev/video0
```

2. **Check permissions**:
```bash
# Add user to video group
sudo usermod -a -G video $USER

# Restart session
exit  # and log back in
```

3. **Docker camera access**:
```bash
# Verify Docker can access camera
docker run --device=/dev/video0 -it alpine ls -l /dev/video0
```

**Solutions**:

1. **Grant Docker access**:
```yaml
# docker-compose.yml
services:
  vision:
    devices:
      - /dev/video0:/dev/video0
    privileged: true  # if above doesn't work
```

2. **Use external camera**:
```bash
# Find external camera
v4l2-ctl --list-devices

# Update device in docker-compose.yml
devices:
  - /dev/video1:/dev/video0  # if external is video1
```

3. **Simulation mode** (for testing without camera):
```python
# packages/vision/main.py
USE_SIMULATION = True  # Add this flag
```

---

### Issue: Camera shows black screen

**Symptoms**:
- Camera detected but shows no image
- Frame capture returns None

**Solutions**:

1. **Check camera is not in use**:
```bash
# Find processes using camera
lsof /dev/video0

# Kill conflicting process
kill -9 <PID>
```

2. **Check camera format**:
```bash
v4l2-ctl --device=/dev/video0 --list-formats-ext

# Set specific format if needed
v4l2-ctl --device=/dev/video0 --set-fmt-video=width=1280,height=720,pixelformat=MJPG
```

3. **Test with different resolution**:
```python
# In vision service
camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
```

---

### Issue: Low frame rate

**Symptoms**:
- FPS below 20
- Choppy gesture detection

**Solutions**:

1. **Reduce resolution**:
```python
camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
```

2. **Check CPU usage**:
```bash
top -p $(pgrep -f "python.*main.py")
```

3. **Use GPU acceleration**:
```python
# Install OpenCV with CUDA support
pip install opencv-contrib-python-headless
```

---

## Ollama Connection Issues

### Issue: "Connection refused" to Ollama

**Symptoms**:
```
ERROR: Failed to connect to Ollama at http://localhost:11434
```

**Diagnostic Steps**:

1. **Check if Ollama is running**:
```bash
# Check process
ps aux | grep ollama

# Check port
nc -zv localhost 11434
```

2. **Check Ollama status**:
```bash
ollama list
ollama ps
```

**Solutions**:

1. **Start Ollama**:
```bash
# Start service
ollama serve

# Or as systemd service
sudo systemctl start ollama
sudo systemctl enable ollama
```

2. **Check firewall**:
```bash
sudo ufw status
sudo ufw allow 11434/tcp
```

3. **Fix Docker networking**:
```yaml
# docker-compose.yml
services:
  backend:
    environment:
      - OLLAMA_BASE_URL=http://host.docker.internal:11434
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

---

### Issue: Model not found

**Symptoms**:
```
ERROR: model 'llama3.2:latest' not found
```

**Solutions**:

1. **Pull model**:
```bash
ollama pull llama3.2:latest

# Check available models
ollama list
```

2. **Use different model**:
```bash
# Pull smaller model
ollama pull llama3.2:3b

# Update environment variable
MODEL_PATH=llama3.2:3b
```

3. **Check disk space**:
```bash
df -h
# Models are typically 3-7 GB
```

---

### Issue: Slow AI inference

**Symptoms**:
- AI responses take > 5 seconds
- High CPU usage during inference

**Solutions**:

1. **Use smaller model**:
```bash
ollama pull llama3.2:3b
# 3B model is 4x faster than 7B
```

2. **Enable GPU**:
```bash
# Check GPU
nvidia-smi

# Ollama automatically uses GPU if available
```

3. **Increase model concurrency**:
```bash
export OLLAMA_NUM_PARALLEL=2
export OLLAMA_MAX_LOADED_MODELS=2
```

---

## WebSocket Connection Issues

### Issue: WebSocket connection fails

**Symptoms**:
```
WebSocket connection to 'ws://localhost:3001' failed
```

**Diagnostic Steps**:

1. **Check backend is running**:
```bash
curl http://localhost:3001/api/health
```

2. **Test WebSocket manually**:
```bash
# Install wscat
npm install -g wscat

# Test connection
wscat -c ws://localhost:3001
```

**Solutions**:

1. **Check CORS configuration**:
```typescript
// Backend index.ts
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});
```

2. **Check reverse proxy**:
```nginx
# nginx.conf
location / {
    proxy_pass http://backend:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

3. **Firewall rules**:
```bash
sudo ufw allow 3001/tcp
```

---

### Issue: WebSocket disconnects frequently

**Symptoms**:
- Connection drops every few minutes
- "Connection closed" errors

**Solutions**:

1. **Enable heartbeat**:
```typescript
// Frontend
const ws = new WebSocket('ws://localhost:3001');
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping' }));
  }
}, 30000);
```

2. **Increase timeout**:
```typescript
// Backend
const server = createServer(app);
server.timeout = 300000; // 5 minutes
```

3. **Auto-reconnect**:
```typescript
// Frontend
class ReconnectingWebSocket {
  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onclose = () => {
      setTimeout(() => this.connect(), 1000);
    };
  }
}
```

---

## Port Conflicts

### Issue: "Address already in use"

**Symptoms**:
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Diagnostic Steps**:

```bash
# Find process using port
lsof -i :3001
netstat -tulpn | grep 3001

# Check all Dixi ports
for port in 3001 5000 5173 11434; do
  echo "Port $port:"
  lsof -i :$port
done
```

**Solutions**:

1. **Kill conflicting process**:
```bash
# Find PID
PID=$(lsof -ti :3001)

# Kill process
kill -9 $PID
```

2. **Use different port**:
```bash
# .env
PORT=3002  # instead of 3001

# Or via command line
PORT=3002 npm start
```

3. **Stop Docker containers**:
```bash
docker-compose down
docker ps -a | grep dixi | awk '{print $1}' | xargs docker rm -f
```

---

## High Latency Debugging

### Issue: End-to-end latency > 150ms

**Diagnostic Steps**:

1. **Measure each stage**:
```bash
# Camera capture rate
# Should be ~30 FPS (33ms per frame)
docker logs dixi-vision 2>&1 | grep "FPS:"

# Backend response time
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/api/health

# Create curl-format.txt:
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n
```

2. **Check network latency**:
```bash
# Ping backend
ping -c 10 localhost

# Check Docker network
docker network inspect dixi-network
```

**Solutions**:

1. **Reduce camera resolution**:
```python
# packages/vision/main.py
camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
```

2. **Optimize MediaPipe**:
```python
options = vision.HandLandmarkerOptions(
    num_hands=1,  # Reduce from 2
    min_hand_detection_confidence=0.5,  # Lower threshold
    min_hand_presence_confidence=0.5,
    min_tracking_confidence=0.5,
)
```

3. **Enable caching**:
```typescript
// Backend - implement LRU cache for AI responses
import LRU from 'lru-cache';
const cache = new LRU({ max: 100, ttl: 60000 });
```

---

## Memory Leak Detection

### Issue: Memory usage grows over time

**Symptoms**:
- Docker container memory increases
- System becomes slow after hours of use
- Out of memory errors

**Diagnostic Steps**:

1. **Monitor memory**:
```bash
# Watch Docker memory
watch -n 1 'docker stats --no-stream'

# Node.js heap snapshot
node --expose-gc --inspect packages/backend/dist/index.js
```

2. **Check for leaks**:
```bash
# Install clinic
npm install -g clinic

# Profile backend
clinic doctor -- node packages/backend/dist/index.js
```

**Solutions**:

1. **Add memory limits**:
```yaml
# docker-compose.yml
services:
  backend:
    mem_limit: 1g
    memswap_limit: 1g
```

2. **Implement garbage collection**:
```typescript
// Backend index.ts
if (global.gc) {
  setInterval(() => {
    global.gc();
  }, 60000); // Every minute
}
```

3. **Clear history arrays**:
```typescript
// Limit history size
const MAX_HISTORY = 100;
if (gestureHistory.length > MAX_HISTORY) {
  gestureHistory.shift();
}
```

---

## Frontend Issues

### Issue: Camera feed not showing

**Symptoms**:
- Blank canvas
- No gesture indicators

**Solutions**:

1. **Check API connection**:
```javascript
// Browser console
fetch('http://localhost:3001/api/health')
  .then(r => r.json())
  .then(console.log);
```

2. **Check WebSocket**:
```javascript
// Browser console
const ws = new WebSocket('ws://localhost:3001');
ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Message:', e.data);
ws.onerror = (e) => console.error('Error:', e);
```

3. **Clear browser cache**:
```
Ctrl+Shift+R (force refresh)
or
Ctrl+Shift+Delete (clear cache)
```

---

### Issue: Gesture not triggering UI update

**Symptoms**:
- Gestures detected but UI doesn't update
- Console shows gesture data but no visual change

**Solutions**:

1. **Check Zustand store**:
```javascript
// Browser console
import { useGestureStore } from './store/gestureStore';
console.log(useGestureStore.getState());
```

2. **Verify WebSocket messages**:
```javascript
// Browser console - log all WS messages
const ws = new WebSocket('ws://localhost:3001');
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  console.log('WS Message:', msg);
};
```

3. **Check React DevTools**:
- Install React DevTools extension
- Inspect component state
- Check if components are re-rendering

---

### Issue: Three.js canvas not rendering

**Symptoms**:
- Black screen where 3D scene should be
- Console errors about WebGL

**Solutions**:

1. **Check WebGL support**:
```javascript
// Browser console
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
console.log('WebGL supported:', !!gl);
```

2. **Enable WebGL in browser**:
- Chrome: `chrome://flags/#ignore-gpu-blocklist`
- Firefox: `about:config` → `webgl.force-enabled = true`

3. **Use software renderer**:
```jsx
// App.tsx
<Canvas gl={{ powerPreference: "default" }}>
  ...
</Canvas>
```

---

## Docker Container Problems

### Issue: Container won't start

**Symptoms**:
```
ERROR: Container exited with code 1
```

**Diagnostic Steps**:

```bash
# Check container logs
docker logs dixi-backend
docker logs dixi-vision
docker logs dixi-frontend

# Check container inspect
docker inspect dixi-backend | jq '.[0].State'
```

**Solutions**:

1. **Check environment variables**:
```bash
docker exec dixi-backend env
```

2. **Rebuild containers**:
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

3. **Check health status**:
```bash
docker ps
# Look for "(healthy)" or "(unhealthy)" status
```

---

### Issue: Container keeps restarting

**Symptoms**:
- Container status shows "Restarting"
- Logs show repeated startup messages

**Solutions**:

1. **Check logs for errors**:
```bash
docker logs --tail 100 dixi-backend
```

2. **Disable restart policy temporarily**:
```yaml
# docker-compose.yml
services:
  backend:
    restart: "no"  # instead of "always"
```

3. **Run interactively**:
```bash
docker run -it --entrypoint /bin/bash dixi-backend
# Debug inside container
```

---

## Vision Service Issues

### Issue: No gesture detection

**Symptoms**:
- Camera works but no gestures detected
- Always returns "unknown" gesture

**Solutions**:

1. **Lower confidence threshold**:
```python
options = vision.HandLandmarkerOptions(
    min_hand_detection_confidence=0.5,  # Lower from 0.7
    min_hand_presence_confidence=0.3,   # Lower from 0.5
)
```

2. **Check lighting**:
- Ensure good lighting on hands
- Avoid backlighting
- Use solid background

3. **Verify model loaded**:
```python
if not self.landmarker:
    print("ERROR: Model not loaded!")
```

---

### Issue: False gesture detections

**Symptoms**:
- Random gestures detected
- Gestures detected when no hands present

**Solutions**:

1. **Increase confidence threshold**:
```python
options = vision.HandLandmarkerOptions(
    min_hand_detection_confidence=0.8,
    min_hand_presence_confidence=0.7,
)
```

2. **Add gesture history smoothing**:
```python
def smooth_gestures(self, current):
    if len(self.gesture_history) < 5:
        return current
    
    # Most common gesture in last 5 frames
    recent = self.gesture_history[-5:]
    return max(set(recent), key=recent.count)
```

---

## Performance Profiling

### Backend Profiling

```bash
# Install clinic
npm install -g clinic

# Profile CPU
clinic doctor -- node packages/backend/dist/index.js

# Profile memory
clinic heapprofiler -- node packages/backend/dist/index.js

# Profile async operations
clinic bubbleprof -- node packages/backend/dist/index.js
```

### Vision Service Profiling

```bash
# Install profiling tools
pip install line_profiler memory_profiler

# Profile specific function
kernprof -l -v packages/vision/main.py

# Memory profiling
python -m memory_profiler packages/vision/main.py
```

### Frontend Profiling

```javascript
// Use React DevTools Profiler
// Or Chrome DevTools Performance tab

// Manual timing
console.time('gesture-update');
// ... code ...
console.timeEnd('gesture-update');
```

---

## Error Code Reference

| Code | Description | Solution |
|------|-------------|----------|
| `CAMERA_ERROR` | Camera device unavailable | Check /dev/video0 permissions |
| `MODEL_NOT_FOUND` | MediaPipe model missing | Download hand_landmarker.task |
| `OLLAMA_CONNECTION_ERROR` | Can't connect to Ollama | Start Ollama service |
| `OLLAMA_MODEL_ERROR` | AI model not available | Run `ollama pull llama3.2` |
| `WEBSOCKET_ERROR` | WebSocket connection failed | Check backend is running |
| `NETWORK_ERROR` | Network communication failed | Check firewall and ports |
| `VALIDATION_ERROR` | Invalid request data | Check request format |
| `RATE_LIMIT_ERROR` | Too many requests | Wait and retry |
| `GPU_ERROR` | GPU not available | Check nvidia-smi |
| `MEMORY_ERROR` | Out of memory | Increase limits or use smaller model |

---

## How to Get Help

### 1. Collect Diagnostic Information

Run the diagnostics script:
```bash
./dixi-diagnostics.sh > diagnostics.txt
```

Include:
- System information (OS, CPU, GPU, RAM)
- Docker/service logs
- Error messages
- Steps to reproduce

### 2. Check Documentation

- README.md - Installation and setup
- QUICKSTART.md - Quick start guide
- API.md - API documentation
- ARCHITECTURE.md - System architecture
- DEPLOYMENT.md - Deployment guide

### 3. Search Existing Issues

Check GitHub issues:
```
https://github.com/duketopceo/Dixi/issues
```

### 4. Open a New Issue

If no solution found, open an issue with:

**Title**: Clear, concise description

**Body**:
```markdown
## Environment
- OS: Ubuntu 22.04
- Docker: 24.0.5
- Node.js: 20.9.0
- Python: 3.10.12

## Problem
Clear description of the issue

## Steps to Reproduce
1. Step 1
2. Step 2
3. ...

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Logs
```
Paste relevant logs here
```

## Diagnostics
```
Attach diagnostics.txt
```
```

### 5. Community Support

- GitHub Discussions
- Discord Server (if available)
- Stack Overflow tag: `dixi-projection`

### 6. Emergency Debugging

```bash
# Enable debug mode
export LOG_LEVEL=debug
export DEBUG=*

# Restart services
docker-compose down
docker-compose up

# Monitor in real-time
docker-compose logs -f --tail=100
```

---

## Prevention Tips

1. **Regular Updates**:
```bash
git pull origin main
npm install
pip install -r requirements.txt --upgrade
```

2. **Monitor Resources**:
```bash
# Set up monitoring
docker stats
htop
nvidia-smi
```

3. **Regular Backups**:
```bash
# Backup configuration
cp .env .env.backup
tar -czf backup-$(date +%Y%m%d).tar.gz .env docker-compose.yml
```

4. **Health Checks**:
```bash
# Cron job for health monitoring
*/5 * * * * curl -f http://localhost:3001/api/health || systemctl restart dixi
```

---

*Last updated: 2025-12-21*
