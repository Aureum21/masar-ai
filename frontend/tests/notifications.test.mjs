import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeNotifications} from '../src/lib/notifications.js';
test('account inbox accepts trip deep links and excludes external targets',()=>{
 const items=[{id:'1',deepLink:'/trips/12?day=1',read:true},{id:'2',deepLink:'https://other.test'},{id:'3',deepLink:'javascript:alert(1)'}];
 assert.deepEqual(normalizeNotifications(items),[items[0]]);
 assert.deepEqual(normalizeNotifications(null),[]);
});
