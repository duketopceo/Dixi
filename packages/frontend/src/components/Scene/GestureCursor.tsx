import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGestureStore } from '../../store/gestureStore';

export const GestureCursor: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);
  const centerCrosshairRef = useRef<THREE.Mesh>(null);
  const gestureVisualRef = useRef<THREE.Mesh>(null);
  const bracket1Ref = useRef<THREE.Mesh>(null);
  const bracket2Ref = useRef<THREE.Mesh>(null);
  const bracket3Ref = useRef<THREE.Mesh>(null);
  const bracket4Ref = useRef<THREE.Mesh>(null);
  const currentGesture = useGestureStore((state) => state.currentGesture);

  useFrame(() => {
    if (!groupRef.current || !currentGesture) return;

    // Map gesture position (0-1 normalized) to 3D space
    const x = (currentGesture.position.x - 0.5) * 10;
    const y = -(currentGesture.position.y - 0.5) * 10; // Invert Y
    
    // Smooth lerp
    const targetPos = new THREE.Vector3(x, y, 0);
    groupRef.current.position.lerp(targetPos, 0.15);
  });

  if (!currentGesture) return null;

  const color = {
    wave: '#00F5FF',
    pinch: '#FF006E',
    point: '#00FF87'
  }[currentGesture.type] || '#ffffff';

  const bracketSize = 0.05;
  const bracketThickness = 0.01;
  const bracketDistance = 0.22;

  return (
    <group ref={groupRef}>
      {/* Main cursor ring */}
      <mesh ref={meshRef}>
        <ringGeometry args={[0.15, 0.18, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>

      {/* Center crosshair */}
      <mesh ref={centerCrosshairRef}>
        <ringGeometry args={[0.02, 0.03, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>

      {/* SpaceX corner brackets at 0°, 90°, 180°, 270° */}
      {/* Top bracket (0°) */}
      <group ref={bracket1Ref} position={[0, bracketDistance, 0]}>
        <mesh>
          <boxGeometry args={[bracketSize, bracketThickness, bracketThickness]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
        <mesh position={[-bracketSize / 2, 0, 0]}>
          <boxGeometry args={[bracketThickness, bracketSize, bracketThickness]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
      </group>

      {/* Right bracket (90°) */}
      <group ref={bracket2Ref} position={[bracketDistance, 0, 0]}>
        <mesh>
          <boxGeometry args={[bracketThickness, bracketSize, bracketThickness]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
        <mesh position={[0, bracketSize / 2, 0]}>
          <boxGeometry args={[bracketSize, bracketThickness, bracketThickness]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
      </group>

      {/* Bottom bracket (180°) */}
      <group ref={bracket3Ref} position={[0, -bracketDistance, 0]}>
        <mesh>
          <boxGeometry args={[bracketSize, bracketThickness, bracketThickness]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
        <mesh position={[bracketSize / 2, 0, 0]}>
          <boxGeometry args={[bracketThickness, bracketSize, bracketThickness]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
      </group>

      {/* Left bracket (270°) */}
      <group ref={bracket4Ref} position={[-bracketDistance, 0, 0]}>
        <mesh>
          <boxGeometry args={[bracketThickness, bracketSize, bracketThickness]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
        <mesh position={[0, -bracketSize / 2, 0]}>
          <boxGeometry args={[bracketSize, bracketThickness, bracketThickness]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
      </group>

      {/* Gesture-specific visual */}
      {currentGesture.type === 'pinch' && (
        <mesh ref={gestureVisualRef}>
          <octahedronGeometry args={[0.08, 0]} />
          <meshBasicMaterial 
            color={color} 
            transparent 
            opacity={0.6}
            wireframe={true}
          />
        </mesh>
      )}

      {currentGesture.type === 'point' && (
        <mesh ref={gestureVisualRef} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.08, 0.25, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
};

