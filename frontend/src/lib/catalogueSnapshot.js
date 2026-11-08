// In-memory with session cache: fast SWR restore on page reopen
const SNAPSHOT_KEY = 'masar_catalogue_snapshot';
let snapshot = null;

function readSessionSnapshot(token) {
  if (typeof window === 'undefined' || !token) return null;
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.token === token && Array.isArray(parsed.items)) {
      return parsed;
    }
  } catch (e) {
    // Ignore storage issues
  }
  return null;
}

export function rememberCatalogue(token, items) {
  if (!token || !Array.isArray(items)) return;
  const entry = { token, items, timestamp: Date.now() };
  snapshot = entry;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(entry));
    } catch (e) {
      // Storage quota or private browsing
    }
  }
}

export function recalledCatalogue(token) {
  if (!token) return [];
  if (snapshot && snapshot.token === token) return snapshot.items;
  const stored = readSessionSnapshot(token);
  if (stored) {
    snapshot = stored;
    return stored.items;
  }
  return [];
}

export function isCatalogueFresh(token, maxAgeMs = 120000) {
  if (!token) return false;
  if (snapshot && snapshot.token === token) {
    return Date.now() - snapshot.timestamp < maxAgeMs;
  }
  const stored = readSessionSnapshot(token);
  if (stored) {
    snapshot = stored;
    return Date.now() - stored.timestamp < maxAgeMs;
  }
  return false;
}
