'use client';
import {Localized} from '@/i18n/Localized';

import Image from 'next/image';

export default function MasarWelcomeEmblem() {
  return (
<div style={{ position: 'relative', marginBottom: 'var(--space-4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute',
          width: '220px',
          height: '180px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.32) 0%, rgba(217, 119, 6, 0.12) 50%, transparent 70%)',
          filter: 'blur(20px)',
          zIndex: 0
        }} />
        <Localized element={Image} attributes={["alt"]}
          src="/MasarAiLogo.png" 
          alt="Masar AI Emblem" width={190} height={165} priority 
          style={{ 
            width: '190px', 
            height: 'auto', 
            maxHeight: '165px',
            objectFit: 'contain',
            position: 'relative',
            zIndex: 1,
            filter: 'drop-shadow(0 8px 24px rgba(245, 158, 11, 0.5)) drop-shadow(0 2px 8px rgba(0,0,0,0.8))'
          }} 
        />
        {/* Bouncing Gold Location Pin */}
        <div className="hero-pin-marker" />
      </div>
  );
}
