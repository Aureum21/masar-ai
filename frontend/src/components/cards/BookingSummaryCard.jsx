'use client';
import {LocalizedText} from '@/i18n/Localized';


import { CheckCircle2, Ticket, CreditCard } from 'lucide-react';

export default function BookingSummaryCard({ booking }) {
  if (!booking) return null;

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
      <div style={{ background: 'var(--color-accent-soft)', padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <CheckCircle2 size={20} color="var(--color-accent)" />
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: '600', color: 'var(--color-accent)' }}><LocalizedText message={"Booking Confirmed"} /></h3>
      </div>
      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {booking.hotelName && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}><LocalizedText message={"Hotel"} /></span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: '#fff' }}>{booking.hotelName}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}><LocalizedText message={"Reference"} /></span>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: '#fff', fontFamily: 'monospace' }}><LocalizedText>{booking.reference || 'UAE-BK-9982'}</LocalizedText></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}><LocalizedText message={"Total Amount"} /></span>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: '#fff' }}><LocalizedText>{booking.total || '0.00 AED'}</LocalizedText></span>
        </div>
        <hr style={{ borderColor: 'var(--color-border)', margin: 'var(--space-2) 0' }} />
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button style={{ flex: 1, padding: '8px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)', fontSize: 'var(--text-xs)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <Ticket size={14} /><LocalizedText message={" View Tickets"} /></button>
          <button style={{ flex: 1, padding: '8px', background: 'var(--color-cta-bg)', border: 'none', borderRadius: 'var(--radius-sm)', color: 'var(--color-cta-text)', fontSize: 'var(--text-xs)', fontWeight: '600', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <CreditCard size={14} /><LocalizedText message={" Pay Now"} /></button>
        </div>
      </div>
    </div>
  );
}
