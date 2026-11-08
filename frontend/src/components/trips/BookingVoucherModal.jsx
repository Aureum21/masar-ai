'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';


import React from 'react';
import { 
  Building2, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  X, 
  Printer, 
  MessageSquare, 
  Star, 
  Clock, 
  QrCode, 
  Sparkles, 
  CheckCircle2, 
  KeyRound,

} from 'lucide-react';
import { formatDate } from '@/utils/parseWorkerResult';
import { parseHotelInfo } from '@/utils/hotelParser';

export default function BookingVoucherModal({ booking, onClose, onAskConcierge }) {
  if (!booking) return null;

  const hotel = parseHotelInfo(booking.hotel_info, booking.id);
  const checkinStr = formatDate(booking.checkin);
  const checkoutStr = formatDate(booking.checkout);

  // Compute number of nights if valid dates
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
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
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          backgroundColor: 'rgba(16, 18, 24, 0.9)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: '26px',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.6), 0 0 50px rgba(16, 185, 129, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          animation: 'luxuryCardReveal 0.3s cubic-bezier(0.16, 1, 0.3, 1) both'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top Header Banner with Hotel Image ── */}
        <div style={{
          position: 'relative',
          height: '160px',
          width: '100%',
          overflow: 'hidden',
          backgroundColor: '#14161C'
        }}>
          <Localized element={"img"} attributes={["alt"]}
            src={hotel.image}
            alt={hotel.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, #0E1015 0%, rgba(14, 16, 21, 0.6) 60%, rgba(14, 16, 21, 0.2) 100%)'
          }} />

          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(14, 16, 21, 0.75)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              transition: 'all 0.2s'
            }}
          >
            <X size={18} />
          </button>

          {/* VIP Confirmation Pill */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(16, 185, 129, 0.18)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34D399',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.04em'
          }}>
            <ShieldCheck size={15} />
            <span><LocalizedText message={"OFFICIAL VIP VOUCHER • CONFIRMED"} /></span>
          </div>
        </div>

        {/* ── Voucher Body ── */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* Hotel Name & Reference */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px 0' }}>
                {hotel.name}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#94A3B8' }}>
                <MapPin size={14} color="#F59E0B" />
                <span>{hotel.location}</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>&bull;</span>
                <span style={{ color: '#FBBF24', fontWeight: 700 }}><LocalizedText message={"5-Star Luxury Resort"} /></span>
              </div>
            </div>

            <div style={{
              padding: '8px 14px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'end'
            }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}><LocalizedText message={"Booking Ref"} /></div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#F8FAFC', letterSpacing: '0.04em' }}>
                {hotel.referenceCode}
              </div>
            </div>
          </div>

          {/* Stay Timeline Bento Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            padding: '16px',
            borderRadius: '16px',
            backgroundColor: 'rgba(18, 20, 24, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}><LocalizedText message={"Check-In Date"} /></div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} color="#10B981" />
                <span>{checkinStr}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}><LocalizedText message={"From 15:00 (3:00 PM)"} /></div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}><LocalizedText message={"Check-Out Date"} /></div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} color="#F59E0B" />
                <span>{checkoutStr}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}><LocalizedText message={"Until 12:00 (12:00 PM)"} /></div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}><LocalizedText message={"Duration"} /></div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#FBBF24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} />
                <span>{nights} <LocalizedText>{nights === 1 ? 'Night' : 'Nights'}</LocalizedText></span>
              </div>
              <div style={{ fontSize: '11px', color: '#34D399', marginTop: '2px' }}><LocalizedText message={"Guaranteed Reservation"} /></div>
            </div>
          </div>

          {/* VIP Concierge Inclusions */}
          <div style={{
            padding: '16px',
            borderRadius: '16px',
            backgroundColor: 'rgba(245, 158, 11, 0.06)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#FBBF24', textTransform: 'uppercase', letterSpacing: '0.05em' }}><LocalizedText message={"Masar AI Concierge Inclusions"} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#CBD5E1' }}>
                <CheckCircle2 size={14} color="#10B981" />
                <span><LocalizedText message={"Express VIP Check-in Desk"} /></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#CBD5E1' }}>
                <CheckCircle2 size={14} color="#10B981" />
                <span><LocalizedText message={"Complimentary High-Speed Wi-Fi"} /></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#CBD5E1' }}>
                <CheckCircle2 size={14} color="#10B981" />
                <span><LocalizedText message={"Taxes & Municipality Fees Included"} /></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#CBD5E1' }}>
                <CheckCircle2 size={14} color="#10B981" />
                <span><LocalizedText message={"Dedicated 24/7 AI Concierge Line"} /></span>
              </div>
            </div>
          </div>

          {/* Instructions for Front Desk */}
          <div style={{
            padding: '14px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '12px',
            color: '#94A3B8',
            lineHeight: 1.5
          }}>
            <strong style={{ color: '#F8FAFC' }}><LocalizedText message={"Front Desk Note:"} /></strong><LocalizedText message={" Please present a valid Emirates ID or Passport upon check-in along with this digital confirmation voucher. Your reservation has been pre-confirmed via Masar AI's hospitality integration."} /></div>
        </div>

        {/* ── Footer Actions ── */}
        <div style={{
          padding: '16px 24px',
          backgroundColor: 'rgba(14, 16, 21, 0.95)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handlePrint}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#CBD5E1',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Printer size={15} />
            <span><LocalizedText message={"Print Voucher"} /></span>
          </button>

          <button
            onClick={() => {
              onClose();
              if (onAskConcierge) {
                onAskConcierge(hotel.name);
              }
            }}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
              color: '#0A0B0E',
              fontSize: '13px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)'
            }}
          >
            <MessageSquare size={15} />
            <span><LocalizedText message={"Ask Concierge About Stay"} /></span>
          </button>
        </div>
      </div>
    </div>
  );
}
