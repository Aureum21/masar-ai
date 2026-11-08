'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';


import { useState } from 'react';
import MasarMark from '@/components/ui/MasarMark';
import { parseWorkerResult } from '@/utils/parseWorkerResult';
import HotelCard from '@/components/cards/HotelCard';
import RoomCard from '@/components/cards/RoomCard';
import EventCard from '@/components/cards/EventCard';
import RouteCard from '@/components/cards/RouteCard';
import ItineraryTimeline from '@/components/cards/ItineraryTimeline';
import BookingSummaryCard from '@/components/cards/BookingSummaryCard';
import OfficialInfoAlert from '@/components/cards/OfficialInfoAlert';
import FlightCard from '@/components/cards/FlightCard';
import Skeleton from '@/components/ui/Skeleton';
import DynamicMap from '@/components/ui/DynamicMap';
import LuxuryOrchestrationLoader from '@/components/chat/LuxuryOrchestrationLoader';
import { 
  MapPin, 
  Calendar, 
  Navigation, 
  Map as MapIcon, 
  ArrowUpRight, 
  ChevronDown,
  Star,
  Layers,
  Crown,
  PlaneTakeoff,
  ShieldCheck
} from 'lucide-react';

export default function ContextPanel({ workerResults, isStreaming, statusUpdates = [], onSelectPrompt, planningMode = false, planningChoices = null }) {
  const [activeCity, setActiveCity] = useState('Abu Dhabi');
  const [showMapModal, setShowMapModal] = useState(false);
  const [categorySelection, setCategorySelection] = useState(null);

  const parsedResults = (workerResults || [])
    .map(result => parseWorkerResult(result.type, result.content))
    .filter(parsed => parsed && parsed.items && parsed.items.length > 0);

  // Follow the current choice stage, while preserving a user's explicit tab choice.
  const filterScope = planningMode ? (planningChoices?.active ? planningChoices.stage : 'research') : 'chat';
  const preferredCategory = planningMode && planningChoices?.active
    && parsedResults.some(result => result.resultType === planningChoices.stage) ? planningChoices.stage : 'all';
  const activeCategoryFilter = categorySelection?.scope === filterScope
    && (categorySelection.value === 'all' || parsedResults.some(result => result.resultType === categorySelection.value))
      ? categorySelection.value : preferredCategory;
  function setActiveCategoryFilter(value) { setCategorySelection({ scope: filterScope, value }); }

  // Curated UAE discovery data (Mindtrip Style)
  const jumpBackInCards = [
    {
      id: 'trip-1',
      badge: 'Trip',
      title: 'Trip to Dubai & Abu Dhabi, Aug 2026',
      subtitle: 'Dubai & Abu Dhabi • Aug 21 – 24',
      image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=700&q=80',
      prompt: 'Show me my 4-day itinerary for Dubai and Abu Dhabi'
    },
    {
      id: 'guide-1',
      badge: 'Guide',
      title: '3-Day Guide to Dubai Architecture & Souks',
      subtitle: 'Dubai, UAE • 16 places to visit',
      image: 'https://images.unsplash.com/photo-1546412414-e1885259563a?auto=format&fit=crop&w=700&q=80',
      prompt: 'Plan a 3-day cultural tour of Dubai architecture and heritage souks'
    }
  ];

  const forYouPlaces = [
    {
      id: 'place-1',
      badge: 'Food & Dining',
      title: 'Antonia - Mamsha Al Saadiyat',
      subtitle: 'Gourmet Italian on Saadiyat Beach',
      price: '$$$',
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
      prompt: 'Tell me about Antonia restaurant at Mamsha Al Saadiyat in Abu Dhabi'
    },
    {
      id: 'place-2',
      badge: 'Activity',
      title: 'Sheikh Zayed Grand Mosque & Royal Palace Tour',
      subtitle: 'Architectural Marvel & Presidential Palace',
      price: 'From 180 AED',
      rating: 5.0,
      image: 'https://images.unsplash.com/photo-1578895101408-1a36b834405b?auto=format&fit=crop&w=600&q=80',
      prompt: 'What are the visiting hours and dress code for Sheikh Zayed Grand Mosque in Abu Dhabi?'
    },
    {
      id: 'place-3',
      badge: 'Luxury Stay',
      title: 'Armani Hotel Dubai — Burj Khalifa',
      subtitle: 'High luxury inside the world’s tallest tower',
      price: '1,450 AED',
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80',
      prompt: 'Find room availability and rates for Armani Hotel Dubai'
    },
    {
      id: 'place-4',
      badge: 'Culture',
      title: 'Louvre Abu Dhabi Dome & Galleries',
      subtitle: 'Universal Museum on Saadiyat Island',
      price: '63 AED',
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=600&q=80',
      prompt: 'Tell me about Louvre Abu Dhabi ticket prices and exhibits'
    }
  ];

  const getInspired = [
    {
      title: 'Desert Stargazing & Bedouin Luxury at Al Maha Resort',
      category: 'Desert Safari',
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
      prompt: 'Plan a desert safari experience with stargazing in Dubai desert'
    },
    {
      title: 'Old Dubai Abra Ride & Gold Souk Walking Tour',
      category: 'Heritage Tour',
      image: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=600&q=80',
      prompt: 'How to take the traditional Abra boat across Dubai Creek to Spice Souk?'
    }
  ];

  // 1. Luxury Loading State while Agent is thinking
  if (isStreaming && parsedResults.length === 0) {
    return (
      <div className="discovery-canvas" style={{ padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LuxuryOrchestrationLoader animationOnly={planningMode} statusUpdates={statusUpdates} />
      </div>
    );
  }

  // Filter parsed results if a specific category is chosen
  const filteredResults = activeCategoryFilter === 'all'
    ? parsedResults
    : parsedResults.filter(p => p.resultType === activeCategoryFilter);

  // Category counts
  const categoryCounts = parsedResults.reduce((acc, p) => {
    acc[p.resultType] = (acc[p.resultType] || 0) + (p.items?.length || 1);
    return acc;
  }, {});

  // 2. Active AI Results State (Hotels / Events / Routes)
  if (parsedResults.length > 0) {
    return (
      <div className={`discovery-canvas ${planningMode?'planning-generated-feed':''}`} style={{ gap: '24px', position: 'relative' }}>
        {/* ── Active Streaming Banner (when AI is still streaming subsequent steps) ── */}
        {isStreaming && !planningMode && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            borderRadius: '16px',
            backgroundColor: 'rgba(18, 20, 24, 0.94)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 20px rgba(245, 158, 11, 0.12)',
            backdropFilter: 'blur(16px)',
            marginBottom: '4px'
          }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              overflow: 'hidden',
              flexShrink: 0,
              border: '1.5px solid rgba(245, 158, 11, 0.7)',
              backgroundColor: '#050608',
              boxShadow: '0 0 12px rgba(245, 158, 11, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MasarMark animated/>

            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#FBBF24', textTransform: 'uppercase', letterSpacing: '0.05em' }}><LocalizedText message={"Masar AI Concierge Active"} /></span>
              <span style={{ fontSize: '12.5px', color: '#CBD5E1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <LocalizedText>{statusUpdates.length > 0 ? statusUpdates[statusUpdates.length - 1] : "Finalizing recommendations..."}</LocalizedText>
              </span>
            </div>
          </div>
        )}

        {/* ── Category Filter Bar ── */}
        {planningMode && Object.keys(categoryCounts).length > 1 && (
          <Localized element={"nav"} attributes={["aria-label"]} className="planning-result-tabs" aria-label="Discovery categories">
            {[['all','All discoveries',Layers],['flights','Flights',PlaneTakeoff],['hotels','Stays',MapPin],['rooms','Rooms',MapPin],['events','Experiences',Calendar],['route','Routes',Navigation],['itinerary','Itinerary',Layers]]
              .filter(([key])=>key==='all'||categoryCounts[key])
              .map(([key,label,Icon])=><button key={key} type="button" aria-pressed={activeCategoryFilter===key} onClick={()=>setActiveCategoryFilter(key)}><Icon size={14}/><span><LocalizedText>{label}</LocalizedText></span><b><LocalizedText>{key==='all'?parsedResults.reduce((sum,result)=>sum+result.items.length,0):categoryCounts[key]}</LocalizedText></b></button>)}
          </Localized>
        )}
        {!planningMode && Object.keys(categoryCounts).length > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            paddingBottom: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '4px'
          }}>
            <button
              onClick={() => setActiveCategoryFilter('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                border: activeCategoryFilter === 'all' ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.12)',
                backgroundColor: activeCategoryFilter === 'all' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(18, 20, 24, 0.6)',
                color: activeCategoryFilter === 'all' ? '#FBBF24' : '#94A3B8',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                lineHeight: 1.4
              }}
            >
              <span><LocalizedText message={"All Results (⟦0⟧)"} values={[parsedResults.reduce((sum, p) => sum + (p.items?.length || 0), 0)]} /></span>
            </button>

            {categoryCounts.hotels && (
              <button
                onClick={() => setActiveCategoryFilter('hotels')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  border: activeCategoryFilter === 'hotels' ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: activeCategoryFilter === 'hotels' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(18, 20, 24, 0.6)',
                  color: activeCategoryFilter === 'hotels' ? '#FBBF24' : '#94A3B8',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  lineHeight: 1.4
                }}
              >
                <MapPin size={13} />
                <span><LocalizedText message={"Stays (⟦0⟧)"} values={[categoryCounts.hotels]} /></span>
              </button>
            )}

            {categoryCounts.rooms && (
              <button
                onClick={() => setActiveCategoryFilter('rooms')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  border: activeCategoryFilter === 'rooms' ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: activeCategoryFilter === 'rooms' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(18, 20, 24, 0.6)',
                  color: activeCategoryFilter === 'rooms' ? '#10B981' : '#94A3B8',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  lineHeight: 1.4
                }}
              >
                <MapPin size={13} />
                <span><LocalizedText message={"Rooms (⟦0⟧)"} values={[categoryCounts.rooms]} /></span>
              </button>
            )}

            {categoryCounts.events && (
              <button
                onClick={() => setActiveCategoryFilter('events')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  border: activeCategoryFilter === 'events' ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: activeCategoryFilter === 'events' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(18, 20, 24, 0.6)',
                  color: activeCategoryFilter === 'events' ? '#FBBF24' : '#94A3B8',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  lineHeight: 1.4
                }}
              >
                <Calendar size={13} />
                <span><LocalizedText message={"Events (⟦0⟧)"} values={[categoryCounts.events]} /></span>
              </button>
            )}

            {categoryCounts.route && (
              <button
                onClick={() => setActiveCategoryFilter('route')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  border: activeCategoryFilter === 'route' ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: activeCategoryFilter === 'route' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(18, 20, 24, 0.6)',
                  color: activeCategoryFilter === 'route' ? '#FBBF24' : '#94A3B8',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  lineHeight: 1.4
                }}
              >
                <Navigation size={13} />
                <span><LocalizedText message={"Routes (⟦0⟧)"} values={[categoryCounts.route]} /></span>
              </button>
            )}

            {categoryCounts.itinerary && (
              <button
                onClick={() => setActiveCategoryFilter('itinerary')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  border: activeCategoryFilter === 'itinerary' ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: activeCategoryFilter === 'itinerary' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(18, 20, 24, 0.6)',
                  color: activeCategoryFilter === 'itinerary' ? '#FBBF24' : '#94A3B8',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  lineHeight: 1.4
                }}
              >
                <Layers size={13} />
                <span><LocalizedText message={"Itinerary (⟦0⟧)"} values={[categoryCounts.itinerary]} /></span>
              </button>
            )}
          </div>
        )}

        {filteredResults.map((parsed, idx) => (
          <div 
            key={planningMode?parsed.resultType:`${parsed.resultType}-${idx}`}
            className={planningMode?"planning-generated-section":undefined}
            style={{ 
              paddingBottom: idx < filteredResults.length - 1 ? '20px' : '0',
              borderBottom: idx < filteredResults.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none'
            }}
          >
            {parsed.resultType === 'hotels' && (
              <div>
                <div className="discovery-section-header">
                  <div className="discovery-section-title">
                    <MapPin size={18} color="var(--color-accent-hover)" />
                    <span><LocalizedText message={"Hotels & Stays in UAE"} /></span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', fontWeight: 700, marginInlineStart: '6px' }}>
                      {parsed.items.length} <LocalizedText>{parsed.items.length === 1 ? 'Option' : 'Options'}</LocalizedText>
                    </span>
                  </div>
                  <div className="discovery-action-group">
                    <button className="discovery-small-btn" onClick={() => setShowMapModal(!showMapModal)}>
                      <MapIcon size={13} />
                      <span><LocalizedText>{showMapModal ? 'Hide Map' : 'Map View'}</LocalizedText></span>
                    </button>
                  </div>
                </div>

                {showMapModal && (
                  <div style={{ marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', height: '220px', border: '1px solid var(--color-border)', position: 'relative', zIndex: 0 }}>
                    <DynamicMap 
                      center={parsed.items.length > 0 ? [parsed.items[0].lat, parsed.items[0].lng] : [25.1972, 55.2744]} 
                      zoom={12} 
                      markers={parsed.items.map(h => ({
                        position: [h.lat, h.lng],
                        popup: h.name
                      }))} 
                    />
                  </div>
                )}

                <div className={planningMode?'planning-result-grid':undefined} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {parsed.items.map((hotel, i) => (
                    <div key={i} className="luxury-card-reveal" style={{ animationDelay: `${Math.min(i * 90, 540)}ms` }}>
                      <HotelCard 
                        hotel={hotel}
                        readOnly={planningMode&&!(planningChoices?.active&&planningChoices?.stage==='hotels')}
                        selectionMode={planningMode}
                        disabled={planningChoices?.busy}
                        onBook={(hotel, action) => {
                          if(planningMode){if(action==='browse')planningChoices?.onBrowse(hotel);return;}
                          if (onSelectPrompt) {
                            if (action === 'browse') {
                              onSelectPrompt(`Show me the available rooms for ${hotel.name} using ID \`${hotel.hotelId}\``);
                            } else {
                              onSelectPrompt(`Tell me about the facilities and reviews for ${hotel.name} using ID \`${hotel.hotelId}\``);
                            }
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {parsed.resultType === 'rooms' && (
              <div>
                <div className="discovery-section-header">
                  <div className="discovery-section-title">
                    <MapPin size={18} color="var(--color-accent-hover)" />
                    <span><LocalizedText message={"Available Rooms"} /></span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', fontWeight: 700, marginInlineStart: '6px' }}>
                      {parsed.items.length} <LocalizedText>{parsed.items.length === 1 ? 'Option' : 'Options'}</LocalizedText>
                    </span>
                  </div>
                </div>

                <div className={planningMode?'planning-result-grid':undefined} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {parsed.items.map((room, i) => (
                    <div key={i} className="luxury-card-reveal" style={{ animationDelay: `${Math.min(i * 90, 540)}ms` }}>
                      <RoomCard 
                        room={room}
                        readOnly={planningMode&&!(planningChoices?.active&&planningChoices?.stage==='rooms')}
                        selectionMode={planningMode}
                        disabled={planningChoices?.busy}
                        onBook={() => {
                          if(planningMode){planningChoices?.onChoose(room.choice_id||room.offerId);return;}
                          if (onSelectPrompt) {
                            onSelectPrompt(`Prebook the ${room.name} using offer ID \`${room.offerId || ''}\``);
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {parsed.resultType === 'events' && (
              <div>
                <div className="discovery-section-header">
                  <div className="discovery-section-title">
                    <Calendar size={18} color="var(--color-accent-hover)" />
                    <span><LocalizedText message={"Live Events & Experiences"} /></span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', fontWeight: 700, marginInlineStart: '6px' }}>
                      {parsed.items.length} <LocalizedText>{parsed.items.length === 1 ? 'Event' : 'Events'}</LocalizedText>
                    </span>
                  </div>
                </div>
                <div className={planningMode?'planning-result-grid':undefined} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {parsed.items.map((event, i) => (
                    <div key={i} className="luxury-card-reveal" style={{ animationDelay: `${Math.min(i * 90, 540)}ms` }}>
                      <EventCard event={event} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {parsed.resultType === 'flights' && (() => {
              const flightsByAirline = parsed.items.reduce((acc, flight) => {
                const airline = flight.airline || 'Unknown Airline';
                if (!acc[airline]) acc[airline] = [];
                acc[airline].push(flight);
                return acc;
              }, {});

              return (
                <div>
                  <div className="discovery-section-header">
                    <div className="discovery-section-title">
                      <PlaneTakeoff size={18} color="var(--color-accent-hover)" />
                      <span><LocalizedText message={"Global Flights"} /></span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', fontWeight: 700, marginInlineStart: '6px' }}>
                        {parsed.items.length} <LocalizedText>{parsed.items.length === 1 ? 'Flight' : 'Flights'}</LocalizedText>
                      </span>
                    </div>
                  </div>
                  <div>
                    {Object.entries(flightsByAirline).map(([airline, flights], groupIdx) => (
                      <div key={airline} style={{ marginBottom: '24px' }}>
                        <h4 style={{ 
                          fontSize: '14px', 
                          fontWeight: 600, 
                          color: 'var(--color-text-secondary)', 
                          marginBottom: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          paddingBottom: '8px',
                          borderBottom: '1px solid var(--color-border)'
                        }}>
                          {flights[0].airline_logo && (
                            <Localized element={"img"} attributes={["alt"]}
                              src={flights[0].airline_logo} 
                              alt={airline} 
                              style={{ width: '20px', height: '20px', objectFit: 'contain', borderRadius: '4px' }}
                              onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                            />
                          )}
                          {airline}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {flights.map((flight, i) => (
                            <div key={i} className="luxury-card-reveal" style={{ animationDelay: `${Math.min((groupIdx * 2 + i) * 80, 540)}ms` }}>
                              <FlightCard flight={flight} readOnly={planningMode} disabled={planningChoices?.busy} onSelect={planningChoices?.active&&planningChoices?.stage==='flights'?(item)=>planningChoices.onChoose(item.choice_id||item.offer_id):undefined} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {parsed.resultType === 'route' && (
              <div>
                <div className="discovery-section-header">
                  <div className="discovery-section-title">
                    <Navigation size={18} color="var(--color-accent-hover)" />
                    <span><LocalizedText message={"UAE Transit Route & Directions"} /></span>
                  </div>
                </div>
                <div>
                  {parsed.items.map((route, i) => (
                    <div key={i} className="luxury-card-reveal" style={{ animationDelay: `${Math.min(i * 90, 540)}ms` }}>
                      <RouteCard route={route} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {parsed.resultType === 'itinerary' && (
              <div>
                <div className="discovery-section-header">
                  <div className="discovery-section-title">
                    <Calendar size={18} color="var(--color-accent-hover)" />
                    <span><LocalizedText message={"Generated Itinerary"} /></span>
                  </div>
                </div>
                <div>
                  {parsed.items.map((itinerary, i) => (
                    <div key={i} className="luxury-card-reveal" style={{ animationDelay: `${Math.min(i * 90, 540)}ms` }}>
                      <ItineraryTimeline itinerary={itinerary} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {parsed.resultType === 'booking' && (
              <div>
                <div className="discovery-section-header">
                  <div className="discovery-section-title">
                    <Layers size={18} color="var(--color-accent-hover)" />
                    <span><LocalizedText message={"Booking Details"} /></span>
                  </div>
                </div>
                <div>
                  {parsed.items.map((booking, i) => (
                    <div key={i} className="luxury-card-reveal" style={{ animationDelay: `${Math.min(i * 90, 540)}ms` }}>
                      <BookingSummaryCard booking={booking} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {parsed.resultType === 'official' && (
              <div>
                <div className="discovery-section-header">
                  <div className="discovery-section-title">
                    <ShieldCheck size={18} color="var(--color-accent-hover)" />
                    <span><LocalizedText message={"Official Information"} /></span>
                  </div>
                </div>
                <div>
                  {parsed.items.map((info, i) => (
                    <div key={i} className="luxury-card-reveal" style={{ animationDelay: `${Math.min(i * 90, 540)}ms` }}>
                      <OfficialInfoAlert info={info} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // 3. Mindtrip-Grade Discovery Canvas (Zero / Idle State)
  return (
    <div className="discovery-canvas">
      {/* ── Section 1: Jump Back In ── */}
      <section>
        <div className="discovery-section-header">
          <h2 className="discovery-section-title"><LocalizedText message={"Jump back in"} /></h2>
        </div>

        <div className="discovery-grid-2col">
          {jumpBackInCards.map((card, idx) => (
            <div 
              key={card.id} 
              className="mindtrip-card luxury-card-reveal"
              style={{ animationDelay: `${idx * 120}ms` }}
              onClick={() => onSelectPrompt && onSelectPrompt(card.prompt)}
            >
              <div className="mindtrip-card-media">
                <Localized element={"img"} attributes={["alt"]} src={card.image} alt={card.title} />
                <div className="mindtrip-badge-top-left">{card.badge}</div>
              </div>
              <div className="mindtrip-card-body">
                <div className="mindtrip-card-title">{card.title}</div>
                <div className="mindtrip-card-subtitle">{card.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2: For You in Abu Dhabi / Dubai ── */}
      <section>
        <div className="discovery-section-header">
          <h2 className="discovery-section-title">
            <MapPin size={16} color="var(--color-accent-hover)" />
            <span><LocalizedText message={"For you in ⟦0⟧"} values={[activeCity]} /></span>
            <Localized element={"button"} attributes={["title"]}
              onClick={() => setActiveCity(activeCity === 'Abu Dhabi' ? 'Dubai' : 'Abu Dhabi')}
              style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', marginInlineStart: '4px' }}
              title="Toggle UAE City"
            >
              <ChevronDown size={16} />
            </Localized>
          </h2>

          <div className="discovery-action-group">
            <button className="discovery-small-btn" onClick={() => setShowMapModal(!showMapModal)}>
              <MapIcon size={13} />
              <span><LocalizedText message={"Map"} /></span>
            </button>
            <button 
              className="discovery-small-btn" 
              onClick={() => onSelectPrompt && onSelectPrompt(`Explore top attractions and culinary spots in ${activeCity}`)}
            >
              <span><LocalizedText message={"Explore"} /></span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>

        {showMapModal && (
          <div style={{ marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', height: '220px', border: '1px solid var(--color-border)', zIndex: 0, position: 'relative' }}>
            <DynamicMap 
              center={activeCity === 'Dubai' ? [25.2048, 55.2708] : [24.4539, 54.3773]} 
              zoom={11} 
              markers={[{ position: activeCity === 'Dubai' ? [25.2048, 55.2708] : [24.4539, 54.3773], popup: activeCity }]} 
            />
          </div>
        )}

        <div className="discovery-grid-2col">
          {forYouPlaces.map((place, idx) => (
            <div 
              key={place.id} 
              className="mindtrip-card luxury-card-reveal"
              style={{ animationDelay: `${idx * 100}ms` }}
              onClick={() => onSelectPrompt && onSelectPrompt(place.prompt)}
            >
              <div className="mindtrip-card-media">
                <Localized element={"img"} attributes={["alt"]} src={place.image} alt={place.title} />
                <div className="mindtrip-badge-top-left">{place.badge}</div>
              </div>
              <div className="mindtrip-card-body">
                <div className="mindtrip-card-title">{place.title}</div>
                <div className="mindtrip-card-subtitle">{place.subtitle}</div>
                <div className="mindtrip-card-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--color-gold)' }}>
                    <Star size={12} fill="var(--color-gold)" />
                    <span style={{ fontWeight: 700 }}>{place.rating}</span>
                  </div>
                  <span className="mindtrip-card-price">{place.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 3: Get Inspired ── */}
      <section>
        <div className="discovery-section-header">
          <h2 className="discovery-section-title"><LocalizedText message={"Get inspired"} /></h2>
          <button 
            className="discovery-small-btn"
            onClick={() => onSelectPrompt && onSelectPrompt("What are the most inspiring hidden gems in the UAE?")}
          >
            <span><LocalizedText message={"See all"} /></span>
          </button>
        </div>

        <div className="discovery-grid-2col">
          {getInspired.map((item, idx) => (
            <div 
              key={idx} 
              className="mindtrip-card luxury-card-reveal"
              style={{ animationDelay: `${idx * 120}ms` }}
              onClick={() => onSelectPrompt && onSelectPrompt(item.prompt)}
            >
              <div className="mindtrip-card-media">
                <Localized element={"img"} attributes={["alt"]} src={item.image} alt={item.title} />
                <div className="mindtrip-badge-top-left">{item.category}</div>
              </div>
              <div className="mindtrip-card-body">
                <div className="mindtrip-card-title">{item.title}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
