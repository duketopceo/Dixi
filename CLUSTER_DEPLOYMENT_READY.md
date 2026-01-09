# Cluster Deployment Ready ✅

**Date**: January 8, 2025  
**Branch**: `development`  
**Commit**: `af8ad8c`

## Deployment Status

All code has been committed and pushed to GitHub. The repository is ready for cluster deployment on your 3x Intel Mac Mini cluster.

## What's Ready

### ✅ Docker Configuration

- **Backend Dockerfile**: Multi-stage build, production-optimized, health checks
- **Frontend Dockerfile**: Nginx production server, environment variable support
- **Vision Dockerfile**: Python service with MediaPipe dependencies
- **docker-compose.prod.yml**: Complete orchestration for all services
- **.dockerignore**: Optimized build context

### ✅ Documentation

- **DOCKER_DEPLOYMENT.md**: Comprehensive guide for Mac Mini cluster setup
- **DEPLOYMENT.md**: Updated with Docker references
- **DEPLOY_FIREBASE.md**: Updated with Docker deployment option

### ✅ Services Configured

1. **Backend** (Port 3001, WebSocket 3002)
   - Express API server
   - WebSocket server for real-time updates
   - Health checks enabled
   - Production environment variables

2. **Frontend** (Port 3000/80)
   - React application
   - Nginx production server
   - SPA routing support
   - Gzip compression
   - Security headers

3. **Vision Service** (Port 5000)
   - Python Flask service
   - MediaPipe integration
   - Camera access support (multiple options)
   - Health checks enabled

## Quick Start Commands

### Single Node Deployment

```bash
# Clone repository
git clone git@github.com:duketopceo/Dixi.git
cd Dixi

# Switch to development branch
git checkout development

# Create environment file
cp .env.example .env.production
# Edit .env.production with your settings

# Build and start all services
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Multi-Node Cluster Deployment

See [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) for detailed multi-node setup instructions.

**Quick Overview**:
1. Deploy frontend on Node 1
2. Deploy backend on Node 2
3. Deploy vision service on Node 3
4. Update environment variables to point to correct service IPs

## Environment Variables Required

Create `.env.production` with:

```bash
# Frontend URLs (adjust for your cluster)
VITE_API_URL=http://<backend-node-ip>:3001/api
VITE_WS_URL=ws://<backend-node-ip>:3002
VITE_VISION_SERVICE_URL=http://<vision-node-ip>:5000

# Backend Configuration
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=gemma3:4b
FRONTEND_URL=http://<frontend-node-ip>:3000

# Vision Service
CAMERA_INDEX=0  # or RTSP/HTTP stream URL
```

## Camera Configuration

For Mac Mini cluster, choose one:

1. **Host Network Mode** (Simplest)
   - Modify `docker-compose.prod.yml` to use `network_mode: host` for vision service

2. **Device Passthrough**
   - Uncomment device mapping in `docker-compose.prod.yml`

3. **Network Camera Stream**
   - Set `CAMERA_INDEX=rtsp://camera-ip:554/stream`

See [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) for detailed camera setup.

## Health Checks

All services include health checks:

```bash
# Backend
curl http://localhost:3001/health

# Vision Service
curl http://localhost:5000/health

# Frontend
curl http://localhost:3000/health
```

## Service Endpoints

Once deployed:

- **Frontend**: `http://<node-ip>:3000`
- **Backend API**: `http://<node-ip>:3001/api`
- **WebSocket**: `ws://<node-ip>:3002`
- **Vision Service**: `http://<node-ip>:5000`

## Next Steps

1. **Set up Ollama** on one of the Mac Minis (or run in Docker)
2. **Configure camera access** (see DOCKER_DEPLOYMENT.md)
3. **Set environment variables** for your cluster IPs
4. **Deploy services** using docker-compose
5. **Test health endpoints** to verify all services are running
6. **Monitor logs** for any issues

## Troubleshooting

If you encounter issues:

1. Check service logs: `docker-compose -f docker-compose.prod.yml logs -f <service>`
2. Verify health checks: `curl http://localhost:<port>/health`
3. Check network connectivity: `docker network inspect dixi_dixi-network`
4. Review [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) troubleshooting section

## Security Note

GitHub detected 4 vulnerabilities (1 high, 2 moderate, 1 low). Review and update dependencies:

```bash
# Check vulnerabilities
npm audit

# Update dependencies
npm update

# Or review at:
# https://github.com/duketopceo/Dixi/security/dependabot
```

## Support

- **Docker Deployment Guide**: [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)
- **General Deployment**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Firebase Deployment**: [DEPLOY_FIREBASE.md](./DEPLOY_FIREBASE.md)

---

**Status**: ✅ Ready for cluster deployment  
**Last Updated**: January 8, 2025
