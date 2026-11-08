'use client';
import {useI18n} from '@/i18n/LocaleProvider';

import {Localized,LocalizedText} from '@/i18n/Localized';


import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {

  Clock,
  Calendar,
  MapPin,
  ArrowRight,
  Award,
  CheckCircle2,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTrips } from '@/hooks/useTrips';
import {
  findActiveOrUpcomingTrip,
  formatDubaiTime,
  getDubaiNow
} from '@/utils/dubaiDate';
import { getActivityImage, getActivityCategory } from '@/utils/destinationImages';
import { isLandmarkChallenge } from '@/lib/tripWorkspace';
import ChallengePreviewModal from '@/components/trips/workspace/ChallengePreviewModal';

export default function TodayJourneyWidget() {
 const {locale:uiLocale}=useI18n();

  const { user } = useAuth();
  const { trips, loading } = useTrips();
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [selectedActiveIndex, setSelectedActiveIndex] = useState(0);
  const [previewChallenge, setPreviewChallenge] = useState(null);

  // Live Dubai Clock
  useEffect(() => {
    const updateClock = () => {
      setCurrentTimeStr(formatDubaiTime(new Date(), uiLocale));
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, [uiLocale]);

  const tripData = useMemo(() => {
    if (!trips || trips.length === 0) return null;
    return findActiveOrUpcomingTrip(trips, getDubaiNow());
  }, [trips]);

  if (loading || !user) return null;

  // Case 1: Active Trip Ongoing Today in UAE
  if (tripData?.type === 'active_today') {
    const activeEntries = tripData.allActive || [tripData.primary];
    const currentEntry = activeEntries[selectedActiveIndex] || activeEntries[0];
    const { trip, status } = currentEntry;
    const activeDay = status.activeDay;
    const activities = activeDay?.activities || [];

    return (
      <div
        style={{
          margin: '0 0 32px 0',
          borderRadius: '22px',
          background: 'linear-gradient(135deg, rgba(20, 26, 40, 0.75) 0%, rgba(12, 16, 26, 0.85) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          padding: '24px 28px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(245, 158, 11, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Glow accent */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />

        {/* Top Meta Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--color-accent-gold)',
                background: 'rgba(245, 158, 11, 0.15)',
                padding: '4px 12px',
                borderRadius: '99px',
                border: '1px solid rgba(245, 158, 11, 0.35)'
              }}
            >
              <Sparkles size={12} /><LocalizedText message={" TODAY IN THE UAE · DAY 0"} />{status.dayNumber}
            </span>

            {currentTimeStr && (
              <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={13} /> {currentTimeStr}<LocalizedText message={" (GST)"} /></span>
            )}
          </div>

          {/* Overlapping Trips Selector */}
          {activeEntries.length > 1 && (
            <select
              value={selectedActiveIndex}
              onChange={(e) => setSelectedActiveIndex(Number(e.target.value))}
              style={{
                background: 'rgba(15, 20, 30, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#e2e8f0',
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {activeEntries.map((entry, idx) => (
                <option key={entry.trip.id} value={idx}>
                  {entry.trip.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Content Heading */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '18px'
          }}
        >
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#f8fafc' }}>
              <LocalizedText>{activeDay?.theme || activeDay?.title || 'Today’s Curated Journey'}</LocalizedText>
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', maxWidth: '620px', lineHeight: 1.5 }}>
              <LocalizedText>{activeDay?.description || `Live companion for ${trip.title}. ${activities.length} stops scheduled for today.`}</LocalizedText>
            </p>
          </div>

          <Link
            href={`/trips/${trip.id}?day=${status.dayIndex}`}
            className="journey-btn gold"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          ><LocalizedText message={"Open Today’s Workspace "} /><ArrowRight size={15} />
          </Link>
        </div>

        {/* Today's Stops Preview Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '14px',
            marginTop: '16px'
          }}
        >
          {activities.slice(0, 3).map((act, idx) => {
            const thumbUrl = getActivityImage(act, status.dayIndex, idx);
            const category = getActivityCategory(act);
            const challenge = activities.find(a=>isLandmarkChallenge(a))?.id===act.id ? isLandmarkChallenge(act) : null;
            const isVisited = act.status === 'visited';

            return (
              <div
                key={act.id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '10px 12px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '52px',
                    borderRadius: '10px',
                    backgroundImage: `url(${thumbUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    flexShrink: 0,
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-accent-gold)' }}>
                      <LocalizedText>{act.time || 'Today'}</LocalizedText>
                    </span>
                    {isVisited && (
                      <span style={{ fontSize: '9px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <CheckCircle2 size={10} /><LocalizedText message={" Done"} /></span>
                    )}
                  </div>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {act.title}
                  </h4>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    <LocalizedText>{category.label}</LocalizedText>
                  </span>
                </div>

                {challenge && (
                  <Localized element={"button"} attributes={["title"]}
                    type="button"
                    onClick={() => setPreviewChallenge({...challenge,tripId:trip.id})}
                    style={{
                      background: 'rgba(245, 158, 11, 0.2)',
                      border: '1px solid rgba(245, 158, 11, 0.5)',
                      color: '#fbbf24',
                      borderRadius: '8px',
                      padding: '6px',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                    title={`Preview 3D simulation for ${challenge.name}`}
                  >
                    <Award size={15} />
                  </Localized>
                )}
              </div>
            );
          })}
        </div>

        {/* 3D Challenge Modal if launched from widget */}
        <ChallengePreviewModal
          challenge={previewChallenge}
          isOpen={!!previewChallenge}
          onClose={() => setPreviewChallenge(null)}
        />
      </div>
    );
  }

  // Case 2: Upcoming Trip Countdown
  if (tripData?.type === 'upcoming') {
    const { trip, status } = tripData.primary;
    return (
      <div
        style={{
          margin: '0 0 10px 0',
          borderRadius: '12px',
          background: 'rgba(15, 20, 30, 0.65)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: 'var(--color-accent-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Calendar size={15} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--color-accent-gold)', textTransform: 'uppercase' }}><LocalizedText message={"UPCOMING JOURNEY"} /></span>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}><LocalizedText message={"Starts in ⟦0⟧ day⟦1⟧ (⟦2⟧)"} values={[status.daysUntil,status.daysUntil === 1 ? '' : 's',status.startDateStr]} /></span>
            </div>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
              {trip.title}
            </h4>
          </div>
        </div>

        <Link
          href={`/trips/${trip.id}`}
          className="journey-btn subtle small"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 11px', fontSize: '11px' }}
        ><LocalizedText message={"View Workspace "} /><ChevronRight size={13} />
        </Link>
      </div>
    );
  }

  return null;
}
