'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';

import {useEffect,useRef} from 'react';
import {X} from 'lucide-react';
export default function JourneyDialog({title,onClose,children}) {
  const ref=useRef(null);
  useEffect(()=>{
    const previous=document.activeElement;
    ref.current?.focus();
    return ()=>previous?.focus?.();
  },[]);
  function keys(event) {
    if(event.key==='Escape'){event.preventDefault();onClose();}
    if(event.key!=='Tab')return;
    const controls=[...ref.current.querySelectorAll('button,a,input,select,textarea,[tabindex="0"]')].filter(el=>!el.disabled);
    const first=controls[0],last=controls.at(-1);
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===ref.current)){event.preventDefault();first?.focus();}
  }
  return <div className="journey-overlay"><Localized element={"button"} attributes={["aria-label"]} className="journey-backdrop" aria-label="Close shortlist" tabIndex={-1} onClick={onClose}/><section className="journey-dialog" role="dialog" aria-modal="true" aria-labelledby="journey-dialog-title" tabIndex={-1} ref={ref} onKeyDown={keys}><div className="journey-dialog-heading"><div><span className="journey-eyebrow"><LocalizedText message={"YOUR JOURNEY STARTS HERE"} /></span><h2 id="journey-dialog-title"><LocalizedText>{title}</LocalizedText></h2></div><Localized element={"button"} attributes={["aria-label"]} className="journey-icon-btn" onClick={onClose} aria-label="Close shortlist"><X size={20}/></Localized></div>{children}</section></div>;
}
