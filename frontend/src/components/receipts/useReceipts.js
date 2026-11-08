'use client';
import {useState,useEffect,useCallback,useRef} from 'react';
import {request,ACTIVE_STATES} from './receiptApi';

const RECEIPTS_STORAGE_PREFIX = 'masar_receipts_';
const receiptsMemoryCache = new Map();

function readStoredReceipts(key) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${RECEIPTS_STORAGE_PREFIX}${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.rows)) return parsed;
    }
  } catch (e) {}
  return null;
}

function persistReceipts(key, rows, summary, cursor) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(`${RECEIPTS_STORAGE_PREFIX}${key}`, JSON.stringify({
      rows,
      summary,
      cursor,
      timestamp: Date.now()
    }));
  } catch (e) {}
}

export function getCachedReceipts(token, tripId) {
  if (!token) return null;
  const key = `${token}:${tripId || 'all'}`;
  if (receiptsMemoryCache.has(key)) {
    return receiptsMemoryCache.get(key);
  }
  const stored = readStoredReceipts(key);
  if (stored) {
    receiptsMemoryCache.set(key, stored);
    return stored;
  }
  return null;
}


export default function useReceipts(token,tripId){
  const cacheKey = `${token}:${tripId || 'all'}`;
  const cached = token ? getCachedReceipts(token, tripId) : null;
  const hasCache = Boolean(cached && Array.isArray(cached.rows) && cached.rows.length > 0);

  const [rows,setRows]=useState(() => (hasCache ? cached.rows : []));
  const [summary,setSummary]=useState(() => (hasCache ? cached.summary : null));
  const [cursor,setCursor]=useState(() => (hasCache ? cached.cursor : null));
  const [loading,setLoading]=useState(() => !hasCache);
  const [error,setError]=useState('');
  const loaded=useRef(24),hidden=useRef(new Set());
  const query=tripId?`&trip_id=${encodeURIComponent(tripId)}`:'';
  const refresh=useCallback(async(signal)=>{
    try{
      const [data,totals]=await Promise.all([request(token,`?limit=${Math.min(50,loaded.current)}${query}`,{signal}),request(token,`/summary${tripId?'?trip_id='+encodeURIComponent(tripId):''}`,{signal})]);
      let items=data.items,next=data.next_cursor;
      while(next&&items.length<loaded.current){const page=await request(token,`?limit=50&cursor=${encodeURIComponent(next)}${query}`,{signal});items=[...items,...page.items];next=page.next_cursor;}
      if(!signal?.aborted){
        const filtered = items.filter(item=>!hidden.current.has(item.id));
        receiptsMemoryCache.set(cacheKey, { rows: filtered, summary: totals, cursor: next, timestamp: Date.now() });
        persistReceipts(cacheKey, filtered, totals, next);
        setRows(filtered);setCursor(next);setSummary(totals);setError('');
      }
    }catch(err){if(!signal?.aborted)setError(err.status===401?'Your session expired. Sign in again; receipts remain private.':err.message);}
    finally{if(!signal?.aborted)setLoading(false);}
  },[token,tripId,query,cacheKey]);
  useEffect(()=>{
    loaded.current=24;hidden.current.clear();
    const controller=new AbortController();refresh(controller.signal);
    const focus=()=>refresh(controller.signal);
    window.addEventListener('focus',focus);
    return ()=>{controller.abort();window.removeEventListener('focus',focus);};
  },[refresh]);
  const active=rows.some(row=>ACTIVE_STATES.has(row.state));
  useEffect(()=>{
    if(!active)return;
    const controller=new AbortController();
    const interval=setInterval(()=>{if(document.visibilityState==='visible')refresh(controller.signal);},4000);
    return ()=>{clearInterval(interval);controller.abort();};
  },[active,refresh]);
  const more=async()=>{
    if(!cursor)return;
    try{const data=await request(token,`?limit=24&cursor=${encodeURIComponent(cursor)}${query}`);loaded.current=Math.min(100,loaded.current+24);setRows(previous=>[...previous,...data.items.filter(item=>!hidden.current.has(item.id)&&!previous.some(row=>row.id===item.id))]);setCursor(data.next_cursor);}
    catch(err){setError(err.message);}
  };
  const remove=async(id)=>{
    const removed=rows.find(row=>row.id===id),index=rows.findIndex(row=>row.id===id);hidden.current.add(id);setRows(list=>list.filter(row=>row.id!==id));
    try{await request(token,`/${id}`,{method:'DELETE'});await refresh();}
    catch(err){hidden.current.delete(id);if(removed)setRows(list=>{if(list.some(row=>row.id===id))return list;const restored=[...list];restored.splice(Math.max(0,index),0,removed);return restored;});setError('Could not delete this receipt. It was restored. '+err.message);}
  };
  return {rows,summary,cursor,loading,error,refresh,more,remove,setError};
}
