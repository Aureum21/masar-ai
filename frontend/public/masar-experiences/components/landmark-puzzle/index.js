import {createPuzzleModel,DIFFICULTIES} from './engine.js';
import {LANDMARKS} from './landmarks.js';
import {renderPieces} from './pieces.js';
import PHOTO_CREDITS from './credits.js';
export {LANDMARKS,DIFFICULTIES};

const icons={pin:'<path d="M18 10c0 5-6 10-6 10S6 15 6 10a6 6 0 1 1 12 0Z"/><circle cx="12" cy="10" r="2"/>',puzzle:'<path d="M9 3H4v6c4-2 4 5 0 3v8h7c-2-4 5-4 3 0h6v-7c-4 2-4-5 0-3V4h-7c2 4-5 4-3 0Z"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',spark:'<path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6L12 2Z"/>',arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',reset:'<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',pause:'<path d="M8 5v14M16 5v14"/>',check:'<path d="m5 12 4 4L19 6"/>'};
const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=s=>`${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;
const STORE='masar:puzzle:discoveries:v1';
let sheetPromise;
function stylesheet(){
  if(!sheetPromise)sheetPromise=new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./puzzle.css',import.meta.url).href;link.onload=resolve;link.onerror=()=>{sheetPromise=null;link.remove();reject(new Error('The puzzle stylesheet could not be loaded.'));};document.head.append(link);});
  return sheetPromise;
}

/** A buildless, dependency-free component. Assets resolve relative to this module. */
export async function mountLandmarkPuzzle(container,options={}){
  if(!(container instanceof Element))throw new TypeError('A puzzle mount element is required.');
  if(options.signal?.aborted)throw new DOMException('Mount cancelled','AbortError');
  const first=options.landmarkId||LANDMARKS[0].id,difficulty=options.difficulty||'easy';
  if(!LANDMARKS.some(l=>l.id===first))throw new RangeError('Unknown landmark');
  if(!DIFFICULTIES[difficulty])throw new RangeError('Unknown difficulty');
  await stylesheet();
  if(options.signal?.aborted)throw new DOMException('Mount cancelled','AbortError');
  const root=document.createElement('section');root.className='mp-game';root.setAttribute('aria-label','UAE landmark puzzle');
  root.innerHTML=`<header class="mp-collection-head"><div><span class="mp-kicker">THE UAE, PIECE BY PIECE</span><h2>Collect a little wonder.</h2></div><span class="mp-collection-count" data-ui="collection-count"></span></header>
  <nav class="mp-postcards" aria-label="Choose a landmark">${LANDMARKS.map((l,i)=>`<button type="button" class="mp-postcard" data-landmark="${l.id}" aria-pressed="false"><span class="mp-thumb"><img src="${l.image}" alt="" loading="${i?'lazy':'eager'}"><span class="mp-stamp" aria-hidden="true">${icon('check')}</span><span class="mp-number">0${i+1}</span></span><span class="mp-postcard-copy"><b>${l.shortName}</b><small>${l.emirate}</small></span></button>`).join('')}</nav>
  <div class="mp-layout"><div class="mp-studio"><div class="mp-board-head"><span data-ui="board-kicker"></span><div class="mp-board-actions"><button type="button" data-action="preview" aria-pressed="false">${icon('eye')} <span>Preview</span></button><button type="button" data-action="pause" aria-label="Pause puzzle">${icon('pause')}</button><button type="button" data-action="restart" aria-label="Restart puzzle">${icon('reset')}</button></div></div>
  <div class="mp-settings" data-ui="settings"><span class="mp-setting-label">DIFFICULTY</span><div class="mp-difficulties" role="group" aria-label="Puzzle difficulty">${Object.entries(DIFFICULTIES).map(([key,c])=>`<button type="button" data-difficulty="${key}" aria-pressed="false"><b>${c.name}</b><small>${c.size*c.size} pieces</small></button>`).join('')}</div></div>
  <div class="mp-board-mat"><div class="mp-board" data-ui="board" role="group" aria-label="Puzzle board"><div class="mp-slots" data-ui="slots"></div><div class="mp-pieces" data-ui="pieces"></div><img class="mp-reference" data-ui="reference" alt=""><div class="mp-start" data-ui="start-cover"><span class="mp-kicker">A NEW PERSPECTIVE</span><h3 data-ui="chapter"></h3><p>Every piece takes you somewhere.</p><button type="button" class="mp-gold" data-action="start">Start piecing it together ${icon('arrow')}</button></div><div class="mp-pause-cover" data-ui="pause-cover" hidden><span class="mp-kicker">TAKE YOUR TIME</span><h3>A little pause.</h3><button type="button" class="mp-gold" data-action="resume">Keep exploring ${icon('arrow')}</button></div><div class="mp-loading" data-ui="loading" role="status">Preparing your postcard…</div><div class="mp-preview-label" data-ui="preview-label" hidden>YOUR REFERENCE · TAP PREVIEW TO RETURN</div></div></div>
  <div class="mp-board-foot"><span data-ui="instruction"></span><span data-ui="time">00:00</span></div><div class="mp-credits" data-ui="credits"></div></div>
  <aside class="mp-sidebar"><span class="mp-location" data-ui="location"></span><h3 data-ui="name"></h3><p class="mp-description" data-ui="description"></p>

  <section class="mp-progress" aria-label="Puzzle progress"><div class="mp-ring" data-ui="ring"><svg viewBox="0 0 70 70" aria-hidden="true"><circle cx="35" cy="35" r="30"/><circle class="mp-ring-fill" cx="35" cy="35" r="30" pathLength="100"/></svg><b data-ui="percent">0<span>%</span></b></div><div><b data-ui="placed">0 pieces in place</b><small data-ui="moves">Your next discovery is waiting.</small></div></section>
  <div class="mp-guidance" data-ui="guidance"><span>${icon('puzzle')}</span><div><b>A little play. A new place.</b><p>Drag pieces to swap them, or tap one then another. Correct pieces stay in place.</p></div></div>
  <button type="button" class="mp-hint" data-action="hint">${icon('spark')} Find a matching pair <span>↗</span></button>
  <div class="mp-reward"><span>${icon('spark')}</span><div><b data-ui="reward"></b><small data-ui="reward-copy">Complete the postcard. Discover your next stop.</small></div></div>
  <div class="mp-destination" data-ui="destination" hidden><span class="mp-kicker">YOUR NEXT CHAPTER</span><h4>Now go see it.</h4><p data-ui="fact"></p><button type="button" class="mp-gold" data-action="destination">Add to my journey ${icon('arrow')}</button><div class="mp-after-actions"><button type="button" data-action="next">Next postcard ↗</button><a data-ui="visit" target="_blank" rel="noopener">Visitor guide ↗</a></div></div>
  <div class="mp-journey-dots" aria-label="Landmark collection">${LANDMARKS.map(l=>`<span data-dot="${l.id}" title="${l.name}">${icon('pin')}</span>`).join('')}<small data-ui="journey-label"></small></div></aside></div>
  <p class="mp-live" data-ui="live" role="status" aria-live="polite"></p>`;
  container.replaceChildren(root);
  const $=name=>root.querySelector(`[data-ui="${name}"]`),button=name=>root.querySelector(`[data-action="${name}"]`);
  const emit=(name,detail)=>{root.dispatchEvent(new CustomEvent(`masar:puzzle:${name}`,{detail,bubbles:true,composed:true}));};
  const catalogue=PHOTO_CREDITS;
  let landmark=LANDMARKS.find(l=>l.id===first),level=difficulty,model,selection=null,preview=false,disposed=false,loading=false,loadSerial=0,pieces=[],drag=null,hintPair=null,hintTimer=0,notified=false;
  const sessions=new Map(),imageCache=new Map();
  let collection={};
  function refreshCollection(){try{const saved=JSON.parse(localStorage.getItem(STORE)||'{}');for(const l of LANDMARKS){const r=saved[l.id];if(r&&[150,250,400].includes(r.points))collection[l.id]={points:Math.max(collection[l.id]?.points||0,r.points)};}}catch{}}
  refreshCollection();
  const say=message=>{$('live').textContent=message;};
  function paintCredit(){const c=catalogue[landmark.id];$('credits').innerHTML=c?`Photo: <a href="${escape(c.source)}" target="_blank" rel="noopener">${escape(c.author)}</a> · <a href="${escape(c.licenseUrl)}" target="_blank" rel="noopener">${escape(c.license)}</a> · Puzzle pieces crop the original.`:'';}
  function imageFor(l){if(!imageCache.has(l.id))imageCache.set(l.id,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{imageCache.delete(l.id);reject(new Error('The landmark photograph could not be loaded.'));};img.src=l.image;}));return imageCache.get(l.id);}
  async function load(id=landmark.id,newLevel=level,restart=false){
    if(disposed)return;
    if(!LANDMARKS.some(l=>l.id===id)||!DIFFICULTIES[newLevel])throw new RangeError('Unknown landmark or difficulty');
    model?.pause();cancelDrag();landmark=LANDMARKS.find(l=>l.id===id);level=newLevel;
    const serial=++loadSerial,key=`${id}:${level}`;loading=true;preview=false;selection=null;hintPair=null;clearTimeout(hintTimer);notified=false;
    model=!restart&&sessions.has(key)?sessions.get(key):createPuzzleModel({landmarkId:id,difficulty:level});sessions.set(key,model);
    if(model.snapshot().status==='paused')model.resume();
    $('loading').hidden=false;$('loading').textContent='Preparing your postcard…';$('reference').src=landmark.image;$('reference').alt=`Complete photograph of ${landmark.name}`;
    $('board').style.aspectRatio='3 / 2';paintCredit();update();
    try{
      const image=await imageFor(landmark);if(disposed||serial!==loadSerial)return;
      // Optional editorial framing keeps the puzzle focused on useful visual clues.
      let source=image;
      if(landmark.frame){
        source=document.createElement('canvas');source.width=image.naturalWidth;source.height=Math.round(image.naturalHeight*landmark.frame.height);
        source.getContext('2d').drawImage(image,0,Math.round(image.naturalHeight*landmark.frame.y),source.width,source.height,0,0,source.width,source.height);
        $('reference').src=source.toDataURL('image/jpeg',.94);
      }
      $('board').style.aspectRatio=`${source.naturalWidth||source.width} / ${source.naturalHeight||source.height}`;
      const n=model.snapshot().size;$('board').style.setProperty('--mp-n',n);
      $('slots').replaceChildren(...Array.from({length:n*n},()=>document.createElement('span')));
      pieces=renderPieces(source,n).map((canvas,id)=>{const el=document.createElement('button');el.type='button';el.className='mp-piece';el.dataset.piece=id;el.append(canvas);return el;});$('pieces').replaceChildren(...pieces);
      loading=false;$('loading').hidden=true;update();
    }catch(error){if(disposed||serial!==loadSerial)return;loading=true;$('loading').textContent='Couldn’t load this postcard. Choose another, or tap restart to retry.';say(error.message);}
  }
  function cancelDrag(){if(drag){drag.el.style.removeProperty('--mp-dx');drag.el.style.removeProperty('--mp-dy');drag.el.classList.remove('mp-dragging');drag=null;}}
  function update(){
    const s=model.snapshot(),ready=s.status==='ready',won=s.status==='won',paused=s.status==='paused',pct=Math.round(s.correct/s.total*100);
    root.classList.toggle('mp-ready',ready);root.classList.toggle('mp-won',won);root.classList.toggle('mp-previewing',preview);
    $('start-cover').hidden=!ready;$('pause-cover').hidden=!paused;$('preview-label').hidden=!preview;
    $('board-kicker').textContent=`POSTCARD 0${LANDMARKS.indexOf(landmark)+1} / ${landmark.category}`;$('chapter').textContent=landmark.chapter;
    $('name').textContent=landmark.name;$('location').innerHTML=`${icon('pin')}${landmark.emirate.toUpperCase()}`;$('description').textContent=landmark.description;
    $('settings').hidden=false;$('percent').innerHTML=`${pct}<span>%</span>`;$('ring').style.setProperty('--mp-progress',pct);
    $('placed').textContent=won?'A new place discovered.':`${s.correct} of ${s.total} pieces in place`;$('moves').textContent=ready?'Your next discovery is waiting.':`${s.moves} ${s.moves===1?'move':'moves'} · ${DIFFICULTIES[level].name}`;$('time').textContent=time(s.elapsed);
    $('instruction').textContent=won?'POSTCARD COMPLETE · A LITTLE CLOSER TO THE UAE':paused?'Your puzzle is safe. Continue when you’re ready.':ready?'YOUR NEXT JOURNEY STARTS WITH A SINGLE PIECE':preview?'Look for shapes, colours, and the horizon.':selection!==null?'Now tap another loose piece to swap.':'DRAG TO SWAP · OR TAP TWO PIECES · GOLD DOTS ARE LOCKED';
    $('guidance').hidden=won;button('hint').hidden=ready||won;button('hint').disabled=paused||preview||loading;
    button('preview').disabled=ready||won||paused||loading;button('preview').setAttribute('aria-pressed',String(preview));button('pause').disabled=ready||won||loading;button('pause').setAttribute('aria-label',paused?'Resume puzzle':'Pause puzzle');button('start').disabled=loading;
    $('reward').textContent=won?`${s.result.points} XP · postcard complete`:`${DIFFICULTIES[level].points} XP to discover`;
    $('reward-copy').textContent=won?'Discovery saved on this device. Demo points.':'Complete the postcard. Discover your next stop.';
    $('destination').hidden=!won;$('fact').textContent=landmark.fact;$('visit').href=landmark.url;
    button('destination').firstChild.textContent=options.purpose==='post-visit'?'Save this travel memory ':'Add to my journey ';
    root.querySelectorAll('[data-landmark]').forEach(el=>{const active=el.dataset.landmark===landmark.id;el.setAttribute('aria-pressed',String(active));el.classList.toggle('mp-collected',!!collection[el.dataset.landmark]);});
    root.querySelectorAll('[data-difficulty]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.difficulty===level)));
    const count=Object.keys(collection).length;$('collection-count').innerHTML=`<b>${count.toString().padStart(2,'0')}</b><span>/ 05 DISCOVERED</span>`;
    root.querySelectorAll('[data-dot]').forEach(el=>el.classList.toggle('mp-dot-done',!!collection[el.dataset.dot]));$('journey-label').textContent=count===5?'YOUR UAE COLLECTION IS COMPLETE':`${count} OF 5 POSTCARDS DISCOVERED`;
    pieces.forEach((el,id)=>{const slot=s.tiles.indexOf(id),locked=id===slot;el.style.setProperty('--mp-x',`${slot%s.size*100}%`);el.style.setProperty('--mp-y',`${Math.floor(slot/s.size)*100}%`);el.classList.toggle('mp-locked',locked);el.classList.toggle('mp-selected',selection===slot);el.classList.toggle('mp-hinted',!!hintPair&&(slot===hintPair.from||slot===hintPair.to));el.setAttribute('aria-label',`Piece ${id+1}, row ${Math.floor(slot/s.size)+1}, column ${slot%s.size+1}${locked?', in place':''}`);el.setAttribute('aria-pressed',String(selection===slot));el.disabled=ready||won||paused||preview||loading||locked;});
  }
  function progress(){const s=model.snapshot();options.onProgress?.(s);emit('progress',s);}
  function complete(){
    const s=model.snapshot();if(s.status!=='won'||notified)return;notified=true;
    refreshCollection();
    collection[landmark.id]={points:Math.max(collection[landmark.id]?.points||0,s.result.points)};
    try{localStorage.setItem(STORE,JSON.stringify(collection));}catch{}
    const result={...s.result,sessionId:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`,purpose:options.purpose||'next-destination',destination:{id:landmark.id,name:landmark.name,emirate:landmark.emirate,url:landmark.url},collection:Object.keys(collection)};
    update();say(`${landmark.name} discovered. ${s.result.points} demo XP. Your next chapter is ready.`);options.onComplete?.(result);emit('complete',result);
    button('destination').focus({preventScroll:true});
  }
  function swap(a,b){if(loading||preview)return;if(model.swap(a,b)){selection=null;hintPair=null;update();const s=model.snapshot();say(`${s.correct} of ${s.total} pieces in place. ${s.moves} ${s.moves===1?'move':'moves'}.`);if(s.status==='playing')pieces.find(el=>!el.disabled)?.focus({preventScroll:true});progress();complete();}}
  function choose(slot){const s=model.snapshot();if(s.status!=='playing'||s.tiles[slot]===slot||preview||loading)return;
    if(selection===slot)selection=null;else if(selection===null)selection=slot;else{swap(selection,slot);return;}update();}
  function start(){if(loading||disposed)return;model.start();update();say('Puzzle started. Drag pieces, or select two pieces to swap.');progress();pieces.find(el=>!el.disabled)?.focus({preventScroll:true});if(options.scrollOnStart)root.querySelector('.mp-layout').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  function pause(){if(disposed)return;cancelDrag();preview=false;selection=null;model.pause();update();if(model.snapshot().status==='paused')say('Puzzle paused. Your pieces are safe.');}
  function resume(){if(disposed)return;model.resume();update();if(model.snapshot().status==='playing')say('Puzzle resumed. Keep piecing it together.');}
  function action(name){
    if(name==='start')start();if(name==='resume')resume();if(name==='pause'){if(model.snapshot().status==='paused')resume();else pause();}
    if(name==='restart'){void load(landmark.id,level,true);say('A fresh postcard. Start when you’re ready.');}
    if(name==='preview'&&model.snapshot().status==='playing'){preview=!preview;selection=null;update();say(preview?'Reference photograph shown. Tap preview again to return.':'Back to your puzzle.');}
    if(name==='hint'&&model.snapshot().status==='playing'&&!preview){hintPair=model.hint();if(hintPair){const s=model.snapshot();say(`Match highlighted: swap row ${Math.floor(hintPair.from/s.size)+1}, column ${hintPair.from%s.size+1} with row ${Math.floor(hintPair.to/s.size)+1}, column ${hintPair.to%s.size+1}.`);clearTimeout(hintTimer);hintTimer=setTimeout(()=>{hintPair=null;if(!disposed)update();},6500);update();progress();}}
    if(name==='next'){const next=LANDMARKS.find(l=>!collection[l.id])||LANDMARKS[(LANDMARKS.indexOf(landmark)+1)%LANDMARKS.length];void load(next.id);say(`${next.name} selected.`);}
    if(name==='destination'&&model.snapshot().status==='won'){const d={id:landmark.id,name:landmark.name,emirate:landmark.emirate,url:landmark.url,purpose:options.purpose||'next-destination'};options.onDestinationSelect?.(d);emit('destination',d);say(`${landmark.name} selected. Your host app can add this destination to your journey.`);}
  }
  async function changeDifficulty(value){
    await load(landmark.id,value);
    if(!disposed&&!loading&&value===level)say(`${DIFFICULTIES[value].name} selected: ${DIFFICULTIES[value].size**2} pieces. Your progress at other difficulties is kept during this session.`);
  }
  function click(e){const a=e.target.closest('[data-action]'),l=e.target.closest('[data-landmark]'),d=e.target.closest('[data-difficulty]'),p=e.target.closest('[data-piece]');if(p&&e.detail===0&&!p.disabled)choose(model.snapshot().tiles.indexOf(Number(p.dataset.piece)));if(a)action(a.dataset.action);if(l){void load(l.dataset.landmark);say('Postcard selected. Your other puzzles are kept during this session.');}if(d&&d.dataset.difficulty!==level)void changeDifficulty(d.dataset.difficulty);}
  function pointerdown(e){const el=e.target.closest('[data-piece]');if(!el||el.disabled||e.button!==0)return;e.preventDefault();el.focus({preventScroll:true});const s=model.snapshot();drag={el,id:e.pointerId,x:e.clientX,y:e.clientY,from:s.tiles.indexOf(Number(el.dataset.piece)),moved:false};el.setPointerCapture(e.pointerId);}
  function pointermove(e){if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)drag.moved=true;if(drag.moved){drag.el.classList.add('mp-dragging');drag.el.style.setProperty('--mp-dx',`${dx}px`);drag.el.style.setProperty('--mp-dy',`${dy}px`);}}
  function pointerup(e){if(!drag||drag.id!==e.pointerId)return;const {from,moved}=drag,rect=$('board').getBoundingClientRect(),n=model.snapshot().size,x=(e.clientX-rect.left)/rect.width,y=(e.clientY-rect.top)/rect.height;cancelDrag();if(moved){if(x>=0&&x<1&&y>=0&&y<1)swap(from,Math.floor(y*n)*n+Math.floor(x*n));}else choose(from);}
  function pieceKey(e){const el=e.target.closest('[data-piece]');if(!el)return;const s=model.snapshot(),slot=s.tiles.indexOf(Number(el.dataset.piece)),delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-s.size,ArrowDown:s.size}[e.key];
    if(delta!==undefined){e.preventDefault();let target=slot;for(let i=0;i<s.total;i++){target=(target+delta+s.total)%s.total;const next=pieces[s.tiles[target]];if(next&&!next.disabled){next.focus({preventScroll:true});break;}}}
    if(e.key===' '||e.key==='Enter'){e.preventDefault();choose(slot);}if(e.key==='Escape'){selection=null;preview=false;update();}}
  function hidden(){if(document.hidden)pause();}
  function storage(event){if(event.key===STORE&&!disposed){refreshCollection();update();}}
  root.addEventListener('click',click);root.addEventListener('pointerdown',pointerdown);root.addEventListener('pointermove',pointermove);root.addEventListener('pointerup',pointerup);root.addEventListener('pointercancel',cancelDrag);root.addEventListener('lostpointercapture',cancelDrag);root.addEventListener('keydown',pieceKey);document.addEventListener('visibilitychange',hidden);window.addEventListener('storage',storage);
  // A low-frequency clock avoids an idle render loop and pauses with the tab.
  let previous=performance.now();const clock=setInterval(()=>{const now=performance.now(),delta=(now-previous)/1000;previous=now;if(!loading&&!document.hidden){model.tick(delta);$('time').textContent=time(model.snapshot().elapsed);}},250);
  await load();
  const api={start,pause,resume,reset:()=>load(landmark.id,level,true),selectLandmark:id=>load(id),setDifficulty:value=>load(landmark.id,value),getState:()=>({...model.snapshot(),collection:Object.keys(collection)}),
    dispose(){if(disposed)return;disposed=true;loadSerial++;clearInterval(clock);clearTimeout(hintTimer);cancelDrag();document.removeEventListener('visibilitychange',hidden);window.removeEventListener('storage',storage);options.signal?.removeEventListener('abort',api.dispose);root.remove();sessions.clear();imageCache.clear();pieces=[];}
  };
  if(options.signal?.aborted){api.dispose();throw new DOMException('Mount cancelled','AbortError');}
  options.signal?.addEventListener('abort',api.dispose,{once:true});return api;
}
