# Backend Internal Architecture

Detailed architecture of the Node.js/Express backend service.

## Component Overview

```mermaid
graph TB
    subgraph "Entry Point"
        Index[index.ts<br/>Server Bootstrap]
    end

    subgraph "HTTP Layer"
        Express[Express App]
        Middleware[Middleware Stack]
    end

    subgraph "Routes"
        HealthRoute[health.ts]
        GestureRoute[gesture.ts]
        AIRoute[ai.ts]
        ProjectionRoute[projection.ts]
    end

    subgraph "Middleware"
        ErrorHandler[errorHandler.ts]
        RateLimiter[rateLimiter.ts]
        Validation[validation.ts]
    end

    subgraph "Services"
        AIService[ai.ts<br/>AI Inference]
        WSService[websocket.ts<br/>WebSocket Server]
    end

    subgraph "Utils"
        Logger[logger.ts<br/>Winston Logger]
    end

    subgraph "External APIs"
        VisionAPI[Vision Service<br/>:5000]
        OllamaAPI[Ollama API<br/>:11434]
    end

    Index --> Express
    Express --> Middleware
    Middleware --> HealthRoute
    Middleware --> GestureRoute
    Middleware --> AIRoute
    Middleware --> ProjectionRoute

    HealthRoute --> VisionAPI
    HealthRoute --> OllamaAPI
    HealthRoute --> WSService

    GestureRoute --> VisionAPI
    GestureRoute --> WSService
    GestureRoute --> AIService

    AIRoute --> AIService
    AIRoute --> WSService

    AIService --> OllamaAPI
    AIService --> Logger

    GestureRoute --> RateLimiter
    AIRoute --> RateLimiter
    
    HealthRoute --> ErrorHandler
    GestureRoute --> ErrorHandler
    AIRoute --> ErrorHandler

    GestureRoute --> Validation
    AIRoute --> Validation

    style Index fill:#4fc3f7
    style Express fill:#81c784
    style AIService fill:#ba68c8
    style WSService fill:#ffb74d
    style Logger fill:#9e9e9e
```

## Directory Structure

```
packages/backend/
├── src/
│   ├── index.ts                 # Application entry point
│   ├── routes/
│   │   ├── health.ts            # Health check endpoints
│   │   ├── gesture.ts           # Gesture processing endpoints
│   │   ├── ai.ts                # AI inference endpoints
│   │   └── projection.ts        # Projection management
│   ├── services/
│   │   ├── ai.ts                # AI service (Ollama client)
│   │   └── websocket.ts         # WebSocket server
│   ├── middleware/
│   │   ├── errorHandler.ts      # Global error handler
│   │   ├── rateLimiter.ts       # Rate limiting middleware
│   │   └── validation.ts        # Request validation
│   ├── utils/
│   │   └── logger.ts            # Winston logger configuration
│   └── __tests__/               # Test files
│       ├── health.test.ts
│       └── gesture.test.ts
├── package.json
└── tsconfig.json
```

## Core Components

### 1. Application Bootstrap (index.ts)

```mermaid
sequenceDiagram
    participant Main
    participant Express
    participant WSService
    participant Routes
    participant Server

    Main->>Express: Create Express app
    Main->>Express: Configure middleware
    Main->>WSService: Initialize WebSocket
    Main->>Routes: Mount API routes
    Main->>Server: Start HTTP server
    Server->>WSService: Upgrade HTTP to WS
    Main->>Main: Log startup complete
```

**Responsibilities:**
- Initialize Express application
- Configure middleware stack
- Initialize WebSocket server
- Mount API routes
- Start HTTP server
- Handle graceful shutdown

**Key Code Flow:**
1. Load environment variables
2. Create Express app
3. Configure CORS, body parsing, helmet
4. Initialize WebSocket service
5. Mount routes under `/api`
6. Start server on port 3001
7. Export wsService for other modules

---

### 2. Middleware Stack

```mermaid
graph LR
    Request[Incoming Request]
    CORS[CORS Handler]
    Helmet[Helmet Security]
    BodyParser[JSON Body Parser]
    Logger[Request Logger]
    RateLimit[Rate Limiter]
    Validation[Input Validation]
    Route[Route Handler]
    ErrorHandler[Error Handler]
    Response[Response]

    Request --> CORS
    CORS --> Helmet
    Helmet --> BodyParser
    BodyParser --> Logger
    Logger --> RateLimit
    RateLimit --> Validation
    Validation --> Route
    Route --> ErrorHandler
    ErrorHandler --> Response

    style Request fill:#e1f5ff
    style Route fill:#81c784
    style ErrorHandler fill:#f44336
    style Response fill:#4caf50
```

#### Middleware Execution Order

1. **CORS** - Cross-Origin Resource Sharing
   - Allows frontend to access backend
   - Configured for development and production

2. **Helmet** - Security headers
   - Sets various HTTP headers for security
   - Protects against common vulnerabilities

3. **Body Parser** - JSON request parsing
   - Parses JSON request bodies
   - Limits body size (10mb default)

4. **Logger** - Request logging
   - Logs all incoming requests
   - Includes method, path, status, duration

5. **Rate Limiter** - Request throttling
   - Different limits per endpoint type
   - IP-based tracking
   - Configurable windows and limits

6. **Validation** - Input validation
   - Validates request parameters
   - Sanitizes input data
   - Returns 400 for invalid requests

7. **Error Handler** - Global error handling
   - Catches all errors
   - Formats error responses
   - Logs errors with context

---

### 3. Route Handlers

#### Health Route (health.ts)

```mermaid
graph TB
    Client[Client Request]
    
    subgraph "Health Endpoints"
        Basic[GET /<br/>Basic Check]
        Deep[GET /deep<br/>Deep Check]
        Ready[GET /ready<br/>Readiness]
        Live[GET /live<br/>Liveness]
    end

    subgraph "Checks"
        Vision[Vision Service]
        Ollama[Ollama API]
        WS[WebSocket]
        Memory[Memory Usage]
    end

    Client --> Basic
    Client --> Deep
    Client --> Ready
    Client --> Live

    Basic --> Memory
    Deep --> Vision
    Deep --> Ollama
    Deep --> WS
    Deep --> Memory
    Ready --> Vision

    style Basic fill:#4caf50
    style Deep fill:#ff9800
    style Ready fill:#2196f3
    style Live fill:#9c27b0
```

**Endpoints:**
- `GET /api/health` - Fast health check
- `GET /api/health/deep` - Comprehensive health check
- `GET /api/health/ready` - Kubernetes readiness probe
- `GET /api/health/live` - Kubernetes liveness probe

---

#### Gesture Route (gesture.ts)

```mermaid
graph TB
    Client[Client Request]
    
    subgraph "Gesture Endpoints"
        Get[GET /<br/>Get Current]
        Start[POST /start<br/>Start Tracking]
        Stop[POST /stop<br/>Stop Tracking]
        Process[POST /process<br/>Process Event]
    end

    subgraph "Processing"
        Vision[Vision Service Call]
        Cooldown[Cooldown Check]
        AITrigger[Trigger AI]
        Broadcast[WebSocket Broadcast]
    end

    Client --> Get
    Client --> Start
    Client --> Stop
    Client --> Process

    Get --> Vision
    Get --> Cooldown
    Cooldown --> AITrigger

    Start --> Vision
    Stop --> Vision

    Process --> Cooldown
    Cooldown --> AITrigger
    Process --> Broadcast

    AITrigger --> Broadcast

    style Get fill:#4caf50
    style Start fill:#2196f3
    style Stop fill:#f44336
    style Process fill:#ff9800
```

**Key Features:**
- **Gesture Cooldown**: Prevents duplicate AI triggers (2-second cooldown per gesture type)
- **Automatic AI Triggering**: Gestures automatically trigger AI inference
- **WebSocket Broadcasting**: Gestures broadcast to all connected clients
- **Vision Service Integration**: Proxies requests to vision service

**Gesture Types Supported:**
- wave, point, pinch
- swipe_left, swipe_right, swipe_up, swipe_down
- fist, open_palm
- thumbs_up, thumbs_down
- peace, ok
- unknown

---

#### AI Route (ai.ts)

```mermaid
graph TB
    Client[Client Request]
    
    subgraph "AI Endpoints"
        Status[GET /status<br/>Model Status]
        Init[POST /initialize<br/>Init Model]
        Infer[POST /infer<br/>Generate Text]
        Stream[POST /stream<br/>Stream Text]
    end

    subgraph "AI Service"
        AIService[AIService Instance]
        OllamaClient[Ollama HTTP Client]
    end

    subgraph "Actions"
        Validate[Validate Input]
        RateLimit[Check Rate Limit]
        Inference[Run Inference]
        Broadcast[WebSocket Broadcast]
    end

    Client --> Status
    Client --> Init
    Client --> Infer
    Client --> Stream

    Status --> AIService
    Init --> AIService
    Infer --> Validate
    Stream --> Validate

    Validate --> RateLimit
    RateLimit --> AIService
    AIService --> OllamaClient
    AIService --> Inference
    Inference --> Broadcast

    style Status fill:#4caf50
    style Init fill:#2196f3
    style Infer fill:#ff9800
    style Stream fill:#ba68c8
```

**Key Features:**
- **Rate Limiting**: 50 requests per 15 minutes
- **Input Validation**: Query max 5000 chars, context max 2000 chars
- **WebSocket Broadcasting**: AI responses broadcast to all clients
- **Streaming Support**: Server-Sent Events for long responses
- **Error Handling**: Graceful fallback when AI unavailable

---

### 4. Services

#### AI Service (ai.ts)

```mermaid
classDiagram
    class AIService {
        -baseUrl: string
        -model: string
        -initialized: boolean
        +initialize(modelPath?, modelSize?)
        +getModelStatus()
        +infer(query, context)
        +inferStream(query, context, onChunk)
        -makeOllamaRequest(endpoint, data)
    }

    class OllamaAPI {
        +POST /api/generate
        +POST /api/chat
        +GET /api/tags
    }

    AIService --> OllamaAPI : uses
```

**Responsibilities:**
- Manage Ollama API connection
- Initialize and check AI models
- Generate text responses
- Stream responses for long outputs
- Handle AI errors gracefully

**Methods:**
- `initialize()` - Check Ollama availability and load model
- `getModelStatus()` - Get current model information
- `infer()` - Generate text response
- `inferStream()` - Stream text response with callbacks

---

#### WebSocket Service (websocket.ts)

```mermaid
classDiagram
    class WebSocketService {
        -wss: WebSocketServer
        -clients: Set~WebSocket~
        +initialize(server)
        +broadcastGesture(gesture)
        +broadcastAIResponse(response)
        +broadcastSystem(message)
        +broadcastError(error)
        +getClientCount()
        -handleConnection(ws)
        -handleMessage(ws, message)
        -handleDisconnect(ws)
    }

    class WebSocket {
        +send(data)
        +close()
        +on(event, callback)
    }

    WebSocketService --> WebSocket : manages multiple
```

**Responsibilities:**
- Manage WebSocket server lifecycle
- Handle client connections/disconnections
- Broadcast messages to all clients
- Handle incoming messages from clients
- Track connected client count

**Message Types:**
- `gesture` - Gesture detection updates
- `ai_response` - AI inference results
- `system` - System events and status
- `error` - Error notifications

**Broadcast Methods:**
- `broadcastGesture()` - Send gesture updates
- `broadcastAIResponse()` - Send AI responses
- `broadcastSystem()` - Send system messages
- `broadcastError()` - Send error notifications

---

### 5. Middleware Details

#### Rate Limiter (rateLimiter.ts)

```mermaid
graph TB
    Request[Request]
    
    subgraph "Rate Limiter"
        Check[Check IP + Endpoint]
        Store[Request Store]
        Count[Count Requests]
        Window[Check Time Window]
    end

    Decision{Within Limit?}
    Allow[Allow Request]
    Reject[429 Too Many Requests]

    Request --> Check
    Check --> Store
    Store --> Count
    Count --> Window
    Window --> Decision
    Decision -->|Yes| Allow
    Decision -->|No| Reject

    style Allow fill:#4caf50
    style Reject fill:#f44336
```

**Configuration:**
- **Gesture Limiter**: 100 requests / 15 minutes
- **AI Limiter**: 50 requests / 15 minutes
- **Default Limiter**: 200 requests / 15 minutes

**Headers Added:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640000000
```

---

#### Validation Middleware (validation.ts)

```mermaid
graph TB
    Request[Request]
    
    subgraph "Validation"
        Schema[Load Schema]
        Validate[Validate Data]
        Sanitize[Sanitize Input]
    end

    Decision{Valid?}
    Pass[Pass to Route]
    Reject[400 Bad Request]

    Request --> Schema
    Schema --> Validate
    Validate --> Sanitize
    Sanitize --> Decision
    Decision -->|Yes| Pass
    Decision -->|No| Reject

    style Pass fill:#4caf50
    style Reject fill:#f44336
```

**Validators:**
- `validateGestureProcess` - Validates gesture data
  - Required: type, confidence
  - Optional: position, timestamp
  - Confidence: 0-1 range

- `validateAIInfer` - Validates AI requests
  - Required: query (max 5000 chars)
  - Optional: context (max 2000 chars)

- `validateAIInit` - Validates AI initialization
  - Optional: modelPath, modelSize

---

#### Error Handler (errorHandler.ts)

```mermaid
graph TB
    Error[Error Thrown]
    
    subgraph "Error Handler"
        Catch[Catch Error]
        Log[Log Error]
        Format[Format Response]
    end

    Response[Error Response]

    Error --> Catch
    Catch --> Log
    Log --> Format
    Format --> Response

    style Error fill:#f44336
    style Log fill:#ff9800
    style Response fill:#ff5722
```

**Error Response Format:**
```json
{
  "error": "Short description",
  "details": "Detailed message",
  "timestamp": "2025-12-21T21:00:00.000Z",
  "path": "/api/gesture",
  "status": 500
}
```

**Error Types Handled:**
- Validation errors (400)
- Rate limit errors (429)
- Internal server errors (500)
- Service unavailable (503)
- Not found (404)

---

### 6. Logger (logger.ts)

```mermaid
graph TB
    LogEvent[Log Event]
    
    subgraph "Logger"
        Winston[Winston Logger]
        Format[Format Message]
        Level[Check Log Level]
    end

    subgraph "Outputs"
        Console[Console Output]
        File[File Output]
    end

    LogEvent --> Winston
    Winston --> Format
    Format --> Level
    Level --> Console
    Level --> File

    style Winston fill:#9e9e9e
    style Console fill:#4fc3f7
    style File fill:#607d8b
```

**Log Levels:**
- `error` - Error conditions
- `warn` - Warning conditions
- `info` - Informational messages
- `debug` - Debug messages

**Log Format:**
```
[2025-12-21 21:00:00] INFO: Server started on port 3001
[2025-12-21 21:00:01] DEBUG: Gesture detected: wave
[2025-12-21 21:00:02] ERROR: AI service unavailable
```

---

## Request Flow Examples

### Example 1: Gesture Detection

```mermaid
sequenceDiagram
    participant Vision
    participant Backend
    participant AIService
    participant WSService
    participant Ollama
    participant Clients

    Vision->>Backend: POST /api/gesture/process
    Backend->>Backend: Validate request
    Backend->>Backend: Check cooldown
    Backend->>WSService: Broadcast gesture
    WSService->>Clients: Send gesture update
    Backend->>AIService: Trigger AI inference
    AIService->>Ollama: Generate response
    Ollama->>AIService: Return text
    AIService->>Backend: Return response
    Backend->>WSService: Broadcast AI response
    WSService->>Clients: Send AI update
    Backend->>Vision: Success response
```

### Example 2: AI Query

```mermaid
sequenceDiagram
    participant Client
    participant Backend
    participant RateLimit
    participant Validation
    participant AIService
    participant Ollama
    participant WSService

    Client->>Backend: POST /api/ai/infer
    Backend->>RateLimit: Check rate limit
    RateLimit->>Backend: OK
    Backend->>Validation: Validate input
    Validation->>Backend: OK
    Backend->>AIService: infer(query, context)
    AIService->>Ollama: POST /api/generate
    Ollama->>AIService: Response text
    AIService->>Backend: Return result
    Backend->>WSService: Broadcast response
    WSService->>Client: WebSocket update
    Backend->>Client: HTTP response
```

---

## Configuration

### Environment Variables

```bash
# Server
NODE_ENV=production
PORT=3001

# CORS
FRONTEND_URL=http://localhost:5173

# Services
VISION_SERVICE_URL=http://localhost:5000
OLLAMA_BASE_URL=http://localhost:11434

# AI
MODEL_SIZE=7B
MODEL_PATH=llama3.2:latest

# Logging
LOG_LEVEL=info

# Rate Limiting
GESTURE_RATE_LIMIT=100
AI_RATE_LIMIT=50
RATE_LIMIT_WINDOW_MS=900000
```

---

## Performance Optimization

### 1. Caching Strategy (Future)
- Cache AI responses by query hash
- Cache gesture analysis results
- TTL-based expiration

### 2. Request Batching (Future)
- Batch multiple gesture events
- Reduce WebSocket messages
- Aggregate updates

### 3. Connection Pooling
- Reuse HTTP connections to Vision service
- Reuse connections to Ollama
- Configure keep-alive

---

## Testing Strategy

### Unit Tests
- Test individual route handlers
- Test service methods
- Test middleware functions

### Integration Tests
- Test full request flows
- Test service interactions
- Test error scenarios

### Load Tests
- Test WebSocket scalability
- Test concurrent gesture processing
- Test AI inference queue

---

*Last updated: 2025-12-21*
