import React, { useState, useEffect } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

export type GestureAction = 'select' | 'drag' | 'rotate' | 'scale' | 'create' | null;

interface GestureActionIndicatorProps {
  action: GestureAction;
  position: [number, number, number];
  visible?: boolean;
}

const ACTION_LABELS: Record<NonNullable<GestureAction>, string> = {
  select: 'Selecting',
  drag: 'Dragging',
  rotate: 'Rotating',
  scale: 'Scaling',
  create: 'Creating',
};

const ACTION_COLORS: Record<NonNullable<GestureAction>, string> = {
  select: '#00F5FF', // cyan
  drag: '#FF006E', // pink
  rotate: '#00FF87', // green
  scale: '#FFD700', // gold
  create: '#9D4EDD', // purple
};

export const GestureActionIndicator: React.FC<GestureActionIndicatorProps> = ({
  action,
  position,
  visible = true,
}) => {
  const [opacity, setOpacity] = useState(1);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (action && visible) {
      setShouldRender(true);
      setOpacity(1);
      
      // Auto-fade after 2 seconds
      const fadeTimer = setTimeout(() => {
        setOpacity(0);
        setTimeout(() => {
          setShouldRender(false);
        }, 300); // Wait for fade animation
      }, 2000);

      return () => clearTimeout(fadeTimer);
    } else {
      setShouldRender(false);
      setOpacity(0);
    }
  }, [action, visible]);

  if (!shouldRender || !action) return null;

  const label = ACTION_LABELS[action];
  const color = ACTION_COLORS[action];

  return (
    <group position={[position[0], position[1] + 0.3, position[2]]}>
      {/* Background plane */}
      <mesh>
        <planeGeometry args={[1.2, 0.3]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={opacity * 0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Text label */}
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.15}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {label}
      </Text>
    </group>
  );
};

