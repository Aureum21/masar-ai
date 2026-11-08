'use client';

import { useState, useEffect, useRef, useId } from 'react';
import Link from 'next/link';
import { X, Trophy, Coins, Clock, Play, CheckCircle2, Gamepad2, MapPin } from 'lucide-react';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useDailyPromotion } from './useDailyPromotion';
import DailyPromotionWheel from './DailyPromotionWheel';
import PromoGameHost from './PromoGameHost';
import DailyVenuePreview from './DailyVenuePreview';
import styles from './daily-promotion.module.css';

export default function DailyPromotionModal({ isOpen, onClose }) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const { reduced } = useAccessibility();
  const titleId = useId();

  const {
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
    refetch
  } = useDailyPromotion();

  const [activeSession, setActiveSession] = useState(null);
  const [playingGame, setPlayingGame] = useState(false);
  const [useEquivalent, setUseEquivalent] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [countdown, setCountdown] = useState('');

  // Save previous focus on open and restore on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      dialogRef.current?.focus();
    }
    return () => previousFocusRef.current?.focus?.();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);

  // Focus trap and Escape key
  useEffect(() => {
    if (!isOpen || playingGame) return;
    dialogRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, playingGame, onClose]);

  // Countdown timer to midnight Dubai
  useEffect(() => {
    if (!data?.expires_at) return;
    const receivedAt = data.received_at || Date.now();
    const serverAt = data.server_time ? new Date(data.server_time).getTime() : receivedAt;
    let refreshed = false;
    const updateTime = () => {
      const now = serverAt + Date.now() - receivedAt;
      const expiry = new Date(data.expires_at).getTime();
      const diff = Math.max(0, expiry - now);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown([hours, mins, secs].map(value => String(value).padStart(2, '0')).join(':'));
      if (diff === 0 && !refreshed && !playingGame && !spinning) { refreshed = true; void refetch(); }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [data?.expires_at, data?.server_time, data?.received_at, refetch, playingGame, spinning]);

  if (!isOpen) return null;

  const assignment = data?.assignment;
  const isCompleted = assignment?.state === 'completed';
  const isRejected = assignment?.state === 'rejected';
  const isAccepted = assignment?.state === 'accepted' || assignment?.state === 'in_progress';
  const isExpired = assignment?.state === 'expired';
  const isDrawn = Boolean(assignment && !spinning && !isCompleted && !isRejected && !isExpired);

  // Handle spin button press
  const handleRotate = async () => {
    setActionError('');
    try {
      await spin();
    } catch (err) {
      setActionError(err.message || 'Spin failed');
    }
  };

  const handleSpinDone = () => {
    onSpinComplete();
  };

  // Launch promotional game
  const handleLaunchGame = async () => {
    if (!assignment) return;
    setActionLoading(true);
    setActionError('');
    try {
      const sess = await startSession(assignment.id);
      setActiveSession(sess);
      setPlayingGame(true);
    } catch (err) {
      setActionError(err.message || 'Could not launch game');
    } finally {
      setActionLoading(false);
    }
  };

  // Accept venue assignment
  const handleAcceptVenue = async () => {
    if (!assignment) return;
    setActionLoading(true);
    setActionError('');
    try {
      await accept(assignment.id);
    } catch (err) {
      setActionError(err.message || 'Could not accept assignment');
    } finally {
      setActionLoading(false);
    }
  };

  // Decline assignment
  const handleReject = async () => {
    if (!assignment) return;
    setActionLoading(true);
    setActionError('');
    try {
      await reject(assignment.id);
    } catch (err) {
      setActionError(err.message || 'Could not decline challenge');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit venue reflection evidence
  const handleSubmitReflection = async (e) => {
    e.preventDefault();
    if (!assignment || !reflectionText.trim()) return;
    setActionLoading(true);
    setActionError('');
    try {
      const idempotencyKey = `promo-ref-${assignment.id}-${Date.now()}`;
      await submitEvidence(assignment.id, {
        idempotency_key: idempotencyKey,
        evidence_type: 'reflection',
        text: reflectionText.trim()
      });
      setReflectionText('');
    } catch (err) {
      setActionError(err.message || 'Failed to submit reflection');
    } finally {
      setActionLoading(false);
    }
  };

  const displayError = actionError || (error ? 'We couldn’t load your daily challenge. Please try again.' : '');

  return (
    <>
      {!playingGame && <div className={styles.overlay} onClick={onClose} role="presentation">
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={`${styles.modalCard} ${assignment?.kind === 'venue' ? styles.venueModalCard : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className={styles.modalCloseX}
            title="Close dialog (Esc)"
            aria-label="Close daily promotional challenge"
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div className={styles.header}>
            <div className={styles.badgeTag}>
              <Coins size={13} color="#F0B95F" />
              <span>Daily Challenge Wheel</span>
            </div>
            <h2 id={titleId} className={styles.title}>
              {isCompleted
                ? 'Challenge Complete!'
                : isRejected
                ? 'Today’s Result'
                : isDrawn
                ? 'Your daily discovery'
                : 'Expedition Roulette'}
            </h2>
            <p className={styles.subtitle}>
              {isCompleted
                ? 'Your daily reward is saved in My Passport.'
                : isRejected
                ? 'You opted out of today’s promotional challenge.'
                : isDrawn
                ? 'Complete today’s challenge to earn Daily Challenge Coins in My Passport.'
                : 'One spin. A new story. Discover today’s game or UAE experience and earn a coin for your Passport.'}
            </p>

            {countdown && (
              <div className={styles.countdownPill}>
                <Clock size={16} />
                <span className={styles.resetLabel}>Next daily draw<small>00:00 · Dubai (GST)</small></span>
                <time className={styles.resetTime} aria-label={`${countdown} until the next daily draw`}>{countdown}</time>
              </div>
            )}
          </div>

          {displayError && (
            <div
              style={{
                width: '100%',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '12px 14px',
                color: '#FCA5A5',
                fontSize: '12.5px',
                marginBottom: '14px',
                textAlign: 'center',
                lineHeight: 1.5
              }}
              role="alert"
            >
              <div>{displayError}</div>
              {error && <button type="button" className={styles.btnSecondary} onClick={refetch} disabled={loading} style={{marginTop:8}}>{loading?'Trying again…':'Try again'}</button>}
            </div>
          )}

          {/* ── STAGE 1: UNSPUN WHEEL ── */}
          {(!assignment || spinning) && (
            <DailyPromotionWheel
              sectors={assignment?.wheel_pool || data?.wheel_pool || []}
              targetSlot={targetSlot}
              isSpinning={spinning}
              disabled={loading || !data || Boolean(error)}
              loading={loading || (!data && !error)}
              onRotate={handleRotate}
              onSpinComplete={handleSpinDone}
              reducedMotion={reduced}
            />
          )}

          {/* ── STAGE 2: REVEALED CHALLENGE (GAME OR VENUE) ── */}
          {isDrawn && (
            <div className={styles.challengeCard} aria-live="polite">
              <div className={styles.revealEyebrow}>SELECTED FOR YOU <span>DAILY EDITION</span></div>
              <div className={styles.challengeHeader}>
                <div className={styles.challengeIcon}>
                  {assignment.kind === 'game' ? (
                    <Gamepad2 size={24} color="#F0B95F" />
                  ) : (
                    <MapPin size={24} color="#F0B95F" />
                  )}
                </div>
                <div className={styles.challengeMeta}>
                  <span className={styles.challengeKindBadge}>
                    {assignment.kind === 'game' ? (
                      <>
                        <Gamepad2 size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                        In-App Game Challenge
                      </>
                    ) : (
                      <>
                        <MapPin size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                        Venue Challenge
                      </>
                    )}
                  </span>
                  <h3 className={styles.challengeTitle}>{assignment.title}</h3>
                  <p className={styles.challengeSubtitle}>
                    {assignment.location_name || assignment.subtitle}
                  </p>
                </div>
                <div className={styles.rewardBadge}>
                  <Coins size={14} />
                  <span>+{assignment.reward_coins} Coin</span>
                </div>
              </div>

              {/* Venue Animation Preview (for venue challenges) */}
              {assignment.kind === 'venue' && assignment.animation_key && (
                <DailyVenuePreview animationKey={assignment.animation_key} title={assignment.title} />
              )}

              {/* Objective Description */}
              <div className={styles.objectiveBox}>
                <div className={styles.objectiveLabel}>
                  <Trophy size={13} />
                  <span>Objective</span>
                </div>
                <p className={styles.objectiveText}>{assignment.objective}</p>
              </div>

              {/* Accessible Equivalent Option (for venue challenges) */}
              {assignment.kind === 'venue' && assignment.equivalent_task && (
                <div style={{ marginTop: '2px' }}>
                  <label className={styles.equivalentToggle}>
                    <input
                      type="checkbox"
                      checked={useEquivalent}
                      onChange={(e) => setUseEquivalent(e.target.checked)}
                      style={{ accentColor: '#F0B95F', cursor: 'pointer' }}
                    />
                    <span>Switch to accessible reflection option</span>
                  </label>

                  {useEquivalent && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: 'rgba(240, 185, 95, 0.08)',
                        border: '1px solid rgba(240, 185, 95, 0.25)',
                        fontSize: '12px',
                        color: '#E2E8F0',
                        lineHeight: 1.5
                      }}
                    >
                      <strong style={{ color: '#F0B95F' }}>
                        {assignment.equivalent_task.title}
                      </strong>
                      <p style={{ margin: '4px 0 0 0', color: '#CBD5E1' }}>
                        {assignment.equivalent_task.rubric}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions for Game Assignment */}
              {assignment.kind === 'game' && (
                <div className={styles.actionRow}>
                  <button
                    type="button"
                    onClick={handleLaunchGame}
                    disabled={actionLoading}
                    className={styles.btnPrimary}
                  >
                    <Play size={16} />
                    <span>Play Challenge</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={actionLoading}
                    className={styles.btnSecondary}
                  >
                    <span>Not Today</span>
                  </button>
                </div>
              )}

              {/* Actions for Venue Assignment: Drawn (Unaccepted) */}
              {assignment.kind === 'venue' && !isAccepted && (
                <div className={styles.actionRow}>
                  <button
                    type="button"
                    onClick={handleAcceptVenue}
                    disabled={actionLoading}
                    className={styles.btnPrimary}
                  >
                    <span>Accept Challenge</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={actionLoading}
                    className={styles.btnSecondary}
                  >
                    <span>Not Today</span>
                  </button>
                </div>
              )}

              {/* Actions for Venue Assignment: Accepted (Evidence Submission) */}
              {assignment.kind === 'venue' && isAccepted && (
                <form onSubmit={handleSubmitReflection} className={styles.evidenceForm}>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                    {useEquivalent
                      ? 'Submit your reflection responding to the rubric above:'
                      : 'Share your check-in observations from the venue:'}
                  </div>
                  <textarea
                    value={reflectionText}
                    onChange={(e) => setReflectionText(e.target.value)}
                    placeholder="Enter your observations or reflection (minimum 15 characters)..."
                    className={styles.textarea}
                    rows={3}
                    required
                  />
                  <div className={styles.actionRow}>
                    <button
                      type="submit"
                      disabled={actionLoading || reflectionText.trim().length < 15}
                      className={styles.btnPrimary}
                    >
                      <span>Submit Verification</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ── STAGE 3: COMPLETED STATE ── */}
          {isCompleted && (
            <div className={styles.completedAlert}>
              <CheckCircle2 size={36} color="#86EFAC" />
              <h3>{assignment.title}</h3>
              <p>
                You earned <strong>{assignment.reward_coins} Daily Challenge Coin</strong> today.
              </p>
              <div className={styles.rewardBadge} style={{ marginTop: '4px' }}>
                <Coins size={14} />
                <span>{data?.coins_balance ?? 0} Total Daily Coins</span>
              </div>
              <div className={styles.actionRow}>
                <button type="button" className={styles.btnSecondary} onClick={onClose}>Done</button>
                <Link href="/rewards" className={styles.btnPrimary} onClick={onClose}>View My Passport</Link>
              </div>
            </div>
          )}

          {isExpired && <div className={styles.rejectedAlert}><h3>Challenge expired</h3><p>A new daily draw is ready. Close and reopen to see today’s challenge.</p></div>}

          {/* ── STAGE 4: REJECTED STATE ── */}
          {isRejected && (
            <div className={styles.rejectedAlert}>
              <h3>Challenge Declined</h3>
              <p>
                You declined today&apos;s promotional challenge. The wheel will reset tomorrow at midnight Dubai time.
              </p>
            </div>
          )}
        </div>
      </div>}

      {/* Expanded Game Player Overlay */}
      {playingGame && assignment?.kind === 'game' && activeSession && (
        <PromoGameHost
          gameId={assignment.game_id}
          gameTitle={assignment.title}
          sessionId={activeSession.session_id}
          assignmentId={assignment.id}
          onClose={() => setPlayingGame(false)}
          onComplete={async (aid, scoreData) => {
            const res = await completeGame(aid, scoreData);
            if (res.status === 'completed' && assignment.game_id !== 'sikka-run') {
              setPlayingGame(false);
            }
            return res;
          }}
        />
      )}
    </>
  );
}
