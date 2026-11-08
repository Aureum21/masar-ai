/** Canonical preference keys; preserve legacy fields used by current controls. */
export function normalisePreferences(value = {}, changed = {}) {
  const result = {...value, ...changed};
  for (const [canonical, alias] of [['interests', 'vibes'], ['dietary_restrictions', 'dietary']]) {
    const selected = changed[canonical] ?? changed[alias] ?? value[canonical] ?? value[alias];
    if (Array.isArray(selected)) result[canonical] = result[alias] = [...new Set(selected)];
  }
  return result;
}
