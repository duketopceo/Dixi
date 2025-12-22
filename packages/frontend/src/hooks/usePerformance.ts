import { useEffect, useRef, useState } from 'react';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number; // milliseconds
  objectCount: number;
  particleCount: number;
}

/**
 * Hook to monitor performance metrics from ProjectionScene
 * Listens to custom events dispatched by ProjectionScene
 */
export function usePerformance(): PerformanceMetrics {
  const [fps, setFps] = useState(60);
  const [frameTime, setFrameTime] = useState(16.67);
  const [objectCount, setObjectCount] = useState(0);
  const [particleCount, setParticleCount] = useState(0);

  useEffect(() => {
    // Listen for performance updates from ProjectionScene
    const handlePerformanceUpdate = (event: CustomEvent) => {
      if (event.detail) {
        if (event.detail.objectCount !== undefined) {
          setObjectCount(event.detail.objectCount);
        }
        if (event.detail.particleCount !== undefined) {
          setParticleCount(event.detail.particleCount);
        }
      }
    };

    // Listen for frame time updates from ProjectionScene
    const handleFrameTimeUpdate = (event: CustomEvent) => {
      const frameTimeMs = event.detail?.frameTime || 16.67;
      const calculatedFps = Math.round(1000 / frameTimeMs);
      setFrameTime(frameTimeMs);
      setFps(calculatedFps);
    };

    window.addEventListener('dixi:performance', handlePerformanceUpdate as EventListener);
    window.addEventListener('dixi:frameTime', handleFrameTimeUpdate as EventListener);

    return () => {
      window.removeEventListener('dixi:performance', handlePerformanceUpdate as EventListener);
      window.removeEventListener('dixi:frameTime', handleFrameTimeUpdate as EventListener);
    };
  }, []);

  return {
    fps,
    frameTime,
    objectCount,
    particleCount,
  };
}

