# Production Deployment Guide

> ⚠️ **IMPORTANT**: Docker configs in this file are for future use. For current development, run services locally (`npm run dev` + `python main.py`). Do NOT attempt to use Docker until the projector interaction loop is stable and tested on your machine. Current focus is on local projector interaction - Docker and cloud deployment will be revisited once core functionality is solid.

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

### Option 1: Docker Compose (Single Server) - FUTURE USE

> ⚠️ **Note**: This option is planned for future deployment. For now, run services locally.

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

---

## AWS Deployment Guide

### Option A: AWS EC2 with Docker

**Architecture**: Traditional VM-based deployment with full control

**Prerequisites**:
- AWS Account
- AWS CLI configured
- EC2 key pair created

**Step-by-Step Setup**:

```bash
# 1. Launch EC2 Instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type g4dn.xlarge \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxx \
  --subnet-id subnet-xxxxx \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":100,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=Dixi-Production}]'

# 2. SSH into instance
ssh -i your-key.pem ubuntu@ec2-xx-xx-xx-xx.compute.amazonaws.com

# 3. Install dependencies
sudo apt-get update
sudo apt-get install -y docker.io docker-compose git nvidia-docker2

# 4. Clone and deploy
git clone https://github.com/duketopceo/Dixi.git
cd Dixi
cp .env.example .env
# Edit .env with production values
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 5. Configure security group
# Open ports: 80, 443, 3001, 5000 (adjust as needed)
```

**Cost Estimate (Monthly)**:
- g4dn.xlarge (GPU): ~$400
- t3.medium (backend): ~$30
- Load Balancer: ~$20
- S3 Storage (100GB): ~$2
- Data Transfer: ~$10-50
- **Total: ~$462-$502/month**

---

### Option B: AWS ECS (Elastic Container Service)

**Architecture**: Managed container orchestration with Fargate

```bash
# 1. Create ECS Cluster
aws ecs create-cluster --cluster-name dixi-production

# 2. Create ECR repositories
aws ecr create-repository --repository-name dixi/backend
aws ecr create-repository --repository-name dixi/frontend
aws ecr create-repository --repository-name dixi/vision

# 3. Build and push Docker images
$(aws ecr get-login --no-include-email --region us-east-1)
docker build -t dixi/backend ./packages/backend
docker tag dixi/backend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/dixi/backend:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/dixi/backend:latest

# 4. Create task definitions (see ecs-task-definitions/)
aws ecs register-task-definition --cli-input-json file://ecs-backend-task.json

# 5. Create ECS services
aws ecs create-service \
  --cluster dixi-production \
  --service-name backend-service \
  --task-definition dixi-backend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"

# 6. Set up Application Load Balancer
aws elbv2 create-load-balancer \
  --name dixi-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx
```

**Task Definition Example** (`ecs-backend-task.json`):
```json
{
  "family": "dixi-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/dixi/backend:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "VISION_SERVICE_URL", "value": "http://vision-service:5000"},
        {"name": "OLLAMA_BASE_URL", "value": "http://ollama-service:11434"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/dixi-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

**Cost Estimate (Monthly)**:
- Fargate vCPU/Memory: ~$60-$100
- EC2 for GPU workloads: ~$400
- ALB: ~$20
- ECR Storage: ~$1
- CloudWatch Logs: ~$10
- **Total: ~$491-$531/month**

---

### Option C: AWS Lambda + API Gateway

**Architecture**: Serverless for backend (Vision service still needs EC2/ECS)

```bash
# 1. Package backend for Lambda
cd packages/backend
npm run build
zip -r function.zip dist/ node_modules/

# 2. Create Lambda function
aws lambda create-function \
  --function-name dixi-backend \
  --runtime nodejs20.x \
  --role arn:aws:iam::123456789:role/lambda-execution-role \
  --handler dist/lambda.handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 512 \
  --environment Variables={NODE_ENV=production,VISION_SERVICE_URL=http://vision.example.com}

# 3. Create API Gateway
aws apigatewayv2 create-api \
  --name dixi-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:us-east-1:123456789:function:dixi-backend
```

**Note**: Lambda is not ideal for WebSocket server; consider using AWS IoT Core or AppSync for real-time features.

**Cost Estimate (Monthly)**:
- Lambda requests: ~$5-20
- API Gateway: ~$3.50
- EC2 for Vision/Ollama: ~$800
- **Total: ~$808.50-$823.50/month**

---

## Azure Deployment Guide

### Option A: Azure Virtual Machines

```bash
# 1. Create resource group
az group create --name Dixi-RG --location eastus

# 2. Create VM with GPU
az vm create \
  --resource-group Dixi-RG \
  --name DiximainVM \
  --image Canonical:0001-com-ubuntu-server-focal:20_04-lts-gen2:latest \
  --size Standard_NC6s_v3 \
  --admin-username azureuser \
  --generate-ssh-keys

# 3. Open ports
az vm open-port --resource-group Dixi-RG --name DixiMainVM --port 80
az vm open-port --resource-group Dixi-RG --name DixiMainVM --port 443
az vm open-port --resource-group Dixi-RG --name DixiMainVM --port 3001

# 4. SSH and deploy
ssh azureuser@<vm-ip-address>
# Follow Docker deployment steps
```

**Cost Estimate (Monthly)**:
- Standard_NC6s_v3 (GPU): ~$900
- Standard_B2s (backend): ~$40
- Load Balancer: ~$20
- Storage: ~$5
- **Total: ~$965/month**

---

### Option B: Azure Container Instances

```bash
# 1. Create container registry
az acr create --resource-group Dixi-RG --name dixiacr --sku Basic

# 2. Build and push images
az acr build --registry dixiacr --image dixi/backend:latest ./packages/backend

# 3. Create container instance
az container create \
  --resource-group Dixi-RG \
  --name dixi-backend \
  --image dixiacr.azurecr.io/dixi/backend:latest \
  --cpu 2 \
  --memory 4 \
  --registry-login-server dixiacr.azurecr.io \
  --registry-username <username> \
  --registry-password <password> \
  --ports 3001 \
  --environment-variables NODE_ENV=production
```

**Cost Estimate (Monthly)**:
- Container Instances: ~$50
- VM for GPU: ~$900
- Container Registry: ~$5
- **Total: ~$955/month**

---

### Option C: Azure Kubernetes Service (AKS)

```bash
# 1. Create AKS cluster
az aks create \
  --resource-group Dixi-RG \
  --name dixi-aks-cluster \
  --node-count 3 \
  --node-vm-size Standard_D2s_v3 \
  --enable-addons monitoring \
  --generate-ssh-keys

# 2. Get credentials
az aks get-credentials --resource-group Dixi-RG --name dixi-aks-cluster

# 3. Deploy application
kubectl apply -f k8s/

# 4. Expose service
kubectl expose deployment dixi-backend --type=LoadBalancer --port=80 --target-port=3001
```

**Cost Estimate (Monthly)**:
- AKS Control Plane: Free
- Worker Nodes (3x Standard_D2s_v3): ~$210
- GPU Nodes (1x NC6s_v3): ~$900
- Load Balancer: ~$20
- **Total: ~$1,130/month**

---

## DigitalOcean Deployment Guide

### Option A: DigitalOcean Droplets

**Most Cost-Effective Cloud Option**

```bash
# 1. Create Droplet via CLI
doctl compute droplet create dixi-main \
  --size c-8 \
  --image ubuntu-20-04-x64 \
  --region nyc1 \
  --ssh-keys your-ssh-key-id

# 2. SSH into droplet
ssh root@<droplet-ip>

# 3. Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# 4. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2:latest

# 5. Deploy Dixi
git clone https://github.com/duketopceo/Dixi.git
cd Dixi
cp .env.example .env
# Edit .env
docker-compose -f docker-compose.prod.yml up -d
```

**Cost Estimate (Monthly)**:
- 8 vCPU, 16GB RAM Droplet: ~$96
- GPU Droplet (if available): ~$300
- Load Balancer: ~$12
- Spaces (Storage): ~$5
- **Total: ~$113/month** (or ~$413 with GPU)

---

### Option B: DigitalOcean App Platform

**Managed Container Platform**

```bash
# 1. Create app.yaml
cat > .do/app.yaml << EOF
name: dixi
services:
  - name: backend
    github:
      repo: duketopceo/Dixi
      branch: main
      deploy_on_push: true
    source_dir: /packages/backend
    build_command: npm run build
    run_command: npm start
    http_port: 3001
    instance_count: 2
    instance_size_slug: professional-s
    envs:
      - key: NODE_ENV
        value: production
  - name: frontend
    github:
      repo: duketopceo/Dixi
      branch: main
    source_dir: /packages/frontend
    build_command: npm run build
    instance_size_slug: basic-xxs
    static_site_detectors:
      - build_command: npm run build
        output_directory: dist
EOF

# 2. Deploy using doctl
doctl apps create --spec .do/app.yaml

# 3. Get app info
doctl apps list
```

**Note**: App Platform doesn't support GPU workloads. Vision and Ollama services must run on a separate Droplet.

**Cost Estimate (Monthly)**:
- App Platform (Backend + Frontend): ~$24
- GPU Droplet for Vision/Ollama: ~$300
- **Total: ~$324/month**

---

### Option C: DigitalOcean Kubernetes

```bash
# 1. Create Kubernetes cluster
doctl kubernetes cluster create dixi-k8s \
  --region nyc1 \
  --version 1.28.2-do.0 \
  --node-pool "name=worker-pool;size=s-2vcpu-4gb;count=3"

# 2. Get kubeconfig
doctl kubernetes cluster kubeconfig save dixi-k8s

# 3. Deploy application
kubectl apply -f k8s/

# 4. Set up ingress
kubectl apply -f k8s/ingress-nginx.yaml
```

**Cost Estimate (Monthly)**:
- Kubernetes Control Plane: $12
- Worker Nodes (3x 2vCPU, 4GB): ~$72
- GPU Node: ~$300
- Load Balancer: ~$12
- **Total: ~$396/month**

---

## Docker Swarm Configuration

**For multi-node Docker deployments without Kubernetes complexity**

```bash
# 1. Initialize Swarm on manager node
docker swarm init --advertise-addr <manager-ip>

# 2. Join worker nodes
# Run on each worker:
docker swarm join --token <worker-token> <manager-ip>:2377

# 3. Create overlay network
docker network create --driver overlay dixi-network

# 4. Deploy stack
docker stack deploy -c docker-compose.swarm.yml dixi

# 5. Scale services
docker service scale dixi_backend=3

# 6. Update services (rolling update)
docker service update --image dixi/backend:v2 dixi_backend
```

**docker-compose.swarm.yml**:
```yaml
version: '3.8'

services:
  backend:
    image: dixi/backend:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
    networks:
      - dixi-network
    ports:
      - "3001:3001"

  vision:
    image: dixi/vision:latest
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.labels.gpu == true
    networks:
      - dixi-network
    ports:
      - "5000:5000"

  frontend:
    image: dixi/frontend:latest
    deploy:
      replicas: 2
    networks:
      - dixi-network
    ports:
      - "80:80"

networks:
  dixi-network:
    driver: overlay
```

---

## Complete Kubernetes Manifests

### Namespace

**k8s/namespace.yaml**:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dixi
```

### ConfigMap

**k8s/configmap.yaml**:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dixi-config
  namespace: dixi
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  VISION_SERVICE_URL: "http://vision-service:5000"
  OLLAMA_BASE_URL: "http://ollama-service:11434"
```

### Secrets

**k8s/secrets.yaml**:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dixi-secrets
  namespace: dixi
type: Opaque
stringData:
  api-key: "your-api-key-here"
  jwt-secret: "your-jwt-secret-here"
```

### Backend Deployment

**k8s/backend-deployment.yaml**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: dixi
  labels:
    app: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: dixi/backend:latest
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: dixi-config
        - secretRef:
            name: dixi-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health/live
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health/ready
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
```

### HorizontalPodAutoscaler

**k8s/hpa.yaml**:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: dixi
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## Monitoring Setup with Prometheus + Grafana

### Install Prometheus

```bash
# Using Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false
```

### ServiceMonitor for Dixi

**k8s/servicemonitor.yaml**:
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: dixi-backend-monitor
  namespace: dixi
spec:
  selector:
    matchLabels:
      app: backend
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
```

### Grafana Dashboard

**Access Grafana**:
```bash
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Login: admin / prom-operator
```

**Import Dashboard** (ID: 1860 for Node Exporter)

**Custom Metrics to Track**:
- `dixi_gesture_detections_total` - Total gestures detected
- `dixi_ai_inference_duration_seconds` - AI inference time
- `dixi_websocket_connections` - Active WebSocket connections
- `dixi_api_requests_total` - Total API requests
- `dixi_errors_total` - Total errors

---

## Log Aggregation with ELK Stack

### Deploy Elasticsearch

```bash
helm repo add elastic https://helm.elastic.co
helm install elasticsearch elastic/elasticsearch \
  --namespace logging \
  --create-namespace \
  --set replicas=3 \
  --set minimumMasterNodes=2
```

### Deploy Kibana

```bash
helm install kibana elastic/kibana \
  --namespace logging \
  --set elasticsearchHosts="http://elasticsearch-master:9200"
```

### Deploy Filebeat

**filebeat-config.yaml**:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: filebeat-config
  namespace: logging
data:
  filebeat.yml: |
    filebeat.inputs:
    - type: container
      paths:
        - /var/log/containers/*.log
      processors:
        - add_kubernetes_metadata:
            host: ${NODE_NAME}
            matchers:
            - logs_path:
                logs_path: "/var/log/containers/"
    
    output.elasticsearch:
      hosts: ['${ELASTICSEARCH_HOST:elasticsearch-master}:${ELASTICSEARCH_PORT:9200}']
```

### Access Kibana

```bash
kubectl port-forward -n logging svc/kibana-kibana 5601:5601
# Open http://localhost:5601
```

---

## CI/CD Pipelines

### GitHub Actions

**.github/workflows/deploy.yml**:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Run linter
        run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker images
        run: |
          docker build -t ${{ secrets.DOCKER_REGISTRY }}/dixi/backend:${{ github.sha }} ./packages/backend
          docker build -t ${{ secrets.DOCKER_REGISTRY }}/dixi/frontend:${{ github.sha }} ./packages/frontend
          docker build -t ${{ secrets.DOCKER_REGISTRY }}/dixi/vision:${{ github.sha }} ./packages/vision
      - name: Push to registry
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
          docker push ${{ secrets.DOCKER_REGISTRY }}/dixi/backend:${{ github.sha }}
          docker push ${{ secrets.DOCKER_REGISTRY }}/dixi/frontend:${{ github.sha }}
          docker push ${{ secrets.DOCKER_REGISTRY }}/dixi/vision:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Kubernetes
        uses: azure/k8s-deploy@v4
        with:
          manifests: |
            k8s/backend-deployment.yaml
            k8s/frontend-deployment.yaml
            k8s/vision-deployment.yaml
          images: |
            ${{ secrets.DOCKER_REGISTRY }}/dixi/backend:${{ github.sha }}
            ${{ secrets.DOCKER_REGISTRY }}/dixi/frontend:${{ github.sha }}
            ${{ secrets.DOCKER_REGISTRY }}/dixi/vision:${{ github.sha }}
          kubectl-version: 'latest'
```

### GitLab CI

**.gitlab-ci.yml**:
```yaml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"

test:
  stage: test
  image: node:20
  script:
    - npm ci
    - npm test
    - npm run lint

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $CI_REGISTRY_IMAGE/backend:$CI_COMMIT_SHA ./packages/backend
    - docker build -t $CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA ./packages/frontend
    - docker build -t $CI_REGISTRY_IMAGE/vision:$CI_COMMIT_SHA ./packages/vision
    - docker push $CI_REGISTRY_IMAGE/backend:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE/vision:$CI_COMMIT_SHA

deploy:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl set image deployment/backend backend=$CI_REGISTRY_IMAGE/backend:$CI_COMMIT_SHA -n dixi
    - kubectl set image deployment/frontend frontend=$CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA -n dixi
    - kubectl set image deployment/vision vision=$CI_REGISTRY_IMAGE/vision:$CI_COMMIT_SHA -n dixi
    - kubectl rollout status deployment/backend -n dixi
  only:
    - main
```

---

## Security Hardening Guide

### 1. Network Security

**Firewall Rules**:
```bash
# Allow only necessary ports
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

**Kubernetes Network Policies**:
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-network-policy
  namespace: dixi
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    - podSelector:
        matchLabels:
          app: vision
    ports:
    - protocol: TCP
      port: 3001
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: vision
    ports:
    - protocol: TCP
      port: 5000
  - to:
    - podSelector:
        matchLabels:
          app: ollama
    ports:
    - protocol: TCP
      port: 11434
```

### 2. Application Security

**Helmet Configuration** (Already in backend):
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

**CORS Configuration**:
```typescript
import cors from 'cors';

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'https://dixi.example.com',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

### 3. Secrets Management

**Using Kubernetes Secrets**:
```bash
# Create secret from file
kubectl create secret generic dixi-secrets \
  --from-file=api-key=./secrets/api-key.txt \
  --from-file=jwt-secret=./secrets/jwt-secret.txt \
  --namespace dixi

# Or from literal values
kubectl create secret generic dixi-secrets \
  --from-literal=api-key='your-secret-key' \
  --from-literal=jwt-secret='your-jwt-secret' \
  --namespace dixi
```

**Using AWS Secrets Manager**:
```bash
# Store secret
aws secretsmanager create-secret \
  --name dixi/production/api-key \
  --secret-string "your-secret-value"

# Retrieve secret in application
import { SecretsManager } from 'aws-sdk';
const client = new SecretsManager({ region: 'us-east-1' });
const secret = await client.getSecretValue({ SecretId: 'dixi/production/api-key' }).promise();
```

### 4. TLS/SSL Configuration

**cert-manager for Kubernetes**:
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### 5. Regular Security Audits

```bash
# NPM audit
npm audit
npm audit fix

# Docker image scanning
docker scan dixi/backend:latest

# Kubernetes security scanning
kubectl kube-bench run --targets master,node

# OWASP dependency check
dependency-check --project Dixi --scan ./packages
```

---

## Backup and Recovery Procedures

### Backup Strategy

**1. Configuration Backup**:
```bash
#!/bin/bash
# backup-config.sh

BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup environment files
cp .env $BACKUP_DIR/
cp docker-compose.yml $BACKUP_DIR/
cp docker-compose.prod.yml $BACKUP_DIR/

# Backup Kubernetes configurations
kubectl get all -n dixi -o yaml > $BACKUP_DIR/k8s-resources.yaml
kubectl get configmaps -n dixi -o yaml > $BACKUP_DIR/configmaps.yaml
kubectl get secrets -n dixi -o yaml > $BACKUP_DIR/secrets.yaml

# Compress
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
rm -rf $BACKUP_DIR

# Upload to S3
aws s3 cp $BACKUP_DIR.tar.gz s3://dixi-backups/config/
```

**2. Model Files Backup**:
```bash
#!/bin/bash
# backup-models.sh

# Backup AI models
aws s3 sync ./models/ s3://dixi-backups/models/ \
  --exclude "*.tmp" \
  --storage-class STANDARD_IA
```

**3. Logs Backup**:
```bash
#!/bin/bash
# backup-logs.sh

# Backup last 30 days of logs
find ./logs -name "*.log" -mtime -30 -exec tar -czf logs-backup-$(date +%Y%m%d).tar.gz {} +
aws s3 cp logs-backup-$(date +%Y%m%d).tar.gz s3://dixi-backups/logs/
```

### Recovery Procedure

**1. Full System Recovery**:
```bash
#!/bin/bash
# recover.sh

# Download latest backup
aws s3 cp s3://dixi-backups/config/latest.tar.gz ./
tar -xzf latest.tar.gz

# Restore Kubernetes resources
kubectl apply -f backups/k8s-resources.yaml
kubectl apply -f backups/configmaps.yaml
kubectl apply -f backups/secrets.yaml

# Restore models
aws s3 sync s3://dixi-backups/models/ ./models/

# Restart services
kubectl rollout restart deployment/backend -n dixi
kubectl rollout restart deployment/vision -n dixi
```

**2. Disaster Recovery Plan**:

| RTO (Recovery Time Objective) | RPO (Recovery Point Objective) |
|-------------------------------|--------------------------------|
| 4 hours | 1 hour |

**Steps**:
1. Assess damage and determine recovery scope
2. Provision new infrastructure if needed
3. Restore from most recent backup
4. Verify service health
5. Gradually restore traffic
6. Monitor for issues
7. Document incident

---

## Cost Estimation Table

### Monthly Cost Comparison

| Platform | Configuration | Compute | Storage | Network | Monitoring | **Total** |
|----------|--------------|---------|---------|---------|------------|-----------|
| **AWS EC2** | g4dn.xlarge + t3.medium | $430 | $5 | $20 | $15 | **$470** |
| **AWS ECS** | Fargate + EC2 GPU | $500 | $5 | $20 | $15 | **$540** |
| **AWS Lambda** | Serverless + EC2 GPU | $823 | $5 | $10 | $15 | **$853** |
| **Google Cloud Run** | Cloud Run + GCE GPU | $490 | $5 | $20 | $15 | **$530** |
| **GCP GKE** | GKE + GPU nodes | $1110 | $10 | $20 | $15 | **$1155** |
| **Azure VM** | NC6s_v3 + B2s | $940 | $10 | $20 | $15 | **$985** |
| **Azure AKS** | AKS + GPU nodes | $1110 | $10 | $20 | $15 | **$1155** |
| **DigitalOcean Droplets** | 8GB + GPU Droplet | $396 | $5 | $12 | $5 | **$418** |
| **DO App Platform** | App + GPU Droplet | $324 | $5 | $12 | $5 | **$346** |
| **DO Kubernetes** | DOKS + GPU node | $384 | $5 | $12 | $5 | **$406** |
| **On-Premise** | Own hardware | $0* | $0* | $0* | $0* | **~$200*** |

*On-premise requires upfront hardware investment (~$5,000-$10,000) and electricity costs (~$50-200/month)

### Cost Optimization Tips

1. **Use Spot Instances** (AWS/GCP): Save 50-90% on compute costs for non-critical workloads
2. **Reserved Instances**: Save 30-70% with 1-3 year commitments
3. **Auto-scaling**: Scale down during low-traffic periods
4. **Serverless for Backend**: Pay only for actual usage
5. **CDN for Static Assets**: Reduce bandwidth costs
6. **Compress Logs**: Reduce storage costs by 80%+
7. **Use Smaller Models**: 3B model instead of 7B saves GPU costs

---

## Performance Benchmarking

**See detailed guide in `docs/PERFORMANCE.md`**

Quick benchmarks:

```bash
# API endpoint latency
wrk -t12 -c400 -d30s http://localhost:3001/api/health

# WebSocket throughput
websocket-bench broadcast ws://localhost:3001 --amount 1000 --concurrency 100

# Gesture processing rate
# Should maintain 30 FPS (33ms per frame)

# AI inference time
# 3B model: 300-400ms
# 7B model: 1000-1200ms
# 13B model: 2000-3000ms
```

---

*Last updated: 2025-12-21*
