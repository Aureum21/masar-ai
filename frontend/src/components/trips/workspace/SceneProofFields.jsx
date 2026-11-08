'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';

import './boxing-proof.css';

export function sceneProofValid(value,sunset){return value.own&&(!sunset||(Boolean(value.captureTime)&&value.captureLocation?.trim().length>=3));}

export default function SceneProofFields({value,onChange,disabled,profile,onProfile,profiles,sunset}){
  return <fieldset className="boxing-proof" disabled={disabled}><legend><LocalizedText message={"Your evidence declaration"} /></legend>
    {profiles?.includes('demo')&&<label className="boxing-evaluation-mode"><span><LocalizedText message={"Evaluation mode"} /></span><Localized element={"select"} attributes={["aria-label"]} aria-label="Evaluation mode" value={profile} onChange={event=>onProfile(event.target.value)}><Localized element="option" attributes={[]} textChildren value="strict">Strict · original photographs</Localized><Localized element="option" attributes={[]} textChildren value="demo">Light · screenshots allowed</Localized></Localized><small><LocalizedText message={"Both modes require the correct subject. Approved normal-trip challenges earn the same main XP."} /></small></label>}
    {sunset&&<><label className="boxing-score-label"><span><LocalizedText message={"Capture date and time · UAE time"} /></span><input name="scene-capture-time" className="scene-proof-input" type="datetime-local" required value={value.captureTime||''} onChange={event=>onChange({...value,captureTime:event.target.value})}/></label><label className="boxing-score-label"><span><LocalizedText message={"Beach or viewpoint location"} /></span><input name="scene-capture-location" className="scene-proof-input" type="text" required minLength={3} maxLength={200} value={value.captureLocation||''} onChange={event=>onChange({...value,captureLocation:event.target.value})}/></label></>}
    <label className="boxing-proof-check"><input name="scene-own" type="checkbox" required checked={Boolean(value.own)} onChange={event=>onChange({...value,own:event.target.checked})}/><span><strong><LocalizedText>{profile==='demo'?'Test evidence confirmed':'My own photographs'}</LocalizedText></strong><small><LocalizedText>{profile==='demo'?'Screenshots are allowed for testing; the correct subject is still required.':'These are my original photographs from this challenge.'}</LocalizedText></small></span></label>
    <p><LocalizedText message={"⟦0⟧Image recognition checks content; it cannot prove attendance, GPS or capture time."} values={[sunset?'Capture time and location are your declarations. ':' ']} /></p>
  </fieldset>;
}
