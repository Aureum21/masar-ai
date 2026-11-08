'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { RotateCw } from 'lucide-react';
import styles from './daily-promotion.module.css';

export const DEFAULT_WHEEL_SECTORS = [
  {
    slot: 0,
    template_id: 'game:sikka-run',
    title: 'Secret Sikka Run',
    short_label: 'Sikka Run',
    kind: 'game',
    color1: '#B45309',
    color2: '#78350F',
    accent: '#F0B95F',
    emirate: 'Dubai'
  },
  {
    slot: 1,
    template_id: 'venue:boxing-al-quoz',
    title: 'Al Quoz Boxing Ring',
    short_label: 'Boxing Ring',
    kind: 'venue',
    color1: '#991B1B',
    color2: '#7F1D1D',
    accent: '#F87171',
    emirate: 'Dubai'
  },
  {
    slot: 2,
    template_id: 'game:landmark-puzzle',
    title: 'Piece by place',
    short_label: 'Landmark Jigsaw',
    kind: 'game',
    color1: '#1E40AF',
    color2: '#1E3A8A',
    accent: '#60A5FA',
    emirate: 'Dubai'
  },
  {
    slot: 3,
    template_id: 'venue:dubai-bowling',
    title: 'Al Quoz Bowling Challenge',
    short_label: 'Bowling Frame',
    kind: 'venue',
    color1: '#047857',
    color2: '#064E3B',
    accent: '#34D399',
    emirate: 'Dubai'
  },
  {
    slot: 4,
    template_id: 'venue:sunset-kite-beach',
    title: 'Kite Beach Sunset Watch',
    short_label: 'Coastal Sunset',
    kind: 'venue',
    color1: '#C2410C',
    color2: '#7C2D12',
    accent: '#FB923C',
    emirate: 'Dubai'
  },
  {
    slot: 5,
    template_id: 'game:ball-roll',
    title: 'Golden Roll',
    short_label: 'Golden Roll',
    kind: 'game',
    color1: '#065F46',
    color2: '#064E3B',
    accent: '#10B981',
    emirate: 'Dubai'
  },
  {
    slot: 6,
    template_id: 'venue:al-fahidi-heritage',
    title: 'Al Fahidi Wind Towers',
    short_label: 'Wind Towers',
    kind: 'venue',
    color1: '#4338CA',
    color2: '#312E81',
    accent: '#818CF8',
    emirate: 'Dubai'
  }
];

function getSectorLines(sector) {
  const text = (sector.short_label || sector.title || '').trim();
  if (!text) return ['Challenge'];
  const words = text.split(/\s+/);
  if (words.length === 2) {
    return [words[0], words[1]];
  }
  if (words.length > 2) {
    const half = Math.ceil(words.length / 2);
    return [words.slice(0, half).join(' '), words.slice(half).join(' ')];
  }
  return [text];
}

function SectorGlyph({ templateId, kind, accent = '#F0B95F' }) {
  if (templateId === 'game:sikka-run') {
    return (
      <g transform="translate(189, 54)">
        <path
          d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
          fill="rgba(240, 185, 95, 0.4)"
          stroke={accent}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  }
  if (templateId === 'venue:boxing-al-quoz') {
    return (
      <g transform="translate(189, 54)">
        <path
          d="M6 9a4 4 0 0 1 8 0v2h2a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3H8a4 4 0 0 1-4-4V9a4 4 0 0 1 2-3.46"
          fill="rgba(248, 113, 113, 0.35)"
          stroke={accent}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M8 19v3m6-3v3" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    );
  }
  if (templateId === 'game:landmark-puzzle') {
    return (
      <g transform="translate(189, 54)">
        <path
          d="M19.4 7.85c-.05-.95-.24-1.9-.6-2.8a2 2 0 0 0-2-2c-.9.36-1.85.55-2.8.6a4 4 0 0 1-7.9 0c-.95-.05-1.9-.24-2.8-.6a2 2 0 0 0-2 2c.36.9.55 1.85.6 2.8a4 4 0 0 1 0 7.9c-.05.95-.24 1.9-.6 2.8a2 2 0 0 0 2 2c.9-.36 1.85-.55 2.8-.6a4 4 0 0 1 7.9 0c.95.05 1.9.24 2.8.6a2 2 0 0 0 2-2c-.36-.9-.55-1.85-.6-2.8a4 4 0 0 1 0-7.9Z"
          fill="rgba(96, 165, 250, 0.35)"
          stroke={accent}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  }
  if (templateId === 'venue:dubai-bowling') {
    return (
      <g transform="translate(189, 54)">
        <circle cx="11" cy="11" r="9" fill="rgba(52, 211, 153, 0.3)" stroke={accent} strokeWidth="1.8" />
        <circle cx="8.5" cy="8.5" r="1.3" fill={accent} />
        <circle cx="13.5" cy="8.5" r="1.3" fill={accent} />
        <circle cx="11" cy="13" r="1.3" fill={accent} />
      </g>
    );
  }
  if (templateId === 'game:tourist-arcade') {
    return (
      <g transform="translate(189, 54)">
        <circle cx="11" cy="11" r="9" stroke={accent} strokeWidth="1.8" />
        <polygon points="11 4 13.5 11 11 18 8.5 11" fill="rgba(251, 191, 36, 0.45)" stroke={accent} strokeWidth="1.2" />
        <polygon points="4 11 11 13.5 18 11 11 8.5" fill="rgba(251, 191, 36, 0.25)" stroke={accent} strokeWidth="1.2" />
      </g>
    );
  }
  if (templateId === 'venue:sunset-kite-beach') {
    return (
      <g transform="translate(189, 54)">
        <path d="M11 3v2.5m-5.5 2.5l1.5 1.5M16 8l-1.5 1.5" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M16 15a5 5 0 0 0-10 0" fill="rgba(251, 146, 60, 0.4)" stroke={accent} strokeWidth="1.8" />
        <path d="M2 15h18M3 18.5h16" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    );
  }
  if (templateId === 'game:ball-roll') {
    return (
      <g transform="translate(189, 54)">
        <circle cx="11" cy="11" r="9" fill="rgba(16, 185, 129, 0.35)" stroke={accent} strokeWidth="1.8" />
        <ellipse cx="11" cy="11" rx="4" ry="9" stroke={accent} strokeWidth="1.5" />
        <path d="M2 11h18" stroke={accent} strokeWidth="1.5" />
      </g>
    );
  }
  if (templateId === 'venue:al-fahidi-heritage') {
    return (
      <g transform="translate(189, 54)">
        <path d="M3 20V7l4-3 4 3 4-3 4 3v13" fill="rgba(129, 140, 248, 0.35)" stroke={accent} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8 10v3m6-3v3M9 20v-4a2 2 0 0 1 4 0v4" stroke={accent} strokeWidth="1.6" />
      </g>
    );
  }
  if (kind === 'game') {
    return (
      <g transform="translate(189, 54)">
        <rect x="2" y="5" width="18" height="12" rx="3" fill="rgba(240, 185, 95, 0.25)" stroke={accent} strokeWidth="1.8" />
        <path d="M6 11h4m-2-2v4m7-2h.01m3 0h.01" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g transform="translate(189, 54)">
      <path d="M11 2a6 6 0 0 0-6 6c0 4.5 6 11.5 6 11.5s6-7 6-11.5a6 6 0 0 0-6-6z" fill="rgba(240, 185, 95, 0.25)" stroke={accent} strokeWidth="1.8" />
      <circle cx="11" cy="8" r="2.2" stroke={accent} strokeWidth="1.5" />
    </g>
  );
}

export default function DailyPromotionWheel({
  sectors = [],
  targetSlot = null,
  isSpinning = false,
  disabled = false,
  loading = false,
  onRotate,
  onSpinComplete,
  reducedMotion = false,
  spinDurationMs = 3600
}) {
  const [rotation, setRotation] = useState(0);
  const [pointerBounce, setPointerBounce] = useState(false);
  const animTimeoutRef = useRef(null);
  const intervalRef = useRef(null);
  const rotationRef = useRef(0);
  const completeRef = useRef(onSpinComplete);
  useEffect(() => { completeRef.current = onSpinComplete; }, [onSpinComplete]);

  // Fall back to default sectors if pool is not yet loaded from server
  const activeSectors = Array.isArray(sectors) && sectors.length > 0 ? sectors : DEFAULT_WHEEL_SECTORS;

  // SVG Geometry
  const cx = 200;
  const cy = 200;
  const R = 182;
  const r = 44;
  const numSectors = Math.max(1, activeSectors.length);
  const step = 360 / numSectors;

  const selectedIndex = activeSectors.findIndex(sector => sector.slot === targetSlot);

  // Compute sector paths
  const sectorPaths = activeSectors.map((_, i) => {
    const a1 = ((i * step - step / 2) * Math.PI) / 180;
    const a2 = ((i * step + step / 2) * Math.PI) / 180;

    const x1_outer = cx + R * Math.sin(a1);
    const y1_outer = cy - R * Math.cos(a1);
    const x2_outer = cx + R * Math.sin(a2);
    const y2_outer = cy - R * Math.cos(a2);

    const x1_inner = cx + r * Math.sin(a1);
    const y1_inner = cy - r * Math.cos(a1);
    const x2_inner = cx + r * Math.sin(a2);
    const y2_inner = cy - r * Math.cos(a2);

    return `M ${x1_inner.toFixed(2)} ${y1_inner.toFixed(2)} L ${x1_outer.toFixed(2)} ${y1_outer.toFixed(2)} A ${R} ${R} 0 0 1 ${x2_outer.toFixed(2)} ${y2_outer.toFixed(2)} L ${x2_inner.toFixed(2)} ${y2_inner.toFixed(2)} A ${r} ${r} 0 0 0 ${x1_inner.toFixed(2)} ${y1_inner.toFixed(2)} Z`;
  });

  useEffect(() => {
    if (!isSpinning || targetSlot == null) return;
    const slot = selectedIndex;
    if (slot < 0) return;
    const landingAngle = (360 - slot * step) % 360;
    const nextTarget = Math.ceil(rotationRef.current / 360) * 360 + 1800 + landingAngle;
    const raf = requestAnimationFrame(() => {
      rotationRef.current = nextTarget;
      setRotation(nextTarget);
    });
    if (reducedMotion) {
      animTimeoutRef.current = setTimeout(() => completeRef.current?.(targetSlot), 450);
    } else {
      intervalRef.current = setInterval(() => setPointerBounce(prev => !prev), 160);
      animTimeoutRef.current = setTimeout(() => {
        clearInterval(intervalRef.current);
        setPointerBounce(false);
        // Keep the selected sector under the pointer briefly before revealing.
        animTimeoutRef.current = setTimeout(() => completeRef.current?.(targetSlot), 450);
      }, spinDurationMs);
    }
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(animTimeoutRef.current);
      clearInterval(intervalRef.current);
    };
  }, [isSpinning, targetSlot, reducedMotion, step, spinDurationMs, selectedIndex]);

  useEffect(() => {
    return () => {
      clearTimeout(animTimeoutRef.current);
      clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className={styles.wheelFrame}>
        {/* Top Pointer Needle */}
        <div className={`${styles.wheelPointer} ${pointerBounce ? styles.wheelPointerTick : ''}`}>
          <svg width="42" height="52" viewBox="0 0 42 52" fill="none">
            <path
              d="M21 50L8 18C5 12 9 4 16 4H26C33 4 37 12 34 18L21 50Z"
              fill="url(#needleGrad)"
              stroke="#F0B95F"
              strokeWidth="2.5"
            />
            <circle cx="21" cy="14" r="6" fill="#0A0B0E" stroke="#F0B95F" strokeWidth="2" />
            <defs>
              <linearGradient id="needleGrad" x1="21" y1="4" x2="21" y2="50" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F5D061" />
                <stop offset="0.6" stopColor="#D97706" />
                <stop offset="1" stopColor="#92400E" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Wheel Rotator */}
        <div
          className={styles.wheelRotator}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning && !reducedMotion ? `transform ${spinDurationMs / 1000}s cubic-bezier(0.12, 0.8, 0.32, 1)` : 'none'
          }}
        >
          <svg
            className={styles.wheelSvg}
            viewBox="0 0 400 400"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {activeSectors.map((s, i) => (
                <linearGradient
                  key={`grad-${i}`}
                  id={`secGrad-${i}`}
                  x1="200"
                  y1="40"
                  x2="200"
                  y2="200"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor={s.color1 || '#B45309'} />
                  <stop offset="1" stopColor={s.color2 || '#78350F'} />
                </linearGradient>
              ))}
            </defs>

            {/* Outer Rim */}
            <circle cx="200" cy="200" r="196" fill="#08090C" stroke="#F0B95F" strokeWidth="3" />
            <circle cx="200" cy="200" r="184" fill="#0E1117" stroke="rgba(240, 185, 95, 0.25)" strokeWidth="1" />

            {/* Sector Slices */}
            {activeSectors.map((sector, i) => (
              <g key={`sec-${i}`}>
                <path
                  d={sectorPaths[i]}
                  fill={`url(#secGrad-${i})`}
                  stroke="rgba(240, 185, 95, 0.45)"
                  strokeWidth="1.5"
                />
              </g>
            ))}

            {/* Sector Labels & Icons (rotated into position) */}
            {activeSectors.map((sector, i) => {
              const secAngle = i * step;
              const lines = getSectorLines(sector);
              return (
                <g key={`lbl-${i}`} transform={`rotate(${secAngle} 200 200)`}>
                  {/* Vector Icon */}
                  <SectorGlyph
                    templateId={sector.template_id}
                    kind={sector.kind}
                    accent={sector.accent || '#F0B95F'}
                  />

                  {/* Sector Title with Smart Line Switching */}
                  {lines.length === 1 ? (
                    <text
                      x="200"
                      y="98"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#FFFFFF"
                      fontWeight="850"
                      fontSize="11"
                      letterSpacing="0.2px"
                      filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.95))"
                    >
                      {lines[0]}
                    </text>
                  ) : (
                    <text
                      x="200"
                      y="91"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#FFFFFF"
                      fontWeight="850"
                      fontSize="10.5"
                      letterSpacing="0.2px"
                      filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.95))"
                    >
                      <tspan x="200" dy="0">{lines[0]}</tspan>
                      <tspan x="200" dy="13">{lines[1]}</tspan>
                    </text>
                  )}

                  {/* Kind Badge */}
                  <text
                    x="200"
                    y="123"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={sector.accent || '#F0B95F'}
                    fontWeight="800"
                    fontSize="8.5"
                    letterSpacing="0.5px"
                    filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.95))"
                  >
                    {sector.kind === 'game' ? '◆ GAME ◆' : '◆ VENUE ◆'}
                  </text>
                </g>
              );
            })}

            {/* Outer Rim Studs */}
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = ((i * 15) * Math.PI) / 180;
              const studX = cx + 190 * Math.sin(angle);
              const studY = cy - 190 * Math.cos(angle);
              return (
                <circle
                  key={`stud-${i}`}
                  cx={studX}
                  cy={studY}
                  r={i % 3 === 0 ? '3.5' : '2'}
                  fill={i % 3 === 0 ? '#FFFFFF' : '#F0B95F'}
                  filter="drop-shadow(0px 0px 3px rgba(240,185,95,0.8))"
                />
              );
            })}

            {/* Center Hub Base in SVG */}
            <circle cx="200" cy="200" r="44" fill="#0A0B0E" stroke="#F0B95F" strokeWidth="3" />
            <circle cx="200" cy="200" r="38" fill="url(#needleGrad)" opacity="0.3" />
            <circle cx="200" cy="200" r="35" fill="#111419" stroke="rgba(240, 185, 95, 0.45)" strokeWidth="1.5" />
            <clipPath id="centerHubClip">
              <circle cx="200" cy="200" r="31" />
            </clipPath>
            <image
              href="/MasarAiLogo.png"
              x="170"
              y="170"
              width="60"
              height="60"
              preserveAspectRatio="xMidYMid meet"
              clipPath="url(#centerHubClip)"
            />
          </svg>
        </div>

        {/* Stationary Axle Center Hub with Masar AI Logo (always upright) */}
        <div className={styles.wheelCenterHub} aria-hidden="true">
          <div className={styles.wheelCenterInner}>
            <Image
              src="/MasarAiLogo.png"
              alt="Masar AI"
              width={56}
              height={56}
              priority
              className={styles.wheelCenterLogoImg}
            />
          </div>
        </div>
      </div>

      {/* Action Button */}
      {onRotate && (
        <button
          type="button"
          onClick={onRotate}
          disabled={isSpinning || disabled}
          className={styles.wheelRotateBtn}
        >
          <RotateCw size={18} className={isSpinning ? 'spin-animation' : ''} />
          <span>
            {isSpinning
              ? 'Drawing Today’s Challenge…'
              : loading
              ? 'Preparing your daily draw…'
              : 'Rotate Wheel'}
          </span>
        </button>
      )}
    </div>
  );
}
