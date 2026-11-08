'use client';
import {useI18n} from '@/i18n/LocaleProvider';
import {formattingLocale} from '@/i18n/messages.mjs';
import {Localized,LocalizedText} from '@/i18n/Localized';
import {CalendarDays,Users,MapPin,ArrowUpRight,ArrowRight,Check,Plane,Building2,SlidersHorizontal} from 'lucide-react';
import {validateBrief} from '@/lib/tripDraft';

export default function TripBriefHero({brief,places,activeStep=0,onSelectStep}) {
  const {locale:uiLocale}=useI18n();

  const errors=validateBrief(brief);
  const datesReady=!errors.start_date&&!errors.end_date&&!errors.travellers;
  const essentialsReady=brief.flight_requirement!=='unknown'&&brief.stay_requirement!=='unknown'&&!errors.origin;
  const days=datesReady?Math.round((Date.parse(brief.end_date)-Date.parse(brief.start_date))/86400000)+1:null;
  const dateLabel=datesReady?new Intl.DateTimeFormat(formattingLocale(uiLocale, 'en'),{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(brief.start_date+'T00:00:00Z')):'Choose your dates';
  const steps=[
    {id:'brief-dates',label:'Set the scene',detail:datesReady?'Dates & guests set':'Dates & travel party',Icon:CalendarDays,ready:datesReady},
    {id:'brief-essentials',label:'Connect the essentials',detail:essentialsReady?'Travel needs set':'Flights & accommodation',Icon:Plane,ready:essentialsReady},
    {id:'brief-preferences',label:'Find your rhythm',detail:`${brief.interests?.length||0} interests selected`,Icon:SlidersHorizontal,ready:Boolean(brief.interests?.length)}
  ];
  const travelLabel=value=>value==='needed'?'Find options':value==='already_arranged'?'Already arranged':value==='not_needed'?'Not needed':'You decide';

  return <>
    <div className="brief-editorial-hero">
      <div className="brief-hero-copy">
        <span className="journey-eyebrow"><span className="journey-gold-dot"/><LocalizedText message={" YOUR NEXT UAE CHAPTER"} /></span>
        <h1><LocalizedText message={"A journey that "} /><em><LocalizedText message={"feels like you."} /></em></h1>
        <div className="brief-hero-facts">
          <span><CalendarDays size={13}/><LocalizedText>{days?`${days} ${days===1?'day':'days'} · from ${dateLabel}`:dateLabel}</LocalizedText></span>
          <span><Users size={13}/>{brief.travellers||1} <LocalizedText>{Number(brief.travellers)===1?'traveler':'travelers'}</LocalizedText></span>
          <span><MapPin size={13}/>{places} <LocalizedText>{places===1?'place':'places'}</LocalizedText><LocalizedText message={" picked"} /></span>
        </div>
      </div>
      <Localized element={"div"} attributes={["aria-label"]} className="brief-journey-preview" aria-label="Live trip summary">
        <div className="brief-preview-label"><span><LocalizedText message={"YOUR TRIP, IN THE MAKING"} /></span><ArrowUpRight size={14}/></div>
        <div className="brief-preview-style"><strong><LocalizedText>{brief.preferred_pace||'Balanced'}</LocalizedText></strong><span><LocalizedText message={"pace · ⟦0⟧ budget"} values={[brief.budget_tier||'Standard']} /></span></div>
        <div className="brief-preview-services">
          <span><Plane size={14}/><small><LocalizedText message={"Flights"} /></small><b>{travelLabel(brief.flight_requirement)}</b></span>
          <span><Building2 size={14}/><small><LocalizedText message={"Your stay"} /></small><b>{travelLabel(brief.stay_requirement)}</b></span>
        </div>
      </Localized>
    </div>
    <Localized element={"nav"} attributes={["aria-label"]} className="brief-section-nav" aria-label="Trip brief sections">
      {steps.map(({id,label,detail,Icon,ready},index)=>{
        const isActive=activeStep===index;
        if(onSelectStep){
          return (
            <button
              type="button"
              key={id}
              onClick={()=>onSelectStep(index)}
              className={`brief-step-tab ${isActive?'is-active':''} ${ready?'is-ready':''}`}
              aria-current={isActive?'step':undefined}
            >
              <span className="brief-step-icon">{ready&&!isActive?<Check size={18}/>:<Icon size={18}/>}</span>
              <span className="brief-step-info">
                <small>STEP 0{index+1}</small>
                <strong><LocalizedText>{label}</LocalizedText></strong>
                <em><LocalizedText>{detail}</LocalizedText></em>
              </span>
              <ArrowRight size={15} className="brief-step-arrow"/>
            </button>
          );
        }
        return (
          <a href={`#${id}`} key={id} className={ready?'is-ready':''}>
            <span className="brief-step-icon">{ready?<Check size={18}/>:<Icon size={18}/>}</span>
            <span className="brief-step-info">
              <small>0{index+1}</small>
              <strong><LocalizedText>{label}</LocalizedText></strong>
              <em><LocalizedText>{detail}</LocalizedText></em>
            </span>
            <ArrowUpRight size={14}/>
          </a>
        );
      })}
    </Localized>
  </>;
}
