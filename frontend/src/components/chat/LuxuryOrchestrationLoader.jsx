'use client';
import {LocalizedText} from '@/i18n/Localized';


import { useState, useEffect } from 'react';
import MasarMark from '@/components/ui/MasarMark';
import { 
  Building2, 
  Navigation, 
  Calendar,
  PlaneTakeoff
} from 'lucide-react';

const FRIENDLY_PHASES = [
  "Finding top-rated hotels and luxury suites across the UAE...",
  "Curating unforgettable dining spots and cultural landmarks...",
  "Mapping the most comfortable transit routes for you...",
  "Searching premier flight itineraries and airline connections...",
  "Putting the finishing touches on your personalized itinerary..."
];

const COMPASS_TICKS = Array.from({ length: 36 }, (_, i) => i * 10);

export default function LuxuryOrchestrationLoader({ statusUpdates = [], enabledWorkers, animationOnly = false }) {
  const [phaseIndex, setPhaseIndex] = useState(0);

  // Cycle through warm, friendly phases every 3.2 seconds if no specific status
  useEffect(() => {
    if (animationOnly) return;
    const interval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % FRIENDLY_PHASES.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [animationOnly]);

  const rawStatus = statusUpdates.length > 0 
    ? statusUpdates[statusUpdates.length - 1] 
    : null;

  // Clean status to friendly text if technical prefixes exist
  const displayStatus = rawStatus
    ? rawStatus.replace(/^(Orchestrator|Event Agent|Accommodation Agent|Logistics Agent|Trip Planner|Flight Agent):\s*/i, '')
    : FRIENDLY_PHASES[phaseIndex];

  // Detect which agent is currently active for highlight pills
  const statusLower = (rawStatus || '').toLowerCase();
  const isHotelActive = statusLower.includes('accommodation') || statusLower.includes('hotel') || statusLower.includes('stay') || statusLower.includes('room');
  const isRouteActive = statusLower.includes('logistics') || statusLower.includes('transit') || statusLower.includes('route') || statusLower.includes('weather');
  const isEventActive = statusLower.includes('event') || statusLower.includes('ticketmaster') || statusLower.includes('dining') || statusLower.includes('restaurant');
  const isFlightActive = statusLower.includes('flight') || statusLower.includes('airline') || statusLower.includes('duffel');

  return (
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: animationOnly ? '310px' : '460px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Ambient Radial Lighting */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '460px',
        height: '460px',
        background: 'radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, rgba(18, 20, 24, 0) 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Main Glass Card */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '480px',
        backgroundColor: animationOnly ? 'transparent' : 'rgba(18, 20, 24, 0.88)',
        backdropFilter: animationOnly ? 'none' : 'blur(24px)',
        WebkitBackdropFilter: animationOnly ? 'none' : 'blur(24px)',
        border: animationOnly ? 'none' : '1px solid rgba(245, 158, 11, 0.25)',
        borderRadius: '24px',
        padding: animationOnly ? '0' : '38px 32px 32px 32px',
        boxShadow: animationOnly ? 'none' : '0 20px 50px rgba(0, 0, 0, 0.75), 0 0 35px rgba(245, 158, 11, 0.14)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>

        {/* ── Precision Celestial Astrolabe & Navigational Compass Assembly ── */}
        <div style={{
          position: 'relative',
          width: '270px',
          height: '270px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: animationOnly ? '0' : '20px'
        }}>

          {/* Layer 1: Stationary Compass & Astrolabe Navigation Ring */}
          <svg 
            width="270" 
            height="270" 
            viewBox="0 0 270 270" 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none'
            }}
          >
            <defs>
              <linearGradient id="trackGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
            </defs>

            {/* 1. Outer Precision Rings */}
            <circle cx="135" cy="135" r="126" fill="none" stroke="rgba(245, 158, 11, 0.45)" strokeWidth="1.2" />
            <circle cx="135" cy="135" r="122" fill="none" stroke="rgba(255, 255, 255, 0.14)" strokeWidth="0.8" strokeDasharray="3 4" />

            {/* 2. Chronometer Radial Degree Ticks (36 Radial Markers around perimeter) */}
            <g transform="translate(135, 135)">
              {COMPASS_TICKS.map((deg) => {
                const isCardinal = deg % 90 === 0;
                const isMajor = deg % 30 === 0;
                const y1 = isCardinal ? -126 : isMajor ? -125 : -123;
                const y2 = isMajor ? -117 : -119;
                return (
                  <g key={deg} transform={`rotate(${deg})`}>
                    <line
                      x1="0"
                      y1={y1}
                      x2="0"
                      y2={y2}
                      stroke={isMajor ? "#F59E0B" : "rgba(245, 158, 11, 0.45)"}
                      strokeWidth={isCardinal ? "1.6" : isMajor ? "1.3" : "0.8"}
                    />
                    {isMajor && !isCardinal && (
                      <circle cx="0" cy="-113" r="1.1" fill="#F59E0B" />
                    )}
                  </g>
                );
              })}
            </g>

            {/* 3. Cardinal Direction Navigational Markers */}
            {/* North (Celestial North) */}
            <g transform="translate(135, 5)">
              <polygon points="0,-4 3,1 -3,1" fill="#F59E0B" />
              <text y="-5" textAnchor="middle" fill="#FDE68A" fontSize="8.5" fontWeight="900" letterSpacing="0.1em"><LocalizedText message={"N"} /></text>
            </g>
            {/* South */}
            <g transform="translate(135, 265)">
              <polygon points="0,4 3,-1 -3,-1" fill="#F59E0B" />
              <text y="10" textAnchor="middle" fill="#CBD5E1" fontSize="8" fontWeight="800"><LocalizedText message={"S"} /></text>
            </g>
            {/* East */}
            <g transform="translate(265, 135)">
              <polygon points="4,0 -1,-3 -1,3" fill="#F59E0B" />
              <text x="8" y="3" textAnchor="start" fill="#CBD5E1" fontSize="8" fontWeight="800"><LocalizedText message={"E"} /></text>
            </g>
            {/* West */}
            <g transform="translate(5, 135)">
              <polygon points="-4,0 1,-3 1,3" fill="#F59E0B" />
              <text x="-8" y="3" textAnchor="end" fill="#CBD5E1" fontSize="8" fontWeight="800"><LocalizedText message={"W"} /></text>
            </g>

            {/* 4. Intercardinal Astrolabe Star Markers */}
            <text x="218" y="52" textAnchor="middle" fill="rgba(245, 158, 11, 0.65)" fontSize="7.5" fontWeight="700"><LocalizedText message={"✦ NE"} /></text>
            <text x="218" y="224" textAnchor="middle" fill="rgba(245, 158, 11, 0.65)" fontSize="7.5" fontWeight="700"><LocalizedText message={"✦ SE"} /></text>
            <text x="52" y="224" textAnchor="middle" fill="rgba(245, 158, 11, 0.65)" fontSize="7.5" fontWeight="700"><LocalizedText message={"✦ SW"} /></text>
            <text x="52" y="52" textAnchor="middle" fill="rgba(245, 158, 11, 0.65)" fontSize="7.5" fontWeight="700"><LocalizedText message={"✦ NW"} /></text>

            {/* 5. Fixed Orbit Track (Radius 100px) */}
            <circle cx="135" cy="135" r="100" fill="none" stroke="rgba(245, 158, 11, 0.18)" strokeWidth="1.2" />
            <circle cx="135" cy="135" r="100" fill="none" stroke="url(#trackGoldGrad)" strokeWidth="1.8" strokeDasharray="6 14" opacity="0.85" />

            {/* 6. Astrolabe Mid Telemetry Circuit Ring */}
            <circle cx="135" cy="135" r="85" fill="none" stroke="rgba(245, 158, 11, 0.28)" strokeWidth="1" strokeDasharray="2 6" />
            <circle cx="135" cy="135" r="74" fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.8" />
          </svg>

          {/* Layer 2: Rotating Supersonic Planes (Only the planes fly along the r=100 track) */}
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '270px',
              height: '270px',
              animation: 'spinClockwise 18s linear infinite',
              transformOrigin: '135px 135px',
              pointerEvents: 'none'
            }}
          >
            <svg 
              width="270" 
              height="270" 
              viewBox="0 0 270 270" 
              style={{
                width: '100%',
                height: '100%',
                display: 'block'
              }}
            >
              <defs>
                <g id="orbitalPlane">
                  {/* Engine Contrail / Golden Jet Wake */}
                  <circle cx="-10" cy="0" r="1.8" fill="#FDE68A" opacity="0.9" filter="url(#goldGlowFilter)" />
                  <circle cx="-14" cy="0" r="1.3" fill="#F59E0B" opacity="0.6" />
                  <circle cx="-18" cy="0" r="0.9" fill="#D97706" opacity="0.3" />

                  {/* Sleek Supersonic Jet Airliner Silhouette */}
                  <path 
                    d="M 9 0 L 7 1.3 L 3 1.6 L -1 8.5 L -2.5 8.5 L -1.2 1.8 L -5.5 1.6 L -7 4.8 L -8.5 4.8 L -7.8 1.2 L -9.2 0 L -7.8 -1.2 L -8.5 -4.8 L -7 -4.8 L -5.5 -1.6 L -1.2 -1.8 L -2.5 -8.5 L -1 -8.5 L 3 -1.6 L 7 -1.3 Z" 
                    fill="url(#planeGoldGrad)" 
                    stroke="#F59E0B" 
                    strokeWidth="0.6" 
                    filter="url(#goldGlowFilter)" 
                  />
                </g>

                <linearGradient id="planeGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FDE68A" />
                  <stop offset="50%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
                <filter id="goldGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* 4 Orbital Golden Airplanes Flying Clockwise at r=100 */}
              <g transform="translate(135, 35) rotate(0)">
                <use href="#orbitalPlane" />
              </g>
              <g transform="translate(235, 135) rotate(90)">
                <use href="#orbitalPlane" />
              </g>
              <g transform="translate(135, 235) rotate(180)">
                <use href="#orbitalPlane" />
              </g>
              <g transform="translate(35, 135) rotate(270)">
                <use href="#orbitalPlane" />
              </g>
            </svg>
          </div>

          {/* Layer 3: Inner Counter-Rotating Orbit Accents */}
          <div 
            style={{
              position: 'absolute',
              top: '50px',
              left: '50px',
              width: '170px',
              height: '170px',
              animation: 'spinCounterClockwise 16s linear infinite',
              transformOrigin: '85px 85px',
              pointerEvents: 'none'
            }}
          >
            <svg 
              width="170" 
              height="170" 
              viewBox="0 0 170 170" 
              style={{ width: '100%', height: '100%', display: 'block' }}
            >
              <circle 
                cx="85" 
                cy="85" 
                r="80" 
                fill="none" 
                stroke="rgba(245, 158, 11, 0.22)" 
                strokeWidth="1" 
                strokeDasharray="4 12" 
              />
            </svg>
          </div>

          {/* ── Central Circular Video Portal ── */}
          <div style={{
            position: 'relative',
            zIndex: 4,
            width: '136px',
            height: '136px',
            borderRadius: '50%',
            overflow: 'hidden',
            backgroundColor: '#050608',
            border: '2px solid rgba(245, 158, 11, 0.8)',
            boxShadow: '0 0 32px rgba(245, 158, 11, 0.45), inset 0 0 16px rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulseGlowSoft 3s ease-in-out infinite'
          }}>
            <MasarMark animated/>

          </div>
        </div>

        {!animationOnly && <>
        {/* ── Friendly Headline ── */}
        <h3 style={{
          fontSize: '19px',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #FFFFFF 40%, #FBBF24 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: '0 0 8px 0',
          letterSpacing: '-0.02em'
        }}><LocalizedText message={"Masar AI is planning your trip..."} /></h3>

        {/* ── Friendly Dynamic Subtext ── */}
        <div style={{
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 12px'
        }}>
          <p style={{
            fontSize: '13px',
            color: '#CBD5E1',
            margin: 0,
            lineHeight: 1.5,
            transition: 'opacity 0.3s ease'
          }}>
            {displayStatus}
          </p>
        </div>

        {/* ── Friendly Multi-Agent Pills ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: '20px',
          paddingTop: '18px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          width: '100%'
        }}>
          {(!enabledWorkers||enabledWorkers.includes('accommodation_agent'))&&(
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '9999px',
            backgroundColor: isHotelActive ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.06)',
            border: isHotelActive ? '1px solid #F59E0B' : '1px solid rgba(245, 158, 11, 0.2)',
            fontSize: '12px',
            fontWeight: 600,
            color: isHotelActive ? '#FBBF24' : '#E2E8F0',
            transition: 'all 0.3s ease'
          }}>
            <span style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              backgroundColor: isHotelActive ? '#F59E0B' : '#10B981', 
              boxShadow: isHotelActive ? '0 0 8px #F59E0B' : '0 0 6px #10B981', 
              animation: 'pulseDot 1.4s infinite' 
            }} />
            <Building2 size={13} color="#F59E0B" />
            <span><LocalizedText message={"Hotels & Stays"} /></span>
          </div>
          )}

          {(!enabledWorkers||enabledWorkers.includes('logistics_agent'))&&(
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '9999px',
            backgroundColor: isRouteActive ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.06)',
            border: isRouteActive ? '1px solid #F59E0B' : '1px solid rgba(245, 158, 11, 0.2)',
            fontSize: '12px',
            fontWeight: 600,
            color: isRouteActive ? '#FBBF24' : '#E2E8F0',
            transition: 'all 0.3s ease'
          }}>
            <span style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              backgroundColor: isRouteActive ? '#F59E0B' : '#64748B', 
              boxShadow: isRouteActive ? '0 0 8px #F59E0B' : 'none', 
              animation: isRouteActive ? 'pulseDot 1.4s infinite' : 'none' 
            }} />
            <Navigation size={13} color="#F59E0B" />
            <span><LocalizedText message={"Routes & Transit"} /></span>
          </div>
          )}

          {(!enabledWorkers||enabledWorkers.includes('event_agent'))&&(
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '9999px',
            backgroundColor: isEventActive ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.06)',
            border: isEventActive ? '1px solid #F59E0B' : '1px solid rgba(245, 158, 11, 0.2)',
            fontSize: '12px',
            fontWeight: 600,
            color: isEventActive ? '#FBBF24' : '#E2E8F0',
            transition: 'all 0.3s ease'
          }}>
            <span style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              backgroundColor: isEventActive ? '#F59E0B' : '#64748B', 
              boxShadow: isEventActive ? '0 0 8px #F59E0B' : 'none', 
              animation: isEventActive ? 'pulseDot 1.4s infinite' : 'none' 
            }} />
            <Calendar size={13} color="#F59E0B" />
            <span><LocalizedText message={"Events & Dining"} /></span>
          </div>
          )}

          {(!enabledWorkers||enabledWorkers.includes('flight_agent'))&&(
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '9999px',
            backgroundColor: isFlightActive ? 'rgba(59, 130, 246, 0.18)' : 'rgba(245, 158, 11, 0.06)',
            border: isFlightActive ? '1px solid #3B82F6' : '1px solid rgba(245, 158, 11, 0.2)',
            fontSize: '12px',
            fontWeight: 600,
            color: isFlightActive ? '#93C5FD' : '#E2E8F0',
            transition: 'all 0.3s ease'
          }}>
            <span style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              backgroundColor: isFlightActive ? '#3B82F6' : '#64748B', 
              boxShadow: isFlightActive ? '0 0 8px #3B82F6' : 'none', 
              animation: isFlightActive ? 'pulseDot 1.4s infinite' : 'none' 
            }} />
            <PlaneTakeoff size={13} color={isFlightActive ? '#3B82F6' : '#F59E0B'} />
            <span><LocalizedText message={"Global Flights"} /></span>
          </div>
          )}
        </div>

        </>}
      </div>
    </div>
  );
}
