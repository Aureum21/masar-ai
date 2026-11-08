import test from 'node:test';
import assert from 'node:assert/strict';
import {isActiveRun,resultPath,workerLabel,researchStatus} from '../src/lib/planningRuns.js';

test('only committed completed runs link to a saved trip',()=>{
  assert.equal(resultPath({status:'completed',trip_id:42}),'/trips/42');
  for(const value of [{status:'running',trip_id:42},{status:'failed',trip_id:42},{status:'completed',trip_id:'42'},{status:'completed',trip_id:null}])assert.equal(resultPath(value),null);
});
test('polling stops for every terminal state and missing request',()=>{
  for(const status of ['queued','running'])assert.equal(isActiveRun({status}),true);
  for(const status of ['completed','failed','interrupted','cancelled'])assert.equal(isActiveRun({status}),false);
  assert.equal(isActiveRun(null),false);
  assert.equal(workerLabel('event_result'),'Places & experiences');
});

test('awaiting a choice stops background polling and does not expose a completed trip',()=>{
  assert.equal(isActiveRun({status:'awaiting_choice'}),false);
  assert.equal(resultPath({status:'awaiting_choice',trip_id:null}),null);
});

test('empty or missing provider results are not successful discoveries',()=>{
 assert.equal(researchStatus({content:{flights:[]}}).hasOptions,false);
 assert.equal(researchStatus(undefined).hasOptions,false);
 assert.equal(researchStatus({content:{flights:[{offer_id:'f1'}]}}).hasOptions,true);
 assert.equal(researchStatus({content:{rooms:[{offerId:'r1'}]}}).hasOptions,true);
});
