import * as THREE from 'three';
import { ObjectType } from '../store/sceneStore';

/**
 * Object pool for reusing Three.js geometries and materials
 * Reduces GC pressure and improves performance with frequent create/delete
 */
export class ObjectPool {
  private geometryPool: Map<ObjectType, THREE.BufferGeometry[]>;
  private materialPool: Map<string, THREE.Material[]>;
  private activeObjects: Set<string>;
  private maxPoolSize: number;

  constructor(maxPoolSize: number = 10) {
    this.geometryPool = new Map();
    this.materialPool = new Map();
    this.activeObjects = new Set();
    this.maxPoolSize = maxPoolSize;
  }

  /**
   * Acquire a geometry from the pool or create a new one
   */
  acquireGeometry(type: ObjectType, size: number): THREE.BufferGeometry {
    const pool = this.geometryPool.get(type) || [];
    
    if (pool.length > 0) {
      const geometry = pool.pop()!;
      // Update geometry if size changed
      this.updateGeometrySize(geometry, type, size);
      this.activeObjects.add(`${type}-${geometry.id}`);
      return geometry;
    }
    
    // Create new geometry
    const geometry = this.createGeometry(type, size);
    this.activeObjects.add(`${type}-${geometry.id}`);
    return geometry;
  }

  /**
   * Release a geometry back to the pool
   */
  releaseGeometry(geometry: THREE.BufferGeometry, type: ObjectType): void {
    const key = `${type}-${geometry.id}`;
    if (!this.activeObjects.has(key)) return;
    
    this.activeObjects.delete(key);
    const pool = this.geometryPool.get(type) || [];
    
    if (pool.length < this.maxPoolSize) {
      // Reset geometry
      geometry.dispose();
      const newGeometry = this.createGeometry(type, 0.5); // Default size
      pool.push(newGeometry);
      this.geometryPool.set(type, pool);
    } else {
      // Pool is full, dispose geometry
      geometry.dispose();
    }
  }

  /**
   * Acquire a material from the pool or create a new one
   */
  acquireMaterial(color: string): THREE.MeshStandardMaterial {
    const pool = this.materialPool.get(color) || [];
    
    if (pool.length > 0) {
      const material = pool.pop()!;
      this.activeObjects.add(`material-${material.id}`);
      return material;
    }
    
    // Create new material
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.3,
      roughness: 0.4,
    });
    this.activeObjects.add(`material-${material.id}`);
    return material;
  }

  /**
   * Release a material back to the pool
   */
  releaseMaterial(material: THREE.MeshStandardMaterial, color: string): void {
    const key = `material-${material.id}`;
    if (!this.activeObjects.has(key)) return;
    
    this.activeObjects.delete(key);
    const pool = this.materialPool.get(color) || [];
    
    if (pool.length < this.maxPoolSize) {
      // Reset material properties
      material.opacity = 1.0;
      material.transparent = false;
      material.emissive.setHex(0x000000);
      material.emissiveIntensity = 0;
      pool.push(material);
      this.materialPool.set(color, pool);
    } else {
      // Pool is full, dispose material
      material.dispose();
    }
  }

  /**
   * Prewarm the pool with objects
   */
  prewarm(type: ObjectType, count: number, size: number = 0.5): void {
    const pool = this.geometryPool.get(type) || [];
    const needed = Math.min(count, this.maxPoolSize - pool.length);
    
    for (let i = 0; i < needed; i++) {
      const geometry = this.createGeometry(type, size);
      pool.push(geometry);
    }
    
    this.geometryPool.set(type, pool);
  }

  /**
   * Clear all pools
   */
  clear(): void {
    // Dispose all geometries
    this.geometryPool.forEach((geometries) => {
      geometries.forEach((geo) => geo.dispose());
    });
    this.geometryPool.clear();
    
    // Dispose all materials
    this.materialPool.forEach((materials) => {
      materials.forEach((mat) => mat.dispose());
    });
    this.materialPool.clear();
    
    this.activeObjects.clear();
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    geometryCount: number;
    materialCount: number;
    activeCount: number;
  } {
    let geometryCount = 0;
    this.geometryPool.forEach((pool) => {
      geometryCount += pool.length;
    });
    
    let materialCount = 0;
    this.materialPool.forEach((pool) => {
      materialCount += pool.length;
    });
    
    return {
      geometryCount,
      materialCount,
      activeCount: this.activeObjects.size,
    };
  }

  private createGeometry(type: ObjectType, size: number): THREE.BufferGeometry {
    switch (type) {
      case 'box':
        return new THREE.BoxGeometry(size, size, size);
      case 'sphere':
        return new THREE.SphereGeometry(size / 2, 32, 32);
      case 'torus':
        return new THREE.TorusGeometry(size / 2, size / 4, 16, 100);
      case 'cone':
        return new THREE.ConeGeometry(size / 2, size, 32);
      default:
        return new THREE.BoxGeometry(size, size, size);
    }
  }

  private updateGeometrySize(geometry: THREE.BufferGeometry, type: ObjectType, size: number): void {
    // For simplicity, we'll recreate geometry if size changes significantly
    // In a production system, you might want to scale the geometry instead
    // This is a simplified implementation
  }
}

// Global pool instance
let globalPool: ObjectPool | null = null;

/**
 * Get or create the global object pool
 */
export function getObjectPool(): ObjectPool {
  if (!globalPool) {
    globalPool = new ObjectPool(10);
  }
  return globalPool;
}

/**
 * Reset the global object pool
 */
export function resetObjectPool(): void {
  if (globalPool) {
    globalPool.clear();
  }
  globalPool = null;
}

