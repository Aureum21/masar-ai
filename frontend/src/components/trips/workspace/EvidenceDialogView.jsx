'use client';
import {useI18n} from '@/i18n/LocaleProvider';
import {formattingLocale} from '@/i18n/messages.mjs';

import {Localized,LocalizedText} from '@/i18n/Localized';

import Image from 'next/image';
import Link from 'next/link';
import {ArrowRight,Camera,Check,CheckCheck,ChevronRight,Clock3,ImagePlus,Info,LoaderCircle,LockKeyhole,ScanLine,ShieldCheck,Sparkles,Trophy,UploadCloud,X} from 'lucide-react';
import SceneProofFields,{sceneProofValid} from './SceneProofFields';
import BoxingProofFields,{boxingProofValid} from './BoxingProofFields';
import './challenge-evidence.css';
import './evidence-status.css';

function PhotoCard({detail,index,file,preview,busy,onPhoto}){
  return <label className={`evidence-upload ${file?'has-photo':''}`} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();if(!busy)onPhoto(index,event.dataTransfer.files?.[0]);}}>
    <Localized element={"input"} attributes={["aria-label"]} type="file" aria-label={`Photograph ${index+1}: ${detail}`} name={`evidence-photo-${index}`} accept="image/jpeg,image/png" capture="environment" required={!file} disabled={busy} onChange={event=>{onPhoto(index,event.target.files?.[0]);event.target.value='';}}/>
    {preview&&file?<><Localized element={Image} attributes={["alt"]} src={preview} alt={`Your photograph: ${detail}`} width={640} height={440} unoptimized className="evidence-upload-preview"/><span className="evidence-photo-scrim"/><span className="evidence-photo-ready"><Check size={12}/><LocalizedText message={" Photo ready"} /></span><span className="evidence-replace"><Camera size={14}/><LocalizedText message={" Replace photo"} /></span></>:<div className="evidence-upload-empty"><span className="evidence-upload-icon"><ImagePlus size={27} strokeWidth={1.4}/></span><strong><LocalizedText>{index===0?'Add your evidence':'Add discovery photo'}</LocalizedText></strong><span><LocalizedText message={"Take a photo or choose from your gallery"} /></span><span className="evidence-file-types"><LocalizedText message={"JPG or PNG · up to 5 MB"} /></span></div>}
    <span className="evidence-upload-caption"><span className="evidence-number">{String(index+1).padStart(2,'0')}</span><span><strong>{detail}</strong>{file&&<small>{file.name}</small>}</span>{file?<CheckCheck size={18}/>:<UploadCloud size={18}/>}</span>
  </label>;
}

function StatusCard({result,xp,connectionError}){
  const {locale:uiLocale}=useI18n();

  const equivalent=result.verification?.mode==='manual_equivalent';
  const demo=result.verification?.evaluation_profile==='demo';
  const demoRewards=result.verification?.reward_is_demo??demo;
  if(result.status==='rejected')return <div className="evidence-decision-card" role="status">
    <span className="evidence-decision-icon"><Info size={28}/></span>
    <span className="evidence-status-eyebrow"><LocalizedText message={"CHECK COMPLETE · ⟦0⟧ · ACTION NEEDED"} values={[demo?'LIGHT DEMO':'STRICT / STANDARD']} /></span>
    <h3><LocalizedText message={"Your photo needs another look."} /></h3>
    <div className="evidence-decision-feedback"><strong><LocalizedText message={"Why this attempt wasn’t approved"} /></strong><p><LocalizedText>{result.feedback||'This attempt did not meet the evidence requirements. Please submit a new photograph.'}</LocalizedText></p></div>
    <dl className="evidence-decision-facts"><div><dt><LocalizedText message={"Submission reference"} /></dt><dd>{result.id?.slice(0,8)||'—'}</dd></div><div><dt><LocalizedText message={"Submitted"} /></dt><dd>{result.created_at?new Date(result.created_at).toLocaleString(formattingLocale(uiLocale)):'—'}</dd></div>{result.verification?.declared_score!=null&&<div><dt><LocalizedText message={"Score you submitted"} /></dt><dd>{result.verification.declared_score}</dd></div>}<div><dt><LocalizedText message={"Reward for this attempt"} /></dt><dd><LocalizedText message={"No XP awarded"} /></dd></div></dl>
    {result.text&&<div className="evidence-saved-note"><strong><LocalizedText message={"Your submitted note"} /></strong><p>{result.text}</p></div>}
    <p className="evidence-retry-instruction"><LocalizedText message={"Review the feedback above. When you’re ready, choose “Submit another photo” to start a new attempt. Your previous result stays saved."} /></p>
  </div>;
  const approved=result.status==='accepted';
  const checking=['automatic_boxing','automatic_scene'].includes(result.verification?.mode);
  const queueState=result.verification?.state;
  const queued=checking&&queueState!=='running';
  const delayed=checking&&Boolean(result.verification?.delayed);
  const Icon=approved?ShieldCheck:checking?ScanLine:Clock3;
  return <div className={`evidence-status-card ${approved?'is-approved':'is-checking'}`} role="status" aria-live="polite">
    <div className="evidence-status-visual"><span className="evidence-orbit"/><span className="evidence-orbit second"/><span className="evidence-status-icon"><Icon size={34} strokeWidth={1.3}/></span>{!approved&&<i className="evidence-orbit-dot"/>}</div>
    <span className="evidence-status-eyebrow"><LocalizedText>{approved?(demo?'LIGHT EVALUATION COMPLETE':'A MOMENT, EARNED'):checking?(demo?'LIGHT DEMO · TEST EVIDENCE':'YOUR ATTEMPT, UNDER THE LENS'):'YOUR PHOTO IS SAFELY SAVED'}</LocalizedText></span>
    <h3><LocalizedText>{approved?(demoRewards?'Demo challenge complete.':'Challenge complete.'):checking?(queued?'Photo submitted. Waiting for the checker.':'Checking your challenge evidence.'):'Ready for review.'}</LocalizedText></h3>
    <p><LocalizedText>{checking&&!approved?(queued?'Your photo is saved in the verification queue. No need to upload it again.':'The checker has picked up your submission. You can leave and return to see the result.'):result.feedback}</LocalizedText></p>
    <p className="evidence-submission-ref"><LocalizedText preserveValues={[false,true]} message={"Submitted ⟦0⟧ · Reference ⟦1⟧"} values={[result.created_at?new Date(result.created_at).toLocaleString(formattingLocale(uiLocale)):'',result.id?.slice(0,8)]} /></p>
    {!approved&&(connectionError||delayed)&&<p className="evidence-wait-notice"><LocalizedText>{connectionError?'Status updates are temporarily unavailable. We are reconnecting; your saved submission is preserved.':'This is taking longer than usual. The last saved status is shown above; the checker may be starting up or reconnecting. No points have been awarded yet.'}</LocalizedText></p>}
    {approved?<span className="evidence-earned"><Trophy size={16}/> +{xp} <LocalizedText>{demoRewards?'demo XP':'XP'}</LocalizedText><LocalizedText message={" earned "} /><span>·</span> <LocalizedText>{demoRewards?'Demo stamp collected':'Stamp collected'}</LocalizedText></span>:<div className="evidence-check-route"><span className="done"><Check size={12}/><LocalizedText>{equivalent?' Reflection saved':' Photo saved'}</LocalizedText></span><ChevronRight size={12}/><span className="current">{checking?<ScanLine size={12}/>:<Clock3 size={12}/>} <LocalizedText>{checking?(queued?'Queued':'Evidence check'):'Review'}</LocalizedText></span><ChevronRight size={12}/><span><Trophy size={12}/><LocalizedText message={" Reward"} /></span></div>}
  </div>;
}

export default function EvidenceDialogView({equivalent=false,onEquivalent,evaluationProfile='strict',onEvaluationProfile,retrying=false,onRetry,connectionError=false,challenge,record,enabled,loading,busy,error,result,files,previews,proof,caption,answer,automatic,heritage,onClose,onEnable,onSubmit,onPhoto,onProof,onCaption,onAnswer,dialogRef}){
  const finished=result&&(!retrying||result.status!=='rejected')&&['pending','accepted','rejected'].includes(result.status);
  const rejected=result?.status==='rejected';
  const approved=result?.status==='accepted';
  const ready=!loading&&enabled&&record&&!finished;
  const boxing=!equivalent&&record?.verification_mode==='automatic_boxing';
  automatic=automatic&&!equivalent;
  const sunset=record?.challenge_key==='sunset-seeker';
  const canSubmit=ready&&!busy&&(equivalent?caption.trim().length>=120:!files.some(file=>!file))&&(!heritage||equivalent||answer!=='')&&caption.trim().length>=12&&(!automatic||(boxing?boxingProofValid(proof):sceneProofValid(proof,sunset)));
  const missing=[];
  const missingPhoto=files.findIndex(file=>!file);
  if(!equivalent&&missingPhoto!==-1)missing.push({text:'Add your evidence photo.',field:`evidence-photo-${missingPhoto}`});
  if(boxing&&!boxingProofValid(proof)){
    if(!(Number(proof.score)>600&&Number(proof.score)<=9999))missing.push({text:'Enter a final score from 601 to 9999.',field:'boxing-score'});
    if(!proof.machine)missing.push({text:evaluationProfile==='demo'?'Confirm the image shows a boxing machine.':'Confirm the machine was available with venue staff.',field:'boxing-machine'});
    if(!proof.own)missing.push({text:evaluationProfile==='demo'?'Confirm this is test evidence.':'Confirm this is your own attempt photo.',field:'boxing-own'});
  }
  if(automatic&&!boxing){
    if(!proof.own)missing.push({text:'Confirm your evidence declaration.',field:'scene-own'});
    if(sunset&&!proof.captureTime)missing.push({text:'Enter the capture date and UAE time.',field:'scene-capture-time'});
    if(sunset&&!(proof.captureLocation?.trim().length>=3))missing.push({text:'Enter the beach or viewpoint location.',field:'scene-capture-location'});
  }
  if(heritage&&!equivalent&&answer==='')missing.push({text:'Answer the discovery question.',field:'landmark-quiz'});
  if(equivalent&&caption.trim().length<120)missing.push({text:'Address the equivalent task rubric in at least 120 characters.',field:'evidence-caption'});
  if(caption.trim().length<12)missing.push({text:'Add a venue note (at least 12 characters).',field:'evidence-caption'});
  function showMissingField(event){
    const field=event.currentTarget.form?.querySelector(`[name="${missing[0]?.field}"]`);
    field?.scrollIntoView({block:'center',behavior:'auto'});
    field?.focus({preventScroll:true});
  }
  const photoCount=files.filter(Boolean).length;
  const retryNotice=result?.status==='rejected'&&<div className="evidence-feedback" role="status"><Info size={18}/><div><strong><LocalizedText message={"Previous attempt · ⟦0⟧ evaluation"} values={[result.verification?.evaluation_profile==='demo'?'Light demo':'Strict / standard']} /></strong><p>{result.feedback}</p></div></div>;
  return <div className="evidence-overlay evidence-overlay--premium" onClick={onClose}><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="evidence-dialog-title" className={`evidence-dialog evidence-dialog--premium ${finished?'evidence-dialog--result':''} ${heritage?'evidence-dialog--heritage':''}`} onClick={event=>event.stopPropagation()}>
    <header className="evidence-header"><div className="evidence-heading-row"><span className="evidence-kicker"><span/><LocalizedText message={" CHALLENGE EVIDENCE"} /></span><Localized element={"button"} attributes={["aria-label"]} className="evidence-close" type="button" aria-label="Close evidence" onClick={onClose}><X size={18}/></Localized></div><div className="evidence-heading-main"><div><h2 id="evidence-dialog-title" className="evidence-title"><LocalizedText>{challenge.name}</LocalizedText></h2><p className="evidence-subtitle"><LocalizedText>{finished?(approved?'Your next memory is part of your passport.':rejected?'Your saved result and the checker’s feedback.':'Your evidence is saved. We’ll take it from here.'):heritage?'Capture the details that tell the story.':'Show the moment. Make it count.'}</LocalizedText></p></div>{record&&!approved&&!rejected&&<span className={`evidence-xp ${approved?'is-earned':''}`}><Sparkles size={14}/><strong><LocalizedText message={"+⟦0⟧ XP"} values={[record.xp]} /></strong><small><LocalizedText>{approved?'earned':'on approval'}</LocalizedText></small></span>}</div></header>
    {ready&&record.equivalent_task&&<div className="accessibility-notes"><label><input type="checkbox" checked={equivalent} onChange={event=>onEquivalent(event.target.checked)} disabled={busy}/> Complete the equivalent learning task without the physical activity or photo task</label>{equivalent&&<><h3>{record.equivalent_task.title}</h3><p>{record.equivalent_task.card}</p><p><strong>Review rubric: </strong>{record.equivalent_task.rubric}</p><p>Authorized review is required. This earns the same XP and stamp once approved; you can earn this challenge only once through either path. No diagnosis or attendance claim is required.</p></>}</div>}
    {ready?<form className="evidence-form-premium" onSubmit={onSubmit}><div className="evidence-scroll">{retryNotice}<div className="evidence-form-grid">{!equivalent&&<div className="evidence-photo-column"><div className="evidence-section-label"><span><LocalizedText message={"01 / THE PHOTO"} /></span><small><LocalizedText message={"⟦0⟧/⟦1⟧ ready"} values={[photoCount,files.length]} /></small></div>{!equivalent&&record.details.map((detail,index)=><PhotoCard key={detail} detail={detail} index={index} file={files[index]} preview={previews[index]} busy={busy} onPhoto={onPhoto}/>)}<p className="evidence-photo-tip"><Camera size={14}/><LocalizedText>{boxing?'Keep the machine and your final score clearly visible in one photo.':heritage?'Use a different photograph for each discovery.':'Include the scene and the details needed for your challenge.'}</LocalizedText></p></div>}
    <div className="evidence-details-column"><div className="evidence-section-label"><span><LocalizedText message={"02 / THE DETAILS"} /></span><small><LocalizedText>{boxing?'Target: above 600':'Your perspective'}</LocalizedText></small></div>
      {boxing&&<BoxingProofFields value={proof} onChange={onProof} disabled={busy} evaluationProfile={evaluationProfile} onEvaluationProfile={onEvaluationProfile} profiles={record.evaluation_profiles||['strict']}/>}
      {automatic&&!boxing&&<SceneProofFields value={proof} onChange={onProof} disabled={busy} profile={evaluationProfile} onProfile={onEvaluationProfile} profiles={record.evaluation_profiles||['strict']} sunset={sunset}/>}
      {!equivalent&&record.quiz&&<fieldset className="evidence-quiz"><legend>{record.quiz.question}</legend>{record.quiz.answers.map((text,index)=><label key={text} className={`evidence-quiz-option ${answer===String(index)?'selected':''}`}><input type="radio" name="landmark-quiz" required disabled={busy} value={index} checked={answer===String(index)} onChange={event=>onAnswer(event.target.value)}/><span>{String.fromCharCode(65+index)}</span><strong>{text}</strong></label>)}</fieldset>}
      <label className="evidence-caption-label"><LocalizedText>{boxing?'Where did you play?':'Your observations'}</LocalizedText><span><LocalizedText>{heritage?'Tell us what you discovered at the site':'Required · at least 12 characters about the venue and your attempt'}</LocalizedText></span><textarea name="evidence-caption" required minLength={12} maxLength={5000} disabled={busy} value={caption} onChange={event=>onCaption(event.target.value)} placeholder={boxing?'At the arcade in the mall, I scored 742 on my attempt.':'Tell us what you captured and where you found it.'}/></label>
      {challenge.sunsetWindow&&<p className="evidence-time-window"><LocalizedText message={"Suggested capture window: ⟦0⟧–⟦1⟧ · ⟦2⟧ · Asia/Dubai (estimate)"} values={[challenge.sunsetWindow.start,challenge.sunsetWindow.end,challenge.sunsetWindow.date]} /></p>}
      <details className="evidence-privacy"><summary><LockKeyhole size={12}/><LocalizedText message={" How your evidence is checked "} /><ChevronRight size={12}/></summary>{!automatic&&record.instructions&&<p>{record.instructions}</p>}<p><LocalizedText message={"Respect site photography rules. ⟦0⟧ GPS and attendance are not automatically verified. Strict and light evaluation award the same main XP on approval. Watching a demonstration earns no points."} values={[automatic?'Your photos are stored privately and checked for the required subject; boxing also checks the displayed score.':'Your photo is stored privately for authorized review.']} /></p>{challenge.availability&&<p>{challenge.availability}</p>}{challenge.sunsetWindow&&<p><LocalizedText message={"Suggested window: ⟦0⟧–⟦1⟧ · ⟦2⟧ · Asia/Dubai (estimate)."} values={[challenge.sunsetWindow.start,challenge.sunsetWindow.end,challenge.sunsetWindow.date]} /></p>}</details>
    </div></div>{error&&<div className="evidence-inline-error" role="alert"><Info size={16}/><LocalizedText>{error}</LocalizedText></div>}</div>
    <footer className="evidence-action-bar"><div className="evidence-action-guidance">{!busy&&missing.length>0?<button type="button" className="evidence-missing-field" onClick={showMissingField}><Info size={15}/><span>{missing[0].text}{missing.length>1&&<small><LocalizedText message={"⟦0⟧ requirements left"} values={[missing.length]} /></small>}</span><ChevronRight size={14}/></button>:<span role="status"><ShieldCheck size={15}/><LocalizedText>{busy?'Saving your photo securely…':automatic?'Private photo · automatic check':'Private photo · reviewed before award'}</LocalizedText></span>}</div><button className="evidence-primary" disabled={!canSubmit} type="submit">{busy?<><LoaderCircle size={16} className="evidence-spin"/><LocalizedText message={" Saving evidence…"} /></>:<><LocalizedText>{automatic?'Check my attempt':'Submit my evidence'}</LocalizedText><ArrowRight size={16}/></>}</button></footer></form>:<><div className="evidence-scroll evidence-state-scroll">{loading?<div className="evidence-loading-state" role="status"><LoaderCircle className="evidence-spin" size={25}/><h3><LocalizedText message={"Preparing your challenge"} /></h3><p><LocalizedText message={"Finding this stop’s evidence requirements…"} /></p></div>:finished?<StatusCard result={result} xp={record?.xp||0} connectionError={connectionError}/>:<div className="evidence-enable-state"><span className="evidence-enable-icon"><Camera size={28} strokeWidth={1.4}/></span><span className="evidence-status-eyebrow"><LocalizedText message={"YOUR NEXT CHALLENGE STARTS HERE"} /></span><h3><LocalizedText message={"Ready to capture your moment?"} /></h3><p><LocalizedText>{enabled?'Refresh the trip’s supported challenges to find this stop.':'Enable challenges for this trip to save your evidence and start earning stamps.'}</LocalizedText></p>{challenge.availability&&<p className="evidence-enable-note">{challenge.availability}</p>}<button className="evidence-primary" type="button" disabled={busy} onClick={onEnable}>{busy?<><LoaderCircle size={16} className="evidence-spin"/><LocalizedText message={" Preparing…"} /></>:<><LocalizedText>{enabled?'Refresh challenges':'Enable this trip’s challenges'}</LocalizedText><ArrowRight size={16}/></>}</button></div>}{error&&<div className="evidence-inline-error" role="alert"><Info size={16}/><LocalizedText>{error}</LocalizedText></div>}</div>{finished&&<footer className="evidence-action-bar"><span><ShieldCheck size={15}/><LocalizedText>{approved?'Saved to your passport':rejected?'Check finished · no XP awarded for this attempt':'You can close this window and return anytime.'}</LocalizedText></span><div className="evidence-result-actions">{rejected&&<button type="button" className="evidence-secondary" onClick={onClose}><LocalizedText message={"Close"} /></button>}{approved&&<Link href="/rewards" className="evidence-secondary" onClick={onClose}><LocalizedText message={"View passport"} /></Link>}<button type="button" className="evidence-primary" onClick={rejected?onRetry:onClose}><LocalizedText>{approved?'Back to my trip':rejected?'Submit another photo':'Continue exploring'}</LocalizedText><ArrowRight size={16}/></button></div></footer>}</>}
  </section></div>;
}
