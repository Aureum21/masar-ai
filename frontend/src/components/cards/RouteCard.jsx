'use client';
import {LocalizedText} from '@/i18n/Localized';


import { Navigation, ArrowRight, Clock, MapPin, DollarSign, Bus, Train, Car, Footprints } from 'lucide-react';

export default function RouteCard({ route }) {
  if (!route) return null;

  return (
    <div className="mindtrip-card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
      {/* ── Route Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: 'var(--text-sm)', color: '#FFFFFF' }}>
          <MapPin size={15} color="var(--color-accent-hover)" />
          <span><LocalizedText>{route.origin || 'Start'}</LocalizedText></span>
        </div>
        <ArrowRight size={14} color="var(--color-text-muted)" />
        <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-accent-hover)' }}>
          <LocalizedText>{route.destination || 'Destination'}</LocalizedText>
        </div>
      </div>

      {/* ── Route Steps Timeline ── */}
      {route.steps && route.steps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingInlineStart: '16px', borderInlineStart: '2px dashed rgba(245, 158, 11, 0.35)', marginBottom: 'var(--space-4)', position: 'relative' }}>
          {route.steps.map((step, idx) => {
            const lowerStep = step.toLowerCase();
            let Icon = Navigation;
            if (lowerStep.includes('walk')) Icon = Footprints;
            else if (lowerStep.includes('bus')) Icon = Bus;
            else if (lowerStep.includes('metro') || lowerStep.includes('train')) Icon = Train;
            else if (lowerStep.includes('taxi') || lowerStep.includes('drive') || lowerStep.includes('careem')) Icon = Car;

            return (
              <div key={idx} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', position: 'relative', paddingInlineStart: '12px' }}>
                <div style={{ 
                  position: 'absolute', left: '-27px', top: '0px', 
                  width: '20px', height: '20px', borderRadius: '50%', 
                  background: 'var(--color-surface-elevated)', border: '1px solid var(--color-accent-hover)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon size={10} color="var(--color-accent-hover)" />
                </div>
                {step}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Stats Bar ── */}
      <div style={{ display: 'flex', gap: 'var(--space-6)', borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--space-3)' }}>
        {route.duration && (
          <div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}><LocalizedText message={"Duration"} /></div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#FFFFFF' }}>{route.duration}</div>
          </div>
        )}
        {route.distance && (
          <div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}><LocalizedText message={"Distance"} /></div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#FFFFFF' }}>{route.distance}</div>
          </div>
        )}
        {route.fare && (
          <div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}><LocalizedText message={"Est. Fare"} /></div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-accent-hover)' }}>{route.fare}</div>
          </div>
        )}
      </div>
    </div>
  );
}
