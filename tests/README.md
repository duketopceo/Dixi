# Dixi Test Suite

Comprehensive test suite for the Dixi AI-powered gesture-controlled projection system.

## Quick Start

```bash
# Run all tests
npm run test:nuclear

# Run specific test types
npm run test:backend:unit    # Backend unit tests only
npm run test:vision          # Vision service tests (Python)
npm run test:integration     # Integration tests (requires services running)
npm run test:e2e             # End-to-end browser tests
npm run test:stress          # Load/stress tests
```

## Test Categories

### Unit Tests (`tests/unit/`)

Fast, isolated tests that mock external dependencies.

- **Backend Routes** (`tests/unit/backend/routes/`)
  - `health.test.ts` - Health check endpoints
  - `gesture.test.ts` - Gesture processing endpoints
  - `ai.test.ts` - AI query endpoints

- **Backend Services** (`tests/unit/backend/services/`)
  - `ai.test.ts` - AI service with Ollama
  - `websocket.test.ts` - WebSocket broadcasting

- **Vision Service** (`tests/unit/vision/`)
  - `test_gesture_recognition.py` - Gesture detection
  - `test_api_endpoints.py` - Flask API endpoints

### Integration Tests (`tests/integration/`)

Tests that verify communication between services. **Requires services to be running.**

- `backend-vision/` - Backend ↔ Vision Service
- `backend-ollama/` - Backend ↔ Ollama AI
- `frontend-backend/` - Frontend ↔ Backend WebSocket

### E2E Tests (`tests/e2e/`)

Browser automation tests using Playwright. **Requires full stack running.**

- `gesture-to-ai.spec.ts` - Complete user flows

### Stress Tests (`tests/stress/`)

Load and performance tests. **Requires backend running.**

- `websocket_load.test.ts` - WebSocket connection limits
- `api_load.test.ts` - HTTP endpoint performance

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. For E2E tests, install Playwright:
   ```bash
   npx playwright install
   ```

3. For Python tests, install pytest:
   ```bash
   cd packages/vision
   pip install pytest pytest-cov pytest-flask
   ```

### Unit Tests (No Services Required)

```bash
# Backend TypeScript tests
npm run test:backend:unit

# Vision Python tests
npm run test:vision

# With coverage
npm run test:coverage
```

### Integration Tests (Services Required)

Start services first:
```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Vision
npm run dev:vision

# Terminal 3: Run tests
npm run test:integration
```

### E2E Tests (Full Stack Required)

Start everything:
```bash
# Terminal 1: All services
npm run dev

# Terminal 2: Vision
npm run dev:vision

# Terminal 3: Run tests
npm run test:e2e
```

### Stress Tests (Backend Required)

```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Run tests
npm run test:stress
```

## Configuration

### Jest (`tests/jest.config.js`)

- TypeScript support via ts-jest
- 80% coverage threshold
- 30-second timeout

### Pytest (`tests/pytest.ini`)

- Coverage reporting
- Verbose output
- Markers for slow/integration tests

### Playwright (`playwright.config.ts`)

- Multi-browser testing
- Screenshot on failure
- Video recording

## Test Fixtures

### `tests/fixtures/gestures.json`

Sample gesture data for testing:
- Valid gestures (wave, point, pinch, etc.)
- Invalid gestures (bad confidence, missing position)
- All gesture types list

### `tests/helpers/mockOllama.ts`

Mock Ollama responses:
- `mockOllamaResponse()` - Single response
- `mockOllamaStream()` - Streaming response
- `mockOllamaTags()` - Model list

### `tests/helpers/testUtils.ts`

Utility functions:
- Service availability checks
- Random gesture generation
- Request retry logic
- Benchmarking helpers

## Coverage Reports

After running tests with coverage:

- Jest HTML report: `coverage/lcov-report/index.html`
- Playwright HTML report: `playwright-report/index.html`

## Writing Tests

### Backend Unit Test Example

```typescript
import request from 'supertest';
import express from 'express';

jest.mock('axios');
jest.mock('../../../packages/backend/src/services/ai');

describe('My Endpoint', () => {
  it('should do something', async () => {
    const response = await request(app).get('/my-endpoint');
    expect(response.status).toBe(200);
  });
});
```

### Vision Unit Test Example

```python
import pytest
from unittest.mock import Mock, patch

def test_gesture_detection():
    with patch('cv2.VideoCapture'):
        from main import GestureRecognitionService
        service = GestureRecognitionService()
        result = service._analyze_gesture(mock_landmarks)
        assert 'type' in result
```

## Troubleshooting

### Tests Timeout

- Increase timeout in jest.config.js
- Check if services are responding

### Services Not Available

- Integration/E2E/Stress tests skip automatically
- Start required services first

### Python Import Errors

- Ensure vision package in PYTHONPATH
- Check conftest.py is present

### WebSocket Tests Fail

- Check port 3002 is available
- Verify backend WebSocket server started

