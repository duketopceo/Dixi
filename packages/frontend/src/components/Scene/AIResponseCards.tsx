import React, { useRef, useEffect } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useAIStore } from '../../store/aiStore';
import { useTrackingStore } from '../../store/trackingStore';
import { useFrame } from '@react-three/fiber';

interface CardProps {
  response: any;
  index: number;
  totalCards: number;
  basePosition: THREE.Vector3;
}

const AIResponseCard: React.FC<CardProps> = ({ response, index, totalCards, basePosition }) => {
  const groupRef = useRef<THREE.Group>(null);
  const cardRef = useRef<THREE.Mesh>(null);
  const textRef = useRef<any>(null);
  const [fadeOut, setFadeOut] = React.useState(false);

  // Calculate card position in spiral pattern (improved algorithm)
  const angle = (index / totalCards) * Math.PI * 2;
  const radius = 2 + (index * 0.3); // Spiral outward
  const x = basePosition.x + Math.cos(angle) * radius;
  const y = basePosition.y + Math.sin(angle) * radius;
  const z = basePosition.z - 3 - (index * 0.5); // Depth layering (negative Z for depth)

  // Fade out after 30 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
    }, 30000);
    return () => clearTimeout(timer);
  }, []);

  // Smooth animations (optimized - frame-rate independent)
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Slight rotation for visual interest (reduced frequency for better FPS)
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5 + index) * 0.05;
      
      // Fade out animation (frame-rate independent)
      if (fadeOut && cardRef.current) {
        const material = cardRef.current.material as THREE.MeshStandardMaterial;
        material.opacity = Math.max(0, material.opacity - delta * 0.5);
        if (material.opacity <= 0) {
          groupRef.current.visible = false;
        }
      }
    }
  });

  // Calculate card dimensions
  const cardWidth = 4.0;
  const cardHeight = Math.min(1.8, (response.response.length / 50) * 0.4 + 0.7);

  // Color based on analysis type
  const borderColor = response.metadata?.analysisType === 'continuous' 
    ? '#00FF87' 
    : response.metadata?.analysisType === 'gesture'
    ? '#00F5FF'
    : '#9D4EDD';

  if (fadeOut && (!cardRef.current || (cardRef.current.material as THREE.MeshStandardMaterial).opacity <= 0)) {
    return null;
  }

  return (
    <group ref={groupRef} position={[x, y, z]}>
      {/* Glass card background */}
      <mesh ref={cardRef}>
        <planeGeometry args={[cardWidth, cardHeight]} />
        <meshStandardMaterial
          color="#0f0f0f"
          transparent
          opacity={0.85}
          metalness={0.1}
          roughness={0.2}
        />
      </mesh>

      {/* Colored border based on type */}
      <mesh position={[0, cardHeight / 2, 0.01]}>
        <boxGeometry args={[cardWidth, 0.02, 0.01]} />
        <meshBasicMaterial color={borderColor} transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, -cardHeight / 2, 0.01]}>
        <boxGeometry args={[cardWidth, 0.02, 0.01]} />
        <meshBasicMaterial color={borderColor} transparent opacity={0.5} />
      </mesh>
      <mesh position={[-cardWidth / 2, 0, 0.01]}>
        <boxGeometry args={[0.02, cardHeight, 0.01]} />
        <meshBasicMaterial color={borderColor} transparent opacity={0.5} />
      </mesh>
      <mesh position={[cardWidth / 2, 0, 0.01]}>
        <boxGeometry args={[0.02, cardHeight, 0.01]} />
        <meshBasicMaterial color={borderColor} transparent opacity={0.5} />
      </mesh>

      {/* Text content */}
      <Text
        ref={textRef}
        fontSize={0.16}
        color="#ffffff"
        maxWidth={3.8}
        lineHeight={1.3}
        letterSpacing={0.01}
        textAlign="left"
        anchorX="center"
        anchorY="middle"
        position={[0, 0, 0.01]}
      >
        {response.response}
      </Text>

      {/* Glow effect */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[cardWidth + 0.1, cardHeight + 0.1]} />
        <meshBasicMaterial
          color={borderColor}
          transparent
          opacity={0.1}
        />
      </mesh>
    </group>
  );
};

export const AIResponseCards: React.FC = () => {
  const { responseHistory } = useAIStore();
  const currentTracking = useTrackingStore((state) => state.currentTracking);
  const currentGesture = currentTracking?.hands?.right?.detected 
    ? { type: currentTracking.hands.right.gesture, position: currentTracking.hands.right.position }
    : currentTracking?.hands?.left?.detected
    ? { type: currentTracking.hands.left.gesture, position: currentTracking.hands.left.position }
    : null;
  const basePositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // Update base position based on current gesture
  useEffect(() => {
    if (currentGesture) {
      const x = (currentGesture.position.x - 0.5) * 10;
      const y = -(currentGesture.position.y - 0.5) * 10 + 1;
      basePositionRef.current.set(x, y, 0.5);
    }
  }, [currentGesture]);

  // Show last 5 responses (reduced for better FPS)
  const visibleCards = responseHistory.slice(-5);

  if (visibleCards.length === 0) return null;

  return (
    <>
      {visibleCards.map((response, index) => (
        <AIResponseCard
          key={`${response.timestamp}-${index}`}
          response={response}
          index={index}
          totalCards={visibleCards.length}
          basePosition={basePositionRef.current}
        />
      ))}
    </>
  );
};

