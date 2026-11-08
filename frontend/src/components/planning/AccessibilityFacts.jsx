import {LocalizedText} from '@/i18n/Localized';
import './accessibility.css';
const LABELS={step_free_entrance:'Step-free entrance',accessible_toilets:'Accessible toilets',lift:'Lift availability',surface:'Surface type',walking_distance_m:'Walking distance (metres)',quiet_times:'Quiet times',assistance_contact:'Assistance contact',wheelchair_room:'Wheelchair-accessible room',low_sensory:'Low-sensory arrangements',captions:'Captions',screen_reader:'Screen-reader instructions',rest_seating:'Rest seating',entrance_door_width:'Entrance door width',shower_chair:'Shower chair'};
const VENUE=['step_free_entrance','accessible_toilets','lift','surface','walking_distance_m','quiet_times','assistance_contact'];
export default function AccessibilityFacts({evidence,propertyEvidence}) {
  const keys=evidence?.scope==='room'?['wheelchair_room','accessible_toilets','shower_chair']:VENUE;
  const fields=[...new Set([...keys,...Object.keys(evidence?.facts||{})])];
  return <details className="accessibility-facts"><summary><LocalizedText>Accessibility details</LocalizedText></summary>
    <p><LocalizedText>{evidence?.scope==='room'?'Room-specific information. Confirm this room for your dates and requirements.':evidence?.scope==='property'?'Property facilities do not confirm a particular accessible room.':'Missing information needs confirmation with the venue.'}</LocalizedText></p>
    <dl>{fields.filter(key=>LABELS[key]).map(key=>{
      const fact=evidence?.facts?.[key];const known=fact&&['reported','confirmed'].includes(fact.status)&&fact.value!=null;
      return <div key={key}><dt><LocalizedText>{LABELS[key]}</LocalizedText></dt><dd><LocalizedText>{known?`${fact.value===true?'Yes':fact.value===false?'No':fact.value} · ${fact.status}`:'Unknown · Confirm with venue'}</LocalizedText>{fact?.note&&<small><LocalizedText>{fact.note}</LocalizedText></small>}{fact?.source_url&&<small><a href={fact.source_url} target="_blank" rel="noopener noreferrer">{fact.source||'Source'}</a>{` · Last checked ${fact.last_checked?.slice(0,10)||'Unknown'}`}</small>}</dd></div>;
    })}</dl>
    {evidence?.reported_features?.length>0&&<div><strong>Additional supplier-reported details</strong><ul>{evidence.reported_features.map((text,index)=><li key={index}>{text.replace(/([a-z])([A-Z])/g,'$1 $2')}</li>)}</ul>{evidence.source_url&&<a href={evidence.source_url} target="_blank" rel="noopener noreferrer">LiteAPI source</a>}<small>Last checked {evidence.last_checked?.slice(0,10)||'Unknown'} · Confirm with hotel</small></div>}
    {propertyEvidence&&<AccessibilityFacts evidence={propertyEvidence}/>}
  </details>;
}
