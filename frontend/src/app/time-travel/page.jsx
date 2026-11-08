'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import TimeTravelContent from './TimeTravelContent';

export default function TimeTravelPage(){
  return <ProtectedRoute><TimeTravelContent/></ProtectedRoute>;
}
