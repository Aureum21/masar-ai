import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadGameModule } from './helpers/loadGameModule.mjs';
const require = createRequire(import.meta.url);
const THREE = require('three');
const { batchStaticMeshes } = loadGameModule('staticBatch');
const { SikkaChunk, CHUNK_LENGTH, TOTAL_CHUNKS } = loadGameModule('ribbonChunk');
const { SceneryPool } = loadGameModule('sceneryPool');
const { getLaneWorldPos, checkSweptSphereObstacleCollision } = loadGameModule('trackMath');
const { createOpenMarketShop } = loadGameModule('proceduralModels');
const { WindController } = loadGameModule('wind');

test('batching preserves world bounds, textures, shadows, mirrored faces and animated pivots', () => {
  const root = new THREE.Group();
  root.position.set(10, 2, -30); root.rotation.y = 0.4;
  const mat = new THREE.MeshStandardMaterial();
  const staticGroup = new THREE.Group(); staticGroup.rotation.y = 0.5; root.add(staticGroup);
  for (let i = 0; i < 20; i++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), mat);
    mesh.position.set(i * 2, 0, 0); mesh.scale.x = i % 2 ? -1 : 1;
    mesh.castShadow = mesh.receiveShadow = true; staticGroup.add(mesh);
  }
  const pivot = new THREE.Group(); root.add(pivot);
  const movingMesh = new THREE.Mesh(new THREE.BoxGeometry(), mat); pivot.add(movingMesh);
  const before = new THREE.Box3().setFromObject(root, true);
  batchStaticMeshes(root, [pivot]);
  const after = new THREE.Box3().setFromObject(root, true);
  assert.ok(before.min.distanceTo(after.min) < 1e-5 && before.max.distanceTo(after.max) < 1e-5);
  assert.equal(movingMesh.parent, pivot);
  const batch = root.children.find(node => node.name === 'static-scenery-batch');
  assert.ok(batch.castShadow && batch.receiveShadow);
  assert.equal(batch.material, mat);
  const p = batch.geometry.attributes.position, n = batch.geometry.attributes.normal, ix = batch.geometry.index;
  for (let i = 0; i < ix.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(p, ix.getX(i));
    const b = new THREE.Vector3().fromBufferAttribute(p, ix.getX(i + 1));
    const c = new THREE.Vector3().fromBufferAttribute(p, ix.getX(i + 2));
    assert.ok(b.sub(a).cross(c.sub(a)).dot(new THREE.Vector3().fromBufferAttribute(n, ix.getX(i))) > 0);
  }
  // A mesh may itself be an animated root (awning or flag).
  batchStaticMeshes(movingMesh);
  assert.equal(movingMesh.parent, pivot);
});

function materialCache() {
  const values = new Map();
  return new Proxy({}, {get(_, key) {
    if (key === 'isShared') return material => [...values.values()].includes(material);
    if (!values.has(key)) values.set(key, new THREE.MeshStandardMaterial());
    return values.get(key);
  }});
}

test('real grocery, spice, pottery and antiques shops retain geometry with far fewer draws', () => {
  const materials = materialCache();
  for (const type of ['grocery', 'spice', 'pottery', 'antiques']) {
    const shop = createOpenMarketShop(type, true, materials);
    const measure = () => {
      let meshes = 0, triangles = 0;
      shop.traverse(node => {
        if (node.isMesh) {
          meshes++;
          triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3;
        }
      });
      return { meshes, triangles, bounds: new THREE.Box3().setFromObject(shop, true) };
    };
    const before = measure();
    batchStaticMeshes(shop);
    const after = measure();
    assert.equal(after.triangles, before.triangles, `${type}: lost triangles`);
    assert.ok(after.meshes < before.meshes * 0.4, `${type}: ${before.meshes} -> ${after.meshes}`);
    assert.ok(before.bounds.min.distanceTo(after.bounds.min) < 1e-5);
    assert.ok(before.bounds.max.distanceTo(after.bounds.max) < 1e-5);
  }
});

test('batched textile shops keep cloth, flag and merchant joints attached through pooling', () => {
  const pool = new SceneryPool(materialCache());
  const wind = new WindController();
  for (const isLeft of [true, false]) {
    const item = pool.acquireShop('showcase_textile', isLeft, -18);
    const attached = node => {
      for (let ancestor = node; ancestor; ancestor = ancestor.parent) if (ancestor === item.shop) return true;
      return false;
    };
    wind.update(0.1);
    for (const actor of item.windActors) {
      assert.ok(attached(actor.pivot));
      for (const part of [actor.sleeveLeft, actor.sleeveRight, actor.flagMesh].filter(Boolean)) assert.ok(attached(part));
      wind.applyToActor(actor, 0.1);
    }
    for (const key of ['root', 'head', 'torso', 'tarboosh', 'rightShoulder', 'rightElbow', 'rightHand']) {
      assert.ok(attached(item.merchant[key]), `${key} was removed`);
    }
    const parent = new THREE.Group(); parent.add(item.shop);
    pool.releaseShop('showcase_textile', isLeft, item);
    assert.equal(item.shop.parent, null);
    assert.equal(pool.acquireShop('showcase_textile', isLeft, -400), item);
    assert.equal(item.merchant.worldZ, -400);
    pool.releaseShop('showcase_textile', isLeft, item);
  }
  pool.destroy();
});

test('hundreds of chunk recycles and replays keep obstacles bounded, spaced and avoidable', () => {
  // Shops require browser canvas textures; leave those out to isolate real chunk/pool behaviour.
  const materials = materialCache();
  const pool = new SceneryPool(materials);
  pool.acquireShop = () => ({ shop: new THREE.Group(), windActors: [] });
  const chunks = Array.from({ length: TOTAL_CHUNKS }, (_, i) => new SikkaChunk(i, materials, pool));
  let maxMeshes = 0;
  for (let cycle = 0; cycle < 200; cycle++) {
    const index = cycle % TOTAL_CHUNKS;
    const chunk = chunks[index];
    chunk.rebuild(-cycle * CHUNK_LENGTH, cycle);
    const obstacles = chunk.getObstacles();
    assert.ok(obstacles.length <= 2);
    const active = [];
    chunk.group.traverse(node => { if (node.isMesh) active.push(node); });
    maxMeshes = Math.max(maxMeshes, active.length);
    assert.ok(active.length < 100, `mesh count grew to ${active.length}`);
    for (const obstacle of obstacles) {
      assert.equal(obstacle.mesh.parent?.parent, chunk.group);
      assert.equal(obstacle.mesh.position.z, obstacle.worldZ);
      assert.equal(obstacle.hit, false);
      assert.ok(obstacle.worldZ < chunk.startZ && obstacle.worldZ > chunk.endZ);
    }
    if (obstacles.length === 2) assert.ok(Math.abs(obstacles[0].worldZ - obstacles[1].worldZ) > 8);
    const lane = [0, 1, 2].find(l => !obstacles.some(o => o.lane === l));
    assert.notEqual(lane, undefined, 'there must always be an open lane');
    for (let z = chunk.startZ; z >= chunk.endZ; z -= 0.25) {
      const pos = getLaneWorldPos(z, [-3.2, 0, 3.2][lane], 1);
      for (const o of obstacles) assert.equal(checkSweptSphereObstacleCollision(
        pos.x, pos.y, pos.z, pos.x, pos.y, pos.z, 1, o.worldX, o.worldY, o.worldZ, o.type), false);
    }
    chunk.updateVisibility(chunk.startZ + 300);
    assert.equal(chunk.group.visible, false);
    chunk.updateVisibility(chunk.startZ);
    assert.equal(chunk.group.visible, true);
  }
  for (let replay = 0; replay < 5; replay++) chunks.forEach((c, i) => c.rebuild(-i * CHUNK_LENGTH, i));
  for (const c of chunks) c.destroy();
  pool.destroy();
  assert.ok(maxMeshes > 0);
});
