'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';


import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plane, 
  Hotel, 
  Calendar, 
  Navigation, 
  ShieldCheck, 
  ArrowRight, 
  Search, 
  SendHorizontal, 
  Star, 
  Ticket, 
  Clock, 
  CheckCircle2, 
  Globe, 
  Train, 
  CreditCard, 
  MapPin, 
  Car, 
  Lock, 
  Check,
  Sparkles
} from 'lucide-react';

const STAGES = [
  {
    id: 'travel',
    phase: 'Phase 01',
    tabLabel: 'Inbound Travel',
    icon: Plane,
    headline: 'Seamless Inbound Journey to the UAE',
    typingText: 'Fast-tracking your arrival with real-time Visa on Arrival rules, DXB VIP terminal coordination, and custom airport chauffeur pickups.',
    searchPlaceholder: 'Visa rules & airport transfers...',
    sampleQuery: 'What are the visa on arrival rules and best airport transfers for Dubai?'
  },
  {
    id: 'planning',
    phase: 'Phase 02',
    tabLabel: 'Bespoke Stays',
    icon: Hotel,
    headline: 'Curating Bespoke 5-Star Stays',
    typingText: 'Securing luxury penthouses overlooking the Burj Khalifa, private Palm Jumeirah villas, and locking in guaranteed direct rates.',
    searchPlaceholder: '5-star suites near Burj Khalifa...',
    sampleQuery: 'Find luxury 5-star suites near Burj Khalifa with fountain views'
  },
  {
    id: 'exploring',
    phase: 'Phase 03',
    tabLabel: 'VIP Events',
    icon: Calendar,
    headline: 'Front-Row Access to UAE Marvels',
    typingText: 'Unlocking VIP tickets to Coca-Cola Arena concerts, Yas Island Grand Prix, Louvre Abu Dhabi exhibitions, and rooftop dining.',
    searchPlaceholder: 'VIP concerts & events in Dubai...',
    sampleQuery: 'What concerts and VIP events are happening in Dubai this weekend?'
  },
  {
    id: 'transit',
    phase: 'Phase 04',
    tabLabel: 'Transit & Metro',
    icon: Navigation,
    headline: 'Instant Transit Navigation Across 7 Emirates',
    typingText: 'Step-by-step Dubai Metro Red/Green lines, Tram schedules, Nol card fare calculations, and inter-emirate highway transit.',
    searchPlaceholder: 'Dubai Metro routes & Nol fares...',
    sampleQuery: 'How do I travel from Dubai Marina to Dubai Frame using the Metro?'
  },
  {
    id: 'knowledge',
    phase: 'Phase 05',
    tabLabel: 'Cultural Wisdom',
    icon: ShieldCheck,
    headline: 'Authoritative UAE Guidelines & Etiquette',
    typingText: 'Instant clarity on mosque dress codes, VAT tax refund kiosks, alcohol permits, Ramadan customs, and official local laws.',
    searchPlaceholder: 'Dress etiquette & tax refund...',
    sampleQuery: 'What is the dress code for Sheikh Zayed Mosque and how do VAT refunds work?'
  }
];

export default function HeroInteractiveStage() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();

  const currentStage = STAGES[activeIdx];

  // Auto-cycle stages: 5 seconds in normal condition, 7 seconds when hovering
  useEffect(() => {
    const delay = isHovered ? 7000 : 5000;
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % STAGES.length);
    }, delay);
    return () => clearInterval(interval);
  }, [isHovered]);

  // Typewriter effect
  useEffect(() => {
    const currentText = currentStage.typingText;
    let charIndex = 0;

    const typeInterval = setInterval(() => {
      if (charIndex <= currentText.length) {
        setDisplayedText(currentText.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typeInterval);
      }
    }, 18);

    return () => clearInterval(typeInterval);
  }, [activeIdx, currentStage.typingText]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchQuery.trim() || currentStage.sampleQuery;
    router.push(`/chat?prompt=${encodeURIComponent(q)}`);
  };

  // Generate 36 degree ticks for the luxury chronometer ring
  const ticks = Array.from({ length: 36 }).map((_, i) => i * 10);

  return (
    <section 
      className="hero-section-wrapper"
      style={{
        position: 'relative',
        padding: '30px 24px 70px',
        maxWidth: '1400px',
        margin: '0 auto',
        overflow: 'hidden'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Ambient Gold Glows */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '15%',
        width: '600px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
        filter: 'blur(60px)'
      }} />
      <div style={{
        position: 'absolute',
        top: '15%',
        right: '5%',
        width: '550px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(217, 119, 6, 0.14) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
        filter: 'blur(60px)'
      }} />

      {/* ── Top Stage Progress Navigation (Horizontal Swipeable Carousel on Mobile) ── */}
      <div className="hero-tabs-scroll-wrapper">
        <div className="hero-tabs-scroll">
          {STAGES.map((s, idx) => {
            const StageIcon = s.icon;
            const isActive = idx === activeIdx;
            return (
              <button
                key={s.id}
                onClick={() => setActiveIdx(idx)}
                className="hero-tab-pill"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '999px',
                  backgroundColor: isActive ? 'rgba(245, 158, 11, 0.18)' : 'var(--color-surface-glass)',
                  border: isActive ? '1px solid #F59E0B' : '1px solid var(--color-border)',
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 0 25px rgba(245, 158, 11, 0.35)' : 'none',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <StageIcon size={15} color={isActive ? '#F59E0B' : 'var(--color-text-muted)'} />
                <span>{s.tabLabel}</span>
                {isActive && (
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    backgroundColor: '#F59E0B',
                    color: '#0A0B0E',
                    fontWeight: 800
                  }}>
                    {s.phase}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Two-Column Main Stage Layout (Responsive 1 Column on Mobile) ── */}
      <div className="hero-stage-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '48px',
        alignItems: 'center',
        position: 'relative',
        zIndex: 10
      }}>
        {/* ── LEFT COLUMN: Animated Storytelling & Quick Query ── */}
        <div className="hero-stage-left" style={{ textAlign: 'start' }}>
          {/* Dynamic Headline */}
          <h1 style={{
            fontSize: 'clamp(2.2rem, 4.4vw, 3.5rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            margin: '0 0 20px 0',
            color: 'var(--color-text-primary)',
            minHeight: '2.4em'
          }}>
            {currentStage.headline.split(' ').map((word, i, arr) => (
              <span key={i} style={{
                color: (i >= arr.length - 2) ? '#F59E0B' : 'var(--color-text-primary)',
                display: 'inline-block',
                marginInlineEnd: '8px'
              }}>
                {word}
              </span>
            ))}
          </h1>

          {/* Typing Description */}
          <div style={{
            minHeight: '75px',
            fontSize: '16px',
            lineHeight: 1.6,
            color: 'var(--color-text-secondary)',
            marginBottom: '32px',
            position: 'relative'
          }}>
            <span>{displayedText}</span>
            <span style={{
              display: 'inline-block',
              width: '2px',
              height: '18px',
              backgroundColor: '#F59E0B',
              marginInlineStart: '4px',
              verticalAlign: 'middle',
              animation: 'pulseDot 0.8s infinite'
            }} />
          </div>

          {/* Interactive Search Bar */}
          <form 
            onSubmit={handleSearchSubmit} 
            className="hero-search-wrapper"
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--color-surface-glass)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '16px',
              padding: '8px 8px 8px 18px',
              boxShadow: 'var(--shadow-lg), 0 0 25px rgba(245, 158, 11, 0.15)',
              marginBottom: '22px'
            }}
          >
            <Search size={18} color="#F59E0B" style={{ marginInlineEnd: '10px', flexShrink: 0 }} />
            <Localized element={"input"} attributes={["placeholder"]}
              type="text" 
              className="hero-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={currentStage.searchPlaceholder}
              style={{
                flex: 1,
                minWidth: 0,
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--color-text-primary)',
                fontSize: '14px',
                fontFamily: 'inherit',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}
            />
            <button 
              type="submit"
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                backgroundColor: '#F59E0B',
                backgroundImage: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
                color: '#0A0B0E',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
                boxShadow: '0 2px 10px rgba(245, 158, 11, 0.35)',
                transition: 'transform 0.15s'
              }}
            >
              <span><LocalizedText message={"Ask AI"} /></span>
              <SendHorizontal size={14} />
            </button>
          </form>

          {/* Production-Ready Action CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <Link 
              href="/signup"
              className="hero-btn-primary"
              style={{
                padding: '13px 26px',
                borderRadius: '12px',
                backgroundColor: '#F59E0B',
                backgroundImage: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #D97706 100%)',
                color: '#0A0B0E',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 18px rgba(245, 158, 11, 0.35)',
                letterSpacing: '0.01em'
              }}
            >
              <span><LocalizedText message={"Get Started Free"} /></span>
              <ArrowRight size={15} className="hero-btn-arrow" />
            </Link>

            <Link
              href={`/chat?prompt=${encodeURIComponent(currentStage.sampleQuery)}`}
              className="hero-btn-secondary"
              style={{
                background: 'var(--color-surface-glass)',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                borderRadius: '12px',
                padding: '13px 22px',
                color: 'var(--color-accent-gold)',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backdropFilter: 'blur(12px)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <Sparkles size={14} color="#F59E0B" className="hero-btn-sparkle" />
              <span><LocalizedText message={"Try Live Demo"} /></span>
            </Link>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Elevated Sovereign Gold Astrolabe & Constellation Stage ── */}
        <div className="hero-stage-right" style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '560px',
          width: '100%'
        }}>
          {/* ── Precision Celestial Astrolabe & Navigational Compass SVG ── */}
          <svg 
            viewBox="0 0 540 540" 
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              maxWidth: '540px',
              maxHeight: '540px',
              pointerEvents: 'none',
              zIndex: 1
            }}
          >
            <defs>
              <linearGradient id="goldRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#FBBF24" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#D97706" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="fadeGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#D97706" stopOpacity="0.95" />
              </linearGradient>

              {/* Jet Contrail Gradient */}
              <linearGradient id="planeContrailGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.95" />
                <stop offset="40%" stopColor="#F59E0B" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </linearGradient>

              {/* Gold Glow Filter */}
              <filter id="goldJetGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
              </filter>
            </defs>

            {/* 1. Outer Dual Precision Ring */}
            <circle cx="270" cy="270" r="236" stroke="var(--compass-ring-stroke, #F59E0B)" strokeWidth="1.25" fill="none" />
            <circle cx="270" cy="270" r="232" stroke="var(--compass-ring-inner, rgba(255, 255, 255, 0.1))" strokeWidth="0.85" strokeDasharray="4 6" fill="none" />

            {/* 2. Chronometer Degree Ticks (36 Radial Markers) */}
            <g transform="translate(270, 270)">
              {ticks.map((deg) => {
                const isMajor = deg % 30 === 0;
                const isCardinal = deg % 90 === 0;
                const y1 = isCardinal ? -236 : isMajor ? -234 : -232;
                const y2 = -226;
                return (
                  <g key={deg} transform={`rotate(${deg})`}>
                    <line 
                      x1="0" 
                      y1={y1} 
                      x2="0" 
                      y2={y2} 
                      stroke={isMajor ? "var(--compass-tick-major, #F59E0B)" : "var(--compass-tick-minor, rgba(245, 158, 11, 0.45))"} 
                      strokeWidth={isMajor ? "1.75" : "1"} 
                    />
                    {isMajor && !isCardinal && (
                      <circle cx="0" cy="-221" r="1.2" fill="var(--compass-tick-major, #F59E0B)" />
                    )}
                  </g>
                );
              })}
            </g>

            {/* 3. Mid Telemetry Circuit Ring */}
            <circle cx="270" cy="270" r="180" stroke="var(--compass-mid-circuit, rgba(245, 158, 11, 0.35))" strokeWidth="1.2" strokeDasharray="2 8" fill="none" />
            <circle cx="270" cy="270" r="145" stroke="var(--compass-ring-inner, rgba(255, 255, 255, 0.1))" strokeWidth="0.85" fill="none" />

            {/* 4. Luxury Supersonic Jet & Jetstream Contrail Orbiting Compass (Native GPU SVG Rotation) */}
            <g>
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 270 270"
                to="360 270 270"
                dur="20s"
                repeatCount="indefinite"
              />

              {/* Golden Jetstream Contrail Arc */}
              <path 
                d="M 270 34 A 236 236 0 0 0 118 89" 
                stroke="url(#planeContrailGrad)" 
                strokeWidth="2.5" 
                strokeDasharray="4 4"
                fill="none" 
              />

              {/* Supersonic Luxury Airplane at (270, 34) flying tangent clockwise */}
              <g transform="translate(270, 34) rotate(90)">
                {/* Engine Flame Glow */}
                <circle cx="0" cy="14" r="5" fill="rgba(245, 158, 11, 0.4)" filter="url(#goldJetGlow)" />
                
                {/* Airplane Body / Delta Wings / Stabilizers */}
                <path 
                  d="M 0 -14 L 4 -4 L 16 4 L 16 7 L 4 4 L 4 12 L 8 16 L 8 18 L 0 15 L -8 18 L -8 16 L -4 12 L -4 4 L -16 7 L -16 4 L -4 -4 Z" 
                  fill="#F59E0B" 
                  stroke="#FFFFFF" 
                  strokeWidth="0.8"
                />

                {/* Cockpit Canopy */}
                <ellipse cx="0" cy="-6" rx="1.5" ry="3" fill="#FFFFFF" />

                {/* Wingtip Navigation Strobe Beacons */}
                <circle cx="15" cy="5.5" r="1.8" fill="#10B981" />
                <circle cx="-15" cy="5.5" r="1.8" fill="#F43F5E" />

                {/* Afterburner Engine Core */}
                <circle cx="0" cy="14.5" r="2.2" fill="#FDE68A" />
              </g>
            </g>

            {/* 5. Cardinal Astrolabe Headers with Sovereign Coordinates */}
            {/* North (Dubai Latitude) */}
            <g transform="translate(270, 18)">
              <polygon points="0,-4 3,2 -3,2" fill="var(--color-accent-gold, #F59E0B)" />
              <text y="14" textAnchor="middle" fill="var(--compass-text-cardinal, #FDE68A)" fontSize="10" fontWeight="800" letterSpacing="0.12em"><LocalizedText message={"N • 25.2048°"} /></text>
            </g>

            {/* East (Dubai Longitude) */}
            <g transform="translate(515, 270)">
              <polygon points="4,0 -2,-3 -2,3" fill="var(--color-accent-gold, #F59E0B)" />
              <text x="-8" y="3" textAnchor="end" fill="var(--compass-text-cardinal, #FDE68A)" fontSize="10" fontWeight="800" letterSpacing="0.12em"><LocalizedText message={"E • 55.2708°"} /></text>
            </g>

            {/* South (Abu Dhabi Latitude) */}
            <g transform="translate(270, 526)">
              <polygon points="0,4 3,-2 -3,-2" fill="var(--color-accent-gold, #F59E0B)" />
              <text y="-8" textAnchor="middle" fill="var(--compass-text-sub, #CBD5E1)" fontSize="9" fontWeight="700" letterSpacing="0.1em"><LocalizedText message={"S • 24.4539°"} /></text>
            </g>

            {/* West (Abu Dhabi Longitude) */}
            <g transform="translate(25, 270)">
              <polygon points="-4,0 2,-3 2,3" fill="var(--color-accent-gold, #F59E0B)" />
              <text x="8" y="3" textAnchor="start" fill="var(--compass-text-sub, #CBD5E1)" fontSize="9" fontWeight="700" letterSpacing="0.1em"><LocalizedText message={"W • 54.3773°"} /></text>
            </g>

            {/* 6. Intercardinal Astrolabe Star Markers */}
            <text x="435" y="105" textAnchor="middle" fill="var(--compass-star-accent, rgba(245, 158, 11, 0.65))" fontSize="9" fontWeight="700"><LocalizedText message={"✦ NE 045°"} /></text>
            <text x="435" y="445" textAnchor="middle" fill="var(--compass-star-accent, rgba(245, 158, 11, 0.65))" fontSize="9" fontWeight="700"><LocalizedText message={"✦ SE 135°"} /></text>
            <text x="105" y="445" textAnchor="middle" fill="var(--compass-star-accent, rgba(245, 158, 11, 0.65))" fontSize="9" fontWeight="700"><LocalizedText message={"✦ SW 225°"} /></text>
            <text x="105" y="105" textAnchor="middle" fill="var(--compass-star-accent, rgba(245, 158, 11, 0.65))" fontSize="9" fontWeight="700"><LocalizedText message={"✦ NW 315°"} /></text>

            {/* 7. Quadrant Sovereign System Watermarks */}
            <text x="190" y="220" fill="var(--compass-text-watermark, var(--color-text-dim))" fontSize="8" fontWeight="800" letterSpacing="0.1em"><LocalizedText message={"[01] ASTROLABE_7E"} /></text>
            <text x="350" y="220" fill="var(--compass-text-watermark, var(--color-text-dim))" fontSize="8" fontWeight="800" letterSpacing="0.1em"><LocalizedText message={"[02] RAG_MATRIX"} /></text>
            <text x="190" y="330" fill="var(--compass-text-watermark, var(--color-text-dim))" fontSize="8" fontWeight="800" letterSpacing="0.1em"><LocalizedText message={"[03] LATENCY_1.2s"} /></text>
            <text x="350" y="330" fill="var(--compass-text-watermark, var(--color-text-dim))" fontSize="8" fontWeight="800" letterSpacing="0.1em"><LocalizedText message={"[04] SOVEREIGN_AI"} /></text>
          </svg>

          {/* Central Master Logo (Floating with Breathing Glow) */}
          <div style={{
            position: 'relative',
            zIndex: 6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'logoFloatingGlow 4.5s ease-in-out infinite'
          }}>
            <Localized element={"img"} attributes={["alt"]}
              src="/MasarAiLogo.png" 
              alt="Masar AI" 
              className="hero-logo-img"
              style={{ 
                height: '215px', 
                width: 'auto', 
                objectFit: 'contain'
              }} 
            />
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '12px',
              pointerEvents: 'none'
            }}>
              {/* Luxury Wing Divider + Metallic Wordmark */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{
                  width: '28px',
                  height: '1.5px',
                  background: 'linear-gradient(90deg, transparent, var(--color-accent-gold, #F59E0B))'
                }} />
                <span className="hero-logo-wordmark"><LocalizedText message={"MASAR AI"} /></span>
                <span style={{
                  width: '28px',
                  height: '1.5px',
                  background: 'linear-gradient(90deg, var(--color-accent-gold, #F59E0B), transparent)'
                }} />
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════
              PHASE 1: INBOUND TRAVEL (Theme-Aware Gold)
              ═══════════════════════════════════════════════════════════════════════════ */}
          <div style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: activeIdx === 0 ? 'auto' : 'none',
            opacity: activeIdx === 0 ? 1 : 0,
            transform: activeIdx === 0 ? 'scale(1) translateY(0px)' : 'scale(0.95) translateY(10px)',
            transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'opacity, transform',
            zIndex: activeIdx === 0 ? 10 : 0
          }}>
            {/* Soft-Fading Gold Laser Beams */}
            <svg viewBox="0 0 540 540" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <path d="M 355 190 Q 395 130 435 65" stroke="url(#fadeGoldGrad)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
              <path d="M 185 190 Q 145 130 95 75" stroke="url(#fadeGoldGrad)" strokeWidth="1.2" strokeDasharray="3 5" fill="none" />
              <path d="M 270 375 L 270 470" stroke="url(#fadeGoldGrad)" strokeWidth="1.2" strokeDasharray="3 5" fill="none" />
              <circle cx="435" cy="65" r="4" fill="#F59E0B" />
              <circle cx="95" cy="75" r="3.5" fill="#F59E0B" />
              <circle cx="270" cy="470" r="3.5" fill="#F59E0B" />
            </svg>

            {/* Position 1: Top-Right (Flight Inbound HUD Card) */}
            <div 
              className="hero-hud-card"
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                maxWidth: '250px',
                backgroundColor: 'var(--color-surface-glass)',
                border: '1px solid #F59E0B',
                borderRadius: '16px',
                padding: '12px 16px',
                boxShadow: 'var(--shadow-lg), 0 0 25px rgba(245, 158, 11, 0.25)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plane size={18} color="#F59E0B" style={{ transform: 'rotate(-45deg)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)' }}><LocalizedText message={"DXB-2026 Inbound"} /></span>
                </div>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(245, 158, 11, 0.18)', color: '#D97706', fontWeight: 700 }}><LocalizedText message={"VIP RADAR"} /></span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}><LocalizedText message={"Terminal 3 • Fast-Track Clearance"} /></div>
            </div>

            {/* Position 2: Top-Left (Chauffeur Meet & Greet) */}
            <div 
              className="hero-pill-node"
              style={{
                position: 'absolute',
                top: '25px',
                left: '10px',
                backgroundColor: 'var(--color-surface-glass)',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                borderRadius: '999px',
                padding: '10px 18px',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backdropFilter: 'blur(12px)'
              }}
            >
              <Car size={16} color="#F59E0B" />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}><LocalizedText message={"VIP Chauffeur"} /></div>
                <div style={{ fontSize: '10px', color: '#D97706', fontWeight: 600 }}><LocalizedText message={"Meet & Greet Gate 4"} /></div>
              </div>
            </div>

            {/* Position 3: Bottom-Center (Visa On Arrival Anchor) */}
            <div 
              className="hero-pill-node"
              style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'var(--color-surface-glass)',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                borderRadius: '999px',
                padding: '10px 22px',
                boxShadow: 'var(--shadow-md), 0 0 20px rgba(245, 158, 11, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backdropFilter: 'blur(12px)',
                whiteSpace: 'nowrap'
              }}
            >
              <CheckCircle2 size={16} color="#F59E0B" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}><LocalizedText message={"Visa on Arrival: "} /><span style={{ color: '#D97706' }}><LocalizedText message={"30 Days Auto-Verified"} /></span></span>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════
              PHASE 2: BESPOKE STAYS (Theme-Aware Gold)
              ═══════════════════════════════════════════════════════════════════════════ */}
          <div style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: activeIdx === 1 ? 'auto' : 'none',
            opacity: activeIdx === 1 ? 1 : 0,
            transform: activeIdx === 1 ? 'scale(1) translateY(0px)' : 'scale(0.95) translateY(10px)',
            transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'opacity, transform',
            zIndex: activeIdx === 1 ? 10 : 0
          }}>
            {/* Laser Beams Starting Strictly Outside Logo */}
            <svg viewBox="0 0 540 540" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <path d="M 270 130 L 270 65" stroke="url(#fadeGoldGrad)" strokeWidth="1.6" strokeDasharray="4 4" fill="none" />
              <path d="M 185 345 Q 130 385 80 430" stroke="url(#fadeGoldGrad)" strokeWidth="1.2" strokeDasharray="3 5" fill="none" />
              <path d="M 355 345 Q 410 385 460 430" stroke="url(#fadeGoldGrad)" strokeWidth="1.2" strokeDasharray="3 5" fill="none" />
              <circle cx="270" cy="65" r="4" fill="#F59E0B" />
              <circle cx="80" cy="430" r="3.5" fill="#F59E0B" />
              <circle cx="460" cy="430" r="3.5" fill="#F59E0B" />
            </svg>

            {/* Position 1: Top-Center / North (Taj Dubai Penthouse) */}
            <div 
              className="hero-hud-card"
              style={{
                position: 'absolute',
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'var(--color-surface-glass)',
                border: '1px solid #F59E0B',
                borderRadius: '16px',
                padding: '12px 20px',
                boxShadow: 'var(--shadow-lg), 0 0 25px rgba(245, 158, 11, 0.25)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                whiteSpace: 'nowrap'
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F59E0B'
              }}>
                <Hotel size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)' }}><LocalizedText message={"Taj Dubai Luxury Penthouse"} /></span>
                  <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 800, backgroundColor: 'rgba(16,185,129,0.15)', padding: '2px 6px', borderRadius: '4px' }}><LocalizedText message={"BURJ VIEW"} /></span>
                </div>
                <div style={{ fontSize: '11px', color: '#D97706', fontWeight: 700 }}><LocalizedText message={"850 AED / night • ★ 5.0 Star Rating"} /></div>
              </div>
            </div>

            {/* Position 2: Bottom-Left (Pre-Booking ID Lock) */}
            <div 
              className="hero-pill-node"
              style={{
                position: 'absolute',
                bottom: '50px',
                left: '10px',
                backgroundColor: 'var(--color-surface-glass)',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                borderRadius: '999px',
                padding: '10px 18px',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backdropFilter: 'blur(12px)'
              }}
            >
              <Lock size={16} color="#F59E0B" />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}><LocalizedText message={"Pre-Booking ID #7842"} /></div>
                <div style={{ fontSize: '10px', color: '#10B981', fontWeight: 600 }}><LocalizedText message={"Rate Lock Guaranteed"} /></div>
              </div>
            </div>

            {/* Position 3: Bottom-Right (Private Balcony) */}
            <div 
              className="hero-pill-node"
              style={{
                position: 'absolute',
                bottom: '50px',
                right: '10px',
                backgroundColor: 'var(--color-surface-glass)',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                borderRadius: '999px',
                padding: '10px 18px',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backdropFilter: 'blur(12px)'
              }}
            >
              <MapPin size={16} color="#F59E0B" />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}><LocalizedText message={"Private Balcony"} /></div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}><LocalizedText message={"Burj Khalifa Skyline"} /></div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════
              PHASE 3: VIP EVENTS (Theme-Aware Gold)
              ═══════════════════════════════════════════════════════════════════════════ */}
          <div style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: activeIdx === 2 ? 'auto' : 'none',
            opacity: activeIdx === 2 ? 1 : 0,
            transform: activeIdx === 2 ? 'scale(1) translateY(0px)' : 'scale(0.95) translateY(10px)',
            transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'opacity, transform',
            zIndex: activeIdx === 2 ? 10 : 0
          }}>
            {/* Beams Emerge from East/West/South Perimeter */}
            <svg viewBox="0 0 540 540" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <path d="M 355 190 Q 395 130 435 65" stroke="url(#fadeGoldGrad)" strokeWidth="1.6" strokeDasharray="4 4" fill="none" />
              <path d="M 185 190 Q 145 130 95 75" stroke="url(#fadeGoldGrad)" strokeWidth="1.4" strokeDasharray="3 5" fill="none" />
              <path d="M 270 375 L 270 470" stroke="url(#fadeGoldGrad)" strokeWidth="1.2" strokeDasharray="3 5" fill="none" />
              <circle cx="435" cy="65" r="4" fill="#F59E0B" />
              <circle cx="95" cy="75" r="3.5" fill="#F59E0B" />
              <circle cx="270" cy="470" r="3.5" fill="#F59E0B" />
            </svg>

            {/* Position 1: Top-Right (VIP Concert Pass Card) */}
            <div 
              className="hero-hud-card"
              style={{
                position: 'absolute',
                top: '15px',
                right: '10px',
                maxWidth: '260px',
                backgroundColor: 'var(--color-surface-glass)',
                border: '1px solid #F59E0B',
                borderRadius: '16px',
                padding: '12px 16px',
                boxShadow: 'var(--shadow-lg), 0 0 25px rgba(245, 158, 11, 0.25)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Ticket size={18} color="#F59E0B" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)' }}><LocalizedText message={"The Penthouse"} /></span>
                </div>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(245, 158, 11, 0.18)', color: '#D97706', fontWeight: 800 }}><LocalizedText message={"VIP PASS"} /></span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}><LocalizedText message={"Nick Morgan • Front Row Table"} /></div>
            </div>

            {/* Position 2: Top-Left (Ticketmaster Direct VIP Feed) */}
            <div 
              className="hero-pill-node"
              style={{
                position: 'absolute',
                top: '25px',
                left: '10px',
                backgroundColor: 'var(--color-surface-glass)',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                borderRadius: '999px',
                padding: '10px 18px',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backdropFilter: 'blur(12px)'
              }}
            >
              <Ticket size={16} color="#F59E0B" />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}><LocalizedText message={"Ticketmaster Live"} /></div>
                <div style={{ fontSize: '10px', color: '#D97706', fontWeight: 600 }}><LocalizedText message={"Direct VIP Feed"} /></div>
              </div>
            </div>

            {/* Position 3: Bottom-Center (Coca-Cola Arena & F1) */}
            <div 
              className="hero-pill-node"
              style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'var(--color-surface-glass)',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                borderRadius: '999px',
                padding: '10px 22px',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backdropFilter: 'blur(12px)',
                whiteSpace: 'nowrap'
              }}
            >
              <Calendar size={16} color="#F59E0B" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}><LocalizedText message={"Coca-Cola Arena & F1: "} /><span style={{ color: '#D97706' }}><LocalizedText message={"Lounge Holds Open"} /></span></span>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════
              PHASE 4: TRANSIT & METRO (Theme-Aware Gold)
              ═══════════════════════════════════════════════════════════════════════════ */}
          <div style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: activeIdx === 3 ? 'auto' : 'none',
            opacity: activeIdx === 3 ? 1 : 0,
            transform: activeIdx === 3 ? 'scale(1) translateY(0px)' : 'scale(0.95) translateY(10px)',
            transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'opacity, transform',
            zIndex: activeIdx === 3 ? 10 : 0
          }}>
            {/* Diagonal Gold Beams */}
            <svg viewBox="0 0 540 540" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <path d="M 185 190 Q 145 130 95 75" stroke="url(#fadeGoldGrad)" strokeWidth="1.6" strokeDasharray="4 4" fill="none" />
              <path d="M 355 190 Q 395 130 435 65" stroke="url(#fadeGoldGrad)" strokeWidth="1.2" strokeDasharray="3 5" fill="none" />
              <path d="M 270 375 L 270 470" stroke="url(#fadeGoldGrad)" strokeWidth="1.2" strokeDasharray="3 5" fill="none" />
              <circle cx="95" cy="75" r="4" fill="#F59E0B" />
              <circle cx="435" cy="65" r="3.5" fill="#F59E0B" />
              <circle cx="270" cy="470" r="3.5" fill="#F59E0B" />
            </svg>

            {/* Position 1: Top-Left (Dubai Metro Route HUD) */}
            <div 
              className="hero-hud-card"
              style={{
                position: 'absolute',
                top: '15px',
                left: '10px',
                maxWidth: '270px',
                backgroundColor: 'var(--color-surface-glass)',
                border: '1px solid #F59E0B',
                borderRadius: '16px',
                padding: '12px 16px',
                boxShadow: 'var(--shadow-lg), 0 0 25px rgba(245, 158, 11, 0.25)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Train size={18} color="#F59E0B" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)' }}><LocalizedText message={"Dubai Mall → Frame"} /></span>
                </div>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(245, 158, 11, 0.18)', color: '#D97706', fontWeight: 800 }}><LocalizedText message={"7.50 AED"} /></span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}><LocalizedText message={"Red Line • Max Station (15m)"} /></div>
            </div>

            {/* Position 2: Top-Right (Careem & Salik Tolls) */}
            <div 
              className="hero-pill-node"
              style={{
                position: 'absolute',
                top: '25px',
                right: '10px',
                backgroundColor: 'var(--color-surface-glass)',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                borderRadius: '999px',
                padding: '10px 18px',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backdropFilter: 'blur(12px)'
              }}
            >
              <Car size={16} color="#F59E0B" />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}><LocalizedText message={"Careem & Salik"} /></div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}><LocalizedText message={"Tolls Auto-Calculated"} /></div>
              </div>
            </div>

            {/* Position 3: Bottom-Center (45m Total Trip Duration) */}
            <div 
              className="hero-pill-node"
              style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'var(--color-surface-glass)',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                borderRadius: '999px',
                padding: '10px 22px',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backdropFilter: 'blur(12px)',
                whiteSpace: 'nowrap'
              }}
            >
              <Clock size={16} color="#F59E0B" />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}><LocalizedText message={"45 mins Total: "} /><span style={{ color: '#D97706' }}><LocalizedText message={"Nol Silver Card Sync"} /></span></div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════════
              PHASE 5: CULTURAL WISDOM (Theme-Aware Gold)
              ═══════════════════════════════════════════════════════════════════════════ */}
          <div style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: activeIdx === 4 ? 'auto' : 'none',
            opacity: activeIdx === 4 ? 1 : 0,
            transform: activeIdx === 4 ? 'scale(1) translateY(0px)' : 'scale(0.95) translateY(10px)',
            transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'opacity, transform',
            zIndex: activeIdx === 4 ? 10 : 0
          }}>
            {/* Beams Emanating Outward (Gold) */}
            <svg viewBox="0 0 540 540" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <path d="M 360 180 Q 400 125 440 75" stroke="url(#fadeGoldGrad)" strokeWidth="1.6" strokeDasharray="4 4" fill="none" />
              <path d="M 180 180 Q 140 125 100 75" stroke="url(#fadeGoldGrad)" strokeWidth="1.4" strokeDasharray="3 5" fill="none" />
              <path d="M 270 375 L 270 470" stroke="url(#fadeGoldGrad)" strokeWidth="1.2" strokeDasharray="3 5" fill="none" />
              <circle cx="440" cy="75" r="4" fill="#F59E0B" />
              <circle cx="100" cy="75" r="3.5" fill="#F59E0B" />
              <circle cx="270" cy="470" r="3.5" fill="#F59E0B" />
            </svg>

            {/* Position 1: Top-Right (Planet Tax Free Kiosk) */}
            <div 
              className="hero-hud-card"
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                maxWidth: '260px',
                backgroundColor: 'var(--color-surface-glass)',
                border: '1px solid #F59E0B',
                borderRadius: '16px',
                padding: '12px 16px',
                boxShadow: 'var(--shadow-lg), 0 0 25px rgba(245, 158, 11, 0.25)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} color="#F59E0B" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)' }}><LocalizedText message={"Tax Free Kiosk"} /></span>
                </div>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(245, 158, 11, 0.18)', color: '#D97706', fontWeight: 800 }}><LocalizedText message={"5% VAT"} /></span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}><LocalizedText message={"Airport Terminal Validation Ready"} /></div>
            </div>

            {/* Position 2: Top-Left (Mosque Protocol) */}
            <div 
              className="hero-pill-node"
              style={{
                position: 'absolute',
                top: '25px',
                left: '10px',
                backgroundColor: 'var(--color-surface-glass)',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                borderRadius: '999px',
                padding: '10px 18px',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backdropFilter: 'blur(12px)'
              }}
            >
              <Globe size={16} color="#F59E0B" />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}><LocalizedText message={"Mosque Protocol"} /></div>
                <div style={{ fontSize: '10px', color: '#D97706', fontWeight: 600 }}><LocalizedText message={"Modest Attire & Abayas"} /></div>
              </div>
            </div>

            {/* Position 3: Bottom-Center (7 Emirates Laws RAG) */}
            <div 
              className="hero-pill-node"
              style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'var(--color-surface-glass)',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                borderRadius: '999px',
                padding: '10px 22px',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backdropFilter: 'blur(12px)',
                whiteSpace: 'nowrap'
              }}
            >
              <Check size={16} color="#10B981" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}><LocalizedText message={"Sovereign RAG: "} /><span style={{ color: '#10B981' }}><LocalizedText message={"7 Emirates Laws Grounded"} /></span></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
