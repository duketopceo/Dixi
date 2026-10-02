import React from 'react';
import { useAppStore, type SceneId } from '../app/appStore';
import { useVisionStore } from '../vision/visionStore';

const ITEMS: { id: SceneId | 'menu'; icon: string; label: string }[] = [
  { id: 'menu', icon: '⌂', label: 'Menu' },
  { id: 'shapes', icon: '⬡', label: 'Shapes' },
  { id: 'draw', icon: '✎', label: 'Draw' },
];

/** Bottom-center dock — always reachable, big enough to poke on a wall. */
export const Dock: React.FC = () => {
  const activeScene = useAppStore((s) => s.activeScene);
  const menuOpen = useAppStore((s) => s.menuOpen);
  const setScene = useAppStore((s) => s.setScene);
  const toggleMenu = useAppStore((s) => s.toggleMenu);
  const calibrating = useVisionStore((s) => s.calibrating);

  if (menuOpen || calibrating) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1600,
        display: 'flex',
        gap: 8,
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.65)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 16,
        backdropFilter: 'blur(8px)',
      }}
    >
      {ITEMS.map((item) => {
        const active =
          item.id === 'menu' ? false : activeScene === item.id;
        return (
          <button
            key={item.id}
            onClick={() =>
              item.id === 'menu' ? toggleMenu() : setScene(item.id)
            }
            style={{
              minWidth: 64,
              padding: '10px 14px',
              fontSize: 13,
              fontFamily: 'system-ui, sans-serif',
              color: active ? '#00F5FF' : 'rgba(255,255,255,0.8)',
              background: active ? 'rgba(0,245,255,0.12)' : 'transparent',
              border: `1px solid ${active ? 'rgba(0,245,255,0.4)' : 'transparent'}`,
              borderRadius: 10,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default Dock;
