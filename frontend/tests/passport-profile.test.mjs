import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeUserInitials,
  computeLevelProgress,
  filterStampsByCategory,
  extractUniqueCategories,
  PASSPORT_LEVELS
} from '../src/lib/passportUtils.js';

test('computeUserInitials handles various name and email formats', () => {
  assert.equal(computeUserInitials('Zayed Al Nahyan'), 'ZN');
  assert.equal(computeUserInitials('Fatima'), 'F');
  assert.equal(computeUserInitials(' Rashid '), 'R');
  assert.equal(computeUserInitials('', 'ahmed.explorer@example.com'), 'A');
  assert.equal(computeUserInitials(null, 'mariam@example.com'), 'M');
  assert.equal(computeUserInitials('', ''), 'M');
  assert.equal(computeUserInitials(null, null), 'M');
});

test('computeLevelProgress accurately calculates XP thresholds and progress bars', () => {
  // Level 1: Explorer (0 to 100 XP)
  const atZero = computeLevelProgress(0);
  assert.equal(atZero.number, 1);
  assert.equal(atZero.name, 'Explorer');
  assert.equal(atZero.nextXp, 100);
  assert.equal(atZero.xpNeeded, 100);
  assert.equal(atZero.progress, 0);

  // 60 XP into Level 1 (60% to Level 2)
  const atSixty = computeLevelProgress(60);
  assert.equal(atSixty.number, 1);
  assert.equal(atSixty.progress, 0.6);
  assert.equal(atSixty.xpNeeded, 40);

  // Exactly 100 XP: Level 2 Curator
  const at100 = computeLevelProgress(100);
  assert.equal(at100.number, 2);
  assert.equal(at100.name, 'Curator');
  assert.equal(at100.nextXp, 250);
  assert.equal(at100.xpNeeded, 150);
  assert.equal(at100.progress, 0);

  // 175 XP into Level 2 (50% of the 150 XP span from 100 to 250)
  const at175 = computeLevelProgress(175);
  assert.equal(at175.number, 2);
  assert.equal(at175.progress, 0.5);
  assert.equal(at175.xpNeeded, 75);

  // 500+ XP: Max Level 4 Master Voyager
  const at500 = computeLevelProgress(500);
  assert.equal(at500.number, 4);
  assert.equal(at500.name, 'Master Voyager');
  assert.equal(at500.nextXp, null);
  assert.equal(at500.progress, 1);
  assert.equal(at500.xpNeeded, 0);

  const at1000 = computeLevelProgress(1000);
  assert.equal(at1000.number, 4);
  assert.equal(at1000.progress, 1);
});

test('filterStampsByCategory correctly filters stamps and handles empty/all', () => {
  const sampleStamps = [
    { id: '1', title: 'Burj Khalifa Observation', category: 'discovery' },
    { id: '2', title: 'Sharjah Dhow Craft', category: 'heritage' },
    { id: '3', title: 'Calligraphy Motif', category: 'creative' },
    { id: '4', title: 'Grand Mosque Reflection', category: 'heritage' }
  ];

  assert.equal(filterStampsByCategory(sampleStamps, 'all').length, 4);
  assert.equal(filterStampsByCategory(sampleStamps, 'heritage').length, 2);
  assert.equal(filterStampsByCategory(sampleStamps, 'discovery').length, 1);
  assert.equal(filterStampsByCategory(sampleStamps, 'adventure').length, 0);
  assert.deepEqual(filterStampsByCategory([], 'heritage'), []);
  assert.deepEqual(filterStampsByCategory(null, 'all'), []);
});

test('extractUniqueCategories extracts all unique categories prefixed with all', () => {
  const sampleStamps = [
    { id: '1', category: 'discovery' },
    { id: '2', category: 'heritage' },
    { id: '3', category: 'heritage' },
    { id: '4', category: 'creative' }
  ];

  const categories = extractUniqueCategories(sampleStamps);
  assert.deepEqual(categories, ['all', 'discovery', 'heritage', 'creative']);
  assert.deepEqual(extractUniqueCategories([]), ['all']);
  assert.deepEqual(extractUniqueCategories(null), ['all']);
});
