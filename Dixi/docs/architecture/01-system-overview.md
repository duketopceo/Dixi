# System Overview

Complete system architecture showing all services, data flow, and port assignments.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        WSClient[WebSocket Client]
    end

    subgraph "Frontend Service - Port 5173"
        Frontend[React + Vite Frontend]
        ThreeJS[Three.js / WebGL]
        Zustand[Zustand State Management]
    end

    subgraph "Backend Service - Port 3001"
        Express[Express.js Server]
        WSServer[WebSocket Server]
        Routes[API Routes]
        Middleware[Rate Limiting & Validation]
    end

    subgraph "Vision Service - Port 5000"
        Flask[Flask API Server]
        MediaPipe[MediaPipe Hand Tracking]
        OpenCV[OpenCV Camera Interface]
        Camera[(Camera Device)]
    end

    subgraph "AI Service - Port 11434"
        Ollama[Ollama AI Engine]
        LLama[Llama 3.2 Model]
    end

    subgraph "External Services"
        GPU[GPU/CUDA<br/>Optional]
    end

    %% Client connections
    Browser -->|HTTP :5173| Frontend
    WSClient -->|WS :3001| WSServer

    %% Frontend connections
    Frontend -->|API Calls :3001| Express
    Frontend -->|WebSocket :3001| WSServer
    ThreeJS -->|Renders| Browser
    Zustand -->|State| Frontend

    %% Backend connections
    Express -->|Gesture API :5000| Flask
    Express -->|AI Inference :11434| Ollama
    Routes -->|Process| Middleware
    Middleware -->|Handle| Express

    %% WebSocket flow
    WSServer -->|Broadcast Gestures| WSClient
    WSServer -->|Broadcast AI Responses| WSClient

    %% Vision service
    Flask -->|Process Frames| MediaPipe
    MediaPipe -->|Detect Hands| OpenCV
    OpenCV -->|Capture| Camera
    Flask -->|Push Gestures :3001| Express

    %% AI service
    Ollama -->|Load Model| LLama
    Ollama -.->|Optional Acceleration| GPU

    style Browser fill:#e1f5ff
    style Frontend fill:#4fc3f7
    style Express fill:#81c784
    style Flask fill:#ffb74d
    style Ollama fill:#ba68c8
    style Camera fill:#ff8a65
```

## Service Details

### Frontend Service (Port 5173)
- **Technology**: React 18 + TypeScript + Vite
- **Purpose**: User interface and 3D projection rendering
- **Key Components**:
  - React components for UI
  - Three.js for WebGL rendering
  - Zustand for state management
  - WebSocket client for real-time updates
- **Dependencies**: Backend API, WebSocket server

### Backend Service (Port 3001)
- **Technology**: Node.js 20 + Express + TypeScript
- **Purpose**: Central coordination hub, API gateway, WebSocket server
- **Key Features**:
  - RESTful API endpoints
  - WebSocket server for real-time communication
  - Rate limiting middleware
  - Request validation
  - Gesture processing coordination
  - AI query orchestration
- **Dependencies**: Vision service, Ollama AI service

### Vision Service (Port 5000)
- **Technology**: Python 3.10 + Flask + MediaPipe + OpenCV
- **Purpose**: Computer vision and gesture recognition
- **Key Features**:
  - Camera interface and frame capture
  - Hand landmark detection (MediaPipe)
  - Gesture recognition (30+ gesture types)
  - Push architecture (sends gestures to backend)
- **Dependencies**: Camera device, Backend API

### AI Service (Port 11434)
- **Technology**: Ollama + Llama 3.2
- **Purpose**: Natural language processing and AI inference
- **Key Features**:
  - Text generation
  - Conversational AI
  - Context-aware responses
  - Streaming support
- **Dependencies**: Optional GPU/CUDA for acceleration

## Data Flow

### 1. Gesture Detection Flow

```mermaid
sequenceDiagram
    participant Camera
    participant Vision
    participant Backend
    participant Frontend
    participant AI

    Camera->>Vision: Capture frame
    Vision->>Vision: Detect hands
    Vision->>Vision: Recognize gesture
    Vision->>Backend: POST /api/gesture/process
    Backend->>Frontend: WebSocket broadcast
    Backend->>AI: Trigger AI inference
    AI->>Backend: Return AI response
    Backend->>Frontend: WebSocket broadcast
    Frontend->>Frontend: Update UI
```

### 2. AI Query Flow

```mermaid
sequenceDiagram
    participant Frontend
    participant Backend
    participant AI

    Frontend->>Backend: POST /api/ai/infer
    Backend->>Backend: Validate request
    Backend->>AI: Generate response
    AI->>Backend: Return text
    Backend->>Frontend: WebSocket broadcast
    Backend->>Frontend: HTTP response
```

### 3. Initialization Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Vision
    participant AI

    User->>Frontend: Load application
    Frontend->>Backend: GET /api/health/deep
    Backend->>Vision: GET /health
    Vision->>Backend: Status response
    Backend->>AI: GET /api/tags
    AI->>Backend: Model list
    Backend->>Frontend: Health status
    Frontend->>Frontend: Enable/disable features
    User->>Frontend: Click "Start Tracking"
    Frontend->>Backend: POST /api/gesture/start
    Backend->>Vision: POST /gesture/start
    Vision->>Vision: Initialize camera
    Vision->>Backend: Success
    Backend->>Frontend: Started
    Frontend->>Frontend: Show camera feed
```

## Port Assignment Reference

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Frontend Dev Server | 5173 | HTTP | Vite development server |
| Frontend Production | 80/443 | HTTP/HTTPS | Production build (nginx) |
| Backend API | 3001 | HTTP | REST API endpoints |
| Backend WebSocket | 3001 | WS/WSS | Real-time bidirectional communication |
| Vision Service | 5000 | HTTP | Computer vision API |
| Ollama AI | 11434 | HTTP | AI inference API |

## Network Communication

### Internal Service Communication

```mermaid
graph LR
    subgraph "Internal Network"
        Backend[Backend<br/>:3001]
        Vision[Vision<br/>:5000]
        AI[AI<br/>:11434]
    end

    Backend <-->|HTTP| Vision
    Backend <-->|HTTP| AI
    Vision -.->|Push| Backend

    style Backend fill:#81c784
    style Vision fill:#ffb74d
    style AI fill:#ba68c8
```

### External Access

```mermaid
graph TB
    Internet[Internet]
    LoadBalancer[Load Balancer]
    
    subgraph "DMZ"
        Nginx[Nginx Reverse Proxy]
    end

    subgraph "Application Layer"
        Frontend[Frontend]
        Backend[Backend]
    end

    subgraph "Private Network"
        Vision[Vision Service]
        AI[AI Service]
    end

    Internet --> LoadBalancer
    LoadBalancer --> Nginx
    Nginx -->|Static Files| Frontend
    Nginx -->|/api| Backend
    Nginx -->|/ws| Backend
    Backend --> Vision
    Backend --> AI

    style Internet fill:#e1f5ff
    style Nginx fill:#4fc3f7
    style Frontend fill:#4fc3f7
    style Backend fill:#81c784
    style Vision fill:#ffb74d
    style AI fill:#ba68c8
```

## Deployment Topology

### Docker Compose Deployment

```mermaid
graph TB
    subgraph "Docker Host"
        subgraph "Docker Network: dixi-network"
            FrontendContainer[frontend-container<br/>:5173]
            BackendContainer[backend-container<br/>:3001]
            VisionContainer[vision-container<br/>:5000]
        end
        
        subgraph "Host System"
            OllamaHost[Ollama<br/>:11434]
            CameraHost[Camera Device<br/>/dev/video0]
        end
    end

    FrontendContainer <--> BackendContainer
    BackendContainer <--> VisionContainer
    BackendContainer <--> OllamaHost
    VisionContainer <--> CameraHost

    style FrontendContainer fill:#4fc3f7
    style BackendContainer fill:#81c784
    style VisionContainer fill:#ffb74d
    style OllamaHost fill:#ba68c8
    style CameraHost fill:#ff8a65
```

### Kubernetes Deployment

```mermaid
graph TB
    subgraph "Kubernetes Cluster"
        Ingress[Ingress Controller]
        
        subgraph "Frontend Namespace"
            FrontendSvc[Frontend Service]
            FrontendPod1[Frontend Pod 1]
            FrontendPod2[Frontend Pod 2]
        end

        subgraph "Backend Namespace"
            BackendSvc[Backend Service]
            BackendPod1[Backend Pod 1]
            BackendPod2[Backend Pod 2]
        end

        subgraph "Vision Namespace"
            VisionSvc[Vision Service]
            VisionPod[Vision Pod<br/>+GPU]
        end

        subgraph "AI Namespace"
            AISvc[Ollama Service]
            AIPod[Ollama Pod<br/>+GPU]
        end
    end

    Ingress --> FrontendSvc
    Ingress --> BackendSvc
    FrontendSvc --> FrontendPod1
    FrontendSvc --> FrontendPod2
    BackendSvc --> BackendPod1
    BackendSvc --> BackendPod2
    BackendPod1 --> VisionSvc
    BackendPod2 --> VisionSvc
    BackendPod1 --> AISvc
    BackendPod2 --> AISvc
    VisionSvc --> VisionPod
    AISvc --> AIPod

    style Ingress fill:#e1f5ff
    style FrontendSvc fill:#4fc3f7
    style BackendSvc fill:#81c784
    style VisionSvc fill:#ffb74d
    style AISvc fill:#ba68c8
```

## Technology Stack Summary

### Frontend Stack
- **Runtime**: Browser (Chrome, Firefox, Safari, Edge)
- **Framework**: React 18.3
- **Build Tool**: Vite 5
- **Language**: TypeScript 5
- **State Management**: Zustand
- **3D Graphics**: Three.js + React Three Fiber
- **WebSocket**: Native WebSocket API
- **HTTP Client**: Fetch API

### Backend Stack
- **Runtime**: Node.js 20 LTS
- **Framework**: Express 4.18
- **Language**: TypeScript 5
- **WebSocket**: ws library
- **HTTP Client**: Axios
- **Validation**: Custom middleware
- **Rate Limiting**: Custom middleware

### Vision Stack
- **Runtime**: Python 3.10+
- **Framework**: Flask 3.0
- **Computer Vision**: OpenCV 4.8
- **Hand Tracking**: MediaPipe 0.10
- **Image Processing**: NumPy
- **HTTP Client**: Requests

### AI Stack
- **Engine**: Ollama
- **Model**: Llama 3.2 (3B/7B/13B variants)
- **Acceleration**: CUDA (optional)
- **API**: REST + streaming

## Performance Characteristics

### Latency Targets

| Operation | Target | Typical |
|-----------|--------|---------|
| Gesture detection | < 50ms | 30-40ms |
| Gesture → Backend | < 20ms | 10-15ms |
| Backend → Frontend (WS) | < 10ms | 5-8ms |
| AI inference (3B model) | < 500ms | 300-400ms |
| AI inference (7B model) | < 1500ms | 1000-1200ms |
| End-to-end (gesture → AI → UI) | < 2000ms | 1500ms |

### Throughput Targets

| Metric | Target |
|--------|--------|
| Gestures per second | 30 FPS |
| Concurrent WebSocket clients | 100+ |
| API requests per second | 200+ |
| AI queries per minute | 60+ |

## Security Considerations

```mermaid
graph TB
    Internet[Internet]
    
    subgraph "Security Layers"
        WAF[Web Application Firewall]
        SSL[SSL/TLS Termination]
        RateLimit[Rate Limiting]
        Validation[Input Validation]
    end

    subgraph "Application"
        API[Backend API]
    end

    Internet --> WAF
    WAF --> SSL
    SSL --> RateLimit
    RateLimit --> Validation
    Validation --> API

    style WAF fill:#f44336
    style SSL fill:#ff9800
    style RateLimit fill:#ffc107
    style Validation fill:#8bc34a
    style API fill:#81c784
```

### Security Measures
1. **Rate Limiting**: Prevents API abuse
2. **Input Validation**: Protects against injection attacks
3. **CORS Configuration**: Restricts cross-origin requests
4. **Helmet Security Headers**: Enhances HTTP security
5. **WebSocket Authentication**: (Planned) Secure WS connections
6. **API Key Authentication**: (Planned) Endpoint protection

---

*Last updated: 2025-12-21*
