'use client';
import AccessibilityFacts from '@/components/planning/AccessibilityFacts';
import {Localized,LocalizedText} from '@/i18n/Localized';


import { MapPin, ArrowRight, CreditCard } from 'lucide-react';
import StarRating from '@/components/ui/StarRating';
import Badge from '@/components/ui/Badge';

export default function HotelCard({ hotel, onBook, readOnly=false, selectionMode=false, disabled=false }) {
  if (!hotel) return null;

  const defaultImg = "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80";
  const imageSrc = hotel.imageUrl || defaultImg;

  return (
    <div className="hotel-card-dark">
      {/* ── Photo Banner ── */}
      <div className="hotel-media-banner">
        <Localized element={"img"} attributes={["alt"]}
          src={imageSrc} 
          alt={hotel.name || "UAE Hotel"} 
          onError={(e) => { e.currentTarget.src = defaultImg; }}
        />
        <div className="mindtrip-badge-top-left"><LocalizedText message={"HOTEL"} /></div>
      </div>

      {/* ── Card Body ── */}
      <div className="hotel-body-dark">
        <div className="hotel-title-row">
          <div>
            <h3 className="hotel-name-text">{hotel.name}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '3px' }}>
              <MapPin size={13} color="var(--color-accent-hover)" />
              <span><LocalizedText>{hotel.location || 'Dubai, United Arab Emirates'}</LocalizedText></span>
            </div>
          </div>
          {hotel.price && Number(hotel.price) > 0 ? (
            <div className="hotel-price-badge">
              {hotel.price} <LocalizedText>{hotel.currency || 'AED'}</LocalizedText>
              <span><LocalizedText message={"/ night"} /></span>
            </div>
          ) : (
            <div className="hotel-price-badge" style={{ fontSize: '11px', color: '#94A3B8' }}><LocalizedText message={"Rates on Request"} /></div>
          )}
        </div>

        {/* ── Rating & Room Type ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
          <StarRating rating={hotel.rating || 4.8} count={120} />
          {hotel.roomType && hotel.roomType !== 'Not specified' ? (
            <Badge variant="accent">{hotel.roomType}</Badge>
          ) : (
            <Badge variant="accent"><LocalizedText message={"Luxury Stay"} /></Badge>
          )}
        </div>

        <AccessibilityFacts evidence={hotel.accessibility} />

        {/* ── Booking Action ── */}
        {!readOnly&&<div className="hotel-action-row" style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn-book-now"
            disabled={disabled}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={(e) => {
              e.stopPropagation();
              if (onBook) onBook(hotel, 'browse');
            }}
          >
            <span><LocalizedText message={"Browse Rooms"} /></span>
          </button>
          {!selectionMode&&<button
            className="btn-book-now"
            style={{ flex: 1, justifyContent: 'center', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
            onClick={(e) => {
              e.stopPropagation();
              if (onBook) onBook(hotel, 'about');
            }}
          >
            <span><LocalizedText message={"About Hotel"} /></span>
          </button>}
        </div>}
      </div>
    </div>
  );
}
