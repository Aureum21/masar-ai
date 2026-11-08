import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  reorderActivities,
  moveActivityToDay,
  removeActivity,
  updateActivityStatus,
  makeDayLighter,
  isLandmarkChallenge,
  computeTripBudget, tripHasConfirmedBooking
} from '../src/lib/tripWorkspace.js';

test('reorderActivities moves item within a day preserving identity', () => {
  const days = [
    {
      id: 'd1',
      day_number: 1,
      activities: [
        { id: 'a1', title: 'Breakfast' },
        { id: 'a2', title: 'Museum' },
        { id: 'a3', title: 'Dinner' }
      ]
    }
  ];
  const updated = reorderActivities(days, 0, 0, 2);
  assert.equal(updated[0].activities[0].id, 'a2');
  assert.equal(updated[0].activities[1].id, 'a3');
  assert.equal(updated[0].activities[2].id, 'a1');
  assert.equal(updated[0].activities[2].title, 'Breakfast');
});

test('moveActivityToDay shifts activity across days', () => {
  const days = [
    {
      id: 'd1',
      day_number: 1,
      activities: [{ id: 'a1', title: 'Museum' }]
    },
    {
      id: 'd2',
      day_number: 2,
      activities: [{ id: 'a2', title: 'Beach' }]
    }
  ];
  const updated = moveActivityToDay(days, 0, 0, 1);
  assert.equal(updated[0].activities.length, 0);
  assert.equal(updated[1].activities.length, 2);
  assert.equal(updated[1].activities[1].id, 'a1');
});

test('removeActivity eliminates selected activity', () => {
  const days = [
    {
      id: 'd1',
      day_number: 1,
      activities: [
        { id: 'a1', title: 'Stop 1' },
        { id: 'a2', title: 'Stop 2' }
      ]
    }
  ];
  const updated = removeActivity(days, 0, 0);
  assert.equal(updated[0].activities.length, 1);
  assert.equal(updated[0].activities[0].id, 'a2');
});

test('updateActivityStatus sets visit progress', () => {
  const days = [
    {
      id: 'd1',
      day_number: 1,
      activities: [{ id: 'a1', title: 'Burj Khalifa', status: 'pending' }]
    }
  ];
  const updated = updateActivityStatus(days, 0, 0, 'visited');
  assert.equal(updated[0].activities[0].status, 'visited');
});

test('makeDayLighter moves excess activity to next day or trims safely', () => {
  const days = [
    {
      id: 'd1',
      day_number: 1,
      activities: [
        { id: 'a1', title: 'Museum of the Future' },
        { id: 'a2', title: 'Dubai Mall' },
        { id: 'a3', title: 'Evening Walk' }
      ]
    },
    {
      id: 'd2',
      day_number: 2,
      activities: [{ id: 'a4', title: 'Desert Safari' }]
    }
  ];
  const result = makeDayLighter(days, 0);
  assert.equal(result.movedCount, 1);
  assert.equal(result.days[0].activities.length, 2);
  assert.equal(result.days[1].activities.length, 2);
  assert.equal(result.days[1].activities[1].id, 'a3');
});

test('isLandmarkChallenge recognizes only approved landmarks', () => {
  assert.ok(isLandmarkChallenge({ title: 'Museum of the Future Tour' }));
  assert.ok(isLandmarkChallenge({ place_id: 'burj-khalifa-observation' }));
  assert.ok(isLandmarkChallenge({ title: 'Visit Sheikh Zayed Grand Mosque' }));
  assert.equal(isLandmarkChallenge({ title: 'Random Beach' }), null);
  assert.equal(isLandmarkChallenge({ title: 'Dubai Hills Mall Bowling' }), null);
});

test('computeTripBudget calculates estimated vs confirmed amounts', () => {
  const days = [
    {
      activities: [
        { cost: 150, booking_status: 'confirmed' },
        { cost: 80, booking_status: 'suggested' }
      ]
    }
  ];
  const hotel = { price: 500, booking_status: 'confirmed' };
  const budget = computeTripBudget(days, hotel);
  assert.equal(budget.estimatedTotal, 730);
  assert.equal(budget.confirmedTotal, 0);
});

test('day lightening preserves must visits and confirmed commitments',()=>{
 const days=[{activities:[{id:'a',title:'A',priority:'must_visit'},{id:'b',title:'B',booking_ref:'ref'},{id:'c',title:'Museum of the Future'}]}];
 const result=makeDayLighter(days,0);
 assert.equal(result.movedCount,0);assert.deepEqual(result.days,days);
});
test('cross-day moves clear flexible times and preserve identity',()=>{
 const days=[{activities:[{id:'a',title:'Walk',start_time:'10:00',end_time:'11:00'}]},{activities:[]}];
 const moved=moveActivityToDay(days,0,0,1)[1].activities[0];
 assert.equal(moved.id,'a');assert.equal(moved.start_time,undefined);assert.equal(moved.end_time,undefined);assert.equal(moved.needs_schedule_review,true);
});

test('only provider-confirmed live bookings qualify a trip as booked',()=>{
 assert.equal(tripHasConfirmedBooking({id:1,featured_hotel:{booking_status:'confirmed'},itinerary_data:{days:[{activities:[{booking_ref:'made-up'}]}]}}),false);
 assert.equal(tripHasConfirmedBooking({id:1,reservations:[{source:'provider',status:'CONFIRMED',environment:'sandbox',trip_id:1}]}),false);
 assert.equal(tripHasConfirmedBooking({id:1,reservations:[{source:'provider',status:'CONFIRMED',environment:'live',trip_id:1}]}),true);
});
