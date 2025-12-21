import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh } from 'three';

const ProjectionScene: React.FC = () => {
  const meshRef = useRef<Mesh>(null);
  const particlesRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.2;
      meshRef.current.rotation.y += delta * 0.3;
    }
    
    if (particlesRef.current) {
      particlesRef.current.rotation.y += delta * 0.1;
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

      {/* Grid helper */}
      <gridHelper args={[20, 20, '#333', '#111']} />
    </>
  );
};

export default ProjectionScene;
