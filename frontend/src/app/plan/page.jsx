'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';
import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Compass,ArrowLeft,ArrowRight,CalendarDays,Check,SlidersHorizontal,Plane,Building2,Save,Sparkles,MapPin,Accessibility,Plus,X} from 'lucide-react';
import JourneyShell from '@/components/layout/JourneyShell';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import TripShortlist from '@/components/explore/TripShortlist';
import {useAuth} from '@/context/AuthContext';
import {useTripDraft} from '@/hooks/useTripDraft';
import {profileBrief,validateBrief,planningPrompt,setPriority,planningToday} from '@/lib/tripDraft';
import {createHandoff} from '@/lib/planningHandoff';
import {useResolvedPlaces} from '@/hooks/useResolvedPlaces';
import {useCloudBrief} from '@/hooks/useCloudBrief';
import {planningDraft,localAccountDraft} from '@/lib/cloudBrief';
import AccountBriefStatus from '@/components/explore/AccountBriefStatus';
import RecentPlanningRuns from '@/components/planning/RecentPlanningRuns';
import TripBriefHero from '@/components/planning/TripBriefHero';
import TravellerSupportEditor from '@/components/planning/TravellerSupportEditor';
import MasarDatePicker from '@/components/ui/MasarDatePicker';
import MasarSelect from '@/components/ui/MasarSelect';

const INTERESTS=['Culture & Heritage','Architecture','Food & Dining','Nature & Beaches','Adventure','Shopping','Family Experiences'];
const optionsWith=(options,value)=>[...new Set([...options,...(value?[value]:[])])];
const REQUIREMENT_OPTIONS=[['unknown','Decide with MASAR'],['needed','Find options for me'],['already_arranged','Already arranged'],['not_needed','Not needed']];

function BriefContent() {
  const {user}=useAuth();
  const router=useRouter();
  const {draft,update,ready,storageError}=useTripDraft();
  const resolved=useResolvedPlaces(draft.selections);
  const cloud=useCloudBrief();
  const [errors,setErrors]=useState({});
  const [notice,setNotice]=useState('');
  const [opening,setOpening]=useState(false);
  const [activeStep,setActiveStep]=useState(0);

  const brief={...profileBrief(user?.travel_preferences),...draft.brief};
  const interests=optionsWith(INTERESTS).concat((brief.interests||[]).filter(item=>!INTERESTS.includes(item)));

  const hasConfiguredSupport=Boolean((brief.traveller_support||[]).some(row=>(row?.needs?.length>0)||row?.max_walk_m||row?.rest_every_minutes));
  const [supportActive,setSupportActive]=useState(hasConfiguredSupport||Boolean(errors.traveller_support));

  function change(field,value) {
    setNotice('');setErrors(previous=>({...previous,[field]:null}));
    update(previous=>({...previous,brief:{...brief,[field]:value},savedAt:null}));
  }

  function restoreAccount() {
    if(cloud.account?.draft&&update(()=>localAccountDraft(cloud.account),{reset:true}))setNotice('Your account brief is now on this device.');
  }

  async function save(overwrite=false) {
    const saved=update(previous=>({...previous,brief,savedAt:new Date().toISOString()}));
    if(!saved)return null;
    if(!cloud.available){setNotice('Your brief is saved on this device. Account sync is not active yet.');return saved;}
    try {
      const account=await cloud.save(saved,{overwrite});
      if(!account)return null;
      update(()=>localAccountDraft(account));setNotice('Saved to your account. You can restore this brief on another device.');return localAccountDraft(account);
    } catch(error){setNotice(error.message);return null;}
  }

  function goToStep(nextStep) {
    if(nextStep>activeStep){
      if(activeStep===0){
        const step1Errors={};
        if(!brief.start_date)step1Errors.start_date='Choose an arrival date.';
        if(!brief.end_date)step1Errors.end_date='Choose a departure date.';
        if(brief.start_date&&brief.end_date&&brief.end_date<brief.start_date){
          step1Errors.end_date='Departure date must be after arrival.';
        }
        if(!brief.travellers||brief.travellers<1){
          step1Errors.travellers='Include at least 1 traveller.';
        }
        if(Object.keys(step1Errors).length>0){
          setErrors(prev=>({...prev,...step1Errors}));
          setNotice('Please set your travel dates and party size to proceed.');
          requestAnimationFrame(()=>document.querySelector('[aria-invalid="true"]')?.focus());
          return;
        }
      }
    }
    setActiveStep(nextStep);
    window.scrollTo({top:0,behavior:'smooth'});
  }

  async function continuePlanning(event) {
    event.preventDefault();
    const invalid=validateBrief(brief);setErrors(invalid);
    if(Object.keys(invalid).length){
      setNotice('Check the highlighted travel details.');
      if(invalid.start_date||invalid.end_date||invalid.travellers||invalid.party_type){
        setActiveStep(0);
      }else if(invalid.origin||invalid.flight_requirement||invalid.stay_requirement){
        setActiveStep(1);
      }else{
        setActiveStep(2);
        if(invalid.traveller_support)setSupportActive(true);
      }
      requestAnimationFrame(()=>document.querySelector('[aria-invalid="true"],[data-support-error="true"]')?.focus());
      return;
    }
    setOpening(true);
    try {
      const prompt=planningPrompt({...draft,brief},resolved.places);
      const saved=await save();
      if(!saved){setOpening(false);return;}
      const context=cloud.available?{brief_id:saved.id,brief_revision:saved.cloudRevision}:{trip_brief:planningDraft(saved)};
      const id=createHandoff(user.id,prompt,{start_date:brief.start_date,end_date:brief.end_date,travellers:brief.travellers,places:draft.selections.length},context);
      router.push(`/chat?draft=${encodeURIComponent(id)}`);
    } catch(error) {setNotice(error.message);setOpening(false);}
  }

  const field = (name, label, type = 'text', extra = {}) => {
    if (type === 'date') {
      return (
        <div className="brief-field">
          <span><LocalizedText>{label}</LocalizedText></span>
          <MasarDatePicker
            name={name}
            label={label}
            value={brief[name] ?? ''}
            min={extra.min}
            max={extra.max}
            onChange={val => change(name, val)}
            error={Boolean(errors[name])}
            aria-label={label}
            id={name}
          />
          {errors[name] && <small className="brief-error" id={`error-${name}`}>{errors[name]}</small>}
        </div>
      );
    }
    return (
      <label className="brief-field">
        <span><LocalizedText>{label}</LocalizedText></span>
        <Localized element={"input"} attributes={["aria-label"]} name={name} aria-label={label} type={type} value={brief[name]??''} onChange={e=>change(name,type==='number'?e.target.valueAsNumber:e.target.value)} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name]?`error-${name}`:undefined} {...extra}/>
        {errors[name] && <small className="brief-error" id={`error-${name}`}>{errors[name]}</small>}
      </label>
    );
  };

  const select = (name, label, values) => (
    <div className="brief-field">
      <span><LocalizedText>{label}</LocalizedText></span>
      <MasarSelect
        name={name}
        label={label}
        value={brief[name] ?? ''}
        options={values}
        onChange={val => change(name, val)}
        error={Boolean(errors[name])}
        aria-label={label}
        id={name}
      />
      {errors[name] && <small className="brief-error">{errors[name]}</small>}
    </div>
  );
  const required=draft.selections.filter(item=>item.priority==='must_visit').length;

  return <JourneyShell showBrand={false} action={<Link href="/explore" className="journey-btn subtle small"><ArrowLeft size={14}/><LocalizedText message={" Keep exploring"} /></Link>}>
    <div className="journey-scroll brief-scroll brief-studio">
      <TripBriefHero brief={brief} places={draft.selections.length} activeStep={activeStep} onSelectStep={goToStep}/>
      <details className="brief-resume"><summary><LocalizedText message={"Pick up a saved planning request "} /><ArrowRight size={13}/></summary><RecentPlanningRuns/></details>
      <form id="trip-brief-form" onSubmit={continuePlanning} noValidate className="brief-layout">
        <div className="brief-fields">
          <AccountBriefStatus cloud={cloud} draft={draft} onRestore={restoreAccount} onReplace={()=>save(true)}/>
          {(storageError||draft.unreadable)&&<div className="journey-alert" role="alert"><LocalizedText>{storageError||'Your saved brief could not be read. Return to Explore to reset it.'}</LocalizedText></div>}

          {/* ── STEP 1: Set the scene ── */}
          {activeStep===0&&<section id="brief-dates" className="brief-section brief-slide-active" aria-label="Step 1: Set the scene">
            <div className="brief-section-heading">
              <span><CalendarDays size={20}/></span>
              <div>
                <h2><LocalizedText message={"Set the scene"} /> <span className="brief-heading-pill"><LocalizedText message={"Step 1 of 3"} /></span></h2>
                <p><LocalizedText message={"When are you arriving, and who is along for this journey?"} /></p>
              </div>
              <b>01</b>
            </div>
            <div className="brief-field-grid">
              {field('start_date','Arrival date','date',{min:planningToday()})}
              {field('end_date','Departure date','date',{min:brief.start_date>planningToday()?brief.start_date:planningToday()})}
              {field('travellers','Travellers','number',{min:1,max:50,step:1})}
              {select('party_type','Travelling as',optionsWith(['Solo','Couple','Family','Friends','Business'],brief.party_type).map(value=>[value,value]))}
            </div>
            <p className="brief-hint"><LocalizedText message={"MASAR will tailor itinerary pace and activity recommendations based on your season and party size."} /></p>
            <div className="brief-step-nav-footer">
              <div/>
              <button type="button" className="journey-btn gold" onClick={()=>goToStep(1)}>
                <LocalizedText message={"Next: Connect the essentials"} /> <ArrowRight size={16}/>
              </button>
            </div>
          </section>}

          {/* ── STEP 2: Connect the essentials ── */}
          {activeStep===1&&<section id="brief-essentials" className="brief-section brief-slide-active" aria-label="Step 2: Connect the essentials">
            <div className="brief-section-heading">
              <span><Plane size={20}/></span>
              <div>
                <h2><LocalizedText message={"The essentials, your way"} /> <span className="brief-heading-pill"><LocalizedText message={"Step 2 of 3"} /></span></h2>
                <p><LocalizedText message={"Tell us what’s arranged and what you’d like help finding."} /></p>
              </div>
              <b>02</b>
            </div>
            <div className="brief-field-grid">
              {field('origin','Starting city or airport','text',{placeholder:'e.g. London, DXB, or already in Dubai',maxLength:160})}
              {select('flight_requirement','Flights',REQUIREMENT_OPTIONS)}
              {select('stay_requirement','Accommodation',REQUIREMENT_OPTIONS)}
              {brief.flight_requirement==='needed'&&select('flight_selection','Who chooses your flight?',[['user','Show flights — I’ll choose'],['masar','Let MASAR choose for me']])}
              {brief.stay_requirement==='needed'&&select('stay_selection','Who chooses your room?',[['user','Show hotels and rooms — I’ll choose'],['masar','Let MASAR choose for me']])}
              {select('budget_tier','Budget style',optionsWith(['Budget','Standard','Premium','Luxury'],brief.budget_tier).map(value=>[value,value]))}
            </div>
            <p className="brief-hint"><Building2 size={14}/><LocalizedText message={" Recommendations first. Reservations are always a separate choice."} /></p>
            <div className="brief-step-nav-footer">
              <button type="button" className="journey-btn subtle" onClick={()=>goToStep(0)}>
                <ArrowLeft size={16}/> <LocalizedText message={"Back to dates"} />
              </button>
              <button type="button" className="journey-btn gold" onClick={()=>goToStep(2)}>
                <LocalizedText message={"Next: Personalize your journey"} /> <ArrowRight size={16}/>
              </button>
            </div>
          </section>}

          {/* ── STEP 3: Find your rhythm & preferences ── */}
          {activeStep===2&&<section id="brief-preferences" className="brief-section brief-slide-active" aria-label="Step 3: Find your rhythm">
            <div className="brief-section-heading">
              <span><SlidersHorizontal size={20}/></span>
              <div>
                <h2><LocalizedText message={"Find your rhythm"} /> <span className="brief-heading-pill"><LocalizedText message={"Step 3 of 3"} /></span></h2>
                <p><LocalizedText message={"Adjust your pace, interests, dining, and accessibility for this trip."} /></p>
              </div>
              <b>03</b>
            </div>
            <div className="brief-field-grid">
              {select('preferred_pace','Travel pace',optionsWith(['Relaxed','Balanced','Active'],brief.preferred_pace).map(value=>[value,value]))}
              <div className="brief-field">
                <span><LocalizedText message={"Interests"} /></span>
                <div className="brief-interest-chips">
                  {interests.map(interest=><button type="button" key={interest} aria-pressed={brief.interests.includes(interest)} onClick={()=>change('interests',brief.interests.includes(interest)?brief.interests.filter(item=>item!==interest):[...brief.interests,interest])}>{brief.interests.includes(interest)&&<Check size={11}/>} {interest}</button>)}
                </div>
              </div>
            </div>

            <div className="brief-preference-choices">
              {[
                ['dietary_restrictions','Dining preferences',['Halal','Vegetarian','Vegan','Gluten-Free']]
              ].map(([name,label,choices])=><fieldset key={name}><legend><LocalizedText>{label}</LocalizedText></legend><div className="brief-interest-chips">{[...new Set([...choices,...(brief[name]||[]).filter(item=>item!=='None')])].map(item=><button type="button" key={item} aria-pressed={brief[name].includes(item)} onClick={()=>change(name,brief[name].includes(item)?brief[name].filter(value=>value!==item):[...brief[name].filter(value=>value!=='None'),item])}>{brief[name].includes(item)&&<Check size={11}/>} {item}</button>)}</div></fieldset>)}
            </div>

            {/* ── Triggered Accessibility & Support Section ── */}
            {!supportActive ? (
              <div className="brief-support-trigger-card">
                <div className="brief-support-trigger-main">
                  <div className="brief-support-trigger-icon">
                    <Accessibility size={20}/>
                  </div>
                  <div className="brief-support-trigger-text">
                    <strong><LocalizedText message={"Accessibility & Travel Support"} /></strong>
                    <p><LocalizedText message={"Need step-free access, wheelchair rooms, walking limits, or rest breaks? Configure support for your party."} /></p>
                  </div>
                </div>
                <button
                  type="button"
                  className="journey-btn subtle small brief-support-toggle-btn"
                  onClick={()=>setSupportActive(true)}
                >
                  <Plus size={14}/> <LocalizedText message={"Add travel support"} />
                </button>
              </div>
            ) : (
              <div className="brief-support-active-card">
                <div className="brief-support-active-header">
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <div className="brief-support-trigger-icon active">
                      <Accessibility size={18}/>
                    </div>
                    <div>
                      <strong><LocalizedText message={"Travel Support Configured"} /></strong>
                      <small><LocalizedText message={"Per-traveller needs & physical limits"} /></small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="brief-support-hide-btn"
                    onClick={()=>{
                      if(!hasConfiguredSupport||window.confirm('Clear and hide travel support options?')){
                        change('traveller_support',[]);
                        setSupportActive(false);
                      }
                    }}
                  >
                    <X size={14}/> <LocalizedText message={"Hide support"} />
                  </button>
                </div>
                <TravellerSupportEditor
                  value={brief.traveller_support||[]}
                  travellers={brief.travellers}
                  onChange={value=>change('traveller_support',value)}
                  error={errors.traveller_support}
                />
              </div>
            )}

            <div className="brief-discovery-option">
              <div>
                <Sparkles size={20}/>
                <span>
                  <strong><LocalizedText message={"Make room for discovery"} /></strong>
                  <small><LocalizedText message={"One optional supported challenge per day, when it suits your route."} /></small>
                </span>
              </div>
              <label className="brief-switch">
                <Localized element={"input"} attributes={["aria-label"]} type="checkbox" checked={brief.challenges_enabled} onChange={e=>change('challenges_enabled',e.target.checked)} aria-label="Include optional discovery challenges"/>
                <span/>
              </label>
            </div>

            <label className="brief-field">
              <span><LocalizedText message={"Anything else that makes this trip yours?"} /></span>
              <textarea name="custom_notes" rows={3} maxLength={2000} placeholder="Shorter walks, a special occasion, a favourite cuisine…" value={brief.custom_notes} onChange={e=>change('custom_notes',e.target.value)}/>
            </label>
            <p className="brief-hint"><LocalizedText message={"These changes apply to this trip. Your saved travel profile stays as it is."} /></p>

            <div className="brief-step-nav-footer">
              <button type="button" className="journey-btn subtle" onClick={()=>goToStep(1)}>
                <ArrowLeft size={16}/> <LocalizedText message={"Back to essentials"} />
              </button>
              <button type="submit" form="trip-brief-form" className="journey-btn gold" disabled={!ready||opening||resolved.loading||cloud.loading||cloud.saving}>
                <LocalizedText>{opening?'Opening MASAR…':'Continue in Ask MASAR'}</LocalizedText> <ArrowRight size={16}/>
              </button>
            </div>
          </section>}
        </div>

        <aside className="brief-summary">
          <div className="brief-summary-heading">
            <MapPin size={20}/>
            <div>
              <span className="journey-eyebrow"><LocalizedText message={"THE PLACES YOU PICKED"} /></span>
              <h2><LocalizedText message={"Your journey, taking shape"} /></h2>
            </div>
          </div>
          <div className="brief-summary-counts">
            <span><b>{required}</b> <LocalizedText message={"Must visit"} /></span>
            <span><b>{draft.selections.length-required}</b> <LocalizedText message={"If time allows"} /></span>
          </div>
          <TripShortlist places={resolved.places} resolving={resolved.loading} error={resolved.error} onRetry={resolved.retry} compact selections={draft.selections} onRemove={id=>update(previous=>({...previous,savedAt:null,selections:previous.selections.filter(item=>item.id!==id)}))} onPriority={(id,priority)=>update(previous=>setPriority(previous,id,priority))}/>
          <Link href="/explore" className="journey-text-link">
            <LocalizedText>{draft.selections.length?'Add another place':'Let curiosity lead you'}</LocalizedText> <ArrowRight size={15}/>
          </Link>
          <div className="brief-summary-note">
            <Compass size={18}/>
            <p><LocalizedText>{draft.selections.length?'Your must-visits guide the plan. Flexible stops leave room for recommendations.':'Prefer a surprise? You can leave this empty and ask MASAR to suggest places around your interests.'}</LocalizedText></p>
          </div>
          <p className="brief-local-note">
            <LocalizedText>{cloud.available?'Save to your account to restore this brief on another device.':'Saved on this device, for your signed-in account.'}</LocalizedText>
          </p>
        </aside>
      </form>
    </div>

    <div className="brief-bottom-bar">
      <div role="status" aria-live="polite">
        {notice||(
          <>
            <span className="journey-gold-dot"/>
            <span className="brief-bottom-step-pill">
              <LocalizedText message={"Step ⟦0⟧ of 3"} values={[activeStep+1]} />
            </span>
            <LocalizedText>
              {draft.savedAt
                ?(draft.cloudRevision
                  ?'Brief saved · device edits stay local until you save again'
                  :'Brief saved on this device')
                :'Your changes save on this device as you edit'}
            </LocalizedText>
          </>
        )}
      </div>
      <div className="brief-bottom-actions">
        <button type="button" className="journey-btn subtle" onClick={()=>save()} disabled={!ready||opening||cloud.loading||cloud.saving}>
          <Save size={15}/> <LocalizedText>{cloud.saving?'Saving…':cloud.available?'Save to account':'Save brief'}</LocalizedText>
        </button>
        {activeStep<2 ? (
          <button type="button" className="journey-btn gold" onClick={()=>goToStep(activeStep+1)}>
            <LocalizedText>{activeStep===0?'Next: Travel essentials':'Next: Personalize'}</LocalizedText> <ArrowRight size={16}/>
          </button>
        ) : (
          <button type="submit" form="trip-brief-form" className="journey-btn gold" disabled={!ready||opening||resolved.loading||cloud.loading||cloud.saving}>
            <LocalizedText>{opening?'Opening MASAR…':'Continue in Ask MASAR'}</LocalizedText> <ArrowRight size={16}/>
          </button>
        )}
      </div>
    </div>
  </JourneyShell>;
}

export default function PlanPage(){return <ProtectedRoute><BriefContent/></ProtectedRoute>;}
