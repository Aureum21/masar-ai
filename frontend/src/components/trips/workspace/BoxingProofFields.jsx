'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';

import './boxing-proof.css';

export function boxingProofValid(value){return Number(value.score)>600 && Number(value.score)<=9999 && value.machine && value.own;}
export function addBoxingProof(form,value,evaluationProfile='strict'){form.set('evaluation_profile',evaluationProfile);form.set('boxing_score',value.score);form.set('machine_confirmed',String(value.machine));form.set('own_photo_confirmed',String(value.own));}

export default function BoxingProofFields({value,onChange,disabled,evaluationProfile='strict',onEvaluationProfile,profiles=['strict']}){
  const demo=evaluationProfile==='demo';
  return <fieldset className="boxing-proof" disabled={disabled}><legend><LocalizedText message={"Your attempt"} /></legend>
    {profiles.includes('demo')&&onEvaluationProfile&&<label className="boxing-evaluation-mode"><span><LocalizedText message={"Evaluation mode"} /></span><Localized element={"select"} attributes={["aria-label"]} aria-label="Evaluation mode" value={evaluationProfile} onChange={event=>onEvaluationProfile(event.target.value)}><Localized element="option" attributes={[]} textChildren value="strict">Strict · real evidence rules</Localized><Localized element="option" attributes={[]} textChildren value="demo">Light · screenshots allowed</Localized></Localized><small><LocalizedText>{demo?'Machine + matching score. Screenshots allowed. Awards the same main XP and stamp as strict evaluation.':'Original rules: real photo requirements and stricter machine and score checks.'}</LocalizedText></small></label>}

    <label className="boxing-score-label"><span><LocalizedText message={"Final score on your display"} /></span><span className="boxing-score-input"><input name="boxing-score" type="number" min="601" max="9999" step="1" required value={value.score} onChange={e=>onChange({...value,score:e.target.value})} placeholder="742"/><span aria-hidden="true"><LocalizedText message={"PTS"} /></span></span></label>
    <label className="boxing-proof-check"><input name="boxing-machine" type="checkbox" required checked={value.machine} onChange={e=>onChange({...value,machine:e.target.checked})}/><span><strong><LocalizedText>{demo?'Boxing machine shown':'Working machine confirmed'}</LocalizedText></strong><small><LocalizedText>{demo?'The test image shows an arcade boxing machine and scoreboard.':'Venue staff confirmed it is available to use.'}</LocalizedText></small></span></label>
    <label className="boxing-proof-check"><input name="boxing-own" type="checkbox" required checked={value.own} onChange={e=>onChange({...value,own:e.target.checked})}/><span><strong><LocalizedText>{demo?'Test evidence confirmed':'My photo. My final result.'}</LocalizedText></strong><small><LocalizedText>{demo?'I am submitting a test image. This demo does not verify a real visit.':'I photographed my own attempt at this venue. Screenshots, demos and high scores do not qualify.'}</LocalizedText></small></span></label>
    <p><LocalizedText message={"Unclear photos can be submitted again. Image checks cannot prove attendance."} /></p>
  </fieldset>;
}
