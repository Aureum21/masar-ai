'use client';
import {Localized} from '@/i18n/Localized';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_BASE, notifyPassportChanged } from '../_lib/passportApi';
import Celebration from './Celebration';

export default function BookingCelebrationHost() {
  const { token, userEmail } = useAuth();
  const [celebration, setCelebration] = useState(null);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const seen = new Set();
    async function confirmed(event) {
      const id = event.detail?.event_id;
      if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id) || seen.has(id)) return;
      const key = `masar:celebrated:${userEmail}:${id}`;
      try { if (localStorage.getItem(key)) return; } catch { /* Private browsing still has in-memory deduplication. */ }
      seen.add(id);
      try {
        const response = await fetch(`${API_BASE}/api/v1/bookings/events/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' });
        if (!response.ok) return;
        const saved = await response.json();
        if (controller.signal.aborted || saved.event_id !== id || saved.source !== 'provider' || saved.status !== 'CONFIRMED' || !saved.booking_id || !saved.confirmed_at || !['live', 'sandbox'].includes(saved.environment)) return;
        try { localStorage.setItem(key, 'seen'); } catch { /* Animation storage is optional. */ }
        setCelebration({ token, title: `${saved.environment === 'sandbox' ? 'Test ' : ''}${saved.kind === 'flight' ? 'flight' : 'hotel'} booking confirmed.`, subtitle: saved.environment === 'sandbox' ? 'Sandbox reservation. No real travel has been booked and no live rewards were issued.' : 'Your provider has confirmed the reservation. Keep the details in your travel receipts.' });
        notifyPassportChanged();
      } catch { /* Failed verification never turns into a success animation. */ }
    }
    window.addEventListener('masar:booking-confirmed', confirmed);
    return () => { controller.abort(); window.removeEventListener('masar:booking-confirmed', confirmed); };
  }, [token, userEmail]);
  return celebration?.token === token ? <Localized element={Celebration} attributes={["title","subtitle"]} kind="booking" title={celebration.title} subtitle={celebration.subtitle} onClose={() => setCelebration(null)} /> : null;
}
