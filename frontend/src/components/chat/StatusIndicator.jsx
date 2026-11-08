'use client';
import {LocalizedText} from '@/i18n/Localized';

import { Building2, Navigation, Ticket, Sparkles, Activity } from 'lucide-react';

export default function StatusIndicator({ text }) {
  if (!text) return null;

  // Determine the correct thematic icon based on the status text
  let Icon = Activity;
  if (text.includes('Accommodation Agent')) Icon = Building2;
  else if (text.includes('Logistics Agent')) Icon = Navigation;
  else if (text.includes('Event Agent')) Icon = Ticket;
  else if (text.includes('Trip Planner') || text.includes('Orchestrator')) Icon = Sparkles;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: 'var(--space-1) var(--space-4)' }}>
      <div className="live-status-pill">
        <Icon size={14} className="live-status-icon" style={{ animation: 'pulseDot 1.4s ease-in-out infinite' }} />
        <span><LocalizedText>{text}</LocalizedText></span>
      </div>
    </div>
  );
}
