# Vision Service

The Dixi Vision Service provides real-time gesture recognition using MediaPipe and OpenCV.

## Prerequisites

1. **Python 3.11+** installed
2. **Virtual environment** activated (`.venv\Scripts\activate` on Windows)
3. **MediaPipe model file** (`hand_landmarker.task`) in this directory
4. **Camera access** enabled in Windows Settings

## Installation

1. **Activate virtual environment**
   ```bash
   # Windows
   .venv\Scripts\activate
   
   # Linux/Mac
   source .venv/bin/activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Download MediaPipe model** (if missing)
   ```bash
   # Using curl (Windows PowerShell)
   curl -L https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task -o hand_landmarker.task
   
   # Or download manually from:
   # https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
   ```

## Starting the Service

```bash
cd packages/vision
python main.py
```

**Expected output:**
```
🚀 Dixi Vision Service starting on port 5001...
🤖 Gesture Recognition Service initialized with modern Tasks API
📹 Camera opened successfully at index 0 (1920x1080)
 * Running on http://0.0.0.0:5001
```

## Camera Configuration

### Camera Device Index
By default, the service uses camera index 0. To use a different camera:

```bash
# Windows PowerShell
$env:CAMERA_INDEX="1"
python main.py
```

### Camera Resolution
For higher resolution USB cameras, you can configure the resolution:

```bash
# Windows PowerShell
$env:CAMERA_WIDTH="1920"
$env:CAMERA_HEIGHT="1080"
python main.py
```

The service will:
- Use full resolution for gesture detection (better accuracy)
- Automatically resize video stream to 1280px max width (optimized bandwidth)
- Maintain high-quality gesture tracking

### Stream Resolution
Control the maximum width for the video stream:

```bash
# Windows PowerShell
$env:STREAM_MAX_WIDTH="1280"  # Default: 1280
python main.py
```

## Camera Permissions (Windows)

If the camera fails to open:

1. Open **Settings** → **Privacy** → **Camera**
2. Enable **"Allow apps to access your camera"**
3. Enable for **Python** and **Terminal**
4. Restart the service

## API Endpoints

- `GET /health` - Health check
- `GET /gesture` - Get current gesture
- `POST /gesture/start` - Start tracking
- `POST /gesture/stop` - Stop tracking
- `GET /status` - Service status
- `GET /video_feed` - MJPEG video stream
- `GET /dashboard` - Debug dashboard
- `GET /logs` - Service logs

## Troubleshooting

### Camera Not Opening
- Check camera permissions in Windows Settings
- Ensure no other app is using the camera
- Try a different camera index: `$env:CAMERA_INDEX="1"`

### Model File Missing
- Download `hand_landmarker.task` to `packages/vision/` directory
- Verify file exists: `ls packages/vision/hand_landmarker.task`

### Port Already in Use
- Change port: `$env:VISION_SERVICE_PORT="5001"`
- Or kill process using port 5000

### Low FPS
- Reduce camera resolution via `CAMERA_WIDTH`/`CAMERA_HEIGHT`
- Increase `STREAM_MAX_WIDTH` to reduce processing overhead

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VISION_SERVICE_PORT` | `5000` | Port for Flask server |
| `CAMERA_INDEX` | `0` | Camera device index |
| `CAMERA_WIDTH` | (native) | Force camera width |
| `CAMERA_HEIGHT` | (native) | Force camera height |
| `STREAM_MAX_WIDTH` | `1280` | Max width for video stream |
| `BACKEND_URL` | `http://localhost:3001` | Backend API URL |

