import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGestureStore } from '../../store/gestureStore';

export const GestureCursor: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const gestureVisualRef = useRef<THREE.Mesh>(null);
  const currentGesture = useGestureStore((state) => state.currentGesture);

  useFrame(() => {
    if (!meshRef.current || !currentGesture) return;

    // Map gesture position (0-1 normalized) to 3D space
    const x = (currentGesture.position.x - 0.5) * 10;
    const y = -(currentGesture.position.y - 0.5) * 10; // Invert Y
    
    // Smooth lerp
    const targetPos = new THREE.Vector3(x, y, 0);
    meshRef.current.position.lerp(targetPos, 0.15);
    
    if (outerRingRef.current) {
      outerRingRef.current.position.copy(meshRef.current.position);
    }
    
    if (gestureVisualRef.current) {
      gestureVisualRef.current.position.copy(meshRef.current.position);
    }
  });

  if (!currentGesture) return null;

  const color = {
    wave: '#00f2ff',
    pinch: '#ff006e',
    point: '#00ff87'
  }[currentGesture.type] || '#ffffff';

  return (
    <group>
      {/* Cursor ring */}
      <mesh ref={meshRef}>
        <ringGeometry args={[0.15, 0.2, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>

      {/* Pulsing outer ring */}
      <mesh ref={outerRingRef}>
        <ringGeometry args={[0.25, 0.3, 32]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.4} 
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Gesture-specific visual */}
      {currentGesture.type === 'pinch' && (
        <mesh ref={gestureVisualRef}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
      )}

      {currentGesture.type === 'point' && (
        <mesh ref={gestureVisualRef} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.1, 0.3, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}
    </group>
  );
};

