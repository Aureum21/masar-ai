'use client';
import {useI18n} from '@/i18n/LocaleProvider';
import {formattingLocale} from '@/i18n/messages.mjs';

import {Localized,LocalizedText} from '@/i18n/Localized';


import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Clock,
  Sparkles,
  Calendar,
  CheckCircle2,
  RotateCcw,
  Check,
  Trash2,
  ChevronUp,
  ChevronDown,
  Award,
  Camera,
  Wallet,
  Feather,
  Edit2,

  Navigation
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import {notifyPassportChanged} from '@/app/profile/_lib/passportApi';
import JourneyShell from '@/components/layout/JourneyShell';
import MasarSelect from '@/components/ui/MasarSelect';
import TripReviewNotes from '@/components/planning/TripReviewNotes';
import '@/components/planning/accessibility.css';
import TripBookingTasks from './TripBookingTasks';
import PlaceTimeTravel from '@/components/trips/PlaceTimeTravel';
import ReservationBudgetCard from './ReservationBudgetCard';
import ChallengePreviewModal from './ChallengePreviewModal';
import ChallengeEvidenceModal from './ChallengeEvidenceModal';
import TripEvidenceStatus from './TripEvidenceStatus';
import {
  reorderActivities,
  moveActivityToDay,
  removeActivity,
  updateActivityStatus,
  makeDayLighter,
  isLandmarkChallenge,
  conditionalBoxingPreview,
  computeTripBudget
} from '@/lib/tripWorkspace';
import {
  getItineraryHeroImage
} from '@/utils/destinationImages';
import {locationLabel} from '@/lib/locationLabel';
import {getCachedTripById} from '@/hooks/useTrips';

const WORKSPACE_TRIP_PREFIX = 'masar_trip_detail_';
const tripWorkspaceMemoryCache = new Map();

function readStoredWorkspaceTrip(token, tripId) {
  if (typeof window === 'undefined' || !token || !tripId) return null;
  try {
    const raw = sessionStorage.getItem(`${WORKSPACE_TRIP_PREFIX}${token}_${tripId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.trip) return parsed.trip;
    }
  } catch (e) {}
  return null;
}

function persistWorkspaceTrip(token, tripId, trip) {
  if (typeof window === 'undefined' || !token || !tripId || !trip) return;
  try {
    sessionStorage.setItem(`${WORKSPACE_TRIP_PREFIX}${token}_${tripId}`, JSON.stringify({
      trip,
      timestamp: Date.now()
    }));
  } catch (e) {}
}

export function getCachedTripWorkspace(token, tripId) {
  if (!token || !tripId) return null;
  const key = `${token}:${tripId}`;
  if (tripWorkspaceMemoryCache.has(key)) {
    return tripWorkspaceMemoryCache.get(key);
  }
  const stored = readStoredWorkspaceTrip(token, tripId);
  if (stored) {
    tripWorkspaceMemoryCache.set(key, stored);
    return stored;
  }
  const listTrip = getCachedTripById(token, tripId);
  if (listTrip) {
    return listTrip;
  }
  return null;
}

import {getTripActivityImage,getTripActivityCategory} from '@/utils/tripActivityImages';
import './trip-workspace.css';

export default function TripWorkspace({ id }) {
  const {locale:uiLocale}=useI18n();

  const { token } = useAuth();
  const searchParams = useSearchParams();

  // Instant SWR initial data resolution: 0ms render if cached or listed on /trips
  const initialTrip = useMemo(() => {
    return token && id ? getCachedTripWorkspace(token, id) : null;
  }, [token, id]);

  const [trip, setTrip] = useState(() => initialTrip);
  const [loading, setLoading] = useState(() => !initialTrip);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(() => {
    const dayQuery = searchParams?.get('day');
    if (dayQuery !== null && dayQuery !== undefined) {
      const parsed = parseInt(dayQuery, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  });
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' | 'route' | 'budget'
  const [saveState, setSaveState] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'conflict' | 'error'
  const [toastMessage, setToastMessage] = useState(null);
  const [pendingEdit,setPendingEdit]=useState(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(() => initialTrip?.title || '');
  const [activeChallengePreview, setActiveChallengePreview] = useState(null);
  const [activeEvidenceChallenge, setActiveEvidenceChallenge] = useState(null);

  // Deep-link landmark quest preview (?preview=burj)
  const previewParam = searchParams?.get('preview');

  const reloadTrip = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiRequest(`/api/v1/trips/${encodeURIComponent(id)}`, { token, cache: 'no-store' })
      .then((data) => {
        const key = `${token}:${id}`;
        tripWorkspaceMemoryCache.set(key, data);
        persistWorkspaceTrip(token, id, data);
        setTrip(data);
        setTitleDraft(data.title || '');
        setError(null);
        setSaveState('idle');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, id]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    apiRequest(`/api/v1/trips/${encodeURIComponent(id)}`, {
      token,
      signal: controller.signal,
      cache: 'no-store'
    })
      .then((data) => {
        if (!controller.signal.aborted) {
          const key = `${token}:${id}`;
          tripWorkspaceMemoryCache.set(key, data);
          persistWorkspaceTrip(token, id, data);
          setTrip(data);
          setTitleDraft(data.title || '');
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [token, id]);

  const itinerary = useMemo(() => {
    if (!trip?.itinerary_data) return null;
    let data = trip.itinerary_data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { return null; }
    }
    return data;
  }, [trip]);

  const days = useMemo(() => {
    if (!itinerary) return [];
    if (Array.isArray(itinerary.days)) return itinerary.days;
    if (Array.isArray(itinerary)) return itinerary;
    return [];
  }, [itinerary]);

  const currentRevision = itinerary?.revision || trip?.revision || 1;
  const currentStatus = itinerary?.status || trip?.status || 'draft';
  const currentDayIndex = Math.min(selectedDay, Math.max(days.length - 1, 0));
  const activeDay = days[currentDayIndex];

  // Global trip stats
  const totalStops = useMemo(() => {
    return days.reduce((acc, d) => acc + (d.activities || []).length, 0);
  }, [days]);

  const totalChallenges = useMemo(() => days.filter(d=>(d.activities || []).some(isLandmarkChallenge)).length,[days]);

  const heroImg = useMemo(() => {
    return getItineraryHeroImage(trip, trip?.id ?? 0);
  }, [trip]);

  const budgetSummary = useMemo(() => {
    const quoted=itinerary?.quoted_budget;
    if(quoted)return {quoted:true,totals:quoted.currency_totals||[],items:quoted.items||[],itemCount:quoted.items?.length||0};
    return computeTripBudget(days, trip?.featured_hotel);
  }, [days, trip, itinerary]);

  // Toast auto-clear
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Handle deep-link landmark quest preview (?preview=burj)
  useEffect(() => {
    if (!previewParam || days.length === 0) return;
    const timer = setTimeout(() => {
      for (const d of days) {
        for (const act of d.activities || []) {
          const ch = isLandmarkChallenge(act);
          if (ch && ch.landmark === previewParam) {
            setActiveChallengePreview({ ...ch, tripId: id });
            return;
          }
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [previewParam, days, id]);

  // Main persistence handler with optimistic revision checking
  const handleUpdate = async (nextDays, extraPatch = {}) => {
    if (!token || !trip) return;
    if(saveState==='saving')return false;
    setSaveState('saving');
    const updatedItinerary = {
      ...itinerary,
      days: nextDays,
      revision: currentRevision + 1
    };

    const payload = {
      expected_revision: currentRevision,
      itinerary_data: updatedItinerary,
      ...extraPatch
    };

    try {
      const result = await apiRequest(`/api/v1/trips/${encodeURIComponent(trip.id)}`, {
        token,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const key = `${token}:${trip.id}`;
      tripWorkspaceMemoryCache.set(key, result);
      persistWorkspaceTrip(token, trip.id, result);
      setTrip(result);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2500);
      notifyPassportChanged();
      return true;
    } catch (err) {
      if (err.status===409 && err.message?.includes('revision')) {
        setSaveState('conflict');
        setToastMessage('Conflict detected: This trip was modified in another session. Please reload.');
      } else {
        setSaveState('error');
        setToastMessage(err.message || 'Failed to save changes.');
      }
      return false;
    }
  };

  const onReorder = (fromIdx, toIdx) => {
    const updated = reorderActivities(days, currentDayIndex, fromIdx, toIdx);
    setPendingEdit({days:updated,message:'Change the activity order? Flexible times will need review; dated events and reservations stay protected.'});
  };

  const onMoveToDay = (actIdx, targetDayIdx) => {
    const updated = moveActivityToDay(days, currentDayIndex, actIdx, targetDayIdx);
    setPendingEdit({days:updated,message:`Move this activity to Day ${targetDayIdx+1}? Its flexible time will be cleared for rescheduling.`});
  };

  const onRemove = (actIdx) => {
    const updated = removeActivity(days, currentDayIndex, actIdx);
    setPendingEdit({days:updated,message:`Remove this activity from Day ${currentDayIndex+1}? Any must-visit requirement also needs your review.`});
  };

  const onToggleStatus = (actIdx) => {
    const act = activeDay?.activities?.[actIdx];
    if (!act) return;
    const nextStatus = act.status === 'visited' ? 'skipped' : act.status === 'skipped' ? 'pending' : 'visited';
    const updated = updateActivityStatus(days, currentDayIndex, actIdx, nextStatus);
    handleUpdate(updated);
  };

  const onMakeLighter = () => {
    const result = makeDayLighter(days, currentDayIndex);
    if (result.movedCount > 0) {
      setPendingEdit({days:result.days,message:result.message+' Review before saving.'});
    }
    setToastMessage(result.message);
  };

  const onLifecycleChange = (nextStatus) => {
    if (nextStatus === 'active' && !itinerary?.start_date && !trip?.start_date) {
      setToastMessage('Cannot activate trip: travel dates must be scheduled before activation.');
      return;
    }
    handleUpdate(days, { status: nextStatus });
    setToastMessage(`Trip status changed to ${nextStatus.toUpperCase()}`);
  };

  const onSaveTitle = () => {
    if (titleDraft.trim() && titleDraft.trim() !== trip?.title) {
      handleUpdate(days, { title: titleDraft.trim() });
    }
    setIsEditingTitle(false);
  };

  return (
    <Localized element={JourneyShell} attributes={["title"]}
      headerVariant="workspace"
      title="Trip Workspace"
      action={
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <Link href={`/receipts?trip_id=${id}`} className="journey-btn subtle small"><LocalizedText message={"Receipts"} /></Link>
          <Link href="/trips" className="journey-btn subtle small"><ArrowLeft size={14} /><LocalizedText message={" My Trips"} /></Link>
        </div>
      }
    >
      <div className="journey-scroll planning-run-scroll workspace-scroll">
        <div className="trip-workspace">
          {/* Panoramic Luxury Hero Header */}
          <div className="workspace-hero">
            <Localized element="img" attributes={["alt"]}
              src={heroImg || 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=85'}
              alt={trip?.title || 'Trip destination'}
              className="workspace-hero-bg"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=85';
              }}
            />
            <div className="workspace-hero-overlay" />

            <div className="workspace-hero-top">
              <span className="workspace-hero-eyebrow">
                <span className="workspace-journey-signal" aria-hidden="true"/><LocalizedText message={" YOUR UAE JOURNEY "} /><small><LocalizedText message={"· Revision ⟦0⟧"} values={[currentRevision]} /></small>
              </span>

              <div className="workspace-hero-controls">
                <MasarSelect
                  aria-label="Trip status"
                  value={currentStatus}
                  onChange={onLifecycleChange}
                  options={[
                    ['draft', 'Draft'],
                    ['active', 'Active'],
                    ['archived', 'Archived'],
                    ['cancelled', 'Cancelled']
                  ]}
                  compact={true}
                  className={`workspace-status-select status-${currentStatus}`}
                />

                <div className={`workspace-sync-indicator ${saveState}`}>
                  {saveState === 'saving' && <span><LocalizedText message={"Saving…"} /></span>}
                  {saveState === 'saved' && (
                    <>
                      <CheckCircle2 size={13} /> <span><LocalizedText message={"Saved"} /></span>
                    </>
                  )}
                  {saveState === 'conflict' && (
                    <button className="journey-btn subtle small" onClick={reloadTrip}>
                      <RotateCcw size={12} /><LocalizedText message={" Reload latest"} /></button>
                  )}
                </div>
              </div>
            </div>

            <div className="workspace-hero-content">
              {isEditingTitle ? (
                <div className="workspace-title-edit">
                  <input
                    type="text"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    className="workspace-title-input"
                    autoFocus
                  />
                  <button className="journey-btn gold small" onClick={onSaveTitle}>
                    <Check size={14} /><LocalizedText message={" Save"} /></button>
                  <button className="journey-btn subtle small" onClick={() => setIsEditingTitle(false)}><LocalizedText message={"Cancel"} /></button>
                </div>
              ) : (
                <div className="workspace-title-row">
                  <h1><LocalizedText>{trip?.title || 'Trip Workspace'}</LocalizedText></h1>
                  <Localized element={"button"} attributes={["title"]}
                    onClick={() => setIsEditingTitle(true)}
                    className="activity-action-btn"
                    title="Edit title"
                  >
                    <Edit2 size={14} />
                  </Localized>
                </div>
              )}
            </div>

            {/* Hero Metadata Badges */}
            <div className="workspace-hero-stats">
              <span className="hero-stat-pill">
                <MapPin size={14} /> {locationLabel(trip?.destination, 'United Arab Emirates')}
              </span>
              <span className="hero-stat-pill">
                <Calendar size={14} /> {trip?.duration_days || days.length}<LocalizedText message={" Days"} />{itinerary?.start_date && (
                  <span style={{ opacity: 0.85, marginInlineStart: '4px' }}>
                    ({itinerary.start_date}{itinerary.end_date ? ` – ${itinerary.end_date}` : ''})
                  </span>
                )}
              </span>
              {trip?.budget_tier && (
                <span className="hero-stat-pill">
                  <Wallet size={14} /><LocalizedText message={" Tier: "} />{trip.budget_tier}
                </span>
              )}
              <span className="hero-stat-pill">
                <Navigation size={14} /> {totalStops}<LocalizedText message={" Curated Stops"} /></span>
              {totalChallenges > 0 && (
                <span className="hero-stat-pill" style={{ borderColor: 'rgba(245, 158, 11, 0.45)', color: '#fef08a' }}>
                  <Award size={14} /> {totalChallenges}<LocalizedText message={" Challenge"} /><LocalizedText>{totalChallenges > 1 ? 's' : ''}</LocalizedText>
                </span>
              )}
            </div>
          </div>

          {/* Toast Notification Banner */}
          {toastMessage && (
            <div className="workspace-toast" role="status">
              <span>{toastMessage}</span>
              <button
                onClick={() => setToastMessage(null)}
                style={{ background: 'transparent', border: 'none', color: '#fbbf24', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Planning Review Notes (Omissions & Clarifications) */}
          <TripReviewNotes review={itinerary?.planning_review} />

          {/* Section Switcher Tabs */}
          <TripEvidenceStatus tripId={id} onOpen={entry=>{
            const activity=days.flatMap(day=>day.activities||[]).find(item=>item.id===entry.source_activity_id);
            const challenge=activity&&isLandmarkChallenge(activity);
            setActiveEvidenceChallenge({...challenge,name:challenge?.name||entry.title,
              type:challenge?.type||({sunset:'sunset-seeker',heritage:'heritage-detective'}[entry.challenge_key]||entry.challenge_key),
              landmark:entry.landmark,activityId:entry.source_activity_id,tripId:id});
          }}/>
          <div className="workspace-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'timeline'}
              className={`workspace-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              <Clock size={16} /><LocalizedText message={" Itinerary Timeline"} /></button>
            <button
              role="tab"
              aria-selected={activeTab === 'route'}
              className={`workspace-tab-btn ${activeTab === 'route' ? 'active' : ''}`}
              onClick={() => setActiveTab('route')}
            >
              <Navigation size={16} /><LocalizedText message={" Route Waypoints"} /></button>
            <button
              role="tab"
              aria-selected={activeTab === 'budget'}
              className={`workspace-tab-btn ${activeTab === 'budget' ? 'active' : ''}`}
              onClick={() => setActiveTab('budget')}
            >
              <Wallet size={16} /><LocalizedText message={" Budget & Cost Breakdown"} /></button>
          </div>

          {/* Tab 1: Day-by-Day Interactive Magazine Timeline */}
          {activeTab === 'timeline' && (
            <div>
              {days.length > 0 ? (
                <>
                  {/* Luxury Day Selector Rail */}
                  <div className="workspace-day-bar">
                    <Localized element={"nav"} attributes={["aria-label"]} className="workspace-day-tabs" aria-label="Trip days">
                      {days.map((item, index) => {
                        const stopsCount = (item.activities || []).length;
                        return (
                          <button
                            key={item.id || index}
                            className={`workspace-day-pill ${currentDayIndex === index ? 'active' : ''}`}
                            onClick={() => setSelectedDay(index)}
                          >
                            <div className="workspace-day-pill-top">
                              <span className="workspace-day-pill-tag"><LocalizedText message={"Day ⟦0⟧"} values={[index + 1]} /></span>
                              <span className="workspace-day-pill-stops"><LocalizedText message={"⟦0⟧ stops"} values={[stopsCount]} /></span>
                            </div>
                            <Localized element={"small"} attributes={["title"]} title={item.theme || item.title || item.date}>
                              <LocalizedText>{item.theme || item.title || item.date || `Exploration Day`}</LocalizedText>
                            </Localized>
                          </button>
                        );
                      })}
                    </Localized>

                    <Localized element={"button"} attributes={["title"]}
                      className="journey-btn subtle small"
                      onClick={onMakeLighter}
                      title="Lighten day density by redistributing or trimming stops"
                    >
                      <Feather size={14} color="var(--color-accent-gold)" /><LocalizedText message={" Make day lighter"} /></Localized>
                  </div>

                  {/* Active Day Content Card */}
                  <div className="workspace-day-card">
                    <div className="workspace-day-header">
                      <div>
                        <span className="journey-eyebrow" style={{ color: 'var(--color-accent-gold)' }}><LocalizedText message={"DAY ⟦0⟧ CURATED SCHEDULE"} values={[currentDayIndex + 1]} /></span>
                        <h2 className="workspace-day-theme">
                          <LocalizedText>{activeDay?.theme || activeDay?.title || 'Exploration Day'}</LocalizedText>
                        </h2>
                        {activeDay?.description && (
                          <p className="workspace-day-desc"><LocalizedText>{activeDay.description}</LocalizedText></p>
                        )}

                        <div className="workspace-day-stats-row">
                          <span className="day-stat-chip">
                            <Navigation size={13} /> {(activeDay?.activities || []).length}<LocalizedText message={" stops planned"} /></span>
                          {activeDay?.date && (
                            <span className="day-stat-chip">
                              <Calendar size={13} /> {activeDay.date}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rich Visual Activities List */}
                    <div className="workspace-activity-list">
                      {activeDay?.accessibility_notes?.length>0&&<section className="accessibility-notes" aria-label="Accessibility notes"><h3><LocalizedText>Accessibility notes</LocalizedText></h3><ul>{activeDay.accessibility_notes.map((note,index)=><li key={index}><LocalizedText>{note}</LocalizedText></li>)}</ul></section>}
                      {currentDayIndex===0&&<TripBookingTasks trip={trip} onBooked={reloadTrip}/>}
                      {(activeDay?.activities || []).map((activity, index) => {
                        const challenge = ((activeDay.activities || []).find(a=>a.challenge&&isLandmarkChallenge(a))||(activeDay.activities || []).find(a=>isLandmarkChallenge(a)))?.id===activity.id ? isLandmarkChallenge(activity) : null;
                        const isFirst = index === 0;
                        const isLast = index === ((activeDay?.activities || []).length - 1);
                        const visitStatus = activity.status || 'pending';
                        const thumbUrl = getTripActivityImage(activity, trip, currentDayIndex, index);
                        const category = getTripActivityCategory(activity, trip);

                        return (
                          <div key={activity.id || index} className="workspace-activity-card">
                            {/* Column 1: Time & Status */}
                            <div className="activity-time-col">
                              <span className="activity-time-tag">
                                <Clock size={13} />
                                <LocalizedText>{activity.time || 'Flexible'}</LocalizedText>
                              </span>

                              <Localized element={"button"} attributes={["title"]}
                                className={`activity-status-toggle ${visitStatus}`}
                                onClick={() => onToggleStatus(index)}
                                title="Click to toggle visit status (Pending / Visited / Skipped)"
                              >
                                {visitStatus === 'visited' && <Check size={12} />}
                                <span>{visitStatus.toUpperCase()}</span>
                              </Localized>
                            </div>

                            {/* Column 2: Visual Thumbnail Showcase */}
                            <div
                              className="activity-visual-thumb"
                              style={{ backgroundImage: `url(${thumbUrl})` }}
                            >
                              <span className="activity-category-badge">
                                <span>{category.icon}</span> <LocalizedText>{category.label}</LocalizedText>
                              </span>
                            </div>

                            {/* Column 3: Activity Body & Badges */}
                            <div className="activity-body">
                              <div className="activity-badges">
                                {conditionalBoxingPreview(activity)&&<Localized element={"button"} attributes={["title"]} type="button" className="challenge-badge" onClick={()=>setActiveChallengePreview({...conditionalBoxingPreview(activity),tripId:id})} title="Preview boxing; confirm a working scoring machine with venue staff"><Award size={13}/><LocalizedText message={" Boxing preview · confirm on site ↗"} /></Localized>}
                                {challenge && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <Localized element={"button"} attributes={["title"]}
                                      type="button"
                                      className="challenge-badge"
                                      onClick={() => setActiveChallengePreview({ ...challenge, tripId: id, activityId: activity.id })}
                                      title={`Preview the ${challenge.name} simulation`}
                                    >
                                      <Award size={13} />
                                      <span><LocalizedText>{challenge.type==='heritage-detective'?'Landmark Quest: ':''}</LocalizedText><LocalizedText>{challenge.name}</LocalizedText> · <LocalizedText>{challenge.animationAvailable===false?'View task':'Preview 3D'}</LocalizedText> ↗</span>
                                    </Localized>
                                    <Localized element={"button"} attributes={["title"]}
                                      type="button"
                                      onClick={() => setActiveEvidenceChallenge({ ...challenge, tripId: id, activityId: activity.id })}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2))',
                                        border: '1px solid rgba(245, 158, 11, 0.5)',
                                        color: '#fbbf24',
                                        cursor: 'pointer'
                                      }}
                                      title="Submit evidence or view your saved submission status"
                                    >
                                      <Camera size={12} />
                                      <span><LocalizedText message={"Evidence & submission status"} /></span>
                                    </Localized>
                                  </div>
                                )}

                                <span className="reservation-badge suggested"><LocalizedText>{activity.booking_ref ? 'Reservation reference · verify in Bookings' : 'Curated Recommendation'}</LocalizedText></span>

                              </div>

                              <h3 className="activity-title"><LocalizedText>{activity.title || 'Planned Stop'}</LocalizedText></h3>
                              {activity.description && (
                                <p className="activity-desc"><LocalizedText>{activity.description}</LocalizedText></p>
                              )}

                              <div className="activity-meta">
                                {activity.location && (
                                  <span>
                                    <MapPin size={12} />
                                    {locationLabel(activity.location, activity.title || 'UAE destination')}
                                  </span>
                                )}
                                {activity.duration && <span><LocalizedText preserveValues={[true]} message={"Duration: ⟦0⟧"} values={[activity.duration]} /></span>}
                                {!budgetSummary.quoted && activity.cost !== undefined && activity.cost !== null && (
                                  <span>
                                    <Wallet size={12} /><LocalizedText message={"Est: "} /><LocalizedText>{activity.cost > 0 ? `AED ${activity.cost}` : 'Free Access'}</LocalizedText>
                                  </span>
                                )}
                              </div>
                              <PlaceTimeTravel key={`${id}:${currentDayIndex}:${activity.id||index}`} activity={activity}/>
                            </div>

                            {/* Column 4: Controls Cluster */}
                            <div className="activity-actions">
                              <Localized element={"button"} attributes={["title"]}
                                className="activity-action-btn"
                                onClick={() => onReorder(index, index - 1)}
                                disabled={isFirst}
                                title="Move up in day order"
                              >
                                <ChevronUp size={15} />
                              </Localized>
                              <Localized element={"button"} attributes={["title"]}
                                className="activity-action-btn"
                                onClick={() => onReorder(index, index + 1)}
                                disabled={isLast}
                                title="Move down in day order"
                              >
                                <ChevronDown size={15} />
                              </Localized>

                              {days.length > 1 && (
                                <Localized element={"select"} attributes={["aria-label"]}
                                  aria-label="Move activity to day"
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value !== '') {
                                      onMoveToDay(index, parseInt(e.target.value, 10));
                                    }
                                  }}
                                  style={{
                                    height: '32px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#cbd5e1',
                                    fontSize: '11px',
                                    borderRadius: '9px',
                                    padding: '0 8px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Localized element="option" attributes={[]} textChildren value="">Move to…</Localized>
                                  {days.map((_, dIdx) => (
                                    dIdx !== currentDayIndex ? (
                                      <option key={dIdx} value={dIdx}><LocalizedText message={"Day ⟦0⟧"} values={[dIdx + 1]} /></option>
                                    ) : null
                                  ))}
                                </Localized>
                              )}

                              <Localized element={"button"} attributes={["title"]}
                                className="activity-action-btn delete"
                                onClick={() => onRemove(index)}
                                title="Remove activity stop"
                              >
                                <Trash2 size={14} />
                              </Localized>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ color: '#94a3b8' }}><LocalizedText message={"This legacy itinerary uses an older format without structured days."} /></p>
              )}
            </div>
          )}

          {/* Tab 2: Route Waypoints View */}
          {activeTab === 'route' && (
            <div className="workspace-route-list">
              <span className="journey-eyebrow" style={{ color: 'var(--color-accent-gold)' }}><LocalizedText message={"DAY ⟦0⟧ ROUTE WAYPOINTS & GEOGRAPHIC ORDER"} values={[currentDayIndex + 1]} /></span>
              {(activeDay?.activities || []).map((activity, idx) => {
                const thumbUrl = getTripActivityImage(activity, trip, currentDayIndex, idx);
                return (
                  <div key={activity.id || idx} className="route-stop-card">
                    <div className="route-stop-num">{idx + 1}</div>
                    <div
                      className="route-stop-thumb"
                      style={{ backgroundImage: `url(${thumbUrl})` }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#f8fafc', fontWeight: 700 }}>
                        {activity.title}
                      </h3>
                      <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                        {locationLabel(activity.location, activity.title || 'UAE destination')} · <LocalizedText>{activity.duration || 'Flexible duration'}</LocalizedText>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 3: Budget & Honest Booking Summary */}
          {activeTab === 'budget' && (
            <div>
              <span className="journey-eyebrow" style={{ color: 'var(--color-accent-gold)' }}><LocalizedText message={"HONEST BUDGET & RESERVATION OVERVIEW"} /></span>
              <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.8, maxWidth: '750px' }}><LocalizedText message={"Compare your selected quotes with booked prices. Sandbox booking values are labelled as simulations."} /></p>

              {budgetSummary.quoted&&<div className="planning-choices-summary">{budgetSummary.items.map(item=><p key={item.kind}><strong><LocalizedText>{item.label}</LocalizedText></strong><small>{item.currency} {item.amount}</small></p>)}</div>}
              <div className="workspace-budget-grid">
                <div className="budget-summary-card">
                  <h3><LocalizedText message={"Estimated Total Cost"} /></h3>
                  <div className="budget-amount">{budgetSummary.quoted?(budgetSummary.totals.length?budgetSummary.totals.map(q=><div key={q.currency}>{q.currency} {Number(q.amount).toLocaleString(formattingLocale(uiLocale, undefined),{maximumFractionDigits:2})}</div>):'Not yet quoted'):`AED ${budgetSummary.estimatedTotal.toLocaleString(formattingLocale(uiLocale))}`}</div>
                  <p className="budget-note">
                    <LocalizedText>{budgetSummary.quoted?'Selected flight and full-stay room quotes only. Dining, tickets and local transport are not yet included. Quotes are not confirmed bookings.':`Calculated from ${budgetSummary.itemCount} priced stops and accommodations in your itinerary.`}</LocalizedText>
                  </p>
                </div>

                <ReservationBudgetCard trip={trip}/>
                <Link href={`/receipts?trip_id=${encodeURIComponent(id)}`} className="journey-btn subtle small" style={{marginTop:16}}><LocalizedText message={"View receipts for this trip "} /><ArrowRight size={14}/></Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3D Challenge Demonstration Modal */}
      {pendingEdit && <Localized element={"div"} attributes={["aria-label"]} role="dialog" aria-modal="true" aria-label="Review itinerary change" className="workspace-edit-review">
        <h3><LocalizedText message={"Review your change"} /></h3><p><LocalizedText>{pendingEdit.message}</LocalizedText></p>
        <button className="journey-btn" onClick={()=>setPendingEdit(null)}><LocalizedText message={"Keep current plan"} /></button>
        <button className="journey-btn gold" disabled={saveState==='saving'} onClick={async()=>{if(await handleUpdate(pendingEdit.days))setPendingEdit(null);}}><LocalizedText message={"Save this change"} /></button>
      </Localized>}
      <ChallengePreviewModal
        challenge={activeChallengePreview}
        isOpen={!!activeChallengePreview}
        onClose={() => setActiveChallengePreview(null)}
      />

      {/* Real Photo Evidence Submission Modal */}
      <ChallengeEvidenceModal
        challenge={activeEvidenceChallenge}
        tripId={id}
        isOpen={!!activeEvidenceChallenge}
        onClose={() => setActiveEvidenceChallenge(null)}
      />
    </Localized>
  );
}
