import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderLocalizedMarkup as renderToStaticMarkup,i18nTestRequire} from './helpers/renderLocalized.mjs';
import {reservationBudget} from '../src/lib/reservationBudget.js';
import {bookingTerms} from '../src/lib/bookingTerms.js';
import {loadComponent} from './helpers/loadComponent.mjs';
const require=createRequire(import.meta.url);
function loadCard(name){
  const source=readFileSync(new URL(`../src/components/cards/${name}.jsx`,import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const compiledModule={exports:{}};
  const localRequire=id=>{
    if(id==='@/components/planning/AccessibilityFacts')return loadComponent('components/planning/AccessibilityFacts');
    if(id==='./SupportChecklist')return loadComponent('components/trips/workspace/SupportChecklist',{'@/lib/api':{apiRequest:()=>{throw Error('No API calls during render');}}});
    if(id.startsWith('@/i18n/'))return i18nTestRequire(id);
    if(id.endsWith('.css'))return {};
    if(id==='@/context/AuthContext')return {useAuth:()=>({token:null})};
    if(id==='@/lib/reservationBudget')return {reservationBudget};
    if(id==='@/lib/bookingTerms')return {bookingTerms};
    if(id==='@/lib/api')return {apiRequest:()=>{throw new Error('No API call allowed during card rendering');}};
    if(id==='@/hooks/useDialogFocus')return {useDialogFocus:()=>{}};
    if(id==='@/hooks/useHydrated')return {useHydrated:()=>false};
    if(id.startsWith('@/components/ui/'))return {__esModule:true,default:({children})=>React.createElement('span',null,children)};
    return require(id);
  };
  vm.runInNewContext(compiled,{module:compiledModule,exports:compiledModule.exports,require:localRequire});
  return compiledModule.exports.default;
}
test('planning flight cards expose selection, never a booking CTA',()=>{
  const Flight=loadCard('FlightCard');
  const markup=renderToStaticMarkup(React.createElement(Flight,{flight:{offer_id:'f1',airline:'Fixture Air',total_amount:'1200',currency:'AED',slices:[]},readOnly:true,onSelect:()=>{}}));
  assert.match(markup,/Choose this flight/);assert.doesNotMatch(markup,/Book Flight/);
});
test('planning hotel cards browse rooms without leaving for chat or hotel details',()=>{
  const Hotel=loadCard('HotelCard');
  const markup=renderToStaticMarkup(React.createElement(Hotel,{hotel:{name:'Fixture hotel',hotelId:'h1'},selectionMode:true,onBook:()=>{}}));
  assert.match(markup,/Browse Rooms/);assert.doesNotMatch(markup,/About Hotel/);
});
test('planning room cards select an offer and never prebook',()=>{
  const Room=loadCard('RoomCard');
  const markup=renderToStaticMarkup(React.createElement(Room,{room:{name:'Fixture room',offerId:'r1',price:'850',currency:'AED'},selectionMode:true,onBook:()=>{}}));
  assert.match(markup,/Choose this room/);assert.doesNotMatch(markup,/Instant Pre-Book/);
  const readonly=renderToStaticMarkup(React.createElement(Room,{room:{name:'Fixture room'},readOnly:true}));
  assert.doesNotMatch(readonly,/Instant Pre-Book|Choose this room/);
});

test('Day 1 reservation tasks appear only for selected offers and never book on render',()=>{
  const Tasks=loadCard('../trips/workspace/TripBookingTasks');
  const trip={id:1,itinerary_data:{travel_choices:{hotel:{name:'Fixture hotel'},room:{name:'Deluxe',price:'800',currency:'AED'},flight:{airline:'Fixture Air',total_amount:'1500',currency:'AED'}}}};
  const markup=renderToStaticMarkup(React.createElement(Tasks,{trip}));
  assert.match(markup,/Prebook room/);assert.match(markup,/Prebook flight/);
  assert.doesNotMatch(markup,/Book and confirm payment/);
  assert.equal(renderToStaticMarkup(React.createElement(Tasks,{trip:{id:2,itinerary_data:{}}})), '');
});

test('budget displays the booked sandbox price with an explicit simulation label',()=>{
 const Card=loadCard('../trips/workspace/ReservationBudgetCard');
 const markup=renderToStaticMarkup(React.createElement(Card,{trip:{id:7,reservations:[{trip_id:7,source:'provider',status:'CONFIRMED',kind:'hotel',booking_id:'h1',environment:'sandbox',total_amount:'3843.92',currency:'AED'}]}}));
 assert.match(markup,/Simulated booking value/);assert.match(markup,/3,843.92/);assert.match(markup,/no real payment/);assert.doesNotMatch(markup,/0 confirmed/);
});
