
import {LocalizedText} from '@/i18n/Localized';
import React, { useState } from 'react';

import { API_BASE } from '@/lib/api';
import { CreditCard, CheckCircle, Hotel, MapPin, AlertCircle, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function BookingCheckoutCard({ prebookId, details }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { token } = useAuth();
  
  // Checkout form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
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
          prebook_id: prebookId,
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
          payment_method: "ACC_CREDIT_CARD" // Sandbox bypasses actual payment
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to complete booking');
      
      setSuccess(true);
      setIsOpen(false); // close modal on success
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      margin: '16px 0',
      borderRadius: '16px',
      background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      overflow: 'hidden',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* CARD HEADER */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F59E0B', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              <Hotel size={14} />
              <span><LocalizedText message={"Room Held Securely"} /></span>
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#F8FAFC' }}>
              <LocalizedText>{details?.hotelName || "Luxury Accommodation"}</LocalizedText>
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={12} />
              <LocalizedText>{details?.location || "UAE"}</LocalizedText>
            </p>
          </div>
          
          <div style={{ textAlign: 'end' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#F8FAFC' }}>
              {details?.price || "$0.00"}
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}><LocalizedText message={"Total Price (Taxes incl.)"} /></div>
          </div>
        </div>
        
        {/* SUCCESS STATE */}
        {success ? (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            padding: '16px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#10B981'
          }}>
            <CheckCircle size={24} />
            <div>
              <div style={{ fontWeight: 600 }}><LocalizedText message={"Booking Confirmed!"} /></div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}><LocalizedText message={"Your reservation has been secured."} /></div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: 'white',
              border: 'none',
              fontWeight: 600,
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
            }}
          >
            <CreditCard size={18} /><LocalizedText message={"Complete Booking Securely"} /></button>
        )}
      </div>

      {/* SECURE CHECKOUT MODAL OVERLAY */}
      {isOpen && !success && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'clamp(12px, 2vw, 24px)',
          animation: 'masarModalFadeIn 0.25s ease-out'
        }}>
          <div style={{
            background: '#0F172A',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            width: '100%', maxWidth: '500px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h2 style={{ margin: 0, color: '#F8FAFC', fontSize: '20px' }}><LocalizedText message={"Secure Checkout"} /></h2>
              <p style={{ margin: '4px 0 0', color: '#94A3B8', fontSize: '13px' }}><LocalizedText message={"Finalize your reservation details below."} /></p>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && (
                <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#EF4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} /> <LocalizedText>{error}</LocalizedText>
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', marginBottom: '6px' }}><LocalizedText message={"First Name"} /></label>
                  <input required name="firstName" value={formData.firstName} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', marginBottom: '6px' }}><LocalizedText message={"Last Name"} /></label>
                  <input required name="lastName" value={formData.lastName} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', marginBottom: '6px' }}><LocalizedText message={"Email Address"} /></label>
                <input required type="email" name="email" value={formData.email} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', marginBottom: '6px' }}><LocalizedText message={"Phone Number"} /></label>
                <input required name="phone" value={formData.phone} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }} />
              </div>
              
              <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setIsOpen(false)} style={{ padding: '10px 16px', background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', fontWeight: 500 }}><LocalizedText message={"Cancel"} /></button>
                <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: '#F59E0B', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  <LocalizedText>{loading ? 'Processing...' : 'Pay & Confirm'}</LocalizedText>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
