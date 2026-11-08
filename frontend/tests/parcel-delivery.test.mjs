import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ParcelPickup,
  PARCEL_PICKUP_END_METRES,
  PARCEL_DELIVERY_START_METRES,
  PARCEL_DELIVERY_END_METRES,
  GAHWA_STORY_CARD,
} from '../src/components/game/sikka/parcelDelivery.ts';

test('pickup is optional and available before launch', () => {
  const parcel = new ParcelPickup();
  assert.equal(parcel.status, 'available');
  assert.equal(parcel.collect('ready', 0), true);
  assert.equal(parcel.status, 'carrying');
});

test('keyboard and touch cannot collect the same parcel twice', () => {
  const parcel = new ParcelPickup();
  assert.equal(parcel.collect('running', 18), true);
  assert.equal(parcel.collect('running', 18), false);
  parcel.advance(720);
  assert.equal(parcel.status, 'carrying');
});

test('countdown, finish animation, and results do not allow pickup', () => {
  for (const phase of ['countdown', 'zooming', 'ended']) {
    const parcel = new ParcelPickup();
    assert.equal(parcel.collect(phase, 0), false);
    assert.equal(parcel.status, 'available');
  }
});

test('last metre boundary is inclusive, and late input is rejected', () => {
  const onTime = new ParcelPickup();
  assert.equal(onTime.collect('running', PARCEL_PICKUP_END_METRES), true);
  const late = new ParcelPickup();
  assert.equal(late.collect('running', PARCEL_PICKUP_END_METRES + 0.01), false);
  assert.equal(late.status, 'missed');
});

test('skipping the favour expires it even when a frame crosses the whole window', () => {
  const parcel = new ParcelPickup();
  parcel.advance(100);
  assert.equal(parcel.status, 'missed');
  assert.equal(parcel.collect('running', 0), false);
});

test('replay restores both a collected and a missed offer', () => {
  for (const collected of [true, false]) {
    const parcel = new ParcelPickup();
    if (collected) parcel.collect('ready', 0);
    else parcel.advance(100);
    parcel.reset();
    assert.equal(parcel.status, 'available');
    assert.equal(parcel.collect('ready', 0), true);
  }
});

test('invalid distances cannot collect a parcel', () => {
  for (const distance of [NaN, Infinity, -1]) {
    const parcel = new ParcelPickup();
    assert.equal(parcel.collect('running', distance), false);
    assert.equal(parcel.status, 'available');
  }
});

test('delivery is available only while carrying and inside courtyard window', () => {
  const parcel = new ParcelPickup();
  assert.equal(parcel.isDeliveryAvailable('running', 95), false); // not carrying yet

  parcel.collect('ready', 0);
  assert.equal(parcel.isDeliveryAvailable('ready', 95), false); // must be in running phase
  assert.equal(parcel.isDeliveryAvailable('running', PARCEL_DELIVERY_START_METRES - 1), false); // too early
  assert.equal(parcel.isDeliveryAvailable('running', PARCEL_DELIVERY_START_METRES), true); // boundary start
  assert.equal(parcel.isDeliveryAvailable('running', 100), true); // inside window
  assert.equal(parcel.isDeliveryAvailable('running', PARCEL_DELIVERY_END_METRES), true); // boundary end
  assert.equal(parcel.isDeliveryAvailable('running', PARCEL_DELIVERY_END_METRES + 1), false); // too late
});

test('successful delivery transitions to delivered and cannot be redelivered', () => {
  const parcel = new ParcelPickup();
  parcel.collect('ready', 0);
  assert.equal(parcel.status, 'carrying');

  assert.equal(parcel.deliver('running', 100), true);
  assert.equal(parcel.status, 'delivered');

  // Redelivery rejected
  assert.equal(parcel.deliver('running', 100), false);
  assert.equal(parcel.isDeliveryAvailable('running', 100), false);
});

test('resetting restores delivered parcel back to available', () => {
  const parcel = new ParcelPickup();
  parcel.collect('ready', 0);
  parcel.deliver('running', 100);
  assert.equal(parcel.status, 'delivered');

  parcel.reset();
  assert.equal(parcel.status, 'available');
});

test('gahwa story card has authentic heritage metadata', () => {
  assert.equal(GAHWA_STORY_CARD.id, 'gahwa-courtyard');
  assert.ok(GAHWA_STORY_CARD.title.includes('Coffee Courtyard'));
  assert.ok(GAHWA_STORY_CARD.heritageFact.includes('UNESCO'));
  assert.equal(GAHWA_STORY_CARD.unlockedAtDistance, 100);
});
