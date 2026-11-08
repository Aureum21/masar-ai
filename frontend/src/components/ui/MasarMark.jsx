'use client';
import {Localized} from '@/i18n/Localized';

import {useState} from 'react';
import Image from 'next/image';
import './masar-mark.css';

// Keep the real logo visible while the animation buffers, fails, or is paused.
export default function MasarMark({animated=false,className=''}) {
  const [playing,setPlaying]=useState(false);
  return <Localized element={"span"} attributes={["aria-label"]} className={`masar-mark ${animated && playing ? 'has-playing-video' : ''} ${className}`} role="img" aria-label="MASAR AI">
    <Image src="/MasarAiLogo.png" alt="" fill sizes="160px" priority style={{objectFit:'contain'}}/>
    {animated&&<video className={playing?'is-playing':''} autoPlay loop muted playsInline preload="metadata" poster="/MasarAiLogo.png" aria-hidden="true" onPlaying={()=>setPlaying(true)} onWaiting={()=>setPlaying(false)} onError={()=>setPlaying(false)} onPause={()=>setPlaying(false)}>
      <source src="/loadingLogo.webm" type="video/webm"/>
    </video>}
  </Localized>;
}
