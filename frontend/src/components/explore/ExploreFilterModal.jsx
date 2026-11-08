'use client';
import {LocalizedText} from '@/i18n/Localized';


import { useState,useRef,useId } from 'react';
import {useDialogFocus} from '@/hooks/useDialogFocus';
import { X, SlidersHorizontal, Check, Star } from 'lucide-react';

const PRICE_OPTIONS = ['$', '$$', '$$$', '$$$$'];
const RATING_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '4.0+ ★', value: 4.0 },
  { label: '4.5+ ★', value: 4.5 },
  { label: '4.8+ ★', value: 4.8 }
];
const TAG_OPTIONS = [
  'Michelin Star',
  'Skyline Views',
  'Waterfront',
  'Heritage',
  'Desert Safari',
  'VIP Access',
  'Family Friendly',
  'Romantic',
  'Live Show'
];

export default function ExploreFilterModal({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters
}) {
  const [localFilters, setLocalFilters] = useState(filters);
  const dialog=useRef(null),titleId=useId();
  useDialogFocus(dialog,isOpen,onClose);

  if (!isOpen) return null;

  const togglePrice = (price) => {
    const exists = localFilters.priceTiers.includes(price);
    const updated = exists 
      ? localFilters.priceTiers.filter(p => p !== price)
      : [...localFilters.priceTiers, price];
    setLocalFilters({ ...localFilters, priceTiers: updated });
  };

  const toggleTag = (tag) => {
    const exists = localFilters.tags.includes(tag);
    const updated = exists 
      ? localFilters.tags.filter(t => t !== tag)
      : [...localFilters.tags, tag];
    setLocalFilters({ ...localFilters, tags: updated });
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    const emptyFilters = {
      priceTiers: [],
      minRating: 0,
      tags: []
    };
    setLocalFilters(emptyFilters);
    onResetFilters();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(12px, 2.5vw, 24px)',
        overflowY: 'auto',
        animation: 'masarModalFadeIn 0.25s ease-out'
      }}
      onClick={onClose}
    >
      <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'radial-gradient(ellipse at 50% 0, rgba(212, 178, 113, 0.10), transparent 65%), #101113',
          border: '1px solid rgba(212, 178, 113, 0.28)',
          borderRadius: '28px',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85), 0 0 50px rgba(240, 185, 95, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          animation: 'masarModalScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersHorizontal size={18} color="#F59E0B" />
            <h2 id={titleId} style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}><LocalizedText message={"Refine Discovery"} /></h2>
          </div>
          <button aria-label="Close discovery filters"
            onClick={onClose}
            className="masar-modal-close-btn"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px', maxHeight: '70vh', overflowY: 'auto' }}>
          
          {/* 1. Price Tier */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#CBD5E1', marginBottom: '10px' }}><LocalizedText message={"Price Range"} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {PRICE_OPTIONS.map((price) => {
                const isSelected = localFilters.priceTiers.includes(price);
                return (
                  <button
                    key={price}
                    onClick={() => togglePrice(price)}
                    style={{
                      padding: '10px',
                      borderRadius: '12px',
                      border: isSelected ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.1)',
                      backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                      color: isSelected ? '#FBBF24' : '#94A3B8',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {price}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Minimum Rating */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#CBD5E1', marginBottom: '10px' }}><LocalizedText message={"Minimum Star Rating"} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {RATING_OPTIONS.map((option) => {
                const isSelected = localFilters.minRating === option.value;
                return (
                  <button
                    key={option.label}
                    onClick={() => setLocalFilters({ ...localFilters, minRating: option.value })}
                    style={{
                      padding: '10px',
                      borderRadius: '12px',
                      border: isSelected ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.1)',
                      backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                      color: isSelected ? '#FBBF24' : '#94A3B8',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <LocalizedText>{option.label}</LocalizedText>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Vibe & Feature Tags */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#CBD5E1', marginBottom: '10px' }}><LocalizedText message={"Atmosphere & Tags"} /></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {TAG_OPTIONS.map((tag) => {
                const isSelected = localFilters.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '9999px',
                      border: isSelected ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.1)',
                      backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                      color: isSelected ? '#FBBF24' : '#CBD5E1',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    {isSelected && <Check size={12} strokeWidth={2.5} />}
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(10, 11, 14, 0.5)'
        }}>
          <button
            onClick={handleReset}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          ><LocalizedText message={"Reset all"} /></button>

          <button
            onClick={handleApply}
            style={{
              padding: '10px 22px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
              color: '#0A0B0E',
              fontSize: '13px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)'
            }}
          ><LocalizedText message={"Show results"} /></button>
        </div>

      </div>
    </div>
  );
}
