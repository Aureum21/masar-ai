'use client';
import {useI18n} from '@/i18n/LocaleProvider';
import {formattingLocale} from '@/i18n/messages.mjs';

import {Localized,LocalizedText} from '@/i18n/Localized';

import Link from 'next/link';
import {ArrowUpRight,ArrowRight,MapPin,CalendarDays,ShieldCheck,Sparkles,LockKeyhole} from 'lucide-react';
import StampArt from './StampArt';
import PassportDialog from './PassportDialog';
import {PrivateEvidence} from './PassportUI';
import {passportDate} from '../_lib/passportApi';
import styles from '../passport.module.css';

export function StampCard({stamp,onOpen}){
 const {locale:uiLocale}=useI18n();

  const xp=Number.isFinite(stamp.xp)?stamp.xp:null;
  return <Localized element={"button"} attributes={["aria-label"]} type="button" className={styles.collectibleCard} onClick={()=>onOpen(stamp)} aria-label={`Open ${stamp.title} stamp${xp!==null?`, ${xp} XP earned`:''}`}>
    <div className={styles.collectibleTop}><span><LocalizedText>{stamp.is_demo?'DEMO EDITION':'EARNED COLLECTIBLE'}</LocalizedText></span><ArrowUpRight size={14}/></div>
    <div className={styles.collectibleArt}><span className={styles.stampHalo}/><StampArt stamp={stamp} size={138}/>{xp!==null&&<span className={styles.stampXP}><Sparkles size={12}/> +{xp} <LocalizedText>{stamp.is_demo?'demo XP':'XP'}</LocalizedText></span>}</div>
    <div className={styles.collectibleCopy}><span className={styles.collectibleCategory}><LocalizedText>{stamp.challenge_key==='boxing'||/boxing/i.test(stamp.title)?'ARCADE / BOXING':stamp.category?.replaceAll('-',' ')||'DISCOVERY'}</LocalizedText></span><h3><LocalizedText>{stamp.title}</LocalizedText></h3><p><MapPin size={12}/><span><LocalizedText>{stamp.place||'UAE destination'}</LocalizedText></span></p></div>
    <div className={styles.collectibleFoot}><span>{passportDate(stamp.earned_at, uiLocale)}</span><span><LocalizedText message={"View memory "} /><ArrowRight size={12}/></span></div>
  </Localized>;
}

export function PassportXP({xp=0,level={}}){
  const {locale:uiLocale}=useI18n();

  const progress=Math.min(1,Math.max(0,Number(level.progress)||0));
  const remaining=level.next_xp?Math.max(0,level.next_xp-xp):0;
  return <div className={styles.xpJourney}>
    <div className={styles.xpJourneyTop}><div><span className={styles.xpEyebrow}><LocalizedText message={"YOUR EXPLORER XP"} /></span><div className={styles.xpTotal}>{Number(xp).toLocaleString(formattingLocale(uiLocale))}<span><LocalizedText message={"XP"} /></span><Sparkles size={19}/></div></div><div className={styles.xpNext}>{level.next_xp?<><strong>{remaining.toLocaleString(formattingLocale(uiLocale))}<LocalizedText message={" XP"} /></strong><span><LocalizedText message={"to level ⟦0⟧"} values={[(level.number||1)+1]} /></span></>:<><strong><LocalizedText message={"Top level reached"} /></strong><span><LocalizedText message={"Keep collecting memories"} /></span></>}</div></div>
    <Localized element={"progress"} attributes={["aria-label"]} className={styles.xpTrack} aria-label="Progress to next traveler level" value={progress} max="1"/>
    <div className={styles.xpJourneyFoot}><span><LocalizedText preserveValues={[false,true]} message={"Level ⟦0⟧ · ⟦1⟧"} values={[level.number||1,level.name||'Explorer']} /></span><span>{Math.round(progress*100)}%<LocalizedText>{level.next_xp?' of this level':' complete'}</LocalizedText></span></div>
  </div>;
}

export function StampMemory({stamp,onClose,onPhotoRemoved}){
 const {locale:uiLocale}=useI18n();

  const xp=Number.isFinite(stamp.xp)?stamp.xp:null;
  const footer=<><span><ShieldCheck size={14}/><LocalizedText message={" Your collectible stays with you after redemption."} /></span>{!stamp.trip_deleted&&<Link href={`/trips/${stamp.trip_id}`} className={styles.primaryButton}><LocalizedText message={"Revisit journey "} /><ArrowUpRight size={15}/></Link>}</>;
  return <Localized element={PassportDialog} attributes={["title"]} title={stamp.title} onClose={onClose} className={styles.stampDetailDialog} footer={footer}>
    <div className={styles.stampMemoryBody}>
      <div className={styles.stampMemorySummary}>
        <div className={styles.stampMemoryArt}><StampArt stamp={stamp} size={166}/><span className={styles.stampEdition}><LocalizedText>{stamp.is_demo?'DEMO EDITION':'PERSONAL COLLECTION'}</LocalizedText></span></div>
        <div className={styles.stampReward}>{xp!==null?<><span><LocalizedText message={"REWARD EARNED"} /></span><strong>+{xp}<small><LocalizedText>{stamp.is_demo?'demo XP':'XP'}</LocalizedText></small></strong></>:<><span><LocalizedText message={"COLLECTIBLE"} /></span><strong><LocalizedText message={"Stamp earned"} /></strong></>}<span><ShieldCheck size={13}/><LocalizedText message={" Challenge approved"} /></span></div>
        <div className={styles.stampPlace}><MapPin size={15}/><div><span><LocalizedText message={"Planned venue"} /></span><strong><LocalizedText>{stamp.place||'UAE destination'}</LocalizedText></strong></div></div>
        <div className={styles.stampPlace}><CalendarDays size={15}/><div><span><LocalizedText message={"Collected"} /></span><strong>{passportDate(stamp.earned_at, uiLocale)}</strong></div></div>
      </div>
      <div className={styles.stampMemoryContent}>
        <div className={styles.stampMemoryNote}><span className={styles.xpEyebrow}><LocalizedText message={"YOUR MEMORY"} /></span><p><LocalizedText>{stamp.memory_text||'A small moment worth keeping.'}</LocalizedText></p></div>
        {stamp.evidence_type==='photo'&&stamp.evidence_available!==false&&<Localized element={"section"} attributes={["aria-label"]} className={styles.stampPhotoPanel} aria-label="Your private evidence"><header><span><LockKeyhole size={13}/><LocalizedText message={" YOUR PRIVATE PHOTO"} /></span><span><LocalizedText message={"Visible only to you and authorized reviewers"} /></span></header><PrivateEvidence key={stamp.submission_id} submissionId={stamp.submission_id} canDelete onRemoved={onPhotoRemoved}/></Localized>}
        {stamp.evidence_available===false&&<p className={styles.stampPhotoRemoved}><LockKeyhole size={14}/><LocalizedText message={" Photo removed. Your stamp and XP are kept."} /></p>}
        <details className={styles.stampTechnicalDetails}><summary><LocalizedText message={"Collection details"} /></summary><dl><dt><LocalizedText message={"Verification"} /></dt><dd><LocalizedText>{stamp.verification||'Approved challenge'}</LocalizedText></dd>{stamp.evaluation_profile&&<><dt><LocalizedText message={"Evaluation"} /></dt><dd><LocalizedText>{stamp.evaluation_profile==='demo'?'Light evaluation':'Strict evaluation'}</LocalizedText></dd></>}<dt><LocalizedText message={"Collectible ID"} /></dt><dd>{stamp.id}</dd></dl></details>
      </div>
    </div>
  </Localized>;
}
