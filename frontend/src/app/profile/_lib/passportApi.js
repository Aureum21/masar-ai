'use client';
import {formattingLocale} from '../../../i18n/messages.mjs';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export async function passportRequest(token, path, options = {}) {
  if (!token) throw new Error('Please sign in to open your passport.');
  const { responseType, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);
  headers.set('Authorization', `Bearer ${token}`);
  let body = requestOptions.body;
  if (body != null && !(body instanceof FormData) && typeof body !== 'string') {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetch(`${API_BASE}/api/v1/passport/${String(path).replace(/^\//, '')}`, { ...requestOptions, body, headers, cache: 'no-store' });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('We could not reach your passport. Check your connection and try again.');
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const detail = data?.detail;
    const message = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map(item => item.msg || 'Invalid request').join(' · ') : data?.message;
    throw new Error(message || `Your passport request could not be completed (${response.status}).`);
  }
  if (responseType === 'blob') return response.blob();
  if (response.status === 204) return null;
  return response.json();
}

const PASSPORT_STORAGE_PREFIX = 'masar_passport_';
const passportMemoryCache = new Map();

function readStoredPassport(key) {
  if (typeof window === 'undefined' || !key) return null;
  try {
    const raw = sessionStorage.getItem(PASSPORT_STORAGE_PREFIX + key);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

function persistPassport(key, data) {
  if (typeof window === 'undefined' || !key) return;
  try {
    sessionStorage.setItem(PASSPORT_STORAGE_PREFIX + key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function getCachedPassport(token, path) {
  if (!token || !path) return null;
  const key = token + ':' + path;
  if (passportMemoryCache.has(key)) {
    return passportMemoryCache.get(key);
  }
  const stored = readStoredPassport(key);
  if (stored) {
    passportMemoryCache.set(key, stored);
    return stored;
  }
  return null;
}

export function notifyPassportChanged() {
  passportMemoryCache.clear();
  if (typeof window !== 'undefined') {
    try {
      Object.keys(sessionStorage).forEach(k => {
        if (k.startsWith(PASSPORT_STORAGE_PREFIX)) sessionStorage.removeItem(k);
      });
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event('masar:passport-changed'));
  }
}

export function usePassportResource(path) {
  const { token } = useAuth();
  const request = useRef({ sequence: 0, controller: null });

  const initialCached = token && path ? getCachedPassport(token, path) : null;
  const [state, setState] = useState(() => ({
    token: initialCached ? token : null,
    path: initialCached ? path : null,
    data: initialCached ? initialCached.data : null,
    loading: !initialCached,
    error: ''
  }));

  const refresh = useCallback(async (force = false) => {
    request.current.controller?.abort();
    const sequence = ++request.current.sequence;
    if (!token || !path) return null;

    const cacheKey = token + ':' + path;
    const cached = getCachedPassport(token, path);

    if (!force && cached && cached.data && (Date.now() - cached.timestamp < 30000)) {
      if (request.current.sequence === sequence) {
        setState({ token, path, data: cached.data, loading: false, error: '' });
      }
      return cached.data;
    }

    const controller = new AbortController();
    request.current.controller = controller;

    if (!cached || !cached.data) {
      setState(previous => ({
        token,
        path,
        data: previous.token === token && previous.path === path ? previous.data : null,
        loading: true,
        error: ''
      }));
    }

    try {
      const data = await passportRequest(token, path, { signal: controller.signal });
      const entry = { data, timestamp: Date.now() };
      passportMemoryCache.set(cacheKey, entry);
      persistPassport(cacheKey, entry);

      if (request.current.sequence === sequence && !controller.signal.aborted) {
        setState({ token, path, data, loading: false, error: '' });
      }
      return data;
    } catch (error) {
      if (error.name !== 'AbortError' && request.current.sequence === sequence) {
        setState(previous => ({
          token,
          path,
          data: previous.data || (cached ? cached.data : null),
          loading: false,
          error: error.message
        }));
      }
      return null;
    }
  }, [token, path]);

  useEffect(() => {
    if (!token || !path) return;

    let mounted = true;
    const cached = getCachedPassport(token, path);
    const isFresh = Boolean(cached && cached.data && (Date.now() - cached.timestamp < 30000));

    if (!isFresh) {
      Promise.resolve().then(() => { if (mounted) refresh(false); });
    }

    const onChanged = () => refresh(true);
    window.addEventListener('masar:passport-changed', onChanged);
    const req = request.current;

    return () => {
      mounted = false;
      req.sequence += 1;
      req.controller?.abort();
      window.removeEventListener('masar:passport-changed', onChanged);
    };
  }, [refresh, token, path]);

  const current = state.token === token && state.path === path;
  const currentData = current && token ? state.data : (initialCached ? initialCached.data : null);

  return {
    data: currentData,
    loading: Boolean(token && path && !currentData && state.loading),
    error: current && token ? state.error : '',
    refresh: () => refresh(true)
  };
}

export function passportDate(value,locale='en') {
  if (!value) return 'Date not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date not set' : new Intl.DateTimeFormat(formattingLocale(locale,'en'), { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}
