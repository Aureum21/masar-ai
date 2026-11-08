import {COURSES,createBallRollModel} from './engine.js';
import {createBallRollView} from './view.js';
let styleReady, mountCount=0;
function loadStyles(){return styleReady??=new Promise((resolve,reject)=>{const l=document.createElement('link');l.rel='stylesheet';l.href=new URL('./ball-roll.css',import.meta.url).href;l.onload=resolve;l.onerror=()=>{styleReady=null;reject(new Error('Ball-roll styles could not load'));};document.head.append(l);});}
const clock=t=>`${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;
const safeCall=(fn,value)=>{try{fn?.(value);}catch(e){console.error('Ball-roll host callback failed',e);}};
export async function mountBallRoll(container,options={}){
  if(!container?.append)throw new TypeError('A host element is required');
  await loadStyles();const response=await fetch(new URL('./assets/al-fahidi.json',import.meta.url));if(!response.ok)throw new Error('Al Fahidi map could not load');const map=await response.json();
  let model=createBallRollModel({...options,map}),view,disposed=false,raf,prev=0,lastUI=-1,course=model.level.index,relaxed=!!options.relaxed,pointer=null,stick={x:0,z:0},braking=false,quizId='',hitUntil=0;
  const questionId=`br-question-${++mountCount}`;
  const keys=new Set(),cleanups=[],root=document.createElement('section');root.className='br-game br-heritage';root.setAttribute('aria-label','Golden Roll Al Fahidi discovery trail');
  root.innerHTML=`<div class="br-stage">
    <div class="br-hud"><span><i></i> AL FAHIDI <small>DUBAI · UAE</small></span><div><button type="button" data-action="map" aria-label="Toggle district map" aria-pressed="false">⌖ <span>Map</span></button> <button type="button" data-action="pause" aria-label="Pause game">Ⅱ <span>Pause</span></button></div></div>
    <div class="br-overlay"><div class="br-overlay-inner"><span class="br-kicker" data-ui="overlay-kicker"></span><div class="br-orb" aria-hidden="true"><span></span></div><h2 data-ui="overlay-title"></h2><p data-ui="overlay-copy"></p><button class="br-primary" type="button" data-action="primary" data-ui="primary"></button><button class="br-text-button" type="button" data-action="replay" data-ui="replay">Explore this chapter again ↗</button></div></div>
    <div class="br-quiz" role="dialog" aria-modal="true" aria-labelledby="${questionId}" hidden><div class="br-quiz-card"><div class="br-quiz-top"><div class="br-quiz-identity"><span class="br-quiz-emblem" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3"/></svg></span><span><b>MASAR <em>AI</em></b><small>AL FAHIDI · DISCOVERY</small></span></div><b><span data-ui="quiz-award">+100</span><small data-ui="quiz-award-label">AVAILABLE</small></b></div><div class="br-quiz-steps" aria-hidden="true"><span data-story-step="0"></span><span data-story-step="1"></span><span data-story-step="2"></span></div><span class="br-quiz-number" data-ui="quiz-number"></span><h2 id="${questionId}" tabindex="-1" data-ui="question"></h2><p class="br-quiz-hint">Choose an answer. Discover a little more.</p><div class="br-answers">${[0,1,2].map(i=>`<button type="button" data-answer="${i}"><span>${String.fromCharCode(65+i)}</span><b></b></button>`).join('')}</div><div class="br-feedback" role="status" hidden><b data-ui="feedback-title"></b><p data-ui="explanation"></p><a data-ui="source" target="_blank" rel="noopener">Read the source ↗</a></div><button class="br-primary br-quiz-continue" type="button" data-action="continue" hidden>Keep exploring ↗</button><p class="br-quiz-pause">Your ball and timer are paused.</p></div></div>
    <div class="br-joystick" hidden aria-hidden="true"><span></span></div>
    <div class="br-obstacle-hint" data-ui="obstacle-hint">Space / Hop to jump obstacles · Shift to brake</div><div class="br-stage-foot"><span data-ui="status"></span><div class="br-play-controls"><button type="button" data-action="jump" aria-label="Hop over obstacle">↥ <span>Hop</span></button><button type="button" data-action="brake" aria-label="Hold to brake">◎ <span>Brake</span></button></div></div>
    <span class="br-map-credit">Map © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · stylized architecture</span>
  </div>
  <aside class="br-panel"><div class="br-panel-top"><span class="br-kicker">GOLDEN ROLL / THE HERITAGE EDITION</span><h2>Every lane<br><em>has a story.</em></h2><p>Roll through Al Fahidi’s mapped lanes. Find a story token, answer its question and turn discovery into points.</p></div>
    <div class="br-courses" role="group" aria-label="Choose a chapter">${COURSES.map((l,i)=>`<button type="button" data-course="${i}" aria-label="Chapter ${i+1}: ${l.short}"><span>0${i+1}</span><b>${l.short}</b><small>${['ARCHITECTURE','HERITAGE','CULTURE'][i]}</small></button>`).join('')}</div>
    <div class="br-current"><span class="br-kicker" data-ui="place"></span><p data-ui="subtitle"></p></div>
    <div class="br-stats"><div><span>POINTS</span><b data-ui="points">0</b></div><div><span>STORIES</span><b data-ui="stories">0 <small>/ 3</small></b></div><div><span>TIME</span><b data-ui="time">00:00</b></div></div>
    <ol class="br-route" aria-label="Story progress">${['A new perspective','A hidden detail','A story to take home'].map((label,i)=>`<li data-gate="${i}"><span class="br-gate-symbol">${['◇','⌁','✧'][i]}</span><div><b>${label}</b><small>FIND STORY 0${i+1}</small></div></li>`).join('')}</ol>
    <div class="br-next-story"><span class="br-kicker">FOLLOW THE GOLDEN LINE</span><p data-ui="next">A glowing token holds your next question.</p></div>
    <label class="br-mode"><input type="checkbox" data-ui="relaxed"><span>Take it slowly <small>Gentler rolling speed</small></span></label>
    <div class="br-guide"><span>EXPLORE WITH CURIOSITY</span><p><kbd>W A S D</kbd> / <kbd>↑ ↓ ← →</kbd> to roll<br>Drag the scene to steer on touch.<br><kbd>Space</kbd> hop · <kbd>Shift</kbd> brake<br><kbd>P</kbd> pause · <kbd>M</kbd> district map</p></div>
    <button class="br-destination" type="button" data-action="destination" hidden><span>TAKE THE STORY INTO THE REAL WORLD</span><b data-ui="destination"></b><small>Add this place to my trip ↗</small></button>
    <p class="br-note" data-ui="best"></p></aside><p class="br-sr" role="status" aria-live="polite" data-ui="announce"></p>`;
  container.replaceChildren(root);
  const $=key=>root.querySelector(`[data-ui="${key}"]`),stage=root.querySelector('.br-stage'),overlay=root.querySelector('.br-overlay'),joystick=root.querySelector('.br-joystick'),quiz=root.querySelector('.br-quiz'),panel=root.querySelector('.br-panel');
  const on=(el,type,fn,opts)=>{el.addEventListener(type,fn,opts);cleanups.push(()=>el.removeEventListener(type,fn,opts));};
  function announce(text){$('announce').textContent=text;}
  function clearInput(){keys.clear();stick={x:0,z:0};pointer=null;braking=false;joystick.hidden=true;root.querySelector('[data-action="brake"]').classList.remove('br-pressed');}
  function rebuild(index,mode=relaxed){clearInput();view?.dispose();course=index;relaxed=mode;model=createBallRollModel({map,course,relaxed,obstaclesEnabled:options.obstaclesEnabled!==false});view=createBallRollView(stage,model.level);bindCanvas();prev=0;lastUI=-1;quizId='';hitUntil=0;root.querySelector('[data-action="map"]').setAttribute('aria-pressed','false');announce(`${model.level.name} ready.`);updateUI();}
  function start(){model.start();view.canvas.focus({preventScroll:true});announce('Follow the gold line to a story token. Each correct answer earns 100 points.');updateUI();}
  function pause(){model.pause();clearInput();updateUI();}
  function resume(){model.resume();view.canvas.focus({preventScroll:true});updateUI();}
  function action(name){
    if(name==='jump'){model.jump();view.canvas.focus({preventScroll:true});return;}
    if(name==='pause'){if(model.state.status==='paused')resume();else if(model.state.status==='running')pause();return;}
    if(name==='map'){const on=view.toggleMap();root.querySelector('[data-action="map"]').setAttribute('aria-pressed',String(on));view.canvas.focus({preventScroll:true});return;}
    if(name==='replay'){rebuild(course);start();return;}
    if(name==='destination'){if(model.state.status==='won')safeCall(options.onDestinationSelect,{...model.level.destination});return;}
    if(name==='continue'){if(model.continueQuiz()){clearInput();updateUI();view.canvas.focus({preventScroll:true});}return;}
    if(name==='primary'){if(model.state.status==='ready')start();else if(model.state.status==='paused')resume();else if(model.state.status==='won'){rebuild((course+1)%COURSES.length);start();}}
  }
  function answer(index){const result=model.answer(index);if(!result)return;safeCall(options.onAnswer,{...result,courseId:model.level.id,totalPoints:model.state.points});safeCall(options.onCheckpoint,{courseId:model.level.id,id:result.id,index:model.state.answered.size,correct:result.correct});updateUI();root.querySelector('[data-action="continue"]').focus({preventScroll:true});}
  on(root,'click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.answer!==undefined){answer(Number(b.dataset.answer));return;}if(b.dataset.course!==undefined){const n=Number(b.dataset.course);if(n!==course)rebuild(n);return;}action(b.dataset.action);});
  on($('relaxed'),'change',e=>rebuild(course,e.target.checked));
  on(root,'keydown',e=>{if(model.state.status!=='quiz')return;if(['1','2','3'].includes(e.key)){e.preventDefault();answer(Number(e.key)-1);}if(e.key==='Escape'){e.preventDefault();return;}if(e.key==='Tab'){const controls=[...quiz.querySelectorAll('button:not(:disabled),a[href]')].filter(el=>!el.hidden&&el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&(document.activeElement===first||!controls.includes(document.activeElement))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||!controls.includes(document.activeElement))){e.preventDefault();first?.focus();}}});
  function bindCanvas(){const canvas=view.canvas;
    canvas.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' ','p','m','escape'].includes(k))e.preventDefault();keys.add(k);if(e.repeat)return;if(k==='p'||k==='escape')action('pause');if(k==='m')action('map');if(k===' ')action('jump');});
    canvas.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));canvas.addEventListener('blur',()=>keys.clear());
    canvas.addEventListener('pointerdown',e=>{if(e.button!==0||pointer||model.state.status!=='running')return;e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointer={id:e.pointerId,x:e.clientX,y:e.clientY};const r=stage.getBoundingClientRect();joystick.style.left=`${e.clientX-r.left}px`;joystick.style.top=`${e.clientY-r.top}px`;joystick.hidden=false;});
    canvas.addEventListener('pointermove',e=>{if(pointer?.id!==e.pointerId)return;const x=(e.clientX-pointer.x)/48,z=(e.clientY-pointer.y)/48,n=Math.max(1,Math.hypot(x,z));stick={x:x/n,z:z/n};joystick.firstElementChild.style.transform=`translate(${stick.x*24}px,${stick.z*24}px)`;});
    const end=e=>{if(pointer?.id===e.pointerId){pointer=null;stick={x:0,z:0};joystick.hidden=true;}};['pointerup','pointercancel','lostpointercapture'].forEach(t=>canvas.addEventListener(t,end));
  }
  const brake=root.querySelector('[data-action="brake"]');on(brake,'pointerdown',e=>{if(e.button!==0)return;e.preventDefault();braking=true;brake.classList.add('br-pressed');brake.setPointerCapture(e.pointerId);});for(const e of ['pointerup','pointercancel','lostpointercapture'])on(brake,e,()=>{braking=false;brake.classList.remove('br-pressed');});on(brake,'keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();braking=true;}});on(brake,'keyup',()=>braking=false);on(brake,'blur',()=>braking=false);
  on(window,'blur',pause);on(document,'visibilitychange',()=>{if(document.hidden)pause();});
  function events(){for(const e of model.drainEvents()){
    if(e.type==='hit'){hitUntil=model.state.elapsed+2.5;clearInput();announce('Mind the market cargo. Back to your last story stop; your points are safe.');safeCall(options.onObstacleHit,{courseId:model.level.id,...e});}
    if(e.type==='quiz'){clearInput();safeCall(options.onQuiz,{courseId:model.level.id,id:e.id,index:e.index});updateUI();$('question').focus({preventScroll:true});}
    if(e.type==='complete'){const r=e.result,key=`masar-ball-roll:v2:${r.courseId}:${r.mode}`;try{const old=JSON.parse(localStorage.getItem(key)||'null');if(!old||r.points>old.points||r.points===old.points&&r.elapsed<old.elapsed)localStorage.setItem(key,JSON.stringify(r));}catch{}announce(`Chapter complete. ${r.correct} correct answers, ${r.points} points.`);safeCall(options.onComplete,{...r,answers:r.answers.map(a=>({...a})),destination:{...r.destination}});}
  }}
  function updateUI(){
    const s=model.state,l=model.level,ready=s.status==='ready',paused=s.status==='paused',won=s.status==='won',inQuiz=s.status==='quiz';
    overlay.hidden=!(ready||paused||won);quiz.hidden=!inQuiz;panel.inert=inQuiz;root.classList.toggle('br-won',won);
    $('place').textContent=l.place;$('subtitle').textContent=l.subtitle;$('time').textContent=clock(s.elapsed);$('points').textContent=s.points;$('stories').innerHTML=`${s.answered.size} <small>/ 3</small>`;$('relaxed').checked=relaxed;$('relaxed').disabled=!ready;
    root.querySelectorAll('[data-course]').forEach((b,i)=>{b.classList.toggle('br-selected',i===course);b.setAttribute('aria-pressed',String(i===course));});
    root.querySelectorAll('[data-gate]').forEach((li,i)=>{const a=s.answered.get(l.quizzes[i].id);li.classList.toggle('br-done',!!a);li.classList.toggle('br-active',!a&&i===s.answered.size);li.querySelector('small').textContent=a?a.correct?'+100 POINTS · DISCOVERED':'STORY DISCOVERED':`FIND STORY 0${i+1}`;});
    const pauseButton=root.querySelector('[data-action="pause"]');pauseButton.disabled=ready||won||inQuiz;pauseButton.setAttribute('aria-label',paused?'Resume game':'Pause game');pauseButton.innerHTML=paused?'▷ <span>Resume</span>':'Ⅱ <span>Pause</span>';root.querySelector('[data-action="map"]').disabled=inQuiz;
    $('status').textContent=won?'AL FAHIDI · A LITTLE MORE FAMILIAR':s.answered.size===3?'STORIES DISCOVERED · FOLLOW THE LINE TO THE FINISH':`STORY 0${Math.min(3,s.answered.size+1)} / 03 · FOLLOW THE GOLDEN LINE`;
    $('obstacle-hint').hidden=s.status!=='running'||(s.elapsed>6&&s.elapsed>hitUntil);$('obstacle-hint').textContent=s.elapsed<hitUntil?'Mind the cargo. Back to your last story stop · points kept.':'Space / Hop to jump obstacles · Shift to brake';
    $('next').textContent=s.answered.size===3?'You have all three stories. Reach the mint finish ring.':'Roll into the next glowing token. A correct answer earns 100 points.';
    $('overlay-kicker').textContent=won?'AL FAHIDI · CHAPTER COMPLETE':paused?'TAKE YOUR TIME':`AL FAHIDI / CHAPTER 0${course+1}`;
    $('overlay-title').textContent=won?'Take a story with you.':paused?'The lanes can wait.':l.name;
    $('overlay-copy').textContent=won?`${s.points} points · ${s.result.correct}/3 correct · ${clock(s.elapsed)}. Continue discovering this neighbourhood.`:paused?'Your ball and timer are paused. Continue when you are ready.':'Follow the lane from behind the ball. Arrows or a drag steer; Space / Hop jumps hurdles and carts. Find three story quizzes. +100 points per correct answer.';
    $('primary').textContent=won?course===2?'Explore the first chapter ↗':'Discover the next chapter ↗':paused?'Continue exploring ↗':'Enter the neighbourhood ↗';$('replay').hidden=!won;root.querySelector('.br-orb').hidden=paused;
    root.querySelector('[data-action="destination"]').hidden=!won;$('destination').textContent=l.destination.name;
    let best;try{best=JSON.parse(localStorage.getItem(`masar-ball-roll:v2:${l.id}:${relaxed?'relaxed':'classic'}`)||'null');}catch{}
    $('best').textContent=best?`Best · ${best.points} points · ${clock(best.elapsed)}. Mapped lanes; stylized buildings and quiz stops. Demo XP.`:'Mapped lanes; stylized buildings and quiz stops. Points are demo XP.';
    if(inQuiz){const r=s.activeQuiz,q=r.quiz,f=s.feedback;quiz.classList.toggle('br-quiz-wrong',!!f&&!f.correct);quiz.classList.toggle('br-quiz-success',!!f&&f.correct);root.querySelectorAll('[data-story-step]').forEach((el,i)=>{const index=l.quizzes.findIndex(a=>a.id===q.id);el.classList.toggle('br-step-done',i<index);el.classList.toggle('br-step-active',i===index);});if(quizId!==q.id){quizId=q.id;$('question').textContent=q.question;$('quiz-number').textContent=`STORY 0${l.quizzes.findIndex(a=>a.id===q.id)+1} / 03 · ${l.short.toUpperCase()}`;root.querySelectorAll('[data-answer]').forEach((b,i)=>b.querySelector('b').textContent=q.options[i]);}
      root.querySelectorAll('[data-answer]').forEach((b,i)=>{b.disabled=!!f;b.classList.toggle('br-correct',!!f&&i===q.answer);b.classList.toggle('br-incorrect',!!f&&!f.correct&&i===f.selected);});
      $('quiz-award').textContent=f?`+${f.points}`:'+100';$('quiz-award-label').textContent=f?'POINTS EARNED':'POINTS AVAILABLE';
      root.querySelector('.br-feedback').hidden=!f;root.querySelector('[data-action="continue"]').hidden=!f;
      if(f){$('feedback-title').textContent=f.correct?'Well discovered. +100 points.':'A new fact to take with you. +0 points.';$('explanation').textContent=q.explanation;$('source').textContent=`${q.source.title} ↗`;$('source').href=q.source.url;}
    }
    safeCall(options.onProgress,model.snapshot());
  }
  try{rebuild(course);}catch(e){root.remove();cleanups.forEach(fn=>fn());throw e;}
  function frame(t){if(disposed)return;const dt=prev?Math.min((t-prev)/1000,.1):0;prev=t;const steering=view.steer(stick.x+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),stick.z+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup')));model.step({...steering,brake:braking||keys.has('shift')},dt);events();view.render(model.state,t/1000,model);if(t-lastUI>100){updateUI();lastUI=t;}raf=requestAnimationFrame(frame);}
  raf=requestAnimationFrame(frame);
  return {start,pause,resume,restart(){rebuild(course);},selectCourse(index){if(!Number.isInteger(index)||!COURSES[index])throw new RangeError('Unknown chapter');rebuild(index);},snapshot:()=>model.snapshot(),dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);clearInput();cleanups.forEach(fn=>fn());view.dispose();root.remove();}};
}
