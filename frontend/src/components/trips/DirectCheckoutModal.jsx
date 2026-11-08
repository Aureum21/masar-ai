'use client';
import {LocalizedText} from '@/i18n/Localized';


import { API_BASE } from '@/lib/api';

import React, { useState } from 'react';
import { 
  CreditCard, 
  CheckCircle, 
  Hotel, 
  MapPin, 
  AlertCircle, 
  Calendar, 
  X, 
  ShieldCheck, 
  Lock,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/utils/parseWorkerResult';

export default function DirectCheckoutModal(props) {
  if (!props.preBooking) return null;
  return <CheckoutForm key={props.preBooking.prebook_id} {...props} />;
}

function CheckoutForm({ preBooking, onClose, onSuccess }) {

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { token, user } = useAuth();

  // Populate form with user defaults if available
  const [formData, setFormData] = useState({
    firstName: (user?.name || user?.full_name)?.split(' ')[0] || '',
    lastName: (user?.name || user?.full_name)?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: user?.phone_number || '',
    guestFirstName: '',
    guestLastName: ''
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${API_BASE}/api/v1/bookings/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prebook_id: preBooking.prebook_id,
          holder: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone
          },
          guests: [
            {
              firstName: formData.guestFirstName || formData.firstName,
              lastName: formData.guestLastName || formData.lastName
            }
          ],
          payment_method: "ACC_CREDIT_CARD" // Sandbox payment method
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to complete booking');
      
      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.message || 'An error occurred during booking confirmation');
    } finally {
      setLoading(false);
    }
  };

  const priceFormatted = formatCurrency(parseFloat(preBooking.final_price || 0), preBooking.currency || 'AED');

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
          maxWidth: '560px',
          maxHeight: '90vh',
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
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(18, 20, 24, 0.8)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'rgba(245, 158, 11, 0.14)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FBBF24'
            }}>
              <CreditCard size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}><LocalizedText message={"Secure Final Checkout"} /></h3>
              <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}><LocalizedText message={"Finalize your VIP room hold reservation"} /></p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close checkout"
            className="masar-modal-close-btn"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto' }}>
          {/* Room & Price Summary */}
          <div style={{
            padding: '14px 16px',
            borderRadius: '14px',
            backgroundColor: 'rgba(245, 158, 11, 0.06)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#FBBF24', fontWeight: 700, textTransform: 'uppercase' }}><LocalizedText message={"Suite Category"} /></div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                <LocalizedText>{preBooking.room_name || 'Reserved Luxury Suite'}</LocalizedText>
              </div>
            </div>
            <div style={{ textAlign: 'end' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#F8FAFC' }}>
                {priceFormatted}
              </div>
              <div style={{ fontSize: '10px', color: '#94A3B8' }}><LocalizedText message={"Taxes & fees included"} /></div>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '12px 14px',
              borderRadius: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#F87171',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <AlertCircle size={16} />
              <span><LocalizedText>{error}</LocalizedText></span>
            </div>
          )}

          {success ? (
            <div style={{
              padding: '28px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34D399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle size={28} />
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}><LocalizedText message={"Reservation Confirmed!"} /></h4>
              <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0, maxWidth: '340px', lineHeight: 1.4 }}><LocalizedText message={"Your luxury booking has been officially secured in the Masar AI Vault."} /></p>
              <button
                onClick={onClose}
                style={{
                  marginTop: '10px',
                  padding: '10px 24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer'
                }}
              ><LocalizedText message={"Done"} /></button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', fontWeight: 600, marginBottom: '4px' }}><LocalizedText message={"First Name *"} /></label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', fontWeight: 600, marginBottom: '4px' }}><LocalizedText message={"Last Name *"} /></label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', fontWeight: 600, marginBottom: '4px' }}><LocalizedText message={"Email Address *"} /></label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#94A3B8', fontWeight: 600, marginBottom: '4px' }}><LocalizedText message={"Phone Number *"} /></label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="+971 50 123 4567"
                  value={formData.phone}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{
                padding: '10px 12px',
                borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                color: '#34D399',
                marginTop: '4px'
              }}>
                <Lock size={13} />
                <span><LocalizedText message={"256-Bit SSL Encrypted Sandbox VIP Checkout"} /></span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#CBD5E1',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                ><LocalizedText message={"Cancel"} /></button>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
                    color: '#0A0B0E',
                    fontSize: '13px',
                    fontWeight: 800,
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)'
                  }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={14} className="spin-icon" />
                      <span><LocalizedText message={"Confirming Stay..."} /></span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={15} />
                      <span><LocalizedText message={"Pay & Confirm Stay"} /></span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
