'use client';
import {LocalizedText} from '@/i18n/Localized';


import dynamic from 'next/dynamic';

const MapClient = dynamic(() => import('./MapClient'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', width: '100%', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}><LocalizedText message={"Loading Interactive Map..."} /></div>
  )
});

export default function DynamicMap(props) {
  return <MapClient {...props} />;
}
