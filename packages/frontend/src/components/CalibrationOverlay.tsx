import React, { useEffect, useRef, useState } from 'react';
import { useVisionStore, PROJECTOR_TARGETS } from '../vision/visionStore';
import { useTrackingStore } from '../store/trackingStore';
import { useTrackerVideoStream } from '../vision/useTrackerVideoStream';

// Dwell-capture: fingertip must stay within this camera-space radius for
// DWELL_MS to register a calibration point.
const STABILITY_RADIUS = 0.02;
const DWELL_MS = 800;
const POLL_MS = 50;

/**
 * Full-screen calibration flow. One bright target at a time in the corners of
 * the projection; the user points at it and holds still. 4 taps -> homography.
 */
export const CalibrationOverlay: React.FC = () => {
  const calibrating = useVisionStore((s) => s.calibrating);
  const points = useVisionStore((s) => s.calibrationPoints);
  const addPoint = useVisionStore((s) => s.addCalibrationPoint);
  const cancel = useVisionStore((s) => s.cancelCalibration);

  const [dwellProgress, setDwellProgress] = useState(0);
  const [doneFlash, setDoneFlash] = useState(false);
  // fingertip position for the preview marker — driven at poll cadence
  // inside the dwell interval, not by a per-frame tracking subscription
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);

  // Esc cancels
  useEffect(() => {
    if (!calibrating) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [calibrating, cancel]);
  const dwellStart = useRef<number | null>(null);
  const anchor = useRef<{ x: number; y: number } | null>(null);
  // After a capture the fingertip must LEAVE the captured region before the
  // next dwell may start — otherwise a held hand re-banks the same camera
  // point for the next target and the homography comes out degenerate.
  const releasePos = useRef<{ x: number; y: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stream = useTrackerVideoStream(calibrating);

  // Bind the preview inset to the tracker's stream by identity.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !stream) return;
    if (v.srcObject !== stream) {
      v.srcObject = stream;
      v.play().catch(() => {});
    }
  }, [stream]);

  // Dwell detection on the fingertip's camera position.
  // Reads getState() inside the interval — subscribing here would re-create
  // the timer every tracked frame (~30/s).
  useEffect(() => {
    if (!calibrating) return;
    const timer = setInterval(() => {
      const tracking = useTrackingStore.getState().currentTracking;
      const hand =
        tracking?.hands?.right?.detected && tracking.hands.right.cameraPosition
          ? tracking.hands.right
          : tracking?.hands?.left?.detected && tracking.hands.left.cameraPosition
            ? tracking.hands.left
            : null;

      const tip = hand?.cameraPosition;
      setTip(tip ?? null);
      if (!tip) {
        dwellStart.current = null;
        anchor.current = null;
        releasePos.current = null;
        setDwellProgress(0);
        return;
      }

      // Wait for the fingertip to depart the last captured point.
      if (releasePos.current) {
        const moved = Math.hypot(tip.x - releasePos.current.x, tip.y - releasePos.current.y);
        if (moved < STABILITY_RADIUS * 2) {
          setDwellProgress(0);
          return;
        }
        releasePos.current = null;
      }

      if (!anchor.current || Math.hypot(tip.x - anchor.current.x, tip.y - anchor.current.y) > STABILITY_RADIUS) {
        anchor.current = { x: tip.x, y: tip.y };
        dwellStart.current = performance.now();
        setDwellProgress(0);
        return;
      }

      const elapsed = performance.now() - (dwellStart.current ?? 0);
      setDwellProgress(Math.min(1, elapsed / DWELL_MS));
      if (elapsed >= DWELL_MS) {
        // capture camera point (anchor centroid)
        const captured = addPoint([anchor.current.x, anchor.current.y]);
        releasePos.current = { x: anchor.current.x, y: anchor.current.y };
        anchor.current = null;
        dwellStart.current = null;
        setDwellProgress(0);
        if (captured) {
          setDoneFlash(true);
          setTimeout(() => setDoneFlash(false), 1200);
        }
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [calibrating, addPoint]);

  if (!calibrating && !doneFlash) return null;

  // 'Calibrated' flash: addPoint flips calibrating off in the same commit,
  // so the flash must render on its own state or it never paints.
  if (doneFlash) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,255,135,0.15)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 42, color: '#00FF87', fontWeight: 700 }}>Calibrated</div>
      </div>
    );
  }

  const idx = Math.min(points.length, 3);
  const [tx, ty] = PROJECTOR_TARGETS[idx];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0,0,0,0.55)',
        pointerEvents: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: '4%',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 600 }}>
          Point at the glowing dot and hold still
        </div>
        <div style={{ fontSize: 16, opacity: 0.7, marginTop: 8 }}>
          Marker {idx + 1} of 4 — keeps the projector and camera aligned
        </div>
      </div>

      {/* Current target */}
      <div
        style={{
          position: 'absolute',
          left: `${tx * 100}%`,
          top: `${ty * 100}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: '4px solid #00F5FF',
            boxShadow: '0 0 30px #00F5FF, inset 0 0 20px rgba(0,245,255,0.4)',
          }}
        />
        {/* dwell progress ring */}
        <svg width="96" height="96" style={{ position: 'absolute', top: -20, left: -20 }}>
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="4"
          />
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke="#00F5FF"
            strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - dwellProgress)}`}
            transform="rotate(-90 48 48)"
            style={{ transition: 'stroke-dashoffset 50ms linear' }}
          />
        </svg>
      </div>

      {/* Completed targets */}
      {points.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${p.projector[0] * 100}%`,
            top: `${p.projector[1] * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#00FF87',
            boxShadow: '0 0 12px #00FF87',
          }}
        />
      ))}

      {/* Camera preview with fingertip marker */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 320,
          border: '2px solid rgba(255,255,255,0.25)',
          borderRadius: 8,
          overflow: 'hidden',
          background: '#000',
        }}
      >
        <video ref={videoRef} muted playsInline style={{ width: '100%', display: 'block', transform: 'scaleX(-1)' }} />
        {tip && (
          <div
            style={{
              position: 'absolute',
              // preview is mirrored for the user; cameraPosition is raw
              left: `${(1 - tip.x) * 100}%`,
              top: `${tip.y * 100}%`,
              width: 14,
              height: 14,
              marginLeft: -7,
              marginTop: -7,
              borderRadius: '50%',
              background: '#FF006E',
              boxShadow: '0 0 10px #FF006E',
            }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            left: 8,
            color: 'rgba(255,255,255,0.7)',
            fontSize: 11,
            fontFamily: 'system-ui',
          }}
        >
          camera view
        </div>
      </div>

      {/* Cancel */}
      <button
        onClick={cancel}
        style={{
          position: 'absolute',
          bottom: 24,
          left: 24,
          padding: '10px 20px',
          fontSize: 14,
          color: '#fff',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        Cancel (Esc)
      </button>

    </div>
  );
};

export default CalibrationOverlay;
