'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { X, Trophy } from 'lucide-react';
import { LocalizedText } from '@/i18n/Localized';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { useTripDraft } from '@/hooks/useTripDraft';
import { addPlace } from '@/lib/tripDraft';

const SikkaExperience = dynamic(() => import('@/components/game/SikkaExperience'), { ssr: false });

export default function PromoGameHost({
  gameId,
  gameTitle,
  sessionId,
  assignmentId,
  onClose,
  onComplete
}) {
  const { draft, update: updateDraft } = useTripDraft();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resultMessage, setResultMessage] = useState('');
  const containerRef = useRef(null);
  const controllerRef = useRef(null);
  const dialogRef = useRef(null);
  const completeRef = useRef(onComplete);
  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);
  useDialogFocus(dialogRef, gameId !== 'sikka-run', onClose);
  const promotion = useMemo(() => ({
    sessionId,
    onComplete: payload => completeRef.current?.(assignmentId, payload)
  }), [sessionId, assignmentId]);

  // For non-sikka-run experiences: mount from public masar-experiences
  useEffect(() => {
    if (gameId === 'sikka-run') return;
    let mounted = true;
    const controllerAbort = new AbortController();

    async function mount() {
      if (!containerRef.current) return;
      try {
        setLoading(true);
        const { mountMasarExperience } = await import(/* webpackIgnore: true */ '/masar-experiences/components/index.js');
        if (!mounted) return;

        const ctrl = await mountMasarExperience(gameId, containerRef.current, {
          signal: controllerAbort.signal,
          onComplete: async (data) => {
            try {
              const res = await completeRef.current?.(assignmentId, {
                session_id: sessionId,
                score: Math.max(0, Math.round(data?.score || data?.points || 0)),
                elapsed_seconds: Math.max(0, Math.round(data?.elapsedSeconds ?? data?.elapsed ?? data?.time ?? 0)),
                details: data || {}
              });
              if (res?.message) {
                setResultMessage(res.message);
              }
            } catch (err) {
              setResultMessage(err.message || 'Error recording score.');
            }
          }
        });

        if (mounted) {
          controllerRef.current = ctrl;
          setLoading(false);
        } else {
          ctrl?.dispose?.();
        }
      } catch (err) {
        if (mounted && err.name !== 'AbortError') {
          setError(err.message || 'Failed to load experience');
          setLoading(false);
        }
      }
    }

    mount();

    return () => {
      mounted = false;
      controllerAbort.abort();
      controllerRef.current?.dispose?.();
    };
  }, [gameId, sessionId, assignmentId]);

  if (gameId === 'sikka-run') {
    return (
      <SikkaExperience
        onClose={onClose}
        promotion={promotion}
        destinationSaved={draft.selections.some(place => place.id === 'old-dubai-heritage')}
        onDestinationSelect={() => Boolean(updateDraft(previous => addPlace(previous, 'old-dubai-heritage')))}
      />
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10050,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(8px, 2vh, 20px)',
        boxSizing: 'border-box'
      }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={gameTitle}
        style={{
          width: 'min(96vw, 1200px)',
          height: 'min(92vh, 840px)',
          background: 'radial-gradient(ellipse at 50% 0, rgba(212, 178, 113, 0.10), transparent 65%), #0B0D14',
          borderRadius: '28px',
          border: '1px solid rgba(212, 178, 113, 0.35)',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.9), 0 0 50px rgba(240, 185, 95, 0.15)',
          animation: 'masarModalScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: '#0A0B0E',
                padding: '4px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.05em'
              }}
            >
              DAILY PROMO PLAY
            </span>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              {gameTitle}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#CBD5E1',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title="Close game (Esc)"
          >
            <X size={17} />
          </button>
        </div>

        {resultMessage && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%)',
              borderBottom: '1px solid rgba(245, 158, 11, 0.4)',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              color: '#FBBF24',
              fontSize: '13px',
              fontWeight: 600,
              flexShrink: 0
            }}
          >
            <Trophy size={16} />
            <span><LocalizedText>{resultMessage}</LocalizedText></span>
          </div>
        )}

        {/* Experience Mounting Stage */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}
        >
          {loading && (
            <div
              style={{
                flex: 1,
                color: '#94A3B8',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '300px',
                gap: '14px'
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  border: '3px solid rgba(245, 158, 11, 0.2)',
                  borderTopColor: '#F59E0B',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }}
              />
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#CBD5E1' }}>
                Preparing {gameTitle}…
              </span>
            </div>
          )}

          {error && (
            <div
              style={{
                flex: 1,
                color: '#F87171',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '300px',
                gap: '12px'
              }}
            >
              <p style={{ margin: 0, fontSize: '14px' }}>{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="journey-btn outline small"
              >
                Close
              </button>
            </div>
          )}

          <div
            ref={containerRef}
            style={{
              width: '100%',
              height: '100%',
              flex: 1,
              minHeight: 0,
              display: loading || error ? 'none' : 'block'
            }}
          />
        </div>
      </div>
    </div>
  );
}
