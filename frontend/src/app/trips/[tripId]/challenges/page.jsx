'use client';
import { use } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Journey from '../../_components/Journey';

export default function ChallengePage({ params }) {
  const { tripId } = use(params);
  return <ProtectedRoute><Journey key={tripId} tripId={tripId} /></ProtectedRoute>;
}
