# Tutorial 6: Troubleshooting Common Issues

Quick fixes for the most common problems.

## Quick Diagnostics

```bash
# Run diagnostics script
./dixi-diagnostics.sh

# Check all services
docker-compose ps

# View logs
docker-compose logs -f
```

## Top 10 Common Issues

### 1. Camera Not Detected

**Fix**:
```bash
ls -l /dev/video0
sudo usermod -aG video $USER
```

### 2. Port Already in Use

**Fix**:
```bash
lsof -i :3001
kill -9 <PID>
```

### 3. Ollama Connection Failed

**Fix**:
```bash
ollama serve &
ollama list
```

### 4. WebSocket Disconnects

**Fix**:
- Check firewall
- Verify backend running
- Check browser console

### 5. Low Frame Rate

**Fix**:
- Reduce camera resolution
- Close other apps
- Check CPU usage

### 6. Slow AI Responses

**Fix**:
- Use smaller model (3B)
- Enable GPU
- Check Ollama status

### 7. Gestures Not Detected

**Fix**:
- Improve lighting
- Check hand visibility
- Lower confidence threshold

### 8. Docker Build Fails

**Fix**:
```bash
docker-compose build --no-cache
```

### 9. Memory Issues

**Fix**:
```bash
# Add limits
docker-compose down
# Edit docker-compose.yml
docker-compose up -d
```

### 10. Service Won't Start

**Fix**:
```bash
# Check logs
docker logs dixi-backend
# Restart
docker-compose restart
```

## Get Help

- Check docs: `/docs`
- GitHub Issues: github.com/duketopceo/Dixi/issues
- Run diagnostics: `./dixi-diagnostics.sh`

---

*Last updated: 2025-12-21*
