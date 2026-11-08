import {briefMessageSummary} from '../src/lib/briefMessage.js';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {emptyDraft,parseDraft,togglePlace,setPriority,draftKey,MAX_PLACES,addPlace,profileBrief,validateBrief,planningPrompt} from '../src/lib/tripDraft.js';
import {createHandoff,consumeHandoff} from '../src/lib/planningHandoff.js';
import {APP_HOME,safeAppRedirect} from '../src/config/navigation.js';

test('shortlist persists, deduplicates and removes without mutating previous data',()=>{
  const old=emptyDraft();const next=togglePlace(old,'museum-of-the-future');
  assert.equal(old.selections.length,0);
  assert.equal(next.selections[0].priority,'must_visit');
  const saved=parseDraft(JSON.stringify(next));assert.equal(saved.selections[0].id,'museum-of-the-future');
  assert.equal(togglePlace(saved,'museum-of-the-future').selections.length,0);
  assert.equal(parseDraft(JSON.stringify({...next,selections:[...next.selections,...next.selections]})).selections.length,1);
});
test('priority survives refresh and unrelated removals',()=>{
  let draft=togglePlace(togglePlace(emptyDraft(),'one'),'two');draft=setPriority(draft,'one','optional');
  draft=parseDraft(JSON.stringify(togglePlace(draft,'two')));
  assert.deepEqual(draft.selections,[{id:'one',priority:'optional'}]);
  assert.throws(()=>setPriority(draft,'one','bogus'));
});
test('corrupt/future drafts are flagged rather than treated as saved',()=>{
  assert.equal(parseDraft('{broken').unreadable,true);
  assert.equal(parseDraft('{"version":9,"selections":[],"brief":{}}').unreadable,true);
  assert.equal(parseDraft('').unreadable,undefined);
  assert.notEqual(draftKey(1),draftKey(2));
});
test('shortlist has a bounded size',()=>{
  let draft=emptyDraft();for(let n=0;n<MAX_PLACES;n++)draft=togglePlace(draft,String(n));
  assert.throws(()=>togglePlace(draft,'overflow'));
});
test('profile defaults do not infer flight/hotel need or mutate the travel profile',()=>{
  const profile={interests:['Heritage'],accessibility_needs:['Shorter walks'],dietary:['Halal']};
  const brief=profileBrief(profile);brief.interests.push('Architecture');
  assert.deepEqual(profile.interests,['Heritage']);
  assert.equal(brief.flight_requirement,'unknown');assert.equal(brief.stay_requirement,'unknown');
});
test('dates, guest bounds and flight origin are validated',()=>{
  const brief={...profileBrief(),start_date:'2027-01-01',end_date:'2027-01-03'};
  assert.deepEqual(validateBrief(brief),{});
  assert.ok(validateBrief({...brief,end_date:'2026-12-31'}).end_date);
  assert.ok(validateBrief({...brief,start_date:'2027-02-30'}).start_date);
  assert.ok(validateBrief({...brief,travellers:0}).travellers);
  assert.ok(validateBrief({...brief,travellers:1.5}).travellers);
  assert.ok(validateBrief({...brief,flight_requirement:'needed'}).origin);
});
test('handoff prompt preserves choices and instructs clarification rather than booking',()=>{
  const draft={...emptyDraft(),brief:{...profileBrief(),start_date:'2027-01-01',end_date:'2027-01-03',flight_requirement:'not_needed',stay_requirement:'already_arranged'},selections:[{id:'museum',priority:'must_visit'},{id:'sky',priority:'optional'}]};
  const prompt=planningPrompt(draft,[{id:'museum',title:'Museum of the Future',neighborhood:'Dubai'},{id:'sky',title:'Burj Khalifa At The Top SKY',neighborhood:'Downtown'}]);
  assert.match(prompt,/Must visit: Museum of the Future/);assert.match(prompt,/If time allows: Burj Khalifa At The Top SKY/);
  assert.match(prompt,/Flights: not_needed/);assert.match(prompt,/Do not make bookings or payments/);
  assert.match(prompt,/Sheikh Zayed Grand Mosque/);assert.match(prompt,/Keep selected ticket products distinct/);
  assert.throws(()=>planningPrompt(draft,[]));
});
test('one-use handoff is scoped to owner, expires, and stores no personal content in URL ID',()=>{
  const memory=new Map();globalThis.sessionStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};
  const id=createHandoff(1,'private trip wishes');assert.ok(!id.includes('private'));
  assert.equal(consumeHandoff(2,id),null);assert.equal(consumeHandoff(1,id),'private trip wishes');assert.equal(consumeHandoff(1,id),null);
  const expired=createHandoff(1,'old');const key=`masar:planning-handoff:${expired}`;const packet=JSON.parse(memory.get(key));packet.expiresAt=0;memory.set(key,JSON.stringify(packet));assert.equal(consumeHandoff(1,expired),null);
});
test('login redirects remain on approved local routes',()=>{
  assert.equal(APP_HOME,'/explore');assert.equal(safeAppRedirect('/trips?day=2'),'/trips?day=2');
  for(const value of ['https://evil.example','//evil.example','/\\evil.example','javascript:alert(1)','/unknown',null])assert.equal(safeAppRedirect(value),APP_HOME);
});


test('briefs appear as readable requests instead of transport instructions',()=>{
  const draft={...emptyDraft(),brief:{...profileBrief(),start_date:'2027-01-01',end_date:'2027-01-03'},selections:[{id:'museum',priority:'must_visit'}]};
  const prompt=planningPrompt(draft,[{id:'museum',title:'Museum of the Future',neighborhood:'Dubai'}]);
  const summary=briefMessageSummary(prompt);
  assert.match(summary,/Museum of the Future/);
  assert.ok(!summary.includes('never invent'));
  assert.ok(!summary.includes('museum;'));
  assert.equal(briefMessageSummary('An ordinary user question'),null);
});

test('past arrival is explained before planning while today remains valid',()=>{
 const brief={...profileBrief(),start_date:'2026-10-06',end_date:'2026-10-09'};
 assert.match(validateBrief(brief,'2026-10-26').start_date,/past/);
 assert.equal(validateBrief({...brief,start_date:'2026-10-26',end_date:'2026-10-29'},'2026-10-26').start_date,undefined);
});


test('new accounts with null preferences receive a complete usable planning brief',()=>{
  for(const preferences of [null,undefined,{},[],false]){
    const brief=profileBrief(preferences);
    assert.equal(brief.travellers,1);
    assert.deepEqual(brief.interests,[]);
    assert.equal(brief.party_type,'Solo');
    assert.equal(brief.start_date,'');
    assert.equal(brief.flight_requirement,'unknown');
  }
});

test('daily Al Fahidi addition persists once and preserves an existing selection at the limit',()=>{
  const original=emptyDraft(),added=addPlace(original,'old-dubai-heritage');
  assert.equal(original.selections.length,0);
  assert.equal(parseDraft(JSON.stringify(added)).selections[0].id,'old-dubai-heritage');
  const required=setPriority(added,'old-dubai-heritage','must_visit');
  let full=required;for(let n=1;n<MAX_PLACES;n++)full=addPlace(full,String(n));
  assert.equal(addPlace(full,'old-dubai-heritage'),full);
  assert.equal(full.selections[0].priority,'must_visit');
  assert.throws(()=>addPlace(full,'overflow'),/30 places/);
});
