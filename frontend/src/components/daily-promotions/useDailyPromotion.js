'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { passportRequest, notifyPassportChanged } from '@/app/profile/_lib/passportApi';

export function useDailyPromotion() {
  const { token } = useAuth();
  const spinPending = useRef(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [targetSlot, setTargetSlot] = useState(null);

  useEffect(() => {
    let active = true;
    if (!token) return;
    passportRequest(token, '/daily-promotions/today')
      .then((res) => {
        if (active) {
          setData({...res, received_at: Date.now()});
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Could not load today’s daily challenge.');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  const fetchToday = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await passportRequest(token, '/daily-promotions/today');
      setData({...res, received_at: Date.now()});
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load today’s daily challenge.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const spin = useCallback(async () => {
    if (!token || spinPending.current) return;
    spinPending.current = true;
    setTargetSlot(null);
    try {
      setSpinning(true);
      setError('');
      const res = await passportRequest(token, '/daily-promotions/spin', { method: 'POST' });
      setTargetSlot(res.selected_slot);
      setData((prev) => ({
        ...prev,
        has_spun: true,
        assignment: res.assignment,
        coins_balance: res.coins_balance
      }));
      return res;
    } catch (err) {
      // A timed-out response may still have persisted the draw. Recover it first.
      await fetchToday();
      setSpinning(false);
      setError(err.message || 'Wheel spin failed. Please try again.');
      throw err;
    } finally {
      spinPending.current = false;
    }
  }, [token, fetchToday]);

  const onSpinComplete = useCallback(() => {
    setSpinning(false);
  }, []);

  const accept = useCallback(async (assignmentId) => {
    if (!token || !assignmentId) return;
    try {
      setError('');
      const res = await passportRequest(token, `/daily-promotions/${assignmentId}/accept`, { method: 'POST' });
      setData((prev) => ({
        ...prev,
        assignment: res.assignment
      }));
      return res.assignment;
    } catch (err) {
      setError(err.message || 'Could not accept assignment.');
      throw err;
    }
  }, [token]);

  const reject = useCallback(async (assignmentId) => {
    if (!token || !assignmentId) return;
    try {
      setError('');
      const res = await passportRequest(token, `/daily-promotions/${assignmentId}/reject`, { method: 'POST' });
      setData((prev) => ({
        ...prev,
        assignment: res.assignment
      }));
      return res.assignment;
    } catch (err) {
      setError(err.message || 'Could not decline challenge.');
      throw err;
    }
  }, [token]);

  const startSession = useCallback(async (assignmentId) => {
    if (!token || !assignmentId) return;
    return await passportRequest(token, `/daily-promotions/${assignmentId}/game-sessions`, { method: 'POST' });
  }, [token]);

  const completeGame = useCallback(async (assignmentId, payload) => {
    if (!token || !assignmentId) return;
    try {
      setError('');
      const res = await passportRequest(token, `/daily-promotions/${assignmentId}/game-complete`, {
        method: 'POST',
        body: payload
      });
      if (res.status === 'completed') {
        setData(prev => ({...prev, assignment: res.assignment || {...prev.assignment, state: 'completed'}, coins_balance: res.balance}));
        notifyPassportChanged();
        await fetchToday();
      }
      return res;
    } catch (err) {
      setError(err.message || 'Failed to submit game score.');
      throw err;
    }
  }, [token, fetchToday]);

  const submitEvidence = useCallback(async (assignmentId, payload) => {
    if (!token || !assignmentId) return;
    try {
      setError('');
      const res = await passportRequest(token, `/daily-promotions/${assignmentId}/submissions`, {
        method: 'POST',
        body: payload
      });
      if (res.status === 'completed') {
        setData(prev => ({...prev, assignment: res.assignment || {...prev.assignment, state: 'completed'}, coins_balance: res.balance}));
        notifyPassportChanged();
        await fetchToday();
      }
      return res;
    } catch (err) {
      setError(err.message || 'Failed to submit evidence.');
      throw err;
    }
  }, [token, fetchToday]);

  return {
    data,
    loading,
    error,
    spinning,
    targetSlot,
    spin,
    onSpinComplete,
    accept,
    reject,
    startSession,
    completeGame,
    submitEvidence,
    refetch: fetchToday
  };
}
