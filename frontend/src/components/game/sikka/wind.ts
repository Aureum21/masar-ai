/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export type FabricType = 'kandura' | 'tunic' | 'shirt' | 'scarf' | 'bisht' | 'awning' | 'flag';

export interface WindClothActor {
  /** The pivot group that sways on the hanger / attachment line */
  pivot: THREE.Object3D;
  /** Primary fabric type dictating stiffness and aerodynamic response */
  type: FabricType;
  /** Rest rotation (immutable baseline to prevent drift) */
  restRotationX: number;
  restRotationZ: number;
  /** World Z coordinate for coherent gust wave travel */
  worldZ: number;
  /** Individual phase offset so neighboring clothes don't move in lockstep */
  phaseOffset: number;
  /** Sleeves / lower hem child mesh if present for secondary flutter */
  sleeveLeft?: THREE.Object3D;
  sleeveRight?: THREE.Object3D;
  restSleeveLeftZ?: number;
  restSleeveRightZ?: number;
  /** Optional segmented flag mesh for realistic traveling cloth waves */
  flagMesh?: THREE.Mesh;
  restFlagPositions?: Float32Array;
}

/**
 * Shared Wind Controller for Al Fahidi Sikka.
 * Drives coherent desert breezes that travel smoothly down the street.
 */
export class WindController {
  private time: number = 0;
  private baseDirection = new THREE.Vector2(0.4, 0.9); // Creek breeze traveling into sikkas

  constructor() {
    this.baseDirection.normalize();
  }

  public update(delta: number): void {
    this.time += delta;
  }

  public getTime(): number {
    return this.time;
  }

  /**
   * Computes wind vector and gust intensity at a specific world coordinate.
   * Spatial variation ensures gusts visibly travel down the street from shop to shop.
   */
  public getWindAt(worldZ: number): { forceX: number; forceZ: number; gust: number } {
    const t = this.time;
    // Spatial wave travel: 12 meters per second gust propagation speed
    const wave = (t * 2.2) - (worldZ * 0.08);

    // Multi-frequency organic breeze
    const baseBreeze = Math.sin(wave * 0.7) * 0.4 + Math.sin(wave * 1.5 + 1.2) * 0.35;
    // Periodic stronger desert gust (every ~5 seconds)
    const gustPeak = Math.max(0, Math.sin(t * 0.45 - worldZ * 0.03)) ** 2 * 0.65;

    const totalGust = Math.max(0.1, 0.35 + baseBreeze + gustPeak);

    return {
      forceX: this.baseDirection.x * totalGust,
      forceZ: this.baseDirection.y * totalGust,
      gust: totalGust,
    };
  }

  /**
   * Animates a single cloth actor based on its fabric properties and local wind.
   */
  public applyToActor(actor: WindClothActor, delta: number): void {
    const wind = this.getWindAt(actor.worldZ);
    const t = this.time + actor.phaseOffset;

    // Physical characteristics by fabric type
    let freq = 2.0;
    let amplitude = 0.08;
    let sleeveFlutter = 0.06;

    switch (actor.type) {
      case 'scarf':
        // Lightweight draped silk/wool: fast flutter, high sensitivity
        freq = 3.6;
        amplitude = 0.16;
        sleeveFlutter = 0.14;
        break;
      case 'shirt':
        // Lightweight cotton: crisp response
        freq = 2.8;
        amplitude = 0.11;
        sleeveFlutter = 0.09;
        break;
      case 'tunic':
        // Medium linen/indigo: balanced sway
        freq = 2.3;
        amplitude = 0.09;
        sleeveFlutter = 0.07;
        break;
      case 'kandura':
        // Long flowing robe: graceful pendulum period, larger hem sway
        freq = 1.7;
        amplitude = 0.12;
        sleeveFlutter = 0.08;
        break;
      case 'bisht':
        // Heavy ceremonial wool & gold zari: majestic, slow momentum
        freq = 1.25;
        amplitude = 0.065;
        sleeveFlutter = 0.04;
        break;
      case 'awning':
        // Stretched canvas: subtle breathing edge flutter
        freq = 4.2;
        amplitude = 0.035;
        sleeveFlutter = 0;
        break;
      case 'flag':
        // Lightweight woven flag: responsive ripple & flutter
        freq = 3.6;
        amplitude = 0.08;
        sleeveFlutter = 0;
        break;
    }

    // Pendulum sway angle with harmonic flutter
    const swayAngle = Math.sin(t * freq) * amplitude * wind.gust
      + Math.sin(t * freq * 2.3) * (amplitude * 0.35) * wind.gust;

    // Secondary perpendicular flutter
    const crossFlutter = Math.cos(t * freq * 1.6 + 0.8) * (amplitude * 0.4) * wind.gust;

    // Apply bounded rotation around rest pose (never accumulates drift)
    actor.pivot.rotation.x = actor.restRotationX + swayAngle;
    actor.pivot.rotation.z = actor.restRotationZ + crossFlutter;

    // Flutter sleeves independently if rigged
    if (actor.sleeveLeft && actor.restSleeveLeftZ !== undefined) {
      const leftFlutter = Math.sin(t * (freq * 1.4) + 0.5) * sleeveFlutter * wind.gust;
      actor.sleeveLeft.rotation.z = actor.restSleeveLeftZ + leftFlutter;
    }

    if (actor.sleeveRight && actor.restSleeveRightZ !== undefined) {
      const rightFlutter = Math.sin(t * (freq * 1.4) + 1.2) * sleeveFlutter * wind.gust;
      actor.sleeveRight.rotation.z = actor.restSleeveRightZ - rightFlutter;
    }

    // Traveling harmonic ripple wave for segmented flag cloth
    if (actor.type === 'flag' && actor.flagMesh && actor.restFlagPositions) {
      const geo = actor.flagMesh.geometry;
      const posAttr = geo.attributes.position;
      const pos = posAttr.array as Float32Array;
      const rest = actor.restFlagPositions;
      const count = posAttr.count;

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const x = rest[idx]; // 0.0 at hoist to 2.0 at fly
        const u = Math.max(0, Math.min(x / 2.0, 1.0));
        const uSq = u * u; // 0 displacement at hoist, increasing towards fly

        // Primary traveling wave and high-frequency flutter
        const wave1 = Math.sin(t * 5.8 - x * 4.6) * 0.18 * uSq * wind.gust;
        const wave2 = Math.cos(t * 9.2 - x * 7.4) * 0.07 * uSq * wind.gust;
        const lift = Math.sin(t * 3.4 - x * 2.8) * 0.05 * u * wind.gust;

        pos[idx] = rest[idx];
        pos[idx + 1] = rest[idx + 1] + lift;
        pos[idx + 2] = rest[idx + 2] + wave1 + wave2;
      }
      posAttr.needsUpdate = true;
      geo.computeVertexNormals();
    }
  }
}

export const globalWind = new WindController();
