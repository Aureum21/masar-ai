/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import {
  SharedMaterials,
  SouqType,
  createOpenMarketShop,
  createObstacleMesh,
} from './proceduralModels';
import { createShowcaseTextileShop } from './marketTextiles';
import { WindClothActor } from './wind';
import { MerchantRig, createEmiratiMerchant } from './merchantCharacter';
import { disposeHierarchy } from './sceneResources';
import { batchStaticMeshes } from './staticBatch';

export interface PooledShopItem {
  shop: THREE.Group;
  windActors: WindClothActor[];
  merchant?: MerchantRig;
}

/**
 * SceneryPool manages reusable shopfronts and obstacle meshes across chunk recycling.
 * Completely eliminates runtime allocations, BufferGeometry instantiation, and GPU buffer churn.
 */
export class SceneryPool {
  private shopPool: Map<string, PooledShopItem[]> = new Map();
  private obstaclePool: Map<string, THREE.Group[]> = new Map();
  private materials: SharedMaterials;

  constructor(materials: SharedMaterials) {
    this.materials = materials;
  }

  public acquireShop(
    type: SouqType | 'showcase_textile',
    isLeft: boolean,
    midZ: number,
  ): PooledShopItem {
    const key = `${type}_${isLeft ? 'L' : 'R'}`;
    const list = this.shopPool.get(key);
    if (list && list.length > 0) {
      const item = list.pop()!;
      item.shop.visible = true;
      if (item.merchant) {
        item.merchant.worldZ = midZ;
      }
      return item;
    }

    if (type === 'showcase_textile') {
      const res = createShowcaseTextileShop(isLeft, this.materials, midZ);
      const animated = res.windActors.flatMap(actor =>
        [actor.pivot, actor.sleeveLeft, actor.sleeveRight, actor.flagMesh].filter(Boolean) as THREE.Object3D[]);
      const merchant = res.merchant;
      if (merchant) animated.push(merchant.root, merchant.torso, merchant.head,
        merchant.rightShoulder, merchant.rightElbow, merchant.rightHand, merchant.tarboosh);
      batchStaticMeshes(res.shop, animated);
      for (const node of new Set(animated)) batchStaticMeshes(node, animated.filter(other => other !== node));
      return {
        shop: res.shop,
        windActors: res.windActors,
        merchant: res.merchant,
      };
    } else if (type === 'gahwa') {
      const shop = createOpenMarketShop(type, isLeft, this.materials);
      // Bait Al Gahwa Host: standing warmly on the dakka beside the coffee service
      const host = createEmiratiMerchant(this.materials, midZ, isLeft);
      const recessSign = isLeft ? -1 : 1;
      host.root.position.set(recessSign * 2.1, 0.28, -1.2);
      host.root.rotation.y = isLeft ? 1.25 : -1.25;
      shop.add(host.root);
      const animated = [host.torso, host.head, host.rightShoulder, host.rightElbow, host.rightHand, host.tarboosh];
      batchStaticMeshes(shop, [host.root]);
      batchStaticMeshes(host.root, animated);
      for (const node of animated) batchStaticMeshes(node, animated.filter(other => other !== node));
      return {
        shop,
        windActors: [],
        merchant: host,
      };
    } else {
      const shop = createOpenMarketShop(type, isLeft, this.materials);
      batchStaticMeshes(shop);
      return {
        shop,
        windActors: [],
        merchant: undefined,
      };
    }
  }

  public releaseShop(
    type: SouqType | 'showcase_textile',
    isLeft: boolean,
    item: PooledShopItem,
  ): void {
    const key = `${type}_${isLeft ? 'L' : 'R'}`;
    item.shop.visible = false;
    if (item.shop.parent) {
      item.shop.parent.remove(item.shop);
    }
    let list = this.shopPool.get(key);
    if (!list) {
      list = [];
      this.shopPool.set(key, list);
    }
    if (!list.includes(item)) {
      list.push(item);
    }
  }

  public acquireObstacle(type: string): THREE.Group {
    const list = this.obstaclePool.get(type);
    if (list && list.length > 0) {
      const mesh = list.pop()!;
      mesh.visible = true;
      return mesh;
    }
    const mesh = createObstacleMesh(type, this.materials);
    batchStaticMeshes(mesh);
    return mesh;
  }

  public releaseObstacle(type: string, mesh: THREE.Group): void {
    mesh.visible = false;
    if (mesh.parent) {
      mesh.parent.remove(mesh);
    }
    let list = this.obstaclePool.get(type);
    if (!list) {
      list = [];
      this.obstaclePool.set(type, list);
    }
    if (!list.includes(mesh)) {
      list.push(mesh);
    }
  }

  public destroy(): void {
    for (const list of this.shopPool.values()) {
      for (const item of list) {
        disposeHierarchy(item.shop, (m) => this.materials.isShared(m));
      }
    }
    this.shopPool.clear();

    for (const list of this.obstaclePool.values()) {
      for (const mesh of list) {
        disposeHierarchy(mesh, (m) => this.materials.isShared(m));
      }
    }
    this.obstaclePool.clear();
  }
}
