import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CustomOutlineProps {
  thickness?: number;
  color?: string;
  opacity?: number;
  children: React.ReactElement;
}

/**
 * Custom outline component that wraps a mesh and creates an outline effect
 * using a slightly larger wireframe version of the geometry
 */
export const CustomOutline: React.FC<CustomOutlineProps> = ({
  thickness = 0.05,
  color = '#00F5FF',
  opacity = 0.8,
  children,
}) => {
  const outlineRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (outlineRef.current && children.props.children) {
      // Sync the outline mesh with the original mesh
      const originalMesh = children.ref?.current || children.props.children;
      if (originalMesh && originalMesh instanceof THREE.Mesh) {
        outlineRef.current.position.copy(originalMesh.position);
        outlineRef.current.rotation.copy(originalMesh.rotation);
        outlineRef.current.scale.copy(originalMesh.scale).multiplyScalar(1 + thickness);
      }
    }
  });

  // Clone the children and create an outline version
  const clonedChildren = React.cloneElement(children, {
    ref: (node: THREE.Mesh) => {
      if (node) {
        // Create outline mesh
        if (node.geometry) {
          const outlineGeometry = node.geometry.clone();
          const outlineMaterial = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.BackSide,
            transparent: true,
            opacity: opacity,
          });
          
          if (outlineRef.current) {
            outlineRef.current.geometry = outlineGeometry;
            outlineRef.current.material = outlineMaterial;
            outlineRef.current.scale.multiplyScalar(1 + thickness);
          }
        }
      }
    },
  });

  return (
    <group ref={groupRef}>
      {clonedChildren}
      {children.props.children && (
        <mesh ref={outlineRef}>
          {React.cloneElement(children.props.children as React.ReactElement, {
            // Clone geometry for outline
          })}
          <meshBasicMaterial
            color={color}
            side={THREE.BackSide}
            transparent={true}
            opacity={opacity}
          />
        </mesh>
      )}
    </group>
  );
};

/**
 * Simpler outline effect using Edges from drei
 * This is a fallback that works with the current drei version
 */
export const SimpleOutline: React.FC<{
  thickness?: number;
  color?: string;
  opacity?: number;
}> = ({ thickness = 0.05, color = '#00F5FF', opacity = 0.8 }) => {
  return (
    <mesh>
      <edgesGeometry />
      <lineBasicMaterial color={color} transparent opacity={opacity} linewidth={thickness * 100} />
    </mesh>
  );
};

