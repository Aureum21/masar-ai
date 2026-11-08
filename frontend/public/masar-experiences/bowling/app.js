import {connectPreviewKeys} from '../accessibility.js';
import {mountBowlingChallenge,STAGES,DURATION} from '../components/bowling/index.js';
const elements=new Map(),$=s=>{if(!elements.has(s))elements.set(s,document.querySelector(s));return elements.get(s);};
const text=(selector,value)=>{if($(selector).textContent!==value)$(selector).textContent=value;};
const route=$('#route'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const active=['Finding the lane','Taking the shot','Watching the strike','Taking the photo','Preparing the proof'];
const done=['Lane found','Shot released','10 pins down','Photo captured','Preview complete'];
const titles=['Find your lane.','Let it roll.','Make it a strike.','Capture the moment.','Upload your proof.'];
route.innerHTML=STAGES.map((s,i)=>`<button type="button" class="step" data-step="${i}" aria-label="Go to step ${i+1}: ${s.title}"><span class="node"><svg class="journey-ring" viewBox="0 0 64 64" aria-hidden="true"><circle class="ring-orbit" cx="32" cy="32" r="30"/><circle class="ring-base" cx="32" cy="32" r="26"/><circle class="ring-progress" cx="32" cy="32" r="26"/></svg><span class="stage-icon" aria-hidden="true">${s.icon}</span></span><span class="step-copy"><small>STEP 0${i+1}</small><strong class="step-title">${s.title}</strong><span class="step-desc">${s.copy}</span><span class="step-state">Up next</span></span></button>`).join('');
const nodes=[...route.querySelectorAll('.step')];let animation,previous=-1,lastPaint=-Infinity,lastTime=-Infinity,lastPlaying=null,lastComplete=false;
try{
 animation=await mountBowlingChallenge($('#scene'),{
  onUpdate(s){
   const now=performance.now();
   if(now-lastPaint<33&&s.playing===lastPlaying&&s.time>=lastTime&&s.time-lastTime<.12)return;
   lastPaint=now;lastTime=s.time;lastPlaying=s.playing;
   const changed=s.stage!==previous||s.complete!==lastComplete;
   if(changed){previous=s.stage;lastComplete=s.complete;
    text('#scene-title',s.complete?'Challenge complete.':titles[s.stage]);
    text('#scene-copy',s.complete?'Ten pins. Proof preview ready. Your turn next.':STAGES[s.stage].copy);
    text('#phase-number',String(s.stage+1).padStart(2,'0'));
    text('#stage-kicker',`0${s.stage+1} / ${STAGES[s.stage].title.toUpperCase()}`);
    text('#status',s.complete?'Walkthrough complete. Your turn next.':STAGES[s.stage].title);
    if(!reduced)$('.caption-copy').animate([{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'ease-out'});
   }
   nodes.forEach((node,i)=>{
    const progress=Math.max(0,Math.min(1,(s.time-STAGES[i].at)/((STAGES[i+1]?.at??11.7)-STAGES[i].at)));
    const finished=progress===1,current=i===s.stage&&!s.complete;
    node.style.setProperty('--progress',progress);node.classList.toggle('active',current);node.classList.toggle('done',finished);
    if(current)node.setAttribute('aria-current','step');else node.removeAttribute('aria-current');
    const label=finished?done[i]:current?active[i]:'Up next',state=node.querySelector('.step-state');if(state.textContent!==label)state.textContent=label;
   });
   route.classList.toggle('is-paused',!s.playing);
   route.style.setProperty('--route-progress',Math.min(1,(s.stage+s.stageProgress)/4));
   const count=String(s.pins).padStart(2,'0');if($('#pin-count').dataset.count!==count){$('#pin-count').innerHTML=`${count}<span>/10</span>`;$('#pin-count').dataset.count=count;}
   $('#flash').style.opacity=s.time>=9.35&&s.time<9.52?String(.8*(1-(s.time-9.35)/.17)):'0';
   const photo=$('#photo');photo.classList.toggle('visible',s.captured);photo.classList.toggle('submitting',s.time>=10.5);photo.setAttribute('aria-hidden',String(!s.captured));
   $('#submission-progress').style.width=`${s.upload*100}%`;
   text('#submission-icon',s.complete?'✦':'↑');text('#submission-title',s.complete?'Ready for your turn':'Preparing your proof');text('#submission-copy',s.complete?'Walkthrough complete.':'Your strike, captured.');
   if(!s.captured&&$('#proof').hasAttribute('src'))$('#proof').removeAttribute('src');
   text('#pause',s.playing?'Hold this moment':'Continue the journey');$('#pause').setAttribute('aria-pressed',String(!s.playing));
  },
  onCapture({image}){$('#proof').src=image;},
 });
 connectPreviewKeys({toggle:()=>animation.toggle(),reset:()=>animation.resetView()});
 $('#loading').classList.add('hidden');$('#pause').disabled=$('#replay').disabled=false;
 $('#pause').onclick=()=>animation.toggle();$('#replay').onclick=()=>animation.replay();$('#reset').onclick=()=>animation.resetView();
 nodes.forEach((node,i)=>node.onclick=()=>{animation.seek(STAGES[i].at);animation.play();});
 window.addEventListener('pagehide',()=>animation.dispose(),{once:true});
}catch(error){console.error(error);$('#loading').textContent='The 3D scene could not load. Refresh to try again.';}
