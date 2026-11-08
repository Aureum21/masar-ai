import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {loadComponent} from './helpers/loadComponent.mjs';
import {renderLocalizedMarkup} from './helpers/renderLocalized.mjs';
import {emptyDraft} from '../src/lib/tripDraft.js';

for(const preferences of [null,{}, {interests:['Architecture'],preferred_pace:'Relaxed'}]){
 test(`plan renders for ${preferences===null?'a new account with null preferences':JSON.stringify(preferences)}`,()=>{
  const Pass=({children})=>React.createElement('div',null,children);
  const {default:Plan}=loadComponent('app/plan/page.jsx',{
   'next/navigation':{useRouter:()=>({push(){}})},
   'next/link':({children,href,...props})=>React.createElement('a',{href,...props},children),
   'next/image':()=>null,
   '@/components/auth/ProtectedRoute':Pass,
   '@/components/layout/JourneyShell':Pass,
   '@/context/AuthContext':{useAuth:()=>({user:{id:42,travel_preferences:preferences},token:'fixture'})},
   '@/hooks/useTripDraft':{useTripDraft:()=>({draft:emptyDraft(),update(){},ready:true})},
   '@/hooks/useResolvedPlaces':{useResolvedPlaces:()=>({places:[],loading:false})},
   '@/hooks/useCloudBrief':{useCloudBrief:()=>({available:false,loading:false})},
   '@/components/planning/RecentPlanningRuns':()=>null
  });
  const html=renderLocalizedMarkup(React.createElement(Plan));
  assert.match(html,/Set the scene/);
  assert.match(html,/Arrival date/);
  assert.match(html,/Travellers/);
  assert.match(html,/Let curiosity lead you/);
  assert.doesNotMatch(html,/This page couldn/);
 });
}
