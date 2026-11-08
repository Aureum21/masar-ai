'use client';
import {LocalizedText} from '@/i18n/Localized';


import { Sliders } from 'lucide-react';
import MasarWelcomeEmblem from '@/components/chat/MasarWelcomeEmblem';
import SuggestionChips from '@/components/chat/SuggestionChips';

export default function HeroIllustration({ onSelectSuggestion }) {
  return (
    <div className="chat-hero-welcome">
      {/* ── Official Masar AI Grand Emblem ── */}
      <MasarWelcomeEmblem/>

      {/* ── Headlines ── */}
      <h1 className="chat-hero-title"><LocalizedText message={"Where to today?"} /></h1>
      <p className="chat-hero-subtitle"><LocalizedText message={"Hey there, I'm here to assist you in planning your experience. Ask me anything UAE travel related."} /></p>

      {/* ── Assistant Setup Pill ── */}
      <button 
        className="assistant-setup-pill"
        onClick={() => onSelectSuggestion && onSelectSuggestion("Help me plan a personalized itinerary for Dubai and Abu Dhabi")}
      >
        <Sliders size={13} />
        <span><LocalizedText message={"Set up my assistant"} /></span>
      </button>

      {/* ── Suggestion Chips ── */}
      <div style={{ marginTop: 'var(--space-2)' }}>
        <SuggestionChips onSelect={onSelectSuggestion} />
      </div>
    </div>
  );
}
