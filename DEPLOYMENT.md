# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] Set `NODE_ENV=production` in all services
- [ ] Configure production database credentials (if applicable)
- [ ] Set secure `FRONTEND_URL` for CORS
- [ ] Configure `LOG_LEVEL=info` or `warn` for production
- [ ] Set rate limiting thresholds appropriately
- [ ] Configure GPU settings for optimal performance
- [ ] Set up secure WebSocket connection (WSS)

### 2. Security
- [ ] Enable HTTPS/TLS on all endpoints
- [ ] Configure helmet security headers
- [ ] Set up rate limiting (already configured)
- [ ] Implement request validation (already configured)
- [ ] Enable CORS only for trusted origins
- [ ] Set secure cookie flags if using sessions
- [ ] Implement API key authentication (TODO)
- [ ] Regular security audits with `npm audit`

### 3. Monitoring & Logging
- [ ] Set up centralized logging (Stackdriver, CloudWatch, etc.)
- [ ] Configure error tracking (Sentry, Rollbar, etc.)
- [ ] Set up performance monitoring (New Relic, Datadog, etc.)
- [ ] Configure uptime monitoring (Pingdom, UptimeRobot, etc.)
- [ ] Set up alerts for critical errors
- [ ] Monitor GPU usage and temperature
- [ ] Track API response times

### 4. Infrastructure
- [ ] Provision adequate CPU/GPU resources
- [ ] Set up load balancer for multiple instances
- [ ] Configure auto-scaling policies
- [ ] Set up backup and disaster recovery
- [ ] Configure CDN for frontend assets
- [ ] Set up Redis for caching (recommended)
- [ ] Configure database replication (if applicable)

### 5. CI/CD
- [ ] Set up GitHub Actions workflow (already configured)
- [ ] Configure automated testing
- [ ] Set up staging environment
- [ ] Implement blue-green or canary deployments
- [ ] Configure rollback procedures

## Deployment Options

### Option 1: Docker Compose (Single Server)

**Best for**: Development, small-scale production, on-premise

```bash
# 1. Clone repository
git clone https://github.com/duketopceo/Dixi.git
cd Dixi

# 2. Configure environment
cp .env.example .env
# Edit .env with production values

# 3. Build and start
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 4. Verify health
curl http://localhost:3001/health/deep
```

**Monitoring**:
```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f vision

# Check container status
docker-compose ps

# Restart services
docker-compose restart backend
```

### Option 2: GCP Cloud Run (Serverless)

**Best for**: Scalable production, cost-effective, managed infrastructure

```bash
# 1. Set up GCP project
gcloud config set project YOUR_PROJECT_ID

# 2. Build and push images
./deploy-gcp.sh

# 3. Configure custom domain (optional)
gcloud run domain-mappings create --service=dixi-backend --domain=api.yourdomain.com

# 4. Set up Cloud Load Balancing
# Configure in GCP Console or with Terraform
```

**Environment Variables** (Cloud Run):
```bash
gcloud run services update dixi-backend \
  --set-env-vars NODE_ENV=production,USE_GPU=true,LOG_LEVEL=info
```

**Scaling Configuration**:
```bash
gcloud run services update dixi-backend \
  --min-instances=1 \
  --max-instances=10 \
  --concurrency=80
```

### Option 3: Kubernetes (Advanced)

**Best for**: Large-scale production, multi-region, high availability

```bash
# 1. Create Kubernetes manifests (see k8s/ directory)
kubectl apply -f k8s/

# 2. Configure ingress
kubectl apply -f k8s/ingress.yml

# 3. Set up horizontal pod autoscaling
kubectl apply -f k8s/hpa.yml

# 4. Monitor deployment
kubectl get pods -w
kubectl logs -f deployment/dixi-backend
```

## Performance Optimization

### Backend Optimization

1. **Enable Node.js Clustering**
   - Use PM2 or Node's cluster module
   - Recommended: 2-4 workers per CPU core

2. **GPU Memory Management**
   ```javascript
   // In AI service initialization
   tf.ENV.set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);
   tf.ENV.set('WEBGL_FORCE_F16_TEXTURES', true);
   ```

3. **Connection Pooling**
   - Configure axios keepAlive
   - Use connection pools for databases

4. **Caching Strategy**
   ```bash
   # Install Redis
   npm install redis

   # Configure in .env
   REDIS_URL=redis://localhost:6379
   ```

### Frontend Optimization

1. **CDN Configuration**
   - Serve static assets from CDN
   - Enable compression
   - Set cache headers

2. **Code Splitting**
   - Already configured with Vite
   - Lazy load components

3. **Asset Optimization**
   - Compress images
   - Minify CSS/JS
   - Use WebP format

### Vision Service Optimization

1. **Frame Rate Throttling**
   ```python
   # In main.py, adjust sleep time
   time.sleep(0.033)  # 30 FPS (adjust as needed)
   ```

2. **Model Optimization**
   - Use quantized MediaPipe models
   - Reduce input resolution if needed

3. **GPU Utilization**
   - Monitor with `nvidia-smi`
   - Adjust batch sizes

## Health Checks

### Endpoints

- `GET /health` - Basic health check (fast)
- `GET /health/deep` - Comprehensive health check
- `GET /health/ready` - Readiness probe (k8s)
- `GET /health/live` - Liveness probe (k8s)

### Monitoring Script

```bash
#!/bin/bash
# health-monitor.sh

BACKEND_URL="http://localhost:3001"
VISION_URL="http://localhost:5000"

# Check backend
if curl -f -s "$BACKEND_URL/health" > /dev/null; then
    echo "✅ Backend healthy"
else
    echo "❌ Backend unhealthy"
    # Send alert
fi

# Check vision service
if curl -f -s "$VISION_URL/health" > /dev/null; then
    echo "✅ Vision service healthy"
else
    echo "❌ Vision service unhealthy"
    # Send alert
fi
```

## Troubleshooting

### Common Issues

#### 1. High Memory Usage

**Symptoms**: OOM errors, slow response times

**Solutions**:
```bash
# Increase Node.js heap size
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Monitor memory
watch -n 1 'curl http://localhost:3001/health/deep | jq .checks.memory'
```

#### 2. GPU Not Detected

**Symptoms**: `USE_GPU=true` but TensorFlow.js using CPU

**Solutions**:
```bash
# Check NVIDIA drivers
nvidia-smi

# Check CUDA installation
nvcc --version

# Verify Docker GPU runtime
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

#### 3. Rate Limit Too Restrictive

**Symptoms**: 429 errors for legitimate traffic

**Solutions**:
```javascript
// Adjust in middleware/rateLimiter.ts
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // Increase limit
  // ...
});
```

#### 4. WebSocket Connection Issues

**Symptoms**: Disconnects, no real-time updates

**Solutions**:
```bash
# Check WebSocket port
netstat -an | grep 3002

# Test WebSocket connection
wscat -c ws://localhost:3002

# Check firewall rules
sudo ufw status
```

#### 5. Vision Service Camera Access

**Symptoms**: "Camera not available" errors

**Solutions**:
```bash
# Check camera devices
ls -l /dev/video*

# Grant permissions to Docker
docker run --device=/dev/video0 ...

# Use simulation mode
# Vision service automatically falls back
```

## Monitoring Dashboards

### Prometheus Metrics (TODO)

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'dixi-backend'
    static_configs:
      - targets: ['localhost:3001']
```

### Grafana Dashboard (TODO)

- API request rate
- Response time percentiles
- Error rate
- GPU utilization
- Memory usage
- WebSocket connections

## Backup & Recovery

### Backup Checklist

- [ ] AI model files
- [ ] Configuration files
- [ ] Database (if applicable)
- [ ] User data
- [ ] Logs (last 30 days)

### Recovery Procedure

1. Stop all services
2. Restore from backup
3. Verify configuration
4. Run health checks
5. Gradually restore traffic

## Support & Escalation

### Log Locations

- Backend: `packages/backend/logs/`
- Vision: Docker logs (`docker logs dixi-vision`)
- Frontend: Browser console

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug docker-compose up

# View detailed logs
docker-compose logs -f --tail=100
```

### Performance Profiling

```bash
# Node.js profiling
node --inspect packages/backend/dist/index.js

# Python profiling
python -m cProfile packages/vision/main.py
```

---

## Next Steps

1. Complete this deployment
2. Set up monitoring dashboards
3. Configure alerting
4. Perform load testing
5. Document runbooks
6. Train operations team

For questions: Open an issue on GitHub or contact the team.
