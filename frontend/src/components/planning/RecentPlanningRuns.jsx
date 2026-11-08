'use client';
import {useI18n} from '@/i18n/LocaleProvider';
import {formattingLocale} from '@/i18n/messages.mjs';

import {Localized,LocalizedText} from '@/i18n/Localized';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,Route} from 'lucide-react';
import {useAuth} from '@/context/AuthContext';
import {apiRequest} from '@/lib/api';
import {RUN_STATES} from '@/lib/planningRuns';
export default function RecentPlanningRuns() {
  const {locale:uiLocale}=useI18n();

  const {token}=useAuth();const [state,setState]=useState(null);
  useEffect(()=>{
    if(!token)return;
    const controller=new AbortController();
    apiRequest('/api/v1/planning/runs',{token,signal:controller.signal,cache:'no-store'})
      .then(runs=>{if(!controller.signal.aborted)setState({token,runs});})
      .catch(error=>{if(!controller.signal.aborted)setState({token,error:error.status===503?'Saved planning progress will become available after the next reviewed database update.':error.message});});
    return()=>controller.abort();
  },[token]);
  if(state?.token!==token)return null;
  if(state.error)return <p className="brief-hint" role="status">{state.error}</p>;
  if(!state.runs.length)return null;
  return <Localized element={"section"} attributes={["aria-label"]} className="recent-planning" aria-label="Recent planning requests"><div><Route size={18}/><h2><LocalizedText message={"Pick up your journey"} /></h2></div>{state.runs.slice(0,3).map(run=><Link key={run.id} href={`/plan/runs/${run.id}`}><span><strong><LocalizedText>{RUN_STATES[run.status]?.label||'Planning request'}</LocalizedText></strong><small><LocalizedText message={"⟦0⟧ · Attempt ⟦1⟧ of ⟦2⟧"} values={[new Date(run.created_at).toLocaleDateString(formattingLocale(uiLocale, 'en-GB'),{timeZone:'Asia/Dubai',day:'numeric',month:'short'}),run.attempts,run.max_attempts]} /></small></span><ArrowUpRight size={17}/></Link>)}</Localized>;
}
