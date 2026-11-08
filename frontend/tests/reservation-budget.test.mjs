import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reservationBudget} from '../src/lib/reservationBudget.js';
const booking={trip_id:7,source:'provider',status:'CONFIRMED',kind:'hotel',booking_id:'h1',environment:'sandbox',total_amount:'3843.92',currency:'AED'};
test('sandbox booking value stays separate from real confirmed costs',()=>{
 const result=reservationBudget([booking],7);
 assert.equal(result.live.count,0);assert.equal(result.sandbox.count,1);
 assert.deepEqual(result.sandbox.totals,[{currency:'AED',amount:'3843.92'}]);
});
test('quotes, holds, pending bookings, unrelated trips and duplicate references cannot inflate totals',()=>{
 const records=[booking,booking,...[{kind:'hotel_hold'},{status:'PENDING'},{status:'FAILED'},{source:'estimate'},{trip_id:8},{booking_id:null}].map(patch=>({...booking,...patch}))];
 assert.equal(reservationBudget(records,7).sandbox.count,1);
});
test('currencies and environments remain separate and decimal sums are exact',()=>{
 const result=reservationBudget([booking,{...booking,booking_id:'h2',total_amount:'0.1',environment:'live'},{...booking,booking_id:'h3',total_amount:'0.2',environment:'live'},{...booking,booking_id:'h4',total_amount:'10',currency:'USD',environment:'live'}],7);
 assert.deepEqual(result.live.totals,[{currency:'AED',amount:'0.30'},{currency:'USD',amount:'10.00'}]);
 assert.equal(result.sandbox.totals[0].amount,'3843.92');
});
test('missing prices and unverified environments are disclosed, never treated as free or live',()=>{
 const result=reservationBudget([{...booking,total_amount:null},{...booking,booking_id:'h2',environment:'unknown'}],7);
 assert.equal(result.sandbox.missing,1);assert.deepEqual(result.sandbox.totals,[]);assert.equal(result.unverified,1);assert.equal(result.live.count,0);
});
