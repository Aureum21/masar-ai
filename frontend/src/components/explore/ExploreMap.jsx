'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';


import dynamic from 'next/dynamic';
import { memo, useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
 
  Maximize2, 
  Minimize2,
  MapPin
} from 'lucide-react';

const ExploreMapInner = dynamic(
  () => import('./ExploreMapInner'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#090A0D',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        color: '#94A3B8'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '2px solid rgba(245, 158, 11, 0.2)',
          borderTopColor: '#F59E0B',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#CBD5E1' }}><LocalizedText message={"Loading interactive UAE map..."} /></span>
      </div>
    )
  }
);

const QUICK_NEIGHBORHOODS = [
  { label: 'Downtown', center: [25.1972, 55.2744], zoom: 14 },
  { label: 'Palm Jumeirah', center: [25.1124, 55.1390], zoom: 13 },
  { label: 'Saadiyat Island', center: [24.5367, 54.4183], zoom: 13 },
  { label: 'Al Fahidi Creek', center: [25.2636, 55.2972], zoom: 14 },
  { label: 'Liwa Dunes', center: [22.9004, 54.3414], zoom: 10 },
  { label: 'Jebel Jais', center: [25.9525, 56.1415], zoom: 12 }
];

export default memo(function ExploreMap({
  places = [],
  center,
  zoom,
  selectedPlace,
  hoveredPlace,
  onSelectPlace,
  onPlanTrip,
  planLabel = 'Plan with Masar AI',
  isCollapsed = false,
  onToggleCollapse,
  onQuickJump
}) {
  const [activePill, setActivePill] = useState(null);

  const handlePillClick = (item) => {
    setActivePill(item.label);
    if (onQuickJump) {
      onQuickJump(item.center, item.zoom);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* ── Inner Leaflet Map ── */}
      <ExploreMapInner
        places={places}
        center={center}
        zoom={zoom}
        selectedPlace={selectedPlace}
        hoveredPlace={hoveredPlace}
        onSelectPlace={onSelectPlace}
        onPlanTrip={onPlanTrip}
        planLabel={planLabel}
      />

      {/* ── Floating Collapse / Expand Button (Image 2 style) ── */}
      {onToggleCollapse && (
        <Localized element={"button"} attributes={["title"]}
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Show Discovery Feed' : 'Expand Full Map'}
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            zIndex: 1000,
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            backgroundColor: 'rgba(18, 20, 26, 0.88)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#F59E0B';
            e.currentTarget.style.color = '#FBBF24';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.color = '#FFFFFF';
          }}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </Localized>
      )}

      {/* Optional quick jumps, shown only when a consumer enables them. */}
      {onQuickJump&&<div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        left: onToggleCollapse ? '64px' : '16px',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '4px',
        scrollbarWidth: 'none'
      }}>
        {QUICK_NEIGHBORHOODS.map((item) => {
          const isActive = activePill === item.label;
          return (
            <button
              key={item.label}
              onClick={() => handlePillClick(item)}
              style={{
                padding: '6px 12px',
                borderRadius: '9999px',
                backgroundColor: isActive ? '#F59E0B' : 'rgba(14, 16, 21, 0.85)',
                backdropFilter: 'blur(12px)',
                border: isActive ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.12)',
                color: isActive ? '#0A0B0E' : '#CBD5E1',
                fontSize: '11px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(28, 32, 40, 0.95)';
                  e.currentTarget.style.color = '#FFFFFF';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(14, 16, 21, 0.85)';
                  e.currentTarget.style.color = '#CBD5E1';
                }
              }}
            >
              <LocalizedText>{item.label}</LocalizedText>
            </button>
          );
        })}
      </div>}
    </div>
  );
});
