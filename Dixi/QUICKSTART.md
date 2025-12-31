# Dixi Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 20+ (`node --version`)
- ✅ Python 3.11+ (`python --version`)
- ✅ **Ollama installed and running** (REQUIRED)
  - Install: https://ollama.ai
  - Verify: `ollama --version`
  - Start service: `ollama serve` (must be running)
  - Pull model: `ollama pull llama3.2`
- ✅ Docker & Docker Compose (`docker --version`) - Optional
- ✅ Git (`git --version`)
- ✅ Webcam/camera (for gesture recognition)

### Option 1: Docker (Recommended) 🐳

The fastest way to get Dixi running:

```bash
# 1. Clone the repository
git clone https://github.com/duketopceo/Dixi.git
cd Dixi

# 2. Install and start Ollama (REQUIRED)
# Install from https://ollama.ai if not already installed
ollama serve  # Start Ollama service (keep running)

# In a separate terminal:
ollama pull llama3.2  # Download the AI model

# 3. Copy environment file
cp .env.example .env

# 4. Build and start all services
docker-compose up --build

# 4. Open your browser
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# Vision Service: http://localhost:5000
```

That's it! 🎉 Dixi is now running.

### Option 2: Local Development 💻

For development with hot reload:

```bash
# 1. Clone and setup
git clone https://github.com/duketopceo/Dixi.git
cd Dixi

# 2. Install and start Ollama (REQUIRED)
# Install from https://ollama.ai if not already installed
ollama serve  # Start Ollama service (keep running in this terminal)

# In a separate terminal:
ollama pull llama3.2  # Download the AI model

# 3. Copy environment file
cp .env.example .env

# 4. Install root dependencies
npm install

# 5. Install all package dependencies
npm run install:all

# 6. Start all services (in separate terminals)

# Terminal 1 - Backend
cd packages/backend
npm install
npm run dev

# Terminal 2 - Frontend
cd packages/frontend
npm install
npm run dev

# Terminal 3 - Vision Service
cd packages/vision
pip install -r requirements.txt
python main.py
```

### Option 3: Individual Services

Start only the services you need:

```bash
# Backend only
cd packages/backend && npm install && npm run dev

# Frontend only
cd packages/frontend && npm install && npm run dev

# Vision service only
cd packages/vision && pip install -r requirements.txt && python main.py
```

## 🎮 First Steps

1. **Open the Interface**: Navigate to http://localhost:3000
2. **Start Gesture Tracking**: Click "Start Tracking" in the control panel
3. **Allow Camera Access**: Grant permission when prompted
4. **Try Gestures**: Move your hands in front of the camera
   - 👋 Wave (triggers AI description automatically)
   - 👉 Point (sends coordinates to AI)
   - 🤏 Pinch (sends coordinates to AI)
5. **Query AI**: Type a question in the AI Query box and hit send, or wave to trigger automatic AI response

## 🔧 Configuration

Edit `.env` file to customize:

```env
# Backend
PORT=3001
WS_PORT=3002

# Vision Service
VISION_SERVICE_PORT=5000

# Ollama Configuration (REQUIRED)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

## 🐛 Troubleshooting

### Camera Not Working
- Check browser permissions
- Ensure no other app is using the camera
- Vision service will use simulation mode if camera unavailable

### Port Already in Use
- Change ports in `.env` file
- Kill process: `lsof -ti:3001 | xargs kill` (Mac/Linux)

### Dependencies Installation Failed
- Clear npm cache: `npm cache clean --force`
- Remove node_modules: `rm -rf node_modules package-lock.json`
- Reinstall: `npm install`

### Ollama Not Working
- Ensure Ollama is installed: `ollama --version`
- Check Ollama is running: `curl http://localhost:11434/api/tags`
- Start Ollama: `ollama serve`
- Verify model is available: `ollama list` (should show llama3.2)
- Pull model if missing: `ollama pull llama3.2`
- Check OLLAMA_BASE_URL in `.env` matches your Ollama service URL

## 📚 Next Steps

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Check [CONTRIBUTING.md](./CONTRIBUTING.md) to contribute
- Explore the API documentation in [README.md](./README.md)

## 💡 Tips

- Use `docker-compose logs -f [service]` to view service logs
- Hot reload is enabled in development mode
- Press Ctrl+C to stop services
- Use `docker-compose down` to stop all containers

## 🆘 Getting Help

- Open an issue on GitHub
- Check existing issues for solutions
- Read the full documentation in README.md

---

Happy exploring with Dixi! 🎨✨
