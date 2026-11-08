'use client';
import {useEffect,useState} from 'react';
import {apiRequest} from '@/lib/api';
import {SUPPORT_OPTIONS} from '@/lib/supportNeeds';
import {LocalizedText} from '@/i18n/Localized';
import '@/components/planning/accessibility.css';
const labels=Object.fromEntries(SUPPORT_OPTIONS);
export default function SupportChecklist({trip,token}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    apiRequest(`/api/v1/trip-bookings/${trip.id}`,{token,signal:controller.signal,cache:'no-store'}).then(setData).catch(error=>{if(!controller.signal.aborted)setError(error.message);});
    return()=>controller.abort();
  },[trip.id,token]);
  async function save(event,kind,row){
    event.preventDefault();setBusy(true);setError('');
    const form=new FormData(event.currentTarget);
    try{const result=await apiRequest(`/api/v1/trip-bookings/${trip.id}/support`,{token,method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,traveller:row.traveller,status:form.get('status'),reference:form.get('reference')})});setData(previous=>({...previous,...result}));}
    catch(error){setError(error.message);}finally{setBusy(false);}
  }
  const rows=data?.traveller_support?.filter(row=>row.needs.length)||[];
  if(!rows.length)return error?<p role="alert">{error}</p>:null;
  return <section className="support-editor" aria-label="Support confirmation checklist"><h3><LocalizedText>Confirm your travel support</LocalizedText></h3><p><LocalizedText>Contact the hotel or airline about each traveller’s requirements. Booking does not arrange or confirm assistance. These records are reported by you and are separate from provider booking confirmation.</LocalizedText></p>
    {['flight','hotel'].filter(kind=>trip.itinerary_data?.travel_choices?.[kind==='hotel'?'room':'flight']).map(kind=><div key={kind}><h4>{kind==='hotel'?'Specific room for your stay':'Airline and airport assistance'}</h4>{rows.map(row=>({...row,needs:row.needs.filter(need=>kind==='hotel'||need!=='wheelchair_room'),essential:row.essential.filter(need=>kind==='hotel'||need!=='wheelchair_room')})).filter(row=>row.needs.length).map(row=>{
      const saved=data?.support_confirmations?.[`${kind}:${row.traveller}`];
      return <form key={row.traveller} onSubmit={event=>save(event,kind,row)}><fieldset><legend>Traveller {row.traveller}</legend><p>{row.needs.map(need=>labels[need]).join(', ')}</p><p>Essential: {row.essential.map(need=>labels[need]).join(', ')||'None'}</p>
        <label>Status <select name="status" defaultValue={saved?.status||'not_requested'} disabled={busy}><option value="not_requested">Confirm with provider</option><option value="requested">Requested · awaiting confirmation</option><option value="confirmed">I received confirmation</option><option value="unavailable">Unavailable</option></select></label>
        <label>Contact and confirmation reference <input name="reference" type="text" maxLength={500} defaultValue={saved?.reference||''} disabled={busy}/></label><button disabled={busy} type="submit">Save support status</button>
        {saved&&<p role="status">{saved.status} · Reported by you · {saved.recorded_at?.slice(0,10)}</p>}
      </fieldset></form>;
    })}</div>)}{error&&<p role="alert">{error}</p>}
  </section>;
}
