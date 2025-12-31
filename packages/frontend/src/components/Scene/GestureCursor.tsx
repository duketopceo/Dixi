import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTrackingStore } from '../../store/trackingStore';

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
  const currentTracking = useTrackingStore((state) => state.currentTracking);
  // Get primary hand gesture (right hand preferred, fallback to left)
  const currentGesture = currentTracking?.hands?.right?.detected 
    ? { type: currentTracking.hands.right.gesture, position: currentTracking.hands.right.position, confidence: currentTracking.hands.right.confidence, timestamp: currentTracking.hands.right.timestamp }
    : currentTracking?.hands?.left?.detected
    ? { type: currentTracking.hands.left.gesture, position: currentTracking.hands.left.position, confidence: currentTracking.hands.left.confidence, timestamp: currentTracking.hands.left.timestamp }
    : null;

  useFrame(() => {
    if (!groupRef.current || !currentGesture) return;

    // Map gesture position (0-1 normalized) to 3D space
    const x = (currentGesture.position.x - 0.5) * 10;
    const y = -(currentGesture.position.y - 0.5) * 10; // Invert Y
    
    // Smooth lerp (optimized for performance)
    const targetPos = new THREE.Vector3(x, y, 0);
    groupRef.current.position.lerp(targetPos, 0.2); // Slightly faster lerp reduces computation
  });

  if (!currentGesture) return null;

  // Extended color mapping for 30+ gestures
  const colorMap: { [key: string]: string } = {
    // Basic gestures
    wave: '#00F5FF',
    pinch: '#FF006E',
    point: '#00FF87',
    // Hand shapes
    fist: '#8B0000',
    open_palm: '#FFFFFF',
    thumbs_up: '#00FF87',
    thumbs_down: '#FF006E',
    peace: '#00F5FF',
    ok: '#FFD700',
    rock: '#FF4500',
    spiderman: '#FF0000',
    gun: '#C0C0C0',
    three: '#9D4EDD',
    four: '#4A90E2',
    five: '#FFFFFF',
    // Directional
    point_up: '#00FF87',
    point_down: '#FF006E',
    point_left: '#FFA500',
    point_right: '#00F5FF',
    swipe_left: '#FF6B6B',
    swipe_right: '#4ECDC4',
    swipe_up: '#95E1D3',
    swipe_down: '#F38181',
    // Complex motion
    circle: '#9D4EDD',
    figure_eight: '#E056FD',
    zoom_in: '#00CED1',
    zoom_out: '#FF1493',
    grab: '#FF8C00',
    release: '#32CD32',
    rotate_clockwise: '#1E90FF',
    rotate_counterclockwise: '#FF69B4',
    shake: '#FF0000',
    double_tap: '#FFD700',
    // Two-hand
    clap: '#FF1493',
    stretch: '#00CED1',
    point_both: '#00F5FF'
  };

  const color = colorMap[currentGesture.type] || '#ffffff';

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

      {/* Gesture-specific visuals for various gesture types */}
      {['pinch', 'ok', 'double_tap'].includes(currentGesture.type) && (
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

      {['point', 'point_up', 'point_down', 'point_left', 'point_right', 'point_both', 'gun'].includes(currentGesture.type) && (
        <mesh ref={gestureVisualRef} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.08, 0.25, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
      )}

      {['fist'].includes(currentGesture.type) && (
        <mesh ref={gestureVisualRef}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} />
        </mesh>
      )}

      {['open_palm', 'five'].includes(currentGesture.type) && (
        <mesh ref={gestureVisualRef}>
          <planeGeometry args={[0.2, 0.2]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      )}

      {['thumbs_up'].includes(currentGesture.type) && (
        <mesh ref={gestureVisualRef} rotation={[-Math.PI / 4, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.15, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
      )}

      {['peace', 'two'].includes(currentGesture.type) && (
        <mesh ref={gestureVisualRef}>
          <torusGeometry args={[0.1, 0.02, 8, 16, Math.PI]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
      )}

      {['circle', 'rotate_clockwise', 'rotate_counterclockwise'].includes(currentGesture.type) && (
        <mesh ref={gestureVisualRef}>
          <torusGeometry args={[0.12, 0.02, 16, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
      )}

      {['figure_eight'].includes(currentGesture.type) && (
        <group ref={gestureVisualRef}>
          <mesh>
            <torusGeometry args={[0.08, 0.015, 16, 32, Math.PI]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} />
          </mesh>
          <mesh position={[0, -0.16, 0]}>
            <torusGeometry args={[0.08, 0.015, 16, 32, Math.PI]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} />
          </mesh>
        </group>
      )}

      {['zoom_in', 'zoom_out'].includes(currentGesture.type) && (
        <group ref={gestureVisualRef}>
          <mesh>
            <ringGeometry args={[0.1, 0.12, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} />
          </mesh>
          <mesh>
            <ringGeometry args={[0.14, 0.16, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.4} />
          </mesh>
        </group>
      )}

      {['clap'].includes(currentGesture.type) && (
        <group ref={gestureVisualRef}>
          <mesh position={[-0.08, 0, 0]}>
            <planeGeometry args={[0.1, 0.15]} />
            <meshBasicMaterial color={color} transparent opacity={0.7} />
          </mesh>
          <mesh position={[0.08, 0, 0]}>
            <planeGeometry args={[0.1, 0.15]} />
            <meshBasicMaterial color={color} transparent opacity={0.7} />
          </mesh>
        </group>
      )}

      {['swipe_left', 'swipe_right', 'swipe_up', 'swipe_down'].includes(currentGesture.type) && (
        <mesh ref={gestureVisualRef}>
          <boxGeometry args={[0.15, 0.05, 0.01]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
};

