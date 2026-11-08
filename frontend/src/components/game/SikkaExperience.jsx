 'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useAuth} from '@/context/AuthContext';
import {passportRequest,notifyPassportChanged} from '@/app/profile/_lib/passportApi';
import {MasarArcadeRun} from './MasarArcadeRun';

export default function SikkaExperience({onClose,onDestinationSelect,promotion,destinationSaved=false}) {
  const {token}=useAuth();
  const session=useRef(null);
  const sessionOwner=useRef(null);
  const started=useRef(0);
  const mounted=useRef(true);
  const finished=useRef(null);
  const saving=useRef(false);
  const [dailyResult,setDailyResult]=useState(null);
  const [shortlistMessage,setShortlistMessage]=useState('');
  const [message,setMessage]=useState(promotion ? 'Daily challenge ready · deliver a parcel or score 150 points to earn your coin.' : 'Practice run · opening your session…');

  useEffect(()=>{
    const previousFocus=document.activeElement;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const focusTimer=setTimeout(()=>document.querySelector('[aria-label="Secret Sikka Run — practice arcade"] button')?.focus(),50);
    const trap=(event)=>{
      if(event.key!=='Tab')return;
      const dialog=document.querySelector('[aria-label="Secret Sikka Run — practice arcade"]');
      const buttons=dialog?.querySelectorAll('button:not([disabled]),a[href],[tabindex="0"]');
      if(!buttons?.length)return;
      const first=buttons[0],last=buttons[buttons.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',trap);
    return ()=>{clearTimeout(focusTimer);document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',trap);previousFocus?.focus?.();};
  },[]);
  useEffect(()=>{
    mounted.current=true;
    started.current=Date.now();
    if (promotion) {
      return () => { mounted.current=false; };
    }
    if(sessionOwner.current!==token||!session.current){
      sessionOwner.current=token;
      session.current=passportRequest(token,'/games/sikka-run/sessions',{method:'POST'});
    }
    session.current.then(()=>{if(mounted.current)setMessage('Practice session ready · virtual coins · no Passport XP');},()=>{});
    session.current.catch(()=>{if(mounted.current)setMessage('Practice is available. Session saving is unavailable; retry after your run.');});
    return ()=>{mounted.current=false;};
  },[token, promotion]);
  const complete=useCallback(async(stats)=>{
    finished.current=stats;
    if(saving.current)return;
    saving.current=true;
    setMessage(promotion ? 'Saving your daily challenge result…' : 'Saving your practice result…');
    if (promotion) setDailyResult({status:'saving'});
    try {
      if (promotion) {
        const result = await promotion.onComplete({
          session_id: promotion.sessionId, score: Math.max(0, Math.round(stats.score)),
          elapsed_seconds: Math.max(1, Math.round((Date.now()-started.current)/1000)),
          details: {distance: Math.round(stats.distance), coins: stats.coins, parcel_delivered: stats.deliveryCard != null}
        });
        if (mounted.current) {
          setDailyResult(result);
          setMessage(result?.message || 'Run saved. Try again to reach your daily objective.');
        }
        return;
      }
      let current;
      try { current=await session.current; } catch {
        session.current=passportRequest(token,'/games/sikka-run/sessions',{method:'POST'});
        current=await session.current;
      }
      const result=await passportRequest(token,'/games/sikka-run/complete',{method:'POST',body:{
        session_id:current.session_id,mode:'practice',score:Math.round(stats.score),
        elapsed_seconds:Math.max(1,Math.round((Date.now()-started.current)/1000)),
        details:{distance:Math.round(stats.distance),coins:stats.coins,parcel_delivered:stats.deliveryCard!=null}
      }});
      notifyPassportChanged();
      if(mounted.current)setMessage(`Practice saved · ${result.xp_awarded || 0} Passport XP · real-world challenges earn rewards.`);
    }catch {if(mounted.current){
      setMessage('Your result could not be saved. Use Retry save below.');
      if (promotion) setDailyResult({status:'error',message:'Your run is kept here. Try saving it again to confirm your daily reward.'});
    }}
    finally {saving.current=false;}
  },[token, promotion]);

  const restart=()=>{
    if(saving.current)return false;
    finished.current=null;
    setDailyResult(null);
    setShortlistMessage('');
    started.current=Date.now();
    if (promotion) {
      setMessage('Daily challenge · deliver a parcel or score 150 points.');
      return;
    }
    session.current=passportRequest(token,'/games/sikka-run/sessions',{method:'POST'});
    session.current.catch(()=>{});
    setMessage('Practice run · virtual coins · no Passport XP');
  };
  return <MasarArcadeRun dailyResult={dailyResult} destinationSaved={destinationSaved} shortlistMessage={shortlistMessage} promotional={Boolean(promotion)} onClose={onClose} onComplete={complete} onRestart={restart} statusMessage={message} onRetrySave={message.includes('Retry save')?()=>complete(finished.current):undefined}
    onPlanVisit={()=>{
      const saved=onDestinationSelect?.({name:'Al Fahidi'});
      setShortlistMessage(saved ? 'Al Fahidi is in your shortlist. Find it in Explore or your trip brief.' : 'Could not add Al Fahidi. Check your sign-in, device storage, or the 30-place shortlist limit.');
      if(!saved&&!promotion)setMessage('The destination could not be saved. Check that your shortlist has space.');
      return Boolean(saved);
    }}/>
    ;
}
