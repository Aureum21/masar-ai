'use client';
import {useEffect,useRef,useState} from 'react';
import {useAuth} from '@/context/AuthContext';
import {apiRequest} from '@/lib/api';
import {accountConflict,planningDraft} from '@/lib/cloudBrief';

export function useCloudBrief() {
  const {token}=useAuth();
  const [state,setState]=useState(null);
  const currentToken=useRef(token);
  const requests=useRef(new Set());
  useEffect(()=>{
    currentToken.current=token;
    if(!token)return;
    const controller=new AbortController();requests.current.add(controller);
    async function load() {
      try {
        const status=await apiRequest('/api/v1/planning/status',{token,signal:controller.signal,cache:'no-store'});
        const account=status.briefs_available?await apiRequest('/api/v1/planning/brief',{token,signal:controller.signal,cache:'no-store'}):null;
        if(!controller.signal.aborted)setState({token,available:status.briefs_available,account,error:'',saving:false});
      } catch(error) {if(!controller.signal.aborted)setState({token,available:false,error:error.message,saving:false});}
      finally {requests.current.delete(controller);}
    }
    load();
    const pending=requests.current;
    return()=>{currentToken.current=null;for(const request of pending)request.abort();pending.clear();};
  },[token]);
  const current=state?.token===token?state:null;
  async function save(draft,{overwrite=false}={}) {
    if(!current?.available)throw new Error('Account saving is not active. Your device draft is still saved.');
    if(accountConflict(draft,current.account)&&!overwrite)throw new Error('Choose the account brief or explicitly replace it with this device’s version.');
    const controller=new AbortController();requests.current.add(controller);
    setState(previous=>({...previous,saving:true,error:''}));
    try {
      const account=await apiRequest('/api/v1/planning/brief',{token,method:'PUT',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({draft:planningDraft(draft),expected_revision:overwrite?current.account?.revision||0:draft.cloudRevision||0})});
      if(controller.signal.aborted||currentToken.current!==token)return null;
      setState({token,available:true,account,error:'',saving:false});return account;
    } catch(error) {
      if(controller.signal.aborted||currentToken.current!==token)return null;
      if(error.status===409){
        try {
          const account=await apiRequest('/api/v1/planning/brief',{token,signal:controller.signal,cache:'no-store'});
          if(!controller.signal.aborted&&currentToken.current===token)setState({token,available:true,account,error:error.message,saving:false});
        } catch {if(!controller.signal.aborted&&currentToken.current===token)setState(previous=>({...previous,error:'Your changes are still on this device. Reopen the brief to refresh the account version.',saving:false}));}
      } else setState(previous=>({...previous,error:error.message,saving:false}));
      throw error;
    } finally {requests.current.delete(controller);}
  }
  return {...current,loading:!current,save};
}
