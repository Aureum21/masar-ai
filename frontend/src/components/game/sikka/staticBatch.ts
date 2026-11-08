import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Bake rigid scenery into a draw per material, retaining independently animated roots.
 * Call once at construction, before uploading the original geometry to the GPU.
 */
export function batchStaticMeshes(root: THREE.Object3D, animatedRoots: THREE.Object3D[] = []): void {
  const excluded = new Set(animatedRoots);
  const batches = new Map<string, THREE.Mesh[]>();
  root.updateWorldMatrix(true, true);
  const inverseRoot = root.matrixWorld.clone().invert();
  function visit(node: THREE.Object3D) {
    if (excluded.has(node) || !node.visible) return;
    if (node !== root && node.children.length === 0 && node instanceof THREE.Mesh &&
        !(node instanceof THREE.SkinnedMesh) && !(node instanceof THREE.InstancedMesh) &&
        !Array.isArray(node.material) && !node.material.transparent &&
        Object.keys(node.geometry.morphAttributes).length === 0) {
      const geometry: THREE.BufferGeometry = node.geometry;
      const format = Object.entries(geometry.attributes).sort(([a], [b]) => a.localeCompare(b))
        .map(([name, a]) => `${name}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`).join(',');
      const key = `${node.material.uuid}/${node.castShadow}/${node.receiveShadow}/${node.renderOrder}/${!!node.geometry.index}/${format}`;
      const meshes = batches.get(key) || [];
      meshes.push(node);
      batches.set(key, meshes);
    }
    node.children.forEach(visit);
  }
  visit(root);
  for (const meshes of batches.values()) {
    if (meshes.length < 2) continue;
    const parts = meshes.map(mesh => {
      const transform = new THREE.Matrix4().multiplyMatrices(inverseRoot, mesh.matrixWorld);
      const geometry = mesh.geometry.clone().applyMatrix4(transform);
      // Baking a mirrored transform must also preserve the front face winding.
      if (transform.determinant() < 0) {
        if (geometry.index) {
          const indices = geometry.index;
          for (let i = 0; i < indices.count; i += 3) {
            const a = indices.getX(i);
            indices.setX(i, indices.getX(i + 2));
            indices.setX(i + 2, a);
          }
        } else {
          for (const attribute of Object.values(geometry.attributes)) {
            const array = attribute.array;
            for (let i = 0; i < attribute.count; i += 3) {
              for (let j = 0; j < attribute.itemSize; j++) {
                const a = i * attribute.itemSize + j;
                const b = (i + 2) * attribute.itemSize + j;
                const value = array[a]; array[a] = array[b]; array[b] = value;
              }
            }
          }
        }
      }
      return geometry;
    });
    const geometry = mergeGeometries(parts, false);
    parts.forEach(part => part.dispose());
    if (!geometry) continue;
    geometry.computeBoundingSphere();
    const first = meshes[0];
    const batch = new THREE.Mesh(geometry, first.material);
    batch.name = 'static-scenery-batch';
    batch.castShadow = first.castShadow;
    batch.receiveShadow = first.receiveShadow;
    batch.renderOrder = first.renderOrder;
    meshes.forEach(mesh => mesh.removeFromParent());
    root.add(batch);
  }
  // Rigid descendants never change locally. Moving the shop/chunk root still
  // propagates world transforms, and excluded cloth/joint roots remain animated.
  function freezeLocalTransforms(node: THREE.Object3D) {
    if (excluded.has(node)) return;
    if (node !== root) {
      node.updateMatrix();
      node.matrixAutoUpdate = false;
    }
    node.children.forEach(freezeLocalTransforms);
  }
  freezeLocalTransforms(root);
}
