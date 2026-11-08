'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import TripWorkspace from '@/components/trips/workspace/TripWorkspace';

export default function TripDraftView({ id }) {
  return (
    <ProtectedRoute>
      <TripWorkspace id={id} />
    </ProtectedRoute>
  );
}
