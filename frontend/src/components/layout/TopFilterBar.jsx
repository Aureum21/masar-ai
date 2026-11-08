'use client';
import {LocalizedText} from '@/i18n/Localized';

import LanguageSwitcher from '@/i18n/LanguageSwitcher';

import { MapPin, Calendar, Users, DollarSign, PlusCircle } from 'lucide-react';

export default function TopFilterBar({ onFilterClick, onCreateTrip }) {
  const filters = [
    { id: 'where', label: 'Where', value: 'UAE & Gulf', icon: MapPin },
    { id: 'when', label: 'When', value: 'Anytime', icon: Calendar },
    { id: 'who', label: 'Who', value: '1 Guest', icon: Users },
    { id: 'budget', label: 'Budget', value: 'Any', icon: DollarSign },
  ];

  return (
    <header className="top-filter-bar"><LanguageSwitcher/>
      {/* ── Filter Pills Group ── */}
      <div className="top-filter-pills">
        {filters.map((filter) => {
          return (
            <button 
              key={filter.id}
              className="filter-pill"
              onClick={() => onFilterClick && onFilterClick(filter.id)}
            >
              <span className="filter-pill-label"><LocalizedText>{filter.label}</LocalizedText></span>
              <span className="filter-pill-value"><LocalizedText>{filter.value}</LocalizedText></span>
            </button>
          );
        })}
      </div>

      {/* ── Create a trip CTA Button ── */}
      <button 
        className="top-create-trip-btn"
        onClick={onCreateTrip}
      >
        <PlusCircle size={15} />
        <span><LocalizedText message={"Create a trip"} /></span>
      </button>
    </header>
  );
}
