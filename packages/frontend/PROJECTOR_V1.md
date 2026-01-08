# Projector Interaction v1

## Overview

Simple interactive shapes on the projection canvas, controllable via hand gestures.

## How to use

1. **Start backend**:
   ```bash
   cd packages/backend && npm run dev
   ```

2. **Start vision service**:
   ```bash
   cd packages/vision && python main.py
   ```

3. **Start frontend**:
   ```bash
   cd packages/frontend && npm run dev
   ```

4. **Connect projector** via HDMI; extend displays in OS settings

5. **Move browser window** to projector screen (fullscreen recommended - press F11)

6. **Make pinch gesture** over a shape to grab and move it

7. **Move your hand** to drag the shape

## Shapes

The canvas displays three interactive shapes:
- **Cyan Circle** - positioned at 30% from left, 40% from top
- **Pink Square** - positioned at center (50%, 50%)
- **Green Triangle** - positioned at 70% from left, 60% from top

## Gestures

| Gesture | Action |
|---------|--------|
| Hand visible | White cursor follows hand position |
| Pinch near shape | Grab shape (cursor becomes larger) |
| Move while pinching | Drag the grabbed shape |
| Release pinch | Drop shape at current position |

## Technical Details

- Shapes use normalized coordinates [0, 1] for position
- Hand coordinates converted from vision service [-1, 1] to [0, 1]
- Drag mode activated when pinch detected within 0.12 normalized distance of shape
- Uses HTML5 Canvas 2D for rendering (simple and fast)
- 60 FPS animation loop with requestAnimationFrame

## What's NOT here

- Calibration (no wall geometry yet)
- Complex 3D models (just simple 2D shapes)
- Molecule viewer (will come later)
- Persistence (shapes reset on reload)
- Multi-shape selection
- Scale gestures (pinch distance doesn't scale yet)
- Rotation gestures

## Troubleshooting

### Shapes not responding to gestures

1. Check that vision service is running (`python main.py`)
2. Check that backend is running (`npm run dev`)
3. Check browser console for WebSocket connection errors
4. Verify hand is detected in the Control Panel's gesture display

### Black screen

1. Check that all services are running
2. Check browser console for errors
3. Try refreshing the page

### Laggy movement

1. Reduce other browser tabs
2. Check vision service FPS in Model Configuration panel
3. Increase FRAME_SKIP_INTERVAL if needed

## File Structure

```
packages/frontend/src/components/
├── ProjectionShapes.tsx      # Main component
├── ProjectionShapes.test.tsx # Unit tests
└── ...
```

## Next steps (feature/projector-calibration)

- Add calibration UI for wall-space mapping
- Implement perspective correction
- Support multiple shapes with better selection
- Add scale gestures (pinch distance)
- Add rotation gestures
- Add shape creation/deletion
- Persist shapes to local storage
