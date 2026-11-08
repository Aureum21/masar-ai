import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Small ambient flock; entirely visual, never an obstacle or a reward target. */
export class MarketBirds {
  readonly group = new THREE.Group();
  private birds: { root: THREE.Group; left: THREE.Mesh; right: THREE.Mesh }[] = [];
  private flightTime = -1;
  private material = new THREE.MeshStandardMaterial({ color: 0x6a7278, roughness: 0.93 });
  private body: THREE.BufferGeometry;
  private wing: THREE.BufferGeometry;

  constructor() {
    const torso = new THREE.SphereGeometry(1, 8, 6);
    torso.scale(0.16, 0.19, 0.29);
    torso.translate(0, 0.20, 0);
    const head = new THREE.SphereGeometry(0.11, 8, 6);
    head.translate(0, 0.43, -0.18);
    const beak = new THREE.ConeGeometry(0.035, 0.13, 5);
    beak.rotateX(-Math.PI / 2);
    beak.translate(0, 0.43, -0.30);
    this.body = mergeGeometries([torso, head, beak])!;
    [torso, head, beak].forEach(part => part.dispose());
    this.wing = new THREE.BufferGeometry();
    this.wing.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, -0.12, 0.48, 0, 0.10, 0.17, 0, 0.29,
      0, 0, -0.12, 0.17, 0, 0.29, 0.48, 0, 0.10,
    ], 3));
    this.wing.computeVertexNormals();
    for (let i = 0; i < 4; i++) {
      const root = new THREE.Group();
      const body = new THREE.Mesh(this.body, this.material);
      body.castShadow = true;
      const left = new THREE.Mesh(this.wing, this.material);
      const right = new THREE.Mesh(this.wing, this.material);
      left.position.y = right.position.y = 0.26;
      right.scale.x = -1;
      root.add(body, left, right);
      this.group.add(root);
      this.birds.push({ root, left, right });
    }
    this.reset();
  }

  reset() {
    this.flightTime = -1;
    this.group.visible = true;
    this.animate(0, 0, false);
  }

  animate(delta: number, time: number, approaching: boolean) {
    if (approaching && this.flightTime < 0) this.flightTime = 0;
    if (this.flightTime >= 0) this.flightTime += delta;
    this.group.visible = this.flightTime < 5;
    if (!this.group.visible) return;
    this.birds.forEach(({ root, left, right }, i) => {
      const flight = Math.max(0, this.flightTime - i * 0.12);
      const airborne = flight > 0;
      root.position.set(-0.8 + i * 0.62 + flight * (0.5 + i * 0.4),
        airborne ? flight * 2.8 : Math.sin(time * 2 + i) * 0.015,
        (i % 2) * 0.7 - flight * 5);
      root.rotation.y = airborne ? -0.2 - i * 0.12 : i * 1.7 + Math.sin(time + i) * 0.15;
      root.rotation.x = airborne ? -0.12 : Math.max(0, Math.sin(time * 2.4 + i * 2)) * 0.20;
      const flap = airborne ? Math.sin(flight * 22 + i) * 0.95 : -1.3;
      left.rotation.z = flap;
      right.rotation.z = -flap;
    });
  }

  dispose() {
    this.body.dispose();
    this.wing.dispose();
    this.material.dispose();
    this.group.clear();
  }
}
