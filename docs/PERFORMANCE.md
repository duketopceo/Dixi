# Performance Benchmarking Guide

Comprehensive guide for measuring and optimizing Dixi system performance.

## Performance Goals

### Target Metrics

| Metric | Target | Good | Acceptable | Poor |
|--------|--------|------|------------|------|
| Gesture Detection Latency | < 50ms | < 80ms | < 100ms | > 100ms |
| AI Inference (3B model) | < 500ms | < 700ms | < 1000ms | > 1000ms |
| AI Inference (7B model) | < 1500ms | < 2000ms | < 2500ms | > 2500ms |
| WebSocket Latency | < 10ms | < 20ms | < 50ms | > 50ms |
| End-to-End (Gesture→UI) | < 100ms | < 150ms | < 200ms | > 200ms |
| API Response Time (P95) | < 100ms | < 200ms | < 300ms | > 300ms |
| Frame Rate (Camera) | 30 FPS | 25 FPS | 20 FPS | < 20 FPS |
| CPU Usage (Idle) | < 10% | < 20% | < 30% | > 30% |
| CPU Usage (Active) | < 60% | < 80% | < 90% | > 90% |
| Memory Usage | < 2GB | < 4GB | < 6GB | > 6GB |
| WebSocket Throughput | > 100 msg/s | > 50 msg/s | > 25 msg/s | < 25 msg/s |

---

## Benchmarking Tools Installation

### System Tools

```bash
# Install monitoring tools
sudo apt-get update
sudo apt-get install -y \
    sysstat \
    iotop \
    iftop \
    htop \
    nethogs \
    jq \
    curl

# GPU monitoring (if available)
sudo apt-get install -y nvidia-utils

# Network tools
npm install -g wscat artillery
```

### Python Tools

```bash
pip install \
    psutil \
    py-spy \
    memory-profiler \
    line-profiler
```

### Node.js Tools

```bash
npm install -g \
    clinic \
    autocannon \
    artillery \
    loadtest
```

---

## Benchmarking Methodology

### 1. Gesture Detection Latency

**Test Script**: `benchmarks/gesture-latency.py`

```python
import time
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

def benchmark_gesture_detection(num_frames=100):
    """Measure gesture detection latency"""
    
    # Initialize
    model_path = './hand_landmarker.task'
    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        num_hands=2,
        running_mode=vision.RunningMode.VIDEO
    )
    landmarker = vision.HandLandmarker.create_from_options(options)
    
    camera = cv2.VideoCapture(0)
    latencies = []
    
    print(f"Running {num_frames} frame test...")
    
    for i in range(num_frames):
        start = time.time()
        
        # Capture frame
        ret, frame = camera.read()
        capture_time = time.time() - start
        
        # Convert to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        
        # Detect hands
        detect_start = time.time()
        result = landmarker.detect_for_video(mp_image, int(time.time() * 1000))
        detect_time = time.time() - detect_start
        
        # Total latency
        total_latency = time.time() - start
        latencies.append({
            'capture': capture_time * 1000,
            'detect': detect_time * 1000,
            'total': total_latency * 1000
        })
        
        if (i + 1) % 10 == 0:
            print(f"  {i + 1}/{num_frames} frames processed")
    
    camera.release()
    
    # Calculate statistics
    avg_capture = sum(l['capture'] for l in latencies) / len(latencies)
    avg_detect = sum(l['detect'] for l in latencies) / len(latencies)
    avg_total = sum(l['total'] for l in latencies) / len(latencies)
    
    p95_total = sorted(l['total'] for l in latencies)[int(len(latencies) * 0.95)]
    p99_total = sorted(l['total'] for l in latencies)[int(len(latencies) * 0.99)]
    
    print(f"\n=== Gesture Detection Benchmark ===")
    print(f"Frames tested: {num_frames}")
    print(f"Average capture time: {avg_capture:.2f}ms")
    print(f"Average detection time: {avg_detect:.2f}ms")
    print(f"Average total latency: {avg_total:.2f}ms")
    print(f"P95 latency: {p95_total:.2f}ms")
    print(f"P99 latency: {p99_total:.2f}ms")
    print(f"FPS: {1000/avg_total:.1f}")

if __name__ == '__main__':
    benchmark_gesture_detection()
```

**Run**:
```bash
cd packages/vision
python ../../../benchmarks/gesture-latency.py
```

---

### 2. AI Inference Speed

**Test Script**: `benchmarks/ai-inference.sh`

```bash
#!/bin/bash

echo "=== AI Inference Benchmark ==="

# Test queries
queries=(
    "What is gesture recognition?"
    "Explain computer vision in detail."
    "How do neural networks work?"
)

models=("llama3.2:3b" "llama3.2:latest")

for model in "${models[@]}"; do
    echo ""
    echo "Testing model: $model"
    echo "---"
    
    # Warm up
    curl -s -X POST http://localhost:11434/api/generate \
        -d "{\"model\":\"$model\",\"prompt\":\"test\",\"stream\":false}" > /dev/null
    
    for query in "${queries[@]}"; do
        echo "Query: $query"
        
        start=$(date +%s%3N)
        response=$(curl -s -X POST http://localhost:11434/api/generate \
            -d "{\"model\":\"$model\",\"prompt\":\"$query\",\"stream\":false}")
        end=$(date +%s%3N)
        
        duration=$((end - start))
        tokens=$(echo "$response" | jq -r '.eval_count')
        
        echo "  Time: ${duration}ms"
        echo "  Tokens: $tokens"
        echo "  Tokens/sec: $(echo "scale=2; $tokens * 1000 / $duration" | bc)"
        echo ""
    done
done
```

**Run**:
```bash
chmod +x benchmarks/ai-inference.sh
./benchmarks/ai-inference.sh
```

---

### 3. WebSocket Throughput

**Test Script**: `benchmarks/websocket-bench.js`

```javascript
const WebSocket = require('ws');

async function benchmarkWebSocket() {
    const url = 'ws://localhost:3001';
    const numMessages = 1000;
    const concurrentConnections = 10;
    
    console.log('=== WebSocket Benchmark ===');
    console.log(`Connections: ${concurrentConnections}`);
    console.log(`Messages per connection: ${numMessages}`);
    
    const connections = [];
    const startTime = Date.now();
    let receivedCount = 0;
    
    // Create connections
    for (let i = 0; i < concurrentConnections; i++) {
        const ws = new WebSocket(url);
        
        ws.on('open', () => {
            // Send messages
            for (let j = 0; j < numMessages; j++) {
                ws.send(JSON.stringify({
                    type: 'test',
                    id: j,
                    timestamp: Date.now()
                }));
            }
        });
        
        ws.on('message', () => {
            receivedCount++;
            
            if (receivedCount === numMessages * concurrentConnections) {
                const duration = Date.now() - startTime;
                const throughput = (receivedCount / duration) * 1000;
                
                console.log(`\nTotal messages: ${receivedCount}`);
                console.log(`Duration: ${duration}ms`);
                console.log(`Throughput: ${throughput.toFixed(2)} msg/s`);
                console.log(`Avg latency: ${(duration / receivedCount).toFixed(2)}ms`);
                
                // Close connections
                connections.forEach(c => c.close());
                process.exit(0);
            }
        });
        
        connections.push(ws);
    }
}

benchmarkWebSocket().catch(console.error);
```

**Run**:
```bash
node benchmarks/websocket-bench.js
```

---

### 4. Load Testing with Artillery

**Config**: `benchmarks/artillery-config.yml`

```yaml
config:
  target: "http://localhost:3001"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"
  processor: "./artillery-processor.js"

scenarios:
  - name: "Health check"
    weight: 30
    flow:
      - get:
          url: "/api/health"
  
  - name: "Deep health check"
    weight: 10
    flow:
      - get:
          url: "/api/health/deep"
  
  - name: "Get gesture"
    weight: 40
    flow:
      - get:
          url: "/api/gesture"
  
  - name: "AI inference"
    weight: 20
    flow:
      - post:
          url: "/api/ai/infer"
          json:
            query: "What is gesture recognition?"
            context: "Testing"
```

**Run**:
```bash
artillery run benchmarks/artillery-config.yml
```

---

## Profiling Guides

### CPU Profiling

**Backend (Node.js)**:
```bash
# Using clinic
clinic doctor -- node packages/backend/dist/index.js

# Using Node.js built-in profiler
node --prof packages/backend/dist/index.js
# Run workload
# Stop server (Ctrl+C)
node --prof-process isolate-*.log > cpu-profile.txt
```

**Vision Service (Python)**:
```bash
# Using py-spy
py-spy record -o profile.svg -- python packages/vision/main.py

# Using cProfile
python -m cProfile -o profile.stats packages/vision/main.py
python -m pstats profile.stats
```

### Memory Profiling

**Backend**:
```bash
# Using clinic
clinic heapprofiler -- node packages/backend/dist/index.js

# Using heapdump
# Add to code:
const heapdump = require('heapdump');
setInterval(() => {
    heapdump.writeSnapshot(`./heap-${Date.now()}.heapsnapshot`);
}, 60000);

# Analyze in Chrome DevTools
```

**Vision Service**:
```bash
# Using memory_profiler
python -m memory_profiler packages/vision/main.py

# Using tracemalloc
# Add to code:
import tracemalloc
tracemalloc.start()
# ... run code ...
snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')
for stat in top_stats[:10]:
    print(stat)
```

### Flamegraphs

**Generate flamegraph**:
```bash
# Install FlameGraph
git clone https://github.com/brendangregg/FlameGraph
cd FlameGraph

# For Node.js
clinic flame -- node packages/backend/dist/index.js

# For Python
py-spy record -o flamegraph.svg --format speedscope -- python packages/vision/main.py
```

---

## Frontend Performance Measurement

### React DevTools Profiler

```jsx
import { Profiler } from 'react';

function App() {
    const onRenderCallback = (
        id, // Component name
        phase, // "mount" or "update"
        actualDuration, // Time spent rendering
        baseDuration, // Estimated time without memoization
        startTime, // When React began rendering
        commitTime, // When React committed the update
        interactions // Set of interactions that triggered this update
    ) => {
        console.log(`${id} ${phase} took ${actualDuration}ms`);
    };
    
    return (
        <Profiler id="App" onRender={onRenderCallback}>
            {/* Your app */}
        </Profiler>
    );
}
```

### Chrome DevTools Performance

1. Open Chrome DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Perform actions
5. Click Stop
6. Analyze timeline

**Key metrics to check**:
- Frame rate (should be 60 FPS)
- JavaScript execution time
- Rendering time
- Memory usage

### Lighthouse Audit

```bash
# Install Lighthouse
npm install -g lighthouse

# Run audit
lighthouse http://localhost:5173 --output html --output-path ./lighthouse-report.html

# View report
open lighthouse-report.html
```

---

## Optimization Checklist

### Backend Optimization

- [ ] Enable Node.js clustering (use all CPU cores)
- [ ] Implement response caching
- [ ] Use connection pooling
- [ ] Enable gzip compression
- [ ] Optimize database queries (if applicable)
- [ ] Implement request batching
- [ ] Use CDN for static assets
- [ ] Enable HTTP/2

### Vision Service Optimization

- [ ] Reduce camera resolution if needed
- [ ] Use GPU acceleration
- [ ] Optimize MediaPipe configuration
- [ ] Implement frame skipping for low-end hardware
- [ ] Use quantized models
- [ ] Batch processing if possible
- [ ] Reduce number of hands tracked

### Frontend Optimization

- [ ] Code splitting and lazy loading
- [ ] Image optimization (WebP, compression)
- [ ] Minimize bundle size
- [ ] Use React.memo for expensive components
- [ ] Implement virtual scrolling for lists
- [ ] Use Web Workers for heavy computation
- [ ] Optimize Three.js rendering
- [ ] Implement service worker for caching

### AI Optimization

- [ ] Use smaller model (3B instead of 7B)
- [ ] Enable GPU acceleration
- [ ] Implement response caching
- [ ] Use streaming for long responses
- [ ] Batch multiple queries if possible
- [ ] Set max token limits
- [ ] Use quantized models

---

## Before/After Comparison Template

### Benchmark Template

```markdown
## Performance Improvement: [Feature Name]

### Before Optimization

| Metric | Value |
|--------|-------|
| Latency (avg) | XXXms |
| Latency (P95) | XXXms |
| Throughput | XXX req/s |
| CPU Usage | XX% |
| Memory Usage | XXX MB |
| Error Rate | X.X% |

### Changes Made

1. Change description 1
2. Change description 2
3. ...

### After Optimization

| Metric | Value | Improvement |
|--------|-------|-------------|
| Latency (avg) | XXXms | ↓ XX% |
| Latency (P95) | XXXms | ↓ XX% |
| Throughput | XXX req/s | ↑ XX% |
| CPU Usage | XX% | ↓ XX% |
| Memory Usage | XXX MB | ↓ XX% |
| Error Rate | X.X% | ↓ XX% |

### Conclusion

Summary of improvements and recommendations.
```

---

## Continuous Monitoring

### Setup Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'dixi-backend'
    static_configs:
      - targets: ['localhost:3001']
  
  - job_name: 'dixi-vision'
    static_configs:
      - targets: ['localhost:5000']
```

### Setup Grafana Dashboard

Import dashboard JSON:
```json
{
  "dashboard": {
    "title": "Dixi Performance",
    "panels": [
      {
        "title": "API Latency",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Gesture Detection Rate",
        "targets": [
          {
            "expr": "rate(gesture_detections_total[1m])"
          }
        ]
      }
    ]
  }
}
```

### Alert Rules

```yaml
# alerts.yml
groups:
  - name: dixi_alerts
    rules:
      - alert: HighLatency
        expr: http_request_duration_ms{quantile="0.95"} > 200
        for: 5m
        annotations:
          summary: "High API latency detected"
      
      - alert: LowFrameRate
        expr: gesture_fps < 20
        for: 2m
        annotations:
          summary: "Frame rate below 20 FPS"
```

---

*Last updated: 2025-12-21*
