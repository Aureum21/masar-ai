import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeCatalogue,cataloguePage} from '../src/lib/attractionCatalogue.js';
import {UAE_REGIONS} from '../src/data/exploreData.js';
import {isLandmarkChallenge,CATALOGUE_BOWLING_PLACES,conditionalBoxingPreview,CATALOGUE_BOXING_CANDIDATES} from '../src/lib/tripWorkspace.js';
import fs from 'node:fs';
test('catalogue merge retains photos and canonicalises existing mosque aliases',()=>{
 const result=mergeCatalogue([{id:'sheikh-zayed-mosque',images:['actual.jpg']}],[{id:'sheikh-zayed-grand-mosque',images:[],title:'Mosque'}]);
 assert.equal(result.length,1);assert.deepEqual(result[0].images,['actual.jpg']);assert.equal(result[0].id,'sheikh-zayed-grand-mosque');
});

test('reviewed venue access survives API failure, cached empty evidence and legacy identities',()=>{
 const fallback=mergeCatalogue([{id:'museum-of-the-future',images:['museum.jpg']},{id:'old-dubai-heritage'},{id:'burj-khalifa-sky'}],[]);
 assert.equal(fallback[0].accessibility.facts.lift.value,true);
 assert.deepEqual(fallback[0].images,['museum.jpg']);
 assert.match(fallback[1].accessibility.facts.surface.value,/flat/);
 assert.equal(fallback[2].accessibility.facts.step_free_entrance.value,true);
 const [cached]=mergeCatalogue([],[{id:'kite-beach',accessibility:{scope:'venue',facts:{}}}]);
 assert.equal(cached.accessibility.facts.accessible_toilets.value,true);
 assert.equal(cached.accessibility.confirmation_required,true);
});

test('access filters distinguish explicit support, explicit barriers and missing evidence',()=>{
 const places=mergeCatalogue([],[{id:'palm-jumeirah-mall'},{id:'dhayah-fort'},{id:'kite-beach-uaq'}]);
 const matching=places.filter(p=>{const fact=p.accessibility?.facts?.step_free_entrance;return fact?.value===true&&['reported','confirmed'].includes(fact.status);});
 assert.deepEqual(matching.map(p=>p.id),['palm-jumeirah-mall']);
 assert.equal(places[1].accessibility.facts.step_free_entrance.value,false);
 assert.equal(places[2].accessibility,undefined);
});
test('combined catalogue pages do not duplicate or lose places and clamp after filtering',()=>{
 const all=Array.from({length:75},(_,id)=>({id}));
 const seen=Array.from({length:7},(_,i)=>cataloguePage(all,i+1).items).flat();
 assert.equal(new Set(seen.map(p=>p.id)).size,75);assert.equal(seen.length,75);
 assert.equal(cataloguePage(all.slice(0,8),7).page,1);
});
test('explicit mall and beach tasks use their own animation instead of a landmark fallback',()=>{
 for(const [key,animation_key] of [['boxing','boxing'],['bowling','bowling'],['sunset-seeker','sunset']]){
  const task=isLandmarkChallenge({id:'a1',place_id:'p1',challenge:{key,animation_key,place_id:'p1'}});
  assert.equal(task.type,key);assert.equal(task.animationKey,animation_key);
 }
 assert.equal(isLandmarkChallenge({place_id:'qasr-al-watan',title:'Palace'}),null);
});

test('Explore includes all seven emirates in its region selector',()=>{assert.equal(UAE_REGIONS.length,8);assert.ok(UAE_REGIONS.some(r=>r.id==='ajman'));assert.ok(UAE_REGIONS.some(r=>r.id==='ummalquwain'));});

test('saved mall stops missing LLM challenge metadata retain their supported bowling preview',()=>{
 const catalogue=JSON.parse(fs.readFileSync(new URL('../../data/attractions.v1.json',import.meta.url)));
 assert.deepEqual(CATALOGUE_BOWLING_PLACES,catalogue.filter(p=>p.challengeKeys.includes('bowling')).map(p=>p.id));
 const challenge=isLandmarkChallenge({id:'saved-mall-stop',title:'Palm Jumeirah Mall',place_id:'palm-jumeirah-mall'});
 assert.equal(challenge.type,'bowling');assert.equal(challenge.animationKey,'bowling');assert.equal(challenge.activityId,'saved-mall-stop');
 assert.equal(isLandmarkChallenge({title:'Palm Jumeirah Mall',place_id:'unverified-mall'}),null);
 assert.equal(isLandmarkChallenge({title:'Morning beach',place_id:'kite-beach'}),null);
});

test('boxing candidates expose conditional previews without replacing scheduled bowling',()=>{
 const catalogue=JSON.parse(fs.readFileSync(new URL('../../data/attractions.v1.json',import.meta.url)));
 assert.deepEqual([...CATALOGUE_BOXING_CANDIDATES].sort(),catalogue.filter(p=>p.challengeCandidates.includes('boxing')).map(p=>p.id).sort());
 const activity={id:'mall-stop',place_id:'palm-jumeirah-mall'};
 assert.equal(isLandmarkChallenge(activity).type,'bowling');
 assert.equal(conditionalBoxingPreview(activity).type,'boxing');
 assert.equal(conditionalBoxingPreview(activity).previewOnly,true);
 assert.equal(conditionalBoxingPreview({place_id:'city-centre-mirdif'}),null);
 assert.equal(conditionalBoxingPreview({...activity,challenge:{key:'boxing'}}),null);
});
