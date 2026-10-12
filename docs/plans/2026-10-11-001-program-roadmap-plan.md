---
title: Dixi program roadmap
date: 2026-10-11
status: active
origin: docs/research/2026-10-10-landscape.md
---
# Dixi program roadmap

Written directly in the ce-plan unit format (the skill was not invoked: single-session docs pass).

Baseline on `main` (5967cd7): backend build/test exit 0, frontend `build:check` 0, vitest 0,
`npm run lint` exit 2 (no ESLint config exists).

## Now

### U1. Make lint real
- Status: not started. Evidence: `npm run lint -w` fails with "ESLint couldn't find a configuration file".
- Difficulty: easy. Add `eslint.config`/`.eslintrc` and fix or waive findings.
- Feasibility: ESLint 8.57 is deprecated; flat config on v9 means bumping `@typescript-eslint`. Dependabot PRs may conflict on lockfile.
- Simpler alternative: delete the `lint` script and rely on `tsc --noEmit`. Not recommended for a contributor-driven SDK.
- Verify: `npm run lint` exits 0; add to CI `frontend-tests`.

### U2. Quarantine server mode
- Status: not started. Evidence: `App.tsx` imports `ProjectionCanvas`, `ControlPanel`, `useWebSocket`, `firebase` unconditionally though browser mode uses none of them at runtime.
- Difficulty: medium. Lazy-import (`React.lazy`) server-only components so the browser bundle drops three.js/R3F; later delete.
- Feasibility: someone may rely on the Python path; check issues first. Decision needed from the owner.
- Simpler alternative: delete `components/Scene/*`, `ProjectionScene.tsx`, `ProjectionCanvas*`, `config/firebase.ts`, `packages/vision` (2,048 lines Python) outright and keep git history.
- Verify: bundle size before/after; `build:check` and vitest pass.

### U3. Docs truth pass
- Status: README rewritten in this PR; the rest is not.
- Difficulty: easy. 13.7k lines of markdown (DEPLOYMENT.md 1,526; API.md 1,813; 7 architecture docs) describe the server stack.
- Feasibility: none; judgement only.
- Simpler alternative: delete `DEPLOYMENT.md`, `DEPLOY_FIREBASE.md`, `BRANCH_STRUCTURE.md`, `AI_to_Khan.md`, `WORK_LOG.md`; keep `docs/architecture/04-gesture-pipeline.md` after trimming.
- Verify: README links resolve.

### U4. Latency + calibration harness
- Status: not started. Evidence: ROADMAP metrics (50 ms, 60 s calibration) have no measurement.
- Difficulty: medium. Instrument camera-frame to canvas-pixel time (dev-only overlay from `visionStore` `inferenceMs`).
- Feasibility: needs a real camera rig; synthetic via Chromium fake device only measures inference.
- Simpler alternative: report `inferenceMs` + frame time in HUD only.
- Verify: metric printed in HUD and in a Playwright smoke run.

## Next

### U5. Scene SDK (`registerScene`)
- Status: scenes are hard-coded: `SceneId` union in `app/appStore.ts`, arrays in `Launcher.tsx`, `Dock.tsx`, `App.tsx`.
- Difficulty: medium. One registry module replaces three duplicated lists.
- Feasibility: none external.
- Simpler alternative: this is the simplification: the three duplicated lists collapse to one.
- Verify: new scene in under 200 lines, test registering a fake scene.

### U6. Auto-calibration
- Status: not started (`CalibrationOverlay.tsx`, 300 lines, uses finger dwell).
- Difficulty: hard. Detect a projected marker in camera frames under changing room light; needs homography from detected corners (`homography.ts` already solves DLT).
- Feasibility: projector/camera auto-exposure, ambient light, no ground-truth rig.
- Simpler alternative: keep dwell calibration; add a "nudge corner" fine-tune step.
- Verify: reprojection error under N px on fixture frames.

### U7. Gesture record/playback
- Status: `backend/src/services/gestureRecorder.ts` exists server-side.
- Difficulty: medium. Move to the browser (JSON of landmarks) so tests need no camera.
- Feasibility: file size of landmark streams; privacy (no video stored).
- Simpler alternative: record only gesture events, not landmarks.
- Verify: replay produces identical scene state in vitest.

## Later

### U8. Occlusion handling
- Difficulty: hard. Hand shadow masks need a second view or depth; Feasibility: single RGB camera limits this. Simpler: dim content near the fingertip. Verify: manual rig check.

### U9. AI ask-path
- Difficulty: medium. Pinch-hold then Ollama/Gemini describes the scene. Feasibility: needs local Ollama or a paid key; must stay out of the tracking loop. Simpler: text box only. Verify: no inference-time regression (U4).

### U10. Showcase scene and 3-minute first run
- Difficulty: easy (scene) / medium (pinned, reproducible install). Feasibility: depends on U5. Simpler: ship a gallery scene only. Verify: clean-clone timing.

### U11. Hosted demo + rig photos
- Difficulty: easy; needs the owner's photos; Feasibility: camera permission requires HTTPS. Simpler: video in README. Verify: link works.
