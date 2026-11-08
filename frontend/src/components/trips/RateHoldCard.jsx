'use client';
import {LocalizedText} from '@/i18n/Localized';


import React, { useState } from 'react';
import { 
  Clock, 
  CreditCard, 
  Hotel, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2,
  Lock,
  MapPin,
  Calendar
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/parseWorkerResult';
import Badge from '@/components/ui/Badge';

export default function RateHoldCard({ preBooking, onCompleteBooking }) {
  const [isHovered, setIsHovered] = useState(false);
  const isConfirmed = preBooking.status === 'CONFIRMED';
  const priceFormatted = formatCurrency(parseFloat(preBooking.final_price || 0), preBooking.currency || 'AED');
  const checkinStr = preBooking.checkin ? formatDate(preBooking.checkin) : 'Upcoming Dates';
  const checkoutStr = preBooking.checkout ? formatDate(preBooking.checkout) : '';

  return (
    <div
      className="luxury-card-reveal"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        borderRadius: '22px',
        backgroundColor: '#121418',
        border: isConfirmed 
          ? (isHovered ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(16, 185, 129, 0.25)')
          : (isHovered ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(245, 158, 11, 0.3)'),
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isHovered 
          ? '0 16px 40px rgba(0, 0, 0, 0.7), 0 0 24px rgba(245, 158, 11, 0.16)' 
          : '0 8px 24px rgba(0, 0, 0, 0.45)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)'
      }}
    >
      {/* ── Top Header Strip ── */}
      <div style={{
        padding: '16px 20px',
        backgroundColor: isConfirmed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isConfirmed ? (
            <ShieldCheck size={16} color="#10B981" />
          ) : (
            <Lock size={16} color="#F59E0B" />
          )}
          <span style={{
            fontSize: '11px',
            fontWeight: 800,
            color: isConfirmed ? '#34D399' : '#FBBF24',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>
            <LocalizedText>{isConfirmed ? 'RATE CONVERTED & CONFIRMED' : 'GUARANTEED RATE HOLD'}</LocalizedText>
          </span>
        </div>

        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          color: '#94A3B8',
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          padding: '3px 9px',
          borderRadius: '9999px'
        }}><LocalizedText preserveValues={[true]} message={"Hold #⟦0⟧"} values={[preBooking.id]} /></div>
      </div>

      {/* ── Main Content Body ── */}
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Room / Suite Title */}
        <div>
          <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.03em' }}><LocalizedText message={"Locked Luxury Suite"} /></div>
          <h3 style={{
            fontSize: '17px',
            fontWeight: 800,
            color: '#FFFFFF',
            margin: 0,
            lineHeight: 1.35,
            letterSpacing: '-0.01em'
          }}>
            <LocalizedText>{preBooking.room_name || 'Selected UAE Luxury Suite'}</LocalizedText>
          </h3>
        </div>

        {/* Locked Price Highlight Box */}
        <div style={{
          padding: '14px 16px',
          borderRadius: '14px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}><LocalizedText message={"Guaranteed Price"} /></div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#FBBF24', marginTop: '2px' }}>
              {priceFormatted}
            </div>
          </div>

          <div style={{
            padding: '4px 10px',
            borderRadius: '8px',
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            color: '#FBBF24',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <Clock size={12} />
            <span><LocalizedText message={"Price Locked"} /></span>
          </div>
        </div>

        {/* Dates preview if available */}
        {preBooking.checkin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#CBD5E1' }}>
            <Calendar size={13} color="#F59E0B" />
            <span>{checkinStr} {checkoutStr ? `→ ${checkoutStr}` : ''}</span>
          </div>
        )}

        {/* Action Button */}
        <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          {isConfirmed ? (
            <div style={{
              width: '100%',
              padding: '10px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34D399',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <CheckCircle2 size={14} />
              <span><LocalizedText message={"Completed & Confirmed"} /></span>
            </div>
          ) : (
            <button
              onClick={() => onCompleteBooking(preBooking)}
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
                border: 'none',
                color: '#0A0B0E',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)',
                transition: 'all 0.2s ease'
              }}
            >
              <CreditCard size={15} />
              <span><LocalizedText message={"Complete Booking & Secure Room"} /></span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
