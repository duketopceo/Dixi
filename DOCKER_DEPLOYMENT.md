# Docker Deployment Guide for Mac Mini Cluster

This guide covers deploying the Dixi application on a 3x Intel Mac Mini cluster using Docker.

## Prerequisites

- Docker Desktop or Docker Engine installed on each Mac Mini
- Camera access configured (see Camera Setup section)
- Ollama running (either in Docker or on host)
- Network connectivity between Mac Minis

## Architecture

```
┌─────────────────────────────────────────┐
│         Mac Mini Cluster                │
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │  Node 1  │  │  Node 2  │  │ Node 3 ││
│  │          │  │          │  │        ││
│  │ Frontend │  │ Backend  │  │ Vision ││
│  │          │  │          │  │        ││
│  └──────────┘  └──────────┘  └────────┘│
│                                         │
│  External: Ollama (host.docker.internal)│
└─────────────────────────────────────────┘
```

## Quick Start

1. **Clone and navigate to the repository:**
   ```bash
   cd /path/to/Dixi
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with your settings
   ```

3. **Build and start services:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

4. **Check service status:**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   docker-compose -f docker-compose.prod.yml logs -f
   ```

## Environment Variables

Create a `.env.production` file in the root directory:

```bash
# Frontend URLs (adjust for your cluster setup)
VITE_API_URL=http://<backend-node-ip>:3001/api
VITE_WS_URL=ws://<backend-node-ip>:3002
VITE_VISION_SERVICE_URL=http://<vision-node-ip>:5000

# Backend Configuration
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=gemma3:4b
FRONTEND_URL=http://<frontend-node-ip>:3000

# Vision Service
CAMERA_INDEX=0  # or RTSP/HTTP stream URL

# Optional: Override defaults
PORT=3001
WS_PORT=3002
```

## Camera Setup

The vision service needs camera access. On Mac, you have several options:

### Option 1: Host Network Mode (Simplest)

Modify `docker-compose.prod.yml` for the vision service:

```yaml
vision:
  network_mode: host
  # Remove ports mapping when using host network
```

This gives the container direct access to the host's network and devices.

### Option 2: Device Passthrough

If your camera appears as `/dev/video0`:

```yaml
vision:
  devices:
    - /dev/video0:/dev/video0
```

### Option 3: Network Camera Stream

Use an RTSP or HTTP camera stream:

```bash
CAMERA_INDEX=rtsp://camera-ip:554/stream
# or
CAMERA_INDEX=http://camera-ip:8080/video
```

Update the vision service to handle network streams in `unified_tracking.py`.

### Option 4: Virtual Camera (OBS, etc.)

Use OBS Virtual Camera or similar software to create a virtual camera that Docker can access.

## Cluster Deployment

### Single Node (All Services)

Deploy all services on one Mac Mini:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Multi-Node Deployment

#### Node 1: Frontend
```bash
# On Node 1
docker-compose -f docker-compose.prod.yml up -d frontend
```

#### Node 2: Backend
```bash
# On Node 2
docker-compose -f docker-compose.prod.yml up -d backend
```

#### Node 3: Vision Service
```bash
# On Node 3
docker-compose -f docker-compose.prod.yml up -d vision
```

**Important:** Update environment variables on each node to point to the correct service IPs.

## Networking

### Docker Network

Services communicate via the `dixi-network` bridge network. Services can reach each other by service name:
- `http://backend:3001`
- `http://vision:5000`

### External Access

- Frontend: `http://<node-ip>:3000`
- Backend API: `http://<node-ip>:3001`
- WebSocket: `ws://<node-ip>:3002`
- Vision Service: `http://<node-ip>:5000`

### Ollama Access

Ollama should be running on the host (not in Docker). The backend connects via `host.docker.internal:11434`.

To run Ollama in Docker instead:

```yaml
# Add to docker-compose.prod.yml
ollama:
  image: ollama/ollama:latest
  container_name: dixi-ollama
  ports:
    - "11434:11434"
  volumes:
    - ollama-data:/root/.ollama
  networks:
    - dixi-network

# Update backend environment:
# OLLAMA_BASE_URL=http://ollama:11434
```

## Health Checks

All services include health checks:

```bash
# Check service health
docker-compose -f docker-compose.prod.yml ps

# Manual health checks
curl http://localhost:3001/health  # Backend
curl http://localhost:5000/health   # Vision
curl http://localhost:3000/health    # Frontend
```

## Logs

View logs for all services:

```bash
docker-compose -f docker-compose.prod.yml logs -f
```

View logs for a specific service:

```bash
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f vision
docker-compose -f docker-compose.prod.yml logs -f frontend
```

## Data Persistence

Data is persisted in:
- `./data` - Scene data, models, etc.
- `./logs` - Application logs

Ensure these directories exist and have proper permissions:

```bash
mkdir -p data logs
chmod 755 data logs
```

## Scaling

### Horizontal Scaling (Multiple Instances)

For load balancing, you can run multiple instances:

```bash
# Scale backend
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Use a load balancer (nginx, traefik, etc.) in front
```

### Resource Limits

Add resource limits in `docker-compose.prod.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## Troubleshooting

### Camera Not Working

1. Check camera permissions:
   ```bash
   # On Mac
   System Preferences > Security & Privacy > Camera
   ```

2. Test camera access:
   ```bash
   docker run --rm -it --device=/dev/video0 python:3.11-slim python -c "import cv2; cap = cv2.VideoCapture(0); print('Camera:', cap.isOpened())"
   ```

3. Try host network mode for vision service

### Services Can't Connect

1. Check network:
   ```bash
   docker network inspect dixi_dixi-network
   ```

2. Verify service names match in environment variables

3. Check firewall settings on Mac

### Build Failures

1. Clear Docker cache:
   ```bash
   docker system prune -a
   ```

2. Rebuild without cache:
   ```bash
   docker-compose -f docker-compose.prod.yml build --no-cache
   ```

### Port Conflicts

If ports are already in use:

1. Find process using port:
   ```bash
   lsof -i :3001
   ```

2. Kill process or change port in `docker-compose.prod.yml`

## Production Considerations

1. **SSL/TLS**: Use a reverse proxy (nginx, traefik) with Let's Encrypt
2. **Monitoring**: Add Prometheus/Grafana for metrics
3. **Backups**: Regularly backup `./data` directory
4. **Updates**: Use version tags for images, not `latest`
5. **Secrets**: Use Docker secrets or environment files for sensitive data

## Maintenance

### Update Services

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

### Clean Up

```bash
# Stop and remove containers
docker-compose -f docker-compose.prod.yml down

# Remove volumes (WARNING: deletes data)
docker-compose -f docker-compose.prod.yml down -v

# Remove images
docker-compose -f docker-compose.prod.yml down --rmi all
```

## Support

For issues or questions:
- Check logs: `docker-compose -f docker-compose.prod.yml logs`
- Review health checks: `docker-compose -f docker-compose.prod.yml ps`
- Check network: `docker network inspect dixi_dixi-network`
