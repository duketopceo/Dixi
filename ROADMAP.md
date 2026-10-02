# Dixi Roadmap

*Rewritten 2026-10-02. The previous roadmap (multi-user/mobile/cloud/enterprise) was aspirational fiction — every date silently missed while `main` carried a syntax error for 9 months. This roadmap is scoped to what the product actually is.*

## What Dixi Is

**The open-source SixthSense.** A webcam + any projector + a browser tab = a touchless interactive display. SixthSense proved the concept in 2009 with colored tape; we have MediaPipe WASM.

Nobody else occupies this lane: Lumo Play and Intuiface are closed no-code platforms, OptiTUIO needs dedicated LiDAR hardware, Ultraleap needs proprietary sensors. Dixi's differentiator is *commodity hardware + zero-install software*.

## The Product, Precisely

> Project a canvas on a wall or table. A webcam watches your hands. Pinch a shape and it moves. Calibrate once in under a minute. Everything else — AI, dashboards, accounts — is optional garnish.

**North star:** a dev can clone the repo, open the page, calibrate, and have a working touchless surface in under 5 minutes. A second dev can write a new scene in an afternoon.

## Phases

### ✅ v0.2 — Foundation (done, Oct 2026)
- Browser Vision Mode: MediaPipe GestureRecognizer in a Web Worker, GPU delegate + CPU fallback
- 4-point dwell calibration (normalized-DLT homography camera→projector)
- GestureShapes scene: pinch-drag, two-hand pinch-to-scale
- VisionHUD status pill + CalibrationOverlay
- CI that actually gates; vision/backend test suites green
- `VITE_VISION_MODE=server` keeps the legacy Python path alive

### 🚧 v0.3 — GUI Shell (current)
- Scene system: Launcher + Dock + scene registry
- DrawScene: pinch to sketch, fist to clear
- Calibration flow polish; per-scene instructions on the projected surface
- Frame budget guardrails: warn when inference > 33ms or fps < 24

### 📋 v0.4 — Smarter Surfaces
- **Auto-calibration**: project a marker, find it in the camera frame automatically (no finger taps)
- **Occlusion handling**: hand shadows on the wall; mask content near the fingertip
- **AI ask-path**: pinch-hold on empty space → speak/type → Ollama/Gemini describes the scene. On-demand only, never in the tracking loop.
- Gesture recording/playback for test rigs

### 📋 v0.5 — Scene SDK
- `registerScene()` public API: a scene is a component that receives calibrated hand cursors
- One more showcase scene (menu-driven choice: gallery lightbox, pong, or a board-game overlay)
- Scene gallery docs + contribution guide

### 💡 v1.0 — The Kit
- Pinned deps, reproducible builds, < 3-minute first-run
- Demo video + rig photos in README
- docs/ synced to reality (not 8,500 lines of ambition)

## Explicitly Cut
- Multi-user sessions, user accounts, cloud storage
- Mobile app (React Native), enterprise SSO, white-label
- Kubernetes/gRPC/Redis scaling plans — this is a local-first kiosk tool
- Monitoring dashboards and prompt-template CRUD from the old roadmap

## Success Metrics (v0.3-v1.0)
- [ ] Calibration completes in < 60 seconds on first try
- [ ] Pinch-drag latency < 50ms end-to-end (camera frame → canvas pixel)
- [ ] 24+ fps sustained on a 2021 laptop with GPU delegate
- [ ] New scene added by a contributor in < 200 lines
- [ ] Zero required backend processes for core scenes

*Last updated: 2026-10-02 · Source of truth for release planning.*
