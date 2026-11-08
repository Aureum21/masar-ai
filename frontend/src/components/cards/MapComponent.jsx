'use client';
import {useAccessibility} from '@/context/AccessibilityContext';
import MapMotion from '@/components/ui/MapMotion';
import {LocalizedText} from '@/i18n/Localized';


import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import { MapPin } from 'lucide-react';

// Fix for default marker icons in Leaflet + Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper to create custom div icons for markers
const createCustomIcon = (IconComp, color, number) => {
  const iconHtml = renderToString(
    <div style={{
      width: '36px',
      height: '36px',
      backgroundColor: '#14161C',
      border: `2px solid ${color}`,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: color,
      boxShadow: `0 0 15px ${color}60`,
      position: 'relative'
    }}>
      <IconComp size={18} strokeWidth={2.5} />
      <div style={{
        position: 'absolute',
        top: '-6px',
        right: '-6px',
        backgroundColor: color,
        color: '#0A0B0E',
        borderRadius: '50%',
        width: '18px',
        height: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '11px',
        fontWeight: 'bold',
        border: '2px solid #14161C'
      }}>
        {number}
      </div>
    </div>
  );

  return L.divIcon({
    html: iconHtml,
    className: 'custom-leaflet-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

function ChangeView({ bounds }) {
  const map = useMap();
  const {reduced}=useAccessibility();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      const leafletBounds = L.latLngBounds(bounds);
      map.fitBounds(leafletBounds, { padding: [50, 50], maxZoom: 15, animate:!reduced });
    }
  }, [bounds, map, reduced]);
  return null;
}

function RoutedPolyline({ waypoints, color }) {
  const [routeCoords, setRouteCoords] = useState(null);

  useEffect(() => {
    if (!waypoints || waypoints.length < 2) return;
    
    // OSRM requires lng,lat
    const coordString = waypoints.map(p => `${p[1]},${p[0]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.routes && data.routes.length > 0) {
          // GeoJSON returns [lng, lat], Leaflet wants [lat, lng]
          const mapped = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setRouteCoords(mapped);
        }
      })
      .catch(err => {
        console.error("OSRM Routing error:", err);
      });
  }, [waypoints]);

  // Fallback to straight line while loading or on error
  const displayCoords = routeCoords || waypoints;

  return (
    <Polyline 
      positions={displayCoords} 
      color={color || "#F59E0B"} 
      weight={4} 
      opacity={0.8} 
      dashArray={routeCoords ? "none" : "8, 8"} 
    />
  );
}

export default function MapComponent({ days, getActivityIcon }) {
  const {reduced}=useAccessibility();
  // Extract all activities with valid coordinates
  const markers = [];
  const polylines = [];
  const bounds = [];
  
  let globalIndex = 1;

  days.forEach((day, dIdx) => {
    const dayActivities = Array.isArray(day.activities) ? day.activities : [];
    const dayCoords = [];

    dayActivities.forEach((act) => {
      // Default to Dubai center if LLM failed to provide coords, with slight jitter
      const lat = parseFloat(act.lat) || 25.2048 + (Math.random() * 0.05 - 0.025);
      const lng = parseFloat(act.lng) || 55.2708 + (Math.random() * 0.05 - 0.025);
      
      const coord = [lat, lng];
      dayCoords.push(coord);
      bounds.push(coord);

      markers.push({
        ...act,
        coord,
        dayNum: day.day_number || dIdx + 1,
        dayTheme: day.theme,
        number: globalIndex++
      });
    });

    if (dayCoords.length > 1) {
      polylines.push(dayCoords);
    }
  });

  const center = bounds.length > 0 ? bounds[0] : [25.2048, 55.2708];

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: '16px', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
      <MapContainer key={reduced?'reduced':'full'} zoomAnimation={!reduced} fadeAnimation={!reduced} markerZoomAnimation={!reduced}
        center={center} 
        zoom={11} 
        style={{ height: '100%', width: '100%', backgroundColor: '#0E1015' }}
        zoomControl={false}
        className={!process.env.NEXT_PUBLIC_CARTO_API_KEY ? "luxury-dark-map" : ""}
      >
        {/* Tiles: uses CARTO if API key is provided, otherwise native luxury dark Esri Canvas */}
        {process.env.NEXT_PUBLIC_CARTO_API_KEY ? (
          <TileLayer
            url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${process.env.NEXT_PUBLIC_CARTO_API_KEY}`}
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            maxZoom={19}
          />
        ) : (
          <>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; Esri, HERE, Garmin, (c) OpenStreetMap contributors'
              maxZoom={19}
              maxNativeZoom={16}
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; Esri'
              maxZoom={19}
              maxNativeZoom={16}
            />
          </>
        )}
        
        {polylines.map((line, i) => (
          <RoutedPolyline 
            key={i} 
            waypoints={line} 
            color="#F59E0B" 
          />
        ))}

        {markers.map((act, i) => (
          <Marker 
            key={i} 
            position={act.coord}
            icon={createCustomIcon(getActivityIcon ? getActivityIcon(act.title || act.name) : MapPin, '#F59E0B', act.number)}
          >
            <Tooltip 
              direction="top"
              offset={[0, -20]}
              className="custom-tooltip"
              opacity={1}
            >
              <div style={{ padding: '2px', minWidth: '150px' }}>
                <div style={{ fontSize: '10px', color: '#F59E0B', fontWeight: 800, marginBottom: '2px', textTransform: 'uppercase' }}><LocalizedText message={"Day ⟦0⟧ • ⟦1⟧"} values={[act.dayNum,act.time]} /></div>
                <h4 style={{ margin: 0, color: '#0A0B0E', fontSize: '13px', fontWeight: 'bold' }}>
                  {act.title}
                </h4>
              </div>
            </Tooltip>
          </Marker>
        ))}

        <MapMotion/>{bounds.length > 0 && <ChangeView bounds={bounds} />}
      </MapContainer>

      {/* Global styles for leaflet popup overrides */}
      <style jsx global>{`
        .leaflet-popup-content-wrapper, .custom-tooltip {
          background-color: #FFFFFF !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important;
          border: none !important;
        }
        .leaflet-popup-tip, .leaflet-tooltip-top:before {
          border-top-color: #FFFFFF !important;
        }
        .leaflet-container {
          font-family: inherit;
        }
        .custom-leaflet-icon {
          background: transparent;
          border: none;
        }
      `}</style>
    </div>
  );
}
