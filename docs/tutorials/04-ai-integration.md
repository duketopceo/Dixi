# Tutorial 4: AI Integration with Ollama

Configure and optimize AI features in Dixi.

## Ollama Setup

### Install Additional Models

```bash
# Smaller, faster model
ollama pull llama3.2:3b

# Medium (default)
ollama pull llama3.2:latest

# Larger, higher quality
ollama pull llama3.2:13b
```

### Switch Models

Update `.env`:
```
MODEL_SIZE=3b  # or 7B, 13B
MODEL_PATH=llama3.2:3b
```

## AI Features

1. **Automatic Gesture Responses** - AI describes detected gestures
2. **Manual Queries** - Ask questions via UI
3. **Streaming Responses** - Real-time text generation
4. **Context-Aware** - AI knows recent gestures

## Optimization

- 3B model: Fast (300-400ms)
- 7B model: Balanced (1000-1200ms)
- 13B model: Best quality (2000-3000ms)

Use GPU for 4x speed improvement.

---

*Last updated: 2025-12-21*
