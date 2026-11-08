/**
 * Pure helper utilities for Traveler Passport display and calculations.
 */

export const PASSPORT_LEVELS = [
  { xp: 0, name: 'Explorer', number: 1 },
  { xp: 100, name: 'Curator', number: 2 },
  { xp: 250, name: 'Archivist', number: 3 },
  { xp: 500, name: 'Master Voyager', number: 4 }
];

export function computeUserInitials(name, email = '') {
  if (name && typeof name === 'string' && name.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  if (email && typeof email === 'string' && email.trim()) {
    return email.trim().charAt(0).toUpperCase();
  }
  return 'M';
}

export function computeLevelProgress(xp = 0, levels = PASSPORT_LEVELS) {
  const currentXp = Math.max(0, Number(xp) || 0);
  let currentLevelIndex = 0;
  for (let i = 0; i < levels.length; i++) {
    if (currentXp >= levels[i].xp) {
      currentLevelIndex = i;
    }
  }

  const currentLevel = levels[currentLevelIndex];
  const nextLevel = levels[currentLevelIndex + 1] || null;

  if (!nextLevel) {
    return {
      number: currentLevel.number,
      name: currentLevel.name,
      currentXp,
      nextXp: null,
      xpNeeded: 0,
      progress: 1
    };
  }

  const xpInLevel = currentXp - currentLevel.xp;
  const levelSpan = nextLevel.xp - currentLevel.xp;
  const progress = Math.min(1, Math.max(0, xpInLevel / levelSpan));

  return {
    number: currentLevel.number,
    name: currentLevel.name,
    currentXp,
    nextXp: nextLevel.xp,
    xpNeeded: nextLevel.xp - currentXp,
    progress
  };
}

export function filterStampsByCategory(stamps = [], category = 'all') {
  if (!Array.isArray(stamps)) return [];
  if (!category || category === 'all') return stamps;
  return stamps.filter(stamp => stamp && stamp.category === category);
}

export function extractUniqueCategories(stamps = []) {
  if (!Array.isArray(stamps)) return ['all'];
  const categories = new Set();
  for (const s of stamps) {
    if (s && s.category) categories.add(s.category);
  }
  return ['all', ...Array.from(categories)];
}
