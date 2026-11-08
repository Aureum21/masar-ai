'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const SikkaExperience = dynamic(() => import('@/components/game/SikkaExperience'), {ssr:false});
import { useRouter } from 'next/navigation';
import { 
  Award, 
  Sparkles, 
  Gamepad2, 
  MapPin, 
  Clock, 
  ArrowRight, 
  Play, 
  X, 
  CheckCircle2, 
  Trophy, 
  Layers,
  ChevronRight,
  Maximize2,
  Gift,
  History,
  Lock,
  Unlock,
  Navigation,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import JourneyShell from '@/components/layout/JourneyShell';
import MasarPageHeader from '@/components/layout/MasarPageHeader';
import NotificationBell from '@/components/notifications/NotificationBell';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { useTrips } from '@/hooks/useTrips';
import { useTripDraft } from '@/hooks/useTripDraft';
import { EXPLORE_PLACES } from '@/data/exploreData';
import { passportRequest, notifyPassportChanged } from '@/app/profile/_lib/passportApi';
import ChallengePreviewModal from '@/components/trips/workspace/ChallengePreviewModal';
import './game-theme.css';

// Haversine formula to compute distance in meters between two GPS coordinates
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

const CULTURAL_GAMES = [
  {
    id: 'sikka-run',
    level: 1,
    title: 'Secret Sikka Run',
    subtitle: 'Al Fahidi arcade expedition',
    category: 'heritage',
    tag: 'Level 1 · Al Fahidi 3D Runner',
    xp: 50,
    difficulty: 'Keyboard / Touch',
    image: '/attraction-photos/al-fahidi.webp',
    landmarks: ['Al Fahidi Historical Neighborhood', 'Wind Towers', 'Gahwa Courtyard'],
    landmarkLocation: 'Al Fahidi Historical District, Dubai',
    coordinates: { lat: 25.2631, lng: 55.2972 },
    radiusMeters: 2500, // 2.5km geofence radius
    accentColor: '#D4B271'
  },
  {
    id: 'landmark-puzzle',
    level: 2,
    title: 'Piece by place',
    subtitle: 'UAE Landmark Jigsaw Collection',
    category: 'discovery',
    tag: 'Level 2 · Downtown Jigsaw Puzzle',
    xp: 65,
    difficulty: 'Easy / Medium / Hard',
    image: '/attraction-photos/burj-khalifa.webp',
    landmarks: ['Burj Khalifa', 'Downtown Dubai', 'Grand Mosque', 'Museum of the Future'],
    landmarkLocation: 'Burj Khalifa & Downtown Dubai',
    coordinates: { lat: 25.1972, lng: 55.2744 },
    radiusMeters: 2500,
    accentColor: '#F59E0B'
  },
  {
    id: 'tourist-arcade',
    level: 3,
    title: 'The Lost Compass',
    subtitle: 'Al Seef & Creek Promenade Expedition',
    category: 'heritage',
    tag: 'Level 3 · Creek Exploration Arcade',
    xp: 80,
    difficulty: 'Expedition / Relaxed',
    image: '/attraction-photos/al-seef-creek.webp',
    landmarks: ['Al Seef Creek', 'Al Fahidi Wind Towers', 'Creek Promenade'],
    landmarkLocation: 'Al Seef Promenade & Dubai Creek',
    coordinates: { lat: 25.2608, lng: 55.3045 },
    radiusMeters: 2500,
    accentColor: '#38BDF8'
  },
  {
    id: 'ball-roll',
    level: 4,
    title: 'Golden Roll',
    subtitle: 'Heritage Trail & Lore Quiz',
    category: 'adventure',
    tag: 'Level 4 · Shindagha Physics & Lore',
    xp: 100,
    difficulty: '3 Chapters',
    image: '/attraction-photos/al-shindagha.webp',
    landmarks: ['Al Bastakiya', 'Heritage Village', 'Dhow Yards'],
    landmarkLocation: 'Al Shindagha Heritage Village, Dubai',
    coordinates: { lat: 25.2678, lng: 55.2897 },
    radiusMeters: 2500,
    accentColor: '#10B981'
  },
  {
    id: 'mleiha-desert',
    level: 5,
    title: 'Mleiha Sands & Tombs',
    subtitle: 'Sharjah Desert Archaeology Expedition',
    category: 'heritage',
    tag: 'Level 5 · Sharjah Desert Frontier',
    xp: 120,
    difficulty: 'Desert Expedition',
    image: '/attraction-photos/mleiha-archaeological-centre.webp',
    landmarks: ['Mleiha Archaeological Centre', 'Fossil Rock', 'Bronze Age Tomb'],
    landmarkLocation: 'Mleiha Archaeological Centre, Sharjah',
    coordinates: { lat: 25.1263, lng: 55.8525 },
    radiusMeters: 2500,
    accentColor: '#EAB308'
  },
  {
    id: 'jazirah-al-hamra',
    level: 6,
    title: 'Al Jazirah Al Hamra',
    subtitle: 'Preserved Ancient Pearl Village',
    category: 'heritage',
    tag: 'Level 6 · Historic Coral Village',
    xp: 140,
    difficulty: 'Historic Trail',
    image: '/attraction-photos/al-jazirah-al-hamra.webp',
    landmarks: ['Al Jazirah Al Hamra Old Town', 'Coral Stone Houses', 'Wind Tower Fort'],
    landmarkLocation: 'Al Jazirah Al Hamra, Ras Al Khaimah',
    coordinates: { lat: 25.7103, lng: 55.7936 },
    radiusMeters: 2500,
    accentColor: '#F97316'
  },
  {
    id: 'dhayah-fort',
    level: 7,
    title: 'Dhayah Mountain Fort',
    subtitle: 'Hilltop Bastion & Palm Oasis',
    category: 'adventure',
    tag: 'Level 7 · 16th-Century Hilltop Citadel',
    xp: 160,
    difficulty: 'Hilltop Climb',
    image: '/attraction-photos/dhayah-fort.webp',
    landmarks: ['Dhayah Hilltop Fort', 'Hajar Mountain Ridge', 'Date Palm Oasis'],
    landmarkLocation: 'Dhayah Fort, Ras Al Khaimah',
    coordinates: { lat: 25.8828, lng: 56.0603 },
    radiusMeters: 2500,
    accentColor: '#EF4444'
  },
  {
    id: 'al-bidya-mosque',
    level: 8,
    title: 'Al Bidya Sanctuary',
    subtitle: 'Oldest Surviving UAE Mosque (1446 AD)',
    category: 'heritage',
    tag: 'Level 8 · 15th-Century Ottoman Stone',
    xp: 180,
    difficulty: 'Sacred Heritage',
    image: '/attraction-photos/al-bidya-mosque.webp',
    landmarks: ['Al Bidya Ancient Mosque', 'Four Mud Domes', 'Watchtower Hill'],
    landmarkLocation: 'Al Bidya, Fujairah',
    coordinates: { lat: 25.4394, lng: 56.3536 },
    radiusMeters: 2500,
    accentColor: '#06B6D4'
  },
  {
    id: 'al-bithnah-fort',
    level: 9,
    title: 'Al Bithnah Citadel',
    subtitle: 'Wadi Ham Mountain Gateway',
    category: 'adventure',
    tag: 'Level 9 · Hajar Mountain Pass Fortress',
    xp: 200,
    difficulty: 'Mountain Pass',
    image: '/attraction-photos/al-bithnah-fort.webp',
    landmarks: ['Al Bithnah Fort', 'Wadi Ham Pass', 'Hajar Mountain Valley'],
    landmarkLocation: 'Al Bithnah, Fujairah',
    coordinates: { lat: 25.1878, lng: 56.2361 },
    radiusMeters: 2500,
    accentColor: '#8B5CF6'
  }
];

export default function ChallengesPage() {
  return (
    <ProtectedRoute>
      <ChallengesContent />
    </ProtectedRoute>
  );
}

function ChallengesContent() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { trips } = useTrips();
  const {draft,update:updateDraft}=useTripDraft();

  const [activeTab, setActiveTab] = useState('games'); // 'games' | 'quests'
  const [activeGame, setActiveGame] = useState(null);
  const [previewChallenge, setPreviewChallenge] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [destinationNotice, setDestinationNotice] = useState('');

  // Location Proof modal state
  const [verifyingGame, setVerifyingGame] = useState(null);

  // Level Progression State (lazy initialized from localStorage)
  const [progression, setProgression] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('masar_challenge_level_progression');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.highestUnlockedLevel === 'number') {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Could not load challenge progression:', e);
      }
    }
    return {
      highestUnlockedLevel: 1, // Only Level 1 is open by default
      verifiedLocations: {},
      completedLevels: {}
    };
  });

  const saveProgression = (updater) => {
    setProgression(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem('masar_challenge_level_progression', JSON.stringify(next));
      } catch (e) {
        console.warn('Could not save challenge progression:', e);
      }
      return next;
    });
  };

  const handleVerifyLocation = (gameId, proofData) => {
    saveProgression(prev => ({
      ...prev,
      verifiedLocations: {
        ...prev.verifiedLocations,
        [gameId]: proofData
      }
    }));
  };

  const handleUnlockNextLevel = useCallback((completedGameId) => {
    const currentGame = CULTURAL_GAMES.find(g => g.id === completedGameId);
    const currentLevel = currentGame?.level || 1;

    saveProgression(prev => ({
      ...prev,
      completedLevels: {
        ...prev.completedLevels,
        [completedGameId]: { completedAt: new Date().toISOString() }
      },
      highestUnlockedLevel: Math.min(CULTURAL_GAMES.length, Math.max(prev.highestUnlockedLevel, currentLevel + 1))
    }));
  }, []);

  // Active trips that have challenges enabled
  const tripsWithChallenges = (trips || []).filter(t => t.challenges_enabled);

  const handleOpenGame = (game) => {
    const isUnlocked = (game.level || 1) <= progression.highestUnlockedLevel;
    if (!isUnlocked) {
      alert(`Level ${game.level} is locked! Complete Level ${game.level - 1} and verify your arrival location to unlock.`);
      return;
    }
    setActiveGame(game);
    setGameResult(null);
  };

  const handleCloseGame = () => {
    setActiveGame(null);
  };

  const handleGameComplete = useCallback(async (gameId, scoreData, sessionId) => {
    try {
      const response = await passportRequest(token, `/games/${gameId}/complete`, {
        method: 'POST',
        body: {
          session_id: sessionId,
          elapsed_seconds: Math.max(0,Math.round(scoreData.elapsedSeconds || scoreData.time || 0)),
          score: Math.max(0,Math.round(scoreData.score || scoreData.points || 0)),
          mode: scoreData.mode || 'normal',
          details: scoreData
        }
      });
      setGameResult(response);
      notifyPassportChanged();
      // Unlock next level upon completion!
      handleUnlockNextLevel(gameId);
    } catch(error) {
      setGameResult({message:'Practice result could not be saved: '+error.message});
      // Even if offline, advance local level progression
      handleUnlockNextLevel(gameId);
    }
  },[token, handleUnlockNextLevel]);

  const handleDestinationSelect = useCallback((destination) => {
    if(!destination)return false;
    const name=destination.name || destination.title || destination.destination || '';
    const aliases={'Al Seef':'old-dubai-heritage','Al Fahidi':'old-dubai-heritage'};
    const place=EXPLORE_PLACES.find(p=>p.id===(destination.id || destination.slug || aliases[name]) || p.title===name);
    if(!place){setDestinationNotice('Open Explore to select '+name+'; no supported shortlist identity was found.');return false;}
    if(!draft.selections.some(item=>item.id===place.id)&&draft.selections.length>=30){setDestinationNotice('Your shortlist is full. Remove a place before adding this destination.');return false;}
    const saved=updateDraft(previous=>({...previous,savedAt:null,selections:previous.selections.some(s=>s.id===place.id)?previous.selections:[...previous.selections,{id:place.id,priority:'optional'}]}));
    setDestinationNotice(saved?`${place.title} saved to your trip shortlist.`:'Could not save this destination. Check your sign-in and storage.');
    return saved;
  },[updateDraft,draft]);

  return (
    <JourneyShell hideTopbar>
      <div className="journey-scroll">
        <div className="masar-topbar-frame">
          <Localized element={MasarPageHeader} attributes={["breadcrumbSection","title","subtitle","issueMotto"]}
            topbarOnly={true}
            breadcrumbSection="CHALLENGES & PLAY"
            breadcrumbHref="/challenges"
            title={null}
            subtitle={null}
            issueMotto={null}
            topRightActions={
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <NotificationBell />
                <Link href="/time-travel" className="journey-btn small"><History size={14}/><LocalizedText message={" Time Travel"} /></Link>
                <Link href="/rewards/redeem" className="journey-btn gold small" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Gift size={14} />
                  <span><LocalizedText message={"Reward wallet"} /></span>
                </Link>
              </div>
            }
          />
        </div>

        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 30px 60px' }}>
          {/* Header Banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '28px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F59E0B', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '8px' }}>
                <Sparkles size={14} />
                <span><LocalizedText message={"EXPEDITIONS & CULTURAL PLAY"} /></span>
              </div>
              <h1 style={{ fontSize: 'var(--masar-page-title-size)', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: '0 0 10px' }}><LocalizedText message={"Challenges & Cultural Play"} /></h1>
              <p style={{ color: '#94A3B8', fontSize: '15px', maxWidth: '680px', lineHeight: 1.6, margin: 0 }}>
                <LocalizedText message={"Complete levels sequentially by proving your arrival at real-world UAE landmarks with GPS check-in to unlock the next challenge."} />
              </p>
            </div>

            {/* Tab Navigation */}
            <div style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '4px',
              gap: '6px'
            }}>
              <button
                type="button"
                onClick={() => setActiveTab('games')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  borderRadius: '9px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: activeTab === 'games' ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : 'transparent',
                  color: activeTab === 'games' ? '#0A0B0E' : '#94A3B8',
                  boxShadow: activeTab === 'games' ? '0 2px 10px rgba(245, 158, 11, 0.35)' : 'none'
                }}
              >
                <Gamepad2 size={15} />
                <span><LocalizedText message={"Level Challenges"} /></span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('quests')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  borderRadius: '9px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: activeTab === 'quests' ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : 'transparent',
                  color: activeTab === 'quests' ? '#0A0B0E' : '#94A3B8',
                  boxShadow: activeTab === 'quests' ? '0 2px 10px rgba(245, 158, 11, 0.35)' : 'none'
                }}
              >
                <Award size={15} />
                <span><LocalizedText message={"Itinerary Quests"} /></span>
              </button>
            </div>
          </div>

          {destinationNotice && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.5)',
              color: '#FBBF24',
              padding: '12px 20px',
              borderRadius: '12px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>✦ {destinationNotice}</span>
              <Link href="/explore" style={{ color: '#FFFFFF', textDecoration: 'underline', fontSize: '13px', fontWeight: 600 }}><LocalizedText message={"View in Explore UAE →"} /></Link>
            </div>
          )}

          {/* TAB 1: CULTURAL MINI-GAMES WITH LEVEL LOCKS */}
          {activeTab === 'games' && (
            <Localized element={"section"} attributes={["aria-label"]} aria-label="Cultural mini-games">
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                gap: '24px'
              }}>
                {CULTURAL_GAMES.map((game) => {
                  const isUnlocked = game.level <= progression.highestUnlockedLevel;
                  const isCompleted = Boolean(progression.completedLevels[game.id]);
                  const isLocVerified = Boolean(progression.verifiedLocations[game.id]);
                  const isLocked = !isUnlocked;

                  return (
                    <article
                      key={game.id}
                      style={{
                        background: 'rgba(18, 20, 24, 0.85)',
                        border: isCompleted
                          ? '1px solid rgba(16, 185, 129, 0.4)'
                          : isUnlocked
                            ? '1px solid rgba(245, 158, 11, 0.35)'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.25s ease',
                        position: 'relative',
                        opacity: isLocked ? 0.94 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!isLocked) {
                          e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.55)';
                          e.currentTarget.style.transform = 'translateY(-3px)';
                          e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.5)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isLocked) {
                          e.currentTarget.style.borderColor = isCompleted ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.35)';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }
                      }}
                    >
                      {/* Game Visual Header */}
                      <div style={{ position: 'relative', height: '210px', width: '100%', overflow: 'hidden' }}>
                        <Localized element={"img"} attributes={["alt"]}
                          src={game.image}
                          alt={game.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.4s ease',
                            filter: isLocked ? 'grayscale(15%) brightness(0.92)' : 'none'
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: isLocked ? 'linear-gradient(180deg, rgba(10, 11, 14, 0.05) 0%, rgba(18, 20, 24, 0.35) 100%)' : 'linear-gradient(180deg, rgba(10, 11, 14, 0.15) 0%, rgba(18, 20, 24, 0.95) 100%)'
                        }} />

                        {/* Top Left: Level Badge & Tag */}
                        <div style={{
                          position: 'absolute',
                          top: '16px',
                          left: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <div style={{
                            background: isCompleted ? 'rgba(16, 185, 129, 0.9)' : isUnlocked ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(15, 23, 42, 0.85)',
                            color: isUnlocked ? '#0A0B0E' : '#CBD5E1',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: 800,
                            letterSpacing: '0.04em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                          }}>
                            {isCompleted ? <CheckCircle2 size={12} /> : isUnlocked ? <Unlock size={12} /> : <Lock size={12} />}
                            <span>LEVEL {game.level}</span>
                          </div>

                          <div style={{
                            background: 'rgba(10, 11, 14, 0.75)',
                            backdropFilter: 'blur(8px)',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: game.accentColor,
                            border: `1px solid ${game.accentColor}33`
                          }}>
                            {game.tag}
                          </div>
                        </div>

                        {/* Top Right: Status / Lock Pill */}
                        <div style={{
                          position: 'absolute',
                          top: '16px',
                          right: '16px'
                        }}>
                          {isCompleted ? (
                            <div style={{
                              background: 'rgba(16, 185, 129, 0.25)',
                              backdropFilter: 'blur(8px)',
                              border: '1px solid rgba(16, 185, 129, 0.5)',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 800,
                              color: '#34D399',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <CheckCircle2 size={12} />
                              <span><LocalizedText message={"Completed"} /></span>
                            </div>
                          ) : isLocked ? (
                            <div style={{
                              background: 'rgba(15, 23, 42, 0.85)',
                              backdropFilter: 'blur(8px)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#94A3B8',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Lock size={11} />
                              <span><LocalizedText message={"Locked"} /></span>
                            </div>
                          ) : (
                            <div style={{
                              background: 'rgba(245, 158, 11, 0.2)',
                              backdropFilter: 'blur(8px)',
                              border: '1px solid rgba(245, 158, 11, 0.45)',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 800,
                              color: '#FBBF24',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Sparkles size={11} />
                              <span>+{game.xp} XP Available</span>
                            </div>
                          )}
                        </div>

                        {/* Locked Glass Overlay with Balanced Transparency */}
                        {isLocked && (
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(10, 12, 16, 0.22)',
                            backdropFilter: 'blur(1.5px)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: '#FFFFFF'
                          }}>
                            <div style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(15, 23, 42, 0.55)',
                              border: '1px solid rgba(245, 158, 11, 0.5)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#FBBF24',
                              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.45)'
                            }}>
                              <Lock size={20} />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.02em', textShadow: '0 2px 8px rgba(0, 0, 0, 0.85)' }}>
                              LOCKED · LEVEL {game.level}
                            </span>
                            <span style={{ fontSize: '11px', color: '#CBD5E1', maxWidth: '240px', textAlign: 'center', textShadow: '0 1px 6px rgba(0, 0, 0, 0.95)' }}>
                              Complete Level {game.level - 1} & verify arrival to unlock
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Game Card Content */}
                      <div style={{ padding: '22px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                            <LocalizedText>{game.title}</LocalizedText>
                          </h3>
                        </div>

                        <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, marginBottom: '16px', display: 'block' }}>
                          {game.subtitle}
                        </span>


                        {/* Location Target & Proof Info */}
                        <div style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.07)',
                          borderRadius: '12px',
                          padding: '10px 14px',
                          marginBottom: '18px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#CBD5E1', fontWeight: 600 }}>
                              <MapPin size={13} color="#F59E0B" />
                              <span>{game.landmarkLocation}</span>
                            </div>

                            {isLocVerified ? (
                              <span style={{
                                fontSize: '10.5px',
                                fontWeight: 800,
                                color: '#34D399',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                <CheckCircle2 size={11} />
                                <span>GPS Verified</span>
                              </span>
                            ) : isUnlocked ? (
                              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#FBBF24' }}>
                                GPS Check-in Needed
                              </span>
                            ) : (
                              <span style={{ fontSize: '10.5px', color: '#64748B' }}>
                                Locked
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {game.landmarks.map((l) => (
                              <span
                                key={l}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  border: '1px solid rgba(255, 255, 255, 0.05)',
                                  padding: '2px 7px',
                                  borderRadius: '5px',
                                  fontSize: '10.5px',
                                  color: '#94A3B8'
                                }}
                              >
                                {l}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons: Location Proof & Play Game */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {isLocked ? (
                            <button
                              type="button"
                              disabled
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '12px 20px',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: 700,
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: '#64748B',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                cursor: 'not-allowed'
                              }}
                            >
                              <Lock size={14} />
                              <span>Locked (Complete Level {game.level - 1})</span>
                            </button>
                          ) : (
                            <>
                              {/* Location Verification Button */}
                              <button
                                type="button"
                                onClick={() => setVerifyingGame(game)}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  padding: '10px 16px',
                                  borderRadius: '12px',
                                  fontSize: '12.5px',
                                  fontWeight: 700,
                                  background: isLocVerified 
                                    ? 'rgba(16, 185, 129, 0.12)' 
                                    : 'rgba(245, 158, 11, 0.12)',
                                  border: isLocVerified 
                                    ? '1px solid rgba(16, 185, 129, 0.35)' 
                                    : '1px solid rgba(245, 158, 11, 0.4)',
                                  color: isLocVerified ? '#34D399' : '#FBBF24',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                {isLocVerified ? (
                                  <>
                                    <CheckCircle2 size={13} color="#10B981" />
                                    <span>✓ Location Proof Confirmed</span>
                                  </>
                                ) : (
                                  <>
                                    <Navigation size={13} color="#F59E0B" />
                                    <span>📍 Turn On Location & Prove Presence</span>
                                  </>
                                )}
                              </button>

                              {/* Play Game Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenGame(game)}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  padding: '12px 20px',
                                  borderRadius: '12px',
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  background: isCompleted
                                    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)'
                                    : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                  color: isCompleted ? '#FFFFFF' : '#0A0B0E',
                                  border: isCompleted ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
                                  cursor: 'pointer',
                                  boxShadow: isCompleted ? 'none' : '0 4px 15px rgba(245, 158, 11, 0.25)',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                <Play size={14} fill="currentColor" />
                                <span>{isCompleted ? 'Replay Challenge' : 'Play Level Challenge'}</span>
                              </button>

                              {/* Option to complete level directly once location is verified */}
                              {!isCompleted && isLocVerified && (
                                <button
                                  type="button"
                                  onClick={() => handleUnlockNextLevel(game.id)}
                                  style={{
                                    width: '100%',
                                    padding: '7px 12px',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    backgroundColor: 'transparent',
                                    border: '1px dashed rgba(16, 185, 129, 0.4)',
                                    color: '#34D399',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Complete Level & Unlock Level {game.level + 1} ➔
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </Localized>
          )}

          {/* TAB 2: ITINERARY QUESTS & LANDMARK CHALLENGES */}
          {activeTab === 'quests' && (
            <Localized element={"section"} attributes={["aria-label"]} aria-label="Itinerary quests">
              {tripsWithChallenges.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}><LocalizedText message={"Active Journey Quests"} /></h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                    {tripsWithChallenges.map((trip) => (
                      <div
                        key={trip.id}
                        style={{
                          background: 'rgba(18, 20, 24, 0.85)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '16px',
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 700, letterSpacing: '0.05em' }}><LocalizedText message={"ACTIVE EXPEDITION"} /></span>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', margin: '4px 0' }}>
                              {trip.title}
                            </h3>
                            <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                              {trip.destination}
                            </span>
                          </div>
                          <Link
                            href={`/trips/${trip.id}/challenges`}
                            style={{
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#FBBF24',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span><LocalizedText message={"Open"} /></span>
                            <ArrowRight size={12} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Landmark Highlight Quests */}
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 16px' }}><LocalizedText message={"Signature Landmark Quests"} /></h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                  {/* Museum of the Future */}
                  <div style={{
                    background: 'rgba(18, 20, 24, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ color: '#F59E0B', fontSize: '11px', fontWeight: 700 }}><LocalizedText message={"DUBAI · HERITAGE QUEST"} /></span>
                      <span style={{ color: '#10B981', fontSize: '11px', fontWeight: 700 }}><LocalizedText message={"+60 XP"} /></span>
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 6px' }}><LocalizedText message={"Museum of the Future"} /></h3>
                    <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 16px', lineHeight: 1.5, flex: 1 }}><LocalizedText message={"Photograph the stainless steel calligraphy ring and reflect on innovation poetry from an exterior vantage point."} /></p>
                    <button
                      type="button"
                      onClick={() => setPreviewChallenge({
                        title: 'Museum of the Future · Calligraphy Reflection',
                        landmark: 'Museum of the Future',
                        category: 'heritage'
                      })}
                      style={{
                        padding: '10px 16px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#FFFFFF',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Sparkles size={13} className="gold" />
                      <span><LocalizedText message={"Preview 3D Quest"} /></span>
                    </button>
                  </div>

                  {/* Burj Khalifa */}
                  <div style={{
                    background: 'rgba(18, 20, 24, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ color: '#F59E0B', fontSize: '11px', fontWeight: 700 }}><LocalizedText message={"DOWNTOWN DUBAI · SKYLINE"} /></span>
                      <span style={{ color: '#10B981', fontSize: '11px', fontWeight: 700 }}><LocalizedText message={"+60 XP"} /></span>
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 6px' }}><LocalizedText message={"Burj Khalifa SKY Level 148"} /></h3>
                    <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 16px', lineHeight: 1.5, flex: 1 }}><LocalizedText message={"Capture the skyline horizon at 555m and discover architectural engineering details from the outdoor terrace."} /></p>
                    <button
                      type="button"
                      onClick={() => setPreviewChallenge({
                        title: 'Burj Khalifa · SKY Perspective',
                        landmark: 'Burj Khalifa',
                        category: 'discovery'
                      })}
                      style={{
                        padding: '10px 16px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#FFFFFF',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Sparkles size={13} className="gold" />
                      <span><LocalizedText message={"Preview 3D Quest"} /></span>
                    </button>
                  </div>

                  {/* Sheikh Zayed Grand Mosque */}
                  <div style={{
                    background: 'rgba(18, 20, 24, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ color: '#F59E0B', fontSize: '11px', fontWeight: 700 }}><LocalizedText message={"ABU DHABI · ARCHITECTURE"} /></span>
                      <span style={{ color: '#10B981', fontSize: '11px', fontWeight: 700 }}><LocalizedText message={"+50 XP"} /></span>
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 6px' }}><LocalizedText message={"Sheikh Zayed Grand Mosque"} /></h3>
                    <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 16px', lineHeight: 1.5, flex: 1 }}><LocalizedText message={"Capture the reflective water pool arcade at dusk and study the geometric symmetry of the 82 marble domes."} /></p>
                    <button
                      type="button"
                      onClick={() => setPreviewChallenge({
                        title: 'Sheikh Zayed Mosque · Reflective Arcades',
                        landmark: 'Sheikh Zayed Mosque',
                        category: 'discovery'
                      })}
                      style={{
                        padding: '10px 16px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#FFFFFF',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Sparkles size={13} className="gold" />
                      <span><LocalizedText message={"Preview 3D Quest"} /></span>
                    </button>
                  </div>
                </div>
              </div>
            </Localized>
          )}
        </main>

        {/* Location Proof GPS Check-In Modal */}
        {verifyingGame && (
          <LocationProofModal
            key={verifyingGame.id}
            game={verifyingGame}
            isOpen={Boolean(verifyingGame)}
            onClose={() => setVerifyingGame(null)}
            onVerify={handleVerifyLocation}
            isVerified={Boolean(progression.verifiedLocations[verifyingGame.id])}
          />
        )}

        {/* Interactive Game Player Modal */}
        {activeGame?.id === 'sikka-run' ? <SikkaExperience onClose={() => setActiveGame(null)} onDestinationSelect={handleDestinationSelect}/> : activeGame && (
          <GameHostModal
            game={activeGame}
            onClose={handleCloseGame}
            onComplete={handleGameComplete}
            onDestinationSelect={handleDestinationSelect}
            result={gameResult}
          />
        )}

        {/* 3D Challenge Preview Modal */}
        {previewChallenge && (
          <ChallengePreviewModal
            challenge={previewChallenge}
            isOpen={Boolean(previewChallenge)}
            onClose={() => setPreviewChallenge(null)}
          />
        )}
      </div>
    </JourneyShell>
  );
}

/**
 * Location Proof GPS Verification Modal
 */
function LocationProofModal({ game, isOpen, onClose, onVerify, isVerified }) {
  const [status, setStatus] = useState(isVerified ? 'verified_already' : 'idle');
  const [distance, setDistance] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [userCoords, setUserCoords] = useState(null);

  if (!isOpen || !game) return null;

  const handleGetLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setStatus('error');
      setErrorMessage('Geolocation is not supported by your current browser.');
      return;
    }

    setStatus('locating');
    setErrorMessage('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude, accuracy });

        const distMeters = calculateDistanceMeters(
          latitude,
          longitude,
          game.coordinates.lat,
          game.coordinates.lng
        );
        setDistance(distMeters);

        const radius = game.radiusMeters || 2500;
        if (distMeters <= radius) {
          setStatus('success');
          onVerify?.(game.id, {
            lat: latitude,
            lng: longitude,
            accuracy,
            distanceMeters: Math.round(distMeters),
            verifiedAt: new Date().toISOString(),
            method: 'gps_live'
          });
        } else {
          setStatus('out_of_range');
        }
      },
      (err) => {
        setStatus('error');
        if (err.code === 1) {
          setErrorMessage('Location permission was denied. Please allow location access in your browser settings so we can verify you are there.');
        } else if (err.code === 2) {
          setErrorMessage('Location unavailable. Please make sure your device GPS is turned on.');
        } else {
          setErrorMessage('Location request timed out. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleSimulateCheckIn = () => {
    const dist = 145; // Simulated 145 meters away
    setDistance(dist);
    setStatus('success');
    onVerify?.(game.id, {
      lat: game.coordinates.lat,
      lng: game.coordinates.lng,
      accuracy: 10,
      distanceMeters: dist,
      verifiedAt: new Date().toISOString(),
      method: 'gps_simulated'
    });
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: 'min(92vw, 480px)',
          background: 'linear-gradient(145deg, #161A22 0%, #0E1015 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(245, 158, 11, 0.5)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(245, 158, 11, 0.15)',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#94A3B8',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={16} />
        </button>

        {/* Compass Header Icon */}
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '16px',
          background: status === 'success' || status === 'verified_already' 
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1))' 
            : 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1))',
          border: status === 'success' || status === 'verified_already' 
            ? '1px solid rgba(16, 185, 129, 0.4)' 
            : '1px solid rgba(245, 158, 11, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: status === 'success' || status === 'verified_already' ? '#34D399' : '#FBBF24',
          marginBottom: '16px'
        }}>
          {status === 'success' || status === 'verified_already' ? (
            <ShieldCheck size={28} />
          ) : (
            <Navigation size={28} />
          )}
        </div>

        <span style={{ fontSize: '11px', fontWeight: 800, color: '#F59E0B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          LEVEL {game.level} LOCATION PROOF
        </span>
        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', margin: '4px 0 8px' }}>
          {game.title}
        </h3>
        <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.5, margin: '0 0 20px' }}>
          To prove you are physically here at <strong>{game.landmarkLocation}</strong>, turn on your location to verify your coordinates.
        </p>

        {/* Target Landmark Coordinates Box */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '14px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#94A3B8' }}>Target Landmark:</span>
            <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{game.landmarkLocation}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#94A3B8' }}>Target GPS:</span>
            <span style={{ color: '#FBBF24', fontFamily: 'monospace' }}>
              {game.coordinates.lat.toFixed(4)}° N, {game.coordinates.lng.toFixed(4)}° E
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#94A3B8' }}>Required Radius:</span>
            <span style={{ color: '#CBD5E1' }}>Within {(game.radiusMeters / 1000).toFixed(1)} km</span>
          </div>
        </div>

        {/* Status Feedback Alerts */}
        {status === 'locating' && (
          <div style={{
            padding: '12px',
            borderRadius: '10px',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#FBBF24',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '18px'
          }}>
            <div style={{ width: '14px', height: '14px', border: '2px solid #FBBF24', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span>Connecting to device GPS and acquiring coordinates...</span>
          </div>
        )}

        {(status === 'success' || status === 'verified_already') && (
          <div style={{
            padding: '14px',
            borderRadius: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34D399',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            marginBottom: '18px'
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', marginBottom: '2px' }}>✓ Arrival Verified!</strong>
              <span>
                {distance !== null ? `You are located within ${Math.round(distance)}m of the landmark. Proof verified!` : 'Your location at this landmark has been verified.'}
              </span>
            </div>
          </div>
        )}

        {status === 'out_of_range' && (
          <div style={{
            padding: '14px',
            borderRadius: '12px',
            backgroundColor: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.35)',
            color: '#FDA4AF',
            fontSize: '13px',
            marginBottom: '18px'
          }}>
            <strong style={{ display: 'block', marginBottom: '4px' }}>Location Out of Range</strong>
            <span>
              You are currently {(distance / 1000).toFixed(1)} km away from {game.landmarkLocation}. Arrive at the landmark to prove presence, or use demo check-in below for testing.
            </span>
          </div>
        )}

        {status === 'error' && (
          <div style={{
            padding: '12px',
            borderRadius: '10px',
            backgroundColor: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.35)',
            color: '#FDA4AF',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '18px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Primary Action Button */}
        {status === 'success' || status === 'verified_already' ? (
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '13px 20px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)'
            }}
          >
            ✓ Confirmed · Return to Challenge
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={status === 'locating'}
            style={{
              padding: '13px 20px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: '#0A0B0E',
              fontSize: '13.5px',
              fontWeight: 800,
              border: 'none',
              cursor: status === 'locating' ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.35)'
            }}
          >
            <Navigation size={16} />
            <span>{status === 'locating' ? 'Locating...' : 'Turn Location On & Verify'}</span>
          </button>
        )}

        {/* Simulation / Demo override button for remote/desktop testing */}
        {status !== 'success' && status !== 'verified_already' && (
          <button
            type="button"
            onClick={handleSimulateCheckIn}
            style={{
              marginTop: '10px',
              background: 'transparent',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              padding: '9px',
              fontSize: '11.5px',
              color: '#94A3B8',
              cursor: 'pointer'
            }}
          >
            ✦ Demo Mode: Simulate Presence at {game.landmarkLocation}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Self-contained Game Host Modal that dynamically mounts the selected Masar Experience
 */
function GameHostModal({ game, onClose, onComplete, onDestinationSelect, result }) {
  const {token}=useAuth();
  const callbacks=useRef({onComplete,onDestinationSelect});
  useEffect(()=>{callbacks.current={onComplete,onDestinationSelect};},[onComplete,onDestinationSelect]);
  const containerRef = useRef(null);
  const controllerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let mounted = true;
    const controllerAbort = new AbortController();

    async function mount() {
      if (game.level >= 5) {
        setLoading(false);
        return;
      }
      if (!containerRef.current) return;
      try {
        setLoading(true);
        const session=await passportRequest(token,`/games/${game.id}/sessions`,{method:'POST'});
        if(!mounted)return;
        // Dynamically import from public static experiences
        const { mountMasarExperience } = await import(/* webpackIgnore: true */ '/masar-experiences/components/index.js');
        if (!mounted) return;

        const ctrl = await mountMasarExperience(game.id, containerRef.current, {
          signal: controllerAbort.signal,
          onComplete: (data) => {
            callbacks.current.onComplete?.(game.id,data,session.session_id);
          },
          onDestinationSelect: (dest) => {
            callbacks.current.onDestinationSelect?.(dest);
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
  }, [game.id, game.level, token]);

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        animation: 'masarModalFadeIn 0.25s ease-out',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(8px, 2.5vh, 24px)',
        boxSizing: 'border-box'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: 'min(96vw, 1280px)',
          height: 'min(92vh, 880px)',
          maxHeight: 'calc(100vh - clamp(16px, 5vh, 48px))',
          background: 'radial-gradient(ellipse at 50% 0, rgba(212, 178, 113, 0.10), transparent 65%), #0B0D14',
          borderRadius: '28px',
          border: '1px solid rgba(212, 178, 113, 0.35)',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.85), 0 0 50px rgba(240, 185, 95, 0.15)',
          animation: 'masarModalScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: '#0A0B0E',
              padding: '4px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.05em'
            }}><LocalizedText message={"MASAR PLAY"} /></span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
              <LocalizedText>{game.title}</LocalizedText>
            </h2>
            <span style={{ color: '#94A3B8', fontSize: '13px' }}>· {game.subtitle}</span>
          </div>

          <Localized element={"button"} attributes={["title"]}
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#CBD5E1',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)';
              e.currentTarget.style.color = '#FBBF24';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#CBD5E1';
            }}
            title="Close game (Esc)"
          >
            <X size={18} />
          </Localized>
        </div>

        {result && (
          <div style={{
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
          }}>
            <Trophy size={16} />
            <span><LocalizedText>{result.message}</LocalizedText></span>
          </div>
        )}

        {/* Experience Mounting Stage */}
        <div style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
          {loading && (
            <div style={{ flex: 1, color: '#94A3B8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '14px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                border: '3px solid rgba(245, 158, 11, 0.2)',
                borderTopColor: '#F59E0B',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#CBD5E1' }}><LocalizedText preserveValues={[true]} message={"Preparing ⟦0⟧…"} values={[game.title]} /></span>
            </div>
          )}

          {error && (
            <div style={{ flex: 1, color: '#F87171', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
              <p style={{ margin: 0, fontSize: '14px' }}><LocalizedText>{error}</LocalizedText></p>
              <button
                onClick={onClose}
                className="journey-btn outline small"
              ><LocalizedText message={"Close"} /></button>
            </div>
          )}

          {game.level >= 5 ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px',
              textAlign: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FBBF24'
              }}>
                <MapPin size={28} />
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#F59E0B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  LEVEL {game.level} EXPEDITION
                </span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', margin: '4px 0' }}>
                  {game.title}
                </h3>
                <span style={{ fontSize: '13px', color: '#94A3B8' }}>{game.subtitle}</span>
              </div>

              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '16px 20px',
                width: '100%',
                maxWidth: '420px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                textAlign: 'left',
                fontSize: '12.5px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94A3B8' }}>Target Location:</span>
                  <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{game.landmarkLocation}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94A3B8' }}>Coordinates:</span>
                  <span style={{ color: '#FBBF24', fontFamily: 'monospace' }}>
                    {game.coordinates.lat.toFixed(4)}° N, {game.coordinates.lng.toFixed(4)}° E
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94A3B8' }}>Challenge Reward:</span>
                  <span style={{ color: '#10B981', fontWeight: 700 }}>+{game.xp} XP</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  callbacks.current.onComplete?.(game.id, { score: game.xp, elapsedSeconds: 30 });
                }}
                style={{
                  padding: '12px 28px',
                  borderRadius: '12px',
                  backgroundColor: '#F59E0B',
                  color: '#0A0B0E',
                  fontWeight: 800,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
                }}
              >
                <CheckCircle2 size={16} />
                <span>Complete Expedition Check-in</span>
              </button>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
