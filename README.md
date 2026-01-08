# Dixi - Digital Exploration and Curiosity 🎨

An AI-powered interactive projection system that uses computer vision, gesture recognition, and real-time AI to transform any surface into a responsive knowledge canvas.

## 🚀 Features

- **Computer Vision**: Real-time gesture recognition using OpenCV and MediaPipe
- **AI Inference**: Ollama-powered AI integration for natural language understanding and generation
- **Interactive Projection**: WebGL-based rendering for immersive visual experiences
- **Real-time Communication**: WebSocket-based bidirectional data flow
- **Scalable Architecture**: Microservices design (Docker support in-progress, not required for local development)

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend    │◀────│   Vision    │
│   (React)   │◀────│ (Node.js +   │     │  (Python +  │
│             │     │   Express)   │     │  MediaPipe) │
└─────────────┘     └──────────────┘     └─────────────┘
      │                     │                     │
      │                     ▼                     │
      │              ┌──────────────┐             │
      └──────────────│   Ollama     │             │
                     │  AI Service  │             │
                     │  (llama3.2)  │             │
                     └──────────────┘             │
                            ▲                     │
                            │                     │
                            └─────────────────────┘
                     (Gesture data triggers AI)
```

## 📦 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Three.js** / **React Three Fiber** for 3D rendering
- **Vite** for fast development and building
- **Zustand** for state management
- **WebSocket** for real-time updates

### Backend
- **Node.js 20** with Express
- **TypeScript** for type safety
- **WebSocket** (ws) for real-time communication
- **Ollama** API integration for AI inference
- **Axios** for HTTP client communication

### Computer Vision
- **Python 3.11** with Flask
- **OpenCV** for image processing
- **MediaPipe** for hand/gesture tracking
- **NumPy** for numerical operations

### Infrastructure
- **Docker** & **Docker Compose** for containerization (planned for future cloud deployment)
- **NVIDIA Container Runtime** for GPU support (optional)
- **GCP Cloud Run** for scalable deployment (planned for future)

## 🛠️ Installation

### Prerequisites

- Node.js 20+
- Python 3.11+
- **Ollama** (required) - Install from https://ollama.ai
- Docker & Docker Compose (planned for future cloud deployment, not needed for local development)
- Webcam/camera (for gesture recognition)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/duketopceo/Dixi.git
   cd Dixi
   ```

2. **Install and start Ollama** (REQUIRED)
   ```bash
   # Install Ollama from https://ollama.ai
   # Then start the Ollama service:
   ollama serve
   
   # In a separate terminal, pull the model:
   ollama pull llama3.2
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env if needed (defaults work for local development)
   ```

4. **Install dependencies**
   ```bash
   npm install
   npm run install:all
   ```

5. **Set up Python virtual environment** (for vision service)
   ```bash
   # Windows
   python -m venv .venv
   .venv\Scripts\activate
   
   # Install vision service dependencies
   cd packages/vision
   pip install -r requirements.txt
   
   # Download MediaPipe model if missing
   # The model file should be at packages/vision/hand_landmarker.task
   # If missing, download from:
   # https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
   ```

6. **Start development servers**
   ```bash
   # Start all services
   npm run dev

   # Or start individually
   npm run dev:backend    # Backend server (port 3001)
   npm run dev:frontend   # Frontend dev server (port 3000)
   
   # Vision service (port 5001) - REQUIRED for camera feed
   cd packages/vision
   python main.py
   ```
   
   **Important**: The vision service must be running for the camera feed to work. Without it, you'll see a black screen with an error message.

### Docker Deployment

> ⚠️ **Note**: Docker deployment is planned for future cloud deployment. For current development, run services locally using the commands above (npm run dev + python main.py). Focus on getting the projector interaction loop working locally first.

```bash
# Build all containers
npm run docker:build

# Start all services
npm run docker:up

# Stop all services
npm run docker:down
```

## 🎮 Usage

1. **Access the Web Interface**
   - Open your browser to `http://localhost:3000`
   - The interactive canvas will be displayed

2. **Start Gesture Tracking**
   - Click "Start Tracking" in the control panel
   - Allow camera access when prompted
   - Move your hands in front of the camera

3. **Interact with AI**
   - Type queries in the AI Query input
   - Click "Send Query" to get AI responses
   - Responses appear in real-time on the canvas

4. **Supported Gestures**
   - 👋 **Wave**: Triggers AI-generated description of the gesture
   - 👉 **Point**: Direct interaction (coordinates sent to AI)
   - 🤏 **Pinch**: Selection/grab action (coordinates sent to AI)

## 📡 API Endpoints

### Backend (Port 3001)

#### Health Check
```
GET /health
```

#### Gesture Endpoints
```
GET  /api/gestures          # Get current gesture
POST /api/gestures/start    # Start tracking
POST /api/gestures/stop     # Stop tracking
POST /api/gestures/process  # Process gesture event
```

#### AI Endpoints
```
GET  /api/ai/status         # Get model status
POST /api/ai/initialize     # Initialize AI model
POST /api/ai/infer          # Generate inference
POST /api/ai/stream         # Stream inference
```

#### Projection Endpoints
```
GET  /api/projection/status   # Get projection status
POST /api/projection/mapping  # Update mapping
POST /api/projection/content  # Update content
```

### Vision Service (Port 5001)

```
GET  /health              # Health check
GET  /gesture             # Get current gesture
POST /gesture/start       # Start tracking
POST /gesture/stop        # Stop tracking
GET  /status              # Service status
```

## 🔧 Configuration

### Environment Variables

```env
# Backend
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
WS_PORT=3002

# Vision Service
VISION_SERVICE_URL=http://localhost:5001
VISION_SERVICE_PORT=5001

# Vision Service Performance Configuration
FRAME_SKIP_INTERVAL=2              # Process every Nth frame (1-5, default: 2 for ~15 FPS)
ENABLE_FACE_TRACKING=true          # Enable face detection (default: true)
ENABLE_POSE_TRACKING=true          # Enable pose detection (default: true)
BACKEND_PUSH_COOLDOWN_MS=500       # Time between backend updates in ms (default: 500)
ADAPTIVE_FPS=false                 # Enable adaptive FPS (reduces to 10 FPS when idle, default: false)

# Ollama Configuration (REQUIRED)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

### Performance Optimization

The vision service supports several configuration options to reduce compute usage by 60-70%:

- **Frame Skip Interval**: Process every Nth frame (default: 2). Higher values reduce compute but may affect responsiveness.
  - `1` = ~30 FPS (full processing)
  - `2` = ~15 FPS (50% reduction, recommended)
  - `3` = ~10 FPS (67% reduction)
  - `4` = ~7.5 FPS (75% reduction)
  - `5` = ~6 FPS (80% reduction)

- **Optional Models**: Disable face or pose tracking to save additional 30-50% compute when not needed.

- **Backend Push Cooldown**: Increase from default 500ms to reduce network traffic and backend load.

- **Adaptive FPS**: Automatically reduces to 10 FPS when idle (no activity for 5+ seconds), increases to 15-30 FPS when active.

These settings can be configured via environment variables or through the Model Configuration panel in the Control Panel UI.

## 🚀 Deployment

### Firebase Hosting

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**
   ```bash
   firebase login
   ```

3. **Setup Firebase** (first time only)
   ```bash
   # Windows PowerShell
   .\scripts\setup_firebase.ps1
   
   # Or manually:
   # Update .firebaserc with your Firebase project ID
   # firebase use --add  # Select or create a project
   ```

4. **Build frontend**
   ```bash
   npm run build:frontend
   ```

5. **Deploy to Firebase**
   ```bash
   # Deploy everything
   firebase deploy
   
   # Or deploy only hosting
   firebase deploy --only hosting
   
   # Or deploy only functions (backend)
   firebase deploy --only functions
   ```

### GCP Cloud Run

> ⚠️ **Note**: Cloud Run deployment is planned for future. Current focus is on local projector interaction. Docker and cloud deployment will be revisited once core projector functionality is stable and tested.

1. **Build and push containers**
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT_ID/dixi-backend packages/backend
   gcloud builds submit --tag gcr.io/PROJECT_ID/dixi-frontend packages/frontend
   gcloud builds submit --tag gcr.io/PROJECT_ID/dixi-vision packages/vision
   ```

2. **Deploy services**
   ```bash
   gcloud run deploy dixi-backend --image gcr.io/PROJECT_ID/dixi-backend
   gcloud run deploy dixi-frontend --image gcr.io/PROJECT_ID/dixi-frontend
   gcloud run deploy dixi-vision --image gcr.io/PROJECT_ID/dixi-vision
   ```

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details on:

- Setting up your development environment
- Our branch structure (`main` and `development`)
- Submitting Pull Requests
- Code style guidelines
- Testing requirements

Quick start for contributors:
```bash
# Fork and clone the repository
git clone https://github.com/your-username/Dixi.git
cd Dixi

# Create a feature branch from development
git checkout development
git checkout -b feature/your-feature-name

# Make changes, commit, and push
git push origin feature/your-feature-name

# Open a PR targeting the development branch
```

See [BRANCH_STRUCTURE.md](./BRANCH_STRUCTURE.md) for detailed branch workflow.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- MediaPipe for gesture recognition
- Ollama for AI inference
- Three.js for 3D rendering
- OpenCV for computer vision

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ for interactive AI experiences