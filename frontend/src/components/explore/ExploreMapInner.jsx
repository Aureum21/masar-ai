'use client';
import {useAccessibility} from '@/context/AccessibilityContext';
import MapMotion from '@/components/ui/MapMotion';
import {Localized,LocalizedText} from '@/i18n/Localized';


import { memo, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import UaeBoundary, {UAE_BOUNDS} from './UaeBoundary';
import { renderToString } from 'react-dom/server';
import {Utensils,Building2,Landmark,Ticket,BookOpen,Star,ArrowRight,Sparkles,MapPin,Waves,MoonStar,ShoppingBag,Mountain,Trees,Castle,Store,Anchor,Shell,FerrisWheel,Camera,Hotel,Plane} from 'lucide-react';
import {MARKER_TYPES,placeMarkerType} from '@/lib/placeMarkerType';

// Fix for default marker icons in Leaflet + Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MARKER_ICONS={Utensils,Building2,Landmark,Ticket,BookOpen,MapPin,Waves,MoonStar,ShoppingBag,Mountain,Trees,Castle,Store,Anchor,Shell,FerrisWheel,Camera,Hotel,Plane};

const markerIconCache = new Map();

const getPlaceMarker = (place, isSelected = false, isHovered = false) => {
  const catKey = placeMarkerType(place);
  const stateKey = isSelected ? 'sel' : isHovered ? 'hov' : 'norm';
  const cacheKey = `${catKey}:${stateKey}`;

  const cached = markerIconCache.get(cacheKey);
  if (cached) return cached;

  const config = MARKER_TYPES[catKey];
  const IconComp = MARKER_ICONS[config.icon];
  const size = isSelected ? 42 : isHovered ? 38 : 32;

  const html = renderToString(
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      backgroundColor: config.bg,
      border: isSelected 
        ? '3px solid #F59E0B' 
        : isHovered 
          ? '2px solid #FFFFFF' 
          : `2px solid ${config.color}`,
      boxShadow: isSelected 
        ? '0 0 25px rgba(245, 158, 11, 0.9), 0 4px 15px rgba(0, 0, 0, 0.8)' 
        : isHovered 
          ? `0 0 16px ${config.color}99, 0 4px 10px rgba(0, 0, 0, 0.7)` 
          : '0 2px 8px rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: isSelected ? '#FBBF24' : config.color,
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    }}>
      <IconComp size={isSelected ? 20 : isHovered ? 18 : 15} strokeWidth={2.3} />
    </div>
  );

  const icon = L.divIcon({
    html: html,
    className: `custom-explore-marker marker-type-${catKey}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 6]
  });

  markerIconCache.set(cacheKey, icon);
  return icon;
};

// Card hover changes only the affected markers, not every popup in the catalogue.
const ExploreMapMarker=memo(function ExploreMapMarker({place,isSelected,isHovered,registerMarker,onSelectPlace,onPlanTrip,planLabel}){
  if(!place.lat||!place.lng)return null;
  return (
            <Localized element={Marker} attributes={["title","alt"]}
              key={place.id}
              position={[place.lat, place.lng]}
              icon={getPlaceMarker(place, isSelected, isHovered)}
              title={`${place.title} · ${MARKER_TYPES[placeMarkerType(place)].label}`}
              alt={`${MARKER_TYPES[placeMarkerType(place)].label}: ${place.title}`}
              ref={(ref) => {
                registerMarker(place.id,ref);
              }}
              eventHandlers={{
                click: () => onSelectPlace && onSelectPlace(place)
              }}
            >
              <Popup className="explore-luxury-popup" autoPan={false}>
                <div style={{
                  width: '240px',
                  backgroundColor: '#121418',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  color: '#FFFFFF',
                  fontFamily: 'inherit'
                }}>
                  {/* Popup Thumbnail */}
                  {place.images && place.images[0] && (
                    <div style={{ width: '100%', height: '110px', position: 'relative' }}>
                      <Localized element={"img"} attributes={["alt"]}
                        src={place.images[0]}
                        loading="lazy"
                        decoding="async"
                        onError={event=>{const img=event.currentTarget;if(place.imageFallbacks?.[0]&&!img.dataset.fallbackUsed){img.dataset.fallbackUsed='true';img.src=place.imageFallbacks[0];}}}
                        alt={place.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: '6px',
                        left: '8px',
                        backgroundColor: 'rgba(10, 11, 14, 0.8)',
                        backdropFilter: 'blur(4px)',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#FBBF24'
                      }}>
                        <LocalizedText>{place.priceLabel}</LocalizedText>
                      </div>
                    </div>
                  )}

                  {place.attribution?.filter(credit=>credit.type==='photo').map((credit,index)=><div key={index} style={{padding:'5px 12px',fontSize:'9px',color:'#94A3B8'}}><a href={credit.url} target="_blank" rel="noopener noreferrer"><LocalizedText>{credit.label}</LocalizedText></a></div>)}
                  {/* Popup Body */}
                  <div style={{ padding: '12px' }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: '#FFFFFF',
                      marginBottom: '4px',
                      lineHeight: 1.2
                    }}>
                      {place.title || place.name}
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '11px',
                      color: '#CBD5E1',
                      marginBottom: '6px'
                    }}>
                      {place.rating ? <Star size={11} fill="#F59E0B" color="#F59E0B" /> : null}
                      {place.rating ? <><span style={{ fontWeight: 700 }}>{place.rating}</span> <span style={{ color: '#64748B' }}>•</span></> : null}

                      <span><LocalizedText>{place.neighborhood || place.city || place.area}</LocalizedText></span>
                    </div>

                    <p style={{
                      fontSize: '11px',
                      color: '#94A3B8',
                      margin: '0 0 10px 0',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      <LocalizedText>{place.description}</LocalizedText>
                    </p>

                    <button
                      onClick={() => onPlanTrip && onPlanTrip(place)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
                        color: '#0A0B0E',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(245, 158, 11, 0.3)'
                      }}
                    >
                      <span>{planLabel}</span>
                      <ArrowRight size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </Popup>
            </Localized>
  );
});

function MapCameraController({ center, zoom, selectedPlace }) {
  const map = useMap();
  const {reduced}=useAccessibility();

  useEffect(() => {
    map.attributionControl?.setPrefix(false);
  }, [map]);

  useEffect(() => {
    if (selectedPlace && selectedPlace.lat && selectedPlace.lng) {
      if(reduced){map.setView([selectedPlace.lat,selectedPlace.lng],14,{animate:false});return;}
      map.flyTo([selectedPlace.lat, selectedPlace.lng], 14, {
        duration: 1.2,
        easeLinearity: 0.25
      });
    } else if (center && zoom <= 9) {
      map.fitBounds(UAE_BOUNDS, {paddingTopLeft:[24,60],paddingBottomRight:[24,22],maxZoom:9,animate:false});
    } else if (center) {
      if(reduced){map.setView(center,zoom||11,{animate:false});return;}
      map.flyTo(center, zoom || 11, {
        duration: 1.0,
        easeLinearity: 0.25
      });
    }
  }, [center, zoom, selectedPlace, map, reduced]);

  return null;
}

export default function ExploreMapInner({
  places = [],
  center = [25.2048, 55.2708],
  zoom = 11,
  selectedPlace,
  hoveredPlace,
  onSelectPlace,
  onPlanTrip,
  planLabel = 'Plan with Masar AI'
}) {
  const {reduced}=useAccessibility();
  const markerRefs = useRef({});
  const registerMarker=useCallback((id,marker)=>{
    if(marker)markerRefs.current[id]=marker;
    else delete markerRefs.current[id];
  },[]);

  // Auto-open popup when a place is selected from list
  useEffect(() => {
    if (selectedPlace && markerRefs.current[selectedPlace.id]) {
      markerRefs.current[selectedPlace.id].openPopup();
    }
  }, [selectedPlace,reduced]);

  return (
    <div className="explore-map-surface" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <MapContainer key={reduced?'reduced':'full'} zoomAnimation={!reduced} fadeAnimation={!reduced} markerZoomAnimation={!reduced}         center={center}
        zoom={zoom}
        style={{ width: '100%', height: '100%', background: '#090A0D' }}
        scrollWheelZoom={true}
        zoomControl={false}
        className={!process.env.NEXT_PUBLIC_CARTO_API_KEY ? "luxury-dark-map" : ""}
      >
        <MapMotion/><ZoomControl position="bottomright" />
        <MapCameraController center={center} zoom={zoom} selectedPlace={selectedPlace} />

        {/* Tiles: uses CARTO if API key is provided, otherwise native luxury dark Esri Canvas */}
        {process.env.NEXT_PUBLIC_CARTO_API_KEY ? (
          <TileLayer
            url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${process.env.NEXT_PUBLIC_CARTO_API_KEY}`}
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
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

        <UaeBoundary/>

        {/* Place Markers */}
        {places.map(place=><ExploreMapMarker key={place.id} place={place}
          isSelected={selectedPlace?.id===place.id} isHovered={hoveredPlace?.id===place.id}
          registerMarker={registerMarker} onSelectPlace={onSelectPlace} onPlanTrip={onPlanTrip} planLabel={planLabel}/>) }
      </MapContainer>

      {/* Global CSS overrides for Leaflet Dark Popup */}
      <style jsx global>{`
        .explore-map-surface .leaflet-control-attribution {
          background: rgba(9, 10, 13, 0.88) !important;
          color: #A0AEC0;
          font-size: 10px;
          line-height: 1.5;
          padding: 3px 8px;
          border-radius: 8px 0 0 0;
          box-shadow: none;
        }
        .explore-map-surface .leaflet-control-attribution a {
          color: #DCB868;
        }
        .explore-map-surface .leaflet-control-attribution a:hover {
          color: #FBBF24;
          text-decoration: underline;
        }
        .explore-luxury-popup .leaflet-popup-content-wrapper {
          background-color: #121418 !important;
          border: 1px solid rgba(245, 158, 11, 0.4) !important;
          border-radius: 16px !important;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8) !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        .explore-luxury-popup .leaflet-popup-content {
          margin: 0 !important;
          line-height: normal !important;
        }
        .explore-luxury-popup .leaflet-popup-tip {
          background-color: #121418 !important;
          border: 1px solid rgba(245, 158, 11, 0.4) !important;
        }
        .explore-luxury-popup a.leaflet-popup-close-button {
          color: #FFFFFF !important;
          padding: 6px 8px !important;
          top: 4px !important;
          right: 4px !important;
          z-index: 10 !important;
          background: rgba(0, 0, 0, 0.5) !important;
          border-radius: 50% !important;
          width: 20px !important;
          height: 20px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
      `}</style>
    </div>
  );
}
