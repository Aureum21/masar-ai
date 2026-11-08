'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';

import {useEffect,useState} from 'react';
import {ArrowRight,CheckCircle2,Clock3,RefreshCw,ScanLine,TriangleAlert} from 'lucide-react';
import {useAuth} from '@/context/AuthContext';
import {passportRequest} from '@/app/profile/_lib/passportApi';
import './evidence-status.css';

export function evidenceStatus(submission){
  if(submission.status==='accepted')return {label:(submission.verification?.reward_is_demo??submission.verification?.evaluation_profile==='demo')?'Demo approved · demo reward earned':'Approved · reward earned',tone:'approved',Icon:CheckCircle2};
  if(submission.status==='rejected')return {label:'Action needed · view feedback',tone:'retry',Icon:TriangleAlert};
  if(!['automatic_boxing','automatic_scene'].includes(submission.verification?.mode))return {label:'Submitted · awaiting review',tone:'waiting',Icon:Clock3};
  if(submission.verification.state==='running')return {label:'Checking challenge evidence',tone:'checking',Icon:ScanLine};
  return {label:submission.verification.state==='reconnecting'?'Waiting for checker to reconnect':'Submitted · queued for checking',tone:'waiting',Icon:Clock3};
}

export default function TripEvidenceStatus({tripId,onOpen}){
  const {token}=useAuth();
  const [snapshot,setSnapshot]=useState({tripId:null,items:[],error:false,eligible:false});
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    if(!token||!tripId)return;
    const controller=new AbortController();let timer,inFlight=false,refreshAgain=false;
    async function refresh(){
      if(inFlight){refreshAgain=true;return;}
      inFlight=true;clearTimeout(timer);let pending=false,failed=false;
      try{
        const detail=await passportRequest(token,`/trips/${tripId}`,{signal:controller.signal});
        if(controller.signal.aborted)return;
        const items=(detail.challenges||[]).filter(item=>item.state!=='retired'&&item.latest_submission);
        pending=items.some(item=>item.latest_submission.status==='pending'&&['automatic_boxing','automatic_scene'].includes(item.latest_submission.verification?.mode));
        setSnapshot({tripId,items,error:false,eligible:(detail.challenges||[]).some(item=>item.state!=='retired')});
      }catch(error){
        if(error.name==='AbortError')return;
        failed=true;setSnapshot(previous=>({tripId,items:previous.tripId===tripId?previous.items:[],error:true,eligible:previous.tripId===tripId&&previous.eligible}));
      }finally{
        inFlight=false;
        if(!controller.signal.aborted&&(pending||failed||refreshAgain)){
          const delay=refreshAgain?0:6000;refreshAgain=false;timer=setTimeout(refresh,delay);
        }
      }
    }
    refresh();
    window.addEventListener('masar:passport-changed',refresh);
    window.addEventListener('focus',refresh);
    return()=>{controller.abort();clearTimeout(timer);window.removeEventListener('masar:passport-changed',refresh);window.removeEventListener('focus',refresh);};
  },[token,tripId,revision]);
  if(snapshot.tripId!==tripId||(!snapshot.eligible&&!snapshot.error))return null;
  return <Localized element={"section"} attributes={["aria-label"]} className="trip-evidence-status" aria-label="Challenge submissions">
    <header><div><span><LocalizedText message={"YOUR CHALLENGE EVIDENCE"} /></span><h2><LocalizedText message={"Submission status"} /></h2></div><Localized element={"button"} attributes={["aria-label"]} type="button" onClick={()=>setRevision(value=>value+1)} aria-label="Refresh submission status"><RefreshCw size={14}/><LocalizedText message={" Refresh"} /></Localized></header>
    {snapshot.error&&<p role="status" className="trip-evidence-warning"><LocalizedText message={"Status updates are unavailable. Reconnecting automatically; any saved submissions are preserved."} /></p>}
    {!snapshot.items.length&&!snapshot.error&&<p className="trip-evidence-warning"><LocalizedText message={"No evidence submitted for this trip yet. Open a challenge to add your photo."} /></p>}
    <div className="trip-evidence-entries">{snapshot.items.map(item=>{
      const submission=item.latest_submission,{label,tone,Icon}=evidenceStatus(submission);
      return <button type="button" key={item.id} className={`trip-evidence-entry ${tone}`} onClick={()=>onOpen(item)}>
        <span className="trip-evidence-symbol"><Icon size={19}/></span><span className="trip-evidence-copy"><strong>{item.title}</strong><span><LocalizedText>{label}</LocalizedText></span><small><LocalizedText preserveValues={[false,true]} message={"Day ⟦0⟧ · Ref ⟦1⟧"} values={[item.day_number,submission.id.slice(0,8)]} /></small>{submission.verification?.delayed&&submission.status==='pending'&&<small><LocalizedText message={"Taking longer than usual. Your photo is saved; please don’t upload it again."} /></small>}</span><ArrowRight size={16}/>
      </button>;
    })}</div>
  </Localized>;
}
