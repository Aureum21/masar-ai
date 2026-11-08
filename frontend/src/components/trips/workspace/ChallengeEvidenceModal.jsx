'use client';
import { useEffect, useRef, useState } from 'react';
import './trip-workspace.css';
import {addBoxingProof} from './BoxingProofFields';
import EvidenceDialogView from './EvidenceDialogView';
import useSubmissionCheck from './useSubmissionCheck';
import { useAuth } from '@/context/AuthContext';
import { passportRequest, notifyPassportChanged } from '@/app/profile/_lib/passportApi';

export default function ChallengeEvidenceModal(props) {
  if (!props.isOpen || !props.challenge) return null;
  return <EvidenceForm key={`${props.tripId}:${props.challenge.activityId || props.challenge.id || props.challenge.landmark}`} {...props} />;
}

function EvidenceForm({challenge,tripId,onClose,onSubmitted}) {
  const {token}=useAuth();
  const [record,setRecord]=useState(null);
  const [enabled,setEnabled]=useState(false);
  const [loading,setLoading]=useState(true);
  const heritage=challenge.type==='heritage-detective'||!challenge.type;
  const [files,setFiles]=useState(heritage?[null,null,null]:[null]);
  const [previews,setPreviews]=useState([]);
  const previewURLs=useRef([]);
  const dialogRef=useRef(null);
  const closeRef=useRef(onClose);
  useEffect(()=>{closeRef.current=onClose;},[onClose]);
  useEffect(()=>{const urls=previewURLs.current;return()=>urls.forEach(url=>URL.revokeObjectURL(url));},[]);
  useEffect(()=>{
    const previous=document.activeElement;
    dialogRef.current?.querySelector('button')?.focus();
    const keydown=event=>{
      if(event.key==='Escape'){event.preventDefault();closeRef.current();return;}
      if(event.key!=='Tab')return;
      const controls=[...dialogRef.current.querySelectorAll('button,input,textarea,select,a[href],summary')].filter(element=>!element.disabled&&element.getClientRects().length);
      const first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    };
    document.addEventListener('keydown',keydown);
    return()=>{document.removeEventListener('keydown',keydown);previous?.focus?.();};
  },[]);
  const [equivalent,setEquivalent]=useState(false);
  const [caption,setCaption]=useState('');
  const [answer,setAnswer]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [result,setResult]=useState(null);
  const [retrying,setRetrying]=useState(false);
  const [evaluationProfile,setEvaluationProfile]=useState('strict');
  const replay=useRef(null);
  const [proof,setProof]=useState({score:'',machine:false,own:false});
  const automatic=['automatic_boxing','automatic_scene'].includes(record?.verification_mode);
  const {connectionError}=useSubmissionCheck(token,result,response=>{setRetrying(false);setResult(response.submission);replay.current=null;setFiles(heritage?[null,null,null]:[null]);onSubmitted?.(response.submission);},response=>setResult(response.submission));
  function choose(detail) {
    const candidates=(detail.challenges || []).filter(c=>c.state!=='retired' && c.landmark===challenge.landmark && (!challenge.activityId || c.source_activity_id===challenge.activityId));
    if(candidates.length!==1) return null;
    return candidates[0];
  }
  useEffect(()=>{
    let mounted=true;
    if(!tripId || !token) return;
    passportRequest(token,`/trips/${tripId}`).then(detail=>{
      if(!mounted)return;
      const found=choose(detail);
      setEnabled(Boolean(detail.trip.challenges_enabled));
      setRecord(found);
      setResult(found?.latest_submission || null);
      setEquivalent(found?.latest_submission?.verification?.mode==='manual_equivalent');
      setCaption(found?.latest_submission?.text || '');
      const savedProfile=found?.latest_submission?.verification?.evaluation_profile;
      setEvaluationProfile(found?.evaluation_profiles?.includes(savedProfile)?savedProfile:'strict');
      setLoading(false);
    }).catch(e=>{if(mounted){setError(e.message);setLoading(false);}});
    return()=>{mounted=false;};
  // The parent keys this form by trip/activity; do not reuse another task's evidence.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[token,tripId]);
  async function enable() {
    setBusy(true);setError('');
    try {
      const detail=await passportRequest(token,`/trips/${tripId}/activate`,{method:'POST',body:{interests:['heritage'],pace:'light'}});
      const found=choose(detail);
      setRecord(found);setEnabled(true);setResult(found?.latest_submission||null);
      if(!found)setError('This stop is not the main eligible challenge for its day. Open the supported challenge in your journey.');
      notifyPassportChanged();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function submit(e) {
    e.preventDefault();if(!record)return;
    setBusy(true);setError('');
    try {
      if(!replay.current)replay.current=crypto.randomUUID();
      await passportRequest(token,`/challenges/${record.id}/action`,{method:'POST',body:{action:'accept'}});
      const data=new FormData();
      data.append('evidence_type',equivalent?'reflection':'photo');data.append('equivalent',String(equivalent));data.append('idempotency_key',replay.current);data.append('text',caption.trim());
      if(!equivalent&&heritage){data.append('quiz_answer',answer);files.forEach(file=>data.append('photos',file));}
      else if(!equivalent)data.append('file',files[0]);
      if(!equivalent&&record.verification_mode==='automatic_boxing')addBoxingProof(data,proof,evaluationProfile);
      else if(!equivalent&&automatic){
        data.set('evaluation_profile',evaluationProfile);data.set('own_photo_confirmed',String(proof.own));
        if(record.challenge_key==='sunset-seeker'){
          data.set('captured_at',proof.captureTime?proof.captureTime+':00+04:00':'');
          data.set('capture_location',proof.captureLocation||'');
        }
      }
      const response=await passportRequest(token,`/challenges/${record.id}/submissions`,{method:'POST',body:data});
      setRetrying(false);setResult(response.submission);notifyPassportChanged();onSubmitted?.(response.submission);
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  function startRetry() {
    previewURLs.current.forEach(url=>URL.revokeObjectURL(url));
    previewURLs.current=[];
    setFiles(heritage?[null,null,null]:[null]);setPreviews([]);
    setProof({score:'',machine:false,own:false});setAnswer('');
    setError('');replay.current=null;setRetrying(true);
  }
  function selectPhoto(index,file) {
    if(!file)return;
    if(!['image/jpeg','image/png'].includes(file.type) || file.size>5*1024*1024){setError('Choose a PNG or JPEG under 5 MB.');return;}
    if(previewURLs.current[index])URL.revokeObjectURL(previewURLs.current[index]);
    previewURLs.current[index]=URL.createObjectURL(file);
    setPreviews([...previewURLs.current]);
    setFiles(previous=>previous.map((value,i)=>i===index?file:value));replay.current=null;setError('');
  }
  return <EvidenceDialogView equivalent={equivalent} onEquivalent={value=>{setEquivalent(value);setCaption('');replay.current=null;}} evaluationProfile={evaluationProfile} onEvaluationProfile={value=>{setEvaluationProfile(value);setProof({...proof,machine:false,own:false});replay.current=null;}} retrying={retrying} onRetry={startRetry} connectionError={connectionError} challenge={challenge} record={record} enabled={enabled} loading={loading} busy={busy} error={error} result={result} files={files} previews={previews} proof={proof} caption={caption} answer={answer} automatic={automatic} heritage={heritage} dialogRef={dialogRef} onClose={onClose} onEnable={enable} onSubmit={submit} onPhoto={selectPhoto} onProof={value=>{setProof(value);replay.current=null;}} onCaption={value=>{setCaption(value);replay.current=null;}} onAnswer={value=>{setAnswer(value);replay.current=null;}}/>;
}
