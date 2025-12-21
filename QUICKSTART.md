# Dixi Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 20+ (`node --version`)
- ✅ Python 3.11+ (`python --version`)
- ✅ Docker & Docker Compose (`docker --version`)
- ✅ Git (`git --version`)

Optional but recommended:
- NVIDIA GPU with CUDA support
- NVIDIA Container Runtime (for Docker GPU support)

### Option 1: Docker (Recommended) 🐳

The fastest way to get Dixi running:

```bash
# 1. Clone the repository
git clone https://github.com/duketopceo/Dixi.git
cd Dixi

# 2. Copy environment file
cp .env.example .env

# 3. Build and start all services
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

# 2. Copy environment file
cp .env.example .env

# 3. Install root dependencies
npm install

# 4. Install all package dependencies
npm run install:all

# 5. Start all services (in separate terminals)

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
   - 👉 Point
   - 🤏 Pinch
   - ✋ Open palm
5. **Query AI**: Type a question in the AI Query box and hit send

## 🔧 Configuration

Edit `.env` file to customize:

```env
# Ports
PORT=3001
VISION_SERVICE_PORT=5000

# AI Model
MODEL_SIZE=7B          # Options: 7B, 13B, 30B
USE_GPU=true          # Enable GPU acceleration

# Vision
ENABLE_CAMERA=true    # Use real camera or simulation
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

### GPU Not Detected
- Ensure NVIDIA drivers are installed
- Check CUDA installation: `nvidia-smi`
- Set `USE_GPU=false` in `.env` to run on CPU

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
