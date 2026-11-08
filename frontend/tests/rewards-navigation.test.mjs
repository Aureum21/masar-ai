import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {loadComponent} from './helpers/loadComponent.mjs';
import {renderLocalizedMarkup} from './helpers/renderLocalized.mjs';
const Pass=({children})=>React.createElement('div',null,children);
const Link=({href,children,...props})=>React.createElement('a',{href,...props},children);
const navigation={usePathname:()=>'/rewards',useRouter:()=>({push(){}})};

test('Rewards renders the Passport collection and earned coins rather than the removed perks page',()=>{
 const {default:Page}=loadComponent('app/rewards/page.jsx',{
  'next/link':Link,'next/image':()=>null,'next/navigation':navigation,
  '@/components/auth/ProtectedRoute':Pass,
  '@/config/navigation':{APP_HOME:'/explore'},
  '@/app/profile/_components/PassportCollectibles':{StampCard:()=>null,StampMemory:()=>null,PassportXP:()=>null},
  '@/i18n/LanguageSwitcher':()=>null,
  './PassportUI':{PassportShell:Pass,ResourceState:()=>null},
  '@/app/profile/_components/PassportUI':{PassportShell:Pass,ResourceState:()=>null},
  '@/app/profile/_lib/passportApi':{usePassportResource:path=>({data:{user:{name:'Test Traveller'},stamps:[],badges:[],active_trips:[],level:{},xp:0}}),passportDate:()=>''},
  '@/components/daily-promotions/DailyCoinsWidget':()=>React.createElement('div',null,'Earned Daily Challenge Coins')
 });
 const html=renderLocalizedMarkup(React.createElement(Page));
 assert.match(html,/The stamp collection/);assert.match(html,/Earned Daily Challenge Coins/);
 assert.match(html,/href="\/rewards\/redeem"/);
 assert.doesNotMatch(html,/Partner Perks|Fictional Rewards Preview|Account &amp; Preferences/);
});

test('profile root opens account settings directly',()=>{
 const {default:Page}=loadComponent('app/profile/page.jsx',{'./account/page':()=>React.createElement('h1',null,'Account settings')});
 assert.match(renderLocalizedMarkup(React.createElement(Page)),/Account settings/);
});

test('user icon links directly to account settings and rewards retains its own entry',()=>{
 const {default:Sidebar}=loadComponent('components/layout/Sidebar.jsx',{
  'next/link':Link,'next/navigation':navigation,
  '@/config/navigation':{APP_HOME:'/explore'},
  '@/i18n/LanguageSwitcher':()=>null,
  '@/context/AuthContext':{useAuth:()=>({token:'test',userEmail:'test@example.test',logout(){}})},
  '@/lib/conversationStore':{useConversations:()=>({conversations:[],deleteConversation(){}})}
 });
 const html=renderLocalizedMarkup(React.createElement(Sidebar));
 assert.match(html,/href="\/profile\/account"[^>]*aria-label="Account settings"/);
 assert.match(html,/href="\/rewards"/);
});

test('rewards tabs expose My Passport and Redeem coins with an active route',()=>{
 const {default:Tabs}=loadComponent('app/rewards/_components/RewardsTabs.jsx',{'next/link':Link,'next/navigation':navigation});
 const html=renderLocalizedMarkup(React.createElement(Tabs));
 assert.match(html,/href="\/rewards" aria-current="page"/);
 assert.match(html,/href="\/rewards\/redeem"/);
 assert.match(html,/My Passport/);assert.match(html,/Redeem coins/);
});

test('demo redemption shows coin prices, clear demo labels and insufficient balance states',()=>{
 const offers=[{id:'yas-island-demo-ticket',title:'Yas Island day out',kind:'ticket',location:'Abu Dhabi',coins_cost:80,value_label:'Sample attraction admission',description:'A demo pass',terms:'Demo only',available:true},
 {id:'mall',title:'Mall gift card',kind:'gift_card',location:'Dubai',coins_cost:50,value_label:'AED 50 sample gift card',description:'A demo gift card',terms:'Demo only',available:true}];
 for(const balance of [200,20]){
  const {RedeemContent}=loadComponent('app/rewards/redeem/page.jsx',{
   'next/link':Link,'next/image':()=>null,
   '@/components/auth/ProtectedRoute':Pass,
   '@/app/profile/_components/PassportUI':{PassportShell:Pass,ResourceState:()=>null},
   '@/context/AuthContext':{useAuth:()=>({token:'fixture'})},
   '@/app/profile/_lib/passportApi':{usePassportResource:()=>({data:{balance,earned_coins:7,offers,redemptions:[]}})},
   '@/components/daily-promotions/DailyPromotionHost':{openDailyPromotion(){}},
   '@/hooks/useDialogFocus':{useDialogFocus(){}}
  });
  const html=renderLocalizedMarkup(React.createElement(RedeemContent));
  assert.match(html,/Yas Island day out/);assert.match(html,/Mall gift card/);
  assert.match(html,/Demonstration only/);assert.match(html,/earned daily coins/);
  if(balance===20){assert.match(html,/60 more demo coins needed/);assert.match(html,/disabled/);}else assert.match(html,/Redeem demo coins/);
 }
});
