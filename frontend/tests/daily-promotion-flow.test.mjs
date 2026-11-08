import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {loadComponent} from './helpers/loadComponent.mjs';

// Deterministic hook/timer harness to exercise the real components across renders.
function harness() {
  let cursor=0, effects=[], slots=[], pending=[], now=0, id=0;
  const timers=new Map();
  const schedule=(fn,delay=0,repeat=false)=>{const key=++id;timers.set(key,{fn,at:now+delay,delay,repeat});return key;};
  const hooks={...React,
    useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},
    useRef(initial){const i=cursor++;return slots[i] ||= {current:initial};},
    useEffect(fn,deps){const i=cursor++;const prev=effects[i];if(!prev||deps.some((d,j)=>!Object.is(d,prev.deps[j])))pending.push(()=>{prev?.cleanup?.();effects[i]={deps,cleanup:fn()};});},
    useMemo(fn,deps){const i=cursor++;const prev=slots[i];if(!prev||deps.some((d,j)=>!Object.is(d,prev.deps[j])))slots[i]={deps,value:fn()};return slots[i].value;},
    useCallback(fn,deps){return hooks.useMemo(()=>fn,deps);},
    useId(){cursor++;return 'test-dialog';}
  };
  const globals={setTimeout:(fn,d)=>schedule(fn,d),clearTimeout:key=>timers.delete(key),setInterval:(fn,d)=>schedule(fn,d,true),clearInterval:key=>timers.delete(key),requestAnimationFrame:fn=>schedule(fn,16),cancelAnimationFrame:key=>timers.delete(key),
    document:{activeElement:null,body:{style:{}},addEventListener(){},removeEventListener(){},querySelector(){}},window:{addEventListener(){},removeEventListener(){}}};
  return {hooks,globals,
    render(Component,props){cursor=0;const tree=Component(props);const jobs=pending;pending=[];jobs.forEach(fn=>fn());return tree;},
    advance(ms){const end=now+ms;while(true){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;const [key,t]=next;now=t.at;if(t.repeat)t.at+=t.delay;else timers.delete(key);t.fn();}now=end;},
    unmount(){effects.forEach(e=>e?.cleanup?.());}
  };
}
function all(tree,predicate){if(!tree||typeof tree!=='object')return [];return [...(predicate(tree)?[tree]:[]),...React.Children.toArray(tree.props?.children).flatMap(child=>all(child,predicate))];}
const loadWheel=h=>loadComponent('components/daily-promotions/DailyPromotionWheel.jsx',{'react':h.hooks,'next/image':()=>null},h.globals);

test('wheel lands once on each server sector despite ticking and parent rerenders',()=>{
  const count=loadWheel(harness()).DEFAULT_WHEEL_SECTORS.length;
  for(let slot=0;slot<count;slot++){
    const h=harness();const {default:Wheel,DEFAULT_WHEEL_SECTORS:sectors}=loadWheel(h);let done=0;
    let props={sectors,isSpinning:false,targetSlot:null,onSpinComplete:()=>done++};
    h.render(Wheel,props);
    props={...props,isSpinning:true,targetSlot:slot};h.render(Wheel,props);h.advance(16);
    for(let tick=0;tick<20;tick++){h.advance(160);props={...props,onSpinComplete:()=>done++};h.render(Wheel,props);}
    const tree=h.render(Wheel,props);const rotating=all(tree,n=>n.props?.style?.transform?.startsWith('rotate('))[0];
    const degrees=Number(rotating.props.style.transform.match(/[\d.]+/)[0]);
    assert.ok(Math.abs((degrees+slot*360/count)/360-Math.round((degrees+slot*360/count)/360))<1e-8);assert.ok(degrees>=1800);assert.equal(done,0);
    h.advance(384);assert.equal(done,0,'allow time to see the landed sector');
    h.advance(450);assert.equal(done,1);h.unmount();
  }
});

test('reduced motion reveals the same result and unmount cancels completion',()=>{
  const h=harness(),{default:Wheel}=loadWheel(h);let done=0;
  const props={isSpinning:true,targetSlot:3,reducedMotion:true,onSpinComplete:()=>done++};
  h.render(Wheel,props);h.advance(16);const tree=h.render(Wheel,props);
  const rotor=all(tree,n=>n.props?.style?.transform?.startsWith('rotate('))[0];assert.equal(rotor.props.style.transition,'none');
  h.advance(434);assert.equal(done,1);h.unmount();
  const other=harness(),{default:Other}=loadWheel(other);other.render(Other,{...props,onSpinComplete:()=>done++});other.unmount();other.advance(5000);assert.equal(done,1);
});

test('response keeps wheel mounted until landing; game launch removes the challenge dialog',async()=>{
  const h=harness();const assignment={id:'daily-1',kind:'game',state:'drawn',title:'Secret Sikka Run',game_id:'sikka-run',reward_coins:1};
  const promo={data:{assignment},spinning:true,startSession:async()=>({session_id:'daily-session'})};
  const Wheel=()=>null,Host=()=>null;
  const {default:Modal}=loadComponent('components/daily-promotions/DailyPromotionModal.jsx',{'react':h.hooks,'@/context/AccessibilityContext':{useAccessibility:()=>({reduced:false})},'./useDailyPromotion':{useDailyPromotion:()=>promo},'./DailyPromotionWheel':Wheel,'./PromoGameHost':Host},h.globals);
  let tree=h.render(Modal,{isOpen:true,onClose(){}});assert.equal(all(tree,n=>n.type===Wheel).length,1);assert.equal(all(tree,n=>n.type==='h3').length,0);
  promo.spinning=false;tree=h.render(Modal,{isOpen:true,onClose(){}});
  const play=all(tree,n=>n.type==='button'&&all(n,c=>c.type==='span'&&c.props.children==='Play Challenge').length)[0];
  await play.props.onClick();tree=h.render(Modal,{isOpen:true,onClose(){}});
  assert.equal(all(tree,n=>n.props?.role==='dialog').length,0);let game=all(tree,n=>n.type===Host)[0];assert.equal(game.props.sessionId,'daily-session');
  promo.completeGame=async()=>{promo.data.assignment={...assignment,state:'completed'};return {status:'completed',coins_awarded:1,balance:1};};
  tree=h.render(Modal,{isOpen:true,onClose(){}});game=all(tree,n=>n.type===Host)[0];
  await game.props.onComplete('daily-1',{});tree=h.render(Modal,{isOpen:true,onClose(){}});
  assert.equal(all(tree,n=>n.type===Host).length,1,'Sikka keeps its daily result screen open after a successful save');
  game.props.onClose();tree=h.render(Modal,{isOpen:true,onClose(){}});assert.equal(all(tree,n=>n.props?.role==='dialog').length,1);h.unmount();
});

test('daily Sikka submits its bound session and parcel result without creating a practice session',async()=>{
  const h=harness();let payload;let practiceRequests=0;const Arcade=()=>null;
  const {default:Sikka}=loadComponent('components/game/SikkaExperience.jsx',{'react':h.hooks,'@/context/AuthContext':{useAuth:()=>({token:'test'})},'@/app/profile/_lib/passportApi':{passportRequest:()=>{practiceRequests++;return Promise.resolve({});},notifyPassportChanged(){}},'./MasarArcadeRun':{MasarArcadeRun:Arcade}},h.globals);
  const props={promotion:{sessionId:'daily-session',onComplete:async data=>{payload=data;return {status:'retry',message:'Try again'};}}};
  let tree=h.render(Sikka,props);assert.equal(practiceRequests,0);assert.equal(tree.props.promotional,true);
  await tree.props.onComplete({score:175,distance:325,coins:5,deliveryCard:{id:'delivered'}});
  assert.equal(payload.session_id,'daily-session');assert.equal(payload.score,175);assert.equal(payload.details.parcel_delivered,true);
  tree=h.render(Sikka,props);tree.props.onRestart();assert.equal(practiceRequests,0);h.unmount();
});

test('daily Sikka result keeps reward and run coins distinct and offers one shortlist action',()=>{
  const h=harness();const {default:Result}=loadComponent('components/game/SikkaDailyResult.jsx',{'react':h.hooks,'next/image':()=>null},h.globals);
  let saved=0;const props={stats:{score:1771,distance:720,coins:33,deliveryCard:{}},result:{status:'completed',coins_awarded:1,balance:5},onSaveDestination:()=>{saved++;return true;}};
  let tree=h.render(Result,props);
  const text=JSON.stringify(tree);
  assert.match(text,/Daily Challenge Coin/);assert.match(text,/souq coins collected/);
  assert.doesNotMatch(text,/UAE Destination Unlocked|Sikka Navigation Graph/);
  const add=all(tree,n=>n.type==='button'&&all(n,c=>c.props?.children==='Add Al Fahidi to my shortlist').length)[0];
  add.props.onClick();tree=h.render(Result,props);
  assert.equal(saved,1);assert.equal(all(tree,n=>n.type==='button'&&n.props.disabled===true).length,1);
  assert.match(JSON.stringify(tree),/Al Fahidi is in your shortlist/);
  const retry=h.render(Result,{...props,result:{status:'retry'}});
  assert.match(JSON.stringify(retry),/Try the challenge again/);assert.doesNotMatch(JSON.stringify(retry),/Saved to My Passport/);
});

test('daily game host adds the canonical Al Fahidi destination without toggling it off',()=>{
  const h=harness();let stored={selections:[],brief:{}};
  const Sikka=()=>null;
  const {default:Host}=loadComponent('components/daily-promotions/PromoGameHost.jsx',{
    react:h.hooks,'next/dynamic':()=>Sikka,
    '@/hooks/useTripDraft':{useTripDraft:()=>({draft:stored,update:fn=>{stored=fn(stored);return stored;}})},
    '@/hooks/useDialogFocus':{useDialogFocus(){}}
  },h.globals);
  const tree=h.render(Host,{gameId:'sikka-run',sessionId:'daily-1',assignmentId:'a1'});
  assert.equal(tree.props.onDestinationSelect(),true);assert.equal(tree.props.onDestinationSelect(),true);
  assert.equal(stored.selections.length,1);assert.equal(stored.selections[0].id,'old-dubai-heritage');h.unmount();
});

test('initial wheel loading uses friendly copy and new draws exclude Lost Compass',()=>{
  const h=harness(),{default:Wheel,DEFAULT_WHEEL_SECTORS}=loadWheel(h);
  assert.equal(DEFAULT_WHEEL_SECTORS.length,7);assert.ok(!DEFAULT_WHEEL_SECTORS.some(s=>s.template_id==='game:tourist-arcade'));
  let tree=h.render(Wheel,{loading:true,disabled:true,onRotate(){}});
  assert.match(JSON.stringify(tree),/Preparing your daily draw/);assert.doesNotMatch(JSON.stringify(tree),/Backend Connection/);
  tree=h.render(Wheel,{disabled:false,onRotate(){}});assert.match(JSON.stringify(tree),/Rotate Wheel/);h.unmount();
});
