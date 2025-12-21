import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Vector3 } from 'three';
import { useGestureStore } from '../store/gestureStore';

const ProjectionScene: React.FC = () => {
  const meshRef = useRef<Mesh>(null);
  const particlesRef = useRef<Mesh>(null);
  const cursorRef = useRef<Mesh>(null);
  const spotlightRef = useRef<any>(null);
  const selectionRingRef = useRef<Mesh>(null);
  
  const currentGesture = useGestureStore((state) => state.currentGesture);
  const [targetPosition, setTargetPosition] = useState(new Vector3(0, 0, 0));

  // Update target position when gesture changes
  useEffect(() => {
    if (currentGesture && currentGesture.position) {
      // Map normalized coordinates (-1 to 1) to 3D space (-5 to 5)
      const x = currentGesture.position.x * 5;
      const y = currentGesture.position.y * 5;
      const z = currentGesture.position.z || 0;
      setTargetPosition(new Vector3(x, y, z));
    }
  }, [currentGesture]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.2;
      meshRef.current.rotation.y += delta * 0.3;
    }
    
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.1;
    }

    // Smoothly interpolate cursor position
    if (cursorRef.current && currentGesture) {
      cursorRef.current.position.lerp(targetPosition, delta * 5);
      
      // Show/hide based on gesture type
      cursorRef.current.visible = currentGesture.type === 'point' || currentGesture.type === 'pinch';
    }

    // Update spotlight for point gesture
    if (spotlightRef.current && currentGesture?.type === 'point') {
      spotlightRef.current.target.position.lerp(targetPosition, delta * 5);
      spotlightRef.current.position.lerp(
        new Vector3(targetPosition.x, targetPosition.y + 2, targetPosition.z + 3),
        delta * 5
      );
    }

    // Update selection ring for pinch gesture
    if (selectionRingRef.current && currentGesture?.type === 'pinch') {
      selectionRingRef.current.position.lerp(targetPosition, delta * 5);
      selectionRingRef.current.visible = true;
    } else if (selectionRingRef.current) {
      selectionRingRef.current.visible = false;
    }
  });

  // Create particle field
  const particleCount = 100;
  const particles = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount * 3; i += 3) {
    particles[i] = (Math.random() - 0.5) * 10;
    particles[i + 1] = (Math.random() - 0.5) * 10;
    particles[i + 2] = (Math.random() - 0.5) * 10;
  }

  return (
    <>
      {/* Main projection surface */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <torusKnotGeometry args={[1, 0.3, 128, 16]} />
        <meshStandardMaterial
          color="#00d4ff"
          emissive="#7b2ff7"
          emissiveIntensity={0.5}
          wireframe={false}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Particle field */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={particles}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          color="#00d4ff"
          transparent
          opacity={0.6}
          sizeAttenuation={true}
        />
      </points>

      {/* 3D Cursor for point/pinch gestures */}
      <mesh ref={cursorRef} position={[0, 0, 0]} visible={false}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color="#00ff00"
          emissive="#00ff00"
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Spotlight for point gesture */}
      {currentGesture?.type === 'point' && (
        <>
          <spotLight
            ref={spotlightRef}
            position={[targetPosition.x, targetPosition.y + 2, targetPosition.z + 3]}
            angle={0.3}
            penumbra={0.5}
            intensity={2}
            color="#ffffff"
          />
          <mesh position={[targetPosition.x, targetPosition.y, targetPosition.z]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
          </mesh>
        </>
      )}

      {/* Selection ring for pinch gesture */}
      <mesh ref={selectionRingRef} position={[0, 0, 0]} visible={false}>
        <ringGeometry args={[0.3, 0.35, 32]} />
        <meshStandardMaterial
          color="#ff00ff"
          emissive="#ff00ff"
          emissiveIntensity={0.8}
          side={2} // DoubleSide
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Grid helper */}
      <gridHelper args={[20, 20, '#333', '#111']} />
    </>
  );
};

export default ProjectionScene;
