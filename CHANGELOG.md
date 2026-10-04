# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed — review fix round (2026-10-03)
- Tracker lifecycle: `stop()` now aborts in-flight `start()` via a generation token — StrictMode remounts no longer leak camera streams or spawn duplicate pump loops; recognizer init shared across concurrent starts; both delegates failing now throws instead of reporting `running` on a dead pump
- Pump: inference skips unchanged video frames (`currentTime` gate); consecutive-failure cutoff halts into `error` after 30; transient frame errors no longer flip status per frame
- Security defaults: CORS fail-closed to localhost + `FRONTEND_URL` allowlist (was: reflect any Origin with credentials); admin API key has no published fallback and is `x-api-key` header-only (was: query-param fallback key); placeholder admin endpoints return 501
- Gemini API key moved out of request URLs into the `x-goog-api-key` header; error logging no longer serializes axios request config containing secrets
- Launcher "Calibrate" now closes the menu — it rendered above the calibration overlay, making launcher-initiated calibration uncompletable
- `GestureShapes` livelock: cursors memoized on tracking so `setShapes` no longer re-fires the interaction effect every render during pinch-drag
- Calibration: stationary fingertips can no longer re-bank the same camera point across targets (dwell requires departure); persisted calibration is deep-validated (finite points + 9-element homography) and poisoned payloads removed; `cancel` restores the point snapshot taken at `begin`, not module-load state; "Calibrated" flash is reachable
- Camera preview/calibration inset rebind on stream identity via `useTrackerVideoStream` — a tracker restart no longer leaves a frozen dead feed
- Canvas bitmaps no longer realloc every rAF (`resizeCanvasToWindow` guard); HUD re-renders on value change, not inference rate
- `ai.ts` context fetch repointed to `/gesture/projector` (the removed `/gesture` left gesture context permanently null); `/tracking|/face` start|stop calls get timeouts
- Frontend Dockerfile: `serve -s` now points at `packages/frontend/dist` — the image previously built green while serving nothing
- Backend `index.ts` exports narrowed to `{ app }` (wss/wsService were permanently-null bindings); dead `jest.mock('../../index')` retargeted to the wsService registry

### Changed — review fix round
- CI frontend job now gates on `npm run build:check` (tsc + vite) and `npx vitest run`; release workflow runs `npm run test:all` without soft-fail
- Scene layer consolidated: `ProjectionShapes` deleted (orphaned); `normalizeCoordinate`, `HAND_COLOR`, `drawHandCursor`, `dist` shared via `canvasUtils`
- Coverage: tracker lifecycle, tracking-source mapping, shapes state machine, calibration lifecycle suites added (91 frontend tests)
- `hand_landmarker.task` removed — 7.8 MB vendored with no provenance or references; `public/models/MODELS.md` now pins `gesture_recognizer.task` by source URL, bundle version, and SHA-256
- AI integration tests skip cleanly when Ollama is up but `gemma3:4b` isn't pulled

### Fixed
- Vision service no longer crashes on startup — removed a merge conflict marker (`<<<<<<< HEAD`) committed to `packages/vision/main.py` in merge `cf81dbd`
- Backend `tsc` build error: `server.listen(PORT, ...)` received `string | number`
- Circular dependency `index.ts` ↔ route modules crashed `app.use()` when a route file was imported first (tests importing routes directly); routes now resolve WebSocket via `services/wsService.ts` registry
- `docker-compose.yml` vision service: `VISION_SERVICE_PORT=5000` (matches EXPOSE/published port), merged duplicate `environment:` keys, added `BACKEND_URL` for in-network pushes, removed unconditional `runtime: nvidia`
- Frontend Docker image: `REACT_APP_BACKEND_URL` was dead config — replaced with `VITE_API_URL`/`VITE_WS_URL` build args
- CORS: `origin: '*'` + `credentials: true` is rejected by browsers — now reflects origin when `FRONTEND_URL` is unset
- Backend gesture routes repointed to live vision endpoints (`/gesture/projector`, `/tracking/start|stop`) after the `/gesture*` endpoints were removed upstream
- `.env.example` vision ports corrected to 5001, Ollama defaults aligned with code (`gemma3:4b`, `llava:7b`)

### Removed
- `torch`/`torchvision` from vision requirements (no imports; ~2 GB of dead weight)
- Orphaned root `src/logger.ts` (imported `pino`, which was never a dependency)

### Added
- `services/wsService.ts` — WebSocket service registry replacing `import { wsService } from '../index'`

### Changed
- CI: removed `|| echo` soft-fail escapes so lint/test steps actually gate; dropped unconfigured ESLint steps and the red legacy `vitest` run (tracked as follow-up)
- README/.env.example now document `gemma3:4b` + `llava:7b` model defaults

### Added
- Browser Vision Mode (`VITE_VISION_MODE=browser`, default): MediaPipe `GestureRecognizer` (WASM, GPU delegate) running in a Web Worker — camera to cursor with zero backend/Python in the loop
- 4-point dwell calibration: point at projected corner markers → normalized-DLT homography maps camera space to projector space (localStorage persisted)
- `GestureShapes` scene: pinch-drag shapes, two-hand pinch scales; cursor rendered from live tracking
- `src/vision/` module: tracker worker/client with backpressure, geometric pinch classifier with hysteresis, position smoothing, homography math — pure logic under vitest (25 tests)
- Vendored `hand_landmarker`/`gesture_recognizer` .task models in `public/models`; WASM runtime copied to `public/wasm` on postinstall

### Added
- AGENTS.md for AI-assisted development standards
- CHANGELOG.md following Keep a Changelog format
- .commitlintrc.json for conventional commit enforcement
- GitHub Actions release workflow for automated releases

## [1.0.0] - 2026-03-23

### Added
- Initial stable release
- Enterprise standards compliance (versioning, logging, CI/CD)
