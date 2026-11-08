import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarDate,addCalendarDays,calendarMonth,uaeToday,buildCalendarEvents,initialCalendarDate,exportCalendar} from '../src/lib/tripCalendar.js';

test('calendar date keys stay stable across UTC offsets and reject impossible dates',()=>{
  assert.equal(calendarDate('2026-10-29T00:00:00+04:00'),'2026-10-29');
  assert.equal(calendarDate('2026-02-30'),null);
  assert.equal(addCalendarDays('2026-12-31',1),'2027-01-01');
  assert.equal(uaeToday(new Date('2026-10-27T21:00:00Z')),'2026-10-28');
});
test('month cells align to Sunday and include real adjacent dates',()=>{
  const dates=calendarMonth('2026-10-01');
  assert.equal(dates[0],'2026-09-27');assert.equal(dates.length,35);
  assert.equal(dates.filter(d=>d.startsWith('2026-10')).length,31);
  assert.equal(new Set(dates).size,dates.length);
});
test('string itineraries use travel dates and explicit day dates rather than creation dates',()=>{
  const {events,undated}=buildCalendarEvents([
    {id:1,created_at:'2026-09-01',title:'Dubai',itinerary_data:JSON.stringify({start_date:'2026-10-29',days:[{day_number:1,activities:[]},{day_number:2,date:'2026-11-01',activities:[]}]})},
    {id:2,created_at:'2026-09-01',itinerary_data:{days:[{day_number:1}]}}
  ]);
  assert.deepEqual(events.map(e=>e.date),['2026-10-29','2026-11-01']);assert.equal(undated[0].id,2);
});
test('supported challenges are preserved and cancelled stays are excluded',()=>{
  const {events}=buildCalendarEvents([{id:1,start_date:'2026-10-29',itinerary_data:{days:[{activities:[{id:'a1',title:'Bowling',place_id:'palm-jumeirah-mall'}]}]}}],[{id:2,status:'CANCELLED',checkin:'2026-10-29',checkout:'2026-10-30'}],[{id:3,checkin:'2026-10-30',room_name:'Room'}]);
  assert.equal(events.length,2);assert.equal(events[0].challenges[0].type,'bowling');assert.equal(events[1].type,'hold');
});
test('initial selection opens the next scheduled date instead of an empty today',()=>{
  const events=[{date:'2026-10-25'},{date:'2026-11-02'}];
  assert.equal(initialCalendarDate(events,'2026-10-27'),'2026-11-02');
  assert.equal(initialCalendarDate([],'2026-10-27'),'2026-10-27');
});
test('ICS export uses exclusive all-day ends, stable IDs, private entries and escaped text',()=>{
  const event={id:'hold-1',date:'2026-12-31',type:'hold',title:'Room, deluxe; UAE',description:'Line 1\nLine 2',location:'Dubai'};
  const ics=exportCalendar([event],new Date('2026-10-27T12:00:00Z'));
  assert.ok(ics.includes('DTEND;VALUE=DATE:20270101\r\n'));
  assert.ok(ics.includes('SUMMARY:Room\\, deluxe\\; UAE'));
  assert.ok(ics.includes('DESCRIPTION:Line 1\\nLine 2'));
  assert.ok(ics.includes('UID:hold-1@masar-ai'));
  assert.ok(ics.includes('CLASS:PRIVATE'));assert.ok(ics.includes('STATUS:TENTATIVE'));
});
test('ICS Unicode descriptions fold to valid 75-octet lines',()=>{
  const ics=exportCalendar([{id:'1',date:'2026-10-29',type:'hold',title:'مسار'.repeat(40),description:'Long trip '.repeat(50)}]);
  for(const line of ics.split('\r\n'))assert.ok(new TextEncoder().encode(line).length<=75);
});
