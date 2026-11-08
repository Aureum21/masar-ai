'use client';
import {useEffect,useState} from 'react';
import {useAuth} from '@/context/AuthContext';
import {apiRequest} from '@/lib/api';
import {recalledCatalogue} from '@/lib/catalogueSnapshot';
import {mergeResolvedPlaces} from '@/lib/placeImages';
import {EXPLORE_PLACES} from '@/data/exploreData';

const resolvedPlacesCache = new Map();

export function useResolvedPlaces(selections) {
  const {token}=useAuth();
  const ids=JSON.stringify(selections.map(p=>p.id).filter(id=>!EXPLORE_PLACES.some(place=>place.id===id)).sort());
  const cacheKey = `${token}:${ids}`;
  const initialCached = resolvedPlacesCache.get(cacheKey) || null;
  const [result,setResult]=useState(() => initialCached ? { key: `${cacheKey}:0`, items: initialCached, error: '' } : null);
  const [revision,setRevision]=useState(0);
  const key=`${token}:${ids}:${revision}`;
  useEffect(()=>{
    if(!token||ids==='[]')return;
    if(revision === 0 && resolvedPlacesCache.has(cacheKey)) return;
    const controller=new AbortController();
    let timedOut=false;
    const timeout=setTimeout(()=>{timedOut=true;controller.abort();},15000);
    const values=JSON.parse(ids),provider=values.filter(id=>/^(google|ticketmaster):/.test(id)),editorial=values.filter(id=>!provider.includes(id));
    Promise.all([[provider,'/api/v1/discovery/resolve'],[editorial,'/api/v1/catalogue/resolve']].filter(([values])=>values.length).map(([values,path])=>apiRequest(path,{token,method:'POST',signal:controller.signal,cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:values})})))
      .then(pages=>{
        if(!controller.signal.aborted) {
          const items = pages.flatMap(data=>data.items||[]);
          resolvedPlacesCache.set(cacheKey, items);
          setResult({key,items,error:pages.some(data=>data.unavailable?.length)?'Some saved places could not be refreshed. Try again before planning.':''});
        }
      })
      .catch(error=>{if(timedOut||!controller.signal.aborted)setResult({key,items:[],error:timedOut?'Saved places are taking longer to refresh. Your existing details are kept; try again.':error.message});})
      .finally(()=>clearTimeout(timeout));
    return()=>{clearTimeout(timeout);controller.abort();};
  },[token,ids,key,cacheKey,revision]);
  const current=result?.key===key?result:(initialCached ? { items: initialCached, error: '' } : null);
  return {places:mergeResolvedPlaces(EXPLORE_PLACES,recalledCatalogue(token),current?.items||[]),loading:Boolean(token&&ids!=='[]'&&!current),error:current?.error||'',retry:()=>setRevision(value=>value+1)};
}
