/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { getTrackCurve, HALF_ROAD } from './trackMath';
import { disposeHierarchy } from './sceneResources';
import { WindClothActor, globalWind } from './wind';
import { MerchantRig } from './merchantCharacter';
import { SceneryPool, PooledShopItem } from './sceneryPool';
import { createResidentialFacade, createMarketGateway } from './streetArchitecture';
import { MarketBirds } from './marketBirds';
import { batchStaticMeshes } from './staticBatch';
import {
  SharedMaterials,
  createBarjeelWindtower,
  createDatePalmTree,
  createOverheadBeamWithLantern,
  createDirhamCoinMesh,
  SouqType,
} from './proceduralModels';

export const CHUNK_LENGTH = 40;
export const SUBDIVISIONS = 16;
export const TOTAL_CHUNKS = 8; // 320m ring: 60m behind, at least 240m ahead

export interface ActiveObstacle {
  mesh: THREE.Group;
  type: string;
  lane: number;
  worldZ: number;
  worldX: number;
  worldY: number;
  hit: boolean;
}

export interface ActiveCoin {
  mesh: THREE.Group;
  lane: number;
  worldZ: number;
  worldX: number;
  worldY: number;
  collected: boolean;
}

export class SikkaChunk {
  public group: THREE.Group;
  public startZ: number = 0;
  public endZ: number = 0;
  public chunkIndex: number = 0;
  private readonly slotIndex: number;

  // Ribbon Geometries
  private roadGeo: THREE.BufferGeometry;
  private leftWallGeo: THREE.BufferGeometry;
  private rightWallGeo: THREE.BufferGeometry;
  private leftCurbGeo: THREE.BufferGeometry;
  private rightCurbGeo: THREE.BufferGeometry;
  private parapetGeo: THREE.BufferGeometry;

  // Ribbon Meshes
  private roadMesh: THREE.Mesh;
  private leftWallMesh: THREE.Mesh;
  private rightWallMesh: THREE.Mesh;
  private leftCurbMesh: THREE.Mesh;
  private rightCurbMesh: THREE.Mesh;
  private parapetMesh: THREE.Mesh;

  // Decorations container and reusable feature instances
  private decorGroup: THREE.Group;
  private overheadBeam: THREE.Group;
  private tower: THREE.Group;
  private palm: THREE.Group;
  private coinMeshes: THREE.Group[];
  private facades: THREE.Group[];
  private gateway: THREE.Group | null;
  private birds: MarketBirds | null;
  private birdWorldZ = 0;

  // Dynamic pooled shops and obstacles
  private currentLeftShop: { type: SouqType | 'showcase_textile'; item: PooledShopItem } | null = null;
  private currentRightShop: { type: SouqType | 'showcase_textile'; item: PooledShopItem } | null = null;
  private currentObstacles: Array<{ type: string; mesh: THREE.Group }> = [];

  private obstacles: ActiveObstacle[] = [];
  private coins: ActiveCoin[] = [];
  private windActors: WindClothActor[] = [];
  private merchants: MerchantRig[] = [];
  private materials: SharedMaterials;
  private sceneryPool: SceneryPool;

  constructor(chunkIndex: number, materials: SharedMaterials, sceneryPool?: SceneryPool) {
    this.chunkIndex = chunkIndex;
    this.slotIndex = chunkIndex;
    this.materials = materials;
    this.sceneryPool = sceneryPool || new SceneryPool(materials);
    this.group = new THREE.Group();
    this.decorGroup = new THREE.Group();

    // Allocate BufferGeometries with pre-sized typed arrays for 16 subdivisions (17 vertex steps)
    const vertCount = (SUBDIVISIONS + 1) * 2;
    const indexCount = SUBDIVISIONS * 6;

    this.roadGeo = this.createRibbonGeometry(vertCount, indexCount);
    this.leftWallGeo = this.createRibbonGeometry(vertCount, indexCount);
    this.rightWallGeo = this.createRibbonGeometry(vertCount, indexCount);
    this.leftCurbGeo = this.createRibbonGeometry(vertCount, indexCount);
    this.rightCurbGeo = this.createRibbonGeometry(vertCount, indexCount);
    this.parapetGeo = this.createRibbonGeometry(vertCount, indexCount);

    this.roadMesh = new THREE.Mesh(this.roadGeo, materials.flagstone);
    this.roadMesh.receiveShadow = true;
    this.roadMesh.frustumCulled = false;
    this.group.add(this.roadMesh);

    this.leftWallMesh = new THREE.Mesh(this.leftWallGeo, materials.coralStone);
    this.leftWallMesh.receiveShadow = true;
    this.leftWallMesh.frustumCulled = false;
    this.group.add(this.leftWallMesh);

    this.rightWallMesh = new THREE.Mesh(this.rightWallGeo, materials.coralStone);
    this.rightWallMesh.receiveShadow = true;
    this.rightWallMesh.frustumCulled = false;
    this.group.add(this.rightWallMesh);

    this.leftCurbMesh = new THREE.Mesh(this.leftCurbGeo, materials.teakWood);
    this.leftCurbMesh.frustumCulled = false;
    this.group.add(this.leftCurbMesh);

    this.rightCurbMesh = new THREE.Mesh(this.rightCurbGeo, materials.teakWood);
    this.rightCurbMesh.frustumCulled = false;
    this.group.add(this.rightCurbMesh);

    this.parapetMesh = new THREE.Mesh(this.parapetGeo, materials.coralStone);
    this.parapetMesh.frustumCulled = false;
    this.group.add(this.parapetMesh);

    // Pre-instantiate reusable chunk-level features
    this.overheadBeam = createOverheadBeamWithLantern(this.materials, 14.2);
    this.decorGroup.add(this.overheadBeam);

    this.tower = createBarjeelWindtower(this.materials);
    this.decorGroup.add(this.tower);

    this.palm = createDatePalmTree(this.materials);
    this.decorGroup.add(this.palm);
    [this.overheadBeam, this.tower, this.palm].forEach(feature => batchStaticMeshes(feature));

    this.facades = [createResidentialFacade(materials, chunkIndex), createResidentialFacade(materials, chunkIndex + 1)];
    this.facades.forEach(facade => this.decorGroup.add(facade));
    this.gateway = chunkIndex === 0 ? createMarketGateway(materials) : null;
    if (this.gateway) this.decorGroup.add(this.gateway);
    this.birds = chunkIndex % 4 === 0 ? new MarketBirds() : null;
    if (this.birds) this.decorGroup.add(this.birds.group);

    this.coinMeshes = [
      createDirhamCoinMesh(this.materials),
      createDirhamCoinMesh(this.materials),
      createDirhamCoinMesh(this.materials),
    ];
    for (const coinMesh of this.coinMeshes) {
      this.decorGroup.add(coinMesh);
    }

    this.group.add(this.decorGroup);
  }

  private createRibbonGeometry(vertCount: number, indexCount: number): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(vertCount * 3);
    const uvs = new Float32Array(vertCount * 2);
    const indices = new Uint16Array(indexCount);

    // Setup triangle indices quad pattern
    let idx = 0;
    for (let i = 0; i < SUBDIVISIONS; i++) {
      const v0 = i * 2;
      const v1 = i * 2 + 1;
      const v2 = (i + 1) * 2;
      const v3 = (i + 1) * 2 + 1;

      // Two triangles per segment
      indices[idx++] = v0;
      indices[idx++] = v1;
      indices[idx++] = v2;

      indices[idx++] = v2;
      indices[idx++] = v1;
      indices[idx++] = v3;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    return geo;
  }

  /**
   * Rebuilds all vertices for this 40m chunk based on startZ.
   */
  public rebuild(startZ: number, chunkIndex: number) {
    this.startZ = startZ;
    this.endZ = startZ - CHUNK_LENGTH;
    this.chunkIndex = chunkIndex;

    const roadPos = this.roadGeo.attributes.position.array as Float32Array;
    const roadUv = this.roadGeo.attributes.uv.array as Float32Array;

    const leftWallPos = this.leftWallGeo.attributes.position.array as Float32Array;
    const leftWallUv = this.leftWallGeo.attributes.uv.array as Float32Array;

    const rightWallPos = this.rightWallGeo.attributes.position.array as Float32Array;
    const rightWallUv = this.rightWallGeo.attributes.uv.array as Float32Array;

    const leftCurbPos = this.leftCurbGeo.attributes.position.array as Float32Array;
    const rightCurbPos = this.rightCurbGeo.attributes.position.array as Float32Array;
    const parapetPos = this.parapetGeo.attributes.position.array as Float32Array;

    // The camera begins behind the player. Give that approach real ground too.
    const approachLength = chunkIndex === 0 ? 24 : 0;
    const stepZ = (CHUNK_LENGTH + approachLength) / SUBDIVISIONS;
    const WALL_WIDTH = 10.4;
    const CURB_OFFSET = 6.8;

    for (let i = 0; i <= SUBDIVISIONS; i++) {
      const z = startZ + approachLength - i * stepZ;
      const c = getTrackCurve(z);

      const xLeft = c.x - WALL_WIDTH * c.nx;
      const zLeft = z - WALL_WIDTH * c.nz;
      const xRight = c.x + WALL_WIDTH * c.nx;
      const zRight = z + WALL_WIDTH * c.nz;

      const xCurbL = c.x - CURB_OFFSET * c.nx;
      const zCurbL = z - CURB_OFFSET * c.nz;
      const xCurbR = c.x + CURB_OFFSET * c.nx;
      const zCurbR = z + CURB_OFFSET * c.nz;

      const vBase = i * 2;
      const pIdx0 = vBase * 3;
      const pIdx1 = (vBase + 1) * 3;
      const uvIdx0 = vBase * 2;
      const uvIdx1 = (vBase + 1) * 2;

      const tU = i / SUBDIVISIONS;

      // 1. Road ribbon (quad from Left to Right at elevation c.y)
      roadPos[pIdx0] = xLeft;
      roadPos[pIdx0 + 1] = c.y;
      roadPos[pIdx0 + 2] = zLeft;

      roadPos[pIdx1] = xRight;
      roadPos[pIdx1 + 1] = c.y;
      roadPos[pIdx1 + 2] = zRight;

      roadUv[uvIdx0] = 0;
      roadUv[uvIdx0 + 1] = tU * 10;
      roadUv[uvIdx1] = 5;
      roadUv[uvIdx1 + 1] = tU * 10;

      // 2. Left Wall Ribbon (rising vertically 10.0m facing inward)
      leftWallPos[pIdx0] = xLeft;
      leftWallPos[pIdx0 + 1] = c.y;
      leftWallPos[pIdx0 + 2] = zLeft;

      leftWallPos[pIdx1] = xLeft;
      leftWallPos[pIdx1 + 1] = c.y + 10.0;
      leftWallPos[pIdx1 + 2] = zLeft;

      leftWallUv[uvIdx0] = tU * 3;
      leftWallUv[uvIdx0 + 1] = 0;
      leftWallUv[uvIdx1] = tU * 3;
      leftWallUv[uvIdx1 + 1] = 2;

      // 3. Right Wall Ribbon (rising vertically 10.0m facing inward)
      rightWallPos[pIdx0] = xRight;
      rightWallPos[pIdx0 + 1] = c.y + 10.0;
      rightWallPos[pIdx0 + 2] = zRight;

      rightWallPos[pIdx1] = xRight;
      rightWallPos[pIdx1 + 1] = c.y;
      rightWallPos[pIdx1 + 2] = zRight;

      rightWallUv[uvIdx0] = tU * 3;
      rightWallUv[uvIdx0 + 1] = 2;
      rightWallUv[uvIdx1] = tU * 3;
      rightWallUv[uvIdx1 + 1] = 0;

      // 4. Curbs (0.28m stone lips along sidewalk divider)
      leftCurbPos[pIdx0] = xCurbL;
      leftCurbPos[pIdx0 + 1] = c.y;
      leftCurbPos[pIdx0 + 2] = zCurbL;
      leftCurbPos[pIdx1] = xCurbL + 0.3 * c.nx;
      leftCurbPos[pIdx1 + 1] = c.y + 0.28;
      leftCurbPos[pIdx1 + 2] = zCurbL + 0.3 * c.nz;

      rightCurbPos[pIdx0] = xCurbR - 0.3 * c.nx;
      rightCurbPos[pIdx0 + 1] = c.y + 0.28;
      rightCurbPos[pIdx0 + 2] = zCurbR - 0.3 * c.nz;
      rightCurbPos[pIdx1] = xCurbR;
      rightCurbPos[pIdx1 + 1] = c.y;
      rightCurbPos[pIdx1 + 2] = zCurbR;

      // 5. Parapet Sandstone Molding at roofline (c.y + 10.0m)
      parapetPos[pIdx0] = xLeft - 0.25 * c.nx;
      parapetPos[pIdx0 + 1] = c.y + 10.4;
      parapetPos[pIdx0 + 2] = zLeft - 0.25 * c.nz;
      // A coping strip belongs on a wall, not across the entire open-air street.
      parapetPos[pIdx1] = xLeft + 0.25 * c.nx;
      parapetPos[pIdx1 + 1] = c.y + 10.4;
      parapetPos[pIdx1 + 2] = zLeft + 0.25 * c.nz;
    }

    this.roadGeo.attributes.position.needsUpdate = true;
    this.roadGeo.attributes.uv.needsUpdate = true;
    this.roadGeo.computeVertexNormals();
    this.roadGeo.computeBoundingBox();
    this.roadGeo.computeBoundingSphere();

    this.leftWallGeo.attributes.position.needsUpdate = true;
    this.leftWallGeo.attributes.uv.needsUpdate = true;
    this.leftWallGeo.computeVertexNormals();
    this.leftWallGeo.computeBoundingBox();
    this.leftWallGeo.computeBoundingSphere();

    this.rightWallGeo.attributes.position.needsUpdate = true;
    this.rightWallGeo.attributes.uv.needsUpdate = true;
    this.rightWallGeo.computeVertexNormals();
    this.rightWallGeo.computeBoundingBox();
    this.rightWallGeo.computeBoundingSphere();

    this.leftCurbGeo.attributes.position.needsUpdate = true;
    this.leftCurbGeo.computeVertexNormals();
    this.leftCurbGeo.computeBoundingBox();
    this.leftCurbGeo.computeBoundingSphere();

    this.rightCurbGeo.attributes.position.needsUpdate = true;
    this.rightCurbGeo.computeVertexNormals();
    this.rightCurbGeo.computeBoundingBox();
    this.rightCurbGeo.computeBoundingSphere();

    this.parapetGeo.attributes.position.needsUpdate = true;
    this.parapetGeo.computeVertexNormals();
    this.parapetGeo.computeBoundingBox();
    this.parapetGeo.computeBoundingSphere();

    // Rebuild chunk decor, props, obstacles, and coins
    this.rebuildDecorations();
  }

  private rebuildDecorations() {
    this.obstacles = [];
    this.coins = [];
    this.windActors = [];
    this.merchants = [];

    const isFirstChunk = this.chunkIndex === 0;
    // Chunk 0 shop is placed centered at Z = -18m so the merchant and flag are directly framed in the camera view frustum!
    const midZ = isFirstChunk ? -18.0 : (this.startZ - CHUNK_LENGTH * 0.5);
    const cMid = getTrackCurve(midZ);

    if (this.birds) {
      this.birdWorldZ = midZ - 12;
      const perch = getTrackCurve(this.birdWorldZ);
      this.birds.group.position.set(perch.x - 4.8 * perch.nx, perch.y + 0.03,
        this.birdWorldZ - 4.8 * perch.nz);
      this.birds.group.rotation.y = perch.yaw;
      this.birds.reset();
    }

    const facadeZ = this.startZ - 2;
    const facadeCurve = getTrackCurve(facadeZ);
    this.facades.forEach((facade, index) => {
      const side = index === 0 ? -1 : 1;
      facade.position.set(facadeCurve.x + side * 10.1 * facadeCurve.nx,
        facadeCurve.y, facadeZ + side * 10.1 * facadeCurve.nz);
      facade.rotation.y = facadeCurve.yaw + (index === 0 ? 0 : Math.PI);
    });
    if (this.gateway) {
      this.gateway.visible = isFirstChunk;
      const entrance = getTrackCurve(-9);
      this.gateway.position.set(entrance.x, entrance.y, -9);
      this.gateway.rotation.y = entrance.yaw;
    }

    // 1. Reposition Overhead beam with Fanous lantern (reused mesh)
    this.overheadBeam.position.set(cMid.x, cMid.y + 7.5, midZ);
    this.overheadBeam.rotation.y = cMid.yaw;
    this.overheadBeam.visible = true;

    // 2. Continuous Marketplace: Open Shops on BOTH Left and Right sides
    const leftSouqTypes: SouqType[] = ['grocery', 'textile', 'gahwa', 'grocery', 'pottery', 'spice'];
    const rightSouqTypes: SouqType[] = ['spice', 'pottery', 'antiques', 'spice', 'grocery', 'textile'];

    const leftType: SouqType | 'showcase_textile' = this.slotIndex === 0 ? 'showcase_textile' : (leftSouqTypes[this.slotIndex % leftSouqTypes.length] === 'textile' ? 'showcase_textile' : leftSouqTypes[this.slotIndex % leftSouqTypes.length]);
    const rightType: SouqType | 'showcase_textile' = rightSouqTypes[(this.slotIndex + 1) % rightSouqTypes.length] === 'textile' ? 'showcase_textile' : rightSouqTypes[(this.slotIndex + 1) % rightSouqTypes.length];

    // Left Open Market Shopfront: Reuse or acquire from pool
    if (!this.currentLeftShop || this.currentLeftShop.type !== leftType) {
      if (this.currentLeftShop) {
        this.sceneryPool.releaseShop(this.currentLeftShop.type, true, this.currentLeftShop.item);
        this.decorGroup.remove(this.currentLeftShop.item.shop);
      }
      const item = this.sceneryPool.acquireShop(leftType, true, midZ);
      this.decorGroup.add(item.shop);
      this.currentLeftShop = { type: leftType, item };
    }
    this.currentLeftShop.item.shop.position.set(cMid.x - 7.0 * cMid.nx, cMid.y, midZ - 7.0 * cMid.nz);
    this.currentLeftShop.item.shop.rotation.y = cMid.yaw;
    this.currentLeftShop.item.shop.visible = true;
    if (this.currentLeftShop.item.windActors.length > 0) {
      this.windActors.push(...this.currentLeftShop.item.windActors);
    }
    if (this.currentLeftShop.item.merchant) {
      this.currentLeftShop.item.merchant.worldZ = midZ;
      this.merchants.push(this.currentLeftShop.item.merchant);
    }

    // Right Open Market Shopfront: Reuse or acquire from pool
    if (!this.currentRightShop || this.currentRightShop.type !== rightType) {
      if (this.currentRightShop) {
        this.sceneryPool.releaseShop(this.currentRightShop.type, false, this.currentRightShop.item);
        this.decorGroup.remove(this.currentRightShop.item.shop);
      }
      const item = this.sceneryPool.acquireShop(rightType, false, midZ);
      this.decorGroup.add(item.shop);
      this.currentRightShop = { type: rightType, item };
    }
    this.currentRightShop.item.shop.position.set(cMid.x + 7.0 * cMid.nx, cMid.y, midZ + 7.0 * cMid.nz);
    this.currentRightShop.item.shop.rotation.y = cMid.yaw;
    this.currentRightShop.item.shop.visible = true;
    if (this.currentRightShop.item.windActors.length > 0) {
      this.windActors.push(...this.currentRightShop.item.windActors);
    }
    if (this.currentRightShop.item.merchant) {
      this.currentRightShop.item.merchant.worldZ = midZ;
      this.merchants.push(this.currentRightShop.item.merchant);
    }

    // 3. Architectural Layering: Reused Barjeel Windtowers and Date Palms
    if (this.chunkIndex % 2 === 0) {
      this.tower.visible = true;
      this.tower.position.set(cMid.x - 11.2 * cMid.nx, cMid.y, midZ - 11.2 * cMid.nz);
      this.tower.rotation.y = cMid.yaw + Math.PI / 2;
      this.palm.visible = false;
    } else {
      this.palm.visible = true;
      this.palm.position.set(cMid.x + 10.8 * cMid.nx, cMid.y, midZ + 10.8 * cMid.nz);
      this.tower.visible = false;
    }

    // 4. Situational Marketplace Obstacles: Cleanly release all previous obstacles from this chunk back to the pool
    for (const o of this.currentObstacles) {
      this.sceneryPool.releaseObstacle(o.type, o.mesh);
      this.decorGroup.remove(o.mesh);
    }
    this.currentObstacles = [];

    if (Math.abs(midZ) > 35) {
      const obsLaneIndex = (this.chunkIndex * 7) % 3; // 0, 1, or 2
      const laneOffsets = [-3.2, 0, 3.2];
      const obsLane = laneOffsets[obsLaneIndex];

      const obsTypes = [
        'pumpkin_cart_spill',
        'spice_sack_spill',
        'pottery_pallet_spill',
        'carpet_roll_spill',
        'dates_citrus_crates',
      ];
      const obsType = obsTypes[this.chunkIndex % obsTypes.length];

      const obsMesh = this.sceneryPool.acquireObstacle(obsType);
      const obsZ = midZ - 4.0;
      const cObs = getTrackCurve(obsZ);
      const obsX = cObs.x + obsLane * cObs.nx;
      const obsY = cObs.y;
      const actualObsZ = obsZ + obsLane * cObs.nz;

      obsMesh.position.set(obsX, obsY, actualObsZ);
      obsMesh.rotation.y = cObs.yaw;
      obsMesh.visible = true;

      this.decorGroup.add(obsMesh);
      this.currentObstacles.push({ type: obsType, mesh: obsMesh });

      this.obstacles.push({
        mesh: obsMesh,
        type: obsType,
        lane: obsLaneIndex,
        worldZ: actualObsZ,
        worldX: obsX,
        worldY: obsY,
        hit: false,
      });

      // Occasional second spill on outer lane for higher difficulty further down the track
      if (this.chunkIndex > 4 && this.chunkIndex % 3 === 0) {
        const secondLaneIdx = (obsLaneIndex + 1) % 3;
        const secondLane = laneOffsets[secondLaneIdx];
        const secType = 'dates_citrus_crates';

        const secMesh = this.sceneryPool.acquireObstacle(secType);
        const secZ = midZ + 8.0;
        const cSec = getTrackCurve(secZ);
        const secX = cSec.x + secondLane * cSec.nx;
        const secY = cSec.y;
        const secActualZ = secZ + secondLane * cSec.nz;

        secMesh.position.set(secX, secY, secActualZ);
        secMesh.rotation.y = cSec.yaw;
        secMesh.visible = true;

        this.decorGroup.add(secMesh);
        this.currentObstacles.push({ type: secType, mesh: secMesh });

        this.obstacles.push({
          mesh: secMesh,
          type: secType,
          lane: secondLaneIdx,
          worldZ: secActualZ,
          worldX: secX,
          worldY: secY,
          hit: false,
        });
      }
    }

    // 5. Reposition UAE Dirham Coins in lanes (reused coin meshes)
    const coinLaneIndices = [(this.chunkIndex + 1) % 3, (this.chunkIndex + 2) % 3];
    const laneOffsets = [-3.2, 0, 3.2];

    for (let cStep = 0; cStep < 3; cStep++) {
      const cZ = this.startZ - 10 - cStep * 9;
      const laneIdx = coinLaneIndices[cStep % coinLaneIndices.length];
      const laneOff = laneOffsets[laneIdx];
      const cPt = getTrackCurve(cZ);

      const coinMesh = this.coinMeshes[cStep];
      const coinX = cPt.x + laneOff * cPt.nx;
      const coinY = cPt.y + 1.25;
      const actualCoinZ = cZ + laneOff * cPt.nz;

      coinMesh.position.set(coinX, coinY, actualCoinZ);
      coinMesh.visible = true;

      this.coins.push({
        mesh: coinMesh,
        lane: laneIdx,
        worldZ: actualCoinZ,
        worldX: coinX,
        worldY: coinY,
        collected: false,
      });
    }
  }

  public getObstacles(): ActiveObstacle[] {
    return this.obstacles;
  }

  public updateVisibility(playerZ: number, detailDistance = 130): void {
    // Keep a complete road ahead, but skip whole invisible hierarchies (including shadows).
    this.group.visible = this.endZ <= playerZ + 30 && this.startZ >= playerZ - 240;
    this.decorGroup.visible = this.group.visible && this.startZ >= playerZ - detailDistance;
    const nearby = Math.abs((this.startZ + this.endZ) / 2 - playerZ) < 70;
    if (this.currentLeftShop) this.currentLeftShop.item.shop.visible = nearby;
    if (this.currentRightShop) this.currentRightShop.item.shop.visible = nearby;
  }

  public getCoins(): ActiveCoin[] {
    return this.coins;
  }

  public getMerchants(): MerchantRig[] {
    return this.merchants;
  }

  public updateWind(delta: number, playerZ = 0): void {
    this.birds?.animate(delta, globalWind.getTime(), Math.abs(playerZ - this.birdWorldZ) < 22);
    for (let i = 0; i < this.windActors.length; i++) {
      globalWind.applyToActor(this.windActors[i], delta);
    }
  }

  public destroy(): void {
    // 1. Release active pooled shops and obstacles
    if (this.currentLeftShop) {
      this.sceneryPool.releaseShop(this.currentLeftShop.type, true, this.currentLeftShop.item);
      this.decorGroup.remove(this.currentLeftShop.item.shop);
      this.currentLeftShop = null;
    }
    if (this.currentRightShop) {
      this.sceneryPool.releaseShop(this.currentRightShop.type, false, this.currentRightShop.item);
      this.decorGroup.remove(this.currentRightShop.item.shop);
      this.currentRightShop = null;
    }
    for (const obs of this.currentObstacles) {
      this.sceneryPool.releaseObstacle(obs.type, obs.mesh);
      this.decorGroup.remove(obs.mesh);
    }
    this.currentObstacles = [];

    // 2. Dispose procedural ribbon geometries
    this.roadGeo.dispose();
    this.leftWallGeo.dispose();
    this.rightWallGeo.dispose();
    this.leftCurbGeo.dispose();
    this.rightCurbGeo.dispose();
    this.parapetGeo.dispose();

    // 3. Dispose chunk-local permanent features
    disposeHierarchy(this.overheadBeam, (mat) => this.materials.isShared(mat));
    disposeHierarchy(this.tower, (mat) => this.materials.isShared(mat));
    disposeHierarchy(this.palm, (mat) => this.materials.isShared(mat));
    this.facades.forEach(facade => disposeHierarchy(facade, mat => this.materials.isShared(mat)));
    if (this.gateway) disposeHierarchy(this.gateway, mat => this.materials.isShared(mat));
    this.birds?.dispose();
    for (const coinMesh of this.coinMeshes) {
      disposeHierarchy(coinMesh, (mat) => this.materials.isShared(mat));
    }

    this.obstacles = [];
    this.coins = [];
    this.windActors = [];
    this.merchants = [];

    while (this.decorGroup.children.length > 0) {
      this.decorGroup.remove(this.decorGroup.children[0]);
    }
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
  }
}
