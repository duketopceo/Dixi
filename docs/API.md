# Dixi API Documentation

Complete API reference for the Dixi interactive projection system.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Backend API](#backend-api)
  - [Health Endpoints](#health-endpoints)
  - [Gesture Endpoints](#gesture-endpoints)
  - [AI Endpoints](#ai-endpoints)
  - [Projection Endpoints](#projection-endpoints)
- [Vision Service API](#vision-service-api)
  - [Health Endpoints](#vision-health-endpoints)
  - [Gesture Detection Endpoints](#gesture-detection-endpoints)
  - [Camera Endpoints](#camera-endpoints)
- [WebSocket API](#websocket-api)
- [OpenAPI Specification](#openapi-specification)

---

## Overview

The Dixi API consists of three main components:

1. **Backend API** (Node.js/Express) - Port 3001
2. **Vision Service API** (Python/Flask) - Port 5001
3. **WebSocket Server** - Port 3001 (same as backend)

**Base URLs:**
- Backend: `http://localhost:3001`
- Vision Service: `http://localhost:5001`
- WebSocket: `ws://localhost:3001`

---

## Authentication

Currently, the API does not require authentication. Future versions will support:
- API key authentication
- JWT tokens
- OAuth 2.0

---

## Rate Limiting

Rate limiting is implemented to prevent abuse:

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Gesture endpoints | 100 requests | 15 minutes |
| AI inference | 50 requests | 15 minutes |
| General endpoints | 200 requests | 15 minutes |

### Rate Limit Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640000000
```

### Rate Limit Response

When rate limit is exceeded:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 900
}
```

---

## Error Handling

All errors follow a consistent format:

### Error Response Schema

```json
{
  "error": "Short error description",
  "details": "Detailed error message",
  "timestamp": "2025-12-21T21:00:00.000Z",
  "path": "/api/gesture",
  "status": 500
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

---

## Backend API

### Health Endpoints

#### GET /api/health

Basic health check endpoint.

**Request:**
```bash
curl http://localhost:3001/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-21T21:00:00.000Z",
  "uptime": 3600.5,
  "services": {
    "backend": "running",
    "ollama": "http://localhost:11434"
  }
}
```

**JavaScript:**
```javascript
const response = await fetch('http://localhost:3001/api/health');
const health = await response.json();
console.log(health.status);
```

---

#### GET /api/health/deep

Comprehensive health check for all services.

**Request:**
```bash
curl http://localhost:3001/api/health/deep
```

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "timestamp": "2025-12-21T21:00:00.000Z",
    "uptime": 3600.5,
    "memory": {
      "rss": 52428800,
      "heapTotal": 20971520,
      "heapUsed": 15728640,
      "external": 1048576,
      "arrayBuffers": 524288
    },
    "backend": {
      "status": "healthy"
    },
    "vision": {
      "status": "healthy",
      "response": {
        "status": "healthy",
        "model_loaded": true,
        "camera_available": true
      }
    },
    "ollama": {
      "status": "healthy",
      "url": "http://localhost:11434",
      "models": ["llama3.2:latest"]
    },
    "websocket": {
      "status": "healthy",
      "connectedClients": 2
    }
  }
}
```

**JavaScript:**
```javascript
const response = await fetch('http://localhost:3001/api/health/deep');
const deepHealth = await response.json();

if (deepHealth.status === 'healthy') {
  console.log('All services operational');
} else {
  console.error('Service degraded:', deepHealth.checks);
}
```

---

#### GET /api/health/ready

Kubernetes/cloud readiness probe.

**Request:**
```bash
curl http://localhost:3001/api/health/ready
```

**Response (Ready):**
```json
{
  "status": "ready"
}
```

**Response (Not Ready):**
```http
HTTP/1.1 503 Service Unavailable

{
  "status": "not ready",
  "reason": "Vision service unavailable"
}
```

---

#### GET /api/health/live

Kubernetes/cloud liveness probe.

**Request:**
```bash
curl http://localhost:3001/api/health/live
```

**Response:**
```json
{
  "status": "alive",
  "timestamp": "2025-12-21T21:00:00.000Z"
}
```

---

### Gesture Endpoints

#### GET /api/gesture

Get current gesture data from the vision service.

**Request:**
```bash
curl http://localhost:3001/api/gesture
```

**Response:**
```json
{
  "type": "wave",
  "position": {
    "x": 0.5,
    "y": 0.5
  },
  "confidence": 0.92,
  "timestamp": 1640000000000,
  "landmarks": [
    {"x": 0.5, "y": 0.3, "z": 0.0},
    {"x": 0.52, "y": 0.32, "z": 0.01}
  ]
}
```

**JavaScript:**
```javascript
const response = await fetch('http://localhost:3001/api/gesture');
const gesture = await response.json();

if (gesture.type !== 'unknown') {
  console.log(`Detected ${gesture.type} with ${(gesture.confidence * 100).toFixed(0)}% confidence`);
}
```

**Gesture Types:**
- `wave` - Hand wave gesture
- `point` - Pointing gesture
- `pinch` - Pinch gesture (thumb and index finger)
- `swipe_left` - Swipe left
- `swipe_right` - Swipe right
- `swipe_up` - Swipe up
- `swipe_down` - Swipe down
- `fist` - Closed fist
- `open_palm` - Open hand
- `thumbs_up` - Thumbs up
- `thumbs_down` - Thumbs down
- `peace` - Peace sign (V)
- `ok` - OK sign
- `unknown` - No gesture detected

---

#### POST /api/gesture/start

Start gesture tracking from the camera.

**Request:**
```bash
curl -X POST http://localhost:3001/api/gesture/start
```

**Response:**
```json
{
  "message": "Gesture tracking started",
  "data": {
    "status": "started"
  }
}
```

**JavaScript:**
```javascript
const response = await fetch('http://localhost:3001/api/gesture/start', {
  method: 'POST'
});
const result = await response.json();
console.log(result.message);
```

---

#### POST /api/gesture/stop

Stop gesture tracking.

**Request:**
```bash
curl -X POST http://localhost:3001/api/gesture/stop
```

**Response:**
```json
{
  "message": "Gesture tracking stopped",
  "data": {
    "status": "stopped"
  }
}
```

**JavaScript:**
```javascript
const response = await fetch('http://localhost:3001/api/gesture/stop', {
  method: 'POST'
});
const result = await response.json();
console.log(result.message);
```

---

#### POST /api/gesture/process

Process a gesture event (typically called by vision service).

**Request:**
```bash
curl -X POST http://localhost:3001/api/gesture/process \
  -H "Content-Type: application/json" \
  -d '{
    "type": "wave",
    "position": {"x": 0.5, "y": 0.5},
    "confidence": 0.92,
    "timestamp": 1640000000000
  }'
```

**Request Body Schema:**
```json
{
  "type": "string (required)",
  "position": {
    "x": "number (0-1)",
    "y": "number (0-1)"
  },
  "confidence": "number (0-1, required)",
  "timestamp": "number (optional)"
}
```

**Response:**
```json
{
  "message": "Gesture processed successfully",
  "gesture": {
    "type": "wave",
    "position": {"x": 0.5, "y": 0.5},
    "confidence": 0.92,
    "timestamp": 1640000000000
  }
}
```

**JavaScript:**
```javascript
const gestureData = {
  type: 'wave',
  position: { x: 0.5, y: 0.5 },
  confidence: 0.92,
  timestamp: Date.now()
};

const response = await fetch('http://localhost:3001/api/gesture/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(gestureData)
});

const result = await response.json();
console.log(result.message);
```

---

### AI Endpoints

#### GET /api/ai/status

Get AI model status and configuration.

**Request:**
```bash
curl http://localhost:3001/api/ai/status
```

**Response:**
```json
{
  "initialized": true,
  "model": "llama3.2:latest",
  "modelSize": "7B",
  "baseUrl": "http://localhost:11434",
  "available": true,
  "models": ["llama3.2:latest", "llama3.2:3b"]
}
```

**JavaScript:**
```javascript
const response = await fetch('http://localhost:3001/api/ai/status');
const status = await response.json();

if (status.available) {
  console.log(`AI ready with model: ${status.model}`);
} else {
  console.error('AI service unavailable');
}
```

---

#### POST /api/ai/initialize

Initialize or reinitialize the AI model.

**Request:**
```bash
curl -X POST http://localhost:3001/api/ai/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "modelPath": "llama3.2:latest",
    "modelSize": "7B"
  }'
```

**Request Body Schema:**
```json
{
  "modelPath": "string (optional)",
  "modelSize": "string (optional, e.g., '3B', '7B', '13B')"
}
```

**Response:**
```json
{
  "message": "AI model initialized successfully",
  "modelSize": "7B"
}
```

**JavaScript:**
```javascript
const response = await fetch('http://localhost:3001/api/ai/initialize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    modelPath: 'llama3.2:latest',
    modelSize: '7B'
  })
});

const result = await response.json();
console.log(result.message);
```

---

#### POST /api/ai/infer

Generate AI inference for a query.

**Request:**
```bash
curl -X POST http://localhost:3001/api/ai/infer \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is gesture recognition?",
    "context": "User performed a wave gesture"
  }'
```

**Request Body Schema:**
```json
{
  "query": "string (required, max 5000 chars)",
  "context": "string (optional, max 2000 chars)"
}
```

**Response:**
```json
{
  "text": "Gesture recognition is a technology that interprets human gestures...",
  "metadata": {
    "model": "llama3.2:latest",
    "inferenceTime": 1234,
    "tokenCount": 45
  }
}
```

**JavaScript:**
```javascript
const response = await fetch('http://localhost:3001/api/ai/infer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'What is gesture recognition?',
    context: 'User performed a wave gesture'
  })
});

const inference = await response.json();
console.log(inference.text);
```

---

#### POST /api/ai/stream

Stream AI inference for long responses (Server-Sent Events).

**Request:**
```bash
curl -X POST http://localhost:3001/api/ai/stream \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Explain gesture recognition in detail",
    "context": "Educational context"
  }'
```

**Request Body Schema:**
```json
{
  "query": "string (required)",
  "context": "string (optional)"
}
```

**Response (Server-Sent Events):**
```
data: {"token":"Gesture","done":false}

data: {"token":" recognition","done":false}

data: {"token":" is","done":false}

data: [DONE]
```

**JavaScript:**
```javascript
const response = await fetch('http://localhost:3001/api/ai/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'Explain gesture recognition in detail',
    context: 'Educational context'
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') {
        console.log('Stream complete');
      } else {
        const parsed = JSON.parse(data);
        process.stdout.write(parsed.token);
      }
    }
  }
}
```

---

### Projection Endpoints

#### POST /api/projection/save

Save current projection state.

**Request:**
```bash
curl -X POST http://localhost:3001/api/projection/save \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Scene",
    "data": {
      "objects": [],
      "camera": {}
    }
  }'
```

**Response:**
```json
{
  "message": "Projection saved",
  "id": "proj_123456"
}
```

---

#### GET /api/projection/load/:id

Load a saved projection.

**Request:**
```bash
curl http://localhost:3001/api/projection/load/proj_123456
```

**Response:**
```json
{
  "id": "proj_123456",
  "name": "My Scene",
  "data": {
    "objects": [],
    "camera": {}
  },
  "timestamp": "2025-12-21T21:00:00.000Z"
}
```

---

## Vision Service API

### Vision Health Endpoints

#### GET /health

Vision service health check.

**Request:**
```bash
curl http://localhost:5001/health
```

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "camera_available": true,
  "tracking_active": false,
  "timestamp": "2025-12-21T21:00:00.000Z"
}
```

**JavaScript:**
```javascript
const response = await fetch('http://localhost:5001/health');
const health = await response.json();

if (health.camera_available) {
  console.log('Camera ready');
} else {
  console.error('Camera unavailable');
}
```

---

### Gesture Detection Endpoints

#### GET /gesture

Get current detected gesture.

**Request:**
```bash
curl http://localhost:5001/gesture
```

**Response:**
```json
{
  "type": "wave",
  "position": {
    "x": 0.5,
    "y": 0.5
  },
  "confidence": 0.92,
  "landmarks": [
    {"x": 0.5, "y": 0.3, "z": 0.0}
  ],
  "timestamp": 1640000000000
}
```

---

#### POST /gesture/start

Start gesture detection from camera.

**Request:**
```bash
curl -X POST http://localhost:5001/gesture/start
```

**Response:**
```json
{
  "status": "started",
  "message": "Gesture tracking started"
}
```

---

#### POST /gesture/stop

Stop gesture detection.

**Request:**
```bash
curl -X POST http://localhost:5001/gesture/stop
```

**Response:**
```json
{
  "status": "stopped",
  "message": "Gesture tracking stopped"
}
```

---

### Camera Endpoints

#### GET /camera/status

Get camera status.

**Request:**
```bash
curl http://localhost:5001/camera/status
```

**Response:**
```json
{
  "available": true,
  "active": true,
  "resolution": {
    "width": 1280,
    "height": 720
  },
  "fps": 30
}
```

---

#### GET /camera/frame

Get current camera frame as JPEG.

**Request:**
```bash
curl http://localhost:5001/camera/frame > frame.jpg
```

**Response:**
Binary JPEG image data

**JavaScript:**
```javascript
const response = await fetch('http://localhost:5001/camera/frame');
const blob = await response.blob();
const imageUrl = URL.createObjectURL(blob);
document.getElementById('camera-feed').src = imageUrl;
```

---

## WebSocket API

### Connection

Connect to the WebSocket server:

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onopen = () => {
  console.log('WebSocket connected');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket disconnected');
};
```

---

### Message Types

#### Gesture Update

Broadcast when a gesture is detected.

```json
{
  "type": "gesture",
  "data": {
    "type": "wave",
    "position": {
      "x": 0.5,
      "y": 0.5
    },
    "confidence": 0.92,
    "timestamp": 1640000000000
  }
}
```

---

#### AI Response

Broadcast when AI generates a response.

```json
{
  "type": "ai_response",
  "data": {
    "query": "What is gesture recognition?",
    "response": "Gesture recognition is a technology...",
    "metadata": {
      "model": "llama3.2:latest",
      "inferenceTime": 1234,
      "tokenCount": 45
    },
    "timestamp": 1640000000000
  }
}
```

---

#### System Status

Broadcast for system events.

```json
{
  "type": "system",
  "data": {
    "event": "service_started",
    "service": "vision",
    "timestamp": 1640000000000
  }
}
```

---

#### Error Message

Broadcast when an error occurs.

```json
{
  "type": "error",
  "data": {
    "error": "Camera unavailable",
    "details": "Failed to access camera device",
    "timestamp": 1640000000000
  }
}
```

---

### Client → Server Messages

#### Subscribe to Updates

```json
{
  "type": "subscribe",
  "channels": ["gesture", "ai_response", "system"]
}
```

#### Unsubscribe from Updates

```json
{
  "type": "unsubscribe",
  "channels": ["gesture"]
}
```

#### Ping

```json
{
  "type": "ping"
}
```

**Response:**
```json
{
  "type": "pong",
  "timestamp": 1640000000000
}
```

---

## OpenAPI Specification

### OpenAPI 3.0 Schema

```yaml
openapi: 3.0.0
info:
  title: Dixi API
  description: Interactive projection system API
  version: 1.0.0
  contact:
    name: Dixi Team
    url: https://github.com/duketopceo/Dixi

servers:
  - url: http://localhost:3001
    description: Backend server
  - url: http://localhost:5001
    description: Vision service

paths:
  /api/health:
    get:
      summary: Basic health check
      tags:
        - Health
      responses:
        '200':
          description: Service is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: healthy
                  timestamp:
                    type: string
                    format: date-time
                  uptime:
                    type: number
                    example: 3600.5
                  services:
                    type: object
                    properties:
                      backend:
                        type: string
                        example: running
                      ollama:
                        type: string
                        example: http://localhost:11434

  /api/health/deep:
    get:
      summary: Deep health check
      tags:
        - Health
      responses:
        '200':
          description: All services healthy
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DeepHealthCheck'
        '503':
          description: Service degraded
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DeepHealthCheck'

  /api/gesture:
    get:
      summary: Get current gesture
      tags:
        - Gesture
      responses:
        '200':
          description: Current gesture data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Gesture'
        '500':
          description: Failed to fetch gesture
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /api/gesture/start:
    post:
      summary: Start gesture tracking
      tags:
        - Gesture
      responses:
        '200':
          description: Gesture tracking started
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: Gesture tracking started
                  data:
                    type: object

  /api/gesture/stop:
    post:
      summary: Stop gesture tracking
      tags:
        - Gesture
      responses:
        '200':
          description: Gesture tracking stopped

  /api/gesture/process:
    post:
      summary: Process gesture event
      tags:
        - Gesture
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GestureInput'
      responses:
        '200':
          description: Gesture processed successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                  gesture:
                    $ref: '#/components/schemas/Gesture'

  /api/ai/status:
    get:
      summary: Get AI model status
      tags:
        - AI
      responses:
        '200':
          description: AI model status
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AIStatus'

  /api/ai/initialize:
    post:
      summary: Initialize AI model
      tags:
        - AI
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              properties:
                modelPath:
                  type: string
                  example: llama3.2:latest
                modelSize:
                  type: string
                  example: 7B
      responses:
        '200':
          description: AI model initialized

  /api/ai/infer:
    post:
      summary: Generate AI inference
      tags:
        - AI
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AIInferRequest'
      responses:
        '200':
          description: AI inference generated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AIInferResponse'

  /api/ai/stream:
    post:
      summary: Stream AI inference
      tags:
        - AI
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AIInferRequest'
      responses:
        '200':
          description: Server-Sent Events stream
          content:
            text/event-stream:
              schema:
                type: string

components:
  schemas:
    Gesture:
      type: object
      properties:
        type:
          type: string
          enum: [wave, point, pinch, swipe_left, swipe_right, swipe_up, swipe_down, fist, open_palm, thumbs_up, thumbs_down, peace, ok, unknown]
          example: wave
        position:
          type: object
          properties:
            x:
              type: number
              minimum: 0
              maximum: 1
              example: 0.5
            y:
              type: number
              minimum: 0
              maximum: 1
              example: 0.5
        confidence:
          type: number
          minimum: 0
          maximum: 1
          example: 0.92
        timestamp:
          type: number
          example: 1640000000000
        landmarks:
          type: array
          items:
            type: object
            properties:
              x:
                type: number
              y:
                type: number
              z:
                type: number

    GestureInput:
      type: object
      required:
        - type
        - confidence
      properties:
        type:
          type: string
        position:
          type: object
          properties:
            x:
              type: number
            y:
              type: number
        confidence:
          type: number
          minimum: 0
          maximum: 1
        timestamp:
          type: number

    AIStatus:
      type: object
      properties:
        initialized:
          type: boolean
        model:
          type: string
          example: llama3.2:latest
        modelSize:
          type: string
          example: 7B
        baseUrl:
          type: string
          example: http://localhost:11434
        available:
          type: boolean
        models:
          type: array
          items:
            type: string

    AIInferRequest:
      type: object
      required:
        - query
      properties:
        query:
          type: string
          maxLength: 5000
          example: What is gesture recognition?
        context:
          type: string
          maxLength: 2000
          example: User performed a wave gesture

    AIInferResponse:
      type: object
      properties:
        text:
          type: string
        metadata:
          type: object
          properties:
            model:
              type: string
            inferenceTime:
              type: number
            tokenCount:
              type: number

    DeepHealthCheck:
      type: object
      properties:
        status:
          type: string
          enum: [healthy, degraded]
        checks:
          type: object
          properties:
            timestamp:
              type: string
              format: date-time
            uptime:
              type: number
            memory:
              type: object
            backend:
              type: object
            vision:
              type: object
            ollama:
              type: object
            websocket:
              type: object

    Error:
      type: object
      properties:
        error:
          type: string
        details:
          type: string
        timestamp:
          type: string
          format: date-time
        path:
          type: string
        status:
          type: number

  securitySchemes:
    apiKey:
      type: apiKey
      in: header
      name: X-API-Key
      description: API key for authentication (future implementation)

tags:
  - name: Health
    description: Health check endpoints
  - name: Gesture
    description: Gesture detection and processing
  - name: AI
    description: AI inference and model management
  - name: Projection
    description: Projection management
```

---

## Code Examples

### Complete Integration Example

```javascript
// Initialize Dixi client
class DixiClient {
  constructor(backendUrl = 'http://localhost:3001', visionUrl = 'http://localhost:5001') {
    this.backendUrl = backendUrl;
    this.visionUrl = visionUrl;
    this.ws = null;
  }

  // Connect WebSocket
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.backendUrl.replace('http', 'ws'));
      
      this.ws.onopen = () => {
        console.log('Connected to Dixi');
        resolve();
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
      
      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      };
    });
  }

  // Handle incoming messages
  handleMessage(message) {
    switch (message.type) {
      case 'gesture':
        this.onGesture && this.onGesture(message.data);
        break;
      case 'ai_response':
        this.onAIResponse && this.onAIResponse(message.data);
        break;
      case 'system':
        this.onSystem && this.onSystem(message.data);
        break;
      case 'error':
        this.onError && this.onError(message.data);
        break;
    }
  }

  // Start gesture tracking
  async startGestures() {
    const response = await fetch(`${this.backendUrl}/api/gesture/start`, {
      method: 'POST'
    });
    return response.json();
  }

  // Stop gesture tracking
  async stopGestures() {
    const response = await fetch(`${this.backendUrl}/api/gesture/stop`, {
      method: 'POST'
    });
    return response.json();
  }

  // Get current gesture
  async getGesture() {
    const response = await fetch(`${this.backendUrl}/api/gesture`);
    return response.json();
  }

  // Send AI query
  async askAI(query, context = '') {
    const response = await fetch(`${this.backendUrl}/api/ai/infer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, context })
    });
    return response.json();
  }

  // Stream AI response
  async streamAI(query, context = '', onToken) {
    const response = await fetch(`${this.backendUrl}/api/ai/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, context })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          
          const parsed = JSON.parse(data);
          onToken && onToken(parsed.token);
        }
      }
    }
  }

  // Check health
  async checkHealth() {
    const response = await fetch(`${this.backendUrl}/api/health/deep`);
    return response.json();
  }

  // Disconnect
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Usage example
async function main() {
  const dixi = new DixiClient();

  // Set up event handlers
  dixi.onGesture = (gesture) => {
    console.log(`Gesture detected: ${gesture.type} at (${gesture.position.x}, ${gesture.position.y})`);
  };

  dixi.onAIResponse = (response) => {
    console.log(`AI: ${response.response}`);
  };

  dixi.onError = (error) => {
    console.error(`Error: ${error.error}`);
  };

  // Connect and start
  await dixi.connect();
  console.log('Connected to Dixi');

  // Check health
  const health = await dixi.checkHealth();
  console.log('System status:', health.status);

  // Start gesture tracking
  await dixi.startGestures();
  console.log('Gesture tracking started');

  // Ask AI a question
  const aiResponse = await dixi.askAI('What can I do with gestures?');
  console.log('AI Response:', aiResponse.text);

  // Keep running...
  // await new Promise(() => {});
}

main().catch(console.error);
```

---

## Additional Resources

- [GitHub Repository](https://github.com/duketopceo/Dixi)
- [Quickstart Guide](../QUICKSTART.md)
- [Architecture Documentation](../ARCHITECTURE.md)
- [Deployment Guide](../DEPLOYMENT.md)
- [Contributing Guidelines](../CONTRIBUTING.md)

---

*Last updated: 2025-12-21*
