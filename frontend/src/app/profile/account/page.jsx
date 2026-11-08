'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';


import { API_BASE } from '@/lib/api';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Link from 'next/link';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Lock, 
  Eye, 
  EyeOff, 
  Luggage,
  ShieldCheck, 
  CheckCircle2, 
  SlidersHorizontal,
  ArrowRight,
  UtensilsCrossed,
  Palmtree,
  Building2,
  Coffee,
  Zap,
  ShoppingBag,
  Car,
  Landmark,
  Award,
  SunMedium,
  Sparkles,
  BookOpen,
  DollarSign,
  Heart,
  Gift,
  Users
} from 'lucide-react';

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <AccountContent includeSidebar={true} />
    </ProtectedRoute>
  );
}

export function AccountContent({ includeSidebar = true, headerExtra = null }) {
  const { userEmail, updateProfile, updatePassword, token } = useAuth();

  const [profileData, setProfileData] = useState({
    name: '',
    email: userEmail || '',
    phone_number: '',
    nationality: '',
    date_of_birth: '',
    gender: '',
    travel_preferences: {}
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: ''
  });

  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState({ profile: false, password: false, fetch: true });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProfileData({
            name: data.name || '',
            email: data.email || '',
            phone_number: data.phone_number || '',
            nationality: data.nationality || '',
            date_of_birth: data.date_of_birth || '',
            gender: data.gender || '',
            travel_preferences: data.travel_preferences || {}
          });
        }
      } catch (e) {
        console.error('Failed to fetch profile', e);
      } finally {
        setLoading(prev => ({ ...prev, fetch: false }));
      }
    };
    if (token) fetchProfile();
  }, [token]);

  const hasPreferences = useMemo(() => {
    return profileData.travel_preferences && Object.keys(profileData.travel_preferences).length > 0;
  }, [profileData.travel_preferences]);

  // Unified friendly travel style title
  const travelStyle = useMemo(() => {
    if (!hasPreferences) {
      return { title: 'Personalized Explorer', tagline: 'Set your style to tailor AI recommendations', icon: Sparkles };
    }
    
    const prefs = profileData.travel_preferences;
    const vibes = prefs.vibes || prefs.interests || [];
    const hasCulture = vibes.includes('Culture & Heritage');
    const hasLuxury = vibes.includes('Luxury & VIP') || prefs.budget_tier === 'Luxury' || prefs.budget_tier === 'Sovereign Ultra-Luxury';
    const hasDesert = vibes.includes('Desert & Dunes') || vibes.includes('Desert Safaris');
    const hasBeach = vibes.includes('Beach & Coastal') || vibes.includes('Beach & Sun');
    const hasDining = vibes.includes('Gastronomy & Dining') || vibes.includes('Fine Dining');
    const hasArch = vibes.includes('Architectural Marvels');

    if (hasCulture && hasLuxury) {
      return { title: 'Culture & Heritage Explorer', tagline: 'Historic souks, museums & curated stays', icon: Landmark };
    }
    if (hasDesert) {
      return { title: 'Desert & Adventure Lover', tagline: 'Desert safaris, starry nights & pool villas', icon: SunMedium };
    }
    if (hasDining) {
      return { title: 'Food & Dining Enthusiast', tagline: 'Top restaurants, fine dining & rooftop views', icon: UtensilsCrossed };
    }
    if (hasBeach) {
      return { title: 'Beach & Coastal Traveler', tagline: 'Ocean views, beach clubs & yachting', icon: Palmtree };
    }
    if (hasArch) {
      return { title: 'City & Architecture Explorer', tagline: 'Iconic skylines & modern landmarks', icon: Building2 };
    }
    return { title: 'All-Round UAE Traveler', tagline: 'A great mix of sights, food & comfort', icon: Award };
  }, [hasPreferences, profileData.travel_preferences]);

  const userInitials = useMemo(() => {
    if (!profileData.name) return profileData.email ? profileData.email.charAt(0).toUpperCase() : 'M';
    const parts = profileData.name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }, [profileData.name, profileData.email]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMessage({ type: '', text: '' });
    setLoading(prev => ({ ...prev, profile: true }));
    try {
      await updateProfile({
        name: profileData.name,
        email: profileData.email,
        phone_number: profileData.phone_number,
        nationality: profileData.nationality,
        date_of_birth: profileData.date_of_birth,
        gender: profileData.gender
      });
      setProfileMessage({ type: 'success', text: 'Personal details updated successfully.' });
      setTimeout(() => setProfileMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      setProfileMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });
    if (!passwordData.current_password || !passwordData.new_password) {
      setPasswordMessage({ type: 'error', text: 'Please enter both current and new passwords.' });
      return;
    }
    setLoading(prev => ({ ...prev, password: true }));
    try {
      await updatePassword(passwordData.current_password, passwordData.new_password);
      setPasswordMessage({ type: 'success', text: 'Password updated successfully.' });
      setPasswordData({ current_password: '', new_password: '' });
      setTimeout(() => setPasswordMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setLoading(prev => ({ ...prev, password: false }));
    }
  };

  if (loading.fetch) {
    return (
      <div className="app-container">
        {includeSidebar && <Sidebar />}
        <div className="content-stage" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#090A0D' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#94A3B8' }}>
            <Luggage size={20} color="#F59E0B" className="animate-pulse" />
            <span><LocalizedText message={"Loading profile..."} /></span>
          </div>
        </div>
      </div>
    );
  }

  const prefs = profileData.travel_preferences || {};
  const activeVibes = prefs.vibes || prefs.interests || [];
  const activeDietary = prefs.dietary || prefs.dietary_restrictions || [];
  const StyleIcon = travelStyle.icon;

  const inputStyle = {
    width: '100%',
    padding: '12px 14px 12px 42px',
    backgroundColor: 'rgba(10, 11, 14, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '14px',
    color: '#FFFFFF',
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box'
  };

  const iconPrefixStyle = {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#64748B'
  };

  return (
    <div className="app-container">
      {includeSidebar && <Sidebar />}
      <div className="content-stage" style={{ overflowY: 'auto', backgroundColor: '#090A0D' }}>
        <div style={{ width: '100%', maxWidth: '1200px', padding: '36px 44px 80px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {headerExtra}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '-4px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#94A3B8' }}>
              <span style={{ color: '#F59E0B', fontWeight: 700 }}><LocalizedText message={"MASAR"} /></span>
              <span>/</span>
              <span><LocalizedText message={"ACCOUNT & PREFERENCES"} /></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <Link href="/trips" style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: '#F59E0B', textDecoration: 'none', fontWeight: 600 }}>
                <Luggage size={15} />
                <span><LocalizedText message={"My journeys"} /></span>
              </Link>
              <Link href="/rewards" style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: '#F59E0B', textDecoration: 'none', fontWeight: 600 }}>
                <BookOpen size={15} />
                <span><LocalizedText message={"Traveler Passport"} /></span>
              </Link>
              <Link href="/rewards/redeem" style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: '#F59E0B', textDecoration: 'none', fontWeight: 600 }}>
                <Gift size={15} />
                <span><LocalizedText message={"Rewards"} /></span>
              </Link>
            </div>
          </div>
          
          {/* ── 1. Top Executive Member Card ── */}
          <div style={{
            position: 'relative',
            borderRadius: '26px',
            background: 'linear-gradient(145deg, rgba(24, 26, 34, 0.95) 0%, rgba(14, 16, 22, 0.98) 100%)',
            backdropFilter: 'blur(32px)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65), 0 0 45px rgba(245, 158, 11, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
            padding: '32px 36px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '24px'
          }}>
            {/* Ambient Background Glow */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative', zIndex: 2 }}>
              {/* Avatar Initial Ring */}
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
                boxShadow: '0 0 24px rgba(245, 158, 11, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                fontWeight: 900,
                color: '#0A0B0E',
                flexShrink: 0,
                border: '3px solid rgba(255, 255, 255, 0.2)'
              }}>
                {userInitials}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h1 style={{
                    fontSize: '26px',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    margin: 0,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2
                  }}>
                    <LocalizedText>{profileData.name || 'Member Account'}</LocalizedText>
                  </h1>

                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 9px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#34D399',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    <ShieldCheck size={12} color="#34D399" />
                    <span><LocalizedText message={"VERIFIED"} /></span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', fontSize: '13px', color: '#94A3B8', flexWrap: 'wrap' }}>
                  <span>{profileData.email}</span>
                  {profileData.nationality && (
                    <>
                      <span>•</span>
                      <span><LocalizedText message={"Region: ⟦0⟧"} values={[profileData.nationality.toUpperCase()]} /></span>
                    </>
                  )}
                </div>

                {/* Friendly Travel Style Badge */}
                <div style={{
                  marginTop: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#FBBF24',
                  fontSize: '12px',
                  fontWeight: 700
                }}>
                  <StyleIcon size={14} color="#FBBF24" />
                  <span>{travelStyle.title}</span>
                </div>
              </div>
            </div>

            {/* Quick Action to Preferences */}
            <Link
              href="/preferences"
              style={{
                padding: '11px 22px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
                border: 'none',
                color: '#0A0B0E',
                fontSize: '13px',
                fontWeight: 800,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 18px rgba(245, 158, 11, 0.35)',
                transition: 'transform 0.15s ease',
                position: 'relative',
                zIndex: 2
              }}
            >
              <SlidersHorizontal size={15} />
              <span><LocalizedText message={"Customize Preferences"} /></span>
            </Link>
          </div>

          {/* ── 2. Travel Preferences Overview Card ── */}
          <div style={{
            borderRadius: '22px',
            backgroundColor: '#121418',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '28px 30px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#F59E0B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <SlidersHorizontal size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}><LocalizedText message={"My Travel Preferences"} /></h2>
                  <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0 0' }}><LocalizedText message={"How Masar AI personalizes your hotels, itinerary pacing, and activities"} /></p>
                </div>
              </div>

              <Link 
                href="/preferences"
                style={{
                  fontSize: '13px',
                  color: '#F59E0B',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <span><LocalizedText message={"Edit Preferences"} /></span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* 4-Metric Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              {/* Pace */}
              <div style={{
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: 'rgba(10, 11, 14, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Coffee size={13} color="#F59E0B" />
                  <span><LocalizedText message={"Pace & Rhythm"} /></span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                  <LocalizedText>{prefs.preferred_pace || 'Balanced'}</LocalizedText>
                </div>
              </div>

              {/* Stay Style */}
              <div style={{
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: 'rgba(10, 11, 14, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={13} color="#F59E0B" />
                  <span><LocalizedText message={"Stay Sanctuary"} /></span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                  <LocalizedText>{prefs.accommodation_style || '5-Star Resorts'}</LocalizedText>
                </div>
              </div>

              {/* Getting Around */}
              <div style={{
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: 'rgba(10, 11, 14, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Car size={13} color="#F59E0B" />
                  <span><LocalizedText message={"Getting Around"} /></span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                  <LocalizedText>{prefs.transit_style || 'Private Driver'}</LocalizedText>
                </div>
              </div>

              {/* Budget */}
              <div style={{
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: 'rgba(10, 11, 14, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <DollarSign size={13} color="#34D399" />
                  <span><LocalizedText message={"Budget Level"} /></span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#34D399' }}>
                  <LocalizedText>{prefs.budget_tier || 'Executive Luxury'}</LocalizedText>
                </div>
              </div>
            </div>

            {/* Vibes & Dietary Tags */}
            <div style={{
              padding: '16px',
              borderRadius: '16px',
              backgroundColor: 'rgba(10, 11, 14, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}><LocalizedText message={"Favorite Vibes & Dietary Requirements"} /></div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {activeVibes.length === 0 && activeDietary.length === 0 && (
                  <span style={{ fontSize: '12px', color: '#64748B' }}><LocalizedText message={"No specific vibes selected yet. Tap Edit Preferences to customize!"} /></span>
                )}

                {activeVibes.map((vibe, i) => (
                  <span
                    key={`vibe-${i}`}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      color: '#FBBF24',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Sparkles size={12} color="#FBBF24" />
                    <span>{vibe}</span>
                  </span>
                ))}

                {activeDietary.map((diet, i) => (
                  <span
                    key={`diet-${i}`}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#34D399',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <CheckCircle2 size={12} color="#34D399" />
                    <span><LocalizedText>{diet}</LocalizedText></span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── 3. Bottom Dual Cards: Personal Details & Security ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '28px' }}>
            
            {/* Personal Details Card */}
            <div style={{
              borderRadius: '22px',
              backgroundColor: '#121418',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '28px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: '#F59E0B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <User size={18} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}><LocalizedText message={"Personal Details"} /></h2>
                    <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0 0' }}><LocalizedText message={"Your contact info for booking confirmations"} /></p>
                  </div>
                </div>

                {profileMessage.text && (
                  <div style={{
                    marginBottom: '16px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: profileMessage.type === 'error' ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                    color: profileMessage.type === 'error' ? '#FB7185' : '#34D399',
                    border: `1px solid ${profileMessage.type === 'error' ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <CheckCircle2 size={14} />
                    <span>{profileMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#E2E8F0', marginBottom: '6px' }}><LocalizedText message={"Full Name"} /></label>
                    <div style={{ position: 'relative' }}>
                      <User size={14} style={iconPrefixStyle} />
                      <Localized element={"input"} attributes={["placeholder"]}
                        type="text"
                        value={profileData.name}
                        onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                        style={inputStyle}
                        placeholder="e.g. David Smith"
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#E2E8F0', marginBottom: '6px' }}><LocalizedText message={"Email Address"} /></label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={14} style={iconPrefixStyle} />
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#E2E8F0', marginBottom: '6px' }}><LocalizedText message={"Phone Number"} /></label>
                      <div style={{ position: 'relative' }}>
                        <Phone size={14} style={iconPrefixStyle} />
                        <input
                          type="text"
                          value={profileData.phone_number}
                          onChange={e => setProfileData({ ...profileData, phone_number: e.target.value })}
                          style={inputStyle}
                          placeholder="+971..."
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#E2E8F0', marginBottom: '6px' }}><LocalizedText message={"Nationality / Region"} /></label>
                      <div style={{ position: 'relative' }}>
                        <MapPin size={14} style={iconPrefixStyle} />
                        <Localized element={"input"} attributes={["placeholder"]}
                          type="text"
                          value={profileData.nationality}
                          onChange={e => setProfileData({ ...profileData, nationality: e.target.value })}
                          style={inputStyle}
                          placeholder="e.g. AE"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading.profile}
                    style={{
                      padding: '11px 22px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
                      border: 'none',
                      color: '#0A0B0E',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: loading.profile ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      alignSelf: 'flex-start',
                      marginTop: '6px',
                      boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span><LocalizedText>{loading.profile ? 'Saving...' : 'Save Changes'}</LocalizedText></span>
                  </button>
                </form>
              </div>
            </div>

            {/* Security Card */}
            <div style={{
              borderRadius: '22px',
              backgroundColor: '#121418',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '28px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: '#F59E0B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Lock size={18} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}><LocalizedText message={"Security & Password"} /></h2>
                    <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0 0' }}><LocalizedText message={"Manage your password and authentication"} /></p>
                  </div>
                </div>

                {passwordMessage.text && (
                  <div style={{
                    marginBottom: '16px',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: passwordMessage.type === 'error' ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                    color: passwordMessage.type === 'error' ? '#FB7185' : '#34D399',
                    border: `1px solid ${passwordMessage.type === 'error' ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <CheckCircle2 size={14} />
                    <span>{passwordMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#E2E8F0', marginBottom: '6px' }}><LocalizedText message={"Current Password"} /></label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={14} style={iconPrefixStyle} />
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordData.current_password}
                        onChange={e => setPasswordData({ ...passwordData, current_password: e.target.value })}
                        autoComplete="new-password"
                        style={{ ...inputStyle, paddingInlineEnd: '42px' }}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}
                      >
                        {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#E2E8F0', marginBottom: '6px' }}><LocalizedText message={"New Password"} /></label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={14} style={iconPrefixStyle} />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.new_password}
                        onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
                        autoComplete="new-password"
                        style={{ ...inputStyle, paddingInlineEnd: '42px' }}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}
                      >
                        {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading.password}
                    style={{
                      padding: '11px 22px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
                      border: 'none',
                      color: '#0A0B0E',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: loading.password ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      alignSelf: 'flex-start',
                      marginTop: '6px',
                      boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span><LocalizedText>{loading.password ? 'Updating...' : 'Update Password'}</LocalizedText></span>
                  </button>
                </form>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
