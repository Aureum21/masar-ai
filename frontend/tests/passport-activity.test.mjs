import test from 'node:test';
import assert from 'node:assert/strict';
import {passportActivity} from '../src/lib/passportActivity.mjs';

test('stored practice JSON becomes a named activity with score and elapsed time',()=>{
  const result=passportActivity({type:'game_completed',description:JSON.stringify({
    game_id:'sikka-run',score:1640,elapsed_seconds:44,mode:'practice',
    result:{status:'success',practice_only:true,xp_awarded:0,message:'Internal result payload'},
  })});
  assert.equal(result.title,'Secret Sikka Run');
  assert.equal(result.status,'Practice complete');
  assert.deepEqual(result.metrics,[{label:'Score',value:'1,640'},{label:'Time',value:'00:44'}]);
  assert.match(result.description,/no XP or redeemable coins/);
  assert.doesNotMatch(JSON.stringify(result),/Internal result payload|game_id|xp_awarded/);
});

test('zero scores are shown but unknown zero duration and invalid numbers are omitted',()=>{
  const result=passportActivity({type:'game_completed',description:{game_id:'landmark-puzzle',score:0,elapsed_seconds:0}});
  assert.equal(result.title,'Piece by Place');
  assert.deepEqual(result.metrics,[{label:'Score',value:'0'}]);
  assert.deepEqual(passportActivity({type:'game_completed',description:{score:NaN,elapsed_seconds:-1}}).metrics,[]);
});

test('plain descriptions stay readable and JSON notifications use their message',()=>{
  assert.equal(passportActivity({title:'Stamp earned',description:'60 XP earned with an approved reflection.'}).description,'60 XP earned with an approved reflection.');
  assert.equal(passportActivity({title:'Daily challenge',description:JSON.stringify({message:'You earned a Daily Challenge Coin.',key:'private-internal-key'})}).description,'You earned a Daily Challenge Coin.');
});

test('malformed, array, empty and unknown payloads never surface raw JSON',()=>{
  for(const description of ['{"game_id":','["internal"]',null,{},'{"unknown":"private data"}']) {
    const result=passportActivity({title:'Activity saved',description});
    assert.equal(result.description,'A new moment in your Passport.');
  }
  const session=passportActivity({type:'game_session',description:'{"game_id":"unknown-id"}'});
  assert.equal(session.title,'Practice game');
  assert.equal(session.status,'Practice started');
  assert.deepEqual(session.metrics,[]);
});

test('long durations and locale-specific scores remain readable',()=>{
  const result=passportActivity({type:'game_completed',description:{score:1234,elapsed_seconds:3661}},'de');
  assert.deepEqual(result.metrics,[{label:'Score',value:'1.234'},{label:'Time',value:'1:01:01'}]);
});
