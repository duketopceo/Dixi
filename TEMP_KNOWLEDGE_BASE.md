# Temporary Knowledge Base - December 30, 2025

## Project Overview
Dixi is an AI-powered interactive projection system using:
- **Frontend**: React 18 + TypeScript + Vite + Three.js (port 3000)
- **Backend**: Node.js + Express + TypeScript (port 3001)
- **WebSocket**: Port 3002
- **Vision Service**: Python + Flask + MediaPipe (port 5001, moved from 5000 due to macOS conflict)
- **AI Service**: Ollama (port 11434)
  - Text model: `gemma3:4b`
  - Vision model: `llava:7b` (for image analysis)

## Recent Major Changes (December 30, 2025)

### 1. Vision Service Simplification
- **Problem**: Service freezing on complex gestures (figure-eight, two-hand gestures)
- **Solution**: Removed computationally expensive functions:
  - `_detect_motion_pattern()` - removed
  - `_detect_two_hand_gesture()` - removed
- **Result**: Simplified to 10 core gestures: pinch, point, open_palm, fist, swipe_left, swipe_right, peace, thumbs_up, thumbs_down, ok, wave
- **Port Change**: Moved from 5000 to 5001 (macOS ControlCenter uses 5000)

### 2. Control Panel Rebuild
- **Problem**: Monolithic component, hard to maintain
- **Solution**: Modular component architecture:
  - `ControlPanel/index.tsx` - Main orchestrator
  - `sections/ConnectionStatus.tsx` - Service health checks
  - `sections/GestureControls.tsx` - Gesture tracking controls
  - `sections/AIChat.tsx` - AI query interface
  - `sections/DebugLogs.tsx` - Debug log viewer
  - `hooks/useSystemStatus.ts` - System status polling hook
- **Result**: Clean, maintainable, modular codebase

### 3. WebSocket Stability
- **Problem**: Multiple connections, constant reconnects
- **Solution**: Singleton pattern with `WebSocketManager` class
- **Implementation**: `useSyncExternalStore` for React integration
- **Result**: Stable "LIVE" connection, no more constant reconnects

### 4. Vision AI Integration
- **Added**: llava:7b vision model for image analysis
- **Feature**: 👁️ "What do you see?" button in AI input bar
- **Endpoints**: 
  - `/api/ai/vision/analyze` - Analyze current camera frame
  - `/api/ai/vision/status` - Check vision model availability
- **Vision Service**: Added `/capture_frame` and `/capture_frame_base64` endpoints
- **Rate Limiting**: Separate `visionLimiter` (10 requests/minute)

### 5. Port Configuration
- Frontend: 3000 (or 5173 fallback)
- Backend API: 3001
- WebSocket: 3002
- Vision Service: 5001 (changed from 5000)
- Ollama: 11434

### 6. Git Branch Structure
- **main**: Stable branch, pushed to origin
- **development**: Current working branch, all new work happens here
- **Strategy**: Work on development, merge to main when stable

## Current System Status

### Working Features
✅ Camera feed with hand tracking overlay
✅ Gesture detection (10 core gestures)
✅ WebSocket stable connection
✅ AI text queries (gemma3:4b)
✅ Vision AI analysis (llava:7b) - requires restart after rate limit fix
✅ Control Panel with modular components
✅ System health monitoring

### Known Issues
⚠️ Vision analysis rate limiter needs backend restart to apply new limits
⚠️ FPS counter shows 0 (cosmetic issue, camera is working)

## Architecture Decisions

### Vision Service
- Simplified gesture detection for stability
- Removed complex motion patterns that caused freezes
- Focus on reliable, fast gesture recognition

### Frontend Architecture
- Modular components for maintainability
- Custom hooks for reusable logic
- Zustand stores for state management
- Singleton WebSocket for connection stability

### AI Service
- Dual model approach: text (gemma3:4b) + vision (llava:7b)
- Separate rate limiters for different AI operations
- Context-aware prompts with gesture information

## MCP Servers Configured
1. **GitKraken** - Git operations
2. **github-project-manager** - GitHub project management (token configured)
3. **mcp-compass** - Design system tools
4. **MCP_DOCKER** - Docker operations

## Environment Variables
- `VITE_VISION_SERVICE_URL` - Vision service URL (default: http://localhost:5001)
- `VITE_API_URL` - Backend API URL (default: http://localhost:3001/api)
- `VITE_WS_URL` - WebSocket URL (default: ws://localhost:3002)
- `OLLAMA_BASE_URL` - Ollama service URL (default: http://localhost:11434)
- `OLLAMA_MODEL` - Text model (default: gemma3:4b)
- `OLLAMA_VISION_MODEL` - Vision model (default: llava:7b)
- `VISION_SERVICE_PORT` - Vision service port (default: 5001)

## Testing
- All system tests passing
- Vision service confirmed stable
- WebSocket connection stable
- Camera feed working on main page

## Next Steps
1. Restart backend to apply vision rate limiter changes
2. Test vision analysis button after restart
3. Continue development on `development` branch
4. Merge to `main` when features are stable
