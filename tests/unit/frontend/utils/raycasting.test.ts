import * as THREE from 'three';
import {
  normalizedToWorldPosition,
  raycastFromGesture,
  getObjectIdFromThreeObject,
} from '../../../../packages/frontend/src/utils/raycasting';

describe('Raycasting Utilities', () => {
  describe('normalizedToWorldPosition', () => {
    it('should convert normalized coordinates to world position', () => {
      const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      camera.position.set(0, 0, 5);
      camera.lookAt(0, 0, 0);

      const position = normalizedToWorldPosition(0.5, 0.5, camera, 5);

      expect(position).toBeInstanceOf(THREE.Vector3);
      expect(position.x).toBeCloseTo(0, 1);
      expect(position.y).toBeCloseTo(0, 1);
    });

    it('should handle edge coordinates (0,0)', () => {
      const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      camera.position.set(0, 0, 5);

      const position = normalizedToWorldPosition(0, 0, camera, 5);

      expect(position).toBeInstanceOf(THREE.Vector3);
    });

    it('should handle edge coordinates (1,1)', () => {
      const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      camera.position.set(0, 0, 5);

      const position = normalizedToWorldPosition(1, 1, camera, 5);

      expect(position).toBeInstanceOf(THREE.Vector3);
    });

    it('should use custom distance parameter', () => {
      const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      camera.position.set(0, 0, 5);

      const pos1 = normalizedToWorldPosition(0.5, 0.5, camera, 5);
      const pos2 = normalizedToWorldPosition(0.5, 0.5, camera, 10);

      const dist1 = camera.position.distanceTo(pos1);
      const dist2 = camera.position.distanceTo(pos2);

      expect(dist2).toBeGreaterThan(dist1);
    });
  });

  describe('raycastFromGesture', () => {
    let camera: THREE.PerspectiveCamera;
    let scene: THREE.Scene;
    let mesh: THREE.Mesh;

    beforeEach(() => {
      camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
      camera.position.set(0, 0, 5);
      camera.lookAt(0, 0, 0);

      scene = new THREE.Scene();
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(0, 0, 0);
      mesh.userData.id = 'test-object';
      mesh.userData.type = 'sceneObject';
      scene.add(mesh);
    });

    it('should detect intersection at center', () => {
      const result = raycastFromGesture(0.5, 0.5, camera, [mesh]);

      expect(result.hit).toBe(true);
      expect(result.object).toBe(mesh);
      expect(result.point).toBeInstanceOf(THREE.Vector3);
      expect(result.distance).toBeLessThan(Infinity);
    });

    it('should return no hit when no objects intersect', () => {
      const emptyMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial()
      );
      emptyMesh.position.set(100, 100, 100); // Far away
      emptyMesh.userData.id = 'far-object';

      const result = raycastFromGesture(0.5, 0.5, camera, [emptyMesh]);

      expect(result.hit).toBe(false);
      expect(result.object).toBeNull();
      expect(result.point).toBeNull();
      expect(result.distance).toBe(Infinity);
    });

    it('should respect maxDistance parameter', () => {
      const farMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial()
      );
      farMesh.position.set(0, 0, 200); // Very far
      farMesh.userData.id = 'far-object';

      const result = raycastFromGesture(0.5, 0.5, camera, [farMesh], 50);

      expect(result.hit).toBe(false); // Beyond maxDistance
    });

    it('should find closest intersection when multiple objects intersect', () => {
      const mesh1 = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial()
      );
      mesh1.position.set(0, 0, -1); // Closer
      mesh1.userData.id = 'close-object';

      const mesh2 = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial()
      );
      mesh2.position.set(0, 0, -3); // Farther
      mesh2.userData.id = 'far-object';

      const result = raycastFromGesture(0.5, 0.5, camera, [mesh1, mesh2]);

      expect(result.hit).toBe(true);
      expect(result.object).toBe(mesh1); // Should return closest
    });

    it('should handle edge coordinates', () => {
      const result1 = raycastFromGesture(0, 0, camera, [mesh]);
      const result2 = raycastFromGesture(1, 1, camera, [mesh]);

      // May or may not hit depending on camera setup
      expect(typeof result1.hit).toBe('boolean');
      expect(typeof result2.hit).toBe('boolean');
    });
  });

  describe('getObjectIdFromThreeObject', () => {
    it('should return id from object userData', () => {
      const object = new THREE.Object3D();
      object.userData.id = 'test-id-123';

      const id = getObjectIdFromThreeObject(object);

      expect(id).toBe('test-id-123');
    });

    it('should traverse up parent chain to find id', () => {
      const parent = new THREE.Group();
      parent.userData.id = 'parent-id';

      const child = new THREE.Mesh();
      child.parent = parent;

      const id = getObjectIdFromThreeObject(child);

      expect(id).toBe('parent-id');
    });

    it('should return null if no id found', () => {
      const object = new THREE.Object3D();

      const id = getObjectIdFromThreeObject(object);

      expect(id).toBeNull();
    });

    it('should return null for object with empty userData', () => {
      const object = new THREE.Object3D();
      object.userData = {};

      const id = getObjectIdFromThreeObject(object);

      expect(id).toBeNull();
    });

    it('should find id in nested hierarchy', () => {
      const grandparent = new THREE.Group();
      grandparent.userData.id = 'grandparent-id';

      const parent = new THREE.Group();
      parent.parent = grandparent;

      const child = new THREE.Mesh();
      child.parent = parent;

      const id = getObjectIdFromThreeObject(child);

      expect(id).toBe('grandparent-id');
    });
  });
});

