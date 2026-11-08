'use client';
import {useI18n} from '@/i18n/LocaleProvider';
import {formattingLocale} from '@/i18n/messages.mjs';

import {Localized,LocalizedText} from '@/i18n/Localized';


import React, { useState } from 'react';
import { 
  Calendar, 
  MapPin, 
  Eye, 
  Trash2, 
  Building2, 
  Layers, 
  Clock,
  SlidersHorizontal,
  ArrowRight,
  MoreVertical,
  CheckCircle2
} from 'lucide-react';
import { getItineraryHeroImage } from '@/utils/destinationImages';

export default function SavedItineraryCard({ 
  trip, 
  index = 0, 
  isDeletingThis, 
  onViewTrip, 
  onStartDelete, 
  onCustomize,
  isPrevious = false
}) {
  const {locale:uiLocale}=useI18n();

  const [isHovered, setIsHovered] = useState(false);
  const heroImg = getItineraryHeroImage(trip, trip?.id ?? index);

  // Compute number of curated activities/stops from itinerary_data
  let totalStops = 0;
  try {
    const raw = trip.itinerary_data;
    if (raw) {
      let parsed = raw;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch (e) { parsed = {}; }
      }
      if (parsed.days && Array.isArray(parsed.days)) {
        parsed.days.forEach(d => {
          if (d.activities && Array.isArray(d.activities)) totalStops += d.activities.length;
        });
      } else if (Array.isArray(parsed)) {
        parsed.forEach(d => {
          if (d.activities && Array.isArray(d.activities)) totalStops += d.activities.length;
        });
      }
    }
  } catch (e) {
    totalStops = 0;
  }

  // Format date
  const dateFormatted = trip.created_at 
    ? new Date(trip.created_at).toLocaleDateString(formattingLocale(uiLocale, 'en-US'), { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recently Curated';

  return (
    <div
      className="luxury-card-reveal group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        animationDelay: `${index * 60}ms`,
        borderRadius: '22px',
        backgroundColor: '#121418',
        border: isDeletingThis 
          ? '1px solid rgba(244, 63, 94, 0.5)' 
          : isHovered 
            ? '1px solid rgba(245, 158, 11, 0.45)' 
            : '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'pointer',
        boxShadow: isHovered 
          ? '0 16px 40px rgba(0, 0, 0, 0.7), 0 0 24px rgba(245, 158, 11, 0.18)' 
          : '0 8px 24px rgba(0, 0, 0, 0.45)',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)'
      }}
      onClick={() => {
        if (!isDeletingThis) {
          onViewTrip(trip);
        }
      }}
    >
      {/* ── Cinematic Media Banner (Mindtrip Style) ── */}
      <div style={{ 
        position: 'relative', 
        height: '210px', 
        width: '100%', 
        overflow: 'hidden', 
        backgroundColor: '#16181E' 
      }}>
        <Localized element={"img"} attributes={["alt"]}
          src={heroImg}
          alt={trip.title}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover', 
            transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: isHovered ? 'scale(1.05)' : 'scale(1)'
          }}
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80';
          }}
        />

        {/* Ambient Dark Gradient for readability */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(18, 20, 24, 0.95) 0%, rgba(18, 20, 24, 0.35) 45%, rgba(0, 0, 0, 0.25) 100%)'
        }} />

        {/* Top Badges (Minimalist Mindtrip Style) */}
        <div style={{
          position: 'absolute',
          top: '14px',
          left: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <div style={{
            padding: '4px 10px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(10, 11, 14, 0.75)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            letterSpacing: '0.01em'
          }}>
            <MapPin size={12} color="#F59E0B" />
            <span><LocalizedText>{trip.destination || 'UAE & Gulf'}</LocalizedText></span>
          </div>

          {isPrevious ? (
            <div style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#34D399',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <CheckCircle2 size={11} />
              <span><LocalizedText message={"Completed"} /></span>
            </div>
          ) : index === 0 ? (
            <div style={{
              padding: '4px 9px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(245, 158, 11, 0.25)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(245, 158, 11, 0.5)',
              color: '#FBBF24',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.02em'
            }}><LocalizedText message={"Current"} /></div>
          ) : null}
        </div>

        {/* Top Right: Duration Pill */}
        {trip.duration_days && (
          <div style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            padding: '4px 11px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(10, 11, 14, 0.75)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            color: '#FBBF24',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.02em'
          }}><LocalizedText preserveValues={[true]} message={"⟦0⟧ Days"} values={[trip.duration_days]} /></div>
        )}

        {/* Bottom Left over image: Stop Count */}
        {totalStops > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '14px',
            padding: '3px 8px',
            borderRadius: '6px',
            backgroundColor: 'rgba(14, 16, 21, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#CBD5E1',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Layers size={11} color="#F59E0B" />
            <span><LocalizedText message={"⟦0⟧ Curated Stops"} values={[totalStops]} /></span>
          </div>
        )}
      </div>

      {/* ── Card Content (Clean Mindtrip Typography) ── */}
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Title */}
        <div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 800,
            color: '#FFFFFF',
            margin: '0 0 6px 0',
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {trip.title}
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94A3B8' }}>
            <Calendar size={12} color="#F59E0B" />
            <span><LocalizedText message={"Curated ⟦0⟧"} values={[dateFormatted]} /></span>
          </div>
        </div>

        {/* Vibes / Themes Badges */}
        {trip.vibes && Array.isArray(trip.vibes) && trip.vibes.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {trip.vibes.slice(0, 3).map((vibe, vIdx) => (
              <span
                key={vIdx}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 9px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  color: '#CBD5E1',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                {vibe}
              </span>
            ))}
          </div>
        )}

        {/* Minimalist Action Bar */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '14px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {/* Primary View Action */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewTrip(trip);
            }}
            style={{
              flex: 1,
              padding: '9px 14px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(245, 158, 11, 0.08))',
              border: '1px solid rgba(245, 158, 11, 0.45)',
              color: '#FBBF24',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: isHovered ? '0 4px 16px rgba(245, 158, 11, 0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Eye size={13} />
            <span><LocalizedText message={"Explore Plan"} /></span>
          </button>

          {/* AI Customize Action */}
          <Localized element={"button"} attributes={["title"]}
            onClick={(e) => {
              e.stopPropagation();
              onCustomize(trip);
            }}
            style={{
              padding: '9px 12px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#CBD5E1',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              transition: 'all 0.2s ease'
            }}
            title="Customize with AI Concierge"
          >
            <SlidersHorizontal size={13} color="#F59E0B" />
            <span><LocalizedText message={"Customize"} /></span>
          </Localized>

          {/* Delete Action */}
          <Localized element={"button"} attributes={["aria-label","title"]} type="button" aria-label={`Delete trip: ${trip.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onStartDelete(trip);
            }}
            style={{
              padding: '9px 10px',
              borderRadius: '12px',
              backgroundColor: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              color: '#FB7185',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            title="Delete trip from vault"
          >
            <Trash2 size={13} />
          </Localized>
        </div>

      </div>
    </div>
  );
}
