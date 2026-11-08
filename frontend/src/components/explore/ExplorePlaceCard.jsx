'use client';
import {useI18n} from '@/i18n/LocaleProvider';
import {Localized,LocalizedText} from '@/i18n/Localized';

import ExploreAccessibility from './ExploreAccessibility';
import AccessibilitySourceTags from './AccessibilitySourceTags';
import './explore-challenge-badge.css';
import {memo,useState} from 'react';
import Image from 'next/image';
import {Plus,Check,MapPin,ArrowUpRight,Medal,Star,Landmark} from 'lucide-react';
const DISCOVERY_PLACES=new Set(['burj-khalifa-sky','museum-of-the-future','sheikh-zayed-mosque']);
export default memo(function ExplorePlaceCard({place,isSelected=false,onSelect,onHover,onPlanTrip,onToggleShortlist,inShortlist=false}) {
  const {t}=useI18n();
  const displayTitle=place.provider?place.title:t(place.title);
  const hasChallenge=!place.provider&&Boolean(DISCOVERY_PLACES.has(place.id)||place.challengeKeys?.length||place.challengeCandidates?.length);
  const images=place.images||[];
  const priceLabel=place.priceLabel&&!/^check current (entry|visiting)/i.test(place.priceLabel)?place.priceLabel:'';
  const [failedImages,setFailedImages]=useState({});
  const imageSource=[images[0],place.imageFallbacks?.[0]].find(source=>source&&!failedImages[source]);
  return <article className={`discovery-card ${isSelected?'selected':''}`} onMouseEnter={()=>onHover?.(place)} onMouseLeave={()=>onHover?.(null)}>
    <div className="discovery-card-image">
      {!imageSource&&<div className="discovery-placeholder"><Landmark size={42}/><span><LocalizedText>{place.sourceLabel||'Discover the UAE'}</LocalizedText></span></div>}
      {imageSource&&<Localized element={Image} attributes={["alt"]} unoptimized src={imageSource} onError={()=>setFailedImages(previous=>({...previous,[imageSource]:true}))} alt={displayTitle} width={640} height={400} loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:place.id==='burj-khalifa-sky'?'center 20%':'center',display:'block'}}/>}
      {hasChallenge?<Localized element="span" attributes={["title"]} className="explore-challenge-badge" title="Passport challenge available">
        <span className="explore-challenge-badge-icon"><Medal size={17} strokeWidth={1.6} aria-hidden="true"/></span>
        <span className="explore-challenge-badge-copy"><small><LocalizedText>Passport</LocalizedText></small><strong><LocalizedText>Challenge</LocalizedText></strong></span>
      </Localized>:<span className="discovery-category"><LocalizedText>{place.category==='things-to-do'?'EXPERIENCE':place.category.toUpperCase()}</LocalizedText></span>}
      <Localized element={"button"} attributes={["aria-label"]} className={`discovery-add ${inShortlist?'added':''}`} aria-pressed={inShortlist} aria-label={t(inShortlist?'Remove ⟦0⟧ from shortlist':'Add ⟦0⟧ to shortlist',[displayTitle],[true])} onClick={()=>onToggleShortlist?.(place)}>{inShortlist?<Check size={18}/>:<Plus size={20}/>}</Localized>
      <AccessibilitySourceTags evidence={place.accessibility} sourceUrl={place.sourceUrl} sourceLabel={place.sourceLabel} provider={place.provider}/>
    </div>
    <div className="discovery-card-body"><div className="discovery-location"><MapPin size={12}/><span><LocalizedText>{place.neighborhood}</LocalizedText></span>{place.rating!=null&&<span className="discovery-rating"><Star size={11}/>{place.rating}</span>}</div><Localized element={"button"} attributes={["aria-label"]} className="discovery-title" onClick={()=>place.provider?window.open(place.sourceUrl,'_blank','noopener,noreferrer'):onSelect?.(place)} aria-label={place.provider?`View ${displayTitle} at source`:`Show ${displayTitle} on map`}>{place.provider?place.title:<LocalizedText>{place.title}</LocalizedText>}</Localized><p>{place.eventDate&&<strong>{place.eventDate} · </strong>}<LocalizedText>{place.tagline||place.cuisine||place.description}</LocalizedText></p><ExploreAccessibility evidence={place.accessibility} title={displayTitle}/><div className="discovery-card-footer"><div className="discovery-card-meta">{priceLabel&&<span><LocalizedText>{priceLabel}</LocalizedText></span>}{place.attribution?.length>0&&<details className="discovery-photo-credits"><summary><LocalizedText>Photo credits</LocalizedText></summary><div>{place.attribution.map((credit,index)=><small key={index}>{credit.url?<a href={credit.url} target="_blank" rel="noopener noreferrer">{credit.label}</a>:credit.label}</small>)}</div></details>}</div><Localized element={"button"} attributes={["aria-label"]} onClick={()=>onPlanTrip?.(place)} aria-label={`Ask MASAR about ${displayTitle}`}><LocalizedText message={"Ask MASAR "} /><ArrowUpRight size={14}/></Localized></div></div>
  </article>;
});
