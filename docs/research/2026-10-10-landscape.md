# Dixi landscape (2026-10-10)

Method: code read first (`packages/frontend/src/vision/*`, `App.tsx`, CI), then web checks on 2026-10-11.
Claims without a link are from this repo's own code; items marked *unverified* were not re-checked online.

## What Dixi is, from the code
A Vite/React page runs MediaPipe GestureRecognizer in the browser (`vision/trackerClient.ts`,
`browserTrackingSource.ts`), maps camera to projector with a 4-point homography
(`vision/homography.ts`, `visionStore.ts`), and drives two scenes (`GestureShapes`, `DrawScene`) through a
Launcher + Dock. A Node backend and Python vision service remain as a legacy "server mode"
(`VITE_VISION_MODE=server`).

## Comparable projects and products

| Project | What it is | Better than Dixi | Worse than Dixi |
|---|---|---|---|
| [LUMOplay](https://www.lumoplay.com/) | Interactive floor/wall software, 300+ apps, any projector | App library, polish, support | Needs a 3D camera; the vendor puts a full kit at about $2,000-2,500; subscription; closed |
| [Intuiface](https://www.intuiface.com/) | No-code platform for interactive exhibits (touch, motion, voice, presence) | No-code authoring, data connectors | Closed, commercial, no pricing on its landing page; sensor support is bring-your-own |
| [Ultraleap](https://www.ultraleap.com/) | Hand-tracking SDK | Tracking quality | Proprietary hardware (Leap Motion Controller 2) |
| [MediaPipe Gesture Recognizer (Web)](https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer/web_js) | The model/runtime Dixi uses | Maintained upstream, documented | A task, not a surface: no calibration, no scenes |
| [Handtrack.js](https://blog.tensorflow.org/2019/11/handtrackjs-tracking-hand-interactions.html) | TF.js hand detection in browser (bounding boxes) | Tiny API | Boxes only, no landmarks or pinch; older stack |
| Projector-camera research, e.g. [IEEE Spectrum: any surface a touchscreen](https://spectrum.ieee.org/any-surface-a-touchscreen), [infrared-pen webcam touch](https://www.academia.edu/55329408/Real_Time_Webcam_based_Infrared_Tracking_for_Projection_Display_System) | Structured-light / IR-pen touch detection on flat surfaces | True touch (contact) detection | Special light or pens, research prototypes, not reusable software |

SixthSense (MIT, 2009, coloured finger markers) and OptiTUIO (LiDAR) are named in the existing ROADMAP.md;
*unverified* here.

## What users expect
- Calibrate in under a minute and not redo it (Dixi stores it in `localStorage` as `dixi-calibration-v1`).
- Low latency: the ROADMAP targets under 50 ms; there is no measurement harness yet.
- It keeps working when a camera unplugs (Dixi has a picker with fallback).

## What is unique
Open source, commodity webcam, zero install (a browser tab), no backend needed for core scenes. The gap in the field is
exactly the layer Dixi owns: calibrated hand cursors for web content. The weakness is that it detects gestures in
the air, not contact, so "touch" is a pinch.

## Implications
1. A scene SDK is the product: LUMOplay wins on library size, so contributors writing scenes is the only way to compete.
2. Keep AI out of the tracking loop (agrees with ROADMAP v0.4).
3. Server mode duplicates what MediaPipe-in-browser now does; maintaining it costs more than it gives.
