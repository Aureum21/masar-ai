/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export interface SceneMetrics {
  geometries: number;
  textures: number;
  triangles: number;
  drawCalls: number;
  fps: number;
}

/**
 * Traverses an Object3D subtree and safely disposes geometries and local non-shared materials.
 * Shared materials are preserved so other active shops/chunks can continue using them.
 */
export function disposeHierarchy(
  root: THREE.Object3D,
  isSharedMaterial?: (mat: THREE.Material) => boolean,
): void {
  if (!root) return;

  root.traverse((child) => {
    // 1. Point light cleanup
    if (child instanceof THREE.PointLight) {
      if (child.shadow?.map) {
        child.shadow.map.dispose();
      }
    }

    // 2. Geometry disposal
    if ('geometry' in child && child.geometry instanceof THREE.BufferGeometry) {
      child.geometry.dispose();
    }

    // 3. Material and local texture disposal
    if ('material' in child) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (!mat) continue;

        // Skip if this material is designated as engine-shared
        if (isSharedMaterial && isSharedMaterial(mat)) {
          continue;
        }

        // Dispose local textures (e.g., procedural canvas signboards, dynamic textures)
        const stdMat = mat as THREE.MeshStandardMaterial;
        if (stdMat.map && typeof stdMat.map.dispose === 'function') {
          stdMat.map.dispose();
        }
        if (stdMat.bumpMap && typeof stdMat.bumpMap.dispose === 'function') {
          stdMat.bumpMap.dispose();
        }
        if (stdMat.normalMap && typeof stdMat.normalMap.dispose === 'function') {
          stdMat.normalMap.dispose();
        }
        if (stdMat.roughnessMap && typeof stdMat.roughnessMap.dispose === 'function') {
          stdMat.roughnessMap.dispose();
        }

        mat.dispose();
      }
    }
  });
}
