import {parseHotelInfo} from '../utils/hotelParser.js';
import {isLandmarkChallenge} from './tripWorkspace.js';

export function calendarDate(value) {
  if(typeof value!=='string')return null;
  const key=value.slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(key))return null;
  const date=new Date(key+'T12:00:00Z');
  return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===key?key:null;
}
export function addCalendarDays(key,days) {
  if(!calendarDate(key))return null;
  const date=new Date(key+'T12:00:00Z');
  date.setUTCDate(date.getUTCDate()+days);
  return date.toISOString().slice(0,10);
}
export function uaeToday(date=new Date()) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dubai',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
export function calendarMonth(key) {
  const first=key.slice(0,7)+'-01';
  const weekday=new Date(first+'T12:00:00Z').getUTCDay();
  const month=new Date(first+'T12:00:00Z');
  const total=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,0)).getUTCDate();
  const length=Math.ceil((weekday+total)/7)*7;
  return Array.from({length},(_,index)=>addCalendarDays(first,index-weekday));
}
export function buildCalendarEvents(trips=[],bookings=[],holds=[]) {
  const events=[];const undated=[];
  for(const trip of trips) {
    let itinerary=trip.itinerary_data;
    try{if(typeof itinerary==='string')itinerary=JSON.parse(itinerary);}catch{itinerary=null;}
    const days=Array.isArray(itinerary)?itinerary:Array.isArray(itinerary?.days)?itinerary.days:[];
    const start=calendarDate(trip.start_date)||calendarDate(itinerary?.start_date);
    let added=0;
    for(const [index,day] of days.entries()) {
      const dayNumber=Number.isInteger(day.day_number)&&day.day_number>0?day.day_number:index+1;
      const date=calendarDate(day.date)||(start?addCalendarDays(start,dayNumber-1):null);
      if(!date)continue;
      const activities=Array.isArray(day.activities)?day.activities:[];
      const challenges=activities.map(isLandmarkChallenge).filter(Boolean);
      events.push({id:`trip-${trip.id}-day-${dayNumber}`,date,type:'trip',title:day.theme||trip.title||'Your trip',tripTitle:trip.title||'Your trip',location:typeof trip.destination==='string'?trip.destination:'UAE',trip,dayNumber,activities,challenges,accessibility_notes:Array.isArray(day.accessibility_notes)?day.accessibility_notes:[],description:`${trip.title||'Your trip'} · Day ${dayNumber}. ${activities.map(a=>a.title||a.name).filter(Boolean).join(' · ')}`});
      added++;
    }
    if(!added)undated.push(trip);
  }
  for(const booking of bookings) {
    if(['CANCELLED','CANCELED','FAILED','REJECTED'].includes(String(booking.status).toUpperCase()))continue;
    const hotel=parseHotelInfo(booking.hotel_info,booking.id);
    for(const [field,label] of [['checkin','Check-in'],['checkout','Check-out']]) {
      const date=calendarDate(booking[field]);if(!date)continue;
      events.push({id:`booking-${booking.id}-${field}`,date,type:'stay',title:`${label} · ${hotel.name}`,location:hotel.location||'',description:`${label} at ${hotel.name}. Refer to your booking voucher for confirmed details.`,booking});
    }
  }
  for(const hold of holds) {
    const date=calendarDate(hold.checkin);if(!date)continue;
    events.push({id:`hold-${hold.id}`,date,type:'hold',title:hold.room_name||'Room quote',location:'',description:'Room quote / rate hold. This is not a confirmed booking.',hold});
  }
  return {events:events.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)),undated};
}
export function initialCalendarDate(events,today) {
  return events.find(event=>event.date>=today)?.date||events.at(-1)?.date||today;
}
const escapeICS=value=>String(value||'').replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
function foldLine(line) {
  const lines=[];let current='';let size=0;
  for(const character of line) {
    const bytes=new TextEncoder().encode(character).length;
    if(size+bytes>75){lines.push(current);current=' ';size=1;}
    current+=character;size+=bytes;
  }
  lines.push(current);return lines.join('\r\n');
}
export function exportCalendar(events,now=new Date()) {
  const stamp=now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MASAR AI//Travel calendar//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:MASAR AI journeys'];
  for(const event of events)lines.push('BEGIN:VEVENT',`UID:${event.id}@masar-ai`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${event.date.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${addCalendarDays(event.date,1).replace(/-/g,'')}`,`SUMMARY:${escapeICS(event.type==='trip'?`${event.tripTitle} · Day ${event.dayNumber}`:event.title)}`,`DESCRIPTION:${escapeICS(event.description+(event.accessibility_notes?.length?'\nAccessibility notes: '+event.accessibility_notes.join('\n'):''))}`,`LOCATION:${escapeICS(event.location)}`,'CLASS:PRIVATE','TRANSP:TRANSPARENT',`STATUS:${event.type==='hold'?'TENTATIVE':'CONFIRMED'}`,'END:VEVENT');
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n')+'\r\n';
}
