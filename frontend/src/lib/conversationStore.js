'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { API_BASE } from './api';

const STORAGE_KEY = 'masar_cached_conversations';
const EMPTY_LIST = [];
let memoryConversations = null;
let memoryToken = null;
let inFlightPromise = null;
const listeners = new Set();

function emitChange() {
  listeners.forEach(listener => listener());
}

function readStoredConversations(token) {
  if (typeof window === 'undefined' || !token) return null;
  try {
    const raw = sessionStorage.getItem(`${STORAGE_KEY}_${token}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function persistConversations(token, data) {
  if (typeof window === 'undefined' || !token) return;
  try {
    sessionStorage.setItem(`${STORAGE_KEY}_${token}`, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function getCachedConversations(token) {
  if (!token) return EMPTY_LIST;
  if (memoryConversations !== null && memoryToken === token) {
    return memoryConversations;
  }
  const stored = readStoredConversations(token);
  if (stored !== null) {
    memoryConversations = stored;
    memoryToken = token;
    return stored;
  }
  return EMPTY_LIST;
}

export async function fetchConversations(token, force = false) {
  if (!token) return [];
  if (!force && memoryConversations !== null && memoryToken === token) {
    return memoryConversations;
  }
  if (inFlightPromise) return inFlightPromise;

  inFlightPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        memoryConversations = list;
        memoryToken = token;
        persistConversations(token, list);
        emitChange();
        return list;
      }
    } catch (err) {
      console.error('Error fetching conversations', err);
    } finally {
      inFlightPromise = null;
    }
    return memoryConversations || [];
  })();

  return inFlightPromise;
}

export async function deleteConversation(token, id) {
  if (!token || !id) return;
  // Optimistically remove from cache
  if (memoryConversations) {
    memoryConversations = memoryConversations.filter(c => c.id !== id);
    persistConversations(token, memoryConversations);
    emitChange();
  }
  try {
    await fetch(`${API_BASE}/api/v1/conversations/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (err) {
    console.error('Error deleting conversation', err);
  }
}

export function updateConversationTitle(token, id, title) {
  if (!token || !id || !memoryConversations) return;
  memoryConversations = memoryConversations.map(c => c.id === id ? { ...c, title, updated_at: new Date().toISOString() } : c);
  persistConversations(token, memoryConversations);
  emitChange();
}

export function addOrPrependConversation(token, newConv) {
  if (!token || !newConv) return;
  const existing = memoryConversations || [];
  const filtered = existing.filter(c => c.id !== newConv.id);
  memoryConversations = [newConv, ...filtered];
  memoryToken = token;
  persistConversations(token, memoryConversations);
  emitChange();
}

export function subscribeConversations(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * React hook that guarantees instant conversation list without disappearing when changing tabs
 */
export function useConversations(token) {
  const conversations = useSyncExternalStore(
    subscribeConversations,
    () => getCachedConversations(token),
    () => EMPTY_LIST
  );

  useEffect(() => {
    if (!token) return;

    // Revalidate in background without clearing existing list
    fetchConversations(token, false);

    const onRefresh = () => fetchConversations(token, true);
    window.addEventListener('refresh_conversations', onRefresh);

    return () => {
      window.removeEventListener('refresh_conversations', onRefresh);
    };
  }, [token]);

  return {
    conversations,
    refetch: () => fetchConversations(token, true),
    deleteConversation: (id) => deleteConversation(token, id)
  };
}
