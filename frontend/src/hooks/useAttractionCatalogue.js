'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { rememberCatalogue, recalledCatalogue, isCatalogueFresh } from '@/lib/catalogueSnapshot';

export function useAttractionCatalogue() {
  const { token } = useAuth();
  const cachedItems = token ? recalledCatalogue(token) : [];
  const hasCache = cachedItems.length > 0;

  const [state, setState] = useState(() => hasCache ? { token, revision: 0, items: cachedItems, error: '' } : null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!token) return;

    // Fast return if cache is fresh and this isn't a manual retry
    if (revision === 0 && isCatalogueFresh(token)) {
      return;
    }

    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15000);

    async function load() {
      const items = [];
      try {
        let offset = 0;
        do {
          const page = await apiRequest(`/api/v1/catalogue?offset=${offset}&limit=200`, {
            token,
            signal: controller.signal
          });
          items.push(...page.items);
          offset = page.nextOffset;
        } while (offset !== null && !controller.signal.aborted && items.length < 1000);

        if (!controller.signal.aborted) {
          rememberCatalogue(token, items);
          setState({ token, revision, items, error: '' });
        }
      } catch (error) {
        if (timedOut || !controller.signal.aborted) {
          setState(previous => ({
            token,
            revision,
            items: items.length ? items : (previous?.token === token ? previous.items : (recalledCatalogue(token) || [])),
            error: timedOut ? 'Destinations are taking longer to load. Your saved places are safe; try again.' : error.message
          }));
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    load();
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [token, revision]);

  const current = state?.token === token ? state : (hasCache ? { items: cachedItems, revision: 0, error: '' } : null);
  const currentItems = current?.items || cachedItems;

  return {
    items: currentItems,
    loading: Boolean(token && currentItems.length === 0),
    error: current?.revision === revision ? current.error : '',
    retry: () => setRevision(v => v + 1)
  };
}
