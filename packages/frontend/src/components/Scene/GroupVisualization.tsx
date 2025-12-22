import React from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore, ObjectGroup } from '../../store/sceneStore';

interface GroupVisualizationProps {
  group: ObjectGroup;
}

export const GroupVisualization: React.FC<GroupVisualizationProps> = ({ group }) => {
  const { scene } = useThree();
  const objects = useSceneStore((state) => state.objects);
  const selectedGroupId = useSceneStore((state) => state.selectedGroupId);
  const isSelected = selectedGroupId === group.id;

  // Get objects in this group
  const groupObjects = objects.filter((obj) => group.objectIds.includes(obj.id));

  if (groupObjects.length === 0) return null;

  // Calculate bounding box
  const box = new THREE.Box3();
  groupObjects.forEach((obj) => {
    const pos = new THREE.Vector3(...obj.position);
    const size = obj.scale[0];
    box.expandByPoint(new THREE.Vector3(pos.x - size, pos.y - size, pos.z - size));
    box.expandByPoint(new THREE.Vector3(pos.x + size, pos.y + size, pos.z + size));
  });

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  return (
    <group>
      {/* Bounding box wireframe */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(size.x, size.y, size.z)]} />
        <lineBasicMaterial
          color={isSelected ? '#00F5FF' : '#00FF87'}
          transparent
          opacity={isSelected ? 0.8 : 0.4}
        />
      </lineSegments>

      {/* Connection lines between objects */}
      {groupObjects.length > 1 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={groupObjects.length * 3}
              array={new Float32Array(
                groupObjects.flatMap((obj) => obj.position)
              )}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={isSelected ? '#00F5FF' : '#00FF87'}
            transparent
            opacity={isSelected ? 0.5 : 0.2}
            linewidth={2}
          />
        </lineSegments>
      )}
    </group>
  );
};

