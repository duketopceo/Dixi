import React, { useRef, useEffect, useState } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useAIStore } from '../../store/aiStore';
import { useTrackingStore } from '../../store/trackingStore';

export const AIResponseText: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const textRef = useRef<any>(null);
  const cardRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const { latestResponse, isStreaming } = useAIStore();
  const currentTracking = useTrackingStore((state) => state.currentTracking);
  const currentGesture = currentTracking?.hands?.right?.detected 
    ? { type: currentTracking.hands.right.gesture, position: currentTracking.hands.right.position }
    : currentTracking?.hands?.left?.detected
    ? { type: currentTracking.hands.left.gesture, position: currentTracking.hands.left.position }
    : null;
  const [displayedText, setDisplayedText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const animationFrameRef = useRef<number>();

  // Handle streaming text animation
  useEffect(() => {
    if (!latestResponse || !latestResponse.response) {
      setDisplayedText('');
      setWordIndex(0);
      return;
    }

    if (isStreaming || latestResponse.streaming) {
      // For streaming, show text as it arrives (already streamed from backend)
      setDisplayedText(latestResponse.response);
    } else {
      // Non-streaming: show full text immediately
      setDisplayedText(latestResponse.response);
      setWordIndex(0);
    }
  }, [latestResponse?.response, isStreaming, latestResponse?.streaming]);

  // Reset word index when new response starts
  useEffect(() => {
    if (latestResponse) {
      setWordIndex(0);
      setDisplayedText('');
    }
  }, [latestResponse?.timestamp]);

  // Pulsing glow effect during streaming (optimized - slower animation for better FPS)
  useEffect(() => {
    if (glowRef.current && (isStreaming || latestResponse?.streaming)) {
      let time = 0;
      let lastFrame = performance.now();
      const animate = () => {
        const now = performance.now();
        const delta = (now - lastFrame) / 1000; // Convert to seconds
        lastFrame = now;
        
        // Throttle animation updates (30 FPS instead of 60)
        if (delta >= 0.033) {
          time += delta * 2; // Slower animation
          if (glowRef.current) {
            const opacity = 0.1 + Math.sin(time) * 0.1;
            (glowRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
          }
        }
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } else if (glowRef.current) {
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.1;
    }
  }, [isStreaming, latestResponse?.streaming]);

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

      {/* Text content with streaming animation */}
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
        {displayedText || latestResponse.response}
        {(isStreaming || latestResponse.streaming) && displayedText.length < latestResponse.response.length && '▋'}
      </Text>

      {/* Pulsing glow effect during streaming */}
      <mesh ref={glowRef} position={[0, 0, -0.01]}>
        <planeGeometry args={[cardWidth + 0.1, cardHeight + 0.1]} />
        <meshBasicMaterial
          color="#00F5FF"
          transparent
          opacity={isStreaming || latestResponse.streaming ? 0.2 : 0.1}
        />
      </mesh>
    </group>
  );
};

