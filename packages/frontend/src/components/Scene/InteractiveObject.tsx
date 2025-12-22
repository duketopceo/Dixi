import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneObject } from '../../store/sceneStore';
import { useSceneStore } from '../../store/sceneStore';
import { useGestureStore } from '../../store/gestureStore';

interface InteractiveObjectProps {
  object: SceneObject;
}

export const InteractiveObject: React.FC<InteractiveObjectProps> = ({ object }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const selectedObjectId = useSceneStore((state) => state.selectedObjectId);
  const isSelected = useSceneStore((state) => state.isSelected(object.id));
  const isPrimarySelected = selectedObjectId === object.id;
  const currentGesture = useGestureStore((state) => state.currentGesture);
  const [isHovered, setIsHovered] = useState(false);
  const { camera } = useThree();

  const HOVER_DISTANCE = 1.5; // Distance threshold for hover
  const HOVER_SCALE = 1.05; // Scale multiplier on hover

  // LOD levels based on distance from camera
  const LOD_DISTANCES = {
    near: 5,
    medium: 10,
    far: 20,
  };
  const [lodLevel, setLodLevel] = useState<'near' | 'medium' | 'far'>('near');

  // Frustum culling check
  const [isInFrustum, setIsInFrustum] = useState(true);
  
  // Update object transform from store, check hover, and frustum culling
  useFrame(() => {
    if (!groupRef.current) return;
    
    // Frustum culling check
    const frustum = new THREE.Frustum();
    const matrix = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(matrix);
    
    const objectPos = new THREE.Vector3(...object.position);
    const inFrustum = frustum.containsPoint(objectPos);
    
    if (inFrustum !== isInFrustum) {
      setIsInFrustum(inFrustum);
      groupRef.current.visible = inFrustum;
    }
    
    if (!inFrustum) return; // Skip updates if not visible
    
    // Calculate LOD based on distance from camera
    const distance = camera.position.distanceTo(objectPos);
    let newLodLevel: 'near' | 'medium' | 'far' = 'near';
    if (distance > LOD_DISTANCES.far) {
      newLodLevel = 'far';
    } else if (distance > LOD_DISTANCES.medium) {
      newLodLevel = 'medium';
    }
    
    if (newLodLevel !== lodLevel) {
      setLodLevel(newLodLevel);
    }
    
    // Update position
    groupRef.current.position.set(...object.position);
    
    // Update rotation
    groupRef.current.rotation.set(...object.rotation);
    
    // Calculate base scale
    const baseScale = object.scale[0];
    
    // Check hover distance
    if (currentGesture && !isSelected) {
      // Convert gesture position to 3D
      const gestureX = (currentGesture.position.x - 0.5) * 10;
      const gestureY = -(currentGesture.position.y - 0.5) * 10;
      const gesturePos = new THREE.Vector3(gestureX, gestureY, 0);
      
      // Calculate distance to object
      const distance = objectPos.distanceTo(gesturePos);
      
      const wasHovered = isHovered;
      const nowHovered = distance < HOVER_DISTANCE;
      
      if (nowHovered !== wasHovered) {
        setIsHovered(nowHovered);
      }
      
      // Apply hover scale
      const scaleMultiplier = nowHovered ? HOVER_SCALE : 1.0;
      groupRef.current.scale.set(
        baseScale * scaleMultiplier,
        baseScale * scaleMultiplier,
        baseScale * scaleMultiplier
      );
    } else {
      if (isHovered) {
        setIsHovered(false);
      }
      // Update scale normally
      groupRef.current.scale.set(...object.scale);
    }
  });

  // Render geometry based on object type and LOD
  const renderGeometry = () => {
    const size = object.scale[0];
    
    // Geometry complexity based on LOD
    const sphereSegments = lodLevel === 'near' ? 32 : lodLevel === 'medium' ? 16 : 8;
    const torusSegments = lodLevel === 'near' ? 100 : lodLevel === 'medium' ? 50 : 25;
    const coneSegments = lodLevel === 'near' ? 32 : lodLevel === 'medium' ? 16 : 8;
    const cylinderSegments = lodLevel === 'near' ? 32 : lodLevel === 'medium' ? 16 : 8;
    const ringSegments = lodLevel === 'near' ? 64 : lodLevel === 'medium' ? 32 : 16;
    
    switch (object.type) {
      case 'box':
        return <boxGeometry args={[size, size, size]} />;
      case 'sphere':
        return <sphereGeometry args={[size / 2, sphereSegments, sphereSegments]} />;
      case 'torus':
        return <torusGeometry args={[size / 2, size / 4, 16, torusSegments]} />;
      case 'cone':
        return <coneGeometry args={[size / 2, size, coneSegments]} />;
      case 'cylinder':
        return <cylinderGeometry args={[size / 2, size / 2, size, cylinderSegments]} />;
      case 'octahedron':
        return <octahedronGeometry args={[size / 2, 0]} />;
      case 'tetrahedron':
        return <tetrahedronGeometry args={[size / 2, 0]} />;
      case 'plane':
        return <planeGeometry args={[size, size]} />;
      case 'ring':
        return <ringGeometry args={[size / 4, size / 2, ringSegments]} />;
      default:
        return <boxGeometry args={[size, size, size]} />;
    }
  };

  // Set userData for raycasting and ensure mesh is raycastable
  React.useEffect(() => {
    if (groupRef.current) {
      groupRef.current.userData.id = object.id;
      groupRef.current.userData.type = 'sceneObject';
      // Make sure mesh is raycastable
      if (meshRef.current) {
        meshRef.current.userData.id = object.id;
        meshRef.current.userData.type = 'sceneObject';
      }
    }
  }, [object.id]);

  // Create outline effect using scaled mesh with back-face material
  const outlineScale = isSelected ? (isPrimarySelected ? 1.05 : 1.03) : isHovered ? 1.02 : 1.0;
  const outlineColor = isSelected ? (isPrimarySelected ? "#00F5FF" : "#00FF87") : "#00F5FF";
  const outlineOpacity = isSelected ? (isPrimarySelected ? 0.8 : 0.5) : 0.4;

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        {renderGeometry()}
        <meshStandardMaterial
          ref={materialRef}
          color={object.color}
          metalness={0.3}
          roughness={0.4}
          transparent={isSelected || isHovered}
          opacity={isSelected ? 0.9 : isHovered ? 0.95 : 1.0}
          emissive={isHovered ? new THREE.Color(object.color).multiplyScalar(0.3) : (isSelected ? new THREE.Color(object.color).multiplyScalar(0.2) : new THREE.Color(0x000000))}
          emissiveIntensity={isHovered ? 0.5 : (isSelected ? 0.3 : 0)}
        />
      </mesh>
      
      {/* Selection/Hover outline using scaled mesh with back-face material */}
      {(isSelected || isHovered) && (
        <mesh scale={outlineScale}>
          {renderGeometry()}
          <meshBasicMaterial
            color={outlineColor}
            side={THREE.BackSide}
            transparent
            opacity={outlineOpacity}
          />
        </mesh>
      )}
    </group>
  );
};

