/** Canvas helpers shared by the gesture scenes. */

/**
 * Match the canvas bitmap to the window size — but only when it actually
 * changed. Assigning canvas.width/height every rAF reallocates the bitmap
 * (several MB at 1080p+) and resets all context state, per frame.
 * Returns true when a resize happened (context state was reset).
 */
export function resizeCanvasToWindow(canvas: HTMLCanvasElement): boolean {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    return true;
  }
  return false;
}
