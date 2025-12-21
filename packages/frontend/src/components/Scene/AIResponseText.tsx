import React, { useRef, useEffect } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useAIStore } from '../../store/aiStore';
import { useGestureStore } from '../../store/gestureStore';

export const AIResponseText: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const textRef = useRef<any>(null);
  const cardRef = useRef<THREE.Mesh>(null);
  const { latestResponse } = useAIStore();
  const currentGesture = useGestureStore((state) => state.currentGesture);

  useEffect(() => {
    if (groupRef.current && currentGesture && latestResponse) {
      // Position card near gesture location
      const x = (currentGesture.position.x - 0.5) * 10;
      const y = -(currentGesture.position.y - 0.5) * 10 + 1; // Offset above cursor
      groupRef.current.position.set(x, y, 0.5);
    }
  }, [currentGesture, latestResponse]);

  if (!latestResponse || !latestResponse.response) return null;

  // Calculate card dimensions based on text length
  const cardWidth = 4.5;
  const cardHeight = Math.min(2, (latestResponse.response.length / 50) * 0.5 + 0.8);

  return (
    <group ref={groupRef}>
      {/* Glass card background */}
      <mesh ref={cardRef}>
        <planeGeometry args={[cardWidth, cardHeight]} />
        <meshStandardMaterial
          color="#0f0f0f"
          transparent
          opacity={0.85}
          metalness={0.1}
          roughness={0.2}
          emissive="#000000"
          emissiveIntensity={0}
        />
      </mesh>

      {/* Cyan border outline - top */}
      <mesh position={[0, cardHeight / 2, 0.01]}>
        <boxGeometry args={[cardWidth, 0.02, 0.01]} />
        <meshBasicMaterial color="#00F5FF" transparent opacity={0.3} />
      </mesh>
      {/* Cyan border outline - bottom */}
      <mesh position={[0, -cardHeight / 2, 0.01]}>
        <boxGeometry args={[cardWidth, 0.02, 0.01]} />
        <meshBasicMaterial color="#00F5FF" transparent opacity={0.3} />
      </mesh>
      {/* Cyan border outline - left */}
      <mesh position={[-cardWidth / 2, 0, 0.01]}>
        <boxGeometry args={[0.02, cardHeight, 0.01]} />
        <meshBasicMaterial color="#00F5FF" transparent opacity={0.3} />
      </mesh>
      {/* Cyan border outline - right */}
      <mesh position={[cardWidth / 2, 0, 0.01]}>
        <boxGeometry args={[0.02, cardHeight, 0.01]} />
        <meshBasicMaterial color="#00F5FF" transparent opacity={0.3} />
      </mesh>

      {/* Text content */}
      <Text
        ref={textRef}
        fontSize={0.18}
        color="#ffffff"
        maxWidth={4.5}
        lineHeight={1.4}
        letterSpacing={0.01}
        textAlign="left"
        anchorX="center"
        anchorY="middle"
        position={[0, 0, 0.01]}
      >
        {latestResponse.response}
      </Text>

      {/* Subtle glow effect */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[cardWidth + 0.1, cardHeight + 0.1]} />
        <meshBasicMaterial
          color="#00F5FF"
          transparent
          opacity={0.1}
        />
      </mesh>
    </group>
  );
};

