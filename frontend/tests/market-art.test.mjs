import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createResidentialFacade } from '../src/components/game/sikka/streetArchitecture.ts';
import { MarketBirds } from '../src/components/game/sikka/marketBirds.ts';

test('facade details stay outside the road and are batched by material', () => {
  const names = ['teakWood', 'coralStone', 'cartWood', 'ironWheel', 'brassMetal'];
  const materials = Object.fromEntries(names.map(name => [name, new THREE.MeshStandardMaterial()]));
  const facade = createResidentialFacade(materials, 1);
  assert.ok(facade.children.length <= 5, 'detail must not create a draw per carved slat');
  const bounds = new THREE.Box3().setFromObject(facade);
  assert.ok(bounds.max.x < 1, 'facade must project less than 1m from the 10.1m wall');
  assert.ok(bounds.min.y >= -0.001, 'steps must sit on the street');
  assert.ok(bounds.max.y < 11, 'detail must remain within the intended roof silhouette');
  facade.traverse(node => node.geometry?.dispose());
  Object.values(materials).forEach(material => material.dispose());
});

test('birds scatter once, leave the scene, and return on replay without new geometry', () => {
  const flock = new MarketBirds();
  const geometries = new Set();
  flock.group.traverse(node => { if (node.geometry) geometries.add(node.geometry); });
  assert.equal(geometries.size, 2);
  flock.animate(1, 1, false);
  const groundY = flock.group.children[0].position.y;
  flock.animate(0.5, 1.5, true);
  assert.ok(flock.group.children[0].position.y > groundY + 1);
  flock.animate(5, 6.5, false);
  assert.equal(flock.group.visible, false);
  flock.reset();
  assert.equal(flock.group.visible, true);
  assert.ok(flock.group.children[0].position.y < 0.1);
  let disposed = 0;
  geometries.forEach(geometry => geometry.addEventListener('dispose', () => disposed++));
  flock.dispose();
  assert.equal(disposed, 2);
  assert.equal(flock.group.children.length, 0);
});
