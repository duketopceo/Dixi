# Dixi Architecture Documentation

## System Overview

Dixi is a microservices-based AI-powered interactive projection system designed to transform any surface into a responsive knowledge canvas using computer vision, gesture recognition, and real-time AI inference.

## Components

### 1. Frontend Service (React + Three.js)

**Technology Stack:**
- React 18 with TypeScript
- Three.js / React Three Fiber for 3D rendering
- Zustand for state management
- WebSocket for real-time communication

**Responsibilities:**
- Render interactive 3D projection canvas
- Display gesture indicators and AI responses
- Manage user interactions
- Communicate with backend via REST API and WebSocket

**Key Files:**
- `src/App.tsx` - Main application component
- `src/components/ProjectionCanvas.tsx` - 3D canvas rendering
- `src/hooks/useWebSocket.ts` - WebSocket connection management
- `src/store/` - State management stores

### 2. Backend Service (Node.js + Express)

**Technology Stack:**
- Node.js 20 with Express
- TypeScript
- WebSocket (ws)
- Ollama API integration for AI inference
- Axios for HTTP client communication

**Responsibilities:**
- API gateway for all services
- WebSocket server for real-time communication
- Ollama API integration for AI inference
- Coordinate between frontend and vision service
- Auto-trigger AI responses on gesture detection

**Key Files:**
- `src/index.ts` - Express server setup
- `src/routes/` - API route handlers
- `src/services/ai.ts` - AI inference service
- `src/services/websocket.ts` - WebSocket management

**API Endpoints:**
- `/api/gestures` - Gesture tracking endpoints
- `/api/ai` - AI inference endpoints
- `/api/projection` - Projection mapping endpoints

### 3. Vision Service (Python + OpenCV + MediaPipe)

**Technology Stack:**
- Python 3.11
- Flask for REST API
- OpenCV for image processing
- MediaPipe for hand tracking
- NumPy for numerical operations

**Responsibilities:**
- Camera input processing
- Hand/gesture detection using MediaPipe
- Gesture classification
- Real-time tracking

**Key Files:**
- `main.py` - Flask application and gesture recognition service

**API Endpoints:**
- `/gesture` - Get current gesture data
- `/gesture/start` - Start tracking
- `/gesture/stop` - Stop tracking

## Data Flow

```
1. Camera → Vision Service (MediaPipe) → Gesture Data
                    ↓
2. Gesture Data → Backend (HTTP POST) → Process & Trigger AI
                    ↓
3. Backend → Ollama API → AI Response
                    ↓
4. Gesture + AI Response → WebSocket → Frontend → Display
```

**Key Flow Details:**
- Vision service pushes gesture data to backend when detected (not polling)
- Backend automatically triggers Ollama inference for wave gestures
- All data flows via WebSocket to frontend for real-time display

## Communication Patterns

### REST API
- Frontend ↔ Backend: Control operations (start/stop tracking, AI queries)
- Vision Service → Backend: Gesture data push (POST /api/gestures/process)
- Backend → Ollama: AI inference requests (POST /api/generate)

### WebSocket
- Backend → Frontend: Real-time gesture updates
- Backend → Frontend: AI response streaming
- Backend → Frontend: Projection updates

## AI Integration

### Ollama Service
- **Backend**: Communicates with Ollama API (HTTP REST)
- **Model**: llama3.2 (default, configurable via OLLAMA_MODEL)
- **Location**: External service (must be running separately)
- **Connection**: Tested on initialization, graceful error handling

### GPU Acceleration (Optional)
- **Ollama**: Can utilize GPU if available (managed by Ollama service)
- **Frontend**: WebGL for 3D rendering acceleration
- **Vision Service**: MediaPipe runs efficiently on CPU

## Deployment

### Local Development
- All services run independently
- Frontend proxies API calls to backend
- Direct WebSocket connection

### Docker
- Each service in separate container
- Bridge network for inter-service communication
- Volume mounts for models and camera access

### GCP Cloud Run
- Containerized deployment
- Auto-scaling based on load
- Cloud Load Balancer for routing
- Cloud Storage for models

## Scalability Considerations

1. **Horizontal Scaling**: Multiple backend and vision service instances
2. **Load Balancing**: Distribute requests across instances
3. **Model Caching**: Cache loaded models in memory
4. **WebSocket Management**: Use Redis for WebSocket state sync
5. **CDN**: Serve frontend static assets via CDN

## Security

- CORS configured for frontend domain
- Helmet.js for HTTP security headers
- Input validation on all endpoints
- Rate limiting for API endpoints (✅ Implemented)
- Authentication/Authorization (TODO)

## Performance Optimization

1. **Frontend**:
   - Code splitting with React lazy loading
   - Three.js scene optimization
   - WebSocket message batching

2. **Backend**:
   - Connection pooling
   - Response caching
   - Async processing

3. **Vision Service**:
   - Frame rate throttling
   - Gesture debouncing
   - GPU batch processing

## Future Enhancements

- [ ] Multi-user support with room management
- [ ] Persistent sessions with database
- [ ] Advanced gesture library
- [ ] Custom model fine-tuning interface
- [ ] Mobile app support
- [ ] AR/VR integration
- [ ] Cloud model marketplace
