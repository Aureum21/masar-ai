'use client';
import {useI18n} from '@/i18n/LocaleProvider';
import {formattingLocale} from '@/i18n/messages.mjs';

import {Localized,LocalizedText} from '@/i18n/Localized';

import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Search,Radio,CalendarDays} from 'lucide-react';
import {useAuth} from '@/context/AuthContext';
import {apiRequest} from '@/lib/api';
import ExplorePlaceCard from './ExplorePlaceCard';
import {discoveryPayload,mergeDiscoveryItems} from '@/lib/discovery';

export default function LiveDiscovery({region,category,query,ids,onToggle,onAsk}) {
  const {locale:uiLocale}=useI18n();

  const {token}=useAuth();
  const [start,setStart]=useState('');
  const [end,setEnd]=useState('');
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const request=useRef(null);
  const version=useRef(0);
  useEffect(()=>()=>{request.current?.abort();version.current++;},[]);
  const supported=category!=='guides';
  const effective=category==='for-you'?'things-to-do':category;
  const payload=discoveryPayload({region,category:effective,query,start,end});
  const fingerprint=JSON.stringify(payload);
  const current=result?.fingerprint===fingerprint?result:null;
  async function search(cursor=null) {
    request.current?.abort();
    const controller=new AbortController();request.current=controller;
    const run=++version.current;
    setError('');setLoading(true);
    try {
      const data=await apiRequest('/api/v1/discovery/search',{token,method:'POST',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,cursor})});
      if(run!==version.current||controller.signal.aborted)return;
      if(data.status==='unavailable'||data.status==='invalid_query') {setError(data.message);setResult(null);}
      else setResult({...data,fingerprint,items:cursor?mergeDiscoveryItems(current?.items||[],data.items):data.items});
    } catch(failure) {if(run===version.current&&!controller.signal.aborted)setError(failure.message);}
    finally {if(run===version.current&&!controller.signal.aborted)setLoading(false);}
  }
  return <Localized element={"section"} attributes={["aria-label"]} className="live-discovery" aria-label="Live UAE discovery" aria-busy={loading}>
    <div className="live-discovery-heading"><span className="live-discovery-icon"><Radio size={21}/></span><div><span className="journey-eyebrow"><LocalizedText message={"A LITTLE FURTHER AFIELD"} /></span><h2><LocalizedText message={"Discover beyond the shortlist."} /></h2><p><LocalizedText>{effective==='events'?'Find dated events from Ticketmaster.':'Search Google Maps for places across the UAE.'}</LocalizedText> <LocalizedText>{effective==='stays'?'This finds hotels; dates and guests are needed for room rates.':'Confirm opening times and availability before you go.'}</LocalizedText></p></div></div>
    {!supported?<p className="journey-alert"><LocalizedText message={"Our guides are curated. Choose Restaurants, Things to do, Events, Stays or Locations to search live sources."} /></p>:<form className="live-discovery-form" onSubmit={event=>{event.preventDefault();search();}}>
      {effective==='events'&&<div className="live-date-fields"><label><CalendarDays size={14}/><LocalizedText message={" From"} /><Localized element={"input"} attributes={["aria-label"]} aria-label="Event start date" type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label><LocalizedText message={"Until"} /><Localized element={"input"} attributes={["aria-label"]} aria-label="Event end date" type="date" min={start} value={end} onChange={e=>setEnd(e.target.value)}/></label><small><LocalizedText message={"Leave dates empty for the next 30 days."} /></small></div>}
      <button className="journey-btn gold" disabled={loading||!token} type="submit"><Search size={15}/><LocalizedText>{loading?'Finding places…':`Search ${effective==='events'?'events':'places'}`}</LocalizedText> <ArrowRight size={15}/></button>
      <span><LocalizedText message={"Your search uses the category, emirate and search box above."} /></span>
    </form>}
    {error&&<p className="journey-alert" role="alert"><LocalizedText message={"⟦0⟧ Switch to MASAR picks to keep exploring."} values={[error]} /></p>}
    {current&&<><div className="live-results-meta" role="status"><span><LocalizedText>{current.message}</LocalizedText></span><small><LocalizedText message={"⟦0⟧⟦1⟧ · ⟦2⟧ results"} values={[current.checkedAt?`Checked ${new Date(current.checkedAt).toLocaleString(formattingLocale(uiLocale, 'en-GB'),{timeZone:'Asia/Dubai',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} UAE`:'',current.cached?' · recent results':'',current.items.length]} /></small></div>
      {current.provider==='google'&&<div className="google-discovery-attribution"><span className="google-maps-credit" translate="no"><LocalizedText message={"Google Maps"} /></span><span><LocalizedText message={"Provider results · open a place to view its source"} /></span></div>}
      {!current.items.length?<div className="journey-empty"><Search size={25}/><h3><LocalizedText message={"A different search might open a door."} /></h3><p><LocalizedText message={"Try a broader area or another date."} /></p></div>:<div className="discovery-cards live-cards">{current.items.map(place=><ExplorePlaceCard key={place.id} place={place} inShortlist={ids.has(place.id)} onToggleShortlist={onToggle} onPlanTrip={onAsk}/>)}</div>}
      {current.nextCursor&&<button className="journey-btn subtle live-more" disabled={loading} onClick={()=>search(current.nextCursor)}><LocalizedText>{loading?'Finding more…':'Find more'}</LocalizedText> <ArrowRight size={14}/></button>}
    </>}
  </Localized>;
}
