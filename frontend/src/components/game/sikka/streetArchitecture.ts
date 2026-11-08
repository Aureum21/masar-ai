import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { SharedMaterials } from './proceduralModels';

/** Static details are merged by material: dozens of carved pieces, four draws. */
class MasonryBuilder {
  private pieces = new Map<THREE.Material, THREE.BufferGeometry[]>();

  box(material: THREE.Material, size: number[], position: number[], angle = 0) {
    const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
    geometry.rotateX(angle);
    geometry.translate(position[0], position[1], position[2]);
    const group = this.pieces.get(material) || [];
    group.push(geometry);
    this.pieces.set(material, group);
  }

  build(): THREE.Group {
    const result = new THREE.Group();
    for (const [material, parts] of this.pieces) {
      const geometry = mergeGeometries(parts);
      parts.forEach(part => part.dispose());
      if (!geometry) continue;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      result.add(mesh);
    }
    return result;
  }
}

/** A recessed doorway and upper mashrabiya occupy the empty gap between stalls.
 * Local +X faces the street. Mirror the finished assembly for the right wall.
 * All geometry remains outside the playable lane envelope.
 */
export function createResidentialFacade(materials: SharedMaterials, variant: number): THREE.Group {
  const b = new MasonryBuilder();
  const wood = materials.teakWood;
  const stone = materials.coralStone;
  const accent = variant % 2 ? materials.teakWood : materials.cartWood;
  // Door recess, foot-worn steps, thick plaster jambs and projecting lintel.
  b.box(materials.ironWheel, [0.10, 3.8, 2.5], [0.10, 1.9, 0]);
  b.box(stone, [0.65, 0.18, 3.1], [0.40, 0.09, 0]);
  b.box(stone, [0.40, 0.18, 2.8], [0.30, 0.27, 0]);
  for (const side of [-1, 1]) {
    b.box(stone, [0.45, 4.2, 0.36], [0.25, 2.1, side * 1.42]);
    b.box(wood, [0.16, 3.5, 1.05], [0.22, 2.05, side * 0.56]);
    for (const y of [1.0, 2.0, 3.0]) {
      b.box(materials.brassMetal, [0.20, 0.05, 0.90], [0.25, y, side * 0.56]);
    }
    b.box(materials.brassMetal, [0.24, 0.22, 0.08], [0.30, 1.85, side * 0.16]);
  }
  b.box(stone, [0.65, 0.30, 3.4], [0.3, 4.22, 0]);
  // Recessed upper windows. Their depth stays legible without extra lights.
  for (const z of [-2.25, 2.25]) {
    b.box(materials.ironWheel, [0.1, 2.15, 1.7], [0.12, 6.45, z]);
    for (const edge of [-1, 1]) {
      b.box(wood, [0.42, 2.4, 0.13], [0.33, 6.45, z + edge * 0.92]);
      b.box(wood, [0.45, 0.16, 2.0], [0.33, 6.45 + edge * 1.19, z]);
    }
    for (let i = -3; i <= 3; i++) {
      b.box(wood, [0.16, 2.1, 0.045], [0.48, 6.45, z + i * 0.24]);
      b.box(wood, [0.16, 0.045, 1.65], [0.48, 6.45 + i * 0.29, z]);
    }
    // Open side shutters, offset to reveal the shadowed lattice.
    b.box(accent, [0.16, 2.16, 0.55], [0.52, 6.45, z - 1.25]);
    b.box(wood, [0.85, 0.18, 2.4], [0.44, 5.2, z]);
  }
  // Roof silhouette: uneven capped plaster and exposed chandal beam ends.
  b.box(stone, [0.60, 0.25, 8.9], [0.28, 9.65, 0]);
  for (let z = -4; z <= 4; z += 0.8) {
    b.box(wood, [0.95, 0.13, 0.13], [0.42, 9.23, z]);
  }
  for (const z of [-4, -2, 0, 2, 4]) {
    b.box(stone, [0.52, 0.40 + (variant % 3) * 0.12, 0.58], [0.27, 9.97, z]);
  }
  const result = b.build();
  result.name = 'residential-facade';
  return result;
}

/** A timber entrance frames the first merchant without blocking any lane. */
export function createMarketGateway(materials: SharedMaterials): THREE.Group {
  const b = new MasonryBuilder();
  for (const x of [-6.6, 6.6]) {
    b.box(materials.coralStone, [0.75, 8.8, 0.95], [x, 4.4, 0]);
    b.box(materials.teakWood, [0.28, 8.3, 0.34], [x, 4.15, 0.52]);
    b.box(materials.coralStone, [1.15, 0.42, 1.2], [x, 8.4, 0]);
  }
  b.box(materials.teakWood, [14.5, 0.40, 0.62], [0, 8.65, 0]);
  b.box(materials.teakWood, [14.1, 0.20, 0.4], [0, 9.1, 0]);
  for (let x = -6; x <= 6; x += 0.6) {
    b.box(materials.teakWood, [0.09, 0.5, 0.3], [x, 8.93, 0]);
  }
  const result = b.build();
  result.name = 'textile-lane-gateway';
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#243735';
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = '#bba478';
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, 996, 228);
  ctx.fillStyle = '#ebd9b5';
  ctx.textAlign = 'center';
  ctx.font = '48px serif';
  ctx.fillText('سكة الأقمشة', 512, 102);
  ctx.font = '34px Georgia, serif';
  ctx.fillText('T E X T I L E   L A N E', 512, 175);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.15, 0.12),
    new THREE.MeshStandardMaterial({map: texture, roughness: 0.9}));
  sign.position.set(0, 7.8, 0.1);
  result.add(sign);
  return result;
}
