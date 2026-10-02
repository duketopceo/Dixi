// 4-point homography via normalized Direct Linear Transform.
// Maps camera image space [0,1] -> projector canvas space [0,1].
// Port of packages/vision/projection_calibration.py (same math, tests mirrored).

export type Point2 = [number, number];
export type Homography = number[]; // 3x3 row-major, length 9

const NUM_POINTS = 4;
const EPSILON = 1e-10;

/** Solve a linear system via Gaussian elimination with partial pivoting. */
function solveLinearSystem(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const aug = a.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[pivotRow][col])) pivotRow = row;
    }
    if (Math.abs(aug[pivotRow][col]) < EPSILON) return null;
    [aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]];
    for (let row = col + 1; row < n; row++) {
      const f = aug[row][col] / aug[col][col];
      for (let k = col; k <= n; k++) aug[row][k] -= f * aug[col][k];
    }
  }

  const x = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = aug[row][n];
    for (let k = row + 1; k < n; k++) sum -= aug[row][k] * x[k];
    x[row] = sum / aug[row][row];
  }
  return x;
}

/** Mean + scale normalization so points are centered at origin with avg distance sqrt(2). */
function normalizePoints(pts: Point2[]): { pts: Point2[]; t: Homography } {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of pts) {
    cx += x;
    cy += y;
  }
  cx /= pts.length;
  cy /= pts.length;

  let meanDist = 0;
  for (const [x, y] of pts) meanDist += Math.hypot(x - cx, y - cy);
  meanDist /= pts.length;
  const scale = meanDist > EPSILON ? Math.SQRT2 / meanDist : 1;

  return {
    pts: pts.map(([x, y]) => [(x - cx) * scale, (y - cy) * scale] as Point2),
    // translate-then-scale matrix
    t: [scale, 0, -scale * cx, 0, scale, -scale * cy, 0, 0, 1],
  };
}

function matMul3(a: Homography, b: Homography): Homography {
  const out = new Array(9).fill(0);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      for (let k = 0; k < 3; k++) out[r * 3 + c] += a[r * 3 + k] * b[k * 3 + c];
  return out;
}

function invert3x3(m: Homography): Homography | null {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = c * h - b * i;
  const C = b * f - c * e;
  const det = a * A + d * B + g * C;
  if (Math.abs(det) < EPSILON) return null;
  const inv = 1 / det;
  return [
    A * inv,
    B * inv,
    C * inv,
    (f * g - d * i) * inv,
    (a * i - c * g) * inv,
    (c * d - a * f) * inv,
    (d * h - e * g) * inv,
    (b * g - a * h) * inv,
    (a * e - b * d) * inv,
  ];
}

/**
 * Reject degenerate corner sets: overlapping points or 4-collinear.
 * Same rules as the Python calibration module.
 */
export function validateCorners(pts: Point2[]): boolean {
  for (let i = 0; i < NUM_POINTS; i++) {
    for (let j = i + 1; j < NUM_POINTS; j++) {
      if (Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) < 0.01) return false;
    }
  }
  const cross = (u: Point2, v: Point2) => u[0] * v[1] - u[1] * v[0];
  const v1: Point2 = [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]];
  const v2: Point2 = [pts[2][0] - pts[0][0], pts[2][1] - pts[0][1]];
  const v3: Point2 = [pts[3][0] - pts[0][0], pts[3][1] - pts[0][1]];
  return !(Math.abs(cross(v1, v2)) < 1e-4 && Math.abs(cross(v1, v3)) < 1e-4);
}

/**
 * Compute the 3x3 homography mapping src -> dst.
 * Normalized DLT (Hartley & Zisserman) — numerically stable for pixel coords.
 */
export function computeHomography(src: Point2[], dst: Point2[]): Homography | null {
  if (src.length !== NUM_POINTS || dst.length !== NUM_POINTS) return null;
  if (!validateCorners(src) || !validateCorners(dst)) return null;

  const normSrc = normalizePoints(src);
  const normDst = normalizePoints(dst);

  const rows: number[][] = [];
  const rhs: number[] = [];
  for (let i = 0; i < NUM_POINTS; i++) {
    const [x, y] = normSrc.pts[i];
    const [u, v] = normDst.pts[i];
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    rhs.push(u);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    rhs.push(v);
  }

  const h = solveLinearSystem(rows, rhs);
  if (!h) return null;
  const hn: Homography = [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];

  // H = inv(T_dst) * Hn * T_src
  const tInv = invert3x3(normDst.t);
  if (!tInv) return null;
  return matMul3(tInv, matMul3(hn, normSrc.t));
}

/** Apply a homography to a 2D point. Returns null if the point maps to infinity. */
export function applyHomography(h: Homography, x: number, y: number): Point2 | null {
  const w = h[6] * x + h[7] * y + h[8];
  if (Math.abs(w) < EPSILON) return null;
  return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
}
