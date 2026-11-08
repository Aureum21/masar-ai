'use client';
import {useCallback,useMemo,useState,useSyncExternalStore} from 'react';
import {useAuth} from '@/context/AuthContext';
import {useHydrated} from './useHydrated';
import {draftKey,emptyDraft,parseDraft} from '@/lib/tripDraft';
const eventName='masar:trip-draft-change';
function subscribe(listener) {
  window.addEventListener('storage',listener);window.addEventListener(eventName,listener);
  return ()=>{window.removeEventListener('storage',listener);window.removeEventListener(eventName,listener);};
}
export function useTripDraft() {
  const {user}=useAuth();
  const hydrated=useHydrated();
  const [storageError,setStorageError]=useState('');
  const owner=user?.id;
  const key=owner?draftKey(owner):null;
  const snapshot=useCallback(()=>{try{return key?localStorage.getItem(key)||'':'';}catch{return '';}},[key]);
  const raw=useSyncExternalStore(subscribe,snapshot,()=> '');
  const draft=useMemo(()=>parseDraft(raw),[raw]);
  const update=useCallback((change,{reset=false}={})=>{
    if (!key) {setStorageError('Your profile is unavailable. Please sign in again to save your brief.');return false;}
    try {
      const previous=reset?emptyDraft():parseDraft(localStorage.getItem(key));
      if(previous.unreadable) throw new Error('This saved brief could not be read. Reset it before making changes.');
      const next=typeof change==='function'?change(previous):{...previous,...change};
      const value={...next,version:1,id:next.id||crypto.randomUUID(),updatedAt:new Date().toISOString()};
      localStorage.setItem(key,JSON.stringify(value));
      window.dispatchEvent(new Event(eventName));setStorageError('');return value;
    } catch(error) {setStorageError(error.message||'Storage is unavailable. Your changes have not been saved.');return false;}
  },[key]);
  return {draft,update,ready:hydrated&&Boolean(key),storageError};
}
