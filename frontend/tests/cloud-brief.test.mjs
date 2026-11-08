import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {planningDraft,accountConflict,localAccountDraft,hasLocalChoices} from '../src/lib/cloudBrief.js';
import {createHandoff,consumeHandoffPacket} from '../src/lib/planningHandoff.js';

test('account payload contains only trip choices, selection IDs and priority',()=>{
  const input={id:null,selections:[{id:'google:ChIJ_one',priority:'must_visit',title:'Provider title',rating:5}],brief:{origin:'Dubai',flight_requirement:'not_needed',unknownField:'ignored'},cloudRevision:8,savedAt:'yesterday'};
  const result=planningDraft(input);
  assert.deepEqual(result.selections,[{id:'google:ChIJ_one',priority:'must_visit'}]);
  assert.equal(result.brief.origin,'Dubai');assert.equal(result.brief.unknownField,undefined);
  assert.equal(result.cloudRevision,undefined);
});
test('different account/device versions require an explicit choice',()=>{
  const account={draft:{version:1,id:'cloud',brief:{},selections:[]},revision:3,updated_at:'2026-10-23'};
  const empty={id:null,brief:{},selections:[]};
  assert.equal(hasLocalChoices(empty),false);assert.equal(accountConflict(empty,account),false);
  assert.equal(accountConflict({...empty,id:'device'},account),true);
  const restored=localAccountDraft(account);assert.equal(restored.cloudRevision,3);
  assert.equal(accountConflict(restored,account),false);
  assert.equal(accountConflict({...restored,cloudRevision:2},account),true);
});
test('planning handoff preserves typed context and remains owner-scoped and one-use',()=>{
  const data=new Map();globalThis.sessionStorage={setItem:(key,value)=>data.set(key,value),getItem:key=>data.get(key)||null,removeItem:key=>data.delete(key)};
  if(!globalThis.crypto)globalThis.crypto=webcrypto;
  const key=createHandoff(1,'Prompt',{places:2},{brief_id:'brief-id',brief_revision:3});
  assert.equal(consumeHandoffPacket(2,key),null);
  assert.deepEqual(consumeHandoffPacket(1,key).context,{brief_id:'brief-id',brief_revision:3});
  assert.equal(consumeHandoffPacket(1,key),null);
});

test('manual and MASAR flight/stay choices persist in account briefs',()=>{
  const payload=planningDraft({selections:[],brief:{flight_requirement:'needed',stay_requirement:'needed',flight_selection:'user',stay_selection:'masar'}});
  assert.equal(payload.brief.flight_selection,'user');
  assert.equal(payload.brief.stay_selection,'masar');
});

test('per-traveller support survives account serialization, restore and inline handoff',()=>{
  const support=[{traveller:1,needs:['step_free','frequent_rests'],essential:['step_free']},{traveller:2,needs:['captions'],essential:[]}];
  const payload=JSON.parse(JSON.stringify(planningDraft({selections:[],brief:{travellers:2,traveller_support:support}})));
  const restored=localAccountDraft({draft:payload,revision:4,updated_at:'2026-10-30T08:00:00Z'});
  assert.deepEqual(restored.brief.traveller_support,support);
  const data=new Map();globalThis.sessionStorage={setItem:(key,value)=>data.set(key,value),getItem:key=>data.get(key)||null,removeItem:key=>data.delete(key)};
  if(!globalThis.crypto)globalThis.crypto=webcrypto;
  const id=createHandoff(1,'Plan my trip',{}, {trip_brief:planningDraft(restored)});
  assert.deepEqual(consumeHandoffPacket(1,id).context.trip_brief.brief.traveller_support,support);
});
