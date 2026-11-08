'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';

import {useI18n} from '@/i18n/LocaleProvider';
import {formattingLocale} from '@/i18n/messages.mjs';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {ChevronLeft,ChevronRight,CalendarDays,Download,ArrowUpRight,MapPin,Clock,Building2,Luggage,Award,Bookmark,Grid2X2,List} from 'lucide-react';
import {buildCalendarEvents,calendarMonth,addCalendarDays,uaeToday,initialCalendarDate,exportCalendar} from '@/lib/tripCalendar';
import styles from './InteractiveTripCalendar.module.css';

const FILTERS=[['all','Everything'],['trip','Trip days'],['challenge','Challenges'],['stay','Stays'],['hold','Room quotes']];
const matches=(event,filter)=>filter==='all'||(filter==='challenge'?event.challenges?.length:event.type===filter);
const IconFor=({type,...props})=>type==='stay'?<Building2 {...props}/>:type==='hold'?<Bookmark {...props}/>:<Luggage {...props}/>;

export default function InteractiveTripCalendar({trips=[],bookings=[],preBookings=[],onSelectTrip}) {
  const {locale}=useI18n();
  const formatDate=(key,options)=>new Intl.DateTimeFormat(formattingLocale(locale,'en'),{...options,timeZone:'UTC'}).format(new Date(key+'T12:00:00Z'));

  const {events,undated}=useMemo(()=>buildCalendarEvents(trips,bookings,preBookings),[trips,bookings,preBookings]);
  const today=uaeToday();
  const [chosen,setChosen]=useState(null);
  const selected=chosen||initialCalendarDate(events,today);
  const [monthOverride,setMonthOverride]=useState(null);
  const month=monthOverride||selected.slice(0,7)+'-01';
  const [mode,setMode]=useState('month');
  const [filter,setFilter]=useState('all');
  const [exported,setExported]=useState(false);
  const filtered=events.filter(event=>matches(event,filter));
  const monthEvents=filtered.filter(event=>event.date.slice(0,7)===month.slice(0,7));
  const byDate=new Map();
  for(const event of filtered){if(!byDate.has(event.date))byDate.set(event.date,[]);byDate.get(event.date).push(event);}
  const daily=byDate.get(selected)||[];
  const next=filtered.find(event=>event.date>selected);
  function selectDate(date){setChosen(date);setMonthOverride(date.slice(0,7)+'-01');}
  function moveMonth(offset) {
    const date=new Date(month+'T12:00:00Z');date.setUTCMonth(date.getUTCMonth()+offset);
    const target=date.toISOString().slice(0,10);
    selectDate(filtered.find(event=>event.date.slice(0,7)===target.slice(0,7))?.date||target);
  }
  function download() {
    const url=URL.createObjectURL(new Blob([exportCalendar(filtered)],{type:'text/calendar;charset=utf-8'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download='masar-journeys.ics';anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);setExported(true);
  }
  function navigateDate(event,date) {
    const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
    if(!(event.key in offsets))return;
    event.preventDefault();const target=addCalendarDays(date,offsets[event.key]);selectDate(target);
    requestAnimationFrame(()=>document.querySelector(`[data-calendar-date="${target}"]`)?.focus());
  }
  return <Localized element={"section"} attributes={["aria-label"]} className={styles.calendar} aria-label="Your travel calendar">
    <header className={styles.toolbar}>
      <div><span className={styles.eyebrow}><LocalizedText message={"YOUR DAYS, CONNECTED"} /></span><div className={styles.monthTitle}><h2>{formatDate(month,{month:'long',year:'numeric'})}</h2><span><LocalizedText message={"UAE · GMT+4"} /></span></div></div>
      <div className={styles.controls}><button type="button" onClick={()=>selectDate(today)}><LocalizedText message={"Today"} /></button><Localized element={"button"} attributes={["aria-label"]} type="button" aria-label="Previous month" onClick={()=>moveMonth(-1)}><ChevronLeft size={17}/></Localized><Localized element={"button"} attributes={["aria-label"]} type="button" aria-label="Next month" onClick={()=>moveMonth(1)}><ChevronRight size={17}/></Localized><Localized element={"div"} attributes={["aria-label"]} className={styles.viewSwitch} role="group" aria-label="Calendar view"><button type="button" aria-pressed={mode==='month'} onClick={()=>setMode('month')}><Grid2X2 size={14}/><span><LocalizedText message={"Month"} /></span></button><button type="button" aria-pressed={mode==='agenda'} onClick={()=>setMode('agenda')}><List size={15}/><span><LocalizedText message={"Agenda"} /></span></button></Localized><Localized element={"button"} attributes={["title"]} type="button" disabled={!filtered.length} onClick={download} title="Download an .ics file to import into your calendar"><Download size={15}/><span><LocalizedText message={"Export"} /></span></Localized></div>
    </header>
    <div className={styles.filterBar}><Localized element={"div"} attributes={["aria-label"]} className={styles.filters} role="group" aria-label="Filter calendar entries">{FILTERS.map(([key,label])=><button type="button" key={key} aria-pressed={filter===key} onClick={()=>setFilter(key)}><LocalizedText>{label}</LocalizedText><span>{events.filter(event=>matches(event,key)).length}</span></button>)}</Localized><span className={styles.periodCount}><LocalizedText message={"⟦0⟧ entries this month"} values={[monthEvents.length]} /></span></div>
    {exported&&<p className={styles.notice} role="status"><LocalizedText message={"Calendar file downloaded. Import it into Google Calendar, Apple Calendar or Outlook. This is a snapshot; future edits do not sync automatically."} /></p>}
    <div className={styles.layout}>
      <div className={styles.monthPanel}>
        {mode==='month'?<>
          <div className={styles.weekdays} aria-hidden="true">{['SUN','MON','TUE','WED','THU','FRI','SAT'].map(day=><span key={day}>{day}</span>)}</div>
          <Localized element={"div"} attributes={["aria-label"]} className={styles.monthGrid} role="group" aria-label={formatDate(month,{month:'long',year:'numeric'})}>
            {calendarMonth(month).map(date=>{const items=byDate.get(date)||[];return <Localized element={"button"} attributes={["aria-label"]} type="button" data-calendar-date={date} key={date} onClick={()=>selectDate(date)} onKeyDown={event=>navigateDate(event,date)} tabIndex={date===selected?0:-1} aria-pressed={date===selected} aria-current={date===today?'date':undefined} aria-label={`${formatDate(date,{weekday:'long',month:'long',day:'numeric'})}, ${items.length} entries`} className={`${styles.day} ${date.slice(0,7)!==month.slice(0,7)?styles.outside:''} ${date===selected?styles.selected:''}`}><span className={styles.dayNumber}>{Number(date.slice(-2))}{date===today&&<i/>}</span><span className={styles.dayEvents}>{items.slice(0,2).map(item=><span key={item.id} className={`${styles.eventChip} ${styles[item.type]}`}><i/><LocalizedText>{item.type==='trip'?`Day ${item.dayNumber} · ${item.title}`:item.title}</LocalizedText></span>)}{items.length>2&&<small><LocalizedText message={"+⟦0⟧ more"} values={[items.length-2]} /></small>}</span><span className={styles.mobileDots} aria-hidden="true">{items.slice(0,3).map(item=><i key={item.id} className={styles[item.type]}/>)}</span></Localized>;})}
          </Localized>
          <div className={styles.legend}><span><i className={styles.trip}/><LocalizedText message={"Trip day"} /></span><span><i className={styles.stay}/><LocalizedText message={"Hotel stay"} /></span><span><i className={styles.hold}/><LocalizedText message={"Room quote"} /></span><small><LocalizedText message={"Dates are shown as planned; room quotes are not bookings."} /></small></div>
        </>:<div className={styles.agenda}>{monthEvents.length?<>{[...new Set(monthEvents.map(event=>event.date))].map(date=><section key={date}><button type="button" className={styles.agendaDate} onClick={()=>selectDate(date)}><b>{formatDate(date,{day:'numeric'})}</b><span>{formatDate(date,{weekday:'short',month:'short'})}</span></button><div>{byDate.get(date).map(event=><button type="button" className={styles.agendaEntry} key={event.id} onClick={()=>selectDate(date)}><IconFor type={event.type} size={16}/><span><strong>{event.title}</strong><small><LocalizedText>{event.type==='trip'?`${event.tripTitle} · Day ${event.dayNumber}`:event.type==='hold'?'Quote · not booked':'Hotel schedule'}</LocalizedText></small></span><ArrowUpRight size={14}/></button>)}</div></section>)}</>:<div className={styles.empty}><CalendarDays size={28}/><strong><LocalizedText message={"A little room for discovery."} /></strong><p><LocalizedText message={"No matching entries this month. Choose another month or filter."} /></p></div>}</div>}
      </div>
      <Localized element={"aside"} attributes={["aria-label"]} className={styles.dailyPanel} aria-label="Selected day schedule">
        <div className={styles.dailyHeading}><span className={styles.eyebrow}><LocalizedText>{selected===today?'TODAY’S CHAPTER':'YOUR DAILY CHAPTER'}</LocalizedText></span><h3>{formatDate(selected,{weekday:'long',day:'numeric',month:'long'})}</h3><p><LocalizedText message={"⟦0⟧  ⟦1⟧ · Asia/Dubai"} values={[daily.length,daily.length===1?'entry':'entries']} /></p></div>
        {daily.length?<div className={styles.timeline}>{daily.map(event=><article key={event.id} className={styles.timelineItem}><span className={`${styles.timelineIcon} ${styles[event.type]}`}><IconFor type={event.type} size={16}/></span><div className={styles.timelineBody}><span className={styles.eventLabel}><LocalizedText>{event.type==='trip'?`DAY ${event.dayNumber} · PLANNED ITINERARY`:event.type==='hold'?'ROOM QUOTE · NOT BOOKED':'HOTEL SCHEDULE'}</LocalizedText></span><h4>{event.title}</h4>{event.type==='trip'&&<p>{event.tripTitle}</p>}{event.location&&<small className={styles.location}><MapPin size={12}/>{event.location}</small>}{event.challenges?.length>0&&<div className={styles.challengeTag}><Award size={12}/>{event.challenges[0].name}</div>}{event.activities?.length>0&&<ul className={styles.stops}>{event.activities.map((activity,index)=><li key={activity.id||index}><Clock size={11}/><span><LocalizedText>{activity.time||activity.start_time||'Flexible'}</LocalizedText></span><strong><LocalizedText>{activity.title||activity.name||'Planned stop'}</LocalizedText></strong></li>)}</ul>}{event.accessibility_notes?.length>0&&<details><summary><LocalizedText>Accessibility notes</LocalizedText></summary><ul>{event.accessibility_notes.map((note,index)=><li key={index}><LocalizedText>{note}</LocalizedText></li>)}</ul></details>}{event.trip&&<button type="button" className={styles.openTrip} onClick={()=>onSelectTrip?.(event.trip,event.dayNumber)}><LocalizedText message={"Open this trip day "} /><ArrowUpRight size={13}/></button>}{event.booking&&<p className={styles.finePrint}><LocalizedText message={"Use Stays & Vouchers to review booking status and details."} /></p>}</div></article>)}</div>:<div className={styles.empty}><CalendarDays size={27}/><strong><LocalizedText message={"Your day is open."} /></strong><p><LocalizedText message={"Select a highlighted date to see your plans."} /></p>{next&&<button type="button" className={styles.openTrip} onClick={()=>selectDate(next.date)}><LocalizedText message={"Next planned day · "} />{formatDate(next.date,{month:'short',day:'numeric'})}<ArrowUpRight size={13}/></button>}</div>}
        {undated.length>0&&<div className={styles.undated}><span className={styles.eyebrow}><LocalizedText message={"WAITING FOR DATES"} /></span><p><LocalizedText preserveValues={[false,true]} message={"⟦0⟧  ⟦1⟧ travel dates before appearing here."} values={[undated.length,undated.length===1?'trip needs':'trips need']} /></p>{undated.slice(0,3).map(trip=><button type="button" key={trip.id} onClick={()=>onSelectTrip?.(trip)}><LocalizedText>{trip.title||'Saved trip'}</LocalizedText><ArrowUpRight size={13}/></button>)}</div>}
        {!events.length&&<Link href="/explore" className={styles.openTrip}><LocalizedText message={"Find your next destination "} /><ArrowUpRight size={13}/></Link>}
      </Localized>
    </div>
  </Localized>;
}
