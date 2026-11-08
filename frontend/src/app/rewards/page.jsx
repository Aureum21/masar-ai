'use client';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import MyPassport from './_components/MyPassport';
export default function RewardsPage(){return <ProtectedRoute><MyPassport/></ProtectedRoute>;}
