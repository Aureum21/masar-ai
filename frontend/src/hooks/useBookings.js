'use client';

import { API_BASE } from '@/lib/api';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

const BOOKINGS_STORAGE_PREFIX = 'masar_bookings_';

function readStoredBookings(token) {
  if (typeof window === 'undefined' || !token) return null;
  try {
    const raw = sessionStorage.getItem(`${BOOKINGS_STORAGE_PREFIX}${token}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.bookings)) return parsed;
    }
  } catch (e) {
    // Ignore storage issues
  }
  return null;
}

function persistBookings(token, bookings, preBookings) {
  if (typeof window === 'undefined' || !token) return;
  try {
    sessionStorage.setItem(`${BOOKINGS_STORAGE_PREFIX}${token}`, JSON.stringify({
      bookings,
      preBookings,
      timestamp: Date.now()
    }));
  } catch (e) {
    // Storage quota or private browsing
  }
}

let bookingsMemoryCache = { token: null, bookings: null, preBookings: null, timestamp: 0 };
const inFlightBookings = new Map();
const bookingsListeners = new Set();

function emitBookingsChange() {
  bookingsListeners.forEach(listener => listener());
}

function getCachedBookingsData(token) {
  if (!token) return null;
  if (bookingsMemoryCache.token === token && bookingsMemoryCache.bookings !== null) {
    return bookingsMemoryCache;
  }
  const stored = readStoredBookings(token);
  if (stored) {
    bookingsMemoryCache = {
      token,
      bookings: stored.bookings,
      preBookings: stored.preBookings,
      timestamp: stored.timestamp
    };
    return bookingsMemoryCache;
  }
  return null;
}

/**
 * useBookings — Fetches booking history from the PostgreSQL database
 * via GET /api/v1/bookings with instant in-memory SWR caching
 */
export function useBookings() {
  const { token } = useAuth();
  const cached = token ? getCachedBookingsData(token) : null;
  const hasCache = Boolean(cached && cached.bookings !== null);

  const [bookings, setBookings] = useState(() => (hasCache ? cached.bookings : []));
  const [preBookings, setPreBookings] = useState(() => (hasCache ? cached.preBookings : []));
  const [loading, setLoading] = useState(() => !hasCache);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;

    const syncFromCache = () => {
      if (bookingsMemoryCache.token === token && bookingsMemoryCache.bookings !== null) {
        setBookings(bookingsMemoryCache.bookings);
        setPreBookings(bookingsMemoryCache.preBookings);
      }
    };
    bookingsListeners.add(syncFromCache);
    const unsubscribe = () => bookingsListeners.delete(syncFromCache);

    const isFresh = Boolean(
      bookingsMemoryCache.token === token &&
      bookingsMemoryCache.bookings !== null &&
      (Date.now() - bookingsMemoryCache.timestamp < 30000)
    );

    if (isFresh) {
      return unsubscribe;
    }

    const controller = new AbortController();
    const fetchBookings = async () => {
      if (!hasCache) setLoading(true);
      try {
        if (!inFlightBookings.has(token)) {
          const request = fetch(`${API_BASE}/api/v1/bookings`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal
          }).then(async response => {
            if (!response.ok) throw new Error(`Failed to fetch bookings: ${response.status}`);
            return response.json();
          }).finally(() => inFlightBookings.delete(token));
          inFlightBookings.set(token, request);
        }
        const data = await inFlightBookings.get(token);
        if (controller.signal.aborted) return;
        const b = data.bookings || [];
        const pb = data.pre_bookings || [];
        bookingsMemoryCache = { token, bookings: b, preBookings: pb, timestamp: Date.now() };
        persistBookings(token, b, pb);
        setBookings(b);
        setPreBookings(pb);
        setError(null);
        emitBookingsChange();
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchBookings();

    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [token, hasCache]);

  const refetch = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`Failed to fetch bookings: ${response.status}`);
      
      const data = await response.json();
      const b = data.bookings || [];
      const pb = data.pre_bookings || [];
      bookingsMemoryCache = { token, bookings: b, preBookings: pb, timestamp: Date.now() };
      persistBookings(token, b, pb);
      setBookings(b);
      setPreBookings(pb);
      setError(null);
      emitBookingsChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    bookings: token && bookingsMemoryCache.token === token ? bookings : (cached?.bookings || []),
    preBookings: token && bookingsMemoryCache.token === token ? preBookings : (cached?.preBookings || []),
    loading: token ? loading : false,
    error,
    refetch
  };
}
