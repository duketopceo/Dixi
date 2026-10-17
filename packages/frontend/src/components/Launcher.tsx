import React from 'react';
import { useAppStore, type SceneId } from '../app/appStore';
import { useVisionStore } from '../vision/visionStore';
import './shell.css';

interface SceneCard {
  id: SceneId;
  name: string;
  icon: string;
  description: string;
}

const SCENES: SceneCard[] = [
  {
    id: 'shapes',
    name: 'Shapes',
    icon: '⬡',
    description: 'Pinch to grab. Two hands to scale.',
  },
  {
    id: 'draw',
    name: 'Draw',
    icon: '✎',
    description: 'Pinch = pen down. Fist = clear.',
  },
];

/**
 * Full-screen launcher — big high-contrast targets sized for reaching out
 * and "pressing" a projected wall, not a mouse.
 */
export const Launcher: React.FC = () => {
  const menuOpen = useAppStore((s) => s.menuOpen);
  const setScene = useAppStore((s) => s.setScene);
  const closeMenu = useAppStore((s) => s.closeMenu);
  const status = useVisionStore((s) => s.status);
  const homography = useVisionStore((s) => s.homography);
  const beginCalibration = useVisionStore((s) => s.beginCalibration);
  const mode = useVisionStore((s) => s.mode);

  if (!menuOpen) return null;

  const ready = status === 'running' || mode === 'server';

  return (
    <div
      role="dialog"
      aria-label="Dixi launcher"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        background: 'rgba(4,6,12,0.92)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        color: '#fff',
      }}
    >
      <img src="/dixi-mark.svg" alt="" width={56} height={56} />
      <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: 2 }}>DIXI</div>
      <div style={{ fontSize: 15, color: 'var(--lf-text-muted)', marginTop: 6, marginBottom: 40 }}>
        point at what you want — pinch to touch it
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        {SCENES.map((scene) => (
          <button
            key={scene.id}
            className="dx-card"
            onClick={() => setScene(scene.id)}
            disabled={!ready}
          >
            <span style={{ fontSize: 42 }} aria-hidden="true">{scene.icon}</span>
            <span style={{ fontWeight: 600 }}>{scene.name}</span>
            <span className="dx-card-desc">{scene.description}</span>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 44, display: 'flex', gap: 16, alignItems: 'center' }}>
        <button
          className="dx-btn"
          onClick={() => {
            // The launcher (z-3000) sits above the calibration overlay
            // (z-2000) — it must close or calibration is uncompletable.
            beginCalibration();
            closeMenu();
          }}
          style={{
            color: homography ? 'var(--lf-ok)' : 'var(--lf-warn)',
            borderColor: homography ? 'rgba(0,255,135,0.5)' : 'rgba(255,184,0,0.5)',
          }}
        >
          {homography ? '✓ Calibrated — recalibrate' : 'Calibrate camera ↔ projector'}
        </button>
        <button
          className="dx-btn"
          onClick={closeMenu}
        >
          Continue →
        </button>
      </div>

      <div style={{ position: 'absolute', bottom: 20, fontSize: 12, color: 'var(--lf-text-muted)' }}>
        vision: {status} · mode: {mode}
        {mode === 'browser' &&
          (homography
            ? ' · projector calibrated'
            : ' · no projector? works right on this screen — skip calibration for mirrored pointing')}
      </div>
    </div>
  );
};

export default Launcher;
