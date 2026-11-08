import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDubaiDateString,
  parseTripSchedule,
  getTripDailyStatus,
  findActiveOrUpcomingTrip
} from '../src/utils/dubaiDate.js';

test('getDubaiDateString formats accurately in UTC+4', () => {
  // 8:00 PM UTC on 2026-11-01 is 12:00 AM on 2026-11-02 in Dubai
  const utcDate = new Date('2026-11-01T20:30:00Z');
  const dubaiDate = getDubaiDateString(utcDate);
  assert.equal(dubaiDate, '2026-11-02');
});

test('parseTripSchedule handles undated trips explicitly', () => {
  const undatedTrip = {
    id: 1,
    title: 'Undated Trip',
    itinerary_data: { days: [{ theme: 'Exploring' }] }
  };
  const parsed = parseTripSchedule(undatedTrip);
  assert.equal(parsed.isDated, false);
  assert.equal(parsed.status, 'undated');
});

test('parseTripSchedule parses dated trips correctly', () => {
  const datedTrip = {
    id: 2,
    title: 'UAE Adventure',
    start_date: '2026-11-02',
    duration_days: 5,
    itinerary_data: {
      days: [
        { day_number: 1, theme: 'Arrival' },
        { day_number: 2, theme: 'City Lights' }
      ]
    }
  };
  const parsed = parseTripSchedule(datedTrip);
  assert.equal(parsed.isDated, true);
  assert.equal(parsed.startDateStr, '2026-11-02');
  assert.equal(parsed.endDateStr, '2026-11-06');
});

test('getTripDailyStatus recognizes active_today, upcoming, and completed', () => {
  const trip = {
    id: 3,
    title: 'Dubai Tour',
    start_date: '2026-11-02',
    duration_days: 3,
    itinerary_data: {
      days: [
        { day: 1, theme: 'Day 1' },
        { day: 2, theme: 'Day 2' },
        { day: 3, theme: 'Day 3' }
      ]
    }
  };

  // 1. Before trip starts (Oct 30) -> upcoming
  const beforeDate = new Date('2026-10-30T10:00:00Z');
  const beforeStatus = getTripDailyStatus(trip, beforeDate);
  assert.equal(beforeStatus.state, 'upcoming');
  assert.equal(beforeStatus.daysUntil, 3);

  // 2. On Day 2 (Nov 3) -> active_today with dayIndex 1
  const day2Date = new Date('2026-11-03T10:00:00Z');
  const activeStatus = getTripDailyStatus(trip, day2Date);
  assert.equal(activeStatus.state, 'active_today');
  assert.equal(activeStatus.dayIndex, 1);
  assert.equal(activeStatus.dayNumber, 2);

  // 3. After trip ends (Nov 10) -> completed
  const afterDate = new Date('2026-11-10T10:00:00Z');
  const completedStatus = getTripDailyStatus(trip, afterDate);
  assert.equal(completedStatus.state, 'completed');
});

test('findActiveOrUpcomingTrip prioritizes active trip over upcoming', () => {
  const upcomingTrip = {
    id: 10,
    title: 'Future Trip',
    start_date: '2026-11-15',
    duration_days: 3,
    status: 'draft'
  };
  const activeTrip = {
    id: 11,
    title: 'Current Trip',
    start_date: '2026-11-02',
    duration_days: 4,
    status: 'active',
    itinerary_data: { days: [{ day: 1 }, { day: 2 }] }
  };

  const today = new Date('2026-11-03T12:00:00Z');
  const result = findActiveOrUpcomingTrip([upcomingTrip, activeTrip], today);
  assert.ok(result);
  assert.equal(result.type, 'active_today');
  assert.equal(result.primary.trip.id, 11);
});

test('draft trips do not become the active daily journey just because dates match',()=>{
 const trip={id:1,status:'draft',start_date:'2026-11-01',end_date:'2026-11-01',itinerary_data:{days:[{activities:[]}]}};
 assert.equal(findActiveOrUpcomingTrip([trip],new Date('2026-11-01T10:00:00Z')),null);
});
