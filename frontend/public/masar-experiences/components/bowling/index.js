import {translateExperienceText} from "../../locale.js";
import * as THREE from '../../vendor/three.module.js';
import {loadAvatarAssets,createHumanAvatar} from '../boxing/makehuman-avatar.js';
import {createAvatarBody} from '../boxing/avatar-body.js';
import {createPinSimulation,RELEASE,DURATION,STAGES} from './motion.js';
import {phoneMotion} from './phone-motion.js';
export {loadAvatarAssets,DURATION,STAGES};
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=THREE.MathUtils.clamp;
const smooth=(a,b,t)=>{const n=clamp((t-a)/(b-a),0,1);return n*n*(3-2*n);};

/** Local, embeddable demonstration. Points/evidence remain the host app's responsibility. */
export async function mountBowlingChallenge(container,{onUpdate=()=>{},onCapture=()=>{},onComplete=()=>{},signal,framing='standard',reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches}={}){
 const assets=await loadAvatarAssets();if(signal?.aborted)throw new DOMException('Mount cancelled','AbortError');
 const scene=new THREE.Scene();scene.background=new THREE.Color('#11131b');scene.fog=new THREE.Fog('#11131b',26,65);
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;container.appendChild(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(37,1,.1,100),canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','Bowling scene. Drag to orbit, scroll to zoom. Arrow keys rotate, plus and minus zoom, Home resets.');
 const world=new THREE.Group();scene.add(world);
 const mat=(color,roughness=.5,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const gold=mat('#c99948',.28,.65),dark=mat('#1a1c25',.65),black=mat('#080c13',.35),cream=mat('#f5e9d5',.3),red=mat('#a32f31',.4),wood=mat('#ae7544',.38);
 const glow=new THREE.MeshStandardMaterial({color:'#ffd897',emissive:'#ffb23e',emissiveIntensity:1.6});
 function mesh(g,m,parent=world,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 const box=(w,h,d,m,x=0,y=0,z=0,p=world)=>mesh(new THREE.BoxGeometry(w,h,d),m,p,x,y,z);
 const sphere=(r,m,p=world)=>mesh(new THREE.SphereGeometry(r,32,24),m,p);
 function label(text,w,h,{color='#f8cf7d',bg='#10151d',size=80}={}){const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const o=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex}));function set(t){ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`600 ${size}px Arial`;ctx.fillText(translateExperienceText(t),512,132);tex.needsUpdate=true;}set(text);return {o,set,tex};}
 scene.add(new THREE.HemisphereLight(0xdce6ff,0x51402a,2));
 const light=new THREE.DirectionalLight(0xffe2bd,3.5);light.position.set(-5,12,7);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-15,right:15,top:12,bottom:-12,far:40});light.shadow.normalBias=.03;scene.add(light);
 const fill=new THREE.DirectionalLight(0xb7caff,1.9);fill.position.set(8,8,-7);scene.add(fill);
 // A complete miniature venue: two flanking lanes, a central approach and gutters.
 box(26,.28,15,dark,3,-.23,0);box(8,.09,13,wood,-6,-.035,0);
 // Fine plank variation is geometry based and costs no image downloads.
 for(const laneZ of [-4.4,0,4.4]){
  box(18.8,.15,3.35,wood,4.25,-.06,laneZ);
  for(let plank=0;plank<13;plank++){const m=mat(['#bd905e','#c89b69','#b98a58','#d0a36f'][plank%4],.32);box(18.8,.025,.248,m,4.25,.025,laneZ+(plank-6)*.255);}
  for(const side of [-1,1]){box(19,.10,.32,black,4.2,-.04,laneZ+side*1.88);box(19,.14,.07,gold,4.2,.03,laneZ+side*2.10);}
  box(.07,.02,3.35,black,-4.5,.055,laneZ);
  for(let i=-3;i<=3;i++){const marker=mesh(new THREE.ConeGeometry(.052,.15,3),black,world,-.6+Math.abs(i)*.2,.06,laneZ+i*.32);marker.rotation.z=-Math.PI/2;}
 }
 // Lane-end wall with architectural ribs and warm inset strips.
 box(.45,6.5,15,black,14.3,3.1,0);
 for(let z=-7;z<=7;z+=.55)box(.1,6,.055,z%1.1===0?gold:dark,14.02,3,z);
 for(const z of [-6.8]){box(23,.035,.035,glow,2,4.7,z);box(.12,4.7,.15,gold,-8,2.35,z);}
 const mast=label('M A S A R   /   B O W L I N G   L O U N G E',10,.65,{size:42});mast.o.rotation.y=-Math.PI/2;mast.o.position.set(13.97,5.7,0);
 const score=label('LANE 01     â€¢     YOUR MOMENT',5.4,1.4,{size:59});score.o.rotation.y=-Math.PI/2;score.o.position.set(13.83,4.0,0);box(.22,1.65,5.7,gold,14,4,0);
 const pinProfile=[[.115,0],[.16,.04],[.21,.22],[.215,.35],[.16,.48],[.105,.61],[.085,.73],[.13,.83],[.14,.91],[.1,.99],[0,1.025]].map(([r,y])=>new THREE.Vector2(r,y));
 const pinGeometry=new THREE.LatheGeometry(pinProfile,32);
 const sim=createPinSimulation(),pinMeshes=[];
 for(const p of sim.pins){const g=new THREE.Group();world.add(g);mesh(pinGeometry,cream,g);for(const y of [.69,.75])mesh(new THREE.CylinderGeometry(.092,.094,.033,24),red,g,0,y,0);pinMeshes.push(g);}
 for(const laneZ of [-4.4,4.4])for(const p of sim.pins){const g=new THREE.Group();g.position.set(p.x,.06,p.z+laneZ);world.add(g);mesh(pinGeometry,cream,g);for(const y of [.69,.75])mesh(new THREE.CylinderGeometry(.092,.094,.033,16),red,g,0,y,0);}
 const ballGroup=new THREE.Group();world.add(ballGroup);const ballMat=new THREE.MeshPhysicalMaterial({color:'#203d53',metalness:.5,roughness:.21,clearcoat:1,clearcoatRoughness:.12});sphere(.29,ballMat,ballGroup);
 const ballStripe=mesh(new THREE.TorusGeometry(.291,.012,8,64),gold,ballGroup);ballStripe.rotation.y=.6;
 for(const [x,y] of [[-.065,.12],[.065,.12],[.0,-.01]]){const hole=sphere(.038,black,ballGroup);hole.position.set(x,y,Math.sqrt(.29**2-x*x-y*y)-.012);hole.scale.z=.5;}
 // Reuse MASAR's weighted human, continuous garment and articulated fingers.
 const actor=new THREE.Group();world.add(actor);const torso=new THREE.Group();torso.position.y=1.43;actor.add(torso);const head=new THREE.Group();torso.add(head);
 const fabric=new THREE.MeshPhysicalMaterial({color:'#f4f1e9',roughness:.86,sheen:.45,side:THREE.DoubleSide});
 const human=createHumanAvatar(assets,actor,fabric),body=createAvatarBody(actor,fabric);
 const hem=body.mesh.geometry.attributes.position.array.slice(0,8*81*3);
 const shoes=[];for(const side of [-1,1]){const g=new THREE.Group();actor.add(g);box(.39,.09,.2,mat('#312924'),.06,.065,side*.23,g);box(.16,.045,.21,gold,.09,.12,side*.23,g);shoes.push(g);}
 // Rounded chassis, recessed screen, lens cluster and physical side controls.
 const phone=new THREE.Group();torso.add(phone);
 const phoneMetal=mat('#616b78',.22,.9),phoneGlass=mat('#17212d',.16,.5);
 function roundedPhone(w,h,d,r,material,x=0,y=0,z=0){
  const shape=new THREE.Shape();shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,curveSegments:10});geometry.translate(0,0,-d/2);return mesh(geometry,material,phone,x,y,z);
 }
 roundedPhone(.25,.49,.034,.024,phoneMetal);
 roundedPhone(.235,.474,.008,.021,phoneGlass,0,0,.021);
 roundedPhone(.23,.463,.006,.02,black,0,0,-.022);
 roundedPhone(.085,.124,.012,.016,phoneMetal,-.061,.155,.032);
 for(const y of [.127,.18]){const rim=sphere(.024,phoneMetal,phone);rim.position.set(-.061,y,.043);rim.scale.z=.30;const lens=sphere(.018,black,phone);lens.position.set(-.061,y,.05);lens.scale.z=.28;const shine=sphere(.005,mat('#718baf',.1,.5),phone);shine.position.set(-.065,y+.004,.055);shine.scale.z=.2;}
 box(.006,.058,.018,phoneMetal,.128,.065,0,phone);for(const y of [.065,.13])box(.006,.041,.018,phoneMetal,-.128,y,0,phone);
 const screenMaterial=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false});
 const screen=mesh(new THREE.PlaneGeometry(.209,.157),screenMaterial,phone,0,.035,-.027);screen.rotation.y=Math.PI;
 // Camera interface stays visible around the live view and captured photograph.
 const screenUI=label('PHOTO',.16,.027,{size:105,color:'#f0c56c',bg:'#080c13'});phone.add(screenUI.o);screenUI.o.position.set(0,-.153,-.028);screenUI.o.rotation.y=Math.PI;
 const cameraHeader=label('CAMERA  /  1x',.18,.022,{size:94,color:'#b7c2d2',bg:'#080c13'});phone.add(cameraHeader.o);cameraHeader.o.position.set(0,.168,-.028);cameraHeader.o.rotation.y=Math.PI;
 const shutter=sphere(.025,cream,phone);shutter.position.set(0,-.195,-.028);shutter.scale.z=.08;
 box(.048,.006,.003,phoneMetal,0,.214,-.028,phone);
 const phoneFlash=sphere(.009,new THREE.MeshBasicMaterial({color:0xfff1d5}),phone);phoneFlash.position.set(.005,.155,.03);phoneFlash.visible=false;
 const photoTarget=new THREE.WebGLRenderTarget(640,480);photoTarget.texture.colorSpace=THREE.SRGBColorSpace;
 const photoCamera=new THREE.PerspectiveCamera(43,640/480,.1,60);photoCamera.position.set(7,3.5,3.8);photoCamera.lookAt(13.8,3.65,0);
 let photoUrl=null,captured=false,completed=false;
 // Render a framed view of the actual lane scoreboard, independent of user orbit.
 function renderPhoneView(){const old=renderer.getRenderTarget(),visible=actor.visible,shadows=renderer.shadowMap.autoUpdate;try{actor.visible=false;renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(photoTarget);renderer.render(scene,photoCamera);}finally{renderer.setRenderTarget(old);actor.visible=visible;renderer.shadowMap.autoUpdate=shadows;}}
 screenMaterial.map=photoTarget.texture;screenMaterial.needsUpdate=true;
 function capture(){
  renderPhoneView();const pixels=new Uint8Array(640*480*4);renderer.readRenderTargetPixels(photoTarget,0,0,640,480,pixels);
  const c=document.createElement('canvas');c.width=640;c.height=480;const ctx=c.getContext('2d'),data=ctx.createImageData(640,480);
  for(let y=0;y<480;y++)data.data.set(pixels.subarray((479-y)*640*4,(480-y)*640*4),y*640*4);
  ctx.putImageData(data,0,0);photoUrl=c.toDataURL('image/jpeg',.85);onCapture({image:photoUrl,pins:sim.pins.filter(p=>p.down).length,demo:true});captured=true;
 }
 let lastPhonePreview=-Infinity;
 const view={yaw:0,pitch:0,zoom:1};const target=V(3.2,1.1,0),offset=V(-10,10,20),orbit=new THREE.Spherical().setFromVector3(offset),pointers=new Map();let gesture=null;
 function resetView(){Object.assign(view,{yaw:0,pitch:0,zoom:1});}
 function pointerDown(e){if(e.pointerType==='mouse'&&e.button!==0)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture=null;}
 function pointerMove(e){if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const ps=[...pointers.values()],next={x:ps.reduce((s,p)=>s+p.x,0)/ps.length,y:ps.reduce((s,p)=>s+p.y,0)/ps.length,d:ps.length>1?Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y):0};if(gesture){view.yaw-=(next.x-gesture.x)*.006;view.pitch=clamp(view.pitch+(next.y-gesture.y)*.004,-.32,.55);if(next.d&&gesture.d)view.zoom=clamp(view.zoom*gesture.d/next.d,.6,1.45);}gesture=next;}
 function pointerUp(e){pointers.delete(e.pointerId);gesture=null;}
 function wheel(e){e.preventDefault();view.zoom=clamp(view.zoom*Math.exp(e.deltaY*.001),.6,1.45);}
 function key(e){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home')resetView();if(e.key==='ArrowLeft')view.yaw-=.12;if(e.key==='ArrowRight')view.yaw+=.12;if(e.key==='ArrowUp')view.pitch-=.08;if(e.key==='ArrowDown')view.pitch+=.08;if(e.key==='+'||e.key==='=')view.zoom=clamp(view.zoom*.9,.6,1.45);if(e.key==='-')view.zoom=clamp(view.zoom*1.1,.6,1.45);view.pitch=clamp(view.pitch,-.32,.55);}
 const handlers={pointerdown:pointerDown,pointermove:pointerMove,pointerup:pointerUp,pointercancel:pointerUp,lostpointercapture:pointerUp,wheel,keydown:key};for(const [name,fn] of Object.entries(handlers))canvas.addEventListener(name,fn,name==='wheel'?{passive:false}:undefined);
 const resize=new ResizeObserver(()=>{const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});resize.observe(container);
 function arm(side,end,pole){const root=V(.02,.9,side*.29),direction=end.clone().sub(root),distance=clamp(direction.length(),.06,1.055);direction.normalize();end=root.clone().addScaledVector(direction,distance);const along=(.55**2-.52**2+distance**2)/(2*distance),bend=pole.clone().sub(root);bend.addScaledVector(direction,-bend.dot(direction)).normalize();const joint=root.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,.55**2-along**2)));body.setArm(side,root,joint,end);const forward=end.clone().sub(joint).normalize(),normal=V(.05,0,-side);normal.addScaledVector(forward,-normal.dot(forward)).normalize().multiplyScalar(side);const across=forward.clone().cross(normal).normalize(),q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,forward,normal));human.setArm(side,root,joint,end,q,torso);return end;}
 let t=0,playing=!reducedMotion,disposed=false,last=performance.now(),raf=0;
 function render(){
  const approach=smooth(.45,3.45,t),follow=smooth(RELEASE,4.15,t),stand=smooth(4.2,5.1,t),celebrate=smooth(6.7,7.25,t)*(1-smooth(7.6,8.2,t)),phonePose=phoneMotion(t);
  const gait=Math.sin(approach*Math.PI*4)*Math.sin(approach*Math.PI);
  actor.position.set(-6.7+approach*2.65,.06+Math.abs(gait)*.025,0);actor.rotation.y=0;
  torso.position.set(.12*follow*(1-stand),1.43-.16*smooth(2.9,3.45,t)*(1-stand),0);torso.rotation.set(0,-.08*Math.sin(approach*Math.PI),-.38*smooth(2.7,3.45,t)*(1-stand));head.rotation.z=-torso.rotation.z*.6+.06*phonePose.lift-.17*phonePose.lower;
  shoes[0].position.x=gait*.20;shoes[1].position.x=-gait*.20;shoes[0].position.y=Math.max(0,gait)*.055;shoes[1].position.y=Math.max(0,-gait)*.055;
  body.update(torso,hem);human.update(torso,head);
  // Pendulum swing: supported setup, backswing, release, then follow-through.
  let right=V(.22,.18,.34),left=V(.18,.23,-.32);
  if(t<1.8){right.set(.28,.35,.27);left.set(.39,.30,-.15);}
  else if(t<3.05){const n=smooth(1.8,3.05,t);right.set(.28-.78*n,.35-.43*Math.sin(n*Math.PI/2),.34);left.set(.24,.23,-.38-.15*n);}
  else if(t<RELEASE){const n=smooth(3.05,RELEASE,t);right.set(-.50+1.12*n,-.08-.70*Math.sin(n*Math.PI/2),.34);left.set(.20,.18,-.63);}
  else if(t<4.35){const n=smooth(RELEASE,4.35,t);right.set(.62+.16*Math.sin(n*Math.PI),-.78+1.47*n,.34);left.set(.20,.18,-.63+.2*n);}
  else{const n=smooth(4.35,5.2,t);right.set(.62*(1-n)+.1*n,.69*(1-n)+.08*n,.34);left.set(.12,.15,-.34);}
  right.lerp(V(.30,1.17,.35),celebrate);left.lerp(V(.25,1.0,-.37),celebrate*.6);
  // The first hand reaches the pocket before the prop appears. The supporting
  // hand joins during the lift; both wrists then remain anchored in phone space.
  phone.visible=phonePose.visible;phone.position.fromArray(phonePose.position);
  const lensDirection=torso.worldToLocal(V(13.8,4.0,0)).sub(phone.position).normalize();
  const phoneRight=V(0,1,0).cross(lensDirection).normalize(),phoneUp=lensDirection.clone().cross(phoneRight).normalize();
  const aim=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(phoneRight,phoneUp,lensDirection));
  const pocket=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,Math.PI/2,-.18));
  phone.quaternion.copy(pocket).slerp(aim,phonePose.lift);
  phone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(V(1,0,0),-.20*phonePose.lower));
  const anchors=[V(-.30,-.135,.042),V(.30,-.135,.042)].map(p=>p.applyQuaternion(phone.quaternion).add(phone.position));
  right.lerp(anchors[0],phonePose.reach);left.lerp(anchors[1],phonePose.support);
  const wrist=arm(1,right,V(.10,.22,.47));arm(-1,left,V(.10,.22,-.47));
  human.grip(torso,phone,[phonePose.reach,phonePose.support]);human.fingers(t<RELEASE?.42:celebrate*.8,[phonePose.reach,phonePose.support]);human.fitPhone(phone,[phonePose.reach,phonePose.support]);
  phoneFlash.visible=phonePose.shutter>.15;
  actor.updateMatrixWorld(true);
  let down=0;if(t<RELEASE){ballGroup.position.copy(torso.localToWorld(wrist.clone().add(V(.10,-.12,0))));ballGroup.rotation.set(0,0,0);}else{down=sim.advance(t);const flight=t-RELEASE;ballGroup.position.set(sim.ball.x,Math.max(.34,.90-1.1*flight-4.9*flight*flight),sim.ball.z);ballGroup.rotation.z=-(sim.ball.x+3.6)/.29;}
  for(let i=0;i<sim.pins.length;i++){const p=sim.pins[i],o=pinMeshes[i];o.position.set(p.x,.07+Math.sin(p.tilt)*.16,p.z);o.quaternion.setFromAxisAngle(V(p.axisX,0,p.axisZ).normalize(),p.tilt);}
  const text=t<5.4?'LANE 01     â€¢     YOUR MOMENT':down===10?'STRIKE!      X      10 / 10':`${String(down).padStart(2,'0')} PINS DOWN     /     10`;if(text!==score.last){score.set(text);score.last=text;}
  if(phone.visible&&!captured&&t-lastPhonePreview>=1/12){renderPhoneView();lastPhonePreview=t;}
  if(t>=9.35&&!captured)capture();
  const stage=Math.max(0,STAGES.findLastIndex(s=>t>=s.at));onUpdate({time:t,duration:DURATION,stage,pins:down,stageProgress:clamp((t-STAGES[stage].at)/((STAGES[stage+1]?.at??DURATION)-STAGES[stage].at),0,1),captured,photo:photoUrl,playing,upload:smooth(10.5,11.7,t),complete:t>=11.7});
  // Follow the demonstration gently; user orbit offsets remain independent.
  const laneFollow=smooth(3.45,5.7,t)*(1-smooth(7.1,8.1,t));
  const captureFocus=smooth(7.8,8.65,t);
  const focus=framing==='daily'?V(3+laneFollow*4,1.2,0):V(-3.25+laneFollow*14,1.25+laneFollow*.25+.35*captureFocus,0);
  const base=new THREE.Spherical().setFromVector3(framing==='daily'?V(5.5-6*laneFollow,9,20):V(5.5-11*laneFollow,6.5,12.5));
  const spherical=new THREE.Spherical(base.radius*(1-.25*captureFocus)*view.zoom,clamp(base.phi+view.pitch,.25,1.45),base.theta+view.yaw);
  spherical.radius*=Math.max(1,(framing==='daily'?1.9:1.15)/camera.aspect);
  camera.position.copy(V().setFromSpherical(spherical).add(focus));camera.lookAt(focus);renderer.render(scene,camera);
 }
 function resetCycle(){captured=completed=false;photoUrl=null;lastPhonePreview=-Infinity;sim.reset();}
 function frame(now){
  if(disposed)return;
  const delta=Math.min((now-last)/1000,.08);last=now;
  if(playing){const next=t+delta;if(next>=DURATION){t=next%DURATION;resetCycle();}else t=next;}
  render();
  if(t>=11.7&&!completed){completed=true;onComplete({demo:true,pins:sim.pins.filter(p=>p.down).length,image:photoUrl});}
  raf=requestAnimationFrame(frame);
 }
 function replay(){t=0;playing=true;resetCycle();last=performance.now();}
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);resize.disconnect();for(const [name,fn] of Object.entries(handlers))canvas.removeEventListener(name,fn);signal?.removeEventListener('abort',dispose);const geo=new Set(),mats=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geo.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){mats.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geo.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());photoTarget.dispose();renderer.dispose();canvas.remove();}
 signal?.addEventListener('abort',dispose,{once:true});render();raf=requestAnimationFrame(frame);
 return {play(){playing=true;last=performance.now();},pause(){playing=false;},toggle(){playing=!playing;last=performance.now();},replay,resetView,dispose,getState:()=>({time:t,playing,pins:sim.pins.filter(p=>p.down).length}),seek(seconds){t=clamp(seconds,0,DURATION);resetCycle();render();}};
}
