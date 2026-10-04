# Vendored model weights — provenance

CLAUDE.md requires version-pinning all CV model weights. This file is the
pin record for every blob vendored in this directory.

| File | Source | Model bundle revision | Runtime | SHA-256 | Vendored |
|------|--------|-----------------------|---------|---------|----------|
| `gesture_recognizer.task` | MediaPipe Tasks Vision model bundle — Google's hosted `gesture_recognizer.task` (GestureRecognizer task, `https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task`) | `float16`, bundle rev `1` | `@mediapipe/tasks-vision` `0.10.22-rc.20250304` | `97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482` | 2026-10-01 (#60) |

## Consumers

- `src/vision/trackerClient.ts` — loads `/models/gesture_recognizer.task`
  via `GestureRecognizer.createFromOptions`. This is the **only** model in
  the inference path.

## Rules for updating

1. Download the new `.task` from the MediaPipe model bundle (URL above).
2. `sha256sum` it and update the table — a weight without a checksum row
   here must not be committed.
3. Remove weights no `src/` import references — dead binaries rot.

## WASM runtime (not here)

`/wasm/*` is generated at install time by `scripts/copy-wasm.mjs` from the
`@mediapipe/tasks-vision` package pinned in `package.json` — no vendored
copies, version comes from the lockfile.
