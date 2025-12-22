import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

interface ParticleEffectProps {
  position: [number, number, number];
  color?: string;
  count?: number;
  duration?: number; // milliseconds
  onComplete?: () => void;
}

export const ParticleEffect: React.FC<ParticleEffectProps> = ({
  position,
  color = '#00F5FF',
  count = 50,
  duration = 1000,
  onComplete,
}) => {
  const [visible, setVisible] = useState(true);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!visible) return null;

  return (
    <Sparkles
      position={position}
      count={count}
      speed={0.4}
      opacity={1}
      scale={2}
      size={2}
      color={color}
    />
  );
};

interface ParticleBurstProps {
  position: [number, number, number];
  color?: string;
  onComplete?: () => void;
}

/**
 * Short-lived particle burst effect
 */
export const ParticleBurst: React.FC<ParticleBurstProps> = ({
  position,
  color = '#00F5FF',
  onComplete,
}) => {
  return (
    <ParticleEffect
      position={position}
      color={color}
      count={30}
      duration={800}
      onComplete={onComplete}
    />
  );
};

interface ParticleRingProps {
  position: [number, number, number];
  radius?: number;
  color?: string;
  onComplete?: () => void;
}

/**
 * Particle ring effect for object selection
 */
export const ParticleRing: React.FC<ParticleRingProps> = ({
  position,
  radius = 1,
  color = '#00F5FF',
  onComplete,
}) => {
  const [particles, setParticles] = useState<Array<{ pos: [number, number, number]; id: number }>>([]);

  useEffect(() => {
    // Create particles in a ring pattern
    const count = 20;
    const newParticles = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const x = position[0] + Math.cos(angle) * radius;
      const y = position[1] + Math.sin(angle) * radius;
      return {
        pos: [x, y, position[2]] as [number, number, number],
        id: i,
      };
    });
    setParticles(newParticles);

    const timer = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, 1500);

    return () => clearTimeout(timer);
  }, [position, radius, onComplete]);

  return (
    <>
      {particles.map((particle) => (
        <ParticleEffect
          key={particle.id}
          position={particle.pos}
          color={color}
          count={3}
          duration={500}
        />
      ))}
    </>
  );
};

