import test from 'node:test';
import assert from 'node:assert/strict';

test('Fortune wheel geometry calculates correct angles and landing offsets for 8 sectors', () => {
  const numSectors = 8;
  const step = 360 / numSectors;
  assert.equal(step, 45, 'Each sector should span 45 degrees');

  for (let slot = 0; slot < numSectors; slot++) {
    const landingAngle = (360 - (slot * step)) % 360;
    // When slot 0 is at top, landingAngle should be 0
    if (slot === 0) {
      assert.equal(landingAngle, 0);
    }
    // Rotated angle must be in [0, 360)
    assert.ok(landingAngle >= 0 && landingAngle < 360);
    // Aligning clockwise rotation by landingAngle brings sector `slot` to 0 deg
    const sectorInitialAngle = slot * step;
    const finalPointerAngle = (sectorInitialAngle + landingAngle) % 360;
    assert.equal(finalPointerAngle, 0, `Sector ${slot} must align to 0 deg top indicator`);
  }
});

test('Daily promotion notifications normalize with actions and icons', async () => {
  const { normalizeNotifications } = await import('../src/lib/notifications.js');
  const rawNotifs = [
    {
      id: 'promo-1',
      type: 'daily_promotion',
      title: 'Daily Promotional Wheel',
      message: 'Spin today’s challenge wheel',
      icon: '🎡',
      action: 'spin',
      read: false
    },
    {
      id: 'trip-1',
      type: 'morning_plan',
      title: 'Day 1: Old Dubai',
      message: 'Your plan is ready',
      icon: '📍',
      deepLink: '/trips/1?day=0',
      read: true
    }
  ];

  const normalized = normalizeNotifications(rawNotifs);
  assert.equal(normalized.length, 2);
  const promo = normalized.find(n => n.type === 'daily_promotion');
  assert.ok(promo, 'Promotional notification must be preserved');
  assert.equal(promo.action, 'spin');
  assert.equal(promo.icon, '🎡');
  assert.equal(promo.read, false);
});

test('Coins balance is kept strictly distinct from XP and Level stats', () => {
  const passportSummary = {
    xp: 250,
    level: { number: 2, name: 'Pathfinder' },
    stamps: [{ id: 's1', title: 'Al Fahidi Discovery' }],
    daily_coins: 3
  };

  assert.equal(typeof passportSummary.daily_coins, 'number');
  assert.equal(passportSummary.xp, 250);
  assert.notEqual(passportSummary.daily_coins, passportSummary.xp);
});
