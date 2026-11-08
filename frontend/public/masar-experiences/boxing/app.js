import {connectPreviewKeys} from '../accessibility.js';
import { createPunchAnimation, loadAvatarAssets } from '../components/boxing/index.js';

const elements=new Map();
const $=s=>{if(!elements.has(s))elements.set(s,document.querySelector(s));return elements.get(s);};
const text=(s,value)=>{const element=$(s);value=String(value);if(element.textContent!==value)element.textContent=value;};
const startup=performance.now();let firstFrame=true,lastPaint=-Infinity,lastTime=-Infinity,lastPlaying=null;
const phases=[
  ['Find your machine.','Walk over to the punching machine in the mall arcade.'],
  ['Bring the power.','Land your punch. Score more than 600.'],
  ['Capture the moment.','Raise your phone and photograph the final score.'],
  ['Upload your proof.','Add your score photo to finish the task.']
];
const routeStarts=[0,3,10,13],routeEnds=[3,10,13,16];
const routeNames=['Find','Punch','Capture','Upload'];
const routeActive=['Finding the spot','Bringing the power','Taking the photo','Sending the proof'];
const routeDone=['Spot found','742 points','Photo captured','Proof uploaded'];
const routeNodes=[...document.querySelectorAll('.step')];
let previousRouteStatus='';
try {
  const avatarAssets=await loadAvatarAssets();
  const animation=createPunchAnimation($('#scene'),{
    avatarAssets,
    inspectHands:new URLSearchParams(location.search).has('hands'),
    reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,
    onCapture:({url,score})=>{
      const photo=$('#captured-photo');photo.src=url;
      photo.alt=`Captured photo of the punching machine showing ${score} points`;
    },
    onUpdate:({time,step,score,playing,upload,complete})=>{
      const now=performance.now();
      if(firstFrame){firstFrame=false;if(new URLSearchParams(location.search).has('perf'))console.info(`First scene frame: ${Math.round(now-startup)} ms after app module start`);}
      // DOM milestones need 30 Hz; keep WebGL animation and orbit at display Hz.
      if(now-lastPaint<33&&playing===lastPlaying&&time>=lastTime&&time-lastTime<.12)return;
      lastPaint=now;lastTime=time;lastPlaying=playing;
      text('#phase-number',String(step+1).padStart(2,'0'));
      text('#phase-title',complete?'Challenge complete.':phases[step][0]);
      text('#phase-copy',complete?'742 points. Proof uploaded. Your turn next.':phases[step][1]);
      text('#score-label',score>600?'QUALIFIED':score>0?'SCORE':'TARGET');
      text('#live-score',score>0?String(score):'600+');
      const card=$('#capture-card');card.classList.toggle('visible',time>=11.95);card.classList.toggle('uploading',time>=13);card.setAttribute('aria-hidden',String(time<11.95));
      $('#flash').style.opacity=time>11.65&&time<11.95?String((1-(time-11.65)/.3)*.8):'0';
      $('#upload-progress').style.width=`${upload*100}%`;
      text('#upload-icon',complete?'✓':'↑');
      text('#upload-title',complete?'Proof uploaded':'Uploading proof');
      text('#upload-caption',complete?'Challenge complete.':'Your score, captured.');
      routeNodes.forEach((node,index)=>{
        const progress=Math.max(0,Math.min(1,(time-routeStarts[index])/(routeEnds[index]-routeStarts[index])));
        const done=progress===1,current=index===step&&!complete;
        node.style.setProperty('--progress',progress);
        node.classList.toggle('is-current',current);node.classList.toggle('is-complete',done);node.classList.toggle('active',current);
        node.setAttribute('aria-current',current?'step':'false');
        const caption=done?routeDone[index]:current?routeActive[index]:'Up next';
        const state=node.querySelector('.journey-step-state');if(state.textContent!==caption)state.textContent=caption;
      });
      const journey=$('.journey');journey.classList.toggle('is-complete',complete);journey.classList.toggle('is-paused',!playing);
      const routeStatus=complete?'Walkthrough complete · Your turn next':`${String(step+1).padStart(2,'0')} / ${routeNames[step]}${playing?'':' · On hold'}`;
      if(routeStatus!==previousRouteStatus){text('#journey-status',routeStatus);previousRouteStatus=routeStatus;}
      const overall=routeNodes.reduce((sum,_,index)=>sum+Math.max(0,Math.min(1,(time-routeStarts[index])/(routeEnds[index]-routeStarts[index]))),0);
      $('#journey-progress').setAttribute('aria-valuenow',overall.toFixed(2));
      $('#journey-progress').setAttribute('aria-valuetext',complete?'Walkthrough complete':`${routeNames[step]}, milestone ${step+1} of 4`);
      text('#hold-journey',playing?'Hold this moment':'Continue the journey');$('#hold-journey').setAttribute('aria-pressed',String(!playing));
    }
  });
 connectPreviewKeys({toggle:()=>animation.toggle(),reset:()=>animation.resetView()});
  $('#loading').classList.add('hidden');
  $('#reset-view').addEventListener('click',()=>animation.resetView());
  $('#hold-journey').addEventListener('click',()=>animation.toggle());
  $('#restart-journey').addEventListener('click',()=>{animation.seek(0);animation.play();});
  document.querySelectorAll('[data-step]').forEach(el=>el.addEventListener('click',()=>{animation.seek(routeStarts[Number(el.dataset.step)]);animation.play();}));
  // Host app can control the same instance when embedding this demo.
  window.punchAnimation=animation;
  window.addEventListener('pagehide',()=>animation.dispose(),{once:true});
  // Reproducible review links keep pose comparisons independent of load time.
  const reviewTime=new URLSearchParams(location.search).get('pose');
  if(reviewTime!==null&&Number.isFinite(Number(reviewTime))){animation.pause();animation.seek(Math.max(0,Math.min(19,Number(reviewTime))));}
} catch(error) {
  text('#loading','The 3D scene could not start. Enable WebGL and reload in a modern browser.');
  console.error(error);
}
