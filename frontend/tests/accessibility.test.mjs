import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validSupport} from '../src/lib/supportNeeds.js';
import {emptyDraft,profileBrief,validateBrief,parseDraft,planningPrompt} from '../src/lib/tripDraft.js';
import {loadComponent} from './helpers/loadComponent.mjs';
import {renderLocalizedMarkup} from './helpers/renderLocalized.mjs';

test('malformed support is rejected safely before prompt generation',()=>{
  for(const support of [null,{},[null],[{traveller:1,needs:['bogus'],essential:[]}],[{traveller:1,needs:[],essential:['step_free']}],[{traveller:1,needs:[],essential:[]},{traveller:1,needs:[],essential:[]}],[{traveller:1.5,needs:[],essential:[]}],[{traveller:1,needs:[],essential:[],rest_minutes:0}]]){
    assert.equal(validSupport(support),false);
    const brief={...profileBrief(),start_date:'2027-01-01',end_date:'2027-01-02',traveller_support:support};
    assert.ok(validateBrief(brief,'2026-10-30').traveller_support);
    assert.equal(parseDraft(JSON.stringify({...emptyDraft(),brief})).unreadable,true);
  }
});
test('personal defaults are cloned for traveller one and party shrink keeps assignments for review',()=>{
  const personal={traveller:1,needs:['step_free'],essential:['step_free'],max_walk_m:150};
  const brief=profileBrief({personal_support:personal});
  brief.traveller_support[0].needs.push('captions');assert.deepEqual(personal.needs,['step_free']);
  const support=[personal,{traveller:2,needs:['captions'],essential:[]}];
  assert.equal(validSupport(support,2),true);assert.equal(validSupport(support,1),false);
  const draft={...emptyDraft(),brief:{...brief,travellers:1,traveller_support:support}};
  assert.equal(parseDraft(JSON.stringify(draft)).brief.traveller_support.length,2);
});
test('support editor renders labelled controls and different per-traveller selections',()=>{
  const Editor=loadComponent('components/planning/TravellerSupportEditor').default;
  const markup=renderLocalizedMarkup(React.createElement(Editor,{travellers:2,value:[{traveller:1,needs:['step_free'],essential:['step_free']},{traveller:2,needs:['captions'],essential:[]}],onChange:()=>{}}));
  assert.match(markup,/Traveller 1/);assert.match(markup,/Traveller 2/);assert.match(markup,/No diagnosis/);assert.match(markup,/Step-free routes essential for traveller 1/);
  assert.match(markup,/Maximum walking distance/);
});
test('facts show unknown and reported separately without room availability claims',()=>{
  const Facts=loadComponent('components/planning/AccessibilityFacts').default;
  const markup=renderLocalizedMarkup(React.createElement(Facts,{evidence:{scope:'room',facts:{wheelchair_room:{value:true,status:'reported',source:'Fixture',source_url:'https://example.com',last_checked:'2026-10-30'}}}}));
  assert.match(markup,/Yes · reported/);assert.match(markup,/Unknown · Confirm with venue/);assert.match(markup,/Confirm this room for your dates/);assert.match(markup,/Last checked 2026-10-30/);
});
test('prompt carries different needs and support limits',()=>{
  const draft={...emptyDraft(),brief:{...profileBrief(),start_date:'2027-01-01',end_date:'2027-01-02',traveller_support:[{traveller:1,needs:['short_walks'],essential:['short_walks'],max_walk_m:150}]}};
  assert.match(planningPrompt(draft,[]),/Traveller 1: short_walks/);
});

test('daily accessibility notes survive calendar views and private export',async()=>{
  const {buildCalendarEvents,exportCalendar}=await import('../src/lib/tripCalendar.js');
  const {events}=buildCalendarEvents([{id:1,title:'Fixture',itinerary_data:{start_date:'2027-01-01',days:[{day_number:1,activities:[],accessibility_notes:['Confirm with venue: step-free route.']}]}}]);
  assert.deepEqual(events[0].accessibility_notes,['Confirm with venue: step-free route.']);
  assert.match(exportCalendar(events),/Accessibility notes/);
});

test('challenge previews display 3D simulation preview iframe directly',()=>{
  const Preview=loadComponent('components/trips/workspace/ChallengePreviewModal',{
    './ChallengeEvidenceModal':{__esModule:true,default:()=>null}
  }).default;
  const html=renderLocalizedMarkup(React.createElement(Preview,{challenge:{name:'Bowling',type:'bowling'},isOpen:true,onClose:()=>{}}));
  assert.match(html,/role="dialog"/);assert.match(html,/aria-labelledby="challenge-preview-title"/);
  assert.match(html,/<iframe/);
});

test('embedded keyboard controls pause, reset and close without triggering form controls',()=>{
  const listeners={},posted=[];let toggled=0,reset=0,prevented=0;
  const source=readFileSync(new URL('../public/masar-experiences/accessibility.js',import.meta.url),'utf8').replace('export function','function');
  const host={postMessage:(...args)=>posted.push(args)};
  const window={parent:host,addEventListener:(key,fn)=>{listeners[key]=fn;},removeEventListener:()=>{}};
  vm.runInNewContext(source+'\nconnectPreviewKeys({toggle:()=>toggle(),reset:()=>reset()});',{window,location:{origin:'https://local.example'},toggle:()=>toggled++,reset:()=>reset++});
  const event=(key,code=key,control=false)=>({key,code,target:{closest:()=>control},preventDefault:()=>prevented++});
  listeners.keydown(event(' ','Space'));listeners.keydown(event('r'));listeners.keydown(event('Escape'));
  listeners.keydown(event(' ','Space',true));
  assert.equal(toggled,1);assert.equal(reset,1);assert.equal(prevented,3);
  assert.equal(posted[0][0].type,'masar-preview-close');assert.equal(posted[0][1],'https://local.example');
});

test('editing a walking limit keeps existing support choices visible',()=>{
 const Editor=loadComponent('components/planning/TravellerSupportEditor').default;
 const html=renderLocalizedMarkup(React.createElement(Editor,{value:[{traveller:1,needs:['step_free'],essential:['step_free'],max_walk_m:1}],onChange:()=>{}}));
 assert.doesNotMatch(html,/Saved support settings need review/);
 assert.match(html,/checked=""/);assert.match(html,/value="1"/);
});
