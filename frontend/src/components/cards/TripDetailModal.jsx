
import {Localized,LocalizedText} from '@/i18n/Localized';
import { useState } from 'react';
import Link from 'next/link';
import { Clock, MapPin, X, ArrowRight, Wallet, Landmark, Utensils, Camera, ShoppingBag, SunMedium, Building2, Map as MapIcon, List } from 'lucide-react';
import InteractiveMap from './InteractiveMap';
import PlaceTimeTravel from '@/components/trips/PlaceTimeTravel';

export default function TripDetailModal({ selectedTripModal, setSelectedTripModal, activeModalDay, setActiveModalDay, getActivityIcon, onCustomize }) {
  const [viewMode, setViewMode] = useState('split'); // 'list', 'map', 'split'
  return (
    <>
      {selectedTripModal && (() => {
        const raw = selectedTripModal.itinerary_data;
        let parsedDays = [];
        
        if (raw) {
          let parsed = raw;
          if (typeof parsed === 'string') {
            try { parsed = JSON.parse(parsed); } catch (e) { parsed = { description: parsed }; }
          }
          if (parsed.days && Array.isArray(parsed.days)) {
            parsedDays = parsed.days;
          } else if (Array.isArray(parsed)) {
            parsedDays = parsed;
          } else if (typeof parsed === 'object') {
            parsedDays = Object.entries(parsed).map(([key, val]) => {
              if (typeof val === 'object' && val !== null) {
                return {
                  theme: val.theme || val.title || key,
                  activities: val.activities || val.items || [],
                  description: val.description
                };
              }
              return { theme: key, description: String(val) };
            });
          }
        }

        const heroImg = selectedTripModal.hero_image_url || 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=85';
        const displayDays = activeModalDay === -1 
          ? parsedDays 
          : (parsedDays[activeModalDay] ? [parsedDays[activeModalDay]] : parsedDays);

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
              padding: 'clamp(12px, 2.5vw, 28px)',
              overflowY: 'auto',
              animation: 'masarModalFadeIn 0.25s ease-out'
            }}
            onClick={() => setSelectedTripModal(null)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: viewMode === 'split' ? '1140px' : '780px',
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
              {/* ── Panorama Hero Header ── */}
              <div style={{
                position: 'relative',
                height: '200px',
                width: '100%',
                overflow: 'hidden',
                flexShrink: 0,
                backgroundColor: '#14161C'
              }}>
                <Localized element={"img"} attributes={["alt"]}
                  src={heroImg}
                  alt={selectedTripModal.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=85';
                  }}
                />
                
                {/* Vignette Gradients */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, #0E1015 0%, rgba(14, 16, 21, 0.65) 50%, rgba(14, 16, 21, 0.3) 100%)'
                }} />

                {/* Controls Top Right */}
                <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '12px', zIndex: 10 }}>
                  
                  {/* View Mode Toggle */}
                  <div style={{
                    display: 'flex',
                    backgroundColor: 'rgba(10, 11, 14, 0.75)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '24px',
                    padding: '4px',
                    gap: '4px'
                  }}>
                    <Localized element={"button"} attributes={["title"]}
                      onClick={() => setViewMode('split')}
                      title="Split View"
                      style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        backgroundColor: viewMode === 'split' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                        color: viewMode === 'split' ? '#FBBF24' : '#94A3B8',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                      }}
                    >
                      <MapIcon size={14} /><LocalizedText message={" Split"} /></Localized>
                    <Localized element={"button"} attributes={["title"]}
                      onClick={() => setViewMode('list')}
                      title="Timeline View"
                      style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        backgroundColor: viewMode === 'list' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                        color: viewMode === 'list' ? '#FFFFFF' : '#94A3B8',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                      }}
                    >
                      <List size={14} /><LocalizedText message={" Timeline"} /></Localized>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={() => setSelectedTripModal(null)}
                    aria-label="Close trip details"
                    className="masar-modal-close-btn"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Hero Title & Badges */}
                <div style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '24px',
                  right: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(10, 11, 14, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#E2E8F0',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <MapPin size={12} color="#F59E0B" />
                      <span><LocalizedText>{selectedTripModal.destination || 'UAE & Gulf'}</LocalizedText></span>
                    </span>

                    {selectedTripModal.duration_days && (
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(10, 11, 14, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#E2E8F0',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Clock size={12} color="#F59E0B" />
                        <span><LocalizedText message={"⟦0⟧ Days Journey"} values={[selectedTripModal.duration_days]} /></span>
                      </span>
                    )}
                  </div>

                  <h2 style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    margin: 0,
                    letterSpacing: '-0.02em',
                    textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)'
                  }}>
                    {selectedTripModal.title}
                  </h2>
                </div>
              </div>

              {/* ── Interactive Day Switcher Carousel ── */}
              {parsedDays.length > 1 && (
                <div style={{
                  padding: '12px 24px',
                  backgroundColor: 'rgba(18, 20, 24, 0.95)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  overflowX: 'auto',
                  flexShrink: 0
                }}>
                  {parsedDays.map((d, i) => {
                    const isActive = activeModalDay === i;
                    return (
                      <button
                        key={i}
                        onClick={() => setActiveModalDay(i)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '12px',
                          backgroundColor: isActive ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          border: isActive ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: isActive ? '#FBBF24' : '#94A3B8',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: isActive ? '#F59E0B' : 'rgba(255, 255, 255, 0.1)',
                          color: isActive ? '#0A0B0E' : '#FFFFFF',
                          fontSize: '10px',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {d.day_number || i + 1}
                        </span>
                        <span><LocalizedText>{d.theme ? d.theme.split(' ')[0] : `Day ${i + 1}`}</LocalizedText></span>
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setActiveModalDay(-1)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '12px',
                      backgroundColor: activeModalDay === -1 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: activeModalDay === -1 ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: activeModalDay === -1 ? '#FBBF24' : '#94A3B8',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                  ><LocalizedText message={"All Days View"} /></button>
                </div>
              )}

              {/* ── Modal Body Container ── */}
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                
                {/* ── Timeline Section ── */}
                <div style={{
                  padding: '24px',
                  overflowY: 'auto',
                  flex: viewMode === 'split' ? '1 1 50%' : '1',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px',
                  backgroundColor: '#0A0B0E'
                }}>
                {displayDays.map((day, dIdx) => {
                  const dayActualIdx = activeModalDay === -1 ? dIdx : activeModalDay;
                  const dayNum = day.day_number || dayActualIdx + 1;
                  const dayTheme = day.theme || day.title || `Day ${dayNum}`;
                  const activities = Array.isArray(day.activities) ? day.activities : [];

                  return (
                    <div key={dIdx} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Day Header Badge */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 16px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.25)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            padding: '3px 9px',
                            borderRadius: '6px',
                            backgroundColor: '#F59E0B',
                            color: '#0A0B0E',
                            fontSize: '11px',
                            fontWeight: 800,
                            letterSpacing: '0.04em'
                          }}><LocalizedText message={"DAY ⟦0⟧"} values={[dayNum]} /></span>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
                            {dayTheme}
                          </span>
                        </div>
                        {activities.length > 0 && (
                          <span style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 600 }}><LocalizedText message={"⟦0⟧ Curated Stops"} values={[activities.length]} /></span>
                        )}
                      </div>

                      {/* Connected Timeline Activities */}
                      <div style={{
                        position: 'relative',
                        paddingInlineStart: '32px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '18px'
                      }}>
                        {/* Continuous Vertical Golden Line */}
                        <div style={{
                          position: 'absolute',
                          left: '11px',
                          top: '16px',
                          bottom: '16px',
                          width: '2px',
                          background: 'linear-gradient(to bottom, #F59E0B 0%, rgba(245, 158, 11, 0.25) 100%)'
                        }} />

                        {activities.map((act, aIdx) => {
                          const IconComp = getActivityIcon(act.title || act.name);
                          return (
                            <div
                              key={aIdx}
                              style={{
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column'
                              }}
                            >
                              {/* Glowing Milestone Pin Node */}
                              <div style={{
                                position: 'absolute',
                                left: '-32px',
                                top: '14px',
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: '#14161C',
                                border: '2px solid #F59E0B',
                                boxShadow: '0 0 12px rgba(245, 158, 11, 0.6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#FBBF24',
                                fontSize: '10px',
                                fontWeight: 800,
                                zIndex: 2
                              }}>
                                {aIdx + 1}
                              </div>

                              {/* Activity Luxury Card */}
                              <div style={{
                                padding: '16px 18px',
                                borderRadius: '16px',
                                backgroundColor: 'rgba(18, 20, 24, 0.85)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                transition: 'border-color 0.2s',
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
                              }}>
                                {/* Card Top Row: Time & Activity Icon */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                    color: '#FBBF24',
                                    fontSize: '11px',
                                    fontWeight: 700
                                  }}>
                                    <Clock size={12} color="#F59E0B" />
                                    <span><LocalizedText>{act.time || 'Flexible Time'}</LocalizedText></span>
                                  </div>

                                  <div style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#F59E0B'
                                  }}>
                                    <IconComp size={15} />
                                  </div>
                                </div>

                                {/* Activity Title & Editorial Copy */}
                                <div>
                                  <h4 style={{
                                    fontSize: '15px',
                                    fontWeight: 700,
                                    color: '#FFFFFF',
                                    margin: '0 0 6px 0',
                                    lineHeight: 1.3
                                  }}>
                                    {act.title || act.name}
                                  </h4>
                                  {act.description && (
                                    <p style={{
                                      fontSize: '13px',
                                      color: '#94A3B8',
                                      margin: 0,
                                      lineHeight: 1.5
                                    }}>
                                      <LocalizedText>{act.description}</LocalizedText>
                                    </p>
                                  )}
                                </div>

                                <PlaceTimeTravel activity={act}/>

                                {/* Metadata Chips: Location & Cost */}
                                <div style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  alignItems: 'center',
                                  gap: '12px',
                                  paddingTop: '6px',
                                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                                  fontSize: '12px'
                                }}>
                                  {act.location && (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      color: '#CBD5E1',
                                      fontWeight: 500
                                    }}>
                                      <MapPin size={13} color="#F59E0B" />
                                      <span>{act.location}</span>
                                    </span>
                                  )}
                                  {act.cost && act.cost !== 'N/A' && (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      color: '#34D399',
                                      fontWeight: 700,
                                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      border: '1px solid rgba(16, 185, 129, 0.25)'
                                    }}>
                                      <Wallet size={12} color="#34D399" />
                                      <span>{act.cost}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Map Section ── */}
              {viewMode === 'split' && (
                <div style={{
                  flex: '1 1 50%',
                  borderInlineStart: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '24px',
                  backgroundColor: '#14161C'
                }}>
                  <InteractiveMap days={displayDays} getActivityIcon={getActivityIcon} />
                </div>
              )}
            </div>

              {/* ── Modal Footer ── */}
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(14, 16, 21, 0.98)',
                flexShrink: 0
              }}>
                <button
                  onClick={() => setSelectedTripModal(null)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#CBD5E1',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                ><LocalizedText message={"Close"} /></button>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <Link
                    href={`/trips/${selectedTripModal.id}`}
                    onClick={() => setSelectedTripModal(null)}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      color: '#FBBF24',
                      fontSize: '13px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span><LocalizedText message={"Open Workspace"} /></span>
                    <ArrowRight size={13} />
                  </Link>

                  <button
                    onClick={() => {
                      if (onCustomize) {
                        onCustomize(selectedTripModal);
                      }
                    }}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
                      color: '#0A0B0E',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)'
                    }}
                  >
                    <span><LocalizedText message={"Customize in Chat"} /></span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}
    </>
  );
}
