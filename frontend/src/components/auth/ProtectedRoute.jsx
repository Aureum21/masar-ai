'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';


import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !token) {
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname+window.location.search)}`);
    }
  }, [token, loading, router]);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        backgroundColor: '#0A0B0E',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px'
      }}>
        <div style={{ position: 'relative' }}>
          <Localized element={"img"} attributes={["alt"]}
            src="/MasarAiLogo.png" 
            alt="Masar AI" 
            style={{ 
              height: '60px', 
              width: 'auto', 
              filter: 'drop-shadow(0 0 20px rgba(245, 158, 11, 0.5))',
              animation: 'pulse 1.5s ease-in-out infinite alternate'
            }} 
          />
        </div>
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#94A3B8',
          letterSpacing: '0.04em'
        }}><LocalizedText message={"Authenticating Sovereign Concierge..."} /></div>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  return children;
}
