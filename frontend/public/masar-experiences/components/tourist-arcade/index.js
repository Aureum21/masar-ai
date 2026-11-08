import {createArcadeModel} from './engine.js';
import {createArcadeView} from './view.js';

let stylePromise;
function stylesheet(){
  return stylePromise??=new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./arcade.css',import.meta.url).href;link.onload=resolve;link.onerror=reject;document.head.append(link);});
}
const icons={compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z"/>',map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>',pause:'<path d="M9 5v14M15 5v14"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>'};
const icon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${icons[n]}</svg>`;
const formatTime=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;

/** Self-contained game. Host receives progress, completion and next-stop events. */
export async function mountTouristArcade(container,options={}){
  if(!(container instanceof HTMLElement))throw new TypeError('A mount container is required');
  const [level]=await Promise.all([options.levelData??fetch(new URL('./assets/al-fahidi.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Map could not load');return r.json();}),stylesheet()]);
  if(options.signal?.aborted)throw new DOMException('Mount cancelled','AbortError');
  const root=document.createElement('section');root.className='mas-game';root.setAttribute('aria-label','Al Fahidi tourist destination arcade');
  root.innerHTML=`
    <div class="mas-world">
      <canvas class="mas-canvas" tabindex="0" aria-label="Al Fahidi exploration game. Arrow keys or WASD move. Click a lane to walk. H reveals a trail. Space pauses."></canvas>
      <div class="mas-world-top"><span class="mas-location"><i></i> AL FAHIDI <small>DUBAI, UAE</small></span><div class="mas-view-actions"><button data-action="map" class="mas-icon" aria-label="Map overview" title="Map overview (M)">${icon('map')}</button><button data-action="pause" class="mas-icon" aria-label="Pause expedition" title="Pause (Space)">${icon('pause')}</button></div></div>
      <div class="mas-hud"><span><small>TIME</small><b data-ui="time">00:00</b></span><span><small>FRAGMENTS</small><b data-ui="fragments">0 <em>/ 12</em></b></span><span><small>FOCUS</small><b data-ui="focus">● ● ●</b></span></div>
      <div class="mas-ready" data-ui="intro"><span class="mas-eyebrow">A SMALL ADVENTURE. A REAL DISCOVERY.</span><h3>A little lost.<br><em>A lot to discover.</em></h3><p>Step into the lanes of Old Dubai.<br>Your next destination is waiting.</p></div>
      <div class="mas-overlay" data-ui="overlay" hidden><span class="mas-medallion">${icon('compass')}</span><span class="mas-eyebrow" data-ui="overlay-kicker"></span><h3 data-ui="overlay-title"></h3><p data-ui="overlay-copy"></p><button class="mas-primary" data-action="overlay" data-ui="overlay-button"></button></div>
      <div class="mas-toast" role="status" data-ui="toast" hidden></div>
      <div class="mas-dpad" aria-label="Movement controls"><button data-dir="up" aria-label="Move forward">↑</button><button data-dir="left" aria-label="Move left">←</button><span>✦</span><button data-dir="right" aria-label="Move right">→</button><button data-dir="down" aria-label="Move backward">↓</button></div>
      <div class="mas-minimap"><canvas width="300" height="220" aria-label="Discovered district map"></canvas><div><span>N ↗</span><b data-ui="discovery">0% DISCOVERED</b></div></div>
      <div class="mas-world-foot"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows <i>·</i> Click a lane to walk</span><span>01 / HERITAGE EXPEDITION</span></div>
    </div>
    <aside class="mas-mission">
      <div class="mas-mission-label"><span>YOUR EXPEDITION</span><span>↘</span></div>
      <div class="mas-mission-title"><span class="mas-eyebrow">THREE STAMPS. ONE NEW CHAPTER.</span><h2>The lost<br>compass<span>.</span></h2><p data-ui="mission-copy">Find three hidden discoveries in Al Fahidi. Collect fragments along the way.</p></div>
      <ol class="mas-checkpoints">${level.checkpoints.map((c,i)=>`<li data-checkpoint="${i}"><span class="mas-stamp">0${i+1}</span><div><b></b><small>${i===0?'Your first discovery':'Still to discover'}</small></div><i>↗</i></li>`).join('')}</ol>
      <div class="mas-reward"><span>${icon('compass')} THE REWARD</span><strong data-ui="reward">Up to <b>600 XP</b></strong><p data-ui="reward-copy">Reveal the full map.<br>Unlock your next real-world stop.</p></div>
      <div class="mas-next" data-ui="next" hidden><span class="mas-eyebrow">YOUR NEXT REAL-WORLD STOP</span><h3>Al Seef <span>↗</span></h3><p>Keep your Old Dubai story going beside Dubai Creek.</p><button data-action="destination" class="mas-primary">Add to my journey ${icon('arrow')}</button><a href="https://www.visitdubai.com/en/explore-dubai/dubai-neighbourhoods/al-seef" target="_blank" rel="noopener">Explore Al Seef ↗</a></div>
      <div class="mas-game-actions"><label class="mas-relaxed"><input type="checkbox" data-ui="relaxed"> Relaxed mode <small>No cart penalties</small></label><button class="mas-primary" data-action="primary" data-ui="primary">Start exploring ${icon('arrow')}</button><button class="mas-secondary" data-action="restart">↻ Start a fresh expedition</button><p class="mas-tip" data-ui="tip">Watch for moving delivery carts.<br>Get bumped? Return to your last stamp.</p></div>
      <div class="mas-best" data-ui="best"></div>
    </aside>
    <div class="mas-attribution"><span>Real lanes. A playful interpretation. <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a></span><span>Game map · not real-world navigation</span></div>`;
  container.replaceChildren(root);
  const $=key=>root.querySelector(`[data-ui="${key}"]`),canvas=root.querySelector('.mas-canvas'),mini=root.querySelector('.mas-minimap canvas'),ctx=mini.getContext('2d');
  root.querySelectorAll('[data-checkpoint] b').forEach((b,i)=>b.textContent=level.checkpoints[i].name);
  const model=createArcadeModel(level,{relaxed:options.relaxed??false});$('relaxed').checked=model.state.relaxed;
  const reducedMotion=options.reducedMotion??matchMedia('(prefers-reduced-motion: reduce)').matches;
  let view;
  try{view=createArcadeView(canvas,model,{reducedMotion});}catch(error){root.remove();throw error;}
  const keys=new Set(),pressed=new Set();let disposed=false,raf=0,last=performance.now(),lastUI=-1,toastUntil=0,notified=false,best=0,pointer=null;
  try{best=Number(localStorage.getItem('masar:arcade:al-fahidi:best'))||0;}catch{}
  const paint=(key,value)=>{if($(key).textContent!==value)$(key).textContent=value;};
  function toast(message){paint('toast',message);$('toast').hidden=false;toastUntil=performance.now()+4200;}
  function send(name,detail){root.dispatchEvent(new CustomEvent(`masar:arcade:${name}`,{detail,bubbles:true,composed:true}));}
  function hint(){const path=model.hint();view.showTrail(path);if(path.length)toast(`Follow the gold trail to ${level.checkpoints[model.state.checkpoints].name.toLowerCase()}.`);}
  function start(){model.start();canvas.focus({preventScroll:true});if(options.scrollOnStart)canvas.scrollIntoView({block:'start',behavior:reducedMotion?'instant':'smooth'});}
  function reset(){keys.clear();pressed.clear();notified=false;model.reset();view.showTrail([]);updateUI();}
  function action(name){
    if(name==='primary'){if(model.state.status==='ready')start();else if(model.state.status==='paused')model.pause();else if(model.state.status==='lost')model.recover();else if(model.state.status==='won')view.toggleMap();else hint();}
    if(name==='overlay'){if(model.state.status==='lost')model.recover();else if(model.state.status==='paused')model.pause();else if(model.state.status==='won'){ $('overlay').hidden=true;view.toggleMap();}}
    if(name==='pause')model.pause();if(name==='map')view.toggleMap();if(name==='restart')reset();
    if(name==='destination'&&model.state.status==='won'){const destination={...level.destination};options.onDestinationSelect?.(destination);send('destination',destination);toast('Al Seef selected for your next chapter.');}
    updateUI();
  }
  function click(event){const button=event.target.closest('[data-action]');if(button)action(button.dataset.action);}
  function down(event){
    const key=event.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' '].includes(key))event.preventDefault();
    keys.add(key);if(event.repeat)return;
    if(key===' '){if(model.state.status==='ready')start();else model.pause();}
    if(key==='escape'&&model.state.status==='running')model.pause();if(key==='h')hint();if(key==='m')view.toggleMap();
  }
  function up(event){keys.delete(event.key.toLowerCase());}
  function blur(){keys.clear();pressed.clear();if(model.state.status==='running')model.pause();}
  function visibility(){if(document.hidden)blur();}
  function pointerDown(event){if(event.button!==0)return;pointer={x:event.clientX,y:event.clientY,id:event.pointerId};canvas.setPointerCapture(event.pointerId);canvas.focus({preventScroll:true});}
  function pointerUp(event){if(pointer?.id!==event.pointerId)return;const small=Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)<10;pointer=null;if(small){const p=view.groundPoint(event.clientX,event.clientY);if(p)model.setTarget(p);}}
  const dpadHandlers=[];
  root.querySelectorAll('[data-dir]').forEach(button=>{
    const begin=e=>{e.preventDefault();pressed.add(button.dataset.dir);button.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});};
    const end=()=>pressed.delete(button.dataset.dir);button.addEventListener('pointerdown',begin);for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,end);dpadHandlers.push({button,begin,end});
  });
  function miniMap(){
    const [x0,z0,x1,z1]=level.bounds,sx=280/(x1-x0),sz=190/(z1-z0),p=a=>[10+(a[0]-x0)*sx,10+(a[1]-z0)*sz];ctx.clearRect(0,0,300,220);
    ctx.fillStyle='#151a20';ctx.fillRect(0,0,300,220);
    for(const b of level.buildings){const seen=model.state.status==='won'||model.state.discovered.has(model.nearest({x:b.outline[0][0],z:b.outline[0][1]}));ctx.fillStyle=seen?'#8c7d61':'#2d3032';ctx.beginPath();b.outline.forEach((v,i)=>{const a=p(v);i?ctx.lineTo(...a):ctx.moveTo(...a);});ctx.closePath();ctx.fill();}
    ctx.strokeStyle=model.state.status==='won'?'#c8a967':'#565146';ctx.lineWidth=1.5;ctx.beginPath();for(const [a,b] of level.edges){if(model.state.status!=='won'&&!model.state.discovered.has(a)&&!model.state.discovered.has(b))continue;ctx.moveTo(...p(level.nodes[a]));ctx.lineTo(...p(level.nodes[b]));}ctx.stroke();
    level.checkpoints.forEach((c,i)=>{const a=p(level.nodes[c.node]);ctx.fillStyle=i<model.state.checkpoints?'#80b5a5':i===model.state.checkpoints?'#eeb956':'#565451';ctx.beginPath();ctx.arc(...a,4.5,0,Math.PI*2);ctx.fill();});
    const pos=p([model.state.player.x,model.state.player.z]);ctx.fillStyle='#fff4d8';ctx.beginPath();ctx.arc(...pos,4,0,Math.PI*2);ctx.fill();
  }
  let overlayDismissed=false;
  function updateUI(){
    const s=model.state,won=s.status==='won',ready=s.status==='ready',paused=s.status==='paused',lost=s.status==='lost';
    paint('time',formatTime(s.elapsed));$('fragments').innerHTML=`${s.coins.size} <em>/ 12</em>`;paint('focus',s.relaxed?'∞':['○ ○ ○','● ○ ○','● ● ○','● ● ●'][s.lives]);paint('discovery',`${Math.round(s.discovered.size/level.nodes.length*100)}% DISCOVERED`);
    root.classList.toggle('mas-has-started',!ready);root.classList.toggle('mas-won',won);$('intro').hidden=!ready;
    root.querySelectorAll('[data-checkpoint]').forEach((li,i)=>{li.classList.toggle('mas-done',i<s.checkpoints);li.classList.toggle('mas-current',i===s.checkpoints);li.querySelector('small').textContent=i<s.checkpoints?'Discovery stamped':i===s.checkpoints?'Your next discovery':'Still to discover';});
    $('relaxed').disabled=!ready;$('relaxed').closest('label').hidden=!ready;
    paint('primary',ready?'Start exploring ↗':paused?'Resume exploring ↗':lost?'Resume at last stamp ↗':won?'Explore your full map ↗':'Show me the trail ↗');
    paint('mission-copy',won?'You found your way through Al Fahidi. Your next chapter is ready.':s.checkpoints?`${3-s.checkpoints} ${3-s.checkpoints===1?'discovery':'discoveries'} to go. Keep exploring the lanes.`:'Find three hidden discoveries in Al Fahidi. Collect fragments along the way.');
    $('next').hidden=!won;$('reward').textContent=won?`${s.points} XP discovered`:'Up to 600 XP';paint('reward-copy',won?'Expedition complete. Demo points ready for your Masar rewards.':'Reveal the full map. Unlock your next real-world stop.');
    paint('best',best?`PERSONAL BEST  ·  ${best} XP`:'YOUR FIRST EXPEDITION STARTS HERE');
    $('overlay').hidden=!(paused||lost||won&&!overlayDismissed);
    if(paused||lost||won){paint('overlay-kicker',won?'AL FAHIDI · FULLY REVEALED':lost?'A FRESH PERSPECTIVE':'TAKE YOUR TIME');paint('overlay-title',won?'A new chapter awaits.':lost?'A little detour.':'The lanes can wait.');paint('overlay-copy',won?`${s.points} XP · ${formatTime(s.elapsed)} · ${s.coins.size} compass fragments` : lost?'Your discoveries are safe. Start again from your last stamp.':'Your discoveries are saved for this expedition.');paint('overlay-button',won?'See the full map ↗':lost?'Return to last stamp ↗':'Continue exploring ↗');}
    miniMap();options.onProgress?.(model.snapshot());
  }
  function frame(now){
    if(disposed)return;const dt=Math.min(.05,(now-last)/1000);last=now;
    const right=(keys.has('d')||keys.has('arrowright')||pressed.has('right')?1:0)-(keys.has('a')||keys.has('arrowleft')||pressed.has('left')?1:0),forward=(keys.has('w')||keys.has('arrowup')||pressed.has('up')?1:0)-(keys.has('s')||keys.has('arrowdown')||pressed.has('down')?1:0);
    model.step(view.screenInput(right,forward),dt);
    for(const event of model.drainEvents()){
      if(event.type==='checkpoint'){toast(`${event.checkpoint.name} · ${event.checkpoint.fact}`);options.onCheckpoint?.({index:event.index,id:event.checkpoint.id});send('checkpoint',{index:event.index,id:event.checkpoint.id});}
      if(event.type==='hit')toast('A delivery cart crossed your path. Back to your last stamp.');
      if(event.type==='notice')toast(event.message);
      if(event.type==='reset'){overlayDismissed=false;toastUntil=0;$('toast').hidden=true;}
      if(event.type==='complete'&&!notified){notified=true;best=Math.max(best,event.result.points);try{localStorage.setItem('masar:arcade:al-fahidi:best',String(best));}catch{}options.onComplete?.({...event.result});send('complete',{...event.result});}
    }
    if(now>toastUntil)$('toast').hidden=true;
    if(now-lastUI>90){updateUI();lastUI=now;}
    view.draw(dt);raf=requestAnimationFrame(frame);
  }
  // Dismissing the victory card retains the fully revealed map.
  const dismiss=event=>{if(event.target.closest('[data-action="overlay"]')&&model.state.status==='won'){overlayDismissed=true;$('overlay').hidden=true;}};
  root.addEventListener('click',dismiss);root.addEventListener('click',click);root.addEventListener('keydown',down);root.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',()=>pointer=null);
  $('relaxed').addEventListener('change',()=>model.state.relaxed=$('relaxed').checked);
  updateUI();raf=requestAnimationFrame(frame);
  const api={start,pause(){if(model.state.status==='running')model.pause();},resume(){if(model.state.status==='paused')model.pause();},reset,getState:()=>({...model.snapshot(),result:model.state.result?{...model.state.result}:null}),setTarget:p=>model.setTarget(p),showHint:hint,
    dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);keys.clear();pressed.clear();window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);root.removeEventListener('click',dismiss);root.removeEventListener('click',click);root.removeEventListener('keydown',down);root.removeEventListener('keyup',up);canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointerup',pointerUp);view.dispose();root.remove();}
  };
  options.signal?.addEventListener('abort',api.dispose,{once:true});return api;
}
