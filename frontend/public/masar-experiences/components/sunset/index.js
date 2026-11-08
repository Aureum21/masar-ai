import * as THREE from '../../vendor/three.module.js';
import {loadAvatarAssets} from '../boxing/makehuman-avatar.js';
import {createSunsetVisitor} from './visitor.js';
import {buildWaterfront} from './waterfront.js';
import {DURATION,CAPTURE_TIME,STAGES,sunsetAt} from './journey.js';
export {DURATION,CAPTURE_TIME,STAGES};
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=THREE.MathUtils.clamp;
/** Local looping demonstration. Host app owns real location, time and evidence validation. */
export async function mountSunsetChallenge(container,{onUpdate=()=>{},onCapture=()=>{},onComplete=()=>{},signal,reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches}={}){
 const assets=await loadAvatarAssets();if(signal?.aborted)throw new DOMException('Mount cancelled','AbortError');
 const scene=new THREE.Scene(),renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const camera=new THREE.PerspectiveCamera(37,1,.1,100);container.appendChild(renderer.domElement);const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','Explore the sunset waterfront. Drag to rotate, scroll to zoom. Arrow keys rotate, plus and minus zoom, Home resets.');
 const waterfront=buildWaterfront(scene),photoTarget=new THREE.WebGLRenderTarget(480,600);photoTarget.texture.colorSpace=THREE.SRGBColorSpace;
 const visitor=createSunsetVisitor(waterfront.world,assets,photoTarget.texture),photoCamera=new THREE.PerspectiveCamera(54,.8,.1,100);
 let time=0,playing=!reducedMotion,disposed=false,last=performance.now(),raf=0,lastPreview=-Infinity,photo=null,completeSent=false;
 const view={yaw:0,pitch:0,zoom:1},pointers=new Map();let gesture=null;
 function renderPhoto(){
  const target=renderer.getRenderTarget(),actorVisible=visitor.actor.visible,shadow=renderer.shadowMap.autoUpdate;
  // A stable composition from the visitor's viewpoint, independent of user orbit.
  photoCamera.position.copy(visitor.phone.localToWorld(V(0,.03,.08)));photoCamera.lookAt(V(-1.75,1.0,-6));
  try{visitor.actor.visible=false;renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(photoTarget);renderer.render(scene,photoCamera);}finally{renderer.setRenderTarget(target);renderer.shadowMap.autoUpdate=shadow;visitor.actor.visible=actorVisible;}
 }
 function photograph(){
  renderPhoto();const pixels=new Uint8Array(480*600*4);renderer.readRenderTargetPixels(photoTarget,0,0,480,600,pixels);const c=document.createElement('canvas');c.width=480;c.height=600;const ctx=c.getContext('2d'),data=ctx.createImageData(480,600);for(let y=0;y<600;y++)data.data.set(pixels.subarray((599-y)*480*4,(600-y)*480*4),y*480*4);ctx.putImageData(data,0,0);
  photo=c.toDataURL('image/jpeg',.86);onCapture({image:photo,demo:true,sampleTime:'18:24',locationLabel:'Abu Dhabi waterfront · illustrative viewpoint'});
 }
 function draw(){
  const s=sunsetAt(time);waterfront.update(time,s.golden);visitor.update(time,s,waterfront.sun.position);
  if(visitor.phone.visible&&!photo&&time-lastPreview>1/10){renderPhoto();lastPreview=time;}
  if(s.captured&&!photo)photograph();
  const target=V(0,1.0,0),base=new THREE.Spherical().setFromVector3(V(12,10.2,18));base.radius*=view.zoom*Math.max(1,1.15/camera.aspect);base.theta+=view.yaw;base.phi=clamp(base.phi+view.pitch,.3,1.45);camera.position.copy(V().setFromSpherical(base).add(target));camera.lookAt(target);renderer.render(scene,camera);
  onUpdate({...s,time,duration:DURATION,photo,playing,demo:true});
  if(s.complete&&!completeSent){completeSent=true;onComplete({image:photo,demo:true,sampleTime:'18:24',locationLabel:'Abu Dhabi waterfront · illustrative viewpoint',sampleChecks:s.checks});}
 }
 function resetCycle(){photo=null;completeSent=false;lastPreview=-Infinity;}
 function frame(now){if(disposed)return;const dt=Math.min(.08,(now-last)/1000);last=now;if(playing){time+=dt;if(time>=DURATION){time%=DURATION;resetCycle();}}draw();raf=requestAnimationFrame(frame);}
 function resetView(){Object.assign(view,{yaw:0,pitch:0,zoom:1});}
 function down(e){if(e.pointerType==='mouse'&&e.button!==0)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture=null;}
 function move(e){if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const points=[...pointers.values()],next={x:points.reduce((n,p)=>n+p.x,0)/points.length,y:points.reduce((n,p)=>n+p.y,0)/points.length,d:points.length>1?Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y):0};if(gesture){view.yaw-=(next.x-gesture.x)*.006;view.pitch=clamp(view.pitch+(next.y-gesture.y)*.004,-.35,.6);if(next.d&&gesture.d)view.zoom=clamp(view.zoom*gesture.d/next.d,.65,1.45);}gesture=next;}
 function up(e){pointers.delete(e.pointerId);gesture=null;}
 function wheel(e){e.preventDefault();view.zoom=clamp(view.zoom*Math.exp(e.deltaY*.001),.65,1.45);}
 function key(e){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home')resetView();if(e.key==='ArrowLeft')view.yaw-=.12;if(e.key==='ArrowRight')view.yaw+=.12;if(e.key==='ArrowUp')view.pitch-=.08;if(e.key==='ArrowDown')view.pitch+=.08;if(['+','='].includes(e.key))view.zoom*=.9;if(e.key==='-')view.zoom*=1.1;view.zoom=clamp(view.zoom,.65,1.45);view.pitch=clamp(view.pitch,-.35,.6);}
 const events={pointerdown:down,pointermove:move,pointerup:up,pointercancel:up,lostpointercapture:up,wheel,keydown:key};for(const [name,fn] of Object.entries(events))canvas.addEventListener(name,fn,name==='wheel'?{passive:false}:undefined);
 const observer=new ResizeObserver(()=>{const w=container.clientWidth,h=container.clientHeight;if(w&&h){renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}});observer.observe(container);
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();for(const [name,fn] of Object.entries(events))canvas.removeEventListener(name,fn);signal?.removeEventListener('abort',dispose);const gs=new Set(),ms=new Set(),ts=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){ms.add(m);for(const v of Object.values(m))if(v?.isTexture)ts.add(v);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());photoTarget.dispose();renderer.dispose();canvas.remove();}
 signal?.addEventListener('abort',dispose,{once:true});draw();raf=requestAnimationFrame(frame);
 return {play(){playing=true;last=performance.now();},pause(){playing=false;},toggle(){playing=!playing;last=performance.now();},replay(){time=0;resetCycle();playing=true;},seek(t){time=clamp(t,0,DURATION-.001);resetCycle();draw();},resetView,dispose,getState:()=>({time,playing,...sunsetAt(time)})};
}
