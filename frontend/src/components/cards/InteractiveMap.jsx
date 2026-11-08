'use client';
import {LocalizedText} from '@/i18n/Localized';


import dynamic from 'next/dynamic';

// Dynamically import the MapComponent with SSR disabled
// This is required because react-leaflet requires the window object which is undefined on the server
const MapComponent = dynamic(
  () => import('./MapComponent'),
  { 
    ssr: false,
    loading: () => (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        backgroundColor: '#0E1015', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ color: '#F59E0B', fontSize: '14px', fontWeight: 600 }}><LocalizedText message={"Loading map..."} /></div>
      </div>
    )
  }
);

export default function InteractiveMap(props) {
  return <MapComponent {...props} />;
}
