import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {loadGameModule} from './helpers/loadGameModule.mjs';
const THREE = createRequire(import.meta.url)('three');
const {FrameBudget, renderPixelRatio, sharpPixelRatio} = loadGameModule('frameBudget');
const {SceneryMaterials} = loadGameModule('sceneryMaterials');

function frames(budget, fps, seconds, visible = true) {
  for (let i = 0; i < fps * seconds; i++) budget.sample(1 / fps, visible);
}

test('sharp mode preserves desktop detail independently of the adaptive scale', () => {
  assert.equal(sharpPixelRatio(1100, 660, 1.5), 1.25);
  assert.equal(sharpPixelRatio(1100, 660, 1), 1);
  const ratio = sharpPixelRatio(3840, 2160, 2);
  assert.ok(3840 * 2160 * ratio ** 2 <= 1_400_001);
});

test('metal scenery retains specular highlights while stone stays inexpensive', () => {
  const cache = new SceneryMaterials();
  assert.ok(cache.convert(new THREE.MeshStandardMaterial({metalness: 0.9})).isMeshPhongMaterial);
  assert.ok(cache.convert(new THREE.MeshStandardMaterial({metalness: 0})).isMeshLambertMaterial);
  cache.dispose();
});

test('resolution responds to sustained load, recovers slowly, and stays bounded', () => {
  const budget = new FrameBudget();
  frames(budget, 30, 1);
  assert.equal(budget.scale, 1, 'one slow window must not resize the canvas');
  frames(budget, 30, 3);
  assert.equal(budget.scale, 0.9);
  frames(budget, 20, 30);
  assert.equal(budget.scale, 0.6);
  frames(budget, 60, 5);
  assert.equal(budget.scale, 0.6, 'avoid quality oscillation');
  frames(budget, 60, 45);
  assert.equal(budget.scale, 1);
});

test('hidden tabs and suspension never trigger quality reduction', () => {
  const budget = new FrameBudget();
  frames(budget, 10, 10, false);
  for (let i = 0; i < 10; i++) budget.sample(5, true);
  assert.equal(budget.scale, 1);
  frames(budget, 60, 2);
  assert.ok(budget.fps >= 59);
});

test('retina and large displays obey the pixel budget at every resolution scale', () => {
  for (const [w, h, dpr] of [[1100, 660, 2], [3840, 2160, 2], [390, 600, 3]]) {
    for (const scale of [1, 0.8, 0.6]) {
      const ratio = renderPixelRatio(w, h, dpr, scale);
      assert.ok(w * h * ratio ** 2 <= 900_001);
      assert.ok(ratio <= 1);
    }
  }
});

test('scenery material variants share textures and preserve glow without modifying player materials', () => {
  const cache = new SceneryMaterials();
  const texture = new THREE.Texture();
  const original = new THREE.MeshStandardMaterial({map: texture, color: 0x887744, emissive: 0xffaa00, emissiveIntensity: 0.4, side: THREE.DoubleSide});
  const scenery = new THREE.Mesh(new THREE.BoxGeometry(), original);
  const player = new THREE.Mesh(new THREE.SphereGeometry(), original);
  cache.apply(scenery);
  assert.ok(scenery.material.isMeshLambertMaterial);
  assert.equal(player.material, original);
  assert.equal(scenery.material.map, texture);
  assert.ok(scenery.material.color.equals(original.color));
  assert.ok(scenery.material.emissive.equals(original.emissive));
  assert.equal(scenery.material.side, THREE.DoubleSide);
  assert.equal(cache.convert(original), scenery.material);
  const highResolutionTexture = new THREE.Texture();
  original.map = highResolutionTexture;
  cache.syncTextures();
  assert.equal(scenery.material.map, highResolutionTexture, 'late-loading road texture must reach the rendered material');
  cache.apply(scenery);
  let disposed = 0;
  texture.addEventListener('dispose', () => disposed++);
  cache.dispose();
  assert.equal(disposed, 0, 'the scene owns its textures');
});
