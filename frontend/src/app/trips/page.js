'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';


import { useState, useMemo } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useTrips } from '@/hooks/useTrips';
import { useBookings } from '@/hooks/useBookings';
import { useAuth } from '@/context/AuthContext';
import Skeleton from '@/components/ui/Skeleton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TripDetailModal from '@/components/cards/TripDetailModal';
import BookingVoucherModal from '@/components/trips/BookingVoucherModal';
import DirectCheckoutModal from '@/components/trips/DirectCheckoutModal';
import SavedItineraryCard from '@/components/trips/SavedItineraryCard';
import DeleteTripDialog from '@/components/trips/DeleteTripDialog';
import {notifyPassportChanged} from '@/app/profile/_lib/passportApi';
import ConfirmedStayCard from '@/components/trips/ConfirmedStayCard';
import RateHoldCard from '@/components/trips/RateHoldCard';
import InteractiveTripCalendar from '@/components/trips/InteractiveTripCalendar';
import { 
  Calendar as CalendarIcon, 
  Building2, 
  Clock, 
  History, 
  CreditCard, 
  Luggage, 
  MapPin, 
  Plus, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  Layers,
  ChevronDown,
  Filter,
  CheckCircle2,
  SlidersHorizontal,
  FileText
} from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {tripHasConfirmedBooking} from '@/lib/tripWorkspace';
import NotificationBell from '@/components/notifications/NotificationBell';
import MasarPageHeader from '@/components/layout/MasarPageHeader';
import { isTripPrevious } from '@/utils/dubaiDate';
import styles from './trips.module.css';

function getActivityIcon(title = '') {
  const t = title.toLowerCase();
  if (t.includes('hotel') || t.includes('check') || t.includes('resort') || t.includes('stay')) return Building2;
  return Luggage;
}


function TripsContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { trips, loading: tripsLoading, deleteTrip, refetch: refetchTrips } = useTrips();
  const { bookings, preBookings, loading: bookingsLoading, refetch: refetchBookings } = useBookings();
  
  // Navigation Tabs: 'trips' | 'calendar' | 'receipts'
  const [activeTab, setActiveTab] = useState('trips'); 
  
  // Filters & Controls (Mindtrip style)
  const [bookedOnly, setBookedOnly] = useState(false);
  const [destinationFilter, setDestinationFilter] = useState('All'); // 'All' | 'Dubai' | 'Abu Dhabi' | 'Sharjah' | 'Other'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Trip Timing Filter: 'upcoming' | 'previous'
  const [tripTimeFilter, setTripTimeFilter] = useState('upcoming');
  
  // Modals state
  const [selectedTripModal, setSelectedTripModal] = useState(null);
  const [activeModalDay, setActiveModalDay] = useState(0);
  const [tripToDelete, setTripToDelete] = useState(null);
  const [deleteNotices,setDeleteNotices]=useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Digital Voucher Modal state
  const [selectedVoucherBooking, setSelectedVoucherBooking] = useState(null);

  // Direct Checkout Modal state for Rate Holds
  const [selectedCheckoutPrebook, setSelectedCheckoutPrebook] = useState(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchTrips(), refetchBookings()]);
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const confirmDelete = async () => {
    if(!tripToDelete)return;
    const target=tripToDelete;
    if(deleteNotices.some(n=>n.status==='pending' && n.trip.id===target.id))return;
    const notice={trip:target,owner:user?.id,status:'pending',error:''};
    setTripToDelete(null);
    setDeleteNotices(previous=>[...previous.filter(n=>n.trip.id!==target.id),notice]);
    try {
      await deleteTrip(target.id);
      setDeleteNotices(previous=>previous.map(n=>n.trip.id===target.id?{...n,status:'success'}:n));
      notifyPassportChanged();
    }catch(error){
      setDeleteNotices(previous=>previous.map(n=>n.trip.id===target.id?{...n,status:'error',error:error.message || 'Please try again.'}:n));
    }
  };

  // Filtered trips based on search, bookedOnly, and destination
  const filteredTrips = useMemo(() => {
    let list = trips;

    // Booked only filter
    if (bookedOnly) {
      list = list.filter(t => tripHasConfirmedBooking(t, bookings));
    }

    // Destination filter
    if (destinationFilter !== 'All') {
      list = list.filter(t => 
        (t.destination && t.destination.toLowerCase().includes(destinationFilter.toLowerCase())) ||
        (t.title && t.title.toLowerCase().includes(destinationFilter.toLowerCase()))
      );
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => 
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.destination && t.destination.toLowerCase().includes(q)) ||
        (Array.isArray(t.vibes) && t.vibes.some(v => v.toLowerCase().includes(q)))
      );
    }

    return list;
  }, [trips, bookedOnly, destinationFilter, searchQuery, bookings]);

  // Split filtered trips into Upcoming and Previous categories
  const { upcomingTrips, previousTrips } = useMemo(() => {
    const upcoming = [];
    const previous = [];
    for (const t of filteredTrips) {
      if (isTripPrevious(t, bookings)) {
        previous.push(t);
      } else {
        upcoming.push(t);
      }
    }
    return { upcomingTrips: upcoming, previousTrips: previous };
  }, [filteredTrips, bookings]);

  const currentDisplayTrips = tripTimeFilter === 'previous' ? previousTrips : upcomingTrips;

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    const q = searchQuery.toLowerCase();
    return bookings.filter(b => 
      (b.hotel_info && b.hotel_info.toLowerCase().includes(q)) ||
      (b.checkin && b.checkin.toLowerCase().includes(q)) ||
      (b.checkout && b.checkout.toLowerCase().includes(q))
    );
  }, [bookings, searchQuery]);

  // Filtered pre-bookings / rate holds
  const filteredPreBookings = useMemo(() => {
    if (!searchQuery.trim()) return preBookings;
    const q = searchQuery.toLowerCase();
    return preBookings.filter(pb => 
      (pb.room_name && pb.room_name.toLowerCase().includes(q)) ||
      (pb.currency && pb.currency.toLowerCase().includes(q))
    );
  }, [preBookings, searchQuery]);

  return (
    <div className="app-container">
      {/* ── 1. Left Sidebar Navigation ── */}
      <Sidebar />

      {/* ── 2. Main Content Stage ── */}
      <div className={`content-stage ${styles.listStage}`}>
        <div className={`masar-dashboard-page ${styles.listPage}`}>
          
          {/* ── MASAR AI Unified Page Header (Obsidian Luxury) ── */}
          <Localized element={MasarPageHeader} attributes={["breadcrumbSection","title","subtitle"]}
            breadcrumbSection="YOUR JOURNEYS"
            breadcrumbHref="/trips"
            title="Your trips"
            subtitle="Luxury itineraries, confirmed UAE hotel stays, and guaranteed rate holds."
            navKey="trips"
            tabs={[
              { 
                id: 'trips', 
                label: `All Trips (${trips.length})`, 
                icon: Luggage, 
                active: activeTab === 'trips', 
                onClick: () => setActiveTab('trips') 
              },
              { 
                id: 'calendar', 
                label: 'Calendar View', 
                icon: CalendarIcon, 
                active: activeTab === 'calendar', 
                onClick: () => setActiveTab('calendar') 
              },
              { 
                id: 'receipts', 
                label: `Stays & Vouchers (${bookings.length + preBookings.length})`, 
                icon: Building2, 
                active: activeTab === 'receipts', 
                onClick: () => setActiveTab('receipts') 
              }
            ]}
            topRightActions={
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Link href="/receipts" className="journey-btn subtle small"><FileText size={15} /><LocalizedText message={" Receipts"} /></Link>
                <NotificationBell />
                <Localized element={"button"} attributes={["title"]}
                  onClick={handleRefresh}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#CBD5E1',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  title="Refresh Vault Records"
                >
                  <RefreshCw size={15} className={isRefreshing ? 'spin-icon' : ''} />
                </Localized>
                <Link 
                  href="/chat"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    color: '#0A0B0E',
                    fontSize: '12px',
                    fontWeight: 800,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 10px rgba(245, 158, 11, 0.35)',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span><LocalizedText message={"New trip"} /></span>
                </Link>
              </div>
            }
          />

          {/* ── Minimalist Utility Toolbar (Mindtrip Style) ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            {/* Left: Booked Only Toggle + Destination Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              {/* Modern Minimalist Toggle Switch */}
              <div 
                onClick={() => setBookedOnly(!bookedOnly)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <div style={{
                  width: '38px',
                  height: '22px',
                  borderRadius: '9999px',
                  backgroundColor: bookedOnly ? '#F59E0B' : 'rgba(255, 255, 255, 0.15)',
                  position: 'relative',
                  transition: 'background-color 0.2s ease'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '3px',
                    left: bookedOnly ? '19px' : '3px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)'
                  }} />
                </div>
                <span style={{ fontSize: '13px', color: bookedOnly ? '#FFFFFF' : '#94A3B8', fontWeight: 600 }}><LocalizedText message={"Booked only"} /></span>
              </div>

              {/* Destination Filter Dropdown / Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {['All', 'Dubai', 'Abu Dhabi'].map((dest) => (
                  <button
                    key={dest}
                    onClick={() => setDestinationFilter(dest)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: destinationFilter === dest ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                      backgroundColor: destinationFilter === dest ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: destinationFilter === dest ? '#FBBF24' : '#94A3B8',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {dest}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Search Input */}
            <div style={{ position: 'relative', width: '260px' }}>
              <Search 
                size={14} 
                color="#94A3B8" 
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} 
              />
              <Localized element={"input"} attributes={["placeholder"]}
                type="text"
                placeholder="Search trips & stays..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 14px 9px 36px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(245, 158, 11, 0.4)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'; }}
              />
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════
              TAB 1: TRIPS (Saved AI Itineraries - Upcoming & Previous)
             ══════════════════════════════════════════════════════ */}
          {activeTab === 'trips' && (
            <div>
              {/* Section Sub-header: Upcoming & Previous Switcher */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '14px'
              }}>
                {/* Segmented Controls for Upcoming & Previous */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  gap: '4px'
                }}>
                  <button
                    type="button"
                    onClick={() => setTripTimeFilter('upcoming')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 16px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: tripTimeFilter === 'upcoming' ? 700 : 500,
                      backgroundColor: tripTimeFilter === 'upcoming' ? 'rgba(245, 158, 11, 0.16)' : 'transparent',
                      color: tripTimeFilter === 'upcoming' ? '#FBBF24' : '#94A3B8',
                      border: tripTimeFilter === 'upcoming' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  >
                    <Clock size={14} color={tripTimeFilter === 'upcoming' ? '#FBBF24' : '#94A3B8'} />
                    <span><LocalizedText message={"Upcoming"} /></span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '1px 7px',
                      borderRadius: '9999px',
                      backgroundColor: tripTimeFilter === 'upcoming' ? 'rgba(245, 158, 11, 0.28)' : 'rgba(255, 255, 255, 0.08)',
                      color: tripTimeFilter === 'upcoming' ? '#FBBF24' : '#94A3B8'
                    }}>
                      {upcomingTrips.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTripTimeFilter('previous')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 16px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: tripTimeFilter === 'previous' ? 700 : 500,
                      backgroundColor: tripTimeFilter === 'previous' ? 'rgba(245, 158, 11, 0.16)' : 'transparent',
                      color: tripTimeFilter === 'previous' ? '#FBBF24' : '#94A3B8',
                      border: tripTimeFilter === 'previous' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  >
                    <History size={14} color={tripTimeFilter === 'previous' ? '#FBBF24' : '#94A3B8'} />
                    <span><LocalizedText message={"Previous"} /></span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '1px 7px',
                      borderRadius: '9999px',
                      backgroundColor: tripTimeFilter === 'previous' ? 'rgba(245, 158, 11, 0.28)' : 'rgba(255, 255, 255, 0.08)',
                      color: tripTimeFilter === 'previous' ? '#FBBF24' : '#94A3B8'
                    }}>
                      {previousTrips.length}
                    </span>
                  </button>
                </div>

                <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 500 }}>
                  {currentDisplayTrips.length} <LocalizedText>{currentDisplayTrips.length === 1 ? 'journey' : 'journeys'}</LocalizedText>
                </span>
              </div>

              {tripsLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
                  <Skeleton variant="card" />
                  <Skeleton variant="card" />
                </div>
              ) : currentDisplayTrips.length === 0 ? (
                <div style={{
                  padding: '60px 24px',
                  borderRadius: '24px',
                  backgroundColor: 'rgba(18, 20, 24, 0.5)',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#F59E0B',
                    marginBottom: '16px'
                  }}>
                    {tripTimeFilter === 'previous' ? <History size={28} /> : <Luggage size={28} />}
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px 0' }}>
                    <LocalizedText>{
                      searchQuery || bookedOnly 
                        ? (tripTimeFilter === 'previous' ? 'No matching previous journeys found' : 'No matching upcoming trips found')
                        : (tripTimeFilter === 'previous' ? 'No previous journeys yet' : 'No upcoming trips planned yet')
                    }</LocalizedText>
                  </h3>
                  <p style={{ fontSize: '13px', color: '#94A3B8', maxWidth: '420px', margin: '0 0 22px 0', lineHeight: 1.5 }}>
                    <LocalizedText>{
                      searchQuery
                        ? 'Try clearing your search query or filters to find saved itineraries.'
                        : (tripTimeFilter === 'previous'
                            ? 'Completed adventures and past itineraries will automatically be archived here once their dates pass.'
                            : 'Ask Masar AI to curate a multi-day luxury trip across Dubai and Abu Dhabi, and save it directly to your vault.')
                    }</LocalizedText>
                  </p>
                  <Link 
                    href="/chat"
                    style={{
                      padding: '11px 24px',
                      borderRadius: '9999px',
                      backgroundColor: '#FFFFFF',
                      color: '#0A0B0E',
                      fontSize: '13px',
                      fontWeight: 800,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 16px rgba(255, 255, 255, 0.15)'
                    }}
                  >
                    <Plus size={15} strokeWidth={2.5} />
                    <span><LocalizedText message={"Plan a new trip"} /></span>
                  </Link>
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', 
                  gap: '24px',
                  width: '100%'
                }}>
                  {currentDisplayTrips.map((trip, idx) => (
                    <SavedItineraryCard
                      key={trip.id}
                      trip={trip}
                      index={idx}
                      isPrevious={tripTimeFilter === 'previous'}
                      isDeletingThis={tripToDelete?.id === trip.id}
                      onViewTrip={(t) => {
                        router.push(`/trips/${t.id}`);
                      }}
                      onStartDelete={setTripToDelete}
                      onCustomize={(t) => {
                        router.push(`/chat?customize_trip_id=${t.id}&trip_title=${encodeURIComponent(t.title)}`);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              TAB 2: CALENDAR & TIMELINE VIEW
             ══════════════════════════════════════════════════════ */}
          {activeTab === 'calendar' && (
            <InteractiveTripCalendar 
              trips={filteredTrips}
              bookings={filteredBookings}
              preBookings={filteredPreBookings}
              onSelectTrip={(trip, dayNumber) => {
                const targetDay = dayNumber ? `?day=${dayNumber - 1}` : '';
                router.push(`/trips/${trip.id}${targetDay}`);
              }}
            />
          )}

          {/* ══════════════════════════════════════════════════════
              TAB 3: RECEIPTS & STAYS (Confirmed Bookings & Holds)
             ══════════════════════════════════════════════════════ */}
          {activeTab === 'receipts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              
              {/* Confirmed Hotel Stays */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} color="#10B981" />
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}><LocalizedText message={"Confirmed Hotel Stays"} /></h2>
                  </div>
                  <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>
                    {filteredBookings.length} <LocalizedText>{filteredBookings.length === 1 ? 'Stay' : 'Stays'}</LocalizedText>
                  </span>
                </div>

                {bookingsLoading ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                    <Skeleton variant="card" />
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div style={{
                    padding: '40px 20px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(18, 20, 24, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    textAlign: 'center',
                    color: '#94A3B8',
                    fontSize: '13px'
                  }}><LocalizedText message={"No confirmed hotel vouchers found. Pre-book a stay in chat to see your digital vouchers here."} /></div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: '24px' }}>
                    {filteredBookings.map((b) => (
                      <ConfirmedStayCard
                        key={b.id}
                        booking={b}
                        onViewVoucher={(booking) => setSelectedVoucherBooking(booking)}
                        onAskConcierge={(hotelName) => {
                          router.push(`/chat?prompt=${encodeURIComponent(`I have a question about my confirmed booking at ${hotelName}`)}`);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Active Rate Holds */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={18} color="#F59E0B" />
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}><LocalizedText message={"Active Rate Holds"} /></h2>
                  </div>
                  <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600 }}>
                    {filteredPreBookings.length} <LocalizedText>{filteredPreBookings.length === 1 ? 'Hold' : 'Holds'}</LocalizedText>
                  </span>
                </div>

                {bookingsLoading ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: '20px' }}>
                    <Skeleton variant="card" />
                  </div>
                ) : filteredPreBookings.length === 0 ? (
                  <div style={{
                    padding: '40px 20px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(18, 20, 24, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    textAlign: 'center',
                    color: '#94A3B8',
                    fontSize: '13px'
                  }}><LocalizedText message={"No active rate holds currently in your vault."} /></div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: '24px' }}>
                    {filteredPreBookings.map((pb) => (
                      <RateHoldCard
                        key={pb.id}
                        preBooking={pb}
                        onCompleteBooking={(prebook) => setSelectedCheckoutPrebook(prebook)}
                      />
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>

      <Localized element={"div"} attributes={["aria-label"]} aria-label="Trip deletion updates" style={{position:'fixed',right:20,bottom:20,zIndex:10000,width:'min(390px,calc(100vw - 40px))',maxHeight:'45vh',overflowY:'auto',display:'grid',gap:10}}>
        {deleteNotices.filter(n=>n.owner===user?.id).map(notice=><div key={notice.trip.id} role={notice.status==='error'?'alert':'status'} style={{padding:16,borderRadius:14,background:'#161a22',border:`1px solid ${notice.status==='error'?'#a83c50':'#8c702f'}`,color:'#f1f5f9',boxShadow:'0 10px 40px #0006'}}>
          <strong><LocalizedText>{notice.status==='pending'?'Removing trip…':notice.status==='success'?'Trip deleted':'Couldn’t delete trip — restored'}</LocalizedText></strong>
          <p style={{margin:'6px 0',fontSize:13,color:'#b5bfcd'}}>{notice.trip.title}<LocalizedText>{notice.status==='error'?` · ${notice.error}`:''}</LocalizedText></p>
          {notice.status==='error' && <button type="button" onClick={()=>setTripToDelete(notice.trip)}><LocalizedText message={"Retry"} /></button>}
          {notice.status!=='pending' && <Localized element={"button"} attributes={["aria-label"]} type="button" aria-label={`Dismiss deletion update: ${notice.trip.title}`} onClick={()=>setDeleteNotices(previous=>previous.filter(n=>n.trip.id!==notice.trip.id))} style={{marginInlineStart:12}}><LocalizedText message={"Dismiss"} /></Localized>}
        </div>)}
      </Localized>
      <DeleteTripDialog trip={tripToDelete} busy={false} error={deleteNotices.find(n=>n.trip.id===tripToDelete?.id && n.status==='error')?.error || ''} onCancel={()=>setTripToDelete(null)} onConfirm={confirmDelete}/>
      {/* ── Interactive Modals ── */}
      <TripDetailModal 
        selectedTripModal={selectedTripModal}
        setSelectedTripModal={setSelectedTripModal}
        activeModalDay={activeModalDay}
        setActiveModalDay={setActiveModalDay}
        getActivityIcon={getActivityIcon}
        onCustomize={(trip) => {
          setSelectedTripModal(null);
          router.push(`/chat?customize_trip_id=${trip.id}&trip_title=${encodeURIComponent(trip.title)}`);
        }}
      />

      <BookingVoucherModal
        booking={selectedVoucherBooking}
        onClose={() => setSelectedVoucherBooking(null)}
        onAskConcierge={(hotelName) => {
          setSelectedVoucherBooking(null);
          router.push(`/chat?prompt=${encodeURIComponent(`I have a question regarding my confirmed stay at ${hotelName}`)}`);
        }}
      />

      <DirectCheckoutModal
        preBooking={selectedCheckoutPrebook}
        onClose={() => setSelectedCheckoutPrebook(null)}
        onSuccess={() => {
          refetchBookings();
        }}
      />
    </div>
  );
}

export default function TripsPage() {
  return (
    <ProtectedRoute>
      <TripsContent />
    </ProtectedRoute>
  );
}
