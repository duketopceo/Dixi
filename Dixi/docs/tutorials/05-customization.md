# Tutorial 5: Customization and Configuration

Customize Dixi to suit your needs.

## Configuration Options

### Environment Variables

```bash
# .env file

# Server
NODE_ENV=production|development
PORT=3001
LOG_LEVEL=debug|info|warn|error

# Services
VISION_SERVICE_URL=http://localhost:5000
OLLAMA_BASE_URL=http://localhost:11434
FRONTEND_URL=http://localhost:5173

# AI
MODEL_SIZE=3B|7B|13B
MODEL_PATH=llama3.2:latest

# Vision
CAMERA_DEVICE=/dev/video0
CAMERA_WIDTH=1280
CAMERA_HEIGHT=720
CAMERA_FPS=30

# Performance
GESTURE_COOLDOWN_MS=2000
RATE_LIMIT_WINDOW_MS=900000
```

### Frontend Customization

Edit `packages/frontend/src/styles/index.css` to change:
- Colors
- Fonts
- Layout
- Animations

### Gesture Configuration

Edit `packages/vision/main.py` to adjust:
- Detection confidence thresholds
- Number of hands tracked
- Gesture cooldowns

## Advanced Options

- Custom gesture definitions
- AI prompt templates
- WebSocket message formats
- Rate limiting rules

---

*Last updated: 2025-12-21*
