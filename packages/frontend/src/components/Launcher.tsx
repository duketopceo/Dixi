import React from 'react';
import { useAppStore, type SceneId } from '../app/appStore';
import { useVisionStore } from '../vision/visionStore';

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
      <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: 2 }}>DIXI</div>
      <div style={{ fontSize: 15, opacity: 0.6, marginTop: 6, marginBottom: 40 }}>
        point at what you want — pinch to touch it
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        {SCENES.map((scene) => (
          <button
            key={scene.id}
            onClick={() => setScene(scene.id)}
            disabled={!ready}
            style={{
              width: 220,
              height: 160,
              fontSize: 18,
              color: ready ? '#fff' : 'rgba(255,255,255,0.35)',
              background: 'rgba(255,255,255,0.06)',
              border: `2px solid ${ready ? 'rgba(0,245,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 16,
              cursor: ready ? 'pointer' : 'not-allowed',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'transform 120ms, box-shadow 120ms',
            }}
            onMouseEnter={(e) => {
              if (ready) {
                e.currentTarget.style.transform = 'scale(1.04)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0,245,255,0.25)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: 42 }}>{scene.icon}</span>
            <span style={{ fontWeight: 600 }}>{scene.name}</span>
            <span style={{ fontSize: 12, opacity: 0.65, padding: '0 12px' }}>
              {scene.description}
            </span>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 44, display: 'flex', gap: 16, alignItems: 'center' }}>
        <button
          onClick={beginCalibration}
          style={{
            padding: '12px 28px',
            fontSize: 15,
            color: homography ? '#00FF87' : '#FFB800',
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${homography ? 'rgba(0,255,135,0.5)' : 'rgba(255,184,0,0.5)'}`,
            borderRadius: 12,
            cursor: 'pointer',
          }}
        >
          {homography ? '✓ Calibrated — recalibrate' : 'Calibrate camera ↔ projector'}
        </button>
        <button
          onClick={closeMenu}
          style={{
            padding: '12px 20px',
            fontSize: 14,
            color: 'rgba(255,255,255,0.7)',
            background: 'none',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 12,
            cursor: 'pointer',
          }}
        >
          Continue →
        </button>
      </div>

      <div style={{ position: 'absolute', bottom: 20, fontSize: 12, opacity: 0.45 }}>
        vision: {status} · mode: {mode}
        {!homography && mode === 'browser' && ' · uncalibrated — pointing uses mirrored camera space'}
      </div>
    </div>
  );
};

export default Launcher;
