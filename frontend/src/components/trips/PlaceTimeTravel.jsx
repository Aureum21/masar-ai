'use client';

import {useEffect, useId, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import dynamic from 'next/dynamic';
import {History, ArrowUpRight, X} from 'lucide-react';
import {Localized, LocalizedText} from '@/i18n/Localized';
import styles from './PlaceTimeTravel.module.css';
import {timeTravelPlace} from '@/lib/timeTravelPlaces.mjs';

const TimeTravelContent=dynamic(()=>import('@/app/time-travel/TimeTravelContent'),{
  loading:()=> <p role="status"><LocalizedText>Opening Time Travel…</LocalizedText></p>
});

export default function PlaceTimeTravel({activity}) {
  const [open,setOpen]=useState(false);
  const trigger=useRef(null);
  const place=timeTravelPlace(activity);
  if(!place)return null;
  return <>
    <button ref={trigger} type="button" className={styles.trigger} aria-haspopup="dialog" onClick={event=>{event.stopPropagation();setOpen(true);}}>
      <span className={styles.triggerIcon}><History size={18} aria-hidden="true"/></span>
      <span className={styles.triggerCopy}><LocalizedText>Time Travel</LocalizedText><small><LocalizedText>Discover this place, then and now</LocalizedText></small></span>
      <ArrowUpRight size={17} aria-hidden="true"/>
    </button>
    {open&&<TimeTravelDialog placeName={place.name} trigger={trigger} onClose={()=>setOpen(false)}/>}
  </>;
}

function TimeTravelDialog({placeName,trigger,onClose}) {
  const dialog=useRef(null);
  const closeButton=useRef(null);
  const heading=useId();
  useEffect(()=>{
    const node=dialog.current;
    const previousOverflow=document.body.style.overflow;
    if(!node.open)node.showModal();
    document.body.style.overflow='hidden';
    closeButton.current?.focus();
    const returnFocus=trigger.current;
    return ()=>{
      document.body.style.overflow=previousOverflow;
      returnFocus?.focus();
    };
  },[trigger]);

  return createPortal(
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={heading} aria-describedby={`${heading}-description`}
      onCancel={event=>{event.preventDefault();event.stopPropagation();onClose();}}
      onClose={onClose}
      onKeyDown={event=>{if(event.key==='Escape')event.stopPropagation();}}
      onClick={event=>{
        event.stopPropagation();
        if(event.target!==event.currentTarget)return;
        const bounds=event.currentTarget.getBoundingClientRect();
        if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)onClose();
      }}>
      <header className={styles.modalHeader}>
        <span className={styles.modalIcon}><History size={22} aria-hidden="true"/></span>
        <div className={styles.headingCopy}>
          <span className={styles.eyebrow}><LocalizedText>Time Travel</LocalizedText></span>
          <h2 id={heading}><LocalizedText>{placeName}</LocalizedText></h2>
          <p id={`${heading}-description`}><LocalizedText>Explore this landmark through the years.</LocalizedText></p>
        </div>
        <Localized element="button" attributes={["aria-label"]} ref={closeButton} type="button" className={styles.closeButton} aria-label="Close Time Travel" onClick={onClose}><X size={20}/></Localized>
      </header>
      <div className={styles.content}><TimeTravelContent embedded hideIntro placeName={placeName}/></div>
    </dialog>,document.body
  );
}
