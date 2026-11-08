import {connectPreviewKeys} from '../accessibility.js';
import {mountSunsetChallenge,STAGES,CAPTURE_TIME} from '../components/sunset/index.js';
const elements=new Map(),$=s=>{if(!elements.has(s))elements.set(s,document.querySelector(s));return elements.get(s);},text=(selector,value)=>{if($(selector).textContent!==value)$(selector).textContent=value;};
$('#route').innerHTML=STAGES.map((s,i)=>`<button class="step" type="button" data-step="${i}" aria-label="Go to step ${i+1}: ${s.title}"><span class="node"><svg class="journey-ring" viewBox="0 0 64 64" aria-hidden="true"><circle class="ring-orbit" cx="32" cy="32" r="30"/><circle class="ring-base" cx="32" cy="32" r="26"/><circle class="ring-progress" cx="32" cy="32" r="26"/></svg><span class="stage-icon" aria-hidden="true">${s.icon}</span></span><span class="step-copy"><small>STEP 0${i+1}</small><strong class="step-title">${s.title}</strong><span class="step-desc">${s.copy}</span><span class="step-state">Up next</span></span></button>`).join('');
const nodes=[...document.querySelectorAll('.step')],active=['Finding the waterfront','Following the light','Taking the photo','Preparing the moment'],done=['Viewpoint found','Golden light found','Sunset captured','Preview complete'];
let demo,lastPaint=-Infinity,lastTime=-Infinity,lastPlaying=null,lastCaption='';
try{
 demo=await mountSunsetChallenge($('#scene'),{onUpdate:s=>{
  const now=performance.now();if(now-lastPaint<40&&s.time>=lastTime&&s.playing===lastPlaying)return;lastPaint=now;lastTime=s.time;lastPlaying=s.playing;
  const captions=['Find your viewpoint.','Let the light find you.','Capture the golden moment.','Share your sunset.'];const title=s.complete?'A moment worth keeping.':captions[s.stage],copy=s.complete?'Photo, time and place. Your turn next.':STAGES[s.stage].copy;
  const key=`${s.stage}-${s.complete}`;if(lastCaption!==key){lastCaption=key;text('#phase-number',String(s.stage+1).padStart(2,'0'));text('#scene-title',title);text('#scene-copy',copy);text('#status',title);}
  nodes.forEach((n,i)=>{const progress=Math.max(0,Math.min(1,(s.time-STAGES[i].at)/((STAGES[i+1]?.at??11.1)-STAGES[i].at))),finished=progress===1,current=i===s.stage&&!s.complete;n.style.setProperty('--progress',progress);n.classList.toggle('active',current);n.classList.toggle('done',finished);if(current)n.setAttribute('aria-current','step');else n.removeAttribute('aria-current');const state=n.querySelector('.step-state'),label=finished?done[i]:current?active[i]:'Up next';if(state.textContent!==label)state.textContent=label;});
  $('#route').style.setProperty('--route-progress',Math.min(1,(s.stage+s.stageProgress)/3));$('#route').classList.toggle('is-paused',!s.playing);
  $('.light-dial').style.setProperty('--golden',s.golden);text('#light-state',s.golden<.35?'Afternoon light':s.golden<.9?'The light is changing':'Golden hour');text('#sample-clock',`${s.sampleTime} · SAMPLE TIME`);
  const phone=$('#photo');phone.classList.toggle('visible',s.captured);phone.classList.toggle('submitting',s.stage===3);phone.setAttribute('aria-hidden',String(!s.captured));
  if(!s.captured&&$('#proof').hasAttribute('src'))$('#proof').removeAttribute('src');
  [...$('#proof-checks').children].forEach((n,i)=>{n.classList.toggle('ready',s.checks[i]);n.querySelector('b').textContent=s.checks[i]?'Ready · demo':'Reviewing';});
  $('#submission-progress').style.width=`${s.upload*100}%`;text('#submission-title',s.complete?'Ready for your turn':'Preparing your moment');text('#submission-copy',s.complete?'Keep the memory.':'Photo, time and place.');text('#submission-icon',s.complete?'✦':'↑');
  $('#flash').style.opacity=s.time>=CAPTURE_TIME&&s.time<CAPTURE_TIME+.18?String(.7*(1-(s.time-CAPTURE_TIME)/.18)):'0';text('#pause',s.playing?'Hold this moment':'Continue the journey');$('#pause').setAttribute('aria-pressed',String(!s.playing));
 },onCapture:({image})=>{$('#proof').src=image;}});
 connectPreviewKeys({toggle:()=>demo.toggle(),reset:()=>demo.resetView()});
 $('#loading').classList.add('hidden');$('#pause').disabled=$('#replay').disabled=false;$('#pause').onclick=()=>demo.toggle();$('#replay').onclick=()=>demo.replay();$('#reset').onclick=()=>demo.resetView();nodes.forEach((n,i)=>n.onclick=()=>{demo.seek(STAGES[i].at);demo.play();});window.addEventListener('pagehide',()=>demo.dispose(),{once:true});
}catch(error){console.error(error);$('#loading').textContent='The waterfront scene could not load. Refresh to try again.';}
