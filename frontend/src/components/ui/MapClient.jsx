'use client';
import {useAccessibility} from '@/context/AccessibilityContext';
import MapMotion from '@/components/ui/MapMotion';

import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import L from 'leaflet';

// Create a modern custom divIcon
const createModernIcon = () => {
  return L.divIcon({
    className: 'custom-modern-marker',
    html: `
      <div style="
        background-color: #F59E0B;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid #FFFFFF;
        box-shadow: 0 0 10px rgba(245, 158, 11, 0.8);
      "></div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

function ChangeView({ center, zoom }) {
  const map = useMap();
  const {reduced}=useAccessibility();
  useEffect(() => {
    map.setView(center, zoom,{animate:!reduced});
  }, [center, zoom, map,reduced]);
  return null;
}

export default function MapClient({ 
  center = [24.4539, 54.3773], // Default Abu Dhabi
  zoom = 12,
  markers = [] 
}) {
  const {reduced}=useAccessibility();
  return (
    <MapContainer key={reduced?'reduced':'full'} zoomAnimation={!reduced} fadeAnimation={!reduced} markerZoomAnimation={!reduced}
      center={center} 
      zoom={zoom} 
      style={{ height: '100%', width: '100%', background: '#0C0C0E' }}
      zoomControl={false}
      className={!process.env.NEXT_PUBLIC_CARTO_API_KEY ? "luxury-dark-map" : ""}
    >
      <MapMotion/><ChangeView center={center} zoom={zoom} />
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
      {markers.map((m, idx) => (
        <Marker keyboard title={typeof m.popup==='string'?m.popup:`Location ${idx+1}`} alt={typeof m.popup==='string'?m.popup:`Location ${idx+1}`} key={idx} position={m.position} icon={createModernIcon()}>
          {m.popup && (
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>{m.popup}</span>
            </Tooltip>
          )}
        </Marker>
      ))}
    </MapContainer>
  );
}
