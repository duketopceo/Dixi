import * as THREE from 'three';

/**
 * Exponential moving average filter for smoothing gesture positions
 */
export class GestureSmoother {
  private alpha: number;
  private smoothedPosition: THREE.Vector3 | null = null;
  private smoothedRotation: number | null = null;
  private smoothedScale: number | null = null;

  constructor(alpha: number = 0.3) {
    // Alpha: 0 = no smoothing (instant), 1 = maximum smoothing (very slow)
    // 0.3 is a good balance for responsive but smooth movement
    this.alpha = Math.max(0, Math.min(1, alpha));
  }

  /**
   * Smooth a 3D position using exponential moving average
   */
  smoothPosition(position: THREE.Vector3 | [number, number, number]): THREE.Vector3 {
    const pos = position instanceof THREE.Vector3 
      ? position.clone() 
      : new THREE.Vector3(...position);

    if (!this.smoothedPosition) {
      this.smoothedPosition = pos.clone();
      return pos;
    }

    // Lerp towards new position
    this.smoothedPosition.lerp(pos, this.alpha);
    return this.smoothedPosition.clone();
  }

  /**
   * Smooth a rotation angle
   */
  smoothRotation(angle: number): number {
    if (this.smoothedRotation === null) {
      this.smoothedRotation = angle;
      return angle;
    }

    // Handle angle wrapping (0-2π)
    let diff = angle - this.smoothedRotation;
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;

    this.smoothedRotation += diff * this.alpha;
    
    // Normalize to 0-2π
    while (this.smoothedRotation < 0) this.smoothedRotation += 2 * Math.PI;
    while (this.smoothedRotation >= 2 * Math.PI) this.smoothedRotation -= 2 * Math.PI;

    return this.smoothedRotation;
  }

  /**
   * Smooth a scale value
   */
  smoothScale(scale: number): number {
    if (this.smoothedScale === null) {
      this.smoothedScale = scale;
      return scale;
    }

    // Linear interpolation for scale
    this.smoothedScale = this.smoothedScale + (scale - this.smoothedScale) * this.alpha;
    return this.smoothedScale;
  }

  /**
   * Reset all smoothed values (call when gesture ends)
   */
  reset(): void {
    this.smoothedPosition = null;
    this.smoothedRotation = null;
    this.smoothedScale = null;
  }

  /**
   * Update smoothing factor (0-1)
   */
  setAlpha(alpha: number): void {
    this.alpha = Math.max(0, Math.min(1, alpha));
  }
}

/**
 * Create a smoother instance with default settings
 */
export function createGestureSmoother(alpha: number = 0.3): GestureSmoother {
  return new GestureSmoother(alpha);
}

