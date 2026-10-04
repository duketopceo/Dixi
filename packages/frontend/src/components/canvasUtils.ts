/** Canvas helpers shared by the gesture scenes. */

/** Per-side cursor/accent color — the scene-layer convention. */
export const HAND_COLOR: Record<'left' | 'right', string> = {
  right: '#00F5FF',
  left: '#FF006E',
};

/** Convert legacy [-1,1] projector space to [0,1] canvas space, clamped. */
export function normalizeCoordinate(raw: number): number {
  return Math.max(0, Math.min(1, (raw + 1) / 2));
}

export function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Canonical hand cursor — one look across all scenes. */
export function drawHandCursor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  side: 'left' | 'right',
  pinching: boolean,
): void {
  ctx.beginPath();
  ctx.arc(x, y, pinching ? 16 : 10, 0, Math.PI * 2);
  ctx.fillStyle = pinching ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)';
  ctx.fill();
  ctx.strokeStyle = HAND_COLOR[side];
  ctx.lineWidth = 2;
  ctx.stroke();
}

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
