'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';


/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SikkaRunnerEngine,
  GameState,
  SikkaFork,
  DestinationCard,
} from './sikka/sikkaRunner';
import { sound } from './sikka/audio';
import type { ParcelStatus, DeliveryStoryCard } from './sikka/parcelDelivery';
import {
  X,
  Sparkles,
  MapPin,
  Compass,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Heart,
  Zap,
  Play,
  Volume2,
  VolumeX,
  Package,
  Coffee,
  CheckCircle2,
  Award,
} from 'lucide-react';
import styles from './MasarArcadeRun.module.css';
import SikkaDailyResult from './SikkaDailyResult';

export interface GameStats {
  score: number;
  coins: number;
  distance: number;
  destination: DestinationCard;
  visitedForks: string[];
  deliveryCard?: DeliveryStoryCard | null;
}

export interface MasarArcadeRunProps {
  isOpen?: boolean;
  promotional?: boolean;
  dailyResult?: {status: string; coins_awarded?: number; balance?: number; message?: string} | null;
  destinationSaved?: boolean;
  shortlistMessage?: string;
  onClose?: () => void;
  onPlanVisit?: (destination: DestinationCard | string) => boolean | void;
  onComplete?: (stats: GameStats) => void;
  onRestart?: () => boolean | void;
  statusMessage?: string;
  onRetrySave?: () => void;
}

export function MasarArcadeRun({
  isOpen = true,
  onClose,
  onPlanVisit,
  onComplete, onRestart, statusMessage, onRetrySave, promotional, dailyResult, destinationSaved, shortlistMessage,
}: MasarArcadeRunProps) {
  if (!isOpen) return null;

  return (
    <MasarArcadeRunCard
      isOpen={isOpen}
      onClose={onClose}
      onPlanVisit={onPlanVisit}
      dailyResult={dailyResult} destinationSaved={destinationSaved} shortlistMessage={shortlistMessage} promotional={promotional} onComplete={onComplete} onRestart={onRestart} statusMessage={statusMessage} onRetrySave={onRetrySave}
    />
  );
}

function MasarArcadeRunCard({
  onClose,
  onPlanVisit,
  onComplete, onRestart, statusMessage, onRetrySave, promotional, dailyResult, destinationSaved, shortlistMessage,
}: MasarArcadeRunProps) {
  const completeRef = useRef(onComplete);
  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SikkaRunnerEngine | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Game UI States
  const [engineError,setEngineError]=useState('');
  const [fps, setFps] = useState(0);
  const [quality, setQuality] = useState<'sharp' | 'fast'>('sharp');
  const [gameState, setGameState] = useState<GameState>('ready');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [score, setScore] = useState<number>(0);
  const [coins, setCoins] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [currentFork, setCurrentFork] = useState<SikkaFork | null>(null);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [tripSaved, setTripSaved] = useState<boolean>(false);
  const [parcelStatus, setParcelStatus] = useState<ParcelStatus | null>(null);
  const [isInDeliveryWindow, setIsInDeliveryWindow] = useState<boolean>(false);
  const [deliveryToast, setDeliveryToast] = useState<string | null>(null);

  const clearCountdownTimers = () => {
    countdownTimerRef.current.forEach((t) => clearTimeout(t));
    countdownTimerRef.current = [];
  };

  const handleClose = useCallback(() => {
    clearCountdownTimers();
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    sound.dispose();
    onClose?.();
  }, [onClose]);

  const triggerCountdown = useCallback(() => {
    if (!engineRef.current?.beginCountdown()) return;
    clearCountdownTimers();
    setGameState('countdown');
    setCountdown(3);
    sound.playCountdown(3);

    // 2
    const t1 = setTimeout(() => {
      setCountdown(2);
      sound.playCountdown(2);
    }, 900);

    // 1
    const t2 = setTimeout(() => {
      setCountdown(1);
      sound.playCountdown(1);
    }, 1800);

    // GO! (0) & Start ball rolling
    const t3 = setTimeout(() => {
      setCountdown(0);
      sound.playCountdown(0);
      engineRef.current?.startGame();
    }, 2700);

    // Clear countdown overlay immediately after rolling starts so view is unobstructed
    const t4 = setTimeout(() => {
      setCountdown(null);
    }, 3000);

    countdownTimerRef.current = [t1, t2, t3, t4];
  }, []);

  // Keyboard close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  // Mount Three.js Engine inside the card canvas
  useEffect(() => {
    if (!mountRef.current) return;

    // Small delay ensures DOM container clientWidth/clientHeight have computed
    const mountTimeout = setTimeout(() => {
      if (!mountRef.current) return;

      try {
      const engine = new SikkaRunnerEngine(mountRef.current, {
        onPerformanceUpdate: setFps,
        onScoreUpdate: (newScore, newCoins, newDistance, newLives) => {
          setScore(newScore);
          setCoins(newCoins);
          setDistance(newDistance);
          setLives(newLives);
        },
        onForkApproaching: (fork) => {
          setCurrentFork(fork);
        },
        onStateChange: (state) => {
          setGameState(state);
        },
        onRequestCountdown: () => {
          triggerCountdown();
        },
        onParcelChange: (status) => {
          setParcelStatus(status);
          if (status === 'delivered') {
            setDeliveryToast("Parcel Delivered to Bait Al Gahwa! ☕ 'May your path be blessed with cardamom and joy.'");
            countdownTimerRef.current.push(setTimeout(() => setDeliveryToast(null), 5000));
          }
        },
        onDeliveryWindowChange: setIsInDeliveryWindow,
        onGameEnd: (stats) => {
          setGameStats(stats);
          setGameState('ended');
          completeRef.current?.(stats);
        },
      });

      engineRef.current = engine;
      // Force immediate resize calculation for the card wrapper
      engine.handleResize();
      } catch { setEngineError("The 3D arcade could not start. Check WebGL support and reload the page."); }
    }, 30);

    return () => {
      clearTimeout(mountTimeout);
      clearCountdownTimers();
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
      sound.dispose();
    };
  }, [triggerCountdown]);

  const handleReset = () => {
    if(onRestart?.() === false)return;
    clearCountdownTimers();
    setCountdown(null);
    setGameStats(null);
    setTripSaved(false);
    setIsInDeliveryWindow(false);
    setDeliveryToast(null);
    if (engineRef.current) {
      engineRef.current.resetGame();
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sound.setMuted(nextMuted);
  };

  const handleSteerLeft = () => {
    engineRef.current?.steerLeft();
  };

  const handleSteerRight = () => {
    engineRef.current?.steerRight();
  };

  const handleJump = () => {
    if (gameState === 'ready') {
      triggerCountdown();
    } else {
      engineRef.current?.jump();
    }
  };

  return (
    <div className={styles.gameModalBackdrop} onClick={handleClose}>
      <Localized element={"div"} attributes={["aria-label"]} className={styles.gameContainer} role="dialog" aria-modal="true" aria-label="Secret Sikka Run — practice arcade" onClick={(e) => e.stopPropagation()}>
        <p role="status" style={{margin:0,padding:"8px 20px",color:"#d4b271",fontSize:12}}>{engineError || statusMessage} {onRetrySave && <button type="button" onClick={onRetrySave} style={{marginInlineStart:12,textDecoration:"underline"}}><LocalizedText message={"Retry save"} /></button>}</p>
        {/* ── Top Header Bar ── */}
        <div className={styles.gameHeader}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerBadge}>
              <Sparkles size={12} />
              <span><LocalizedText message={"Masar Arcade · UAE Discovery"} /></span>
            </div>
            <div>
              <h3 className={styles.headerTitle}><LocalizedText message={"Al Fahidi Secret Sikka Run"} /></h3>
              <p className={styles.headerSubtitle}><LocalizedText message={promotional ? "Daily challenge · earn Daily Challenge Coins for your Passport" : "Practice arcade · stylised district · virtual coins · no Passport XP"} /></p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" aria-label={quality === 'sharp' ? 'Graphics: Sharp. Switch to Fast' : 'Graphics: Fast. Switch to Sharp'}
              onClick={() => { const next = quality === 'sharp' ? 'fast' : 'sharp'; setQuality(next); engineRef.current?.setQuality(next); }}
              style={{background: '#243530', border: '1px solid #587166', borderRadius: 6, color: '#eee5cf', padding: '6px 9px', cursor: 'pointer'}}>
              <LocalizedText>{quality === 'sharp' ? 'Sharp' : 'Fast'}</LocalizedText>
            </button>
            <span style={{fontSize: 12, color: '#cbd5e1', fontVariantNumeric: 'tabular-nums'}}>{fps > 0 ? `${fps} FPS` : '— FPS'}</span>
            <Localized element={"button"} attributes={["title"]}
              type="button"
              className={styles.closeButton}
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </Localized>

            {onClose && (
              <Localized element={"button"} attributes={["title"]}
                type="button"
                className={styles.closeButton}
                onClick={handleClose}
                title="Close Arcade (Esc)"
              >
                <X size={18} />
              </Localized>
            )}
          </div>
        </div>

        {/* ── 3D Canvas Stage ── */}
        <div className={`${styles.canvasWrapper} ${promotional && gameState === 'ended' ? styles.dailyCanvasResult : ''}`}>
          {/* Isolated Three.js Canvas Container */}
          <div ref={mountRef} className={styles.threeCanvasContainer} style={gameState === 'ended' ? {visibility:'hidden'} : undefined} />

          {/* Compact carry confirmation stays away from lane controls and fork prompts. */}
          <div className={styles.parcelLiveStatus} role="status" aria-live="polite">
            <LocalizedText>{parcelStatus === 'carrying' ? 'Parcel collected from the textile merchant.' : ''}</LocalizedText>
            <LocalizedText>{parcelStatus === 'delivered' ? 'Parcel delivered to Bait Al Gahwa.' : ''}</LocalizedText>
          </div>

          {deliveryToast && (
            <div className={styles.deliveryToast} role="status">
              <span className={styles.deliveryToastIcon}>☕</span>
              <div>
                <strong><LocalizedText message={"Parcel Delivered to Bait Al Gahwa!"} /></strong>
                <p><LocalizedText message={"“Blessings of cardamom upon your path! Enjoy fresh coffee at the courtyard.”"} /></p>
              </div>
            </div>
          )}

          {gameState === 'running' && parcelStatus && parcelStatus !== 'missed' && (
            <div className={styles.parcelHud}>
              {parcelStatus === 'delivered' ? (
                <div className={styles.parcelDeliveredPill}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span><LocalizedText message={"Delivered to Bait Al Gahwa"} /></span>
                </div>
              ) : parcelStatus === 'carrying' && isInDeliveryWindow ? (
                <div className={styles.deliveryPrompt}>
                  <Coffee size={18} aria-hidden="true" />
                  <span><LocalizedText message={"Bait Al Gahwa · Coffee Courtyard"} /></span>
                  <button type="button" onClick={() => engineRef.current?.deliverParcel()}><LocalizedText message={"Deliver parcel · E"} /></button>
                </div>
              ) : parcelStatus === 'carrying' ? (
                <>
                  <Package size={18} aria-hidden="true" />
                  <span><LocalizedText message={"Carrying the merchant’s parcel"} /></span>
                </>
              ) : (
                <>
                  <Package size={18} aria-hidden="true" />
                  <span><LocalizedText message={"Textile merchant · Optional favour"} /></span>
                  <button type="button" onClick={() => engineRef.current?.collectParcel()}><LocalizedText message={"Take parcel · E"} /></button>
                </>
              )}
            </div>
          )}

          {/* ── In-Game HUD Overlay ── */}
          {gameState === 'running' && (
            <div className={styles.hudOverlay}>
              <div className={styles.hudTopSection}>
                <div className={styles.hudTopRow}>
                  <div className={styles.statBox}>
                    <span className={styles.statLabel}><LocalizedText message={"Score"} /></span>
                    <span className={styles.statValue}>{score}</span>
                  </div>

                  <div className={styles.statBox}>
                    <span style={{ fontSize: '15px' }}>🪙</span>
                    <span className={styles.statLabel}><LocalizedText message={"Game Coins"} /></span>
                    <span className={styles.statValue}>{coins}</span>
                  </div>

                  <div className={styles.statBox}>
                    <MapPin size={15} color="#10b981" />
                    <span className={styles.statLabel}><LocalizedText message={"Distance"} /></span>
                    <span className={styles.statValue}>{distance}<LocalizedText message={"m"} /></span>
                  </div>

                  <div className={styles.statBox}>
                    <span className={styles.statLabel}><LocalizedText message={"Lives"} /></span>
                    <div className={styles.livesDisplay}>
                      {[1, 2, 3].map((h) => (
                        <Heart
                          key={h}
                          size={16}
                          className={h <= lives ? styles.heartIcon : styles.heartLost}
                          fill={h <= lives ? '#ef4444' : 'none'}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sikka Fork Approaching Banner - Moved to top so road remains 100% visible */}
                {currentFork && (
                  <div className={styles.junctionPrompt}>
                    <span className={styles.junctionTitle}><LocalizedText message={"⚡ Fork Ahead — Steer to choose:"} /></span>
                    <div className={styles.junctionOptions}>
                      <div className={styles.optionLeft}>
                        <ArrowLeft size={14} color="#f59e0b" />
                        <span>{currentFork.leftIcon} {currentFork.leftChoice}</span>
                      </div>
                      <span className={styles.junctionDivider}>·</span>
                      <div className={styles.optionRight}>
                        <span>{currentFork.rightChoice} {currentFork.rightIcon}</span>
                        <ArrowRight size={14} color="#f59e0b" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Touch / Click On-Screen Controls */}
              <div className={styles.mobileControls}>
                <div className={styles.dpadGroup}>
                  <Localized element={"button"} attributes={["title"]}
                    type="button"
                    className={styles.ctrlBtn}
                    onClick={handleSteerLeft}
                    title="Steer Left (A / Left Arrow)"
                  >
                    <ArrowLeft size={24} />
                  </Localized>
                  <Localized element={"button"} attributes={["title"]}
                    type="button"
                    className={styles.ctrlBtn}
                    onClick={handleSteerRight}
                    title="Steer Right (D / Right Arrow)"
                  >
                    <ArrowRight size={24} />
                  </Localized>
                </div>

                <Localized element={"button"} attributes={["title"]}
                  type="button"
                  className={styles.jumpBtn}
                  onClick={handleJump}
                  title="Jump (Space / Up Arrow)"
                >
                  <Zap size={22} />
                  <span><LocalizedText message={"JUMP"} /></span>
                </Localized>
              </div>
            </div>
          )}

          {/* ── 3-2-1 Countdown Overlay ── */}
          {countdown !== null && (
            <div className={styles.countdownOverlay}>
              <div className={styles.countdownRing}>
                <span className={styles.countdownNumber}>
                  <LocalizedText>{countdown > 0 ? countdown : 'GO!'}</LocalizedText>
                </span>
                <span className={styles.countdownLabel}>
                  <LocalizedText>{countdown > 0
                    ? countdown === 3
                      ? 'Ready'
                      : countdown === 2
                      ? 'Set'
                      : 'Roll!'
                    : 'Unleashed!'}</LocalizedText>
                </span>
              </div>
            </div>
          )}

          {/* ── Start / Ready Screen ── */}
          {gameState === 'ready' && countdown === null && (
            <div className={styles.startScreen}>
              <span className={styles.chapterLabel}><LocalizedText message={"01 / THE TEXTILE QUARTER"} /></span>
              <h2 className={styles.startTitle}><LocalizedText message={"Al Fahidi,"} /><br /><em><LocalizedText message={"at dusk."} /></em></h2>
              <p className={styles.startSubtitle}><LocalizedText message={"A parcel of silk. A cup of gahwa. Find your way through the evening souq."} /></p>

              <div className={styles.instructionKeys}>
                <div className={styles.keyChip}>
                  <span className={styles.kbd}><LocalizedText message={"A"} /></span> / <span className={styles.kbd}><LocalizedText message={"D"} /></span>
                  <span><LocalizedText message={"Steer Lanes"} /></span>
                </div>
                <div className={styles.keyChip}>
                  <span className={styles.kbd}><LocalizedText message={"SPACE"} /></span> / <span className={styles.kbd}><LocalizedText message={"W"} /></span>
                  <span><LocalizedText message={"Jump Obstacle"} /></span>
                </div>
              </div>

              {parcelStatus && (
                <div className={styles.parcelOffer}>
                  <Package size={22} aria-hidden="true" />
                  <div>
                    <strong><LocalizedText>{parcelStatus === 'carrying' ? 'The merchant’s parcel is with you.' : 'The textile merchant has a favour.'}</LocalizedText></strong>
                    <p><LocalizedText>{parcelStatus === 'carrying'
                      ? 'Parcel collected from the textile merchant. Ready when you are.'
                      : '“This silk is for the coffee host down the lane. Going that way?” An optional detour.'}</LocalizedText></p>
                  </div>
                  {parcelStatus === 'available' && (
                    <button type="button" onClick={() => engineRef.current?.collectParcel()}><LocalizedText message={"Take parcel · E"} /></button>
                  )}
                </div>
              )}

              <button
                type="button"
                className={styles.launchButton}
                onClick={triggerCountdown}
              >
                <Play size={18} fill="currentColor" />
                <span><LocalizedText message={"Enter the souq"} /></span>
              </button>
            </div>
          )}

          {/* ── Grand Destination Reveal Modal ── */}
          {gameState === 'ended' && gameStats && promotional && (
            <SikkaDailyResult stats={gameStats} result={dailyResult} destinationSaved={destinationSaved} shortlistMessage={shortlistMessage} onSaveDestination={() => onPlanVisit?.(gameStats.destination)} onRetry={handleReset} onRetrySave={onRetrySave} onClose={handleClose} />
          )}
          {gameState === 'ended' && gameStats && !promotional && (
            <div className={styles.revealStage}>
              <div className={styles.revealHeader}>
                <div className={styles.ahaBadge}>
                  <Sparkles size={13} />
                  <span><LocalizedText message={"UAE Destination Unlocked!"} /></span>
                </div>
                <h2 className={styles.revealTitle}>
                  {gameStats.destination.title}
                </h2>
                <p className={styles.revealSubtitle} style={{ fontFamily: 'Amiri, serif' }} dir="rtl">
                  {gameStats.destination.arabicTitle}
                </p>
              </div>

              <div className={styles.revealBodyGrid}>
                {/* Real Heritage Photo & Lore */}
                <div className={styles.panoramaCard}>
                  <div className={styles.cardHeaderBar}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Compass size={14} color="#fbbf24" />
                      <span>{gameStats.destination.category}</span>
                    </div>
                    <span>{gameStats.destination.recommendedTime}</span>
                  </div>
                  <div className={styles.panoramaImgWrapper}>
                    <Localized element={"img"} attributes={["alt"]}
                      src="/time-travel/al-fahidi-present.jpg"
                      alt={gameStats.destination.title}
                      className={styles.panoramaImg}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className={styles.loreContent}>
                    <p className={styles.loreText}>
                      <LocalizedText>{gameStats.destination.description}</LocalizedText>
                    </p>
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '10px 12px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        borderInlineStart: '3px solid #f59e0b',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#fef08a',
                      }}
                    >
                      <strong><LocalizedText message={"Emirati Heritage Insight:"} /></strong> {gameStats.destination.heritageFact}
                    </div>
                  </div>
                </div>

                {/* Pathway & Coordinates */}
                <div className={styles.panoramaCard}>
                  <div className={styles.cardHeaderBar}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} color="#10b981" />
                      <span><LocalizedText message={"Sikka Navigation Graph"} /></span>
                    </div>
                    <span>📍 {gameStats.destination.coordinates}</span>
                  </div>
                  <div className={styles.loreContent} style={{ padding: '16px' }}>
                    <p className={styles.loreText} style={{ marginBottom: '12px' }}>
                      <strong><LocalizedText message={"Route Choices Made:"} /></strong>{' '}
                      <LocalizedText>{gameStats.visitedForks.length > 0
                        ? gameStats.visitedForks.join(' ➔ ')
                        : 'Grand Sikka Main Corridor'}</LocalizedText>
                    </p>
                    <div
                      style={{
                        height: '140px',
                        background: 'rgba(0,0,0,0.4)',
                        borderRadius: '12px',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="100%" height="100%" viewBox="0 0 300 100">
                        <path
                          d="M 20 50 Q 80 20, 150 60 T 280 50"
                          stroke="#f59e0b"
                          strokeWidth="3"
                          fill="none"
                          strokeDasharray="6 4"
                        />
                        <circle cx="20" cy="50" r="5" fill="#3b82f6" />
                        <circle cx="280" cy="50" r="7" fill="#10b981" />
                      </svg>
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '12px',
                          fontSize: '11px',
                          color: '#94a3b8',
                        }}
                      ><LocalizedText message={"⟦0⟧m traversed"} values={[gameStats.distance]} /></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Score Deck & Actions */}
              <div className={styles.scoreSummaryDeck}>
                {gameStats.deliveryCard ? (
                  <div className={styles.deliveryCardSummary}>
                    <Award size={20} className={styles.storyCardIcon} />
                    <div className={styles.deliveryCardText}>
                      <span className={styles.deliveryCardBadge}><LocalizedText message={"Story Card Unlocked"} /></span>
                      <strong>{gameStats.deliveryCard.title}</strong>
                      <p><LocalizedText>{gameStats.deliveryCard.description}</LocalizedText></p>
                    </div>
                  </div>
                ) : parcelStatus === 'carrying' ? (
                  <div className={styles.parcelSummary}>
                    <Package size={16} /><LocalizedText message={" Textile merchant’s parcel carried"} /></div>
                ) : null}
                <div className={styles.scorePills}>
                  <div className={styles.scorePill}>
                    <span><LocalizedText message={"Final Score"} /></span>
                    <strong>{gameStats.score}</strong>
                  </div>
                  <div className={styles.scorePill}>
                    <span><LocalizedText message={"Game Coins"} /></span>
                    <strong style={{ color: '#fbbf24' }}>{gameStats.coins}</strong>
                  </div>
                  <div className={styles.scorePill}>
                    <span><LocalizedText message={"Distance"} /></span>
                    <strong style={{ color: '#10b981' }}>{gameStats.distance}<LocalizedText message={"m"} /></strong>
                  </div>
                </div>

                <div className={styles.actionButtonGroup}>
                  <button
                    type="button"
                    className={styles.leaderboardBtn}
                    onClick={handleReset}
                  >
                    <RotateCcw size={16} />
                    <span><LocalizedText message={"Replay Run"} /></span>
                  </button>

                  <button
                    type="button"
                    className={styles.planVisitBtn}
                    onClick={() => {
                      if (onPlanVisit?.(gameStats.destination) !== false && onPlanVisit) {
                        setTripSaved(true);
                        handleClose();
                      }
                    }}
                  >
                    <MapPin size={16} />
                    <span><LocalizedText>{tripSaved ? 'Added to Trip!' : 'Add Al Fahidi to my shortlist'}</LocalizedText></span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Localized>
    </div>
  );
}

export default MasarArcadeRun;
