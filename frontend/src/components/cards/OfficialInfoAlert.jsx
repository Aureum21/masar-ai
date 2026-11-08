'use client';
import {LocalizedText} from '@/i18n/Localized';


import { Info, ShieldAlert, AlertTriangle, ExternalLink } from 'lucide-react';

export default function OfficialInfoAlert({ info }) {
  if (!info) return null;

  const typeStyles = {
    visa: { bg: 'var(--color-accent-soft)', border: 'var(--color-accent)', icon: <ShieldAlert size={20} color="var(--color-accent)" />, title: 'Official Visa Information' },
    rule: { bg: 'var(--color-rose-soft)', border: 'var(--color-rose)', icon: <AlertTriangle size={20} color="var(--color-rose)" />, title: 'Important UAE Regulation' },
    general: { bg: 'var(--color-surface-elevated)', border: 'var(--color-border)', icon: <Info size={20} color="var(--color-text-primary)" />, title: 'Official Guideline' }
  };

  const style = typeStyles[info.category] || typeStyles.general;

  return (
    <div style={{ background: style.bg, borderRadius: 'var(--radius-md)', border: `1px solid ${style.border}`, padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
      <div style={{ flexShrink: 0, marginTop: '2px' }}>
        {style.icon}
      </div>
      <div>
        <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: '700', color: '#fff', marginBottom: 'var(--space-1)' }}>{style.title}</h4>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', lineHeight: '1.5' }}>
          {info.content}
        </p>
        {info.link && (
          <a href={info.link} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
            <ExternalLink size={12} /><LocalizedText message={" Read more on u.ae"} /></a>
        )}
      </div>
    </div>
  );
}
