'use client';

import {useState} from 'react';
import Image from 'next/image';
import {Coins, CheckCircle2, ArrowRight, MapPin, RotateCcw, Package, LoaderCircle} from 'lucide-react';
import {LocalizedText} from '@/i18n/Localized';
import styles from './sikka-daily-result.module.css';

export default function SikkaDailyResult({stats,result,destinationSaved=false,shortlistMessage,onSaveDestination,onRetry,onRetrySave,onClose}) {
  const [added,setAdded]=useState(false);
  const complete=result?.status==='completed';
  const saving=!result || result.status==='saving';
  const failed=result?.status==='error';
  const saved=destinationSaved||added;
  return <section className={styles.result} aria-label="Daily Sikka challenge result">
    <div className={styles.heading} role="status" aria-live="polite">
      <span className={styles.eyebrow}><LocalizedText message="YOUR DAILY EXPEDITION" /></span>
      <div className={`${styles.seal} ${complete ? styles.success : ''}`}>
        {saving ? <LoaderCircle size={30}/> : complete ? <CheckCircle2 size={30}/> : <Package size={30}/>}
      </div>
      <h2><LocalizedText>{saving?'Saving your run…':complete?'A little adventure. A well-earned coin.':failed?'Your run is ready to save.':'One more run, one step closer.'}</LocalizedText></h2>
      <p><LocalizedText>{saving?'Confirming your daily challenge result.':complete?'Secret Sikka Run completed. Your Daily Challenge Coin is now in My Passport.':failed?result.message:'Deliver the merchant’s parcel or reach 150 points to complete today’s challenge.'}</LocalizedText></p>
    </div>
    {complete && <div className={styles.reward}>
      <Coins size={25}/><div><strong>+{result.coins_awarded ?? 0} <LocalizedText message="Daily Challenge Coin" /></strong><small><LocalizedText message="Saved to My Passport" /></small></div>
      <span>{result.balance ?? 0}<small><LocalizedText message="total coins" /></small></span>
    </div>}
    <dl className={styles.stats}>
      <div><dt><LocalizedText message="Run score" /></dt><dd>{stats.score}</dd></div>
      <div><dt><LocalizedText message="Distance" /></dt><dd>{stats.distance}<small>m</small></dd></div>
      <div><dt><LocalizedText message="Parcel" /></dt><dd className={styles.parcel}><LocalizedText>{stats.deliveryCard?'Delivered':'Not delivered'}</LocalizedText></dd></div>
    </dl>
    <p className={styles.coinNote}><LocalizedText message="⟦0⟧ souq coins collected during this run · separate from your Daily Challenge Coin." values={[stats.coins]}/></p>
    <div className={styles.destination}>
      <Image src="/attraction-photos/al-fahidi.webp" alt="Al Fahidi Historical Neighbourhood" width={450} height={350} sizes="(max-width: 600px) 100vw, 150px" />
      <div><span className={styles.eyebrow}><LocalizedText message="TAKE THE NEXT STEP OUTSIDE"/></span><h3><LocalizedText message="Explore Al Fahidi"/></h3><p><LocalizedText message="Make room for wind towers, quiet courtyards and a little old Dubai in your next trip."/></p>
        <button type="button" className={styles.save} disabled={saved} onClick={()=>{if(onSaveDestination?.())setAdded(true);}}>
          {saved?<CheckCircle2 size={16}/>:<MapPin size={16}/>}<LocalizedText>{saved?'Al Fahidi is in your shortlist':'Add Al Fahidi to my shortlist'}</LocalizedText>
        </button>
      </div>
    </div>
    {shortlistMessage&&<p className={styles.feedback} role="status"><LocalizedText>{shortlistMessage}</LocalizedText></p>}
    <div className={styles.actions}>
      {!complete&&!saving&&<button type="button" className={styles.secondary} onClick={failed?onRetrySave:onRetry}><RotateCcw size={16}/><LocalizedText>{failed?'Retry saving this run':'Try the challenge again'}</LocalizedText></button>}
      <button type="button" className={styles.primary} onClick={onClose}><LocalizedText>{complete?'View daily reward':'Back to daily challenge'}</LocalizedText><ArrowRight size={16}/></button>
    </div>
    {complete&&<p className={styles.coinNote}><LocalizedText message="Today’s reward is collected. A new challenge arrives at midnight Dubai time."/></p>}
  </section>;
}
