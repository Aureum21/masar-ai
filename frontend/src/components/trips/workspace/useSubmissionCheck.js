'use client';
import {useEffect, useRef, useState} from 'react';
import {passportRequest, notifyPassportChanged} from '@/app/profile/_lib/passportApi';

export default function useSubmissionCheck(token, submission, onFinished, onProgress) {
  const [connectionError,setConnectionError]=useState(false);
  const progress=useRef(onProgress);
  useEffect(()=>{progress.current=onProgress;},[onProgress]);
  const latest = useRef(onFinished);
  useEffect(()=>{latest.current=onFinished;},[onFinished]);
  const id=submission?.id, status=submission?.status, mode=submission?.verification?.mode;
  useEffect(()=>{
    if(!token || !id || status!=='pending' || !['automatic_boxing','automatic_scene'].includes(mode))return;
    const controller=new AbortController();let timer;
    async function poll(){
      try{
        const result=await passportRequest(token,`/submissions/${id}`,{signal:controller.signal});
        if(controller.signal.aborted)return;
        setConnectionError(false);
        if(result.submission.status!=='pending'){
          latest.current(result);notifyPassportChanged();return;
        }
        progress.current?.(result);
      }catch(error){if(error.name==='AbortError')return;setConnectionError(true);}
      if(!controller.signal.aborted)timer=setTimeout(poll,4000);
    }
    timer=setTimeout(poll,2000);
    return()=>{controller.abort();clearTimeout(timer);};
  },[token,id,status,mode]);
  return {connectionError:status==='pending'&&connectionError};
}
