'use client';
import LanguageSwitcher from '@/i18n/LanguageSwitcher';
import {formattingLocale} from '../../../i18n/messages.mjs';
import {Localized,LocalizedText} from '@/i18n/Localized';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, LoaderCircle } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { passportRequest, notifyPassportChanged } from '@/app/profile/_lib/passportApi';
import styles from '../trips.module.css';

export const STATUS_LABELS = { saved: 'Saved', upcoming: 'Upcoming', ongoing: 'Ongoing', past: 'Past' };
export function dateLabel(value,locale='en') {
  if (!value) return 'Dates to come';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? 'Dates to come' : new Intl.DateTimeFormat(formattingLocale(locale,'en'), { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date);
}
export function tripDates(trip,locale='en') {
  if (!trip.start_date) return 'Your dates are open';
  return `${dateLabel(trip.start_date,locale)}${trip.end_date && trip.end_date !== trip.start_date ? ` – ${dateLabel(trip.end_date,locale)}` : ''}`;
}
// Only a confirmed booking explicitly associated with this trip is evidence of booking.
export function hasConfirmedBooking(trip, bookings) {
  return bookings.some(b => b.trip_id != null && String(b.trip_id) === String(trip.id) && ['confirmed', 'booked'].includes(String(b.status).toLowerCase()));
}
export function TripShell({ children, back, backLabel = 'All trips' }) {
  return <div className={`app-container ${styles.shell}`}><Sidebar /><main className={styles.stage} id="trip-content"><div className={styles.container}><Localized element={"nav"} attributes={["aria-label"]} className={styles.topNav} aria-label="Trip navigation">{back ? <Link href={back}><ArrowLeft size={15} /><LocalizedText>{backLabel}</LocalizedText></Link> : <span><LocalizedText message={"MASAR / YOUR JOURNEYS"} /></span>}<LanguageSwitcher/><Link href="/rewards"><LocalizedText message={"My passport ↗"} /></Link></Localized>{children}</div></main></div>;
}
export function LoadingState({ children = 'Opening your journeys…' }) {
  return <div className={styles.empty} role="status"><LoaderCircle className={styles.spin} size={26} /><h2>{children}</h2><p><LocalizedText message={"Collecting your saved travel plans."} /></p></div>;
}
export function ErrorState({ error, retry }) {
  return <div className={styles.error} role="alert"><div><strong><LocalizedText message={"We couldn’t load this yet."} /></strong><p><LocalizedText>{error}</LocalizedText></p></div>{retry && <button className={styles.secondary} onClick={retry}><LocalizedText message={"Try again"} /></button>}</div>;
}
export function DateEditor({ trip, onSaved }) {
  const { token } = useAuth();
  const [start, setStart] = useState(trip.start_date?.slice(0, 10) || '');
  const [end, setEnd] = useState(trip.end_date?.slice(0, 10) || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function save(event) {
    event.preventDefault(); setError(''); setMessage('');
    if (!start || !end || end < start) { setError('Choose an end date on or after your start date.'); return; }
    setBusy(true);
    try { await passportRequest(token, `/trips/${trip.id}`, { method: 'PATCH', body: { expected_revision: trip.revision, start_date: start, end_date: end, timezone: trip.timezone || 'Asia/Dubai' } }); setMessage('Travel dates saved.'); notifyPassportChanged(); onSaved?.(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <details className={styles.dateEditor}><summary><CalendarDays size={17} /><LocalizedText>{trip.start_date ? 'Edit travel dates' : 'Add travel dates'}</LocalizedText><span aria-hidden="true">+</span></summary><form onSubmit={save}><p><LocalizedText preserveValues={[true,true]} message={"Your timeline follows these travel dates. ⟦0⟧Times use ⟦1⟧."} values={[trip.duration_days ? `Plan for ${trip.duration_days} days. ` : '',trip.timezone || 'Asia/Dubai']} /></p><div className={styles.formRow}><label><LocalizedText message={"Start date"} /><input type="date" required value={start} onChange={e => setStart(e.target.value)} /></label><label><LocalizedText message={"End date"} /><input type="date" required min={start || undefined} value={end} onChange={e => setEnd(e.target.value)} /></label><button className={styles.primary} disabled={busy}><LocalizedText>{busy ? 'Saving…' : 'Save dates'}</LocalizedText></button></div>{error && <p className={styles.errorText} role="alert"><LocalizedText>{error}</LocalizedText></p>}{message && <p className={styles.successText} role="status"><LocalizedText>{message}</LocalizedText></p>}</form></details>;
}
