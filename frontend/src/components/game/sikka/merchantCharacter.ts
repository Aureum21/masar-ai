/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { SharedMaterials } from './proceduralModels';

export interface MerchantRig {
  root: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  tarboosh: THREE.Mesh;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  rightHand: THREE.Group;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  leftHand: THREE.Group;
  worldZ: number;
  initialPos: THREE.Vector3;
}

/**
 * Creates an anatomically proportioned, culturally authentic 3D Emirati textile merchant.
 * Complies with Step 6 requirements:
 * - Proper adult male human scale (~1.78m)
 * - Authentic Emirati attire: Collarless Kandura with Farkha/Tarboosh tassel,
 *   crisp white Ghutra draped over shoulders, and double-ring black Agal.
 * - Rigged joint hierarchy (torso, head, shoulders, elbows, hands) prepared for
 *   subsequent merchant routines (folding fabric, waving greeting, idling).
 * - High-efficiency procedural geometry (~1,650 triangles).
 */
export function createEmiratiMerchant(
  materials: SharedMaterials,
  worldZ = 0,
  isLeft = true,
): MerchantRig {
  const root = new THREE.Group();

  // ── 1. Specialized Merchant Materials ──
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xb58058, // Warm Arabian desert skin tone
    roughness: 0.65,
    metalness: 0.05,
  });

  const kanduraMat = new THREE.MeshStandardMaterial({
    color: 0xfaf8f2, // Crisp unbleached woven white linen
    roughness: 0.86,
    metalness: 0.02,
  });

  const ghutraMat = new THREE.MeshStandardMaterial({
    color: 0xfcfaf6, // Woven white cotton ghutra headscarf
    roughness: 0.85,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  const agalMat = new THREE.MeshStandardMaterial({
    color: 0x141416, // Double braided black agal cord
    roughness: 0.45,
    metalness: 0.1,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x181513, // Dark groomed beard/hair
    roughness: 0.9,
    metalness: 0.0,
  });

  const sandalMat = new THREE.MeshStandardMaterial({
    color: 0x4e2e1b, // Traditional oiled leather na'al sandals
    roughness: 0.72,
    metalness: 0.04,
  });

  // ── 2. Feet & Traditional Leather Sandals (Na'al) ──
  for (const dir of [-1, 1]) {
    const footGroup = new THREE.Group();
    footGroup.position.set(dir * 0.13, 0, 0);

    // Leather sandal sole
    const soleGeo = new THREE.BoxGeometry(0.12, 0.035, 0.28);
    const sole = new THREE.Mesh(soleGeo, sandalMat);
    sole.position.set(0, 0.018, 0.02);
    footGroup.add(sole);

    // Cross straps and toe loop
    const strapGeo = new THREE.BoxGeometry(0.13, 0.02, 0.1);
    const strap = new THREE.Mesh(strapGeo, sandalMat);
    strap.position.set(0, 0.05, 0);
    footGroup.add(strap);

    // Bare foot inside sandal
    const footGeo = new THREE.BoxGeometry(0.1, 0.055, 0.24);
    const foot = new THREE.Mesh(footGeo, skinMat);
    foot.position.set(0, 0.045, 0.02);
    footGroup.add(foot);

    root.add(footGroup);
  }

  // ── 3. Lower Kandura Robe (Skirt from Waist to Ankles) ──
  // A-line flowing silhouette: narrower at waist (0.34m), widening to hem (0.54m)
  const robeGeo = new THREE.CylinderGeometry(0.24, 0.32, 0.92, 12, 1, false);
  robeGeo.scale(1.0, 1.0, 0.65); // Oval anatomical cross-section
  const robe = new THREE.Mesh(robeGeo, kanduraMat);
  robe.position.set(0, 0.52, 0);
  robe.castShadow = true;
  robe.receiveShadow = true;
  root.add(robe);

  // ── 4. Torso Group (Breathing, Posture, and Spine Pivot) ──
  const torso = new THREE.Group();
  torso.position.set(0, 0.98, 0);
  root.add(torso);

  // Upper Kandura Body (Waist to Shoulders)
  const chestGeo = new THREE.CylinderGeometry(0.26, 0.24, 0.56, 12, 1, false);
  chestGeo.scale(1.0, 1.0, 0.62);
  const chest = new THREE.Mesh(chestGeo, kanduraMat);
  chest.position.set(0, 0.28, 0);
  chest.castShadow = true;
  chest.receiveShadow = true;
  torso.add(chest);

  // Distinctive Collarless Emirati Round Neckline & Placket
  const placketGeo = new THREE.BoxGeometry(0.045, 0.38, 0.02);
  const placket = new THREE.Mesh(placketGeo, kanduraMat);
  placket.position.set(0, 0.36, 0.17);
  torso.add(placket);

  // Tiny hand-stitched fabric buttons along placket
  for (let b = 0; b < 4; b++) {
    const btnGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.006, 6);
    const btn = new THREE.Mesh(btnGeo, kanduraMat);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(0, 0.48 - b * 0.06, 0.185);
    torso.add(btn);
  }

  // Signature Emirati Farkha / Tarboosh (Long braided neck tassel)
  const tarbooshGeo = new THREE.CylinderGeometry(0.006, 0.012, 0.26, 6);
  const tarboosh = new THREE.Mesh(tarbooshGeo, kanduraMat);
  tarboosh.position.set(0.03, 0.38, 0.18);
  tarboosh.rotation.z = -0.12;
  torso.add(tarboosh);

  // ── 5. Head Group (Ghutra, Agal, Beard, Face) ──
  const head = new THREE.Group();
  head.position.set(0, 0.58, 0);
  torso.add(head);

  // Neck
  const neckGeo = new THREE.CylinderGeometry(0.075, 0.085, 0.12, 8);
  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.set(0, 0.04, 0);
  head.add(neck);

  // Face & Cranium
  const faceGeo = new THREE.CylinderGeometry(0.1, 0.085, 0.2, 10);
  faceGeo.scale(1.0, 1.0, 0.95);
  const face = new THREE.Mesh(faceGeo, skinMat);
  face.position.set(0, 0.16, 0.02);
  head.add(face);

  // Neatly Groomed Traditional Black Beard & Mustache
  const beardGeo = new THREE.CylinderGeometry(0.09, 0.06, 0.11, 8);
  beardGeo.scale(1.05, 1.0, 0.9);
  const beard = new THREE.Mesh(beardGeo, hairMat);
  beard.position.set(0, 0.1, 0.04);
  head.add(beard);

  const mustacheGeo = new THREE.BoxGeometry(0.1, 0.025, 0.03);
  const mustache = new THREE.Mesh(mustacheGeo, hairMat);
  mustache.position.set(0, 0.155, 0.11);
  head.add(mustache);

  // Nose & Brow Ridge
  const noseGeo = new THREE.ConeGeometry(0.025, 0.065, 5);
  const nose = new THREE.Mesh(noseGeo, skinMat);
  nose.rotation.x = -Math.PI * 0.1;
  nose.position.set(0, 0.18, 0.12);
  head.add(nose);

  // Expressive Dark Almond Eyes
  for (const dir of [-1, 1]) {
    const eyeGeo = new THREE.BoxGeometry(0.025, 0.012, 0.01);
    const eye = new THREE.Mesh(eyeGeo, hairMat);
    eye.position.set(dir * 0.04, 0.2, 0.1);
    head.add(eye);

    const browGeo = new THREE.BoxGeometry(0.035, 0.009, 0.015);
    const brow = new THREE.Mesh(browGeo, hairMat);
    brow.position.set(dir * 0.04, 0.22, 0.105);
    brow.rotation.z = dir * 0.1;
    head.add(brow);
  }

  // ── 6. Ghutra (White Draped Headscarf) & Agal (Double Ring Cord) ──
  // Ghutra Cap over the crown
  const ghutraCrownGeo = new THREE.SphereGeometry(0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.65);
  const ghutraCrown = new THREE.Mesh(ghutraCrownGeo, ghutraMat);
  ghutraCrown.position.set(0, 0.2, -0.01);
  head.add(ghutraCrown);

  // Agal: Double-coiled thick black ring resting horizontally on the crown
  for (const yRing of [0.26, 0.285]) {
    const agalGeo = new THREE.TorusGeometry(0.112, 0.016, 8, 16);
    const agal = new THREE.Mesh(agalGeo, agalMat);
    agal.rotation.x = Math.PI / 2;
    agal.position.set(0, yRing, -0.01);
    head.add(agal);
  }

  // Agal Rear Hanging Tassels (Classic Emirati ceremonial detail)
  const agalTasselGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.22, 4);
  const agalTassel1 = new THREE.Mesh(agalTasselGeo, agalMat);
  agalTassel1.position.set(-0.025, 0.15, -0.13);
  head.add(agalTassel1);

  const agalTassel2 = new THREE.Mesh(agalTasselGeo, agalMat);
  agalTassel2.position.set(0.025, 0.15, -0.13);
  head.add(agalTassel2);

  // Ghutra Wings Drape: Drapes gracefully over shoulders and down the back
  const ghutraBackGeo = new THREE.BoxGeometry(0.32, 0.42, 0.04);
  const ghutraBack = new THREE.Mesh(ghutraBackGeo, ghutraMat);
  ghutraBack.position.set(0, 0.08, -0.13);
  ghutraBack.rotation.x = 0.12;
  head.add(ghutraBack);

  // Left Ghutra fold over collarbone
  const ghutraLeftGeo = new THREE.BoxGeometry(0.12, 0.38, 0.05);
  const ghutraLeft = new THREE.Mesh(ghutraLeftGeo, ghutraMat);
  ghutraLeft.position.set(-0.13, 0.06, 0.04);
  ghutraLeft.rotation.z = 0.15;
  head.add(ghutraLeft);

  // Right Ghutra fold (draped over chest)
  const ghutraRightGeo = new THREE.BoxGeometry(0.12, 0.38, 0.05);
  const ghutraRight = new THREE.Mesh(ghutraRightGeo, ghutraMat);
  ghutraRight.position.set(0.13, 0.06, 0.04);
  ghutraRight.rotation.z = -0.15;
  head.add(ghutraRight);

  // ── 7. Right Arm Hierarchy (Rigged for merchant work & greeting wave) ──
  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.24, 0.46, 0);
  torso.add(rightShoulder);

  // Upper Arm with kandura sleeve
  const rSleeveUpperGeo = new THREE.CylinderGeometry(0.075, 0.068, 0.28, 8);
  const rSleeveUpper = new THREE.Mesh(rSleeveUpperGeo, kanduraMat);
  rSleeveUpper.position.set(0, -0.14, 0);
  rightShoulder.add(rSleeveUpper);

  // Right Elbow
  const rightElbow = new THREE.Group();
  rightElbow.position.set(0, -0.28, 0);
  rightShoulder.add(rightElbow);

  // Forearm with wide flowing cuff
  const rForearmGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.24, 8);
  const rForearm = new THREE.Mesh(rForearmGeo, kanduraMat);
  rForearm.position.set(0, -0.12, 0);
  rightElbow.add(rForearm);

  // Right Hand
  const rightHand = new THREE.Group();
  rightHand.position.set(0, -0.24, 0);
  rightElbow.add(rightHand);

  const rPalmGeo = new THREE.BoxGeometry(0.075, 0.1, 0.035);
  const rPalm = new THREE.Mesh(rPalmGeo, skinMat);
  rPalm.position.set(0, -0.05, 0);
  rightHand.add(rPalm);

  // ── 8. Left Arm Hierarchy (Steadying bolt on display table) ──
  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.24, 0.46, 0);
  torso.add(leftShoulder);

  const lSleeveUpperGeo = new THREE.CylinderGeometry(0.075, 0.068, 0.28, 8);
  const lSleeveUpper = new THREE.Mesh(lSleeveUpperGeo, kanduraMat);
  lSleeveUpper.position.set(0, -0.14, 0);
  leftShoulder.add(lSleeveUpper);

  // Left Elbow
  const leftElbow = new THREE.Group();
  leftElbow.position.set(0, -0.28, 0);
  leftShoulder.add(leftElbow);

  const lForearmGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.24, 8);
  const lForearm = new THREE.Mesh(lForearmGeo, kanduraMat);
  lForearm.position.set(0, -0.12, 0);
  leftElbow.add(lForearm);

  // Left Hand
  const leftHand = new THREE.Group();
  leftHand.position.set(0, -0.24, 0);
  leftElbow.add(leftHand);

  const lPalmGeo = new THREE.BoxGeometry(0.075, 0.1, 0.035);
  const lPalm = new THREE.Mesh(lPalmGeo, skinMat);
  lPalm.position.set(0, -0.05, 0);
  leftHand.add(lPalm);

  // ── 9. Natural Resting Pose (Beside Display Table, Welcoming Posture) ──
  // Torso slightly turned towards approaching pedestrian street
  torso.rotation.y = isLeft ? 0.28 : -0.28;

  // Head tilted slightly towards the lane
  head.rotation.y = isLeft ? 0.18 : -0.18;
  head.rotation.x = -0.04;

  // Left arm resting naturally forward on top of silk bolts on display table
  leftShoulder.rotation.x = 0.48;
  leftShoulder.rotation.z = -0.15;
  leftElbow.rotation.x = 0.65;
  leftElbow.rotation.y = 0.2;

  // Right arm relaxed at side in warm posture
  rightShoulder.rotation.x = 0.22;
  rightShoulder.rotation.z = 0.18;
  rightElbow.rotation.x = 0.42;

  const initialPos = new THREE.Vector3();

  // Ensure all character meshes are never prematurely culled at screen edges
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.frustumCulled = false;
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  return {
    root,
    torso,
    head,
    tarboosh,
    rightShoulder,
    rightElbow,
    rightHand,
    leftShoulder,
    leftElbow,
    leftHand,
    worldZ,
    initialPos,
  };
}
