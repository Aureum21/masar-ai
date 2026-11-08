'use client';
import {useEffect,useState,useCallback} from 'react';
import {useAuth} from '@/context/AuthContext';
import {apiRequest} from '@/lib/api';
import {isActiveRun} from '@/lib/planningRuns';

export function usePlanningRun(id) {
  const {token}=useAuth();
  const [snapshot,setSnapshot]=useState(null);
  const [version,setVersion]=useState(0);
  const [action,setAction]=useState(false);
  const refresh=useCallback(()=>setVersion(value=>value+1),[]);
  useEffect(()=>{
    if(!token||!id)return;
    const controller=new AbortController();let timer;
    async function poll() {
      try {
        const run=await apiRequest(`/api/v1/planning/runs/${encodeURIComponent(id)}`,{token,signal:controller.signal,cache:'no-store'});
        if(controller.signal.aborted)return;
        setSnapshot({token,id,run,error:''});
        if(isActiveRun(run))timer=setTimeout(poll,2500);
      } catch(error) {
        if(controller.signal.aborted)return;
        setSnapshot(previous=>({token,id,run:previous?.token===token&&previous?.id===id?previous.run:null,error:error.message}));
        if(![401,403,404,422,503].includes(error.status))timer=setTimeout(poll,6000);
      }
    }
    poll();
    return()=>{controller.abort();clearTimeout(timer);};
  },[token,id,version]);
  const current=snapshot?.token===token&&snapshot?.id===id?snapshot:null;
  async function change(name) {
    if(action)return;
    setAction(true);
    try {
      await apiRequest(`/api/v1/planning/runs/${encodeURIComponent(id)}/${name}`,{token,method:'POST'});
      refresh();
    } catch(error) {
      setSnapshot(previous=>previous?.token===token&&previous?.id===id?{...previous,error:error.message}:previous);
    } finally {setAction(false);}
  }
  async function choose(stage,optionId,chooseForMe=false) {
    if(action||!current?.run?.choice_flow)return;
    setAction(true);
    try {
      const run=await apiRequest(`/api/v1/planning/runs/${encodeURIComponent(id)}/choice`,{token,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stage,option_id:optionId||null,choose_for_me:chooseForMe,expected_revision:current.run.choice_flow.revision})});
      setSnapshot({token,id,run,error:''});refresh();
    } catch(error){
      setSnapshot(previous=>previous?.token===token&&previous?.id===id?{...previous,error:error.message}:previous);
      if(error.status===409)refresh();
    } finally{setAction(false);}
  }
  async function changeHotel() {
    if(action||!current?.run?.choice_flow)return;
    setAction(true);
    try {
      const run=await apiRequest(`/api/v1/planning/runs/${encodeURIComponent(id)}/change-hotel`,{token,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expected_revision:current.run.choice_flow.revision})});
      setSnapshot({token,id,run,error:''});refresh();
    } catch(error){setSnapshot(previous=>previous?.token===token&&previous?.id===id?{...previous,error:error.message}:previous);}
    finally{setAction(false);}
  }
  return {run:current?.run,error:current?.error,loading:!current,action,change,choose,changeHotel,refresh};
}
