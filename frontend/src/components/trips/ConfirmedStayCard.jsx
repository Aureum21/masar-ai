'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';


import React, { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  ExternalLink, 
  FileText, 
  Clock, 
  ChevronRight,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { formatDate } from '@/utils/parseWorkerResult';
import { parseHotelInfo } from '@/utils/hotelParser';
import Badge from '@/components/ui/Badge';

export default function ConfirmedStayCard({ booking, onViewVoucher, onAskConcierge }) {
  const [isHovered, setIsHovered] = useState(false);
  const hotel = parseHotelInfo(booking.hotel_info, booking.id);
  const checkinStr = formatDate(booking.checkin);
  const checkoutStr = formatDate(booking.checkout);

  // Compute number of nights
  let nights = 1;
  try {
    const d1 = new Date(booking.checkin);
    const d2 = new Date(booking.checkout);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (!isNaN(diffDays) && diffDays > 0) nights = diffDays;
  } catch (e) {
    nights = 1;
  }

  return (
    <div
      className="luxury-card-reveal"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        borderRadius: '22px',
        backgroundColor: '#121418',
        border: isHovered 
          ? '1px solid rgba(16, 185, 129, 0.5)' 
          : '1px solid rgba(16, 185, 129, 0.25)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isHovered 
          ? '0 16px 40px rgba(0, 0, 0, 0.7), 0 0 24px rgba(16, 185, 129, 0.18)' 
          : '0 8px 24px rgba(0, 0, 0, 0.45)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)'
      }}
    >
      {/* ── Cinematic Media Banner (Mindtrip Style) ── */}
      <div style={{
        position: 'relative',
        height: '190px',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: '#16181E'
      }}>
        <Localized element={"img"} attributes={["alt"]}
          src={hotel.image}
          alt={hotel.name}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover', 
            transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: isHovered ? 'scale(1.05)' : 'scale(1)'
          }}
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
          }}
        />

        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(18, 20, 24, 0.95) 0%, rgba(18, 20, 24, 0.3) 45%, rgba(0, 0, 0, 0.2) 100%)'
        }} />

        {/* Top Left: Status Badge */}
        <div style={{
          position: 'absolute',
          top: '14px',
          left: '14px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(10, 11, 14, 0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(16, 185, 129, 0.5)',
          color: '#34D399',
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.04em'
        }}>
          <ShieldCheck size={13} />
          <span><LocalizedText message={"CONFIRMED STAY"} /></span>
        </div>

        {/* Top Right: Reference Code */}
        <div style={{
          position: 'absolute',
          top: '14px',
          right: '14px',
          padding: '4px 10px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(10, 11, 14, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          color: '#CBD5E1',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.02em'
        }}><LocalizedText preserveValues={[true]} message={"Ref #⟦0⟧"} values={[booking.id]} /></div>

        {/* Bottom Destination Tag */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '6px',
          backgroundColor: 'rgba(14, 16, 21, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#FFFFFF',
          fontSize: '11px',
          fontWeight: 700
        }}>
          <MapPin size={11} color="#34D399" />
          <span><LocalizedText>{hotel.location || 'United Arab Emirates'}</LocalizedText></span>
        </div>
      </div>

      {/* ── Content Body (Clean Mindtrip Layout) ── */}
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Hotel Name */}
        <div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 800,
            color: '#FFFFFF',
            margin: '0 0 6px 0',
            lineHeight: 1.3,
            letterSpacing: '-0.01em'
          }}>
            {hotel.name}
          </h3>

          <div style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>
            <LocalizedText>{booking.room_name || hotel.room || 'Deluxe Luxury Suite'}</LocalizedText>
          </div>
        </div>

        {/* Stay Dates Box */}
        <div style={{
          padding: '12px 14px',
          borderRadius: '14px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={16} color="#34D399" />
            <div>
              <div style={{ fontSize: '12px', color: '#FFFFFF', fontWeight: 700 }}>
                {checkinStr} &rarr; {checkoutStr}
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}><LocalizedText message={"⟦0⟧  ⟦1⟧ • Guaranteed Reservation"} values={[nights,nights === 1 ? 'Night' : 'Nights']} /></div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '14px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <button
            onClick={() => onViewVoucher(booking)}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34D399',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <FileText size={14} />
            <span><LocalizedText message={"Digital Voucher"} /></span>
          </button>

          <Localized element={"button"} attributes={["title"]}
            onClick={() => onAskConcierge(hotel.name)}
            style={{
              padding: '10px 14px',
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
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
            title="Ask Concierge about this booking"
          >
            <Sparkles size={13} color="#F59E0B" />
            <span><LocalizedText message={"Concierge"} /></span>
          </Localized>
        </div>

      </div>
    </div>
  );
}
