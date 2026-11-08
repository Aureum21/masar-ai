'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowRight,ArrowLeft,RefreshCw,Square,Radio,ShieldCheck,Compass,Navigation,Hotel,PlaneTakeoff} from 'lucide-react';
import MasarMark from '@/components/ui/MasarMark';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import JourneyShell from '@/components/layout/JourneyShell';
import ContextPanel from '@/components/layout/ContextPanel';
import LuxuryOrchestrationLoader from '@/components/chat/LuxuryOrchestrationLoader';
import {parseWorkerResult} from '@/utils/parseWorkerResult';
import {usePlanningRun} from '@/hooks/usePlanningRun';
import {RUN_STATES,resultPath,isActiveRun,researchStatus} from '@/lib/planningRuns';

import './planning-discoveries.css';

const WORKER_ICONS={event_agent:Compass,logistics_agent:Navigation,accommodation_agent:Hotel,flight_agent:PlaneTakeoff};
const WORKERS={event_agent:'Places & experiences',logistics_agent:'Routes & travel time',accommodation_agent:'Places to stay',flight_agent:'Flight options'};
const resultKey=worker=>worker==='accommodation_agent'?'accommodation_result':worker.replace('_agent','_result');

function Progress({id}) {
  const {run,error,loading,action,change,choose,changeHotel,refresh}=usePlanningRun(id);
  const router=useRouter();
  const state=RUN_STATES[run?.status];const result=resultPath(run);
  const active=isActiveRun(run);const researching=run?.status==='running';
  const progress=run?.progress||[];
  const trail=progress.filter((item,index)=>item!==progress[index-1]).slice(-4);
  const latest=['awaiting_choice','failed','interrupted','cancelled'].includes(run?.status)?run.message:progress.at(-1)||run?.message||'Retrieving your saved planning request.';
  const results=run?.research_results||[];
  const count=results.reduce((sum,item)=>sum+(parseWorkerResult(item.type,item.content)?.items?.length||0),0);
  const hasCards=count>0;
  const flow=run?.choice_flow;
  const waiting=run?.status==='awaiting_choice';
  const stage=flow?.stage;
  const choices={stage,active:waiting,busy:action,onChoose:optionId=>choose(stage,optionId),onBrowse:hotel=>choose('hotels',hotel.choice_id||hotel.hotelId)};
  const stageTitle={flights:'First, find your flight.',hotels:'Find a place that feels right.',rooms:'Choose your room.',research:'Now, shape the journey.'};
  function ask(prompt){router.push(`/chat?prompt=${encodeURIComponent(prompt)}`);}
  return <Localized element={JourneyShell} attributes={["title"]} headerVariant="planning" title="Your journey, taking shape" action={<Link href="/plan" className="journey-btn subtle small"><ArrowLeft size={14}/><LocalizedText message={" Trip brief"} /></Link>}>
    <div className="planning-live-layout">
      <Localized element={"section"} attributes={["aria-label"]} className="planning-live-story" aria-label="Planning activity">
        <div className={`planning-concierge ${active?'is-active':''}`}><span className="planning-avatar"><MasarMark/></span><div><span className="journey-eyebrow"><LocalizedText message={"MASAR / PERSONAL CONCIERGE"} /></span><small><LocalizedText>{state?.label||'Opening saved progress'}</LocalizedText></small></div>{active&&<span className="planning-live-dot"/>}</div>
        <h1><LocalizedText>{(waiting||researching)&&flow?stageTitle[stage]:state?.title||'Opening your journey.'}</LocalizedText></h1>
        <p className="planning-live-intro"><LocalizedText>{run?.message||'Your saved choices are the starting point.'}</LocalizedText></p>
        {loading&&<p role="status"><LocalizedText message={"Loading your saved request…"} /></p>}
        {error&&<div role="alert" className="planning-error"><p><LocalizedText>{error}</LocalizedText></p><button className="journey-btn subtle small" onClick={refresh}><RefreshCw size={14}/><LocalizedText message={" Check again"} /></button></div>}
        {run&&<>
          <div className={`planning-now ${active?'is-active':''}`} role="status" aria-live="polite"><Radio size={17}/><div><span><LocalizedText>{researching?'WORKING ON YOUR JOURNEY':active?'REQUEST SAVED':'SAVED PROGRESS'}</LocalizedText></span><p key={latest} className="planning-status-reveal">{latest.replace(/^(Orchestrator|Event Agent|Accommodation Agent|Logistics Agent|Trip Planner|Flight Agent):\s*/i,'')}</p></div>{active&&<b className="planning-thinking" aria-hidden="true"><i/><i/><i/></b>}</div>
          <div className="planning-live-trail"><span className="journey-eyebrow"><LocalizedText message={"THE JOURNEY SO FAR"} /></span><ol>{trail.map((item,index)=><Localized element={"li"} attributes={["title"]} key={`${index}:${item}`} title={item}>{item.replace(/^(Orchestrator|Event Agent|Accommodation Agent|Logistics Agent|Trip Planner|Flight Agent):\s*/i,'')}</Localized>)}</ol></div>
          {flow&&<details className="planning-choices-summary"><summary><LocalizedText message={"YOUR TRAVEL CHOICES"} /></summary>{flow.selected?.flight&&<p><strong>{flow.selected.flight.airline}</strong><small><LocalizedText preserveValues={[true,true]} message={"⟦0⟧  ⟦1⟧ · flight quote"} values={[flow.selected.flight.total_amount,flow.selected.flight.currency]} /></small></p>}{flow.selected?.hotel&&<p><strong>{flow.selected.hotel.name}</strong><small><LocalizedText>{flow.selected.room?`${flow.selected.room.name} · ${flow.selected.room.price} ${flow.selected.room.currency} for the stay`:'Room selection comes next'}</LocalizedText></small></p>}<small><LocalizedText message={"Selection only. Nothing is booked or paid."} /></small>{stage==='rooms'&&(waiting||run.status==='failed')&&<button type="button" disabled={action} className="journey-btn subtle small" onClick={changeHotel}><LocalizedText message={"Choose another hotel"} /></button>}</details>}
          <div className="planning-actions">{result&&<Link href={result} className="journey-btn gold"><LocalizedText message={"Review my trip "} /><ArrowRight size={16}/></Link>}{run.can_retry&&<button disabled={action} onClick={()=>change('retry')} className="journey-btn gold"><RefreshCw size={15}/><LocalizedText>{action?'Updating…':'Retry saved request'}</LocalizedText></button>}{run.can_cancel&&<button disabled={action} onClick={()=>change('cancel')} className="journey-btn subtle"><Square size={13}/><LocalizedText>{action?'Updating…':'Cancel planning'}</LocalizedText></button>}</div>
          <div className="planning-live-safety"><ShieldCheck size={15}/><p><LocalizedText message={"Saved to your account. Leave and return whenever you like."} /><br/><LocalizedText message={"Recommendations first. Reservations are a separate choice."} /></p></div>
          <Link href="/plan" className="journey-text-link"><LocalizedText message={"Review my brief "} /><ArrowRight size={14}/></Link>
        </>}
      </Localized>
      <Localized element={"section"} attributes={["aria-label"]} className={`planning-generative-pane planning-discoveries-studio ${active?'is-live':''}`} aria-label="Live trip discoveries" aria-busy={researching&&!hasCards}>
        <header className="planning-discoveries-header"><div><span className="journey-eyebrow"><span className={`planning-discovery-signal ${researching?'is-researching':''}`} aria-hidden="true"/><LocalizedText>{researching?'LIVE DISCOVERIES':'YOUR DISCOVERIES'}</LocalizedText></span><h2><LocalizedText>{waiting?{flights:'Find your way here.',hotels:'A stay that feels like you.',rooms:'Your room. Your retreat.'}[stage]||'Your journey, unfolding.':hasCards?'Your journey, unfolding.':'Good journeys start with discovery.'}</LocalizedText></h2></div><span className="planning-results-badge"><LocalizedText>{hasCards?`${count} discoveries`:researching?'Research in motion':active?'Getting started':'Saved research'}</LocalizedText></span></header>
        {run&&<Localized element={"div"} attributes={["aria-label"]} className="planning-worker-list planning-research-strip" aria-label="Research status">{(run.enabled_workers||[]).map(worker=>{
            const received=(run.workers||[]).includes(resultKey(worker));
            const summary=researchStatus(results.find(item=>item.type===resultKey(worker)));
            const finished=received&&summary.hasOptions;
            const working=researching&&(!flow||(stage==='flights'?worker==='flight_agent':['hotels','rooms'].includes(stage)?worker==='accommodation_agent':['event_agent','logistics_agent'].includes(worker)));
            const label=finished?'Ready':working?'Researching':received?'No options':active||waiting?'Up next':'Not returned';
            const Icon=WORKER_ICONS[worker]||Compass;
            return <Localized element={"div"} attributes={["title"]} key={worker} className={finished?'has-results':working?'is-working':''} title={`${WORKERS[worker]||worker}: ${label}`}><Icon size={15} aria-hidden="true"/><div><strong>{{event_agent:'Experiences',logistics_agent:'Routes',accommodation_agent:'Stays',flight_agent:'Flights'}[worker]||worker}</strong><small><i aria-hidden="true"/><LocalizedText>{label}</LocalizedText></small></div></Localized>;
          })}</Localized>}
        {waiting&&<div className="planning-choice-prompt" role="status"><div><span className="planning-choice-eyebrow"><LocalizedText message={"YOUR NEXT MOVE"} /></span><strong><LocalizedText>{stage==='flights'?'Choose your flight':stage==='hotels'?'Find a hotel. Explore its rooms.':'Choose the room for your stay.'}</LocalizedText></strong><p><LocalizedText message={"⟦0⟧ Your progress is saved."} values={[stage==='hotels'?'Browse rooms to choose your stay.':'Select an option below to continue your journey.']} /></p></div><div className="planning-choice-controls"><button type="button" className="journey-btn gold small" disabled={action} onClick={()=>choose(stage,null,true)}><LocalizedText>{action?'Saving choice…':'Let MASAR choose'}</LocalizedText><ArrowRight size={14}/></button><details className="planning-choice-policy"><summary><LocalizedText message={"How MASAR chooses"} /></summary><p><LocalizedText message={"MASAR chooses the lowest returned AED quote; hotel suggestions also follow your brief. Quotes may change before booking. Nothing is booked at this step."} /></p></details></div></div>}
        <div className="planning-generative-content">
          {hasCards?<ContextPanel key={id} planningMode planningChoices={choices} workerResults={results} isStreaming={researching} statusUpdates={progress} onSelectPrompt={ask}/>:
          active?<div className={`planning-restored-loader ${researching?'':'is-queued'}`}><LuxuryOrchestrationLoader animationOnly enabledWorkers={run.enabled_workers||[]} statusUpdates={researching?progress:[run.message]}/></div>:
          <div className="planning-no-results"><span className="planning-saved-mark"><MasarMark/></span><h3><LocalizedText>{result?'Your itinerary is saved.':'Your brief is safe.'}</LocalizedText></h3><p><LocalizedText>{result?'Open your trip to explore the saved day-by-day plan.':run?.status==='cancelled'?'Start again from your brief whenever you are ready.':'Research cards will appear here as agents return their findings.'}</LocalizedText></p>{result&&<Link href={result} className="journey-btn gold"><LocalizedText message={"Open my trip "} /><ArrowRight size={15}/></Link>}</div>}
        </div>
        {hasCards&&<footer><LocalizedText preserveValues={[true]} message={"⟦0⟧These discoveries are research suggestions. Availability and prices need confirmation."} values={[results.filter(item=>item.content?.preview_limited).length>0?'Showing a preview of returned options. ':'']} /></footer>}
      </Localized>
    </div>
  </Localized>;
}
export default function PlanningRunView({id}) {return <ProtectedRoute><Progress id={id}/></ProtectedRoute>;}
