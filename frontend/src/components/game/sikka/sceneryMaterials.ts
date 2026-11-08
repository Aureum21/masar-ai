import * as THREE from 'three';

/** Vertex-lit market scenery; keep expensive PBR reflections on the player only. */
export class SceneryMaterials {
  private cache = new Map<THREE.Material, THREE.Material>();

  convert(source: THREE.Material): THREE.Material {
    if (!(source instanceof THREE.MeshStandardMaterial)) return source;
    const cached = this.cache.get(source);
    if (cached) return cached;
    const parameters = {
      name: `${source.name || 'scenery'}-vertex-lit`,
      color: source.color, map: source.map,
      emissive: source.emissive, emissiveMap: source.emissiveMap,
      emissiveIntensity: source.emissiveIntensity,
      side: source.side, transparent: source.transparent, opacity: source.opacity,
      alphaMap: source.alphaMap, alphaTest: source.alphaTest,
      depthWrite: source.depthWrite, depthTest: source.depthTest,
      polygonOffset: source.polygonOffset, polygonOffsetFactor: source.polygonOffsetFactor,
      polygonOffsetUnits: source.polygonOffsetUnits, vertexColors: source.vertexColors,
      fog: source.fog, toneMapped: source.toneMapped,
    };
    const material = source.metalness >= 0.5
      ? new THREE.MeshPhongMaterial({...parameters, specular: source.color, shininess: 45})
      : new THREE.MeshLambertMaterial(parameters);
    this.cache.set(source, material);
    return material;
  }

  apply(root: THREE.Object3D): void {
    root.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      node.material = Array.isArray(node.material) ? node.material.map(m => this.convert(m)) : this.convert(node.material);
    });
  }

  syncTextures(): void {
    // TextureLoader can replace a source map after the lightweight variant was created.
    for (const [source, variant] of this.cache) {
      const original = source as THREE.MeshStandardMaterial;
      const material = variant as THREE.MeshLambertMaterial;
      if (material.map !== original.map) {
        material.map = original.map;
        material.needsUpdate = true;
      }
    }
  }

  dispose(): void {
    // Textures belong to the source materials, not these lightweight variants.
    for (const material of this.cache.values()) material.dispose();
    this.cache.clear();
  }
}
