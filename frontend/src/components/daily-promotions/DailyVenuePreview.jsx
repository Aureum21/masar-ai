'use client';

import {useEffect,useRef,useState} from 'react';
import {Pause,Play,RotateCcw,Scan,LoaderCircle} from 'lucide-react';
import {useAccessibility} from '@/context/AccessibilityContext';
import {LocalizedText} from '@/i18n/Localized';
import styles from './daily-venue-preview.module.css';

export default function DailyVenuePreview({animationKey,title}) {
  const {reduced}=useAccessibility();
  const scene=useRef(null),controller=useRef(null),last=useRef('');
  const [state,setState]=useState({loading:true,playing:false,stage:0,chapters:[],error:false});
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    let active=true;
    const abort=new AbortController();
    let mounted;
    async function load(){
      try{
        const {mountDailyVenuePreview,PREVIEW_CHAPTERS}=await import(/* webpackIgnore: true */ '/masar-experiences/daily-venue-preview.js');
        if(!active)return;
        const chapters=PREVIEW_CHAPTERS[animationKey];
        mounted=await mountDailyVenuePreview(animationKey,scene.current,{
          signal:abort.signal,reducedMotion:reduced,
          onUpdate:s=>{
            if(!active)return;
            const stage=Math.max(0,chapters.findLastIndex(chapter=>s.time>=chapter.at));
            const next=`${stage}:${s.playing}`;
            if(last.current!==next){last.current=next;setState(previous=>({...previous,stage,playing:s.playing}));}
          }
        });
        if(!active){mounted.dispose();return;}
        controller.current=mounted;
        setState(previous=>({...previous,loading:false,error:false,chapters}));
      }catch(error){if(active&&error.name!=='AbortError')setState(previous=>({...previous,loading:false,error:true}));}
    }
    load();
    return()=>{active=false;abort.abort();mounted?.dispose();controller.current=null;last.current='';};
  },[animationKey,reduced,revision]);
  const chapter=state.chapters[state.stage];
  return <section className={styles.preview} aria-label={`${title} illustrated preview`}>
    <div className={styles.sceneWrap}>
      <div ref={scene} className={styles.scene}/>
      <div className={styles.sceneBadge}><span/> <LocalizedText message="YOUR CHALLENGE, IN MOTION"/></div>
      <span className={styles.illustration}><LocalizedText message="Illustrative 3D scene"/></span>
      {state.loading&&<div className={styles.loading} role="status"><LoaderCircle size={22}/><LocalizedText message="Setting the scene…"/></div>}
      {state.error&&<div className={styles.loading} role="status"><p><LocalizedText message="The preview couldn’t load. You can still read the objective and take part."/></p><button type="button" onClick={()=>{setState(previous=>({...previous,loading:true,error:false}));setRevision(n=>n+1);}}><LocalizedText message="Try preview again"/></button></div>}
    </div>
    <div className={styles.caption}>
      <div><small><LocalizedText message="EXPLORE THE MOMENT"/></small><h4><LocalizedText>{chapter?.title||'A little inspiration for your visit'}</LocalizedText></h4><p><LocalizedText>{chapter?.copy||'Watch the scene or explore each step at your own pace.'}</LocalizedText></p></div>
      <div className={styles.controls}>
        <button type="button" disabled={state.loading||state.error} aria-label={state.playing?'Pause preview':'Play preview'} onClick={()=>{controller.current?.toggle();setState(previous=>({...previous,playing:!previous.playing}));}}>{state.playing?<Pause size={17}/>:<Play size={17}/>}</button>
        <button type="button" disabled={state.loading||state.error} aria-label="Restart preview" onClick={()=>{controller.current?.seek(0);if(!reduced)controller.current?.play();}}><RotateCcw size={16}/></button>
        <button type="button" disabled={state.loading||state.error} aria-label="Reset scene view" onClick={()=>controller.current?.resetView()}><Scan size={16}/></button>
      </div>
    </div>
    {!!state.chapters.length&&<nav className={styles.chapters} aria-label="Preview chapters">{state.chapters.map((item,index)=><button key={item.at} type="button" aria-label={`Preview chapter ${index+1}: ${item.title}`} aria-current={state.stage===index?'step':undefined} onClick={()=>{controller.current?.seek(item.at);if(reduced)controller.current?.pause();}}><span>0{index+1}</span><LocalizedText>{item.title}</LocalizedText></button>)}</nav>}
    <p className={styles.note}><LocalizedText message="Drag to look around · Preview only. Watching this scene does not complete the challenge."/></p>
  </section>;
}
