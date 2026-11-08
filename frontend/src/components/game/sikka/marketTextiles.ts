/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { SharedMaterials, createSignboardTexture, createHangingLantern } from './proceduralModels';
import { WindClothActor, FabricType } from './wind';
import { createEmiratiMerchant, MerchantRig } from './merchantCharacter';

export interface GarmentParts {
  group: THREE.Group;
  sleeveLeft?: THREE.Object3D;
  sleeveRight?: THREE.Object3D;
  restSleeveLeftZ?: number;
  restSleeveRightZ?: number;
}

export interface ShowcaseTextileResult {
  shop: THREE.Group;
  windActors: WindClothActor[];
  merchant?: MerchantRig;
}

/**
 * Creates a detailed 3D hanger with forged brass/iron hook.
 */
function createWoodenHanger(materials: SharedMaterials): THREE.Group {
  const hanger = new THREE.Group();

  // Forged brass S-hook at top
  const hookGeo = new THREE.TorusGeometry(0.06, 0.014, 6, 12, Math.PI * 1.3);
  const hook = new THREE.Mesh(hookGeo, materials.brassMetal);
  hook.position.set(0, 0.12, 0);
  hook.rotation.z = -Math.PI * 0.15;
  hanger.add(hook);

  // Triangular shaped timber hanger body
  const bodyGeo = new THREE.BoxGeometry(0.85, 0.04, 0.04);
  const body = new THREE.Mesh(bodyGeo, materials.teakWood);
  body.position.set(0, 0, 0);
  hanger.add(body);

  // Slanted shoulder arms
  for (const dir of [-1, 1]) {
    const armGeo = new THREE.BoxGeometry(0.44, 0.035, 0.035);
    const arm = new THREE.Mesh(armGeo, materials.teakWood);
    arm.position.set(dir * 0.22, -0.05, 0);
    arm.rotation.z = -dir * 0.22;
    hanger.add(arm);
  }

  // Horizontal trouser/shawl bar
  const crossGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.78, 6);
  const cross = new THREE.Mesh(crossGeo, materials.teakWood);
  cross.rotation.z = Math.PI / 2;
  cross.position.set(0, -0.11, 0);
  hanger.add(cross);

  return hanger;
}

/**
 * 1. Traditional Emirati Kandura / Thobe:
 * Modeled collar, Mandarin neckline, distinct sleeves, flowing ankle-length robe with thickness.
 */
function createKanduraMesh(clothMat: THREE.Material): GarmentParts {
  const group = new THREE.Group();

  // Mandarin collar ring
  const collarGeo = new THREE.CylinderGeometry(0.12, 0.13, 0.08, 12);
  const collar = new THREE.Mesh(collarGeo, clothMat);
  collar.position.set(0, 0.02, 0);
  group.add(collar);

  // Upper chest & shoulders (front/back physical depth)
  const chestGeo = new THREE.BoxGeometry(0.78, 0.55, 0.24);
  const chest = new THREE.Mesh(chestGeo, clothMat);
  chest.position.set(0, -0.28, 0);
  group.add(chest);

  // Chest placket & traditional Tarboosh (hanging tassel)
  const placketGeo = new THREE.BoxGeometry(0.08, 0.45, 0.02);
  const placketMat = new THREE.MeshStandardMaterial({ color: 0xeee6d8, roughness: 0.9 });
  const placket = new THREE.Mesh(placketGeo, placketMat);
  placket.position.set(0, -0.26, 0.125);
  group.add(placket);

  const tasselGeo = new THREE.CylinderGeometry(0.015, 0.025, 0.35, 6);
  const tassel = new THREE.Mesh(tasselGeo, placketMat);
  tassel.position.set(0.04, -0.42, 0.13);
  tassel.rotation.z = 0.08;
  group.add(tassel);

  // Angled sleeves extending outward
  let sleeveLeft: THREE.Mesh | undefined;
  let sleeveRight: THREE.Mesh | undefined;

  for (const dir of [-1, 1]) {
    const sleeveGeo = new THREE.CylinderGeometry(0.12, 0.09, 0.65, 8);
    const sleeve = new THREE.Mesh(sleeveGeo, clothMat);
    sleeve.position.set(dir * 0.48, -0.32, 0);
    sleeve.rotation.z = dir * 0.38;
    group.add(sleeve);

    // Sleeve cuff
    const cuffGeo = new THREE.TorusGeometry(0.095, 0.02, 6, 10);
    const cuff = new THREE.Mesh(cuffGeo, clothMat);
    cuff.position.set(dir * 0.61, -0.62, 0);
    cuff.rotation.x = Math.PI / 2;
    group.add(cuff);

    if (dir === -1) sleeveLeft = sleeve;
    else sleeveRight = sleeve;
  }

  // Lower flowing robe with drapery thickness & soft side-pleat contours
  const robeGeo = new THREE.CylinderGeometry(0.38, 0.54, 1.45, 12, 1, false);
  robeGeo.scale(1.0, 1.0, 0.55); // Flattens depth realistically
  const robe = new THREE.Mesh(robeGeo, clothMat);
  robe.position.set(0, -1.25, 0);
  group.add(robe);

  return {
    group,
    sleeveLeft,
    sleeveRight,
    restSleeveLeftZ: -0.38,
    restSleeveRightZ: 0.38,
  };
}

/**
 * 2. Arabian Indigo Tunic with Gold Embroidery.
 */
function createIndigoTunicMesh(clothMat: THREE.Material, goldMat: THREE.Material): GarmentParts {
  const group = new THREE.Group();

  // V-Neck collar with metallic embroidery border
  const vNeckGeo = new THREE.BoxGeometry(0.72, 0.48, 0.22);
  const chest = new THREE.Mesh(vNeckGeo, clothMat);
  chest.position.set(0, -0.24, 0);
  group.add(chest);

  // Gold embroidered placket
  const placketGeo = new THREE.BoxGeometry(0.12, 0.38, 0.02);
  const placket = new THREE.Mesh(placketGeo, goldMat);
  placket.position.set(0, -0.22, 0.115);
  group.add(placket);

  // 3/4 Length sleeves with gold cuff bands
  let sleeveLeft: THREE.Mesh | undefined;
  let sleeveRight: THREE.Mesh | undefined;

  for (const dir of [-1, 1]) {
    const sleeveGeo = new THREE.CylinderGeometry(0.13, 0.1, 0.52, 8);
    const sleeve = new THREE.Mesh(sleeveGeo, clothMat);
    sleeve.position.set(dir * 0.46, -0.28, 0);
    sleeve.rotation.z = dir * 0.32;
    group.add(sleeve);

    const goldCuffGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.06, 8);
    const goldCuff = new THREE.Mesh(goldCuffGeo, goldMat);
    goldCuff.position.set(dir * 0.56, -0.52, 0);
    goldCuff.rotation.z = dir * 0.32;
    group.add(goldCuff);

    if (dir === -1) sleeveLeft = sleeve;
    else sleeveRight = sleeve;
  }

  // Tunic lower skirt with flared hem
  const skirtGeo = new THREE.CylinderGeometry(0.35, 0.46, 0.85, 10, 1, false);
  skirtGeo.scale(1.0, 1.0, 0.5);
  const skirt = new THREE.Mesh(skirtGeo, clothMat);
  skirt.position.set(0, -0.88, 0);
  group.add(skirt);

  // Hemline embroidery band
  const hemGeo = new THREE.BoxGeometry(0.92, 0.05, 0.24);
  const hem = new THREE.Mesh(hemGeo, goldMat);
  hem.position.set(0, -1.3, 0);
  group.add(hem);

  return {
    group,
    sleeveLeft,
    sleeveRight,
    restSleeveLeftZ: -0.32,
    restSleeveRightZ: 0.32,
  };
}

/**
 * 3. Terracotta Cotton Shirt with Chest Pocket & Cuffs.
 */
function createTerracottaShirtMesh(clothMat: THREE.Material): GarmentParts {
  const group = new THREE.Group();

  // Folded collar flaps
  const collarGeo = new THREE.BoxGeometry(0.32, 0.08, 0.22);
  const collar = new THREE.Mesh(collarGeo, clothMat);
  collar.position.set(0, 0.01, 0);
  group.add(collar);

  // Main torso
  const torsoGeo = new THREE.BoxGeometry(0.74, 0.95, 0.22);
  const torso = new THREE.Mesh(torsoGeo, clothMat);
  torso.position.set(0, -0.48, 0);
  group.add(torso);

  // Chest patch pocket
  const pocketGeo = new THREE.BoxGeometry(0.16, 0.18, 0.03);
  const pocket = new THREE.Mesh(pocketGeo, clothMat);
  pocket.position.set(0.18, -0.32, 0.12);
  group.add(pocket);

  let sleeveLeft: THREE.Mesh | undefined;
  let sleeveRight: THREE.Mesh | undefined;

  // Sleeves with cuff buttons
  for (const dir of [-1, 1]) {
    const sleeveGeo = new THREE.CylinderGeometry(0.11, 0.085, 0.58, 8);
    const sleeve = new THREE.Mesh(sleeveGeo, clothMat);
    sleeve.position.set(dir * 0.45, -0.32, 0);
    sleeve.rotation.z = dir * 0.35;
    group.add(sleeve);

    if (dir === -1) sleeveLeft = sleeve;
    else sleeveRight = sleeve;
  }

  return {
    group,
    sleeveLeft,
    sleeveRight,
    restSleeveLeftZ: -0.35,
    restSleeveRightZ: 0.35,
  };
}

/**
 * 4. Ceremonial Bisht (Traditional Robe with Gold Zari Trim).
 */
function createCeremonialBishtMesh(clothMat: THREE.Material, goldMat: THREE.Material): GarmentParts {
  const group = new THREE.Group();

  // Wide mantle drape over shoulders
  const mantleGeo = new THREE.BoxGeometry(0.92, 0.52, 0.26);
  const mantle = new THREE.Mesh(mantleGeo, clothMat);
  mantle.position.set(0, -0.26, 0);
  group.add(mantle);

  let sleeveLeft: THREE.Mesh | undefined;
  let sleeveRight: THREE.Mesh | undefined;

  // Wide batwing ceremonial sleeves
  for (const dir of [-1, 1]) {
    const wingGeo = new THREE.BoxGeometry(0.32, 0.65, 0.18);
    const wing = new THREE.Mesh(wingGeo, clothMat);
    wing.position.set(dir * 0.54, -0.42, 0);
    wing.rotation.z = dir * 0.25;
    group.add(wing);

    // Gold embroidery bands along opening and cuffs
    const trimGeo = new THREE.BoxGeometry(0.04, 0.65, 0.19);
    const trim = new THREE.Mesh(trimGeo, goldMat);
    trim.position.set(dir * 0.44, -0.42, 0);
    trim.rotation.z = dir * 0.25;
    group.add(trim);

    if (dir === -1) sleeveLeft = wing;
    else sleeveRight = wing;
  }

  // Long flowing bisht cloak
  const cloakGeo = new THREE.CylinderGeometry(0.44, 0.6, 1.4, 12, 1, false);
  cloakGeo.scale(1.0, 1.0, 0.55);
  const cloak = new THREE.Mesh(cloakGeo, clothMat);
  cloak.position.set(0, -1.2, 0);
  group.add(cloak);

  // Central vertical gold Zari ribbon
  const zariGeo = new THREE.BoxGeometry(0.09, 1.45, 0.03);
  const zari = new THREE.Mesh(zariGeo, goldMat);
  zari.position.set(0, -1.15, 0.15);
  group.add(zari);

  return {
    group,
    sleeveLeft,
    sleeveRight,
    restSleeveLeftZ: -0.25,
    restSleeveRightZ: 0.25,
  };
}

/**
 * 5. Draped Sadu / Wool Scarf hanging over timber crossbar.
 */
function createDrapedScarfMesh(clothMat: THREE.Material): GarmentParts {
  const group = new THREE.Group();

  // Curved loop draped over the bar
  const loopGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.32, 8, 1, true, -Math.PI / 2, Math.PI);
  const loop = new THREE.Mesh(loopGeo, clothMat);
  loop.rotation.z = Math.PI / 2;
  loop.position.set(0, 0.02, 0);
  group.add(loop);

  // Front hanging scarf tail with fringe
  const frontGeo = new THREE.BoxGeometry(0.32, 0.85, 0.03);
  const front = new THREE.Mesh(frontGeo, clothMat);
  front.position.set(0, -0.42, 0.07);
  group.add(front);

  // Back hanging tail
  const backGeo = new THREE.BoxGeometry(0.32, 0.72, 0.03);
  const back = new THREE.Mesh(backGeo, clothMat);
  back.position.set(0, -0.36, -0.07);
  group.add(back);

  // Tassel fringe at bottom of front tail
  for (let t = -0.12; t <= 0.12; t += 0.04) {
    const fringeGeo = new THREE.CylinderGeometry(0.008, 0.012, 0.08, 4);
    const fringe = new THREE.Mesh(fringeGeo, clothMat);
    fringe.position.set(t, -0.88, 0.07);
    group.add(fringe);
  }

  return { group };
}

/**
 * Heavy Timber Clothing Rail with 6 realistically hanging 3D garments.
 * Mounts on dynamic sway pivots with WindClothActor tracking for natural breeze movement.
 */
export function createClothingRailWithGarments(
  materials: SharedMaterials,
  isLeft: boolean,
  worldZ: number = 0,
): { railGroup: THREE.Group; windActors: WindClothActor[] } {
  const railGroup = new THREE.Group();
  const windActors: WindClothActor[] = [];
  const dirSign = isLeft ? 1 : -1;

  // Sturdy vertical wooden timber end-posts
  for (const zEnd of [-2.2, 2.2]) {
    const postGeo = new THREE.BoxGeometry(0.12, 2.6, 0.12);
    const post = new THREE.Mesh(postGeo, materials.teakWood);
    post.position.set(0, 1.3, zEnd);
    railGroup.add(post);

    // Turned wooden finial knob on top
    const finialGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const finial = new THREE.Mesh(finialGeo, materials.teakWood);
    finial.position.set(0, 2.65, zEnd);
    railGroup.add(finial);

    // Trestle base foot spreader
    const footGeo = new THREE.BoxGeometry(0.85, 0.09, 0.14);
    const foot = new THREE.Mesh(footGeo, materials.teakWood);
    foot.position.set(0, 0.05, zEnd);
    railGroup.add(foot);

    // Diagonal bracket brace
    const braceGeo = new THREE.BoxGeometry(0.08, 0.42, 0.08);
    const brace = new THREE.Mesh(braceGeo, materials.teakWood);
    brace.position.set(0, 0.32, zEnd > 0 ? zEnd - 0.22 : zEnd + 0.22);
    brace.rotation.x = zEnd > 0 ? 0.6 : -0.6;
    railGroup.add(brace);
  }

  // Heavy timber hanging crossbar spanning 4.4 meters
  const railBarGeo = new THREE.CylinderGeometry(0.045, 0.045, 4.45, 8);
  const railBar = new THREE.Mesh(railBarGeo, materials.teakWood);
  railBar.rotation.x = Math.PI / 2;
  railBar.position.set(0, 2.45, 0);
  railGroup.add(railBar);

  // Specialized authentic fabric materials with realistic roughness
  const kanduraMat = new THREE.MeshStandardMaterial({
    color: 0xf5eedf, // Natural unbleached linen
    roughness: 0.88,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  const indigoMat = new THREE.MeshStandardMaterial({
    color: 0x1d385c, // Deep Arabian Indigo
    roughness: 0.82,
    metalness: 0.03,
    side: THREE.DoubleSide,
  });

  const ochreMat = new THREE.MeshStandardMaterial({
    color: 0x9e5c32, // Terracotta desert cotton
    roughness: 0.84,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  const silkSageMat = new THREE.MeshStandardMaterial({
    color: 0x3d664c, // Sage green raw silk
    roughness: 0.58,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });

  const bishtMat = new THREE.MeshStandardMaterial({
    color: 0x161618, // Traditional ceremonial black
    roughness: 0.9,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  // 6 Distinct Garments spaced intentionally along the rail
  const garmentConfigs: Array<{
    z: number;
    create: () => GarmentParts;
    hasHanger: boolean;
    rotY: number;
    type: FabricType;
  }> = [
    { z: -1.7, create: () => createKanduraMesh(kanduraMat), hasHanger: true, rotY: 0.08, type: 'kandura' },
    { z: -1.0, create: () => createIndigoTunicMesh(indigoMat, materials.goldMetal), hasHanger: true, rotY: -0.1, type: 'tunic' },
    { z: -0.3, create: () => createDrapedScarfMesh(materials.saduCloth), hasHanger: false, rotY: 0, type: 'scarf' },
    { z: 0.4, create: () => createTerracottaShirtMesh(ochreMat), hasHanger: true, rotY: 0.05, type: 'shirt' },
    { z: 1.1, create: () => createKanduraMesh(silkSageMat), hasHanger: true, rotY: -0.06, type: 'kandura' },
    { z: 1.75, create: () => createCeremonialBishtMesh(bishtMat, materials.goldMetal), hasHanger: true, rotY: 0.12, type: 'bisht' },
  ];

  garmentConfigs.forEach((cfg) => {
    const itemGroup = new THREE.Group();
    itemGroup.position.set(0, 2.45, cfg.z);
    itemGroup.rotation.y = (dirSign * Math.PI / 2) + cfg.rotY;

    // Dedicated sway pivot anchored at rail contact point (0, 0, 0)
    const swayPivot = new THREE.Group();
    itemGroup.add(swayPivot);

    if (cfg.hasHanger) {
      const hanger = createWoodenHanger(materials);
      swayPivot.add(hanger);
    }

    const parts = cfg.create();
    swayPivot.add(parts.group);
    railGroup.add(itemGroup);

    windActors.push({
      pivot: swayPivot,
      type: cfg.type,
      restRotationX: 0,
      restRotationZ: 0,
      worldZ: worldZ + cfg.z,
      phaseOffset: cfg.z * 1.8,
      sleeveLeft: parts.sleeveLeft,
      sleeveRight: parts.sleeveRight,
      restSleeveLeftZ: parts.restSleeveLeftZ,
      restSleeveRightZ: parts.restSleeveRightZ,
    });
  });

  return { railGroup, windActors };
}

/**
 * Stack of folded fabric bolts with golden wrapping bands.
 */
export function createFoldedFabricStack(materials: SharedMaterials): THREE.Group {
  const stack = new THREE.Group();

  const fabricColors = [0x8c2b32, 0x1c4475, 0x2e6648, 0xd4a034, 0x6e327a];
  fabricColors.forEach((col, i) => {
    const boltMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.75 });
    const boltGeo = new THREE.BoxGeometry(0.7, 0.12, 0.45);
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    // Slight human rotation misalignment per fold
    bolt.position.set(0, i * 0.12 + 0.06, 0);
    bolt.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.04 * i;
    stack.add(bolt);

    // Gold ribbon cord tied around folded bolt
    const cordGeo = new THREE.BoxGeometry(0.71, 0.03, 0.04);
    const cord = new THREE.Mesh(cordGeo, materials.goldMetal);
    cord.position.set(0, i * 0.12 + 0.06, 0);
    stack.add(cord);
  });

  return stack;
}

/**
 * Partly rolled Persian / Sadu carpet showing realistic rolled spiral core and unrolled runner.
 */
export function createPartlyRolledCarpet(materials: SharedMaterials): THREE.Group {
  const carpetGroup = new THREE.Group();

  // Cylindrical rolled core of carpet
  const rollGeo = new THREE.CylinderGeometry(0.2, 0.2, 2.2, 16);
  const roll = new THREE.Mesh(rollGeo, materials.persianCarpet);
  roll.rotation.x = Math.PI / 2;
  roll.position.set(0, 0.2, 0);
  carpetGroup.add(roll);

  // Partially unrolled section spreading out along the wooden platform floor
  const unrolledGeo = new THREE.PlaneGeometry(1.6, 2.15);
  const unrolled = new THREE.Mesh(unrolledGeo, materials.persianCarpet);
  unrolled.rotation.x = -Math.PI / 2;
  unrolled.position.set(0.8, 0.015, 0);
  carpetGroup.add(unrolled);

  return carpetGroup;
}

/**
 * Low carved wooden merchant stool with rush seat and tailor's brass scissors.
 */
export function createLowMerchantStool(materials: SharedMaterials): THREE.Group {
  const stool = new THREE.Group();

  // 4 Turned wooden legs
  for (const dx of [-0.22, 0.22]) {
    for (const dz of [-0.22, 0.22]) {
      const legGeo = new THREE.CylinderGeometry(0.03, 0.025, 0.45, 6);
      const leg = new THREE.Mesh(legGeo, materials.teakWood);
      leg.position.set(dx, 0.225, dz);
      stool.add(leg);
    }
  }

  // Cross stretchers
  const strXGeo = new THREE.BoxGeometry(0.48, 0.025, 0.025);
  const strX1 = new THREE.Mesh(strXGeo, materials.teakWood);
  strX1.position.set(0, 0.15, -0.22);
  stool.add(strX1);
  const strX2 = new THREE.Mesh(strXGeo, materials.teakWood);
  strX2.position.set(0, 0.15, 0.22);
  stool.add(strX2);

  // Woven rush / leather seat
  const seatGeo = new THREE.BoxGeometry(0.52, 0.05, 0.52);
  const seat = new THREE.Mesh(seatGeo, materials.burlapSack);
  seat.position.set(0, 0.46, 0);
  stool.add(seat);

  // Tailor's brass fabric scissors resting on seat
  const scissorGeo = new THREE.BoxGeometry(0.24, 0.015, 0.1);
  const scissor = new THREE.Mesh(scissorGeo, materials.brassMetal);
  scissor.position.set(0.04, 0.49, 0.04);
  scissor.rotation.y = 0.45;
  stool.add(scissor);

  return stool;
}

/**
 * Builds the complete, convincing Showcase Textile Storefront.
 * Meets all Step 3 criteria:
 * - Timber clothing rail with brass hooks & hangers
 * - 6 modeled 3D garments with distinct sleeve/collar outlines and thickness
 * - Folded fabric stacks on low table
 * - Partly rolled carpet
 * - Low merchant stool with scissors
 * - Authentic Sikka architectural alcove, striped awning, and Fanous lanterns
 */
export function createShowcaseTextileShop(
  isLeft: boolean,
  materials: SharedMaterials,
  worldZ: number = 0,
): ShowcaseTextileResult {
  const shop = new THREE.Group();
  const allWindActors: WindClothActor[] = [];
  const recessSign = isLeft ? -1 : 1;
  const streetSign = isLeft ? 1 : -1;

  // 1. Architecture: Coral Stone Alcove
  const backWallGeo = new THREE.BoxGeometry(0.6, 6.2, 16.0);
  const backWall = new THREE.Mesh(backWallGeo, materials.coralStone);
  backWall.position.set(recessSign * 3.4, 3.1, 0);
  shop.add(backWall);

  // Side Partition Walls - open on approach side so the shop is clearly visible from down the street!
  const sideWallGeo = new THREE.BoxGeometry(3.6, 6.2, 0.6);
  const sideWall1 = new THREE.Mesh(sideWallGeo, materials.coralStone);
  sideWall1.position.set(recessSign * 1.6, 3.1, -7.7);
  shop.add(sideWall1);

  // Raised Wooden Platform Floor (Dakka)
  const floorGeo = new THREE.BoxGeometry(3.8, 0.28, 15.6);
  const floor = new THREE.Mesh(floorGeo, materials.cartWood);
  floor.position.set(recessSign * 1.5, 0.14, 0);
  shop.add(floor);

  // Chandal timber ceiling beams
  const ceilingGeo = new THREE.BoxGeometry(4.2, 0.35, 16.0);
  const ceiling = new THREE.Mesh(ceilingGeo, materials.coralStone);
  ceiling.position.set(recessSign * 1.4, 6.0, 0);
  shop.add(ceiling);

  for (let b = -7; b <= 7; b += 2.8) {
    const beamGeo = new THREE.CylinderGeometry(0.1, 0.1, 3.8, 8);
    const beam = new THREE.Mesh(beamGeo, materials.teakWood);
    beam.rotation.z = Math.PI / 2;
    beam.position.set(recessSign * 1.5, 5.75, b);
    shop.add(beam);
  }

  // 3 Carved Teak Wooden Front Columns
  for (const zCol of [-7.0, 0, 7.0]) {
    const colGeo = new THREE.BoxGeometry(0.45, 5.8, 0.45);
    const col = new THREE.Mesh(colGeo, materials.teakWood);
    col.position.set(0, 2.9, zCol);
    shop.add(col);

    const capGeo = new THREE.BoxGeometry(0.7, 0.35, 0.7);
    const cap = new THREE.Mesh(capGeo, materials.teakWood);
    cap.position.set(0, 5.7, zCol);
    shop.add(cap);
  }

  // Lintel Beam
  const headerGeo = new THREE.BoxGeometry(0.65, 0.75, 16.0);
  const header = new THREE.Mesh(headerGeo, materials.teakWood);
  header.position.set(0, 5.5, 0);
  shop.add(header);

  // Signboard with authentic Arabic & English Calligraphy
  const signTex = createSignboardTexture('سوق الأقمشة والحرير التراثي', 'Al Fahidi Silk & Textile Souq');
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.5 });
  const signGeo = new THREE.PlaneGeometry(8.5, 1.35);
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(streetSign * 0.4, 5.5, 0);
  sign.rotation.y = streetSign * (Math.PI / 2);
  shop.add(sign);

  // Striped Bazaar Awning
  const awningGeo = new THREE.PlaneGeometry(2.8, 15.6);
  const awning = new THREE.Mesh(awningGeo, materials.stripedAwningIndigo);
  awning.position.set(streetSign * 1.3, 4.9, 0);
  awning.rotation.x = Math.PI / 2;
  awning.rotation.y = streetSign * 0.18;
  shop.add(awning);

  allWindActors.push({
    pivot: awning,
    type: 'awning',
    restRotationX: Math.PI / 2,
    restRotationZ: 0,
    worldZ: worldZ,
    phaseOffset: 0.5,
  });

  // Brass Hanging Lanterns
  for (const s of [-6.8, 6.8]) {
    const lantern = createHangingLantern(materials, 1.0);
    lantern.position.set(streetSign * 2.3, 4.0, s);
    shop.add(lantern);
  }

  // ── 2. FEATURED STEP 3 SHOWCASE MERCHANDISE ──

  // A. Front Timber Clothing Rail with 6 Hanging Garments (Placed right along platform edge facing street)
  const { railGroup, windActors } = createClothingRailWithGarments(materials, isLeft, worldZ);
  railGroup.position.set(streetSign * 1.0, 0.28, -3.2);
  shop.add(railGroup);
  allWindActors.push(...windActors);

  // B. Partly Rolled Persian Carpet on the platform floor
  const carpetRoll = createPartlyRolledCarpet(materials);
  carpetRoll.position.set(recessSign * 1.4, 0.28, 4.2);
  shop.add(carpetRoll);

  // C. Hanging Persian Tapestry along back wall
  const tapestryGeo = new THREE.PlaneGeometry(4.8, 3.2);
  const tapestry = new THREE.Mesh(tapestryGeo, materials.persianCarpet);
  tapestry.position.set(recessSign * 3.3, 3.3, 0);
  tapestry.rotation.y = streetSign * (Math.PI / 2);
  shop.add(tapestry);

  // D. Merchant Display Table with Folded Silk & Linen Stacks
  const tableGeo = new THREE.BoxGeometry(1.2, 0.8, 2.8);
  const table = new THREE.Mesh(tableGeo, materials.cartWood);
  table.position.set(recessSign * 0.8, 0.68, 2.0);
  shop.add(table);

  const stack1 = createFoldedFabricStack(materials);
  stack1.position.set(recessSign * 0.8, 1.08, 1.4);
  shop.add(stack1);

  const stack2 = createFoldedFabricStack(materials);
  stack2.position.set(recessSign * 0.8, 1.08, 2.6);
  stack2.rotation.y = 0.2;
  shop.add(stack2);

  // E. Low Merchant Stool with Tailor's Brass Scissors
  const stool = createLowMerchantStool(materials);
  stool.position.set(recessSign * 1.3, 0.28, -5.4);
  shop.add(stool);

  // F. Ceramic Amphora filled with dye sticks
  const urnGeo = new THREE.CylinderGeometry(0.24, 0.35, 0.9, 10);
  const urn = new THREE.Mesh(urnGeo, materials.ceramicTile);
  urn.position.set(recessSign * 1.5, 0.73, 6.2);
  shop.add(urn);

  // G. Wall-Mounted UAE National Flag (1971 Protocol Specification)
  // Mounted high on the front wall projecting forward into open sikka sky (clear of overhead beam)
  const flagObj = createWallMountedUAEFlag(materials, worldZ, isLeft);
  flagObj.flagGroup.position.set(streetSign * 1.5, 5.5, 3.2);
  shop.add(flagObj.flagGroup);
  allWindActors.push(flagObj.windActor);

  // H. Traditional Emirati Textile Merchant on the Front Wooden Dakka (Step 6)
  // Positioned proudly on the front platform edge at sidewalk curb, facing oncoming runners!
  const merchant = createEmiratiMerchant(materials, worldZ, isLeft);
  merchant.root.position.set(streetSign * 1.5, 0.28, 1.8);
  merchant.root.rotation.y = streetSign * (Math.PI / 2) - (isLeft ? 0.45 : -0.45);
  merchant.initialPos.copy(merchant.root.position);
  shop.add(merchant.root);

  return { shop, windActors: allWindActors, merchant };
}

/**
 * Official UAE National Flag mounted on an angled wall bracket.
 * Adheres strictly to Federal Law & Protocol standards (1971):
 * - 2:1 length-to-height proportion (2.0m length x 1.0m height)
 * - Vertical Red hoist stripe: 1/4 of total length (pinned to the flagpole)
 * - Three equal horizontal stripes across remaining 3/4 length: Green (top), White (mid), Black (bottom)
 * - Angled timber flagpole with turned spear finial, socket, and halyard rings
 * - Segmented 18x8 mesh rigged for realistic traveling wind ripple waves
 */
export function createWallMountedUAEFlag(
  materials: SharedMaterials,
  worldZ: number,
  isLeft: boolean,
): { flagGroup: THREE.Group; windActor: WindClothActor } {
  const flagGroup = new THREE.Group();
  const dirSign = isLeft ? 1 : -1;

  // 1. Ornate Cast Brass Wall Mounting Bracket
  const bracketGeo = new THREE.BoxGeometry(0.22, 0.45, 0.22);
  const bracket = new THREE.Mesh(bracketGeo, materials.brassMetal);
  flagGroup.add(bracket);

  // Mounting bolts
  for (const dy of [-0.16, 0.16]) {
    for (const dz of [-0.07, 0.07]) {
      const boltGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.05, 6);
      const bolt = new THREE.Mesh(boltGeo, materials.goldMetal);
      bolt.rotation.z = Math.PI / 2;
      bolt.position.set(dirSign * 0.11, dy, dz);
      flagGroup.add(bolt);
    }
  }

  // Bracket socket holding the pole
  const socketGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.4, 8);
  const socket = new THREE.Mesh(socketGeo, materials.brassMetal);
  socket.rotation.z = dirSign * -0.65; // ~37 degree upward angle
  socket.position.set(dirSign * 0.14, 0.1, 0);
  flagGroup.add(socket);

  // 2. Turned Hardwood Flagpole extending outward and upward
  const poleArm = new THREE.Group();
  poleArm.rotation.z = dirSign * -0.65;
  flagGroup.add(poleArm);

  const poleGeo = new THREE.CylinderGeometry(0.038, 0.044, 2.9, 8);
  const pole = new THREE.Mesh(poleGeo, materials.teakWood);
  pole.position.set(0, 1.35, 0);
  poleArm.add(pole);

  // Polished Brass Spear Finial at the tip of the flagpole
  const finialGeo = new THREE.ConeGeometry(0.08, 0.28, 8);
  const finial = new THREE.Mesh(finialGeo, materials.goldMetal);
  finial.position.set(0, 2.85, 0);
  poleArm.add(finial);

  const finialBallGeo = new THREE.SphereGeometry(0.065, 8, 8);
  const finialBall = new THREE.Mesh(finialBallGeo, materials.goldMetal);
  finialBall.position.set(0, 2.7, 0);
  poleArm.add(finialBall);

  // 3. Segmented 2:1 UAE Cloth Flag (2.0m fly x 1.0m hoist)
  const flagGeo = new THREE.PlaneGeometry(2.0, 1.0, 18, 8);
  // Translate so x=0 is the hoist edge on the pole, extending towards +X
  flagGeo.translate(1.0, 0, 0);

  // Cloned rest positions to prevent accumulated vertex drift
  const restPositions = new Float32Array(flagGeo.attributes.position.array);

  const flagMesh = new THREE.Mesh(flagGeo, materials.uaeFlag);
  flagMesh.castShadow = true;
  flagMesh.receiveShadow = true;
  flagMesh.frustumCulled = false;

  // Flag sway pivot positioned along the upper half of the flagpole
  const flagPivot = new THREE.Group();
  flagPivot.position.set(0, 1.85, 0);
  // Compensate pole angle so flag hangs level, and orient flag horizontally along the sikka street
  flagPivot.rotation.z = dirSign * 0.65;
  flagPivot.rotation.y = Math.PI / 2; // streams along -Z down the street!

  flagPivot.add(flagMesh);
  poleArm.add(flagPivot);

  // Brass halyard rings securing the hoist to the pole
  for (const yOffset of [-0.45, 0, 0.45]) {
    const ringGeo = new THREE.TorusGeometry(0.05, 0.009, 6, 12);
    const ring = new THREE.Mesh(ringGeo, materials.brassMetal);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 1.85 + yOffset * Math.cos(0.65), 0);
    poleArm.add(ring);
  }

  const windActor: WindClothActor = {
    pivot: flagPivot,
    type: 'flag',
    restRotationX: 0,
    restRotationZ: dirSign * 0.65,
    worldZ: worldZ,
    phaseOffset: 1.5,
    flagMesh: flagMesh,
    restFlagPositions: restPositions,
  };

  return { flagGroup, windActor };
}
