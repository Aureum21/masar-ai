'use client';
import {useI18n} from '@/i18n/LocaleProvider';

import {Localized,LocalizedText} from '@/i18n/Localized';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Camera, Check, ChevronDown, ChevronUp, Clock, Info, LockKeyhole, MapPin, PenLine, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { notifyPassportChanged, passportRequest, usePassportResource } from '@/app/profile/_lib/passportApi';
import StampArt from '@/app/profile/_components/StampArt';
import Celebration from '@/app/profile/_components/Celebration';
import { PrivateEvidence } from '@/app/profile/_components/PassportUI';
import { DateEditor, dateLabel, ErrorState, LoadingState, TripShell, tripDates } from './TripUI';
import styles from '../trips.module.css';
import BoxingProofFields,{addBoxingProof,boxingProofValid} from '@/components/trips/workspace/BoxingProofFields';
import ChallengeEvidenceModal from '@/components/trips/workspace/ChallengeEvidenceModal';
import useSubmissionCheck from '@/components/trips/workspace/useSubmissionCheck';

const interestsList = ['heritage', 'discovery', 'creative', 'adventure', 'nature', 'connection'];

export default function Journey({ tripId }) {
 const {locale:uiLocale}=useI18n();

  const { token } = useAuth();
  const resource = usePassportResource(`/trips/${tripId}`);
  const [interests, setInterests] = useState(['heritage', 'discovery']);
  const [pace, setPace] = useState('balanced');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [celebration, setCelebration] = useState(null);
  async function activate(pause = false) {
    setBusy(true); setError('');
    try { await passportRequest(token, `/trips/${tripId}/${pause ? 'pause' : 'activate'}`, { method: 'POST', ...(!pause ? { body: { interests, pace } } : {}) }); notifyPassportChanged(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  function awarded(result) {
    if (result.awards?.length) { const stamp = result.awards[0]; setCelebration({ kind: 'stamp', stamp, milestones: result.milestones || [], title: `${stamp.title}, collected.`, subtitle: stamp.is_demo ? 'A demo memory has joined your passport. Continue to discover what your choice unlocks.' : 'Your approved experience is now a permanent part of your passport.' }); }
    notifyPassportChanged();
  }
  if (!resource.data) return <TripShell back="/trips">{resource.error ? <ErrorState error={resource.error} retry={resource.refresh} /> : <LoadingState />}</TripShell>;
  const { trip, days, challenges, events } = resource.data;
  const active = challenges.filter(c => c.state !== 'retired');
  const complete = active.length > 0 && active.every(c => c.state === 'completed');
  return <TripShell back="/trips"><header className={styles.pageHeading}><span className={`${styles.chip} ${trip.is_demo ? styles.demoChip : ''}`}><LocalizedText>{trip.is_demo ? 'Fictional pilot · demo progression' : 'Your personal journey'}</LocalizedText></span><h1>{trip.title}</h1><p><MapPin size={14} /> {trip.destination} · {tripDates(trip, uiLocale)}</p></header>
    {trip.is_demo && <div className={styles.feedback}><strong><LocalizedText message={"Explore the idea in a fictional setting."} /></strong><p><LocalizedText message={"This route uses sample learning cards and simulated approvals. Demo XP, stamps and offers do not prove real attendance or unlock real discounts."} /></p></div>}
    <DateEditor key={`${trip.start_date}-${trip.end_date}`} trip={trip} onSaved={resource.refresh} />
    {error && <ErrorState error={error} />}
    <div className={styles.detailLayout}><div>
      {!trip.challenges_enabled && <section className={styles.panel}><p className={styles.eyebrow}><LocalizedText message={"A LITTLE CURIOSITY GOES A LONG WAY"} /></p><h2><LocalizedText message={"Add an adventure to your itinerary."} /></h2><p><LocalizedText message={"Choose what interests you. We’ll suggest small challenges at stops you already planned. You can skip a task or pause everything at any time."} /></p><fieldset className={styles.fieldset}><legend><LocalizedText message={"Your interests"} /></legend><div className={styles.choices}>{interestsList.map(interest => <label className={styles.choice} key={interest}><input type="checkbox" checked={interests.includes(interest)} onChange={() => setInterests(previous => previous.includes(interest) ? previous.filter(i => i !== interest) : [...previous, interest])} />{interest}</label>)}</div></fieldset><fieldset className={styles.fieldset}><legend><LocalizedText message={"How much extra exploration?"} /></legend><div className={styles.choices}>{[['light', 'A little · one challenge per day'], ['balanced', 'A little more · up to two per day']].map(([value, label]) => <label key={value} className={styles.choice}><input type="radio" name="pace" checked={pace === value} onChange={() => setPace(value)} /><LocalizedText>{label}</LocalizedText></label>)}</div></fieldset><button className={styles.primary} disabled={busy} onClick={() => activate(false)}><LocalizedText>{busy ? 'Preparing…' : active.length ? 'Resume my adventures' : 'Add optional adventures'}</LocalizedText><Sparkles size={15} /></button></section>}
      {days.length ? days.map(day => <section key={day.day_number} className={styles.day}><div className={styles.dayHeader}><span className={styles.dayNumber}>{String(day.day_number).padStart(2, '0')}</span><div><h2><LocalizedText>{day.theme || `Day ${day.day_number}`}</LocalizedText></h2><p><LocalizedText>{day.date ? dateLabel(day.date, uiLocale) : 'Dates are open'}</LocalizedText></p></div></div><div className={styles.activityList}>{day.activities.map(activity => <article className={styles.activity} key={activity.id}><div className={styles.meta}><Clock size={11} /><LocalizedText>{activity.time || 'At your own pace'}</LocalizedText><span>·</span>{activity.location}</div><h3>{activity.title}</h3><p><LocalizedText>{activity.description}</LocalizedText></p>{trip.challenges_enabled && challenges.filter(c => c.activity_id === activity.id && c.state !== 'retired').map(challenge => <Challenge key={challenge.id} tripId={tripId} challenge={challenge} onChanged={notifyPassportChanged} onAward={awarded} />)}</article>)}</div></section>) : <div className={styles.empty}><h2><LocalizedText message={"This itinerary has no detailed stops yet."} /></h2><p><LocalizedText message={"Add activities with your travel concierge before choosing challenges."} /></p><Link href="/chat" className={styles.secondary}><LocalizedText message={"Continue planning"} /></Link></div>}
      {!!events.length && <section className={styles.panel}><h2><LocalizedText message={"Memories along this journey"} /></h2><ol className={styles.path}>{events.map(event => <li key={event.id}><span className={styles.pathIcon}><Check size={12} /></span><div>{event.title}<small><LocalizedText>{event.description}</LocalizedText></small></div></li>)}</ol></section>}
    </div><aside className={styles.sticky}><section className={styles.panel}><p className={styles.eyebrow}><LocalizedText>{complete ? 'A CHAPTER, COLLECTED' : 'YOUR JOURNEY SEAL'}</LocalizedText></p><div style={{ display: 'flex', justifyContent: 'center' }}><StampArt stamp={{ category: complete ? 'creative' : 'discovery', title: 'Journey seal', design: 'motif', is_demo: trip.is_demo }} locked={!complete} size={150} /></div><p><LocalizedText>{complete ? 'These memories now form the seal for this journey. Open your passport to revisit each one.' : 'Your seal takes shape as you collect the experiences on this journey.'}</LocalizedText></p><div className={styles.stats}><div><strong>{trip.progress.completed}/{trip.progress.total}</strong><span><LocalizedText message={"challenges completed"} /></span></div><div><strong>{trip.stamp_count}</strong><span><LocalizedText message={"stamps kept"} /></span></div></div><Link className={styles.quiet} href="/rewards"><LocalizedText message={"Open my passport "} /><ArrowUpRight size={15} /></Link></section>
      {active.length > 0 && <section className={styles.panel}><h2><LocalizedText message={"Your discovery path"} /></h2><ol className={styles.path}>{active.map(challenge => <li key={challenge.id}><span className={styles.pathIcon}>{challenge.state === 'completed' ? <Check size={12} /> : challenge.state === 'locked' ? <LockKeyhole size={11} /> : <Sparkles size={12} />}</span><a href={`#challenge-${challenge.id}`}><LocalizedText>{challenge.title}</LocalizedText><small><LocalizedText message={"⟦0⟧ · ⟦1⟧  ⟦2⟧XP"} values={[challenge.state,challenge.xp,challenge.is_demo ? 'demo ' : '']} /></small></a></li>)}</ol></section>}
      <section className={styles.panel}><h2><LocalizedText message={"Always your choice."} /></h2><p><LocalizedText message={"Your itinerary and bookings work with or without challenges. Pausing keeps the stamps and progress you already earned."} /></p>{trip.challenges_enabled && <button className={styles.secondary} disabled={busy} onClick={() => activate(true)}><LocalizedText message={"Pause challenges"} /></button>}<Link className={styles.quiet} href="/trips/manage"><LocalizedText message={"Itineraries & receipts "} /><ArrowUpRight size={14} /></Link></section>
    </aside></div>{celebration && <Celebration {...celebration} onClose={() => setCelebration(null)} />}
  </TripShell>;
}

function Challenge(props) {
  const challenge=props.challenge;
  if(challenge.verification_mode==='automatic_scene'||challenge.required_photos===3)return <SharedPhotoTask {...props}/>;
  return <LegacyChallenge {...props}/>;
}

function SharedPhotoTask({tripId,challenge,onChanged}) {
  const [open,setOpen]=useState(false);
  const task={name:challenge.title,landmark:challenge.landmark,activityId:challenge.source_activity_id,
    type:challenge.required_photos===3?'heritage-detective':challenge.challenge_key,
    sunsetWindow:challenge.sunset_window,animationAvailable:challenge.animation_available};
  return <section id={`challenge-${challenge.id}`} className={styles.challenge}>
    <div className={styles.challengeHeader}><StampArt stamp={challenge.stamp} size={64}/><div><h4><LocalizedText>{challenge.title}</LocalizedText></h4><p><LocalizedText message={"⟦0⟧ · +⟦1⟧ XP"} values={[challenge.state,challenge.xp]} /></p></div></div>
    <div className={styles.challengeBody}><p>{challenge.instructions}</p>{challenge.latest_submission&&<div className={styles.feedback}><strong>{challenge.latest_submission.status}</strong><p>{challenge.latest_submission.feedback}</p></div>}
    <button className={styles.primary} disabled={challenge.state==='locked'} onClick={()=>setOpen(true)}><LocalizedText>{challenge.latest_submission?'View evidence & feedback':'Submit challenge evidence'}</LocalizedText><Camera size={15}/></button></div>
    <ChallengeEvidenceModal isOpen={open} challenge={task} tripId={tripId} onClose={()=>setOpen(false)} onSubmitted={onChanged}/>
  </section>;
}

function LegacyChallenge({ challenge, onChanged, onAward }) {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState(challenge.latest_submission?.text || '');
  const [choice, setChoice] = useState(challenge.choice_options?.[0]?.id || '');
  const [method, setMethod] = useState(challenge.evidence_methods[0]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [showBrief, setShowBrief] = useState(false);
  const [proof,setProof]=useState({score:'',machine:false,own:false});
  const [attempt,setAttempt]=useState(0);
  const automatic=challenge.verification_mode==='automatic_boxing';
  const checking=challenge.latest_submission?.verification?.mode==='automatic_boxing';
  useSubmissionCheck(token,challenge.latest_submission,response=>{setAttempt(value=>value+1);onAward(response);});
  const replay = useRef({ signature: '', key: '' });
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  async function action(value) {
    setBusy(true); setError('');
    try { await passportRequest(token, `/challenges/${challenge.id}/action`, { method: 'POST', body: { action: value } }); onChanged(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const signature = JSON.stringify([method, text, choice, file?.name, file?.size, file?.lastModified,proof,attempt]);
    if (signature !== replay.current.signature) replay.current = { signature, key: crypto.randomUUID() };
    const form = new FormData();
    form.set('evidence_type', method); form.set('text', text); form.set('choice', choice); form.set('idempotency_key', replay.current.key);
    if (file && method === 'photo') form.set('file', file);
    if(automatic)addBoxingProof(form,proof);
    try { const result = await passportRequest(token, `/challenges/${challenge.id}/submissions`, { method: 'POST', body: form }); onAward(result); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function simulate() {
    setBusy(true); setError('');
    try { onAward(await passportRequest(token, `/submissions/${challenge.latest_submission.id}/demo-approve`, { method: 'POST' })); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const locked = challenge.state === 'locked';
  const completed = challenge.state === 'completed';
  return <section id={`challenge-${challenge.id}`} className={`${styles.challenge} ${locked ? styles.challengeLocked : ''} ${completed ? styles.challengeCompleted : ''}`}><div className={styles.challengeHeader}><StampArt stamp={{ ...challenge.stamp, is_demo: challenge.is_demo }} size={64} locked={locked} /><div><div className={styles.challengeStatus}>{completed ? <Check size={12} /> : locked ? <LockKeyhole size={12} /> : <Sparkles size={12} />}<LocalizedText>{completed ? 'Quest Completed' : locked ? 'Locked' : challenge.state === 'accepted' ? 'Active Quest' : challenge.state === 'pending' ? (checking?'Checking evidence':'Awaiting review') : 'Available'}</LocalizedText> · +{challenge.xp} <LocalizedText>{challenge.is_demo ? 'demo ' : ''}</LocalizedText><LocalizedText message={"XP"} /></div><h4><LocalizedText>{challenge.title}</LocalizedText></h4><p><LocalizedText>{challenge.description}</LocalizedText></p></div></div><div className={styles.challengeBody}>
    {locked ? <p>{challenge.unlock_message}</p> : <>{challenge.latest_submission && <div className={styles.feedback}><strong><LocalizedText>{challenge.latest_submission.status === 'rejected' ? (checking?'Please try another photograph.':'A little more detail, please.') : challenge.latest_submission.status === 'pending' ? (checking?'Checking your machine and score…':'Your evidence is awaiting review.') : 'A memory worth keeping.'}</LocalizedText></strong><p>{challenge.latest_submission.feedback}</p></div>}
    {challenge.latest_submission?.status === 'pending' && challenge.latest_submission.evidence_type === 'photo' && <PrivateEvidence key={challenge.latest_submission.id} submissionId={challenge.latest_submission.id} canDelete onRemoved={onChanged} />}
    {completed ? <Link className={styles.quiet} href="/rewards"><LocalizedText message={"See your earned stamp "} /><ArrowUpRight size={13} /></Link> : challenge.state === 'pending' ? challenge.is_demo ? <button className={styles.secondary} disabled={busy} onClick={simulate}><LocalizedText message={"Simulate approval · demo only"} /></button> : <p><LocalizedText>{checking?'The automatic check is running. You can leave and return; points appear after approval.':'No points have been awarded yet. An authorized reviewer will check your evidence.'}</LocalizedText></p> : challenge.state === 'accepted' ? <form className={styles.evidenceForm} onSubmit={submit}>
      {/* Progressive Lore Toggle */}
      {(challenge.source_text || challenge.instructions) && <div className={styles.briefHeader}>
        <button type="button" className={styles.briefToggle} onClick={() => setShowBrief(!showBrief)}>
          <Info size={12} />
          <span><LocalizedText>{showBrief ? 'Hide Field Lore' : 'Field Lore & Background'}</LocalizedText></span>
          {showBrief ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>}
      {showBrief && <div className={styles.briefContent}>
        {challenge.instructions && <p className={styles.briefInstructions}>{challenge.instructions}</p>}
        {challenge.source_text && <div className={styles.source}><h5><LocalizedText message={"Field Lore Card"} /></h5><p>{challenge.source_text}</p></div>}
      </div>}

      {/* Choice Branch Pills */}
      {!!challenge.choice_options?.length && <div className={styles.choiceSection}>
        <span className={styles.choiceSectionTitle}><LocalizedText message={"Select your signature note or path:"} /></span>
        <div className={styles.questChoices}>
          {challenge.choice_options.map(option => <button type="button" key={option.id} className={`${styles.questChoiceBtn} ${choice === option.id ? styles.questChoiceBtnActive : ''}`} onClick={() => setChoice(option.id)}><span className={styles.choiceRadioDot} /><span><LocalizedText>{option.label}</LocalizedText></span></button>)}
        </div>
      </div>}

      {/* Method Switcher */}
      {challenge.evidence_methods.length > 1 && <div className={styles.methodTabs}>
        {challenge.evidence_methods.map(type => <button type="button" key={type} className={`${styles.methodTab} ${method === type ? styles.methodTabActive : ''}`} onClick={() => setMethod(type)}>{type === 'reflection' ? <PenLine size={12} /> : <Camera size={12} />}<span><LocalizedText>{type === 'reflection' ? 'Quick Note' : 'Photo Snapshot'}</LocalizedText></span></button>)}
      </div>}

      {/* Note Textarea */}
      {method === 'reflection' && <div className={styles.inputGroup}>
        <textarea required rows={2} maxLength={5000} minLength={10} value={text} onChange={event => setText(event.target.value)} placeholder={challenge.reflection_prompt || 'Share a quick thought, favorite note, or detail...'} className={styles.compactTextarea} />
      </div>}

      {/* Photo Upload */}
      {method === 'photo' && <label className={styles.upload}>
        <span><LocalizedText message={"📸 Take photo with camera or choose from library (up to 5 MB)"} /></span>
        <input type="file" required accept="image/*" onChange={event => { const next = event.target.files?.[0]; if (next?.size > 5 * 1024 * 1024) { setError('Choose an image smaller than 5 MB.'); event.target.value = ''; setFile(null); setPreview(''); } else { setError(''); setFile(next || null); setPreview(next ? URL.createObjectURL(next) : ''); } }} />
      </label>}
      {method === 'photo' && preview && <Localized element={"img"} attributes={["alt"]} src={preview} className={styles.preview} alt="Your evidence preview" />}

      {automatic&&<><BoxingProofFields value={proof} onChange={setProof} disabled={busy}/><label className={styles.inputGroup}><LocalizedText message={"Venue and attempt"} /><textarea required minLength={12} maxLength={5000} value={text} onChange={e=>setText(e.target.value)} placeholder="Where did you play and what was your result?"/></label></>}
      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.primary} disabled={busy || (automatic&&!boxingProofValid(proof)) || (!choice && !!challenge.choice_options?.length)}>
          <LocalizedText>{busy ? 'Submitting…' : automatic?`Check attempt · +${challenge.xp} XP if approved` : `Claim Stamp · +${challenge.xp} XP`}</LocalizedText>
        </button>
        <button type="button" className={styles.quiet} disabled={busy} onClick={() => action('skip')}><LocalizedText message={"Skip for now"} /></button>
      </div>
    </form> : <div className={styles.actions}>
      <button className={styles.primary} disabled={busy} onClick={() => action(challenge.state === 'skipped' ? 'resume' : 'accept')}>
        <LocalizedText>{challenge.state === 'skipped' ? 'Resume Quest' : 'Accept Quest'}</LocalizedText>
      </button>
      {challenge.state !== 'skipped' && <button className={styles.quiet} disabled={busy} onClick={() => action('skip')}><LocalizedText message={"Skip for now"} /></button>}
    </div>}</>}
    {error && <p className={styles.errorText} role="alert"><LocalizedText>{error}</LocalizedText></p>}
  </div></section>;
}
