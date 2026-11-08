import {connectPreviewKeys} from '../accessibility.js';
import {mountHeritageChallenge,LANDMARKS,STAGES,CAPTURE_TIMES} from '../components/heritage/index.js';
const urlParams=new URLSearchParams(window.location.search);
const reqLandmark=urlParams.get('landmark')||'burj';
const isEmbedded=urlParams.get('embedded')==='true';
const isTransparent=urlParams.get('transparent')==='true'||isEmbedded;
if(isEmbedded){document.documentElement.classList.add('is-embedded');document.body.classList.add('is-embedded');}
if(isTransparent){document.documentElement.classList.add('is-transparent');document.body.classList.add('is-transparent');}
const elements=new Map(),$=s=>{if(!elements.has(s))elements.set(s,document.querySelector(s));return elements.get(s);},text=(selector,value)=>{if($(selector).textContent!==value)$(selector).textContent=value;};
$('#landmarks').innerHTML=LANDMARKS.map(p=>`<button class="landmark-tab" type="button" data-place="${p.id}" aria-pressed="${p.id===reqLandmark}"><span>${p.chapter}</span><span><b>${p.name}</b><small>${p.city}</small></span></button>`).join('');
$('#route').innerHTML=STAGES.map((s,i)=>`<button class="step" type="button" data-step="${i}" aria-label="Go to step ${i+1}: ${s.title}"><span class="node"><svg class="journey-ring" viewBox="0 0 64 64" aria-hidden="true"><circle class="ring-orbit" cx="32" cy="32" r="30"/><circle class="ring-base" cx="32" cy="32" r="26"/><circle class="ring-progress" cx="32" cy="32" r="26"/></svg><span class="stage-icon" aria-hidden="true">${s.icon}</span></span><span class="step-copy"><small>STEP 0${i+1}</small><strong class="step-title">${s.title}</strong><span class="step-desc">${s.copy}</span><span class="step-state">Up next</span></span></button>`).join('');
const nodes=[...document.querySelectorAll('.step')],placeNodes=[...document.querySelectorAll('.landmark-tab')];let demo,currentId='',lastPaint=-Infinity,lastTime=-Infinity,lastStage='',lastPlaying=null;
const active=['Finding the landmark','Looking closer','A little knowledge','Preparing discoveries'],done=['Landmark found','Three details captured','Sample answer shown','Preview complete'];
try{
 demo=await mountHeritageChallenge($('#scene'),{landmark:reqLandmark,transparent:isTransparent,onUpdate:s=>{
  const now=performance.now();if(now-lastPaint<40&&s.time>=lastTime&&s.playing===lastPlaying&&s.landmark.id===currentId)return;lastPaint=now;lastTime=s.time;lastPlaying=s.playing;
  const place=s.landmark;
  if(currentId!==place.id){currentId=place.id;text('#location',`${place.city} / ${place.name.toUpperCase()}`);text('#place-description',place.subtitle);$('#source').href=place.source;
   $('#discoveries').innerHTML=place.details.map((d,i)=>`<span class="discovery-chip"><i>${String(i+1).padStart(2,'0')}</i><span>${d.title}</span></span>`).join('');
   text('#question',place.question);$('#answers').innerHTML=place.answers.map((a,i)=>`<div class="quiz-answer"><span>${String.fromCharCode(65+i)}</span><span>${a}</span></div>`).join('');
   placeNodes.forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.place===place.id)));
  }
  const title=s.complete?'Discoveries complete.':s.stage===0?'Find your landmark.':s.stage===1?place.details[Math.max(0,s.detail)].title+'.':s.stage===2?'What did you discover?':'Share your discoveries.';
  const copy=s.complete?'Three details. A little knowledge. Your turn next.':s.stage===1?place.details[Math.max(0,s.detail)].copy:STAGES[s.stage].copy;
  const captionKey=`${place.id}-${s.stage}-${s.detail}-${s.complete}`;if(lastStage!==captionKey){lastStage=captionKey;text('#scene-title',title);text('#scene-copy',copy);text('#phase-number',String(s.stage+1).padStart(2,'0'));text('#status',title);}
  [...$('#discoveries').children].forEach((n,i)=>{n.classList.toggle('active',s.stage===1&&s.detail===i);n.classList.toggle('captured',i<s.count);});
  if($('#discovery-count').dataset.count!==String(s.count)){$('#discovery-count').innerHTML=`${s.count}<span>/3</span>`;$('#discovery-count').dataset.count=s.count;}
  nodes.forEach((n,i)=>{const progress=Math.max(0,Math.min(1,(s.time-STAGES[i].at)/((STAGES[i+1]?.at??13.2)-STAGES[i].at))),finished=progress===1,selected=i===s.stage&&!s.complete;n.style.setProperty('--progress',progress);n.classList.toggle('active',selected);n.classList.toggle('done',finished);if(selected)n.setAttribute('aria-current','step');else n.removeAttribute('aria-current');n.querySelector('.step-state').textContent=finished?done[i]:selected?active[i]:'Up next';});
  $('#route').style.setProperty('--route-progress',Math.min(1,(s.stage+s.stageProgress)/3));$('#route').classList.toggle('is-paused',!s.playing);
  const photo=$('#photo');photo.classList.toggle('visible',s.count>0);photo.classList.toggle('quiz',s.quiz);photo.classList.toggle('submitting',s.stage===3);photo.setAttribute('aria-hidden',String(s.count===0));
  const latest=Math.min(2,s.count-1);if(latest>=0){const image=s.photos[latest];if(image&&$('#proof').getAttribute('src')!==image)$('#proof').src=image;text('#photo-title',place.details[latest].title);text('#photo-tag',`DISCOVERY 0${latest+1} / 03`);text('#photo-subtitle',`${s.count} of 3 details captured`);}
  const thumbs=Object.entries(s.photos);if($('#contact-sheet').dataset.count!==`${place.id}-${s.count}`){$('#contact-sheet').innerHTML=thumbs.map(([i,image])=>`<img src="${image}" alt="${place.details[i].title}">`).join('');$('#contact-sheet').dataset.count=`${place.id}-${s.count}`;}
  [...$('#answers').children].forEach((n,i)=>n.classList.toggle('selected',s.answered&&i===place.correct));text('#answer-note',s.answered?place.explanation:'Watch the sample answer.');
  $('#submission-progress').style.width=`${s.upload*100}%`;text('#submission-icon',s.complete?'✦':'↑');text('#submission-title',s.complete?'Ready for your turn':'Preparing discoveries');text('#submission-copy',s.complete?'Your landmark. Your story.':'Three photos. One story.');
  const flash=CAPTURE_TIMES.reduce((n,at)=>Math.max(n,s.time>=at&&s.time<at+.18?.7*(1-(s.time-at)/.18):0),0);$('#flash').style.opacity=String(flash);
  text('#pause',s.playing?'Hold this moment':'Continue the journey');$('#pause').setAttribute('aria-pressed',String(!s.playing));
 }});
 connectPreviewKeys({toggle:()=>demo.toggle(),reset:()=>demo.resetView()});
 $('#loading').classList.add('hidden');$('#pause').disabled=$('#replay').disabled=false;
 $('#pause').onclick=()=>demo.toggle();$('#replay').onclick=()=>demo.replay();$('#reset').onclick=()=>demo.resetView();
 placeNodes.forEach(n=>n.onclick=()=>{demo.setLandmark(n.dataset.place);demo.play();});nodes.forEach((n,i)=>n.onclick=()=>{demo.seek(STAGES[i].at);demo.play();});window.addEventListener('pagehide',()=>demo.dispose(),{once:true});
}catch(error){console.error(error);$('#loading').textContent='The landmark scene could not load. Refresh to try again.';}
