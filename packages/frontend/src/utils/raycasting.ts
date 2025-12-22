import * as THREE from 'three';
import { Object3D } from 'three';

/**
 * Converts 2D normalized coordinates (0-1) to 3D world position
 */
export function normalizedToWorldPosition(
  normalizedX: number,
  normalizedY: number,
  camera: THREE.Camera,
  distance: number = 5
): THREE.Vector3 {
  // Convert normalized (0-1) to NDC (-1 to 1)
  const x = (normalizedX - 0.5) * 2;
  const y = -(normalizedY - 0.5) * 2; // Invert Y
  
  // Create vector in NDC space
  const vector = new THREE.Vector3(x, y, 0.5);
  
  // Unproject to world space
  vector.unproject(camera);
  
  // Calculate direction from camera
  const dir = vector.sub(camera.position).normalize();
  
  // Return position at specified distance
  return camera.position.clone().add(dir.multiplyScalar(distance));
}

/**
 * Performs raycasting from gesture position to detect object intersections
 */
export function raycastFromGesture(
  normalizedX: number,
  normalizedY: number,
  camera: THREE.Camera,
  objects: Object3D[],
  maxDistance: number = 100
): {
  hit: boolean;
  object: Object3D | null;
  point: THREE.Vector3 | null;
  distance: number;
} {
  // Convert normalized position to NDC
  const x = (normalizedX - 0.5) * 2;
  const y = -(normalizedY - 0.5) * 2; // Invert Y
  
  // Create raycaster
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(x, y);
  
  // Set raycaster from camera and mouse position
  raycaster.setFromCamera(mouse, camera);
  
  // Perform intersection test
  const intersects = raycaster.intersectObjects(objects, true);
  
  if (intersects.length > 0) {
    const intersection = intersects[0];
    if (intersection.distance <= maxDistance) {
      return {
        hit: true,
        object: intersection.object,
        point: intersection.point,
        distance: intersection.distance,
      };
    }
  }
  
  return {
    hit: false,
    object: null,
    point: null,
    distance: Infinity,
  };
}

/**
 * Gets the scene object ID from a Three.js object
 * Objects should have userData.id set to match SceneObject.id
 */
export function getObjectIdFromThreeObject(object: Object3D): string | null {
  // Traverse up the parent chain to find the object with userData.id
  let current: Object3D | null = object;
  while (current) {
    if (current.userData.id) {
      return current.userData.id;
    }
    current = current.parent;
  }
  return null;
}

