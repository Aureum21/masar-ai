'use client';
import {useState} from 'react';
import Image from 'next/image';
import sourceLogos from '@/data/accessibilitySourceLogos.json';
import './accessibility-source-tags.css';

const SHORT_NAMES={
  'ticket.atthetop.ae':'At the Top',
  'szgmc.gov.ae':'SZGMC',
  'cm.sharjah24.ae':'Sharjah24',
  'www.sharjahmuseums.ae':'Sharjah Museums',
  'www.dmt.gov.ae':'Abu Dhabi Municipality',
  'www.dubaifestivalcitymall.com':'Festival City Mall',
  'www.visitsharjah.com':'Visit Sharjah',
  'visit-ajman.ae':'Visit Ajman',
  'tourism.fujairah.ae':'Fujairah Tourism',
  'culturalmap.gov.ae':'UAE Cultural Map',
  'u.ae':'UAE Government',
  'groundcontrolsocial.com':'Ground Control',
  'www.citycentremalls.com':'City Centre',
};

export default function AccessibilitySourceTags({evidence,sourceUrl,sourceLabel,provider}){
  const [failed,setFailed]=useState({});
  const sources=new Map();
  for(const fact of Object.values(evidence?.facts||{})){
    if(!fact||!['reported','confirmed'].includes(fact.status)||fact.value==null||!fact.source_url)continue;
    try{
      const url=new URL(fact.source_url);
      if(!['https:','http:'].includes(url.protocol)||url.username||url.password)continue;
      if(!sources.has(url.hostname))sources.set(url.hostname,{url:fact.source_url,source:fact.source||url.hostname,accessibility:true});
    }catch{/* Invalid evidence cannot create a source link. */}
  }
  // A destination guide is still useful when the venue has no access report.
  try{
    const url=new URL(sourceUrl);
    if(['http:','https:'].includes(url.protocol)&&!url.username&&!url.password&&!sources.has(url.hostname)){
      const name=sourceLogos[url.hostname]?.name||SHORT_NAMES[url.hostname]||(sourceLabel&&sourceLabel!=='Tourism / venue reference'?sourceLabel:url.hostname.replace(/^www\./,''));
      sources.set(url.hostname,{url:sourceUrl,source:name,accessibility:false});
    }
  }catch{/* Missing or malformed destination references are optional. */}
  if(!sources.size)return null;
  return <div className="accessibility-source-tags" role="group" aria-label="Destination and accessibility sources">
    {[...sources].map(([host,item])=>{
      const logo=sourceLogos[host]?.logo;
      const wordmark=Boolean(sourceLogos[host]?.wordmark&&logo&&!failed[host]);
      const label=SHORT_NAMES[host]||item.source;
      return <a key={host} href={item.url} target="_blank" rel="noopener noreferrer"
        className={`accessibility-source-tag${wordmark?' accessibility-source-tag--wordmark':''}${provider==='google'&&!item.accessibility?' google-maps-credit':''}`} title={item.accessibility?`Accessibility information reported by ${item.source}; confirm with the venue`:`Destination reference: ${item.source}`}
        aria-label={`${item.accessibility?'Accessibility source':'Destination source'}: ${item.source} (opens in a new tab)`}>
        {logo&&!failed[host]&&<Image unoptimized src={logo} alt="" width={wordmark?104:18} height={18} loading="lazy" onError={()=>setFailed(previous=>({...previous,[host]:true}))}/>}
        {!wordmark&&<span translate="no">{label}</span>}
      </a>;
    })}
  </div>;
}
