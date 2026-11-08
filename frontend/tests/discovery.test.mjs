import {test} from 'node:test';
import assert from 'node:assert/strict';
import {discoveryPayload,mergeDiscoveryItems} from '../src/lib/discovery.js';
import {emptyDraft,togglePlace,parseDraft,planningPrompt,profileBrief} from '../src/lib/tripDraft.js';

test('event dates are explicit and place directory searches do not request rates',()=>{
  assert.deepEqual(discoveryPayload({category:'events',region:'dubai',query:' Jazz ',start:'2027-01-01',end:'2027-01-03'}),{category:'events',region:'dubai',query:'Jazz',start_date:'2027-01-01',end_date:'2027-01-03'});
  const stay=discoveryPayload({category:'stays',region:'all',query:'',start:'2027-01-01'});
  assert.equal(stay.start_date,null);assert.equal(stay.end_date,null);
});
test('pagination merges identities without duplicating shortlist cards',()=>{
  assert.deepEqual(mergeDiscoveryItems([{id:'one',title:'Old'}],[{id:'one',title:'New'},{id:'two'}]),[{id:'one',title:'New'},{id:'two'}]);
});
test('live shortlist persists IDs only and planning handoff requests fresh resolution',()=>{
  const draft=parseDraft(JSON.stringify(togglePlace(emptyDraft(),'google:ChIJ_test')));
  assert.deepEqual(draft.selections,[{id:'google:ChIJ_test',priority:'must_visit'}]);
  draft.brief={...profileBrief(),start_date:'2027-01-01',end_date:'2027-01-03'};
  const prompt=planningPrompt(draft,[{id:'google:ChIJ_test',provider:'google',title:'Provider title',neighborhood:'Provider address'}]);
  assert.match(prompt,/google:ChIJ_test \(resolve this provider reference before planning\)/);
  assert.doesNotMatch(prompt,/Provider title|Provider address/);
  assert.throws(()=>planningPrompt(draft,[]));
});
