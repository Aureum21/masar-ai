'use client';

import { useAccessibility } from '@/context/AccessibilityContext';
import MapMotion from '@/components/ui/MapMotion';
import { LocalizedText } from '@/i18n/Localized';
import { useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, ExternalLink, Plane, ShoppingBag } from 'lucide-react';

// Fix for default marker icons in Leaflet + Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom luxury DivIcons with clear selected/unselected visual states
const createLocationIcon = (type, isSelected = false) => {
  const isAirport = type === 'airport';
  const color = isAirport ? '#10B981' : '#F59E0B';
  const size = isSelected ? 40 : 32;
  const symbol = isAirport ? '✈' : '🛍';

  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: #101318;
      border: 2px solid ${isSelected ? '#FFFFFF' : color};
      color: ${isSelected ? '#FFFFFF' : color};
      font-size: ${isSelected ? 18 : 14}px;
      box-shadow: ${isSelected 
        ? `0 0 24px ${color}, 0 4px 14px rgba(0,0,0,0.85)` 
        : `0 0 10px ${color}55, 0 2px 8px rgba(0,0,0,0.6)`};
      transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: pointer;
    ">
      <span>${symbol}</span>
    </div>
  `;

  return L.divIcon({
    className: 'receipt-custom-marker',
    html: html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4]
  });
};

// Keeps Leaflet container size synchronized on load and layout resize
function MapResizer() {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize({ pan: false });
    const t1 = setTimeout(() => map.invalidateSize({ pan: false }), 120);
    const t2 = setTimeout(() => map.invalidateSize({ pan: false }), 450);
    const t3 = setTimeout(() => map.invalidateSize({ pan: false }), 1000);

    const onResize = () => map.invalidateSize({ pan: false });
    window.addEventListener('resize', onResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', onResize);
    };
  }, [map]);

  return null;
}

// Controls camera movement and auto-opens popup when a place is selected
function MapCameraController({ selected, markerRefs }) {
  const map = useMap();
  const { reduced } = useAccessibility();

  useEffect(() => {
    if (selected && selected.lat && selected.lng) {
      if (reduced) {
        map.setView([selected.lat, selected.lng], 14, { animate: false });
      } else {
        map.flyTo([selected.lat, selected.lng], 14, {
          duration: 0.9,
          easeLinearity: 0.3
        });
      }

      // Auto-open marker popup if reference exists
      if (markerRefs.current[selected.id]) {
        setTimeout(() => {
          markerRefs.current[selected.id]?.openPopup();
        }, 350);
      }
    }
  }, [selected, map, reduced, markerRefs]);

  return null;
}

export default function ReceiptMap({ locations = [], selected, onSelect }) {
  const { reduced } = useAccessibility();
  const markerRefs = useRef({});

  const registerMarker = useCallback((id, marker) => {
    if (marker) markerRefs.current[id] = marker;
    else delete markerRefs.current[id];
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '420px', background: '#090A0D' }}>
      <MapContainer
        key={reduced ? 'reduced' : 'full'}
        zoomAnimation={!reduced}
        fadeAnimation={!reduced}
        markerZoomAnimation={!reduced}
        center={[24.95, 54.95]}
        zoom={8}
        zoomControl={false}
        style={{ width: '100%', height: '100%', background: '#090A0D' }}
        className={!process.env.NEXT_PUBLIC_CARTO_API_KEY ? 'luxury-dark-map' : ''}
      >
        <MapResizer />
        <ZoomControl position="bottomright" />
        <MapMotion />
        <MapCameraController selected={selected} markerRefs={markerRefs} />

        {/* Reliable dark tile layers: uses CARTO with API key if available, otherwise Esri luxury canvas */}
        {process.env.NEXT_PUBLIC_CARTO_API_KEY ? (
          <TileLayer
            url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${process.env.NEXT_PUBLIC_CARTO_API_KEY}`}
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            maxZoom={19}
            keepBuffer={6}
            updateWhenIdle={false}
            updateWhenZooming={true}
          />
        ) : (
          <>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{x}/{y}"
              attribution='&copy; Esri, HERE, Garmin, (c) OpenStreetMap contributors'
              maxZoom={19}
              maxNativeZoom={16}
              keepBuffer={6}
              updateWhenIdle={false}
              updateWhenZooming={true}
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; Esri'
              maxZoom={19}
              maxNativeZoom={16}
              keepBuffer={6}
              updateWhenIdle={false}
              updateWhenZooming={true}
            />
          </>
        )}

        {/* Location Markers */}
        {locations.map((item) => {
          const isSelected = selected?.id === item.id;
          return (
            <Marker
              key={item.id}
              position={[item.lat, item.lng]}
              icon={createLocationIcon(item.type, isSelected)}
              ref={(ref) => registerMarker(item.id, ref)}
              eventHandlers={{
                click: () => onSelect && onSelect(item)
              }}
            >
              <Popup className="receipt-map-popup">
                <div style={{
                  padding: '12px 14px',
                  minWidth: '220px',
                  maxWidth: '280px',
                  background: '#12151B',
                  borderRadius: '12px',
                  color: '#FFFFFF'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    {item.type === 'airport' ? (
                      <Plane size={16} color="#10B981" />
                    ) : (
                      <ShoppingBag size={16} color="#F59E0B" />
                    )}
                    <strong style={{ fontSize: '13.5px', color: '#F1F5F9', fontWeight: 700 }}>
                      {item.name}
                    </strong>
                  </div>

                  <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} color="#CBD5E1" />
                    <span>{item.area}</span>
                  </p>

                  <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#A0ABBA', lineHeight: 1.5 }}>
                    <LocalizedText>
                      {item.type === 'airport'
                        ? 'Planet validation kiosks available at departure terminals. Validate tags before check-in.'
                        : 'Participating shopping mall. Confirm tax-free tags with individual merchants.'}
                    </LocalizedText>
                  </p>

                  {item.directionsUrl && (
                    <a
                      href={item.directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#F59E0B',
                        textDecoration: 'none'
                      }}
                    >
                      <Navigation size={12} />
                      <LocalizedText message="Get directions" />
                      <ExternalLink size={10} style={{ marginLeft: '2px' }} />
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Global popup and marker reset styles */}
      <style jsx global>{`
        .receipt-custom-marker {
          background: transparent !important;
          border: none !important;
        }
        .receipt-map-popup .leaflet-popup-content-wrapper {
          background: #12151B !important;
          color: #FFFFFF !important;
          border: 1px solid rgba(245, 158, 11, 0.25) !important;
          border-radius: 14px !important;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.75) !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        .receipt-map-popup .leaflet-popup-content {
          margin: 0 !important;
          line-height: inherit !important;
        }
        .receipt-map-popup .leaflet-popup-tip {
          background: #12151B !important;
          border: 1px solid rgba(245, 158, 11, 0.25) !important;
        }
        .receipt-map-popup a.leaflet-popup-close-button {
          color: #94A3B8 !important;
          padding: 6px !important;
        }
        .receipt-map-popup a.leaflet-popup-close-button:hover {
          color: #FFFFFF !important;
        }
      `}</style>
    </div>
  );
}
