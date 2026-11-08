'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Accessibility,ArrowUpRight,Armchair,Check,ChevronRight,ClosedCaption,Footprints,Info,MoveVertical,Phone,Toilet,Volume2,X} from 'lucide-react';
import {LocalizedText} from '@/i18n/Localized';
import {accessPresentation} from './accessibilityPresentation.mjs';
import './explore-accessibility.css';

const ICONS={access:Accessibility,toilet:Toilet,lift:MoveVertical,route:Footprints,quiet:Volume2,help:Phone,rest:Armchair,captions:ClosedCaption};

export function AccessDetailsPanel({title,information,onClose}){
  const dialog=useRef(null);
  const titleId=useId();
  const {reported,unknown}=information;
  useEffect(()=>{
    const element=dialog.current;
    const previous=document.activeElement;
    const overflow=document.body.style.overflow;
    element.showModal();
    document.body.style.overflow='hidden';
    return ()=>{document.body.style.overflow=overflow;element.close();previous?.focus?.();};
  },[]);
  return <dialog ref={dialog} className="explore-access-dialog" aria-labelledby={titleId}
    onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
    <div className="explore-access-panel">
      <header className="explore-access-panel-header">
        <div><span className="explore-access-eyebrow"><Accessibility size={14}/><LocalizedText>ACCESSIBILITY & SUPPORT</LocalizedText></span><h2 id={titleId}><LocalizedText>{title}</LocalizedText></h2></div>
        <button type="button" className="explore-access-close" onClick={onClose} aria-label="Close accessibility details"><X size={19}/></button>
      </header>
      <div className="explore-access-panel-content">
        {reported.length>0&&<section aria-label="Reported access information">
          <div className="explore-access-section-title"><h3><LocalizedText>What’s been reported</LocalizedText></h3><span>{reported.length} <LocalizedText>{reported.length===1?'detail':'details'}</LocalizedText></span></div>
          <div className="explore-access-facts">{reported.map(fact=>{
            const Icon=ICONS[fact.icon]||Info;
            return <article key={fact.key} className={`explore-access-fact${fact.value===false?' is-barrier':''}`}>
              <div className="explore-access-fact-icon"><Icon size={19}/></div>
              <div className="explore-access-fact-copy"><div className="explore-access-fact-heading"><h4><LocalizedText>{fact.label}</LocalizedText></h4><span className="explore-access-status"><LocalizedText>{fact.value===false?'Not available':fact.status==='confirmed'?'Confirmed by source':'Reported'}</LocalizedText></span></div>
                {typeof fact.value!=='boolean'&&<p className="explore-access-value"><LocalizedText>{fact.key==='walking_distance_m'?`${fact.value} metres`:String(fact.value)}</LocalizedText></p>}
                {fact.note&&<p className="explore-access-fact-note"><LocalizedText>{fact.note}</LocalizedText></p>}
                <div className="explore-access-citation"><a href={fact.source_url} target="_blank" rel="noopener noreferrer"><span translate="no">{fact.source||'Source'}</span><ArrowUpRight size={12}/></a><span><LocalizedText>Reviewed</LocalizedText> {fact.last_checked?.slice(0,10)||'—'}</span></div>
              </div>
            </article>;
          })}</div>
        </section>}
        {unknown.length>0&&<section className="explore-access-unknown"><h3><LocalizedText>{reported.length?'Still to confirm':'Plan your access with the venue'}</LocalizedText></h3><p><LocalizedText>These details haven’t been reported. Ask the venue about what matters for your visit.</LocalizedText></p><ul>{unknown.map(field=><li key={field.key}><span aria-hidden="true"/><LocalizedText>{field.label}</LocalizedText></li>)}</ul></section>}
        <p className="explore-access-footnote"><Info size={15}/><LocalizedText>Facilities can change. Confirm your route, equipment and support needs with the venue before you travel.</LocalizedText></p>
      </div>
      <footer className="explore-access-panel-footer"><button type="button" onClick={onClose}><LocalizedText>Back to exploring</LocalizedText><ChevronRight size={15}/></button></footer>
    </div>
  </dialog>;
}

export default function ExploreAccessibility({evidence,title}){
  const [open,setOpen]=useState(false);
  const information=accessPresentation(evidence);
  const {reported}=information;
  return <>
    <div className="explore-access-summary">
      <div className="explore-access-summary-heading"><span><Accessibility size={14}/><LocalizedText>Accessibility</LocalizedText></span><button type="button" className="explore-access-open" onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-label={reported.length?'View access details':'What to check for accessibility'}><LocalizedText>{reported.length?'Details':'What to check'}</LocalizedText><ArrowUpRight size={13}/></button></div>
      {reported.length>0?<div className="explore-access-chips">{reported.slice(0,2).map(fact=>{
        const Icon=fact.value===false?Info:fact.value===true?Check:ICONS[fact.icon]||Info;
        return <span key={fact.key} className={`explore-access-chip${fact.value===false?' is-barrier':''}`}><Icon size={12}/><LocalizedText>{fact.value===false?`${fact.short} unavailable`:fact.short}</LocalizedText></span>;
      })}{reported.length>2&&<span className="explore-access-more">+{reported.length-2}</span>}</div>:<p className="explore-access-empty"><LocalizedText>Access information not yet reported</LocalizedText></p>}
    </div>
    {open&&createPortal(<AccessDetailsPanel title={title} information={information} onClose={()=>setOpen(false)}/>,document.body)}
  </>;
}
