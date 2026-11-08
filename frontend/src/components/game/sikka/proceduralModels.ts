/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import {
  createAstrolabeTexture,
  createLimewashTexture,
  createDirhamCoinTexture,
  createFlagstoneTexture,
  createFlagstoneBumpMap,
  createSaduFabricTexture,
  createTeakWoodTexture,
  createPumpkinTexture,
  createWeatheredCartTexture,
  createPersianCarpetTexture,
  createStripedAwningTexture,
  createBurlapSackTexture,
  createCeramicTileTexture,
  createWatermelonTexture,
  createUAEFlagTexture,
} from './proceduralTextures';

/**
 * Creates canvas signboards with Arabic & English calligraphy.
 */
export function createSignboardTexture(arabicText: string, englishText: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Deep dark teak wood banner with gold filigree border
  ctx.fillStyle = '#2d180a';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#cda243';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 500, 116);
  ctx.strokeRect(12, 12, 488, 104);

  // Corner decorative flourishes
  const corners = [[16, 16], [496, 16], [16, 112], [496, 112]];
  corners.forEach(([cx, cy]) => {
    ctx.fillStyle = '#f0c761';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Arabic script (Top line)
  ctx.fillStyle = '#f8df95';
  ctx.font = 'bold 26px "Amiri", "Traditional Arabic", "Scheherazade", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(arabicText, 256, 46);

  // English subtitle (Bottom line)
  ctx.fillStyle = '#dfcca8';
  ctx.font = '600 16px "Cinzel", "Trajan Pro", sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText(englishText, 256, 88);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Materials cache to reuse across procedural chunks
 */
export class SharedMaterials {
  public isDestroyed: boolean = false;
  private allMaterialsSet: Set<THREE.Material> = new Set();

  public coralStone: THREE.MeshStandardMaterial;
  public flagstone: THREE.MeshStandardMaterial;
  public teakWood: THREE.MeshStandardMaterial;
  public goldMetal: THREE.MeshStandardMaterial;
  public brassMetal: THREE.MeshStandardMaterial;
  public saduCloth: THREE.MeshStandardMaterial;
  public dirhamCoin: THREE.MeshStandardMaterial;
  public astrolabe: THREE.MeshStandardMaterial;
  public terracottaAwning: THREE.MeshStandardMaterial;
  public palmThatch: THREE.MeshStandardMaterial;
  public palmFrond: THREE.MeshStandardMaterial;
  public palmTrunk: THREE.MeshStandardMaterial;
  public lanternGlass: THREE.MeshStandardMaterial;
  public spiceSaffron: THREE.MeshStandardMaterial;
  public spiceTurmeric: THREE.MeshStandardMaterial;
  public spiceLoomi: THREE.MeshStandardMaterial;
  public spiceCardamom: THREE.MeshStandardMaterial;
  public terracottaPot: THREE.MeshStandardMaterial;
  public pumpkin: THREE.MeshStandardMaterial;
  public pumpkinStem: THREE.MeshStandardMaterial;
  public cartWood: THREE.MeshStandardMaterial;
  public persianCarpet: THREE.MeshStandardMaterial;
  public ironWheel: THREE.MeshStandardMaterial;
  public dateFruit: THREE.MeshStandardMaterial;
  public stripedAwningTerracotta: THREE.MeshStandardMaterial;
  public stripedAwningIndigo: THREE.MeshStandardMaterial;
  public stripedAwningSaffron: THREE.MeshStandardMaterial;
  public burlapSack: THREE.MeshStandardMaterial;
  public ceramicTile: THREE.MeshStandardMaterial;
  public watermelon: THREE.MeshStandardMaterial;
  public citrusOrange: THREE.MeshStandardMaterial;
  public citrusLemon: THREE.MeshStandardMaterial;
  public datesGloss: THREE.MeshStandardMaterial;
  public polishedBrass: THREE.MeshStandardMaterial;
  public turquoiseGlaze: THREE.MeshStandardMaterial;
  public cobaltGlaze: THREE.MeshStandardMaterial;
  public uaeFlag: THREE.MeshStandardMaterial;

  constructor() {
    const coralTex = createLimewashTexture();
    const flagstoneTex = createFlagstoneTexture();
    const flagstoneBump = createFlagstoneBumpMap();
    const teakTex = createTeakWoodTexture();
    const saduTex = createSaduFabricTexture();
    const coinTex = createDirhamCoinTexture();
    const astrolabeTex = createAstrolabeTexture();
    const pumpkinTex = createPumpkinTexture();
    const cartWoodTex = createWeatheredCartTexture();
    const carpetTex = createPersianCarpetTexture();

    this.coralStone = new THREE.MeshStandardMaterial({
      map: coralTex,
      color: 0xc7ac8a,
      bumpMap: coralTex,
      bumpScale: 0.055,
      roughness: 0.92,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    this.flagstone = new THREE.MeshStandardMaterial({
      map: flagstoneTex,
      color: 0xbda384,
      bumpMap: flagstoneBump,
      bumpScale: 0.065,
      roughness: 0.86,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });

    // High-res texture enhancement if assets are present
    if (typeof window !== 'undefined') {
      const texLoader = new THREE.TextureLoader();
      texLoader.load(
        '/game-assets/sandstone_street.jpg',
        (tex) => {
          if (this.isDestroyed) {
            tex.dispose();
            return;
          }
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.repeat.set(1, 1);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 8;
          this.flagstone.map = tex;
          this.flagstone.needsUpdate = true;
        },
        undefined,
        () => {
          // Graceful fallback to procedural flagstone
        }
      );
      // Keep the authored limewash: the former wall image replaced it after
      // loading with a high-contrast printed masonry grid.
    }

    this.teakWood = new THREE.MeshStandardMaterial({
      map: teakTex,
      roughness: 0.72,
      metalness: 0.15,
    });

    this.goldMetal = new THREE.MeshStandardMaterial({
      color: 0xffd24d,
      roughness: 0.18,
      metalness: 0.95,
    });

    this.brassMetal = new THREE.MeshStandardMaterial({
      color: 0xc8983e,
      roughness: 0.28,
      metalness: 0.88,
    });

    this.saduCloth = new THREE.MeshStandardMaterial({
      map: saduTex,
      roughness: 0.85,
      metalness: 0.02,
    });

    this.dirhamCoin = new THREE.MeshStandardMaterial({
      map: coinTex,
      roughness: 0.22,
      metalness: 0.92,
    });

    this.astrolabe = new THREE.MeshStandardMaterial({
      map: astrolabeTex,
      roughness: 0.2,
      metalness: 0.92,
    });

    this.terracottaAwning = new THREE.MeshStandardMaterial({
      color: 0xb55a30,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    this.palmThatch = new THREE.MeshStandardMaterial({
      color: 0x8a7042,
      roughness: 0.95,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    this.palmFrond = new THREE.MeshStandardMaterial({
      color: 0x2e6629,
      roughness: 0.65,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    this.palmTrunk = new THREE.MeshStandardMaterial({
      color: 0x573b22,
      roughness: 0.9,
      metalness: 0.05,
    });

    this.lanternGlass = new THREE.MeshStandardMaterial({
      color: 0xffaa33,
      emissive: 0xff7700,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.4,
      transparent: true,
      opacity: 0.85,
    });

    this.spiceSaffron = new THREE.MeshStandardMaterial({ color: 0xbf1e2e, roughness: 0.95 });
    this.spiceTurmeric = new THREE.MeshStandardMaterial({ color: 0xe59b12, roughness: 0.95 });
    this.spiceLoomi = new THREE.MeshStandardMaterial({ color: 0x2c2622, roughness: 0.9 });
    this.spiceCardamom = new THREE.MeshStandardMaterial({ color: 0x486b36, roughness: 0.95 });
    this.terracottaPot = new THREE.MeshStandardMaterial({ color: 0xa95c3b, roughness: 0.82 });

    this.pumpkin = new THREE.MeshStandardMaterial({
      map: pumpkinTex,
      roughness: 0.72,
      metalness: 0.04,
    });

    this.pumpkinStem = new THREE.MeshStandardMaterial({
      color: 0x3d4722,
      roughness: 0.9,
      metalness: 0.05,
    });

    this.cartWood = new THREE.MeshStandardMaterial({
      map: cartWoodTex,
      roughness: 0.88,
      metalness: 0.05,
    });

    this.persianCarpet = new THREE.MeshStandardMaterial({
      map: carpetTex,
      roughness: 0.82,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });

    this.ironWheel = new THREE.MeshStandardMaterial({
      color: 0x222226,
      roughness: 0.45,
      metalness: 0.82,
    });

    this.dateFruit = new THREE.MeshStandardMaterial({
      color: 0x2c1508,
      roughness: 0.35,
      metalness: 0.1,
    });

    const awningTerraTex = createStripedAwningTexture('#b54828', '#f5e8d0');
    const awningIndigoTex = createStripedAwningTexture('#1b3a5c', '#f5e8d0');
    const awningSaffronTex = createStripedAwningTexture('#c4821a', '#245233');
    const burlapTex = createBurlapSackTexture();
    const tileTex = createCeramicTileTexture();
    const melonTex = createWatermelonTexture();

    this.stripedAwningTerracotta = new THREE.MeshStandardMaterial({
      map: awningTerraTex,
      roughness: 0.82,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });

    this.stripedAwningIndigo = new THREE.MeshStandardMaterial({
      map: awningIndigoTex,
      roughness: 0.82,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });

    this.stripedAwningSaffron = new THREE.MeshStandardMaterial({
      map: awningSaffronTex,
      roughness: 0.82,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });

    this.burlapSack = new THREE.MeshStandardMaterial({
      map: burlapTex,
      roughness: 0.92,
      metalness: 0.02,
    });

    this.ceramicTile = new THREE.MeshStandardMaterial({
      map: tileTex,
      roughness: 0.35,
      metalness: 0.12,
    });

    this.watermelon = new THREE.MeshStandardMaterial({
      map: melonTex,
      roughness: 0.62,
      metalness: 0.04,
    });

    this.citrusOrange = new THREE.MeshStandardMaterial({
      color: 0xeb6b1c,
      roughness: 0.55,
      metalness: 0.05,
    });

    this.citrusLemon = new THREE.MeshStandardMaterial({
      color: 0xedc928,
      roughness: 0.55,
      metalness: 0.05,
    });

    this.datesGloss = new THREE.MeshStandardMaterial({
      color: 0x221107,
      roughness: 0.28,
      metalness: 0.15,
    });

    this.polishedBrass = new THREE.MeshStandardMaterial({
      color: 0xddae42,
      roughness: 0.2,
      metalness: 0.92,
    });

    this.turquoiseGlaze = new THREE.MeshStandardMaterial({
      color: 0x1b949c,
      roughness: 0.22,
      metalness: 0.12,
    });

    this.cobaltGlaze = new THREE.MeshStandardMaterial({
      color: 0x183b78,
      roughness: 0.22,
      metalness: 0.12,
    });

    const flagTex = createUAEFlagTexture();
    this.uaeFlag = new THREE.MeshStandardMaterial({
      map: flagTex,
      roughness: 0.65,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });

    // Populate lookup set of all shared materials for fast ownership checking
    const self = this as unknown as Record<string, unknown>;
    for (const key of Object.keys(self)) {
      if (self[key] instanceof THREE.Material) {
        this.allMaterialsSet.add(self[key] as THREE.Material);
      }
    }
  }

  public isShared(mat: THREE.Material): boolean {
    return this.allMaterialsSet.has(mat);
  }

  public dispose(): void {
    this.isDestroyed = true;
    for (const mat of this.allMaterialsSet) {
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
      mat.dispose();
    }
    this.allMaterialsSet.clear();
  }
}

/**
 * 1. Player Character: Solid Metallic Golden Astrolabe Sphere (3-12 parts)
 */
export function createAstrolabePlayer(materials: SharedMaterials): {
  group: THREE.Group;
  sphere: THREE.Mesh;
  outerRing1: THREE.Mesh;
  outerRing2: THREE.Mesh;
  shadowDisc: THREE.Mesh;
} {
  const group = new THREE.Group();

  // Central Golden Sphere (radius 1.0)
  const sphereGeo = new THREE.SphereGeometry(1.0, 32, 24);
  const sphere = new THREE.Mesh(sphereGeo, materials.astrolabe);
  sphere.castShadow = true;
  group.add(sphere);

  // Outer Gimbal Brass Ring 1 (Torus)
  const ringGeo1 = new THREE.TorusGeometry(1.22, 0.045, 12, 48);
  const outerRing1 = new THREE.Mesh(ringGeo1, materials.brassMetal);
  outerRing1.rotation.x = Math.PI / 4;
  group.add(outerRing1);

  // Outer Gimbal Brass Ring 2 (Torus)
  const ringGeo2 = new THREE.TorusGeometry(1.36, 0.045, 12, 48);
  const outerRing2 = new THREE.Mesh(ringGeo2, materials.brassMetal);
  outerRing2.rotation.y = Math.PI / 3;
  group.add(outerRing2);

  // North and South Pole Celestial Finials
  const finialGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.2, 12);
  const finial = new THREE.Mesh(finialGeo, materials.goldMetal);
  sphere.add(finial);

  // Contact shadow disc on the ground
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d')!;
  const sGrad = sCtx.createRadialGradient(64, 64, 5, 64, 64, 64);
  sGrad.addColorStop(0, 'rgba(15, 10, 5, 0.65)');
  sGrad.addColorStop(0.5, 'rgba(25, 15, 8, 0.35)');
  sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 128, 128);

  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowGeo = new THREE.PlaneGeometry(2.8, 2.8);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = -0.96;
  group.add(shadowDisc);

  return { group, sphere, outerRing1, outerRing2, shadowDisc };
}

/**
 * 2. UAE Dirham Gold Coin
 */
export function createDirhamCoinMesh(materials: SharedMaterials): THREE.Group {
  const coinGroup = new THREE.Group();

  // Cylinder coin body (radius 0.6, height 0.1)
  const cylinderGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 24);
  const coinMesh = new THREE.Mesh(cylinderGeo, materials.dirhamCoin);
  coinMesh.rotation.x = Math.PI / 2;
  coinGroup.add(coinMesh);

  // Bevel outer ring
  const rimGeo = new THREE.TorusGeometry(0.6, 0.04, 8, 24);
  const rimMesh = new THREE.Mesh(rimGeo, materials.goldMetal);
  coinGroup.add(rimMesh);

  return coinGroup;
}

/**
 * 3. Overhead Chandal Beam with Fanous Lantern
 */
export function createOverheadBeamWithLantern(materials: SharedMaterials, width = 14.0): THREE.Group {
  const group = new THREE.Group();

  // Rough Chandal wooden beam spanning street
  const beamGeo = new THREE.CylinderGeometry(0.2, 0.22, width, 10);
  const beam = new THREE.Mesh(beamGeo, materials.teakWood);
  beam.rotation.z = Math.PI / 2;
  group.add(beam);

  // Suspended Fanous Lantern in center
  const chainGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6);
  const chain = new THREE.Mesh(chainGeo, materials.brassMetal);
  chain.position.y = -0.7;
  group.add(chain);

  // Lantern brass top cap
  const capGeo = new THREE.ConeGeometry(0.35, 0.35, 8);
  const cap = new THREE.Mesh(capGeo, materials.brassMetal);
  cap.position.y = -1.4;
  group.add(cap);

  // Lantern glass enclosure
  const glassGeo = new THREE.OctahedronGeometry(0.32);
  const glass = new THREE.Mesh(glassGeo, materials.lanternGlass);
  glass.position.y = -1.75;
  group.add(glass);

  // Lantern bottom base
  const baseGeo = new THREE.ConeGeometry(0.25, 0.25, 8);
  const base = new THREE.Mesh(baseGeo, materials.brassMetal);
  base.rotation.x = Math.PI;
  base.position.y = -2.05;
  group.add(base);

  return group;
}

/**
 * 4. Barjeel Windtower (Traditional Emirati passive cooling architectural tower)
 */
export function createBarjeelWindtower(materials: SharedMaterials): THREE.Group {
  const tower = new THREE.Group();

  // Main square tower shaft (rising to 18m)
  const shaftGeo = new THREE.BoxGeometry(4.2, 18.0, 4.2);
  const shaft = new THREE.Mesh(shaftGeo, materials.coralStone);
  shaft.position.y = 9.0;
  tower.add(shaft);

  // 4-way cross-ventilation vents near top
  const ventMat = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.95 });
  const ventGeo = new THREE.BoxGeometry(2.4, 3.8, 4.3);
  const vent = new THREE.Mesh(ventGeo, ventMat);
  vent.position.y = 15.0;
  tower.add(vent);

  // Protruding horizontal Chandal wooden poles (characteristic of Al Fahidi)
  for (let level = 12; level <= 17; level += 2.2) {
    const pole1Geo = new THREE.CylinderGeometry(0.1, 0.1, 6.2, 8);
    const pole1 = new THREE.Mesh(pole1Geo, materials.teakWood);
    pole1.rotation.z = Math.PI / 2;
    pole1.position.y = level;
    tower.add(pole1);

    const pole2 = new THREE.Mesh(pole1Geo, materials.teakWood);
    pole2.rotation.x = Math.PI / 2;
    pole2.position.y = level;
    tower.add(pole2);
  }

  // Decorative stepped parapet top
  const capGeo = new THREE.BoxGeometry(4.6, 0.8, 4.6);
  const cap = new THREE.Mesh(capGeo, materials.coralStone);
  cap.position.y = 18.4;
  tower.add(cap);

  return tower;
}

/**
 * 5. Tall Date Palm Tree
 */
export function createDatePalmTree(materials: SharedMaterials): THREE.Group {
  const palm = new THREE.Group();

  // Segmented textured curved trunk
  const trunkSegments = 10;
  const trunkGroup = new THREE.Group();
  let currentY = 0;
  for (let i = 0; i < trunkSegments; i++) {
    const rBottom = 0.55 - i * 0.02;
    const rTop = 0.51 - i * 0.02;
    const segGeo = new THREE.CylinderGeometry(rTop, rBottom, 1.2, 10);
    const seg = new THREE.Mesh(segGeo, materials.palmTrunk);
    seg.position.set(Math.sin(i * 0.22) * 0.35, currentY + 0.6, 0);
    seg.rotation.z = -Math.sin(i * 0.15) * 0.08;
    trunkGroup.add(seg);
    currentY += 1.15;
  }
  palm.add(trunkGroup);

  // 8 spreading arching palm fronds
  const topY = currentY;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8;
    const frondGroup = new THREE.Group();
    frondGroup.position.set(0, topY, 0);
    frondGroup.rotation.y = angle;

    // Curved frond spine & leaves
    const frondGeo = new THREE.PlaneGeometry(0.9, 4.2, 4, 8);
    const frond = new THREE.Mesh(frondGeo, materials.palmFrond);
    frond.position.set(0, 0.5, 1.8);
    frond.rotation.x = 0.85;
    frondGroup.add(frond);

    palm.add(frondGroup);
  }

  return palm;
}

/**
 * 6. Authentic Emirati Heritage Dallah Coffee Pot (Collectible/Majlis Feature)
 */
export function createDallahCoffeePot(materials: SharedMaterials): THREE.Group {
  const dallah = new THREE.Group();

  // Flared pedestal base
  const baseGeo = new THREE.CylinderGeometry(0.4, 0.55, 0.3, 16);
  const base = new THREE.Mesh(baseGeo, materials.goldMetal);
  base.position.y = 0.15;
  dallah.add(base);

  // Tapered graceful body
  const bodyGeo = new THREE.CylinderGeometry(0.28, 0.42, 0.9, 16);
  const body = new THREE.Mesh(bodyGeo, materials.goldMetal);
  body.position.y = 0.72;
  dallah.add(body);

  // Slender upper neck
  const neckGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.6, 16);
  const neck = new THREE.Mesh(neckGeo, materials.goldMetal);
  neck.position.y = 1.45;
  dallah.add(neck);

  // Eagle-beak curved spout
  const spoutGeo = new THREE.ConeGeometry(0.08, 0.75, 12);
  const spout = new THREE.Mesh(spoutGeo, materials.goldMetal);
  spout.position.set(0.36, 1.45, 0);
  spout.rotation.z = -Math.PI / 3.2;
  dallah.add(spout);

  // High arched brass handle
  const handleGeo = new THREE.TorusGeometry(0.48, 0.04, 8, 20, Math.PI * 1.1);
  const handle = new THREE.Mesh(handleGeo, materials.goldMetal);
  handle.position.set(-0.38, 1.1, 0);
  handle.rotation.z = -Math.PI / 1.8;
  dallah.add(handle);

  // Tall cone lid finial
  const lidGeo = new THREE.ConeGeometry(0.24, 0.65, 16);
  const lid = new THREE.Mesh(lidGeo, materials.goldMetal);
  lid.position.y = 2.05;
  dallah.add(lid);

  return dallah;
}

/**
 * 7. Composite Procedural 3D Pumpkin
 */
export function create3DPumpkin(
  materials: SharedMaterials,
  scale = 1.0,
  rollAngle = 0,
  tiltX = 0,
  tiltZ = 0,
): THREE.Group {
  const pumpkinGroup = new THREE.Group();

  // Squat ribbed body (radius 0.52 scaled horizontally for organic pumpkin squatness)
  const bodyGeo = new THREE.SphereGeometry(0.52 * scale, 24, 20);
  bodyGeo.scale(1.22, 0.9, 1.22);
  const body = new THREE.Mesh(bodyGeo, materials.pumpkin);
  body.castShadow = true;
  body.receiveShadow = true;
  pumpkinGroup.add(body);

  // Curved organic stem
  const stemGeo = new THREE.CylinderGeometry(0.06 * scale, 0.1 * scale, 0.35 * scale, 8);
  const stem = new THREE.Mesh(stemGeo, materials.pumpkinStem);
  stem.position.set(0, 0.48 * scale, 0);
  stem.rotation.z = 0.25;
  stem.rotation.x = -0.15;
  pumpkinGroup.add(stem);

  // Contact shadow disc underneath pumpkin
  const shadowGeo = new THREE.CircleGeometry(0.55 * scale, 12);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x140d06,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.42 * scale + 0.01;
  pumpkinGroup.add(shadow);

  pumpkinGroup.rotation.y = rollAngle;
  pumpkinGroup.rotation.x = tiltX;
  pumpkinGroup.rotation.z = tiltZ;
  pumpkinGroup.position.y = 0.44 * scale;

  return pumpkinGroup;
}

/**
 * 8. Authentic Wooden Merchant Handcart (3-12 parts)
 */
export function createMerchantHandcart(
  materials: SharedMaterials,
  isTipped = false,
  includeCargo = true,
): THREE.Group {
  const cart = new THREE.Group();

  // Cargo Bed (weathered wooden planks)
  const bedGeo = new THREE.BoxGeometry(2.4, 0.12, 1.4);
  const bed = new THREE.Mesh(bedGeo, materials.cartWood);
  bed.castShadow = true;
  bed.position.y = 0.85;
  cart.add(bed);

  // Side Rails (weathered timber slats)
  const railGeo = new THREE.BoxGeometry(2.4, 0.35, 0.08);
  const railLeft = new THREE.Mesh(railGeo, materials.cartWood);
  railLeft.position.set(0, 1.05, 0.66);
  cart.add(railLeft);

  const railRight = new THREE.Mesh(railGeo, materials.cartWood);
  railRight.position.set(0, 1.05, -0.66);
  cart.add(railRight);

  const backRailGeo = new THREE.BoxGeometry(0.08, 0.35, 1.4);
  const backRail = new THREE.Mesh(backRailGeo, materials.cartWood);
  backRail.position.set(-1.16, 1.05, 0);
  cart.add(backRail);

  // Heavy timber axle
  const axleGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.7, 8);
  const axle = new THREE.Mesh(axleGeo, materials.cartWood);
  axle.rotation.x = Math.PI / 2;
  axle.position.set(0.1, 0.55, 0);
  cart.add(axle);

  // Twin large wooden spoked wheels with iron rims
  const wheelRadius = 0.55;
  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.1, 16);
  const rimGeo = new THREE.TorusGeometry(wheelRadius, 0.04, 6, 16);

  // Left Wheel
  const wheelL = new THREE.Group();
  const discL = new THREE.Mesh(wheelGeo, materials.cartWood);
  discL.rotation.x = Math.PI / 2;
  wheelL.add(discL);
  const rimL = new THREE.Mesh(rimGeo, materials.ironWheel);
  wheelL.add(rimL);
  // Spokes
  for (let s = 0; s < 4; s++) {
    const spokeGeo = new THREE.BoxGeometry(wheelRadius * 1.8, 0.04, 0.04);
    const spoke = new THREE.Mesh(spokeGeo, materials.cartWood);
    spoke.rotation.z = (s * Math.PI) / 4;
    wheelL.add(spoke);
  }
  wheelL.position.set(0.1, 0.55, 0.88);
  cart.add(wheelL);

  // Right Wheel
  const wheelR = wheelL.clone();
  wheelR.position.set(0.1, 0.55, -0.88);
  cart.add(wheelR);

  // Pulling Handles / Shafts
  const handleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6);
  const handleL = new THREE.Mesh(handleGeo, materials.cartWood);
  handleL.rotation.z = Math.PI / 2.3;
  handleL.position.set(1.6, 0.75, 0.45);
  cart.add(handleL);

  const handleR = new THREE.Mesh(handleGeo, materials.cartWood);
  handleR.rotation.z = Math.PI / 2.3;
  handleR.position.set(1.6, 0.75, -0.45);
  cart.add(handleR);

  // Support kickstand leg
  const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.65, 6);
  const leg = new THREE.Mesh(legGeo, materials.cartWood);
  leg.position.set(1.0, 0.35, 0);
  cart.add(leg);

  // If cart is tipped over in a spill
  if (isTipped) {
    cart.rotation.z = -0.32;
    cart.rotation.x = 0.28;
    cart.position.y = -0.25;
  }

  // Cargo in cart (crates or sacks)
  if (includeCargo && !isTipped) {
    const crateGeo = new THREE.BoxGeometry(0.7, 0.5, 0.8);
    const crate = new THREE.Mesh(crateGeo, materials.cartWood);
    crate.position.set(-0.4, 1.2, 0);
    cart.add(crate);
  }

  return cart;
}


/**
 * Procedural 3D Watermelon
 */
export function create3DWatermelon(materials: SharedMaterials, scale = 1.0): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(0.48 * scale, 18, 16);
  geo.scale(1.25, 0.95, 0.95);
  const melon = new THREE.Mesh(geo, materials.watermelon);
  melon.castShadow = true;
  group.add(melon);

  const stemGeo = new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 0.22 * scale, 6);
  const stem = new THREE.Mesh(stemGeo, materials.pumpkinStem);
  stem.position.set(0.52 * scale, 0.08 * scale, 0);
  stem.rotation.z = Math.PI / 2.5;
  group.add(stem);

  group.position.y = 0.45 * scale;
  return group;
}

/**
 * Procedural 3D Open Burlap Spice Sack with mounded spice and brass scoop
 */
export function create3DBurlapSpiceSack(
  materials: SharedMaterials,
  spiceMat: THREE.Material,
  scale = 1.0,
): THREE.Group {
  const sack = new THREE.Group();

  // Burlap cylindrical bag body
  const bodyGeo = new THREE.CylinderGeometry(0.42 * scale, 0.38 * scale, 0.65 * scale, 16);
  const body = new THREE.Mesh(bodyGeo, materials.burlapSack);
  body.castShadow = true;
  body.position.y = 0.32 * scale;
  sack.add(body);

  // Rolled fabric collar rim
  const rimGeo = new THREE.TorusGeometry(0.42 * scale, 0.06 * scale, 8, 16);
  const rim = new THREE.Mesh(rimGeo, materials.burlapSack);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.64 * scale;
  sack.add(rim);

  // Mounded conical pile of aromatic spice
  const spiceGeo = new THREE.ConeGeometry(0.4 * scale, 0.38 * scale, 16);
  const spice = new THREE.Mesh(spiceGeo, spiceMat);
  spice.position.y = 0.72 * scale;
  sack.add(spice);

  // Brass measuring scoop sticking out
  const scoopHandleGeo = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, 0.35 * scale, 6);
  const scoop = new THREE.Mesh(scoopHandleGeo, materials.polishedBrass);
  scoop.position.set(0.12 * scale, 0.85 * scale, 0.08 * scale);
  scoop.rotation.z = -0.4;
  sack.add(scoop);

  return sack;
}

/**
 * Procedural 3D Middle Eastern Amphora / Ceramic Water Jar (Zir)
 */
export function create3DAmphora(
  materials: SharedMaterials,
  type: 'terracotta' | 'turquoise' | 'cobalt' = 'terracotta',
  scale = 1.0,
): THREE.Group {
  const pot = new THREE.Group();
  const mat =
    type === 'turquoise'
      ? materials.turquoiseGlaze
      : type === 'cobalt'
        ? materials.cobaltGlaze
        : materials.terracottaPot;

  // Bulbous body
  const bodyGeo = new THREE.SphereGeometry(0.42 * scale, 16, 14);
  bodyGeo.scale(1.0, 1.35, 1.0);
  const body = new THREE.Mesh(bodyGeo, mat);
  body.castShadow = true;
  body.position.y = 0.52 * scale;
  pot.add(body);

  // Narrow neck
  const neckGeo = new THREE.CylinderGeometry(0.16 * scale, 0.22 * scale, 0.35 * scale, 12);
  const neck = new THREE.Mesh(neckGeo, mat);
  neck.position.y = 1.02 * scale;
  pot.add(neck);

  // Flared mouth rim
  const rimGeo = new THREE.TorusGeometry(0.18 * scale, 0.035 * scale, 6, 14);
  const rim = new THREE.Mesh(rimGeo, mat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 1.18 * scale;
  pot.add(rim);

  // Twin arched handles
  for (const side of [-1, 1]) {
    const handleGeo = new THREE.TorusGeometry(0.18 * scale, 0.03 * scale, 6, 10, Math.PI);
    const handle = new THREE.Mesh(handleGeo, mat);
    handle.position.set(side * 0.36 * scale, 0.85 * scale, 0);
    handle.rotation.z = side * (Math.PI / 2);
    pot.add(handle);
  }

  return pot;
}

/**
 * Procedural 3D Fruit / Produce Crate packed with goods
 */
export function create3DFruitCrate(
  materials: SharedMaterials,
  fruitType: 'pumpkins' | 'watermelons' | 'citrus' | 'dates' = 'citrus',
  scale = 1.0,
): THREE.Group {
  const crateGroup = new THREE.Group();

  // Slatted wooden crate
  const crateGeo = new THREE.BoxGeometry(1.0 * scale, 0.55 * scale, 0.8 * scale);
  const crate = new THREE.Mesh(crateGeo, materials.cartWood);
  crate.castShadow = true;
  crate.position.y = 0.28 * scale;
  crateGroup.add(crate);

  // Packed fruit contents
  if (fruitType === 'pumpkins') {
    const p1 = create3DPumpkin(materials, 0.55 * scale);
    p1.position.set(-0.2 * scale, 0.42 * scale, 0);
    crateGroup.add(p1);
    const p2 = create3DPumpkin(materials, 0.52 * scale);
    p2.position.set(0.22 * scale, 0.42 * scale, 0);
    crateGroup.add(p2);
  } else if (fruitType === 'watermelons') {
    const m1 = create3DWatermelon(materials, 0.55 * scale);
    m1.position.set(-0.22 * scale, 0.38 * scale, 0);
    crateGroup.add(m1);
    const m2 = create3DWatermelon(materials, 0.52 * scale);
    m2.position.set(0.22 * scale, 0.38 * scale, 0);
    crateGroup.add(m2);
  } else if (fruitType === 'citrus') {
    // 8 round oranges / lemons heaped in crate
    for (let i = 0; i < 6; i++) {
      const isOrange = i % 2 === 0;
      const cGeo = new THREE.SphereGeometry(0.14 * scale, 8, 8);
      const cMesh = new THREE.Mesh(cGeo, isOrange ? materials.citrusOrange : materials.citrusLemon);
      const cx = ((i % 3) - 1) * 0.26 * scale;
      const cz = (Math.floor(i / 3) - 0.5) * 0.28 * scale;
      cMesh.position.set(cx, 0.5 * scale, cz);
      crateGroup.add(cMesh);
    }
  } else {
    // Glossy dates heap
    const heapGeo = new THREE.BoxGeometry(0.85 * scale, 0.2 * scale, 0.65 * scale);
    const heap = new THREE.Mesh(heapGeo, materials.datesGloss);
    heap.position.y = 0.48 * scale;
    crateGroup.add(heap);
  }

  return crateGroup;
}

/**
 * Procedural 3D Hanging Arabic Fanous Lantern with amber glow
 */
export function createHangingLantern(materials: SharedMaterials, scale = 1.0): THREE.Group {
  const lantern = new THREE.Group();

  // Top hanging ring & chain
  const chainGeo = new THREE.CylinderGeometry(0.015 * scale, 0.015 * scale, 0.45 * scale, 6);
  const chain = new THREE.Mesh(chainGeo, materials.ironWheel);
  chain.position.y = 0.8 * scale;
  lantern.add(chain);

  // Brass domed cap
  const capGeo = new THREE.ConeGeometry(0.2 * scale, 0.22 * scale, 8);
  const cap = new THREE.Mesh(capGeo, materials.brassMetal);
  cap.position.y = 0.5 * scale;
  lantern.add(cap);

  // Amber glass hexagonal chamber
  const glassGeo = new THREE.CylinderGeometry(0.18 * scale, 0.14 * scale, 0.38 * scale, 6);
  const glass = new THREE.Mesh(glassGeo, materials.lanternGlass);
  glass.position.y = 0.24 * scale;
  lantern.add(glass);

  // Brass base
  const baseGeo = new THREE.CylinderGeometry(0.15 * scale, 0.18 * scale, 0.1 * scale, 6);
  const base = new THREE.Mesh(baseGeo, materials.brassMetal);
  base.position.y = 0.02 * scale;
  lantern.add(base);

  return lantern;
}

/**
 * 9. Realistic Open Souq Market Storefront (Continuous Bazaar on Left & Right)
 */
export type SouqType = 'grocery' | 'textile' | 'spice' | 'gahwa' | 'pottery' | 'antiques';

export function createOpenMarketShop(
  type: SouqType,
  isLeft: boolean,
  materials: SharedMaterials,
): THREE.Group {
  const shop = new THREE.Group();
  // recessSign: points away from track into shop interior (-1 for left shop, +1 for right shop)
  const recessSign = isLeft ? -1 : 1;
  // streetSign: points towards street center (+1 for left shop, -1 for right shop)
  const streetSign = isLeft ? 1 : -1;

  // Signboard titles based on authentic 19th-century Al Fahidi souqs
  let arTitle = '';
  let enTitle = '';
  let awningMat = materials.stripedAwningTerracotta;

  if (type === 'grocery') {
    arTitle = 'سوق الخضار والتمور التراثي';
    enTitle = 'Heritage Produce & Dates';
    awningMat = materials.stripedAwningSaffron;
  } else if (type === 'textile') {
    arTitle = 'سوق الأقمشة والحرير';
    enTitle = 'Silk & Textile Souq';
    awningMat = materials.stripedAwningIndigo;
  } else if (type === 'spice') {
    arTitle = 'سوق التوابل الملكي';
    enTitle = 'Royal Spices & Oud';
    awningMat = materials.stripedAwningTerracotta;
  } else if (type === 'gahwa') {
    arTitle = 'بيت القهوة والمجلس التراثي';
    enTitle = 'Bait Al Gahwa • Coffee Courtyard';
    awningMat = materials.palmThatch;
  } else if (type === 'pottery') {
    arTitle = 'سوق الفخار والخزف';
    enTitle = 'Pottery & Ceramics Souq';
    awningMat = materials.stripedAwningTerracotta;
  } else {
    arTitle = 'سوق التحف والأنتيك';
    enTitle = 'Antiques & Curiosities';
    awningMat = materials.stripedAwningIndigo;
  }

  // 1. Deep Shop Alcove Architecture
  // Solid Back Wall of Shop
  const backWallGeo = new THREE.BoxGeometry(0.6, 6.2, 16.0);
  const backWall = new THREE.Mesh(backWallGeo, materials.coralStone);
  backWall.position.set(recessSign * 3.4, 3.1, 0);
  backWall.receiveShadow = true;
  backWall.castShadow = true;
  shop.add(backWall);

  // Side Partition Walls (separating from adjacent stalls)
  const sideWallGeo = new THREE.BoxGeometry(3.6, 6.2, 0.6);
  const sideWall1 = new THREE.Mesh(sideWallGeo, materials.coralStone);
  sideWall1.position.set(recessSign * 1.6, 3.1, -7.7);
  shop.add(sideWall1);

  const sideWall2 = new THREE.Mesh(sideWallGeo, materials.coralStone);
  sideWall2.position.set(recessSign * 1.6, 3.1, 7.7);
  shop.add(sideWall2);

  // Back Wall Arched Display Niches (lined with Iznik ceramic tiles)
  for (const zOffset of [-4.2, 4.2]) {
    const nicheTile = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), materials.ceramicTile);
    nicheTile.position.set(recessSign * 3.05, 3.0, zOffset);
    nicheTile.rotation.y = streetSign * (Math.PI / 2);
    shop.add(nicheTile);

    // Frame the tile rather than covering it with an opaque timber rectangle.
    for (const edge of [-1, 1]) {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.4, 0.12), materials.teakWood);
      jamb.position.set(recessSign * 2.97, 3.0, zOffset + edge * 1.24);
      shop.add(jamb);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 2.6), materials.teakWood);
      rail.position.set(recessSign * 2.97, 3.0 + edge * 1.66, zOffset);
      shop.add(rail);
    }
  }

  // Raised Wooden Platform Floor (Dakka)
  const floorGeo = new THREE.BoxGeometry(3.8, 0.28, 15.6);
  const floor = new THREE.Mesh(floorGeo, materials.cartWood);
  floor.position.set(recessSign * 1.5, 0.14, 0);
  shop.add(floor);

  // Shop Ceiling with exposed Chandal Timber Beams
  const ceilingGeo = new THREE.BoxGeometry(4.2, 0.35, 16.0);
  const ceiling = new THREE.Mesh(ceilingGeo, materials.coralStone);
  ceiling.position.set(recessSign * 1.4, 6.0, 0);
  ceiling.castShadow = true;
  ceiling.receiveShadow = true;
  shop.add(ceiling);

  for (let b = -7; b <= 7; b += 2.8) {
    const beamGeo = new THREE.CylinderGeometry(0.1, 0.1, 3.8, 8);
    const beam = new THREE.Mesh(beamGeo, materials.teakWood);
    beam.rotation.z = Math.PI / 2;
    beam.position.set(recessSign * 1.5, 5.75, b);
    shop.add(beam);
  }

  // 2. Open Front Facade: 3 Carved Teak Wooden Columns
  for (const zCol of [-7.0, 0, 7.0]) {
    const colGeo = new THREE.BoxGeometry(0.45, 5.8, 0.45);
    const col = new THREE.Mesh(colGeo, materials.teakWood);
    col.position.set(0, 2.9, zCol);
    col.castShadow = true;
    col.receiveShadow = true;
    shop.add(col);

    // Carved Capital / Corbel
    const capGeo = new THREE.BoxGeometry(0.7, 0.35, 0.7);
    const cap = new THREE.Mesh(capGeo, materials.teakWood);
    cap.position.set(0, 5.7, zCol);
    shop.add(cap);
  }

  // Front Arch Header / Lintel Beam
  const headerGeo = new THREE.BoxGeometry(0.65, 0.75, 16.0);
  const header = new THREE.Mesh(headerGeo, materials.teakWood);
  header.position.set(0, 5.5, 0);
  shop.add(header);

  // 3. Wooden Signboard with Calligraphy facing the street
  const signTex = createSignboardTexture(arTitle, enTitle);
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.5 });
  const signGeo = new THREE.PlaneGeometry(8.5, 1.35);
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(streetSign * 0.4, 5.5, 0);
  sign.rotation.y = streetSign * (Math.PI / 2);
  shop.add(sign);

  // 4. Vibrant Striped Bazaar Awning extending 2.4m over sidewalk
  const awningGeo = new THREE.PlaneGeometry(2.8, 15.6);
  const awning = new THREE.Mesh(awningGeo, awningMat);
  awning.position.set(streetSign * 1.3, 4.9, 0);
  awning.rotation.x = Math.PI / 2;
  awning.rotation.y = streetSign * 0.18; // Pitched forward down over sidewalk
  awning.castShadow = true;
  awning.receiveShadow = true;
  shop.add(awning);

  // Support poles holding awning up
  for (const s of [-6.8, 6.8]) {
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6);
    const pole = new THREE.Mesh(poleGeo, materials.teakWood);
    pole.position.set(streetSign * 1.3, 4.2, s);
    pole.rotation.z = streetSign * 0.55;
    shop.add(pole);

    // Lantern hanging from awning corner
    const lantern = createHangingLantern(materials, 0.9);
    lantern.position.set(streetSign * 2.3, 4.0, s);
    shop.add(lantern);
  }

  // 4B. Projecting blade signboard facing oncoming runners (especially prominent for Bait Al Gahwa destination)
  if (type === 'gahwa') {
    const bladeArm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), materials.teakWood);
    bladeArm.position.set(streetSign * 1.6, 4.4, 6.8);
    shop.add(bladeArm);

    const bladeSignTex = createSignboardTexture('بيت القهوة', 'Bait Al Gahwa ☕');
    const bladeMat = new THREE.MeshStandardMaterial({
      map: bladeSignTex,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });
    const bladeSign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.95), bladeMat);
    bladeSign.position.set(streetSign * 1.6, 3.85, 6.8);
    bladeSign.rotation.y = 0; // Perpendicular to street, faces oncoming runners
    shop.add(bladeSign);
  }

  // 5. Interior Lighting: Central glowing hanging ceiling lantern (emissive glass provides glow without shader light count churn)
  const ceilingLantern = createHangingLantern(materials, 1.1);
  ceilingLantern.position.set(recessSign * 1.2, 4.8, 0);
  shop.add(ceilingLantern);

  // 6. DENSE INTERIOR MERCHANDISE (Fully Open, Packed with Life)
  if (type === 'grocery') {
    // A. Multi-tiered angled produce display tables
    const tableGeo = new THREE.BoxGeometry(1.2, 0.85, 9.6);
    const table = new THREE.Mesh(tableGeo, materials.cartWood);
    table.position.set(recessSign * 2.1, 0.6, 0);
    shop.add(table);

    // Heaped Pumpkins on display
    for (let i = -2; i <= 2; i++) {
      const p = create3DPumpkin(materials, 0.75, i * 0.4);
      p.position.set(recessSign * 2.0, 1.15, i * 1.8);
      shop.add(p);
    }

    // Heaped Watermelons on display
    for (let i = -3; i <= 3; i += 2) {
      const m = create3DWatermelon(materials, 0.75);
      m.position.set(recessSign * 1.5, 0.55, i * 1.4);
      shop.add(m);
    }

    // Stacked crates of citrus (oranges and lemons)
    const crate1 = create3DFruitCrate(materials, 'citrus', 0.9);
    crate1.position.set(recessSign * 2.2, 0.35, -5.2);
    shop.add(crate1);

    const crate2 = create3DFruitCrate(materials, 'citrus', 0.9);
    crate2.position.set(recessSign * 2.2, 0.85, -5.2);
    shop.add(crate2);

    // Sacks of dried dates
    const dateSack = create3DBurlapSpiceSack(materials, materials.datesGloss, 1.0);
    dateSack.position.set(recessSign * 2.1, 0.28, 5.4);
    shop.add(dateSack);

    // B. Outside Sidewalk Display: Parked Merchant Handcart with Pumpkins!
    const outsideCart = createMerchantHandcart(materials, false, false);
    outsideCart.position.set(streetSign * 1.8, 0, -2.5);
    outsideCart.rotation.y = (Math.PI / 2) + (streetSign * 0.12);
    // Add pumpkins in cart bed
    const cartPumpkin = create3DPumpkin(materials, 0.82);
    cartPumpkin.position.set(0, 1.15, 0.2);
    outsideCart.add(cartPumpkin);
    shop.add(outsideCart);

    // Tilted crate of watermelons on the sidewalk
    const sidewalkCrate = create3DFruitCrate(materials, 'watermelons', 1.0);
    sidewalkCrate.position.set(streetSign * 1.7, 0, 2.8);
    sidewalkCrate.rotation.y = 0.25;
    shop.add(sidewalkCrate);

  } else if (type === 'spice') {
    // 5 Large Burlap Sacks with Heap Spice Cones (Saffron, Turmeric, Loomi, Cardamom, Cinnamon)
    const spiceMats = [
      materials.spiceSaffron,
      materials.spiceTurmeric,
      materials.spiceCardamom,
      materials.spiceLoomi,
      materials.cartWood, // cinnamon bark
    ];

    for (let i = 0; i < 5; i++) {
      const sack = create3DBurlapSpiceSack(materials, spiceMats[i], 1.05);
      sack.position.set(recessSign * 1.8, 0.28, (i - 2) * 2.2);
      shop.add(sack);
    }

    // Shelves with jars and ceramic pots on back wall
    const shelfGeo = new THREE.BoxGeometry(0.5, 0.15, 10.0);
    for (let sy of [2.0, 3.4]) {
      const shelf = new THREE.Mesh(shelfGeo, materials.teakWood);
      shelf.position.set(recessSign * 3.1, sy, 0);
      shop.add(shelf);

      for (let j = -4; j <= 4; j += 1.8) {
        const jar = create3DAmphora(materials, j % 2 === 0 ? 'terracotta' : 'turquoise', 0.45);
        jar.position.set(recessSign * 3.0, sy + 0.1, j);
        shop.add(jar);
      }
    }

    // Polished Brass Mabkhara (Incense Burner)
    const burnerGeo = new THREE.CylinderGeometry(0.25, 0.35, 0.6, 8);
    const burner = new THREE.Mesh(burnerGeo, materials.polishedBrass);
    burner.position.set(recessSign * 1.5, 0.58, 5.8);
    shop.add(burner);

    // Outside sidewalk cart with spice barrels
    const outsideCart = createMerchantHandcart(materials, false, true);
    outsideCart.position.set(streetSign * 1.8, 0, 2.0);
    outsideCart.rotation.y = (Math.PI / 2) - (streetSign * 0.15);
    shop.add(outsideCart);

    const sidewalkSack = create3DBurlapSpiceSack(materials, materials.spiceTurmeric, 0.9);
    sidewalkSack.position.set(streetSign * 1.7, 0, -3.2);
    shop.add(sidewalkSack);

  } else if (type === 'textile') {
    // Hanging woven Persian carpets along back wall
    const carpetGeo = new THREE.PlaneGeometry(5.2, 3.4);
    const carpet = new THREE.Mesh(carpetGeo, materials.persianCarpet);
    carpet.position.set(recessSign * 3.3, 3.4, 0);
    carpet.rotation.y = streetSign * (Math.PI / 2);
    shop.add(carpet);

    // Side hanging carpet
    const carpetSide = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.6), materials.saduCloth);
    carpetSide.position.set(recessSign * 1.6, 3.2, -7.3);
    shop.add(carpetSide);

    // Multi-tier wooden fabric display racks
    const rackGeo = new THREE.BoxGeometry(0.8, 1.8, 8.4);
    const rack = new THREE.Mesh(rackGeo, materials.teakWood);
    rack.position.set(recessSign * 2.0, 0.9, 0);
    shop.add(rack);

    // Stacked vibrant silk rolls (emerald, ruby, cobalt, gold, saffron)
    const silkColors = [0x991820, 0x184278, 0x1b633b, 0xd4a028, 0x6a247a, 0xc75428];
    silkColors.forEach((col, idx) => {
      const rollMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 });
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.2, 12), rollMat);
      roll.rotation.x = Math.PI / 2;
      const zPos = ((idx % 3) - 1) * 2.6;
      const yPos = 1.0 + Math.floor(idx / 3) * 0.55;
      roll.position.set(recessSign * 1.9, yPos, zPos);
      shop.add(roll);
    });

    // Plush Majlis cushions on the bench
    for (let c = -1; c <= 1; c++) {
      const cushGeo = new THREE.BoxGeometry(0.8, 0.35, 0.8);
      const cushion = new THREE.Mesh(cushGeo, materials.saduCloth);
      cushion.position.set(recessSign * 1.3, 0.45, 5.0 + c * 0.9);
      shop.add(cushion);
    }

    // Outside cart loaded with rolled carpets
    const outsideCart = createMerchantHandcart(materials, false, false);
    outsideCart.position.set(streetSign * 1.8, 0, -1.8);
    outsideCart.rotation.y = (Math.PI / 2) + (streetSign * 0.1);
    const carpetRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.8, 12), materials.persianCarpet);
    carpetRoll.rotation.x = Math.PI / 2;
    carpetRoll.position.set(0, 1.18, 0);
    outsideCart.add(carpetRoll);
    shop.add(outsideCart);

  } else if (type === 'pottery') {
    // Stepped display stands filled with amphoras and water jugs
    const standGeo = new THREE.BoxGeometry(1.2, 0.9, 10.4);
    const stand = new THREE.Mesh(standGeo, materials.cartWood);
    stand.position.set(recessSign * 2.2, 0.55, 0);
    shop.add(stand);

    // Terracotta and glazed turquoise amphoras
    for (let i = -3; i <= 3; i++) {
      const isTurquoise = Math.abs(i) % 2 === 1;
      const jug = create3DAmphora(materials, isTurquoise ? 'turquoise' : 'terracotta', 0.85);
      jug.position.set(recessSign * 2.1, 1.0, i * 1.4);
      shop.add(jug);
    }

    // Lower row of clay water pots
    for (let i = -2; i <= 2; i++) {
      const pot = create3DAmphora(materials, 'cobalt', 0.65);
      pot.position.set(recessSign * 1.4, 0.3, i * 1.8);
      shop.add(pot);
    }

    // Large ornamental brass trays (Siniyah) on back wall
    for (const zOffset of [-4.0, 4.0]) {
      const trayGeo = new THREE.CylinderGeometry(0.95, 0.95, 0.06, 24);
      const tray = new THREE.Mesh(trayGeo, materials.polishedBrass);
      tray.rotation.z = Math.PI / 2;
      tray.position.set(recessSign * 3.2, 3.6, zOffset);
      shop.add(tray);
    }

    // Outside sidewalk cart with straw and pottery
    const outsideCart = createMerchantHandcart(materials, false, true);
    outsideCart.position.set(streetSign * 1.8, 0, 1.5);
    outsideCart.rotation.y = (Math.PI / 2) + (streetSign * 0.14);
    shop.add(outsideCart);

    // Large terracotta water jar outside on sidewalk
    const bigJar = create3DAmphora(materials, 'terracotta', 1.25);
    bigJar.position.set(streetSign * 1.7, 0, -3.2);
    shop.add(bigJar);

  } else if (type === 'gahwa') {
    // Traditional carpeted Majlis floor
    const majlisCarpet = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 11.2), materials.persianCarpet);
    majlisCarpet.position.set(recessSign * 1.6, 0.29, 0);
    majlisCarpet.rotation.x = -Math.PI / 2;
    shop.add(majlisCarpet);

    // Carpeted low bench seating along back
    const benchGeo = new THREE.BoxGeometry(1.0, 0.45, 11.2);
    const bench = new THREE.Mesh(benchGeo, materials.teakWood);
    bench.position.set(recessSign * 2.8, 0.5, 0);
    shop.add(bench);

    // Bolsters / cushions on bench
    for (let c = -4; c <= 4; c += 2.2) {
      const bGeo = new THREE.CylinderGeometry(0.24, 0.24, 1.8, 10);
      const bolster = new THREE.Mesh(bGeo, materials.saduCloth);
      bolster.rotation.x = Math.PI / 2;
      bolster.position.set(recessSign * 2.7, 0.95, c);
      shop.add(bolster);
    }

    // Low brass serving table with golden Dallah coffee pot
    const tableGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.45, 16);
    const table = new THREE.Mesh(tableGeo, materials.polishedBrass);
    table.position.set(recessSign * 1.5, 0.52, 0);
    shop.add(table);

    const dallah = createDallahCoffeePot(materials);
    dallah.position.set(recessSign * 1.5, 0.75, 0);
    shop.add(dallah);

    // Small finjan cups on tray
    for (let a = 0; a < 4; a++) {
      const ang = (a * Math.PI) / 2;
      const cupGeo = new THREE.CylinderGeometry(0.08, 0.05, 0.12, 8);
      const cup = new THREE.Mesh(cupGeo, materials.goldMetal);
      cup.position.set(recessSign * 1.5 + Math.cos(ang) * 0.45, 0.8, Math.sin(ang) * 0.45);
      shop.add(cup);
    }

    // Outside sidewalk table with date bowl
    const outsideTable = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.65, 12), materials.cartWood);
    outsideTable.position.set(streetSign * 1.8, 0.32, -2.2);
    shop.add(outsideTable);

    const dateBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.15, 10), materials.polishedBrass);
    dateBowl.position.set(streetSign * 1.8, 0.72, -2.2);
    shop.add(dateBowl);

  } else {
    // Antiques & Curiosities: Brass Astrolabes, chests, spyglasses, scrolls
    const deskGeo = new THREE.BoxGeometry(1.2, 0.85, 9.6);
    const desk = new THREE.Mesh(deskGeo, materials.cartWood);
    desk.position.set(recessSign * 2.1, 0.6, 0);
    shop.add(desk);

    // Antique wooden chest with brass fittings
    const chestGeo = new THREE.BoxGeometry(1.2, 0.7, 0.8);
    const chest = new THREE.Mesh(chestGeo, materials.cartWood);
    chest.position.set(recessSign * 1.9, 1.4, -2.8);
    shop.add(chest);

    // Brass Astrolabe on display stand
    const astrolabeGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.08, 24);
    const astro = new THREE.Mesh(astrolabeGeo, materials.astrolabe);
    astro.rotation.z = Math.PI / 2.8;
    astro.position.set(recessSign * 1.8, 1.5, 0);
    shop.add(astro);

    // Antique maritime brass lantern
    const shipLamp = createHangingLantern(materials, 1.2);
    shipLamp.position.set(recessSign * 1.9, 1.05, 2.8);
    shop.add(shipLamp);

    // Outside cart loaded with vintage cargo boxes
    const outsideCart = createMerchantHandcart(materials, false, true);
    outsideCart.position.set(streetSign * 1.8, 0, 1.5);
    outsideCart.rotation.y = (Math.PI / 2) + (streetSign * 0.12);
    shop.add(outsideCart);
  }

  return shop;
}

/**
 * 10. Organic Marketplace Obstacles (Situational Accidents - ZERO CONES)
 */
export function createObstacleMesh(type: string, materials: SharedMaterials): THREE.Group {
  const group = new THREE.Group();

  switch (type) {
    case 'pumpkin_cart_spill': {
      // 1. The Grocery Store Cart & Pumpkin Spill (Requested by user)
      // Tipped wooden grocery handcart by the shop doorstep
      const tippedCart = createMerchantHandcart(materials, true, false);
      tippedCart.position.set(1.4, 0.1, 0.8);
      tippedCart.rotation.y = -0.4;
      group.add(tippedCart);

      // Overturned wooden produce crate
      const crateGeo = new THREE.BoxGeometry(1.1, 0.6, 0.8);
      const crate = new THREE.Mesh(crateGeo, materials.cartWood);
      crate.position.set(-0.6, 0.3, 0.2);
      crate.rotation.y = 0.5;
      crate.rotation.z = 0.35;
      crate.castShadow = true;
      group.add(crate);

      // 4 Realistic 3D Pumpkins spilled into the lane (player jumps over them!)
      const pumpkin1 = create3DPumpkin(materials, 1.05, 0.4, 0.1, -0.15);
      pumpkin1.position.set(0, 0, 0); // Center of lane
      group.add(pumpkin1);

      const pumpkin2 = create3DPumpkin(materials, 0.85, 1.2, -0.2, 0.1);
      pumpkin2.position.set(0.75, 0, -0.4);
      group.add(pumpkin2);

      const pumpkin3 = create3DPumpkin(materials, 0.92, -0.8, 0.15, 0.25);
      pumpkin3.position.set(-0.7, 0, 0.45);
      group.add(pumpkin3);

      const pumpkin4 = create3DPumpkin(materials, 0.72, 2.1, 0.1, -0.2);
      pumpkin4.position.set(0.35, 0, 0.65);
      group.add(pumpkin4);
      break;
    }

    case 'spice_sack_spill': {
      // 2. Spice Merchant Cart Mishap
      // Overturned timber barrow
      const barrowBedGeo = new THREE.BoxGeometry(1.6, 0.1, 1.0);
      const barrowBed = new THREE.Mesh(barrowBedGeo, materials.cartWood);
      barrowBed.position.set(0.8, 0.35, 0.2);
      barrowBed.rotation.z = -0.45;
      barrowBed.castShadow = true;
      group.add(barrowBed);

      // Overturned burlap sacks with conical spice mounds spilling across the cobblestones
      const sackGeo = new THREE.CylinderGeometry(0.44, 0.52, 0.75, 12);
      const sackMat = new THREE.MeshStandardMaterial({ color: 0xba9a6d, roughness: 0.95 });

      // Saffron spilled sack
      const sack1 = new THREE.Mesh(sackGeo, sackMat);
      sack1.position.set(-0.4, 0.32, -0.2);
      sack1.rotation.z = Math.PI / 2.8;
      sack1.castShadow = true;
      group.add(sack1);

      const saffronMound = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.45, 12), materials.spiceSaffron);
      saffronMound.position.set(0.1, 0.22, -0.2);
      group.add(saffronMound);

      // Turmeric spilled sack
      const sack2 = new THREE.Mesh(sackGeo, sackMat);
      sack2.position.set(0.45, 0.32, 0.35);
      sack2.rotation.z = -Math.PI / 3.0;
      sack2.castShadow = true;
      group.add(sack2);

      const turmericMound = new THREE.Mesh(new THREE.ConeGeometry(0.68, 0.45, 12), materials.spiceTurmeric);
      turmericMound.position.set(-0.1, 0.22, 0.35);
      group.add(turmericMound);

      // Loomi lime sack
      const sack3 = new THREE.Mesh(sackGeo, sackMat);
      sack3.position.set(-0.6, 0.38, 0.4);
      sack3.castShadow = true;
      group.add(sack3);
      break;
    }

    case 'pottery_pallet_spill': {
      // 3. Pottery Merchant Pallet Mishap
      // Tilted wooden pallet
      const palletGeo = new THREE.BoxGeometry(1.8, 0.14, 1.2);
      const pallet = new THREE.Mesh(palletGeo, materials.cartWood);
      pallet.position.set(0.5, 0.2, 0);
      pallet.rotation.z = -0.25;
      pallet.castShadow = true;
      group.add(pallet);

      // Overturned terracotta amphoras (Zir) rolling across lane
      for (let i = -1; i <= 1; i++) {
        const potGeo = new THREE.SphereGeometry(0.38, 14, 14);
        potGeo.scale(1, 1.4, 1);
        const pot = new THREE.Mesh(potGeo, materials.terracottaPot);
        pot.position.set(i * 0.7, 0.35, (i % 2 === 0 ? 0.2 : -0.2));
        pot.rotation.z = Math.PI / 2.2;
        pot.rotation.y = i * 0.6;
        pot.castShadow = true;
        group.add(pot);
      }
      break;
    }

    case 'carpet_roll_spill': {
      // 4. Carpet Vendor Transport Spill
      // Tipped handcart frame
      const frameGeo = new THREE.BoxGeometry(2.2, 0.1, 0.9);
      const frame = new THREE.Mesh(frameGeo, materials.cartWood);
      frame.position.set(0.3, 0.2, 0.4);
      frame.rotation.z = -0.3;
      group.add(frame);

      // Stacked rolls of heavy Persian rugs fallen across the lane
      const rugGeo = new THREE.CylinderGeometry(0.26, 0.26, 2.2, 16);
      const colors = [0x8b1e22, 0x1d3d63, 0x1c5938];
      colors.forEach((col, idx) => {
        const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.85 });
        const rug = new THREE.Mesh(rugGeo, mat);
        rug.rotation.z = Math.PI / 2;
        rug.position.set(0, 0.28 + idx * 0.26, (idx % 2 - 0.5) * 0.35);
        rug.castShadow = true;
        group.add(rug);
      });
      break;
    }

    case 'dates_citrus_crates':
    default: {
      // 5. Fresh Dates & Fruit Baskets Mishap
      // Overturned timber fruit crates
      const crate1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.55, 0.9), materials.cartWood);
      crate1.position.set(-0.3, 0.28, 0);
      crate1.rotation.y = 0.4;
      crate1.castShadow = true;
      group.add(crate1);

      const crate2 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.8), materials.cartWood);
      crate2.position.set(0.55, 0.25, 0.2);
      crate2.rotation.z = 0.35;
      crate2.rotation.y = -0.3;
      crate2.castShadow = true;
      group.add(crate2);

      // Overturned wicker basket
      const basketGeo = new THREE.CylinderGeometry(0.45, 0.3, 0.4, 12, 1, true);
      const basket = new THREE.Mesh(basketGeo, materials.cartWood);
      basket.position.set(0.2, 0.2, -0.4);
      basket.rotation.z = Math.PI / 2;
      group.add(basket);

      // Dark Arabian dates spilled on the ground
      for (let d = 0; d < 8; d++) {
        const dateGeo = new THREE.SphereGeometry(0.12, 8, 8);
        dateGeo.scale(1, 1.8, 1);
        const dateMesh = new THREE.Mesh(dateGeo, materials.dateFruit);
        dateMesh.position.set(
          (Math.random() - 0.5) * 1.2,
          0.12,
          (Math.random() - 0.5) * 0.8,
        );
        dateMesh.rotation.z = Math.PI / 2;
        group.add(dateMesh);
      }
      break;
    }
  }

  return group;
}
