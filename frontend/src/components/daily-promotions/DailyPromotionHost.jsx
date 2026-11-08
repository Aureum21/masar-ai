'use client';

import { useState, useEffect } from 'react';
import DailyPromotionModal from './DailyPromotionModal';
import { useAuth } from '@/context/AuthContext';

export function openDailyPromotion() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('masar:open-daily-promotion'));
  }
}

export default function DailyPromotionHost() {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('masar:open-daily-promotion', handleOpen);
    return () => window.removeEventListener('masar:open-daily-promotion', handleOpen);
  }, []);

  if (!isOpen || !token) return null;

  return (
    <DailyPromotionModal
      key={token}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
    />
  );
}
