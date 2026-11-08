'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';


import {useState,useRef,useEffect,useCallback} from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {Camera,Upload,History,Compass,ArrowLeft,ArrowRight,AlertCircle,MapPin,RefreshCw} from 'lucide-react';
import JourneyShell from '@/components/layout/JourneyShell';
import {useAuth} from '@/context/AuthContext';
import {apiRequest} from '@/lib/api';
import styles from './time-travel.module.css';

const TimeWipeCanvas=dynamic(()=>import('./_components/TimeWipeCanvas'),{ssr:false});
const EMIRATES=['All','Abu Dhabi','Dubai','Sharjah','Ras Al Khaimah','Fujairah','Ajman','Umm Al Quwain'];

export default function TimeTravelContent({embedded=false,placeName,hideIntro=false}){
  const {token}=useAuth();
  const [landmarks,setLandmarks]=useState([]);
  const [emirate,setEmirate]=useState('All');
  const [archive,setArchive]=useState(null);
  const [eraIndex,setEraIndex]=useState(0);
  const [loading,setLoading]=useState(true);
  const [scanning,setScanning]=useState(false);
  const [error,setError]=useState('');
  const [cameraActive,setCameraActive]=useState(false);
  const [cameraPending,setCameraPending]=useState(false);
  const [reload,setReload]=useState(0);
  const video=useRef(null);
  const stream=useRef(null);
  const request=useRef(null);
  const cameraGeneration=useRef(0);
  const alive=useRef(true);
  const fileInput=useRef(null);
  const stopCamera=useCallback(()=>{
    cameraGeneration.current++;
    stream.current?.getTracks().forEach(track=>track.stop());
    stream.current=null;
    if(video.current)video.current.srcObject=null;
    if(alive.current){setCameraActive(false);setCameraPending(false);}
  },[]);

  useEffect(()=>{
    alive.current=true;
    return ()=>{alive.current=false;request.current?.abort();stopCamera();};
  },[stopCamera]);

  useEffect(()=>{
    const controller=new AbortController();
    apiRequest('/api/v1/time-travel/landmarks',{token,signal:controller.signal})
      .then(data=>{if(!controller.signal.aborted){setLandmarks(data.landmarks);setError('');}})
      .catch(err=>{if(!controller.signal.aborted)setError(err.message||'The archive could not load. Please retry.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[token,reload]);

  const open=async(payload)=>{
    request.current?.abort();
    const controller=new AbortController();
    request.current=controller;
    stopCamera();setArchive(null);setScanning(true);setError('');
    try{
      const data=await apiRequest('/api/v1/time-travel/detect',{
        token,method:'POST',signal:controller.signal,
        headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
      });
      if(controller.signal.aborted)return;
      if(data.source==='illustrative_archive'||data.is_recognized){setArchive(data);setEraIndex(0);}
      else setError(data.message||'No supported landmark was identified. Try a clearer view.');
    }catch(err){if(!controller.signal.aborted)setError(err.message||'Recognition could not finish. Please retry.');}
    finally{if(!controller.signal.aborted)setScanning(false);}
  };

  const startCamera=async()=>{
    if(cameraPending||cameraActive||scanning)return;
    const generation=++cameraGeneration.current;
    setCameraPending(true);setError('');
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera access needs HTTPS or localhost. You can upload a photo instead.');
      const captured=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}},audio:false});
      if(!alive.current||generation!==cameraGeneration.current){captured.getTracks().forEach(track=>track.stop());return;}
      stream.current=captured;setCameraActive(true);
      if(video.current){video.current.srcObject=captured;await video.current.play();}
    }catch(err){if(alive.current&&generation===cameraGeneration.current){stopCamera();setError(err.message||'Camera access was declined. Upload an image or browse below.');}}
    finally{if(alive.current&&generation===cameraGeneration.current)setCameraPending(false);}
  };

  const capture=()=>{
    if(!video.current?.videoWidth){setError('The camera is not ready yet. Try again.');return;}
    try{
      const canvas=document.createElement('canvas');
      canvas.width=video.current.videoWidth;canvas.height=video.current.videoHeight;
      canvas.getContext('2d').drawImage(video.current,0,0);
      open({image_base64:canvas.toDataURL('image/jpeg',.85)});
    }catch{setError('The photo could not be captured. Please upload an image instead.');}
  };

  const upload=async(event)=>{
    const file=event.target.files?.[0];event.target.value='';
    if(!file)return;
    if(!['image/jpeg','image/png'].includes(file.type)||file.size>5*1024*1024){setError('Choose a JPG or PNG smaller than 5 MB.');return;}
    try{
      const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
      if(alive.current)open({image_base64:data});
    }catch{setError('This file could not be read. Please choose another photo.');}
  };

  const eras=archive?[...archive.timeline.filter(era=>era.id!=='2026'),...archive.timeline.filter(era=>era.id==='2026')]:[];
  const activeEra=eras[eraIndex];
  const visible=emirate==='All'?landmarks:landmarks.filter(item=>item.emirate===emirate);
  const content=<div className={embedded?styles.embeddedContainer:styles.pageContainer}>
      <div className={styles.contentWrapper}>
        {!hideIntro&&<header className={styles.header}>
          <div className={styles.portalBadge}><History size={14}/><LocalizedText message={" MASAR / THROUGH THE YEARS"} /></div>
          <h1><LocalizedText>{archive?archive.landmark_name:(placeName||'One place. More than one story.')}</LocalizedText></h1>
          <p className={styles.tagline}><LocalizedText message={"Take or upload a landmark photo to explore how this place looked before and how it looks today."} /></p>
        </header>}
        <p className={styles.contentNotice}><LocalizedText message={"Illustrative reconstructions and draft historical narratives. Images are not authenticated historical photographs; source review is pending. Exploring awards no Passport stamps or XP."} /></p>
        {error&&<div className={styles.scanErrorBanner} role="alert"><AlertCircle size={20}/><p><LocalizedText>{error}</LocalizedText></p>{!landmarks.length&&!loading&&<button onClick={()=>{setLoading(true);setReload(v=>v+1);}}><LocalizedText message={"Retry archive"} /></button>}</div>}
        {scanning&&<div className={styles.scanningNotice} role="status"><Compass size={28} className={styles.scanSpin}/><span><LocalizedText message={"Opening a new perspective…"} /></span><button onClick={()=>{request.current?.abort();setScanning(false);}}><LocalizedText message={"Cancel"} /></button></div>}
        {archive&&!scanning?<>
          <div className={styles.unlockedHeaderBanner}>
            <div className={styles.landmarkIdentity}><MapPin size={22}/><div><h3>{archive.landmark_name} <span lang="ar">{archive.arabic_name}</span></h3><p>{archive.city} · {archive.emirate}</p><small><LocalizedText>{archive.source==='model_match'?`SigLIP similarity score: ${Number(archive.confidence).toFixed(2)} · not a probability or verified identification`:'Archive selected · no image recognition performed'}</LocalizedText></small></div></div>
            <button className={styles.returnCameraBtn} onClick={()=>{setArchive(null);setError('');}}><ArrowLeft size={16}/><LocalizedText message={" Explore another place"} /></button>
          </div>
          <div className={styles.portalGrid}>
            <div className={styles.viewportCard}><TimeWipeCanvas eras={eras} currentEraIndex={eraIndex} onEraChange={setEraIndex} landmarkData={archive}/></div>
            <aside className={styles.sidebarCard}>
              <div className={styles.storyHeader}><p><LocalizedText message={"ILLUSTRATIVE HERITAGE STORY"} /></p><h3>{activeEra?.era_title}</h3><span>{activeEra?.year} · {activeEra?.subtitle}</span></div>
              <div className={styles.storyBody}><p><LocalizedText>{activeEra?.description}</LocalizedText></p><div className={styles.highlightBox}><strong><LocalizedText message={"What changed"} /></strong><p>{activeEra?.what_changed}</p></div><p>{archive.history_summary}</p></div>
              <Link className={styles.claimBtn} href="/explore"><LocalizedText message={"Discover places for your trip "} /><ArrowRight size={16}/></Link>
            </aside>
          </div>
        </>:!scanning&&<>
          <Localized element={"section"} attributes={["aria-label"]} className={styles.recognitionPanel} aria-label="Optional landmark recognition">
            <div><span className={styles.portalBadge}><Camera size={14}/><LocalizedText message={" OPTIONAL PHOTO RECOGNITION"} /></span><h2><LocalizedText message={"A familiar place, rediscovered."} /></h2><p>{placeName?<LocalizedText>Take a clear photo of this place or upload one you already have. Comparisons are available for supported heritage landmarks.</LocalizedText>:<LocalizedText message={"Browse freely below, or identify one of the ⟦0⟧ supported heritage sites."} values={[landmarks.length||11]} />}</p><p className={styles.tagline}><LocalizedText message={"Your photo is checked on this server with the same SigLIP 2 model used for evidence checking. It is not sent to OpenAI or stored as challenge evidence. Recognition does not verify your location or attendance."} /></p></div>
            <div className={styles.cameraControls}>
              <video ref={video} autoPlay playsInline muted className={cameraActive?styles.cameraPreview:styles.cameraHidden}/>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png" onChange={upload} hidden/>
              <div className={styles.scannerActionDeck}>
                {!cameraActive?<button className={styles.heroScanButton} onClick={startCamera} disabled={cameraPending}><Camera size={18}/><LocalizedText>{cameraPending?'Opening camera…':'Open camera'}</LocalizedText></button>:<><button className={styles.heroScanButton} onClick={capture}><Camera size={18}/><LocalizedText message={" Capture & identify"} /></button><button className={styles.secondaryActionBtn} onClick={stopCamera}><LocalizedText message={"Close camera"} /></button></>}
                <button className={styles.secondaryActionBtn} onClick={()=>fileInput.current?.click()}><Upload size={16}/><LocalizedText message={" Upload photo"} /></button>
              </div>
              <small><LocalizedText message={"JPG or PNG · up to 5 MB · camera starts only when requested"} /></small>
            </div>
          </Localized>
          {!placeName&&<Localized element={"section"} attributes={["aria-label"]} className={styles.catalogSection} aria-label="Heritage archive">
            <div className={styles.catalogHeader}><div className={styles.catalogTitleArea}><span className={styles.portalBadge}><History size={14}/><LocalizedText message={" THE HERITAGE COLLECTION"} /></span><h2><LocalizedText message={"Across the seven emirates"} /></h2><p><LocalizedText message={"Select a place to open its illustrated timeline. No AI scan is needed."} /></p></div></div>
            <div className={styles.emirateTabs}>{EMIRATES.map(name=><button key={name} className={`${styles.emirateTab} ${emirate===name?styles.emirateTabActive:''}`} onClick={()=>setEmirate(name)}>{name}</button>)}</div>
            {loading?<p role="status"><RefreshCw size={16}/><LocalizedText message={" Opening the heritage collection…"} /></p>:<div className={styles.landmarkGrid}>{visible.map(item=><button key={item.landmark_id} className={styles.landmarkCard} onClick={()=>open({sample_id:item.landmark_id})}>
              <div className={styles.cardImageWrapper}><Localized element={"img"} attributes={["alt"]} src={item.thumbnail_url} alt={`Illustration of ${item.landmark_name}`} className={styles.cardThumb} loading="lazy"/><div className={styles.cardImageOverlay}/><div className={styles.cardBadgesTop}><span className={styles.emirateBadge}>{item.emirate}</span><span className={styles.foundedBadge}><LocalizedText message={"Illustration"} /></span></div></div>
              <div className={styles.cardContent}><div className={styles.cardTitles}><h3>{item.landmark_name}</h3><span className={styles.cardArabic} lang="ar">{item.arabic_name}</span></div><p className={styles.cardLocation}><MapPin size={12}/>{item.city}</p><span className={styles.exploreCardBtn}><LocalizedText message={"Explore the timeline "} /><ArrowRight size={14}/></span></div>
            </button>)}</div>}
          </Localized>}
        </>}
      </div>
    </div>
  ;
  return embedded?content:<Localized element={JourneyShell} attributes={["title"]} title="Time Travel" headerVariant="workspace" action={<Link className="journey-button" href="/challenges"><LocalizedText message={"Play arcade "} /><ArrowRight size={16}/></Link>}>{content}</Localized>;
}
