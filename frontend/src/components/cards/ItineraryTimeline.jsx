'use client';
import {LocalizedText} from '@/i18n/Localized';


import { MapPin, Clock, Calendar } from 'lucide-react';

export default function ItineraryTimeline({ itinerary }) {
  if (!itinerary || !itinerary.days) return null;

  return (
    <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
      <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: '700', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <Calendar size={20} color="var(--color-accent)" />
        <LocalizedText>{itinerary.title || 'Your Itinerary'}</LocalizedText>
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {itinerary.days.map((day, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 'var(--space-4)' }}>
            {/* Timeline Line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-accent-soft)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: 'var(--text-sm)', flexShrink: 0 }}>
                {idx + 1}
              </div>
              {idx !== itinerary.days.length - 1 && (
                <div style={{ width: '2px', flex: 1, background: 'var(--color-border)', margin: 'var(--space-2) 0' }} />
              )}
            </div>
            {/* Day Content */}
            <div style={{ flex: 1, paddingBottom: 'var(--space-4)' }}>
              <h4 style={{ fontSize: 'var(--text-base)', fontWeight: '600', color: '#fff', marginBottom: 'var(--space-2)' }}>{day.title}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {day.activities && day.activities.map((act, actIdx) => (
                  <div key={actIdx} style={{ background: 'var(--color-bg)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                      <span style={{ fontWeight: '600', color: '#fff', fontSize: 'var(--text-sm)' }}>{act.name}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12}/> {act.time}</span>
                    </div>
                    {act.description && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}><LocalizedText>{act.description}</LocalizedText></p>}
                    {act.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-accent)', fontSize: 'var(--text-xs)' }}>
                        <MapPin size={12} /> {act.location}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
