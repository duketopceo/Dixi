# AI_to_Khan - Status Update

**Last Updated:** December 31, 2025

## Current Focus (Late Dec 2025)

**No Docker.** Building Dixi locally on a single machine with a mini projector.

- Vision service: port 5001, 10 core gestures, MediaPipe hand tracking.
- Backend: Node + Express, WebSocket for real-time gesture updates.
- Frontend: React + Three.js canvas, deployed to Firebase.
- AI: Ollama (gemma/llava), local inference on hand/vision analysis.

Next phase: Projector interaction v1 (feature/projector-shapes-v1 branch).
- Goal: Display interactive shapes on the projector that you can move/zoom with hand gestures.
- No calibration, no wall geometry, no Docker.

---

## Dec 31, 2025 Session - Projector Shapes v1 Complete

### Documentation Updates
- Updated README.md, DEPLOYMENT.md to clarify Docker is planned for future, not required now
- Added current focus section to AI_to_Khan.md

### New Feature: ProjectionShapes Component
- Created `feature/projector-shapes-v1` branch from development
- Built `ProjectionShapes.tsx` - full-screen canvas with 3 interactive shapes (circle, square, triangle)
- Shapes respond to hand gestures via WebSocket/useTrackingStore
- Pinch gesture enables drag mode to move shapes
- Coordinate normalization from vision service [-1,1] to canvas [0,1]
- Added tests for normalization utility
- Created `PROJECTOR_V1.md` documentation

### Infrastructure Improvements
- Added `jest.config.js` for backend TypeScript tests
- Fixed LoggingDashboard scrollIntoView for test environments
- Committed all previous work: PerformanceDashboard, ModelConfig, LoggingDashboard, compute optimizations

### Branch Status
- `feature/projector-shapes-v1` pushed to origin with 4 commits
- Ready for manual projector testing before merging to development

---

## Previous: Comprehensive AIService Test Suite Complete

- Created full test suite for AIService (23 tests, all passing)
- Tests cover inference (Ollama/Gemini), vision analysis, caching, streaming, and context building
- Fixed `npm test` command - now runs AIService tests by default
- All tests use real network calls (no mocks) for true integration testing
- Tests gracefully handle Ollama/Gemini unavailability
