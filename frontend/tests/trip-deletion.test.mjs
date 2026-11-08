import test from 'node:test';
import assert from 'node:assert/strict';
import {deleteOwnedTrip,withoutTrip,optimisticDeleteTrip} from '../src/lib/tripDeletion.js';
test('deletion uses the authenticated endpoint and removes only the selected identity',async()=>{
 const previous=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{assert.match(url,/\/api\/v1\/trips\/12$/);assert.equal(options.method,'DELETE');assert.equal(options.headers.get('Authorization'),'Bearer fixture-token');return new Response('{}',{status:200});};
 try{await deleteOwnedTrip(12,'fixture-token');assert.deepEqual(withoutTrip([{id:12},{id:13}],'12'),[{id:13}]);}finally{globalThis.fetch=previous;}
});
test('a failed delete reaches the confirmation dialog; an already deleted trip is safe to clear',async()=>{
 const previous=globalThis.fetch;
 try{
  globalThis.fetch=async()=>new Response(JSON.stringify({detail:'Please retry later'}),{status:503});
  await assert.rejects(deleteOwnedTrip(12,'fixture-token'),/Please retry later/);
  globalThis.fetch=async()=>new Response('{}',{status:404});
  await assert.doesNotReject(deleteOwnedTrip(12,'fixture-token'));
 }finally{globalThis.fetch=previous;}
});

test('trip disappears before a slow request finishes, then stays removed',async()=>{
 let items=[{id:1},{id:2}];const hiddenIds=new Set();let finish;
 const delayed=new Promise(resolve=>{finish=resolve;});
 const operation=optimisticDeleteTrip({id:1,token:'fixture',read:()=>items,publish:next=>{items=next;},hiddenIds,request:()=>delayed});
 assert.deepEqual(items,[{id:2}]);assert.equal(hiddenIds.has('1'),true);
 finish();await operation;assert.deepEqual(items,[{id:2}]);
});
test('failure restores only the failed trip and preserves other pending removals and new items',async()=>{
 let items=[{id:1},{id:2},{id:3}];const hiddenIds=new Set();let fail;
 const delayed=new Promise((resolve,reject)=>{fail=reject;});
 const operation=optimisticDeleteTrip({id:1,read:()=>items,publish:next=>{items=next;},hiddenIds,request:()=>delayed});
 hiddenIds.add('2');items=withoutTrip(items,2);items.push({id:4});
 fail(new Error('Offline'));
 await assert.rejects(operation,/Offline/);
 assert.deepEqual(items,[{id:1},{id:3},{id:4}]);
 assert.equal(hiddenIds.has('1'),false);assert.equal(hiddenIds.has('2'),true);
});
