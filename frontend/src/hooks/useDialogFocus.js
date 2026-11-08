'use client';
import {useEffect,useRef} from 'react';
/** Focus containment and trigger restoration for application dialogs. */
export function useDialogFocus(ref,open,onClose){
  const close=useRef(onClose);
  useEffect(()=>{close.current=onClose;},[onClose]);
  useEffect(()=>{
    if(!open)return;
    const previous=document.activeElement;
    ref.current?.focus();
    const controls=()=>[...ref.current?.querySelectorAll('button,a[href],input,select,textarea,summary,[tabindex="0"]')||[]].filter(element=>!element.disabled&&element.getClientRects().length);
    function keys(event){
      if(event.key==='Escape'){event.preventDefault();close.current();return;}
      if(event.key!=='Tab')return;
      const list=controls(),first=list[0],last=list.at(-1);
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===ref.current)){event.preventDefault();first?.focus();}
    }
    const contain=event=>{if(ref.current&&!ref.current.contains(event.target))ref.current.focus();};
    document.addEventListener('keydown',keys);document.addEventListener('focusin',contain);
    return()=>{document.removeEventListener('keydown',keys);document.removeEventListener('focusin',contain);previous?.focus?.();};
  },[ref,open]);
}
