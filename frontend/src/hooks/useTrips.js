'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { optimisticDeleteTrip } from '@/lib/tripDeletion';

const TRIPS_STORAGE_PREFIX = 'masar_trips_';

function readStoredTrips(token) {
  if (typeof window === 'undefined' || !token) return null;
  try {
    const raw = sessionStorage.getItem(`${TRIPS_STORAGE_PREFIX}${token}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items)) return parsed;
    }
  } catch (e) {
    // Ignore storage issues
  }
  return null;
}

function persistTrips(token, items) {
  if (typeof window === 'undefined' || !token || !Array.isArray(items)) return;
  try {
    sessionStorage.setItem(`${TRIPS_STORAGE_PREFIX}${token}`, JSON.stringify({ items, timestamp: Date.now() }));
  } catch (e) {
    // Storage quota or private browsing
  }
}

// Module-level in-memory cache shared across all pages (Explore, Trips, Profile, Today)
let tripsMemoryCache = { token: null, items: null, timestamp: 0 };
const inFlightTrips = new Map();
const removedTrips = new Map();
const pendingDeletes = new Map();
const visibleTrips = (items, token) => (Array.isArray(items) ? items : []).filter(trip => !removedTrips.get(token)?.has(String(trip.id)));
const tripsListeners = new Set();

function emitTripsChange() {
  tripsListeners.forEach(listener => listener());
}

export function getCachedTrips(token) {
  if (!token) return [];
  if (tripsMemoryCache.token === token && Array.isArray(tripsMemoryCache.items)) {
    return visibleTrips(tripsMemoryCache.items, token);
  }
  const stored = readStoredTrips(token);
  if (stored) {
    tripsMemoryCache = { token, items: stored.items, timestamp: stored.timestamp };
    return visibleTrips(stored.items, token);
  }
  return [];
}

export function getCachedTripById(token, id) {
  if (!token || !id) return null;
  const list = getCachedTrips(token);
  return list.find(t => String(t.id) === String(id)) || null;
}

export function useTrips() {
  const { token } = useAuth();
  const cachedList = token ? getCachedTrips(token) : [];
  const hasCache = cachedList.length > 0;

  const [dataset, setDataset] = useState(() => ({
    token: hasCache ? token : null,
    items: cachedList
  }));
  const [loading, setLoading] = useState(() => !hasCache);
  const [error, setError] = useState(null);

  const trips = dataset.token === token ? dataset.items : (hasCache ? cachedList : []);

  const load = useCallback(async (signal) => {
    if (!token) return [];
    if (inFlightTrips.has(token)) return inFlightTrips.get(token);

    const request = apiRequest('/api/v1/trips', { token, signal }).finally(() => inFlightTrips.delete(token));
    inFlightTrips.set(token, request);
    return request;
  }, [token]);

  useEffect(() => {
    if (!token) return;

    // Subscribe to trips updates from other components
    const syncFromCache = () => {
      if (tripsMemoryCache.token === token && tripsMemoryCache.items !== null) {
        setDataset({ token, items: visibleTrips(tripsMemoryCache.items, token) });
      }
    };
    tripsListeners.add(syncFromCache);
    const unsubscribe = () => tripsListeners.delete(syncFromCache);

    // If cache is fresh (< 30 seconds), skip immediate re-fetch
    const isFresh = Boolean(
      tripsMemoryCache.token === token && 
      tripsMemoryCache.items !== null && 
      (Date.now() - tripsMemoryCache.timestamp < 30000)
    );

    if (isFresh) {
      return unsubscribe;
    }

    const controller = new AbortController();
    load(controller.signal)
      .then(items => {
        if (!controller.signal.aborted) {
          const list = visibleTrips(items, token);
          tripsMemoryCache = { token, items: list, timestamp: Date.now() };
          persistTrips(token, list);
          setDataset({ token, items: list });
          setError(null);
          emitTripsChange();
        }
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setError(err.message);
          if (!hasCache) setDataset({ token, items: [] });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [load, token, hasCache]);

  async function refetch() {
    setLoading(true);
    try {
      const items = await apiRequest('/api/v1/trips', { token });
      const list = visibleTrips(items, token);
      tripsMemoryCache = { token, items: list, timestamp: Date.now() };
      persistTrips(token, list);
      setDataset({ token, items: list });
      setError(null);
      emitTripsChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteTrip(id) {
    const key = `${token}:${id}`;
    if (pendingDeletes.has(key)) return pendingDeletes.get(key);
    setError(null);
    if (!removedTrips.has(token)) removedTrips.set(token, new Set());
    const current = () => (tripsMemoryCache.token === token ? tripsMemoryCache.items : dataset.items);
    const publish = items => {
      if (tripsMemoryCache.token !== token) return;
      tripsMemoryCache = { token, items, timestamp: Date.now() };
      persistTrips(token, items);
      setDataset(previous => (previous.token === token ? { token, items } : previous));
      emitTripsChange();
    };
    const task = optimisticDeleteTrip({ id, token, read: current, publish, hiddenIds: removedTrips.get(token) })
      .catch(error => {
        setError(error.message);
        throw error;
      })
      .finally(() => pendingDeletes.delete(key));
    pendingDeletes.set(key, task);
    await task;
    return true;
  }

  async function createTrip(payload) {
    try {
      const trip = await apiRequest('/api/v1/trips', {
        token,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const updated = [trip, ...(tripsMemoryCache.items || [])];
      tripsMemoryCache = { token, items: updated, timestamp: Date.now() };
      persistTrips(token, updated);
      setDataset({ token, items: updated });
      emitTripsChange();
      return trip;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function updateTrip(id, patch) {
    try {
      const updatedTrip = await apiRequest(`/api/v1/trips/${id}`, {
        token,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      const updated = (tripsMemoryCache.items || []).map(t => (t.id === id ? updatedTrip : t));
      tripsMemoryCache = { token, items: updated, timestamp: Date.now() };
      persistTrips(token, updated);
      setDataset({ token, items: updated });
      emitTripsChange();
      return updatedTrip;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  return {
    trips: token ? trips : [],
    loading: token ? loading : false,
    error,
    refetch,
    deleteTrip,
    createTrip,
    updateTrip
  };
}
