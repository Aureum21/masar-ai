import {formattingLocale} from '../i18n/messages.mjs';
// Asia/Dubai (UTC+4) Timezone and Daily Journey Utilities

export const DUBAI_TIMEZONE = 'Asia/Dubai';

/**
 * Returns current Date object converted to Asia/Dubai local time.
 */
export function getDubaiNow() {
  return new Date(); // Keep the instant; formatting converts to Dubai exactly once.
}

/**
 * Returns YYYY-MM-DD string for a given date in Asia/Dubai timezone.
 */
export function getDubaiDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DUBAI_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

/**
 * Formats time in Asia/Dubai for live clock displays.
 */
export function formatDubaiTime(date = new Date(),locale='en') {
  return new Intl.DateTimeFormat(formattingLocale(locale,'en-US'), {
    timeZone: DUBAI_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

/**
 * Parses trip schedule and dates from trip object.
 */
export function parseTripSchedule(trip) {
  if (!trip) return { isDated: false, status: 'invalid' };

  let itinerary = trip.itinerary_data;
  if (typeof itinerary === 'string') {
    try { itinerary = JSON.parse(itinerary); } catch { itinerary = null; }
  }

  const days = Array.isArray(itinerary?.days)
    ? itinerary.days
    : Array.isArray(itinerary)
    ? itinerary
    : [];

  const startDateStr = trip.start_date || itinerary?.start_date || (days[0]?.date ? String(days[0].date).slice(0, 10) : null);
  const endDateStr = trip.end_date || itinerary?.end_date || (days[days.length - 1]?.date ? String(days[days.length - 1].date).slice(0, 10) : null);

  const durationDays = trip.duration_days || itinerary?.duration_days || days.length || 1;

  if (!startDateStr) {
    return {
      isDated: false,
      status: 'undated',
      days,
      durationDays,
      title: trip.title,
      destination: trip.destination || 'UAE'
    };
  }

  // Parse start date as midnight in UTC to avoid daylight/local shifts
  const [sYear, sMonth, sDay] = startDateStr.split('-').map(Number);
  const startDate = new Date(Date.UTC(sYear, sMonth - 1, sDay));

  let endDate;
  if (endDateStr) {
    const [eYear, eMonth, eDay] = endDateStr.split('-').map(Number);
    endDate = new Date(Date.UTC(eYear, eMonth - 1, eDay));
  } else {
    endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + Math.max(durationDays - 1, 0));
  }

  return {
    isDated: true,
    status: trip.status || itinerary?.status || 'draft',
    startDateStr,
    endDateStr: getDubaiDateString(endDate),
    startDate,
    endDate,
    durationDays,
    days,
    title: trip.title,
    destination: trip.destination || 'UAE'
  };
}

/**
 * Determines whether a trip is ongoing today in Asia/Dubai, upcoming, or completed.
 */
export function getTripDailyStatus(trip, dubaiNow = getDubaiNow()) {
  const schedule = parseTripSchedule(trip);
  if (!schedule.isDated) {
    return { state: 'undated', schedule };
  }

  const todayStr = getDubaiDateString(dubaiNow);
  const [tYear, tMonth, tDay] = todayStr.split('-').map(Number);
  const todayUtc = new Date(Date.UTC(tYear, tMonth - 1, tDay));

  const startUtc = schedule.startDate;
  const endUtc = schedule.endDate;

  const msPerDay = 86400000;
  const daysDiffFromStart = Math.floor((todayUtc.getTime() - startUtc.getTime()) / msPerDay);
  const daysDiffFromEnd = Math.floor((todayUtc.getTime() - endUtc.getTime()) / msPerDay);

  if (daysDiffFromStart < 0) {
    return {
      state: 'upcoming',
      daysUntil: Math.abs(daysDiffFromStart),
      startDateStr: schedule.startDateStr,
      schedule
    };
  }

  if (daysDiffFromEnd > 0) {
    return {
      state: 'completed',
      daysAgo: daysDiffFromEnd,
      schedule
    };
  }

  // Trip is ongoing today!
  const dayIndex = Math.min(daysDiffFromStart, Math.max(schedule.days.length - 1, 0));
  const activeDay = schedule.days[dayIndex] || null;

  return {
    state: 'active_today',
    dayIndex,
    dayNumber: dayIndex + 1,
    activeDay,
    schedule
  };
}

/**
 * Scans user trips and returns the primary ongoing trip for today or the closest upcoming trip.
 */
export function findActiveOrUpcomingTrip(trips = [], dubaiNow = getDubaiNow()) {
  if (!Array.isArray(trips) || trips.length === 0) return null;

  const validTrips = trips.filter(t => parseTripSchedule(t).status === 'active');
  const activeTodayList = [];
  const upcomingList = [];

  for (const trip of validTrips) {
    const status = getTripDailyStatus(trip, dubaiNow);
    if (status.state === 'active_today') {
      activeTodayList.push({ trip, status });
    } else if (status.state === 'upcoming') {
      upcomingList.push({ trip, status });
    }
  }

  if (activeTodayList.length > 0) {
    return {
      type: 'active_today',
      primary: activeTodayList[0],
      allActive: activeTodayList
    };
  }

  if (upcomingList.length > 0) {
    // Sort by daysUntil ascending
    upcomingList.sort((a, b) => a.status.daysUntil - b.status.daysUntil);
    return {
      type: 'upcoming',
      primary: upcomingList[0],
      allUpcoming: upcomingList
    };
  }

  return null;
}

/**
 * Determines if a trip belongs to the 'previous' (completed / past) category.
 */
export function isTripPrevious(trip, bookings = [], dubaiNow = getDubaiNow()) {
  if (!trip) return false;
  const status = getTripDailyStatus(trip, dubaiNow);
  if (status.state === 'completed') {
    return true;
  }
  if (status.state === 'active_today' || status.state === 'upcoming') {
    return false;
  }
  // If undated, check if it has a confirmed booking with a checkout date in the past
  if (Array.isArray(bookings) && bookings.length > 0) {
    const todayStr = getDubaiDateString(dubaiNow);
    const tripBookings = bookings.filter(b => b.trip_id === trip.id || (b.destination && trip.destination && String(b.destination).toLowerCase() === String(trip.destination).toLowerCase()));
    if (tripBookings.length > 0) {
      const allPast = tripBookings.every(b => b.checkout && String(b.checkout).slice(0, 10) < todayStr);
      if (allPast) return true;
    }
  }
  return false;
}
