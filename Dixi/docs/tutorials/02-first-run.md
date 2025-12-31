# Tutorial 2: First Run

Video tutorial script for running Dixi for the first time.

## Video Duration: 8-10 minutes

## Script

### 00:00 - 00:20: Introduction

**Narration**:
"Welcome back! In this tutorial, we'll start Dixi for the first time. We'll launch all the services, test the camera, and interact with our first gestures. Let's dive in!"

**On-Screen**: Dixi logo and overview

---

### 00:20 - 01:20: Starting Services with Docker

**Narration**:
"The easiest way to run Dixi is with Docker Compose. This starts all services together - the frontend, backend, and vision service."

**On-Screen Actions**:
```bash
cd Dixi

# Start all services
docker-compose up -d

# Watch logs
docker-compose logs -f
```

**Screenshot**: Docker containers starting, logs showing initialization

**Key Log Messages to Point Out**:
- "Backend server started on port 3001"
- "Vision service initialized"
- "Camera detected"

---

### 01:20 - 02:00: Alternative: Running Without Docker

**Narration**:
"If you prefer running services individually, here's how. You'll need three separate terminal windows."

**On-Screen Actions**:

**Terminal 1 - Ollama**:
```bash
ollama serve
```

**Terminal 2 - Vision Service**:
```bash
cd packages/vision
python main.py
```

**Terminal 3 - Backend**:
```bash
cd packages/backend
npm run dev
```

**Terminal 4 - Frontend**:
```bash
cd packages/frontend
npm run dev
```

**Screenshot**: Four terminal windows running simultaneously

---

### 02:00 - 03:00: Accessing the Application

**Narration**:
"Now let's open the application in our browser. Navigate to localhost:5173. You should see the Dixi interface with several panels."

**On-Screen Actions**:
```bash
# Open in browser
open http://localhost:5173

# Or manually enter: http://localhost:5173
```

**Screenshot**: Browser showing Dixi UI

**Point Out UI Elements**:
- Control panel on the left
- 3D projection canvas in the center
- Gesture indicator overlay
- AI response display on the right
- Debug log at the bottom

---

### 03:00 - 04:00: Starting Gesture Tracking

**Narration**:
"Click the 'Start Tracking' button to activate the camera. You'll see a request for camera permissions - make sure to allow access."

**On-Screen Actions**:
1. Click "Start Tracking" button
2. Allow camera permissions
3. Watch status change to "Tracking Active"

**Screenshot**: Camera permission dialog, then active tracking indicator

**Narration**:
"Great! The camera is now active and looking for your hand. Position your hand in front of the camera with good lighting for best results."

---

### 04:00 - 05:30: Testing Your First Gestures

**Narration**:
"Let's try some basic gestures. Start with a wave - just wave your hand side to side. You should see the gesture detected on screen."

**On-Screen Actions**:

1. **Wave Gesture**:
   - Wave hand side to side
   - Show gesture indicator appearing
   - Show AI response: "Hello! I detected a wave gesture..."

2. **Point Gesture**:
   - Point with index finger
   - Show coordinate tracking
   - Show AI describing the action

3. **Open Palm**:
   - Show open hand to camera
   - Show all fingers detected
   - Show AI response

**Screenshot**: Each gesture with corresponding UI feedback

---

### 05:30 - 06:30: Understanding the UI Feedback

**Narration**:
"Let's understand what's happening. When you perform a gesture, several things occur simultaneously."

**On-Screen**: Animated diagram showing flow:

1. **Gesture Indicator** (top):
   - Shows gesture type with emoji
   - Displays confidence level
   - Shows hand position coordinates

2. **3D Canvas** (center):
   - Responds to gestures with visual effects
   - Shows particle effects on wave
   - Highlights objects on point

3. **AI Response** (right):
   - AI generates contextual description
   - Shows inference time
   - Displays model information

4. **Debug Log** (bottom):
   - Shows system events
   - Displays latency information
   - Reports any errors

**Screenshot**: UI with all panels highlighted and labeled

---

### 06:30 - 07:30: Checking Health Status

**Narration**:
"Let's verify all services are communicating properly. Click the health check button or look at the status indicators."

**On-Screen Actions**:
```bash
# In browser console
fetch('http://localhost:3001/api/health/deep')
  .then(r => r.json())
  .then(console.log);
```

**Screenshot**: Health check response showing all services healthy

**Point Out Status for Each Service**:
- ✅ Backend: Running
- ✅ Vision: Healthy
- ✅ Ollama: Models loaded
- ✅ WebSocket: Connected
- ✅ Camera: Available

---

### 07:30 - 08:30: Testing AI Queries

**Narration**:
"You can also send custom queries to the AI. Let's try asking a question."

**On-Screen Actions**:
1. Type in AI query box: "What is gesture recognition?"
2. Click Send
3. Watch AI generate response
4. Point out streaming text appearing word by word

**Screenshot**: AI query box with question, response streaming in

**Narration**:
"The AI response is powered by Llama 3.2 running locally on your machine. No internet connection needed!"

---

### 08:30 - 09:00: Performance Monitoring

**Narration**:
"Let's check how well Dixi is performing on your system."

**On-Screen Actions**:
```bash
# Check resource usage
docker stats

# Key metrics to watch:
# - CPU usage should be < 60%
# - Memory usage < 4GB
# - Gesture detection at 30 FPS
```

**Screenshot**: Docker stats showing resource usage

---

### 09:00 - 09:30: Stopping Services

**Narration**:
"When you're done, stop the services cleanly to free up resources."

**On-Screen Actions**:
```bash
# Stop with Docker Compose
docker-compose down

# Or stop individually
# Ctrl+C in each terminal window
```

**Screenshot**: Services shutting down gracefully

---

### 09:30 - 10:00: Troubleshooting Tips

**Narration**:
"If something doesn't work, here are quick fixes for common issues."

**On-Screen**: Troubleshooting checklist:

1. **Camera not detected**: Check `/dev/video0` permissions
2. **Services won't start**: Check if ports 3001, 5000, 5173, 11434 are free
3. **Ollama errors**: Ensure model is downloaded (`ollama list`)
4. **Low FPS**: Reduce camera resolution in settings
5. **WebSocket disconnects**: Check firewall settings

**Screenshot**: Common error messages and solutions

---

### 10:00: Wrap Up

**Narration**:
"Congratulations! You've successfully run Dixi for the first time. In the next tutorial, we'll explore advanced gesture recognition and customization options. See you there!"

**Outro**: Link to Tutorial 03: Gesture Detection

---

## Key Points to Emphasize

1. Allow camera permissions when prompted
2. Good lighting improves detection accuracy
3. All services must be running for full functionality
4. WebSocket connection is crucial for real-time updates
5. Check health status if something seems wrong

## Common First-Run Issues

1. **Port already in use**: Stop conflicting services
2. **Camera permission denied**: Check browser settings
3. **Slow AI responses**: Normal for first query (model loading)
4. **WebSocket errors**: Check backend is running

## Success Criteria

- All services start without errors
- Camera feed visible
- Gestures detected and displayed
- AI responds to gestures
- No console errors

---

*Video tutorial script - Last updated: 2025-12-21*
