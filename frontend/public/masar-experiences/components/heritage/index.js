import * as THREE from '../../vendor/three.module.js';
import {loadAvatarAssets,createHumanAvatar} from '../boxing/makehuman-avatar.js';
import {createAvatarBody} from '../boxing/avatar-body.js';
import {buildLandmarks} from './landmarks.js';
import {LANDMARKS,STAGES,DURATION,CAPTURE_TIMES,journeyAt} from './journey.js';
export {LANDMARKS,STAGES,DURATION,CAPTURE_TIMES};
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=THREE.MathUtils.clamp;
const ease=(a,b,t)=>{const n=clamp((t-a)/(b-a),0,1);return n*n*(3-2*n);};
/** Standalone local task preview. Call dispose() when the host unmounts. */
export async function mountHeritageChallenge(container,{landmark='burj',onUpdate=()=>{},onCapture=()=>{},onComplete=()=>{},signal,reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches,transparent=false,landmarkDefinition=null,buildCustomLandmark=null}={}){
 const assets=await loadAvatarAssets();if(signal?.aborted)throw new DOMException('Mount cancelled','AbortError');
 const scene=new THREE.Scene();if(!transparent){scene.background=new THREE.Color('#11161e');scene.fog=new THREE.Fog('#11161e',28,65);}
 const camera=new THREE.PerspectiveCamera(38,1,.1,100),renderer=new THREE.WebGLRenderer({antialias:true,alpha:transparent});if(transparent)renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;container.appendChild(renderer.domElement);
 const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','Explore the 3D landmark. Drag to rotate, scroll to zoom. Arrow keys rotate, plus and minus zoom. Home resets.');
 const world=new THREE.Group();scene.add(world);
 const mat=(color,roughness=.6,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const stone=mat('#cab89a',.85),gold=mat('#c5a25c',.3,.6),dark=mat('#16212c'),cream=mat('#f2ece2');
 function mesh(geo,m,p=world,x=0,y=0,z=0){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
 const box=(p,w,h,d,m,x=0,y=0,z=0)=>mesh(new THREE.BoxGeometry(w,h,d),m,p,x,y,z);
 const sphere=(p,r,m)=>mesh(new THREE.SphereGeometry(r,24,18),m,p);
 scene.add(new THREE.HemisphereLight(0xd7e9ff,0x6b5235,2.3));
 const light=new THREE.DirectionalLight(0xffe7c6,3.6);light.position.set(-7,14,8);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-12,right:12,top:14,bottom:-12,far:45});light.shadow.normalBias=.035;scene.add(light);
 const rim=new THREE.DirectionalLight(0x8bbce0,2);rim.position.set(5,8,-7);scene.add(rim);
 mesh(new THREE.CylinderGeometry(7.1,7.3,.28,100),dark,world,0,-.22,0);
 mesh(new THREE.CylinderGeometry(7,7,.09,100),stone,world,0,-.04,0);
 const rimRing=mesh(new THREE.TorusGeometry(7.03,.025,8,120),gold,world,0,.02,0);rimRing.rotation.x=Math.PI/2;
 for(let x=-6;x<=6;x++)box(world,.012,.006,Math.sqrt(49-x*x)*2,dark,x,.01,0);
 for(let z=-6;z<=6;z++)box(world,Math.sqrt(49-z*z)*2,.006,.012,dark,0,.012,z);
 // Benches and stylised date palms keep the diorama grounded in a visitor plaza.
 for(const x of [-4.8,4.8]){
  const trunk=mesh(new THREE.CylinderGeometry(.075,.12,2.2,12),mat('#887052'),world,x,1.1,-3.4);
  for(let i=0;i<8;i++){const a=i*Math.PI/4,path=new THREE.CatmullRomCurve3([V(x,2.2,-3.4),V(x+Math.cos(a)*.6,2.6,-3.4+Math.sin(a)*.6),V(x+Math.cos(a)*1.2,2.1,-3.4+Math.sin(a)*1.2)]);mesh(new THREE.TubeGeometry(path,12,.08,6,false),mat('#536c56'),world);}
  box(world,1.5,.12,.4,gold,x,.50,3.8);for(const dx of [-.55,.55])box(world,.09,.5,.3,dark,x+dx,.22,3.8);
 }
 const buildings=buildLandmarks(world);
 if(landmarkDefinition&&buildCustomLandmark)buildings[landmarkDefinition.id]=buildCustomLandmark(world);
 const markers=new THREE.Group();world.add(markers);const markerMaterial=new THREE.MeshBasicMaterial({color:'#ffcf73',transparent:true,opacity:.85,depthTest:false});
 const rings=LANDMARKS[0].details.map(()=>{const g=new THREE.Group();markers.add(g);mesh(new THREE.TorusGeometry(.22,.014,8,40),markerMaterial,g);const center=sphere(g,.04,markerMaterial);return g;});
 const actor=new THREE.Group();world.add(actor);const torso=new THREE.Group();torso.position.y=1.43;actor.add(torso);const head=new THREE.Group();torso.add(head);
 const fabric=new THREE.MeshPhysicalMaterial({color:'#f7f3eb',roughness:.88,sheen:.4,side:THREE.DoubleSide});const human=createHumanAvatar(assets,actor,fabric),body=createAvatarBody(actor,fabric),hem=body.mesh.geometry.attributes.position.array.slice(0,8*81*3);
 const feet=[];for(const side of [-1,1]){const foot=new THREE.Group();actor.add(foot);box(foot,.38,.07,.2,mat('#302920'),.06,.055,side*.22);box(foot,.13,.04,.2,gold,.09,.105,side*.22);feet.push(foot);}
 const phone=new THREE.Group();torso.add(phone);
 function panel(w,h,d,r,m,x=0,y=0,z=0){const shape=new THREE.Shape();shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const g=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,curveSegments:8});g.translate(0,0,-d/2);return mesh(g,m,phone,x,y,z);}
 panel(.25,.49,.034,.024,mat('#697582',.23,.85));panel(.232,.468,.007,.02,dark,0,0,-.023);panel(.088,.12,.015,.018,dark,-.06,.15,.027);
 for(const y of [.125,.18]){const lens=sphere(phone,.022,dark);lens.position.set(-.06,y,.043);lens.scale.z=.3;}
 const photoTarget=new THREE.WebGLRenderTarget(480,640);photoTarget.texture.colorSpace=THREE.SRGBColorSpace;
 const screen=mesh(new THREE.PlaneGeometry(.214,.285),new THREE.MeshBasicMaterial({map:photoTarget.texture,toneMapped:false}),phone,0,.018,-.029);screen.rotation.y=Math.PI;
 const shutter=sphere(phone,.022,cream);shutter.position.set(0,-.182,-.03);shutter.scale.z=.1;
 const photoCamera=new THREE.PerspectiveCamera(46,.75,.1,70);
 let current=landmarkDefinition??LANDMARKS.find(l=>l.id===landmark)??LANDMARKS[0],time=0,playing=!reducedMotion,disposed=false,completeSent=false,last=performance.now(),raf=0,lastPreview=-Infinity;
 const photos=new Map(),orbit={yaw:0,pitch:0,zoom:1},pointers=new Map();let gesture=null;
 function setVisible(){for(const [id,g] of Object.entries(buildings))g.visible=id===current.id;}
 setVisible();
 function arm(side,target,pole){const shoulder=V(.02,.9,side*.29),dir=target.clone().sub(shoulder),d=clamp(dir.length(),.04,1.055);dir.normalize();const end=shoulder.clone().addScaledVector(dir,d),along=(.55**2-.52**2+d*d)/(2*d),bend=pole.clone().sub(shoulder);bend.addScaledVector(dir,-bend.dot(dir)).normalize();const elbow=shoulder.clone().addScaledVector(dir,along).addScaledVector(bend,Math.sqrt(Math.max(0,.55**2-along*along)));body.setArm(side,shoulder,elbow,end);const forward=end.clone().sub(elbow).normalize(),normal=V(.03,0,-side);normal.addScaledVector(forward,-normal.dot(forward)).normalize().multiplyScalar(side);const across=forward.clone().cross(normal).normalize(),q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,forward,normal));human.setArm(side,shoulder,elbow,end,q,torso);}
 function phoneView(detail){actor.updateMatrixWorld(true);photoCamera.position.copy(phone.localToWorld(V(0,.03,.08)));photoCamera.lookAt(V(...current.details[detail].target));const previous=renderer.getRenderTarget(),visible=actor.visible,shadow=renderer.shadowMap.autoUpdate;try{actor.visible=false;markers.visible=false;renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(photoTarget);if(transparent)renderer.setClearColor(0x11161e,1);renderer.render(scene,photoCamera);}finally{if(transparent)renderer.setClearColor(0x000000,0);renderer.setRenderTarget(previous);renderer.shadowMap.autoUpdate=shadow;actor.visible=visible;markers.visible=true;}}
 function photograph(detail){phoneView(detail);const pixels=new Uint8Array(480*640*4);renderer.readRenderTargetPixels(photoTarget,0,0,480,640,pixels);const c=document.createElement('canvas');c.width=480;c.height=640;const ctx=c.getContext('2d'),data=ctx.createImageData(480,640);for(let y=0;y<640;y++)data.data.set(pixels.subarray((639-y)*480*4,(640-y)*480*4),y*480*4);ctx.putImageData(data,0,0);const image=c.toDataURL('image/jpeg',.82);photos.set(detail,image);onCapture({landmark:current.id,detail,image,demo:true});}
 function draw(){
  const state=journeyAt(time),walk=ease(0,1.85,time),gait=Math.sin(walk*Math.PI*5)*Math.sin(walk*Math.PI),raise=ease(2.1,2.9,time),support=ease(2.4,3.0,time),review=ease(8.4,9.15,time);
  actor.position.set(-5.5+walk*2.9,.04+Math.abs(gait)*.025,4.4-walk*(current.id==='mosque'?.15:.8));actor.rotation.y=Math.atan2(actor.position.z,-actor.position.x);
  torso.position.y=1.43+Math.sin(time*2.4)*.007;torso.rotation.set(0,gait*.025,-.018*Math.abs(gait));head.rotation.z=.04*raise-.13*review;body.update(torso,hem);human.update(torso,head);
  feet[0].position.x=gait*.13;feet[1].position.x=-gait*.13;feet[0].position.y=Math.max(0,gait)*.045;feet[1].position.y=Math.max(0,-gait)*.045;
  const detail=Math.max(0,state.detail);const target=V(...current.details[Math.max(0,detail-1)].target).lerp(V(...current.details[detail].target),ease(2+detail*2.2,2.45+detail*2.2,time));actor.updateMatrixWorld(true);
  phone.visible=time>=2.35;phone.position.copy(V(.25,.22,.25).lerp(V(.60,1.02,.015).lerp(V(.44,.68,.08),review),raise));
  const direction=torso.worldToLocal(target.clone()).sub(phone.position).normalize();const rightAxis=V(0,1,0).cross(direction).normalize(),up=direction.clone().cross(rightAxis).normalize(),aim=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(rightAxis,up,direction));
  phone.quaternion.setFromEuler(new THREE.Euler(0,Math.PI/2,-.1)).slerp(aim,raise*(1-review*.7));
  const rightTarget=V(.08+gait*.1,.08,.34),leftTarget=V(.08-gait*.1,.10,-.34);
  const anchors=[V(-.30,-.135,.042),V(.30,-.135,.042)].map(p=>p.applyQuaternion(phone.quaternion).add(phone.position));
  rightTarget.lerp(anchors[0],ease(1.85,2.35,time));leftTarget.lerp(anchors[1],support);
  arm(1,rightTarget,V(.06,.18,.49));arm(-1,leftTarget,V(.06,.18,-.49));const nearGrip=ease(1.85,2.35,time);human.grip(torso,phone,[nearGrip,support]);human.fingers(0,[nearGrip,support]);human.fitPhone(phone,[nearGrip,support]);
  for(let i=0;i<3;i++){const marker=rings[i];marker.position.fromArray(current.details[i].target);marker.visible=time>=2&&(state.detail===i||photos.has(i));const scale=state.detail===i?1+Math.sin(time*4)*.1:.65;marker.scale.setScalar(scale);marker.lookAt(camera.position);}
  if(phone.visible&&time<9&&time-lastPreview>1/10){phoneView(detail);lastPreview=time;}
  for(let i=0;i<3;i++)if(time>=CAPTURE_TIMES[i]&&!photos.has(i))photograph(i);
  const focus=V(current.id==='burj'?0:0,current.id==='burj'?3.8:1.7,0);
  const q=ease(8.5,9.3,time);focus.lerp(V(-1.2,1.8,2.6),q*.36);
  const base=new THREE.Spherical().setFromVector3(current.id==='future'?V(6,7.2,20):V(12,8.0,16));base.radius*=orbit.zoom*(current.id==='burj'?1:current.id==='future'?.95:.87)*Math.max(1,1.12/camera.aspect);base.theta+=orbit.yaw;base.phi=clamp(base.phi+orbit.pitch,.25,1.45);camera.position.copy(V().setFromSpherical(base).add(focus));camera.lookAt(focus);renderer.render(scene,camera);
  onUpdate({...state,time,duration:DURATION,landmark:current,playing,photos:Object.fromEntries(photos)});
  if(state.complete&&!completeSent){completeSent=true;onComplete({landmark:current.id,photos:Object.fromEntries(photos),answer:current.correct,demo:true});}
 }
 function reset(){photos.clear();completeSent=false;lastPreview=-Infinity;}
 function frame(now){if(disposed)return;const dt=Math.min(.08,(now-last)/1000);last=now;if(playing){time+=dt;if(time>=DURATION){time%=DURATION;reset();}}draw();raf=requestAnimationFrame(frame);}
 function resetView(){Object.assign(orbit,{yaw:0,pitch:0,zoom:1});}
 function down(e){if(e.pointerType==='mouse'&&e.button!==0)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture=null;}
 function move(e){if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const points=[...pointers.values()],next={x:points.reduce((n,p)=>n+p.x,0)/points.length,y:points.reduce((n,p)=>n+p.y,0)/points.length,d:points.length>1?Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y):0};if(gesture){orbit.yaw-=(next.x-gesture.x)*.006;orbit.pitch=clamp(orbit.pitch+(next.y-gesture.y)*.004,-.35,.6);if(next.d&&gesture.d)orbit.zoom=clamp(orbit.zoom*gesture.d/next.d,.65,1.45);}gesture=next;}
 function up(e){pointers.delete(e.pointerId);gesture=null;}
 function wheel(e){e.preventDefault();orbit.zoom=clamp(orbit.zoom*Math.exp(e.deltaY*.001),.65,1.45);}
 function key(e){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home')resetView();if(e.key==='ArrowLeft')orbit.yaw-=.12;if(e.key==='ArrowRight')orbit.yaw+=.12;if(e.key==='ArrowUp')orbit.pitch-=.08;if(e.key==='ArrowDown')orbit.pitch+=.08;if(['+','='].includes(e.key))orbit.zoom*=.9;if(e.key==='-')orbit.zoom*=1.1;orbit.pitch=clamp(orbit.pitch,-.35,.6);orbit.zoom=clamp(orbit.zoom,.65,1.45);}
 const events={pointerdown:down,pointermove:move,pointerup:up,pointercancel:up,lostpointercapture:up,wheel,keydown:key};for(const [name,fn] of Object.entries(events))canvas.addEventListener(name,fn,name==='wheel'?{passive:false}:undefined);
 const observer=new ResizeObserver(()=>{const w=container.clientWidth,h=container.clientHeight;if(w&&h){renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}});observer.observe(container);
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();for(const [name,fn] of Object.entries(events))canvas.removeEventListener(name,fn);signal?.removeEventListener('abort',dispose);const gs=new Set(),ms=new Set(),ts=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){ms.add(m);for(const v of Object.values(m))if(v?.isTexture)ts.add(v);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());photoTarget.dispose();renderer.dispose();canvas.remove();}
 signal?.addEventListener('abort',dispose,{once:true});draw();raf=requestAnimationFrame(frame);
 return {play(){playing=true;last=performance.now();},pause(){playing=false;},toggle(){playing=!playing;last=performance.now();},replay(){time=0;reset();playing=true;},seek(t){time=clamp(t,0,DURATION-.001);reset();draw();},setLandmark(id){const found=LANDMARKS.find(l=>l.id===id);if(!found)throw new Error('Unknown landmark');current=found;time=0;reset();setVisible();draw();},resetView,dispose,getState:()=>({time,playing,landmark:current.id,...journeyAt(time)})};
}
