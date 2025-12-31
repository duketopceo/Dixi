# Tutorial 3: Gesture Detection Deep Dive

Learn how gesture recognition works and practice all supported gestures.

## All Supported Gestures

### Static Gestures
1. **Wave** - Open hand, wave side to side
2. **Point** - Index finger extended, others closed
3. **Pinch** - Thumb and index finger together
4. **Fist** - All fingers closed
5. **Open Palm** - All fingers extended
6. **Thumbs Up** - Thumb extended upward
7. **Thumbs Down** - Thumb extended downward
8. **Peace Sign** - Index and middle fingers extended (V shape)
9. **OK Sign** - Thumb and index finger forming circle

### Motion Gestures
10. **Swipe Left** - Move hand left quickly
11. **Swipe Right** - Move hand right quickly
12. **Swipe Up** - Move hand up quickly
13. **Swipe Down** - Move hand down quickly

## How Detection Works

1. Camera captures at 30 FPS
2. MediaPipe extracts 21 hand landmarks
3. Algorithm analyzes finger positions and angles
4. Gesture classified with confidence score
5. Result sent to backend and UI

## Practice Session

Perform each gesture and verify detection accuracy.

**Target Confidence**: > 85%

---

*Last updated: 2025-12-21*
