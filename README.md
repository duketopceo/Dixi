# Dixi - Digital Exploration and Curiosity 🎨

An AI-powered interactive projection system that uses computer vision, gesture recognition, and real-time AI to transform any surface into a responsive knowledge canvas.

## 🚀 Features

- **Computer Vision**: Real-time gesture recognition using OpenCV and MediaPipe
- **AI Inference**: Ollama-powered AI integration for natural language understanding and generation
- **Interactive Projection**: WebGL-based rendering for immersive visual experiences
- **Real-time Communication**: WebSocket-based bidirectional data flow
- **Scalable Architecture**: Microservices design with Docker and GCP Cloud Run support

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
- **Docker** & **Docker Compose** for containerization
- **NVIDIA Container Runtime** for GPU support
- **GCP Cloud Run** for scalable deployment

## 🛠️ Installation

### Prerequisites

- Node.js 20+
- Python 3.11+
- **Ollama** (required) - Install from https://ollama.ai
- Docker & Docker Compose (optional, for containerized deployment)
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

5. **Start development servers**
   ```bash
   # Start all services
   npm run dev

   # Or start individually
   npm run dev:backend    # Backend server
   npm run dev:frontend   # Frontend dev server
   npm run dev:vision     # Vision service
   ```

### Docker Deployment

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

### Vision Service (Port 5000)

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
VISION_SERVICE_URL=http://localhost:5000
VISION_SERVICE_PORT=5000

# Ollama Configuration (REQUIRED)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

## 🚀 Deployment

### GCP Cloud Run

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

Contributions are welcome! Please feel free to submit a Pull Request.

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