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

## Latest: Comprehensive AIService Test Suite Complete

- Created full test suite for AIService (23 tests, all passing)

- Tests cover inference (Ollama/Gemini), vision analysis, caching, streaming, and context building
- Fixed `npm test` command - now runs AIService tests by default
- All tests use real network calls (no mocks) for true integration testing
- Tests gracefully handle Ollama/Gemini unavailability
