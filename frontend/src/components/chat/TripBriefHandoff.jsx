'use client';
import {LocalizedText} from '@/i18n/Localized';

import {useCallback,useMemo,useState,useSyncExternalStore} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {apiRequest} from '@/lib/api';
import {ArrowRight,CalendarDays,MapPin,Users} from 'lucide-react';
import {useAuth} from '@/context/AuthContext';
import {consumeHandoffPacket,handoffSnapshot} from '@/lib/planningHandoff';
import MasarWelcomeEmblem from '@/components/chat/MasarWelcomeEmblem';
import '../layout/journey.css';
const subscribe=()=>()=>{};
export default function TripBriefHandoff({id,onSend,busy}) {
  const {user,token}=useAuth();
  const router=useRouter();
  const [starting,setStarting]=useState(false);
  const [error,setError]=useState('');
  const snapshot=useCallback(()=>handoffSnapshot(id),[id]);
  const raw=useSyncExternalStore(subscribe,snapshot,()=> '');
  const packet=useMemo(()=>{try{return JSON.parse(raw);}catch{return null;}},[raw]);
  const owned=packet?.owner===String(user?.id);
  async function start() {
    if(starting)return;
    setStarting(true);setError('');
    try {
      if(!owned||packet.expiresAt<=Date.now())throw new Error('Open your saved trip brief again to restart planning.');
      if(packet.context?.brief_id) {
        const status=await apiRequest('/api/v1/planning/status',{token,cache:'no-store'});
        if(status.durable_planning_available) {
          const run=await apiRequest('/api/v1/planning/runs',{token,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({brief_id:packet.context.brief_id,brief_revision:packet.context.brief_revision,request_id:id})});
          // Keep the same request key until navigation. A lost response is safe to retry.
          router.push(`/plan/runs/${run.id}`);return;
        }
      }
      const accepted=consumeHandoffPacket(user.id,id);
      if(!accepted)throw new Error('Your brief is still saved. Open it again to restart planning.');
      onSend(accepted.prompt,accepted.context||{});
    } catch(error){setError(error.message);}
    finally {setStarting(false);}
  }
  return <section className="brief-handoff"><MasarWelcomeEmblem/><span className="journey-eyebrow"><LocalizedText message={"YOUR JOURNEY, READY TO BEGIN"} /></span><h1><LocalizedText message={"Let’s connect the dots."} /></h1><p><LocalizedText message={"Your choices give MASAR a starting point."} /><br/><LocalizedText message={"We’ll plan the rest together."} /></p>{owned&&<div className="brief-handoff-stats"><span><CalendarDays size={15}/>{packet.summary?.start_date} → {packet.summary?.end_date}</span><span><MapPin size={15}/>{packet.summary?.places||0}<LocalizedText message={" places"} /></span><span><Users size={15}/>{packet.summary?.travellers||1}<LocalizedText message={" travellers"} /></span></div>}{owned?<button className="journey-btn gold" disabled={busy||starting} onClick={start}><LocalizedText>{starting?'Saving your request…':'Start planning'}</LocalizedText> <ArrowRight size={16}/></button>:<p role="status"><LocalizedText>{error||'Your trip brief is saved. Open it again whenever you’re ready to plan.'}</LocalizedText></p>}{error&&<p role="alert"><LocalizedText>{error}</LocalizedText></p>}<Link className="journey-text-link" href="/plan"><LocalizedText message={"Review my trip brief"} /></Link></section>;
}
