'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';

import {useRef,useSyncExternalStore} from 'react';
import {Compass,X} from 'lucide-react';

const query='(max-width: 768px)';
const subscribe=listener=>{const m=window.matchMedia(query);m.addEventListener('change',listener);return()=>m.removeEventListener('change',listener);};
const snapshot=()=>window.matchMedia(query).matches;
const serverSnapshot=()=>false;

/** One results tree; the native modal supplies focus management and Escape handling. */
export default function MobileContextPanel({children}) {
  const mobile=useSyncExternalStore(subscribe,snapshot,serverSnapshot);
  const dialog=useRef(null);
  if (!mobile) return children;
  return <>
    <button type="button" className="chat-results-button" aria-haspopup="dialog"
      onClick={()=>dialog.current?.showModal()}><Compass size={19}/><LocalizedText message={"View results"} /></button>
    <dialog ref={dialog} className="chat-results-dialog" aria-labelledby="chat-results-title"
      onClick={event=>{if(event.target===dialog.current){const r=dialog.current.getBoundingClientRect();if(event.clientY<r.top||event.clientX<r.left||event.clientX>r.right)dialog.current.close();}}}>
      <header><h2 id="chat-results-title"><LocalizedText message={"Discovery & live results"} /></h2>
        <Localized element={"button"} attributes={["aria-label"]} type="button" aria-label="Close results" onClick={()=>dialog.current.close()}><X size={20}/></Localized></header>
      {children}
    </dialog>
  </>;
}
