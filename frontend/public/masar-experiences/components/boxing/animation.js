import {translateExperienceText} from "../../locale.js";
import * as THREE from '../../vendor/three.module.js';
import { CONTACT_TIME, punchMotion, bagMotion } from './punch-motion.js';
import { createHumanAvatar } from './makehuman-avatar.js';
import { createAvatarBody } from './avatar-body.js';
import {JOURNEY_DURATION,CHOREOGRAPHY_DURATION,choreographyTime,playbackTime} from './journey-timing.js';
export { loadAvatarAssets } from './makehuman-avatar.js';

/** Standalone scene using locally bundled Three.js and CC0 character assets. */
export function createPunchAnimation(container, { onUpdate = () => {}, onCapture = () => {}, reducedMotion = false, avatarAssets, inspectHands = false } = {}) {
  if(!avatarAssets)throw new Error('Load the local avatar assets before creating the animation.');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0d0f14');
  scene.fog = new THREE.Fog('#0d0f14', 18, 42);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.localClippingEnabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);
  // View controls live independently of the walkthrough clock and actor rig.
  const canvas=renderer.domElement;
  canvas.tabIndex=0;
  canvas.setAttribute('aria-label','Explore the 3D scene. Drag to rotate, scroll or pinch to zoom. Arrow keys rotate, plus and minus zoom, Home resets the view.');
  const view={yaw:0,pitch:0,zoom:1,targetYaw:0,targetPitch:0,targetZoom:1};
  const pointers=new Map();
  const cameraTarget=new THREE.Vector3(),cameraOffset=new THREE.Vector3(),orbit=new THREE.Spherical();
  let gesture=null;
  function gestureState(){
    const points=[...pointers.values()];
    return points.length>1?{x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2,distance:Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y)}:points.length?{...points[0],distance:0}:null;
  }
  function pointerDown(event){
    if(event.pointerType==='mouse'&&event.button!==0)return;
    canvas.focus({preventScroll:true});canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});gesture=gestureState();canvas.classList.add('is-dragging');
  }
  function pointerMove(event){
    if(!pointers.has(event.pointerId))return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});const next=gestureState();
    if(gesture){
      view.targetYaw-=(next.x-gesture.x)*.006;
      view.targetPitch=THREE.MathUtils.clamp(view.targetPitch-(next.y-gesture.y)*.005,-.38,.65);
      if(next.distance&&gesture.distance)view.targetZoom=THREE.MathUtils.clamp(view.targetZoom*gesture.distance/next.distance,.65,1.5);
    }
    gesture=next;
  }
  function pointerUp(event){pointers.delete(event.pointerId);gesture=gestureState();if(!pointers.size)canvas.classList.remove('is-dragging');}
  function wheel(event){event.preventDefault();const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?container.clientHeight:1);view.targetZoom=THREE.MathUtils.clamp(view.targetZoom*Math.exp(delta*.001),.65,1.5);}
  function resetView(){view.targetYaw=0;view.targetPitch=0;view.targetZoom=1;}
  function keyView(event){
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','_','Home'].includes(event.key))return;
    event.preventDefault();
    if(event.key==='Home')resetView();
    if(event.key==='ArrowLeft')view.targetYaw-=.12;
    if(event.key==='ArrowRight')view.targetYaw+=.12;
    if(event.key==='ArrowUp')view.targetPitch=Math.min(.65,view.targetPitch+.08);
    if(event.key==='ArrowDown')view.targetPitch=Math.max(-.38,view.targetPitch-.08);
    if(event.key==='+'||event.key==='=')view.targetZoom=Math.max(.65,view.targetZoom*.9);
    if(event.key==='-'||event.key==='_')view.targetZoom=Math.min(1.5,view.targetZoom/ .9);
  }
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);
  canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerUp);canvas.addEventListener('lostpointercapture',pointerUp);
  canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('keydown',keyView);
  scene.add(new THREE.HemisphereLight(0xe5e9ff, 0x34313a, 1.7));
  const key = new THREE.DirectionalLight(0xfff4de, 3.8);
  key.position.set(-4, 9, 6); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9 });
  key.shadow.normalBias = .035; key.shadow.bias = -.0002;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc9d8ff, 2.4); fill.position.set(5, 4, 5); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffbe54, 2);rim.position.set(2,6,-5);scene.add(rim);
  const arcadeLight=new THREE.PointLight(0xffb322,9,8,2);arcadeLight.position.set(.8,3.2,1);scene.add(arcadeLight);
  const mat = (color, roughness = .65, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const orange = mat('#c38d2f', .33, .45), peach = mat('#dfb65e',.4,.35), dark = mat('#252a33'), cream = mat('#d2c9b5');
  const green = mat('#3e5148'), black = mat('#10141b', .3), skin = mat('#b7896c',.82), red = mat('#a84331', .3);
  const glow = new THREE.MeshStandardMaterial({ color: '#ffda86', emissive: '#ffae2c', emissiveIntensity: .8 });
  const resources = [];
  const avatarMaps=new Set();avatarAssets.gltf.scene.traverse(o=>{if(o.material?.map)avatarMaps.add(o.material.map);});resources.push(...avatarMaps);
  function mesh(geo, material, parent, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  const primitiveGeometry=new Map();
  const geometryFor=(key,build)=>{if(!primitiveGeometry.has(key))primitiveGeometry.set(key,build());return primitiveGeometry.get(key);};
  const box = (parent, w, h, d, material, x=0,y=0,z=0) => mesh(geometryFor(`box:${w},${h},${d}`,()=>new THREE.BoxGeometry(w,h,d)),material,parent,x,y,z);
  const sphere = (parent, r, material, x=0,y=0,z=0) => mesh(geometryFor(`sphere:${r}`,()=>new THREE.SphereGeometry(r,32,24)),material,parent,x,y,z);
  const cyl = (parent, r1,r2,h, material,x=0,y=0,z=0) => mesh(geometryFor(`cylinder:${r1},${r2},${h}`,()=>new THREE.CylinderGeometry(r1,r2,h,32)),material,parent,x,y,z);
  // A continuous surface along an articulated limb replaces stacked cylinders
  // and visible joint spheres. End rings overlap the torso/cuff/foot interior.
  function organicTube(parent,material,rings=32,segments=20){
    const positions=new Float32Array((rings+1)*(segments+1)*3),indices=[];
    for(let r=0;r<rings;r++)for(let s=0;s<segments;s++){
      const a=r*(segments+1)+s,b=a+segments+1;indices.push(a,a+1,b,a+1,b+1,b);
    }
    const uv=[];for(let r=0;r<=rings;r++)for(let s=0;s<=segments;s++)uv.push(s/segments,r/rings);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
    const surface=mesh(geometry,material,parent);surface.frustumCulled=false;
    return {surface,update(points,radii){
      const curve=new THREE.CatmullRomCurve3(points,false,'centripetal');
      for(let r=0;r<=rings;r++){
        const t=r/rings,point=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
        const reference=Math.abs(tangent.z)<.9?new THREE.Vector3(0,0,1):new THREE.Vector3(1,0,0);
        const normal=reference.cross(tangent).normalize(),binormal=tangent.clone().cross(normal).normalize();
        const q=t*(radii.length-1),index=Math.min(Math.floor(q),radii.length-2),blend=q-index;
        const radius=THREE.MathUtils.lerp(radii[index],radii[index+1],blend);
        for(let s=0;s<=segments;s++){
          const angle=s/segments*Math.PI*2;
          const fabricFold=material.userData.fabric?(Math.sin(angle*7+t*5)*.0025+Math.sin(t*49+angle*2)*.0035*Math.exp(-(((t-.65)/.22)**2)))*Math.sin(Math.PI*t):0;
          const p=point.clone().addScaledVector(normal,Math.cos(angle)*(radius+fabricFold)).addScaledVector(binormal,Math.sin(angle)*(radius+fabricFold)),i=(r*(segments+1)+s)*3;
          positions[i]=p.x;positions[i+1]=p.y;positions[i+2]=p.z;
        }
      }
      geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();
    }};
  }
  function roundedBox(parent,w,h,d,material,x=0,y=0,z=0,r=.055){
    const shape=new THREE.Shape(),left=-w/2+r,bottom=-h/2+r,right=w/2-r,top=h/2-r;
    shape.moveTo(left,bottom-r);shape.lineTo(right,bottom-r);shape.quadraticCurveTo(right+r,bottom-r,right+r,bottom);
    shape.lineTo(right+r,top);shape.quadraticCurveTo(right+r,top+r,right,top+r);shape.lineTo(left,top+r);
    shape.quadraticCurveTo(left-r,top+r,left-r,top);shape.lineTo(left-r,bottom);shape.quadraticCurveTo(left-r,bottom-r,left,bottom-r);
    const bevelDepth=Math.min(r,d*.22);
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:d-2*bevelDepth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:Math.min(r*.45,d*.25),bevelThickness:bevelDepth});
    geometry.translate(0,0,-d/2+bevelDepth);return mesh(geometry,material,parent,x,y,z);
  }
  function label(text, w, h, { bg='#161920', color='#f3dfb5', size=70, font='bold', tracking=0, resolution=Math.min(1024,Math.max(256,2**Math.ceil(Math.log2(w*256)))) } = {}) {
    const c = document.createElement('canvas'); c.width=resolution; c.height=Math.round(resolution*h/w);
    const ctx=c.getContext('2d'); ctx.fillStyle=bg; ctx.fillRect(0,0,c.width,c.height); ctx.fillStyle=color;
    ctx.font=`${font} ${size*resolution/1024}px Arial`; ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(translateExperienceText(text),resolution/2,c.height/2+3*resolution/1024);
    const texture=new THREE.CanvasTexture(c); texture.colorSpace=THREE.SRGBColorSpace;resources.push(texture);
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture}));
    return { plane, canvas:c, ctx, texture };
  }
  const world = new THREE.Group();scene.add(world);
  // Small architectural diorama: tiled arcade platform, storefronts, bench, plants.
  box(world,10,.26,7.3,mat('#191c23',.55,.3),0,-.16,0);
  box(world,9.85,.08,7.15,mat('#262a34',.5,.2),0,0,0);
  const tileMat=mat('#42424a',.7,.1);
  const edgeLight=new THREE.MeshStandardMaterial({color:'#d7a84b',emissive:'#a57521',emissiveIntensity:.4,metalness:.45,roughness:.4});
  for(const z of [-3.55,3.55])box(world,9.8,.018,.018,edgeLight,0,.05,z);
  for(const x of [-4.89,4.89])box(world,.018,.018,7.1,edgeLight,x,.05,0);
  for(let x=-4;x<=4;x++)box(world,.014,.006,7.1,tileMat,x,.045,0);
  for(let z=-3;z<=3;z++)box(world,9.8,.006,.014,tileMat,0,.045,z);
  const mall=new THREE.Group();world.add(mall);
  box(mall,9,.2,.3,dark,0,4.6,-2.75);
  box(mall,8.9,.025,.035,edgeLight,0,4.49,-2.57);
  for(const x of [-4.3,-.9,4.3]){box(mall,.28,4.5,.3,mat('#292d36',.5,.25),x,2.26,-2.85);box(mall,.4,.15,.45,peach,x,.15,-2.85);}
  box(mall,3.1,3.2,.12,mat('#1c2730',.3,.35),-2.6,1.8,-2.9);
  box(mall,4.8,3.2,.12,mat('#263039',.3,.3),1.7,1.8,-2.9);
  for(const x of [-3.8,-2.6,-1.4,.1,1.6,3.2])box(mall,.035,3.2,.05,mat('#5b5141',.4,.6),x,1.8,-2.8);
  box(mall,3.2,.55,.22,dark,-2.6,3.8,-2.7);
  const arcade=label('A R C A D E',2.65,.35,{bg:'#252a33',color:'#e8bc66',size:82});arcade.plane.position.set(-2.6,3.8,-2.575);mall.add(arcade.plane);
  box(mall,4.8,.55,.2,dark,1.7,3.8,-2.7);
  const stores=label('MASAR  /  EXPERIENCES',3.8,.35,{bg:'#252a33',color:'#e8bc66',size:57});stores.plane.position.set(1.7,3.8,-2.58);mall.add(stores.plane);
  // Awning and simple window display.
  for(let i=0;i<10;i++){const aw=box(mall,.31,.12,.6,i%2?dark:peach,-4+i*.31,3.4,-2.45);aw.rotation.x=.13;}
  for(const x of [-3.4,-2.1]){cyl(mall,.12,.16,.8,peach,x,.47,-2.45);sphere(mall,.21,cream,x,1,-2.45);}
  function plant(x,z,scale=1){const g=new THREE.Group();g.position.set(x,.08,z);g.scale.setScalar(scale);world.add(g);cyl(g,.29,.22,.5,mat('#75613d',.5,.35),0,.25,0);cyl(g,.02,.025,1.4,dark,0,1,0);for(let i=0;i<9;i++){const a=i*2.4;const leaf=sphere(g,.24,green,Math.cos(a)*.25,.85+i*.11,Math.sin(a)*.25);leaf.scale.set(.6,1.6,.55);leaf.rotation.z=Math.cos(a)*.6;}return g;}
  plant(-3.95,-1.2,1.2);plant(4,-2,1.1);
  for(let i=0;i<4;i++)box(world,1.7,.1,.13,mat('#776148'),3.5,.55,-.9+i*.17);
  for(const x of [2.85,4.15])box(world,.08,.5,.5,dark,x,.29,-.65);
  // Painted circle anchors the machine and performer.
  const circle=mesh(new THREE.CylinderGeometry(2.45,2.45,.012,80),mat('#303039',.65,.1),world,-.05,.055,.75);
  const ring=mesh(new THREE.TorusGeometry(2.3,.014,8,100),edgeLight,world,-.05,.065,.75);ring.rotation.x=-Math.PI/2;
  const machine = new THREE.Group();machine.position.set(.75,.08,-.15);world.add(machine);
  const metal=mat('#a5a6ae',.28,.8),rubber=mat('#111318',.95),panel=mat('#1b1e26',.45,.35);
  roundedBox(machine,1.56,.24,1.54,rubber,0,.12,0);
  roundedBox(machine,1.3,1.8,1.1,orange,0,1.13,-.12);
  roundedBox(machine,1.15,.12,1.24,panel,0,2.05,-.04,.035);
  box(machine,.22,2.25,.55,orange,-.55,3.05,-.38);
  box(machine,.22,2.25,.55,orange,.55,3.05,-.38);
  roundedBox(machine,1.45,.94,.78,orange,0,3.94,-.3);
  roundedBox(machine,1.5,.14,.86,panel,0,4.45,-.28,.035);
  roundedBox(machine,1.26,.62,.08,metal,0,3.92,.11,.025);
  roundedBox(machine,1.17,.53,.04,black,0,3.92,.17,.018);
  const score=label('000',1.07,.42,{bg:'#141d1d',color:'#f8bb53',size:260,resolution:1024});score.plane.position.set(0,3.91,.197);machine.add(score.plane);
  const title=label('POWER BOXER',1.16,.19,{bg:'#c38d2f',color:'#15171e',size:102});title.plane.position.set(0,4.3,.13);machine.add(title.plane);
  const target=label('BEAT 600',.87,.25,{bg:'#171a22',color:'#f5c55b',size:160});target.plane.position.set(0,1.75,.447);machine.add(target.plane);
  roundedBox(machine,1.04,1.08,.045,panel,0,.91,.46,.025);
  const emblem=label('BOXER',.78,.22,{bg:'#1b1e26',color:'#efc366',size:160});emblem.plane.position.set(0,1.22,.495);machine.add(emblem.plane);
  const instructions=label('1 CREDIT • 1 PUNCH',.8,.105,{bg:'#1b1e26',color:'#b1b5c3',size:80});instructions.plane.position.set(0,.94,.497);machine.add(instructions.plane);
  for(let i=0;i<7;i++)box(machine,.38,.018,.012,rubber,-.16,.78-i*.055,.498);
  roundedBox(machine,.25,.34,.07,metal,.3,.7,.51,.025);
  box(machine,.035,.15,.015,rubber,.3,.75,.557);
  box(machine,.15,.045,.025,rubber,.3,.6,.557);
  const button=cyl(machine,.08,.08,.035,new THREE.MeshStandardMaterial({color:'#e65934',emissive:'#a3280a',emissiveIntensity:.5}),.34,1.55,.48);button.rotation.x=Math.PI/2;
  const startLabel=label('START',.28,.075,{bg:'#c38d2f',color:'#171a22',size:125});startLabel.plane.position.set(.34,1.38,.447);machine.add(startLabel.plane);
  for(const side of [-1,1]){
    const sidePanel=roundedBox(machine,.035,1.2,.72,panel,side*.66,1.13,-.12,.012);
    for(let i=0;i<9;i++)box(machine,.02,.027,.42,rubber,side*.687,.75+i*.075,-.12);
    for(const y of [.4,1.85])for(const z of [-.48,.25])sphere(machine,.022,metal,side*.686,y,z);
    box(machine,.035,1.65,.065,metal,side*.57,1.1,.43);
    for(const y of [2.23,3.32])sphere(machine,.035,metal,side*.55,y,-.077);
    const lightMat=new THREE.MeshStandardMaterial({color:'#ffd7a2',emissive:'#ff9d38',emissiveIntensity:.9});
    box(machine,.028,.52,.018,lightMat,side*.66,3.96,.12);
  }
  for(const x of [-.56,.56])for(const z of [-.54,.54])cyl(machine,.085,.09,.09,rubber,x,-.015,z);
  box(machine,.36,.1,.06,black,0,.55,.47);box(machine,.07,.2,.07,black,.37,.67,.46);
  for(const x of [-.51,.51]){box(machine,.045,1.45,.03,cream,x,1.08,.449);sphere(machine,.048,glow,x,2.12,.57);}
  box(machine,.55,.12,.6,black,0,3.48,.22);
  const bagPivot=new THREE.Group();bagPivot.position.set(0,3.42,.39);machine.add(bagPivot);
  // Positive rotation around this axis pushes the hanging bag +X / -Z,
  // away from the approaching fist, at a fixed suspension point.
  const bagSwingAxis=new THREE.Vector3(.96,0,.28).normalize();
  cyl(bagPivot,.06,.06,.33,black,0,-.14,0);
  const bagLeather=mat('#8f3028',.65),stitch=mat('#d7a383',.9);
  const bag=sphere(bagPivot,.33,bagLeather,0,-.65,0);bag.scale.set(.85,1.35,.9);
  cyl(bagPivot,.13,.22,.24,bagLeather,0,-.34,0);
  const seam=mesh(new THREE.TorusGeometry(.29,.006,8,48),stitch,bagPivot,0,-.66,0);seam.rotation.x=Math.PI/2;seam.scale.set(.96,1,1);
  for(let i=0;i<12;i++){const y=-.4-i*.035;const z=.3*Math.sqrt(Math.max(0,1-((y+.65)/.445)**2));box(bagPivot,.025,.006,.008,stitch,0,y,z);}
  const bagPatch=label('HIT',.16,.12,{bg:'#8f3028',color:'#e4c3a5',size:340});bagPatch.plane.position.set(0,-.72,.299);bagPivot.add(bagPatch.plane);
  // Adult proportions, rounded anatomy and fixed-length two-bone joints.
  // +X is the character's forward direction; the whole stance faces the bag.
  const actor=new THREE.Group();actor.position.set(-.35,.08,1.55);actor.rotation.y=.92;world.add(actor);
  const upper=new THREE.Group();actor.add(upper);
  const shirt=new THREE.MeshPhysicalMaterial({color:'#f4f3ef',roughness:.93,sheen:.45,sheenColor:'#e4e7ee',sheenRoughness:.86}),pants=shirt;
  const cloth=shirt.clone();cloth.side=THREE.DoubleSide;
  // Fine cotton weave is generated locally; the avatar has no remote assets.
  const weaveCanvas=document.createElement('canvas');weaveCanvas.width=weaveCanvas.height=128;
  const weaveContext=weaveCanvas.getContext('2d'),weavePixels=weaveContext.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const index=(y*128+x)*4,value=128+((x%4<2?1:-1)+(y%4<2?1:-1))*13+Math.sin(x*17+y*31)*4;
    weavePixels.data[index]=weavePixels.data[index+1]=weavePixels.data[index+2]=value;weavePixels.data[index+3]=255;
  }
  weaveContext.putImageData(weavePixels,0,0);const weave=new THREE.CanvasTexture(weaveCanvas);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(10,18);resources.push(weave);
  for(const fabric of [shirt,cloth]){fabric.bumpMap=weave;fabric.bumpScale=.0007;fabric.userData.fabric=true;}
  const torso=mesh(new THREE.CapsuleGeometry(.265,.46,8,24),shirt,upper,0,.58,0);torso.scale.set(.8,1,1.22);
  const chest=sphere(upper,.285,shirt,.025,.82,0);chest.scale.set(.84,.8,1.27);
  torso.visible=false;chest.visible=false;
  const pelvis=sphere(actor,.28,pants,0,1.42,0);pelvis.scale.set(.78,.73,1.18);
  const headGroup=new THREE.Group();upper.add(headGroup);
  const humanAvatar=createHumanAvatar(avatarAssets,actor,cloth);
  const ghutra=humanAvatar.headwear;
  // Collarless neckline and the short Emirati kandura tassel (tarboosh).
  const neckline=mesh(new THREE.TorusGeometry(.103,.012,8,32),cloth,upper,.015,1.04,0);neckline.rotation.x=Math.PI/2;
  neckline.visible=false; // The skinned collar now owns this transition.
  const tassel=new THREE.Group();upper.add(tassel);tassel.position.set(.236,.94,0);
  cyl(tassel,.014,.018,.3,cloth,0,-.15,0);
  for(let i=0;i<7;i++)cyl(tassel,.005,.004,.1,cloth,Math.cos(i)*.017,-.34,Math.sin(i)*.017);
  const stitching=mat('#d9d8d1',1);
  function garmentSeam(points,radius=.0018){const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(new THREE.TubeGeometry(path,48,radius,6,false),stitching,upper);}
  garmentSeam([[.111,1.04,-.035],[.203,.96,-.035],[.241,.8,-.035],[.251,.58,-.035],[.253,.46,-.022]]);
  garmentSeam([[.111,1.04,.035],[.203,.96,.035],[.241,.8,.035],[.251,.58,.035],[.253,.46,.022]]);
  // A discreet stitched chest pocket sits on the outer fabric surface.
  garmentSeam([[.221,.79,-.12],[.209,.79,-.20],[.219,.62,-.20],[.232,.60,-.12],[.221,.79,-.12]],.0013);
  // A single shoulder-to-ankle garment: no separate shirt, waist join, or
  // radial skirt. The side silhouette falls almost straight from the chest.
  const kanduraSections=[
    [.25,.32,.325],[.55,.30,.325],[1.1,.27,.325],[1.6,.25,.33],
    [2.05,.245,.35],[2.26,.23,.365],[2.34,.20,.345],[2.47,.103,.103]
  ];
  function kanduraProfile(height){
    for(let i=1;i<kanduraSections.length;i++){
      const a=kanduraSections[i-1],b=kanduraSections[i];
      if(height<=b[0]){const n=THREE.MathUtils.clamp((height-a[0])/(b[0]-a[0]),0,1),blend=n*n*(3-2*n);return {depth:THREE.MathUtils.lerp(a[1],b[1],blend),width:THREE.MathUtils.lerp(a[2],b[2],blend)};}
    }
    return {depth:.103,width:.103};
  }
  // Only the eight ankle rings feed the visible skinned garment's clearance.
  const robeRings=64,robeSegments=80,robePositions=new Float32Array(8*(robeSegments+1)*3);
  function limbSet(parent,r1,r2,material){const target=new THREE.Group();parent.add(target);return target;}
  const armA=limbSet(upper,.115,.14,shirt),armB=limbSet(upper,.085,.115,shirt);
  const backA=limbSet(upper,.115,.14,shirt),backB=limbSet(upper,.085,.115,shirt);
  const elbowA=new THREE.Group(),elbowB=new THREE.Group();upper.add(elbowA,elbowB);
  const sleeveA=limbSet(upper,.13,.15,shirt),sleeveB=limbSet(upper,.13,.15,shirt);
  function humanHand(side){
    const group=new THREE.Group();upper.add(group);
    group.userData={fingers:[],thumb:new THREE.Group(),side};return group;
  }
  const glove=humanHand(1),backGlove=humanHand(-1);

  const avatarBody=createAvatarBody(actor,shirt);

  for(const part of [armA,armB,backA,backB,elbowA,elbowB,sleeveA,sleeveB])part.visible=false;
  const phone=new THREE.Group();upper.add(phone);
  // Standard phone coordinates: X across the display, Y upright, +Z rear lens.
  // A thin rounded enclosure replaces the old block extruded sideways.
  const phoneMetal=mat('#46545d',.28,.85),phoneGlass=mat('#28363e',.22,.35);
  roundedBox(phone,.25,.49,.034,phoneMetal,0,0,0,.024);
  roundedBox(phone,.234,.472,.008,phoneGlass,0,0,.023,.022);
  roundedBox(phone,.229,.463,.008,black,0,0,-.023,.02);
  roundedBox(phone,.087,.123,.012,panel,-.06,.157,.032,.017);
  for(const y of [.13,.179]){
    const rim=cyl(phone,.022,.022,.012,phoneMetal,-.061,y,.044);rim.rotation.x=Math.PI/2;
    const lens=cyl(phone,.016,.016,.014,black,-.061,y,.051);lens.rotation.x=Math.PI/2;
    sphere(phone,.005,mat('#718f9d',.12,.6),-.065,y+.004,.061).scale.z=.3;
  }
  box(phone,.006,.065,.016,phoneMetal,.13,.065,0);
  for(const y of [.04,.12])box(phone,.006,.045,.014,phoneMetal,-.13,y,0);
  const phoneScreen=label('',.208,.277,{bg:'#11151d',color:'#f5c55b',size:300});phoneScreen.plane.rotation.y=Math.PI;phoneScreen.plane.position.set(0,.025,-.029);phone.add(phoneScreen.plane);
  const photoCamera=new THREE.PerspectiveCamera(42,3/4,.1,30);
  const photoTarget=new THREE.WebGLRenderTarget(384,512,{depthBuffer:true});photoTarget.texture.colorSpace=THREE.SRGBColorSpace;
  const photoCanvas=document.createElement('canvas');photoCanvas.width=384;photoCanvas.height=512;
  const photoContext=photoCanvas.getContext('2d'),photoPixels=new Uint8Array(384*512*4);
  let previewTaken=false,photoTaken=false,photoURL=null;
  phoneScreen.plane.material.toneMapped=false;
  function photograph(final,scoreValue){
    // Render the actual machine, score texture, bag and mall in portrait.
    // This camera is independent of the user's orbit; the actor is behind it.
    photoCamera.position.copy(machine.localToWorld(v(.85,3.05,3.8)));
    photoCamera.lookAt(machine.localToWorld(v(0,3,-.05)));
    const target=renderer.getRenderTarget(),visible=actor.visible,shadowUpdates=renderer.shadowMap.autoUpdate;
    try{
      actor.visible=false;renderer.shadowMap.autoUpdate=false;
      renderer.setRenderTarget(photoTarget);renderer.render(scene,photoCamera);
      if(final){
        renderer.readRenderTargetPixels(photoTarget,0,0,384,512,photoPixels);
        const pixels=photoContext.createImageData(384,512),stride=384*4;
        for(let row=0;row<512;row++)pixels.data.set(photoPixels.subarray((511-row)*stride,(512-row)*stride),row*stride);
        photoContext.putImageData(pixels,0,0);photoURL=photoCanvas.toDataURL('image/png');
      }
    }finally{renderer.setRenderTarget(target);actor.visible=visible;renderer.shadowMap.autoUpdate=shadowUpdates;}
    phoneScreen.plane.material.map=photoTarget.texture;phoneScreen.plane.material.needsUpdate=true;
    if(final)onCapture({url:photoURL,score:scoreValue});
  }
  const earpiece=box(phone,.052,.007,.003,panel,0,.218,-.03);
  const shutterButton=sphere(phone,.021,cream,0,-.157,-.031);shutterButton.scale.z=.13;
  const phoneFlash=sphere(phone,.014,new THREE.MeshBasicMaterial({color:'#ffffff'}),.007,.158,.036);
  // Hands are modeled in phone space, with fixed wrist anchors and curled
  // fingers. Both arm targets come from these same anchors, so the prop and
  // the grip cannot drift apart when it tilts, rises, or lowers.
  const rightGrip=new THREE.Group(),leftGrip=new THREE.Group();phone.add(rightGrip,leftGrip);
  const gripAnchors=[new THREE.Vector3(-.30,-.135,.042),new THREE.Vector3(.30,-.135,.042)];
  const legA=limbSet(actor,.125,.15,skin),legB=limbSet(actor,.08,.115,skin);
  const legC=limbSet(actor,.125,.15,skin),legD=limbSet(actor,.08,.115,skin);
  const kneeA=sphere(actor,.115,skin),kneeB=sphere(actor,.115,skin);
  const shortsA=limbSet(actor,.15,.175,pants),shortsB=limbSet(actor,.15,.175,pants);
  // Upper legs remain under the kandura; visible calves and ankle joints
  // connect the hem to the sandals instead of leaving disconnected footwear.
  for(const part of [pelvis,legA,legC,kneeA,kneeB,shortsA,shortsB])part.visible=false;
  const ankleA=sphere(actor,.074,skin),ankleB=sphere(actor,.074,skin);
  for(const part of [legB,legD,ankleA,ankleB])part.visible=false;
  const legSkin=skin.clone();
  const hemClip=new THREE.Plane(new THREE.Vector3(0,-1,0),.365);legSkin.clippingPlanes=[hemClip];legSkin.clipShadows=true;
  const lowerLegA=organicTube(actor,legSkin,28,20),lowerLegB=organicTube(actor,legSkin,28,20);
  const leather=mat('#4b3829',.85);
  function shoe(){const g=new THREE.Group();actor.add(g);box(g,.41,.045,.23,leather,.06,.02,0);const foot=sphere(g,.14,skin,.09,.075,0);foot.scale.set(1.65,.43,.77);for(const x of [-.02,.14]){const strap=box(g,.07,.035,.22,leather,x,.12,0);strap.rotation.z=-.08;}return g;}
  const shoeA=shoe(),shoeB=shoe();shoeA.position.set(.35,.07,.24);shoeB.position.set(-.39,.07,-.24);
  const v=(x,y,z)=>new THREE.Vector3(x,y,z);
  function limb(m,a,b){m.position.copy(a).add(b).multiplyScalar(.5);m.scale.y=a.distanceTo(b);m.quaternion.setFromUnitVectors(v(0,1,0),b.clone().sub(a).normalize());}
  // Intersect two spheres to find the elbow/knee. Clamping the wrist target
  // prevents any frame (including timeline scrubbing) from stretching a bone.
  function solveJoint(root,target,a,b,pole){
    const direction=target.clone().sub(root);const distance=THREE.MathUtils.clamp(direction.length(),Math.abs(a-b)+.001,(a+b)*.985);direction.normalize();
    const end=root.clone().addScaledVector(direction,distance);
    const along=(a*a-b*b+distance*distance)/(2*distance);
    const bend=pole.clone().sub(root);bend.addScaledVector(direction,-bend.dot(direction)).normalize();
    return {end,joint:root.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,a*a-along*along)))};
  }
  function poseArm(shoulder,target,pole,a,b,elbow,sleeve,hand,natural=null,weight=0,pronation=0){
    let {end,joint}=solveJoint(shoulder,target,.55,.52,pole);
    if(natural&&weight>0){
      const upperDirection=joint.clone().sub(shoulder).normalize().lerp(natural.joint.clone().sub(shoulder).normalize(),weight).normalize();
      const foreDirection=end.clone().sub(joint).normalize().lerp(natural.end.clone().sub(natural.joint).normalize(),weight).normalize();
      joint=shoulder.clone().addScaledVector(upperDirection,.55);end=joint.clone().addScaledVector(foreDirection,.52);
    }
    limb(a,shoulder,joint);limb(b,joint,end);elbow.position.copy(joint);
    limb(sleeve,shoulder,shoulder.clone().lerp(joint,.45));
    const direction=end.clone().sub(joint).normalize(),side=shoulder.z>0?1:-1;
    avatarBody.setArm(side,shoulder,joint,end);
    hand.position.copy(end);
    // A neutral wrist follows the forearm. Both palms face the thighs while
    // walking; the striking palm rotates downward as the shot extends.
    const palm=v(.06,0,-side).lerp(v(0,-1,0),pronation);
    palm.addScaledVector(direction,-palm.dot(direction)).normalize();
    const basisNormal=palm.multiplyScalar(side);
    const across=direction.clone().cross(basisNormal).normalize();
    hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,direction,basisNormal));
    humanAvatar.setArm(side,shoulder,joint,end,hand.quaternion,upper);
    return end;
  }
  const impact=new THREE.Group();impact.position.set(.75,2.84,.36);world.add(impact);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const ray=box(impact,.045,.29,.045,i%2?cream:orange,Math.cos(a)*.6,Math.sin(a)*.6,0);ray.rotation.z=a-Math.PI/2;}
  const particles=[];
  for(let i=0;i<32;i++){const m=box(world,.06,.13,.025,[orange,cream,green][i%3]);particles.push({m,seed:i*1.618});}
  let previousScore=-1;
  let elapsed=0, playing=!reducedMotion, speed=1, raf=0, last=performance.now(), disposed=false;
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
  const smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
  // Distance-driven gait: each sandal remains at a fixed floor position
  // during stance, then lifts and swings to the next contact point.
  function walkingFoot(distance,offset){
    const stride=.76,phase=(distance+offset)/stride,cycle=Math.floor(phase),fraction=phase-cycle;
    const swing=smooth((fraction-.6)/.4);
    return {
      x:cycle*stride-offset+.2+stride*swing-distance,
      lift:.13*Math.sin(Math.PI*swing),
      pitch:Math.sin(Math.PI*2*swing)*.16
    };
  }
  function relaxedArm(side,cycle,motion){
    const shoulder=v(.02,.9,side*.29);
    // A small shoulder pendulum swings opposite the leg. Most of the motion
    // comes from the shoulder, with a soft, trailing bend at the elbow.
    const swing=-side*Math.cos(cycle)*.19*motion;
    const shoulderAngle=.015+swing;
    // The forearm follows the shoulder with a small delay instead of moving
    // as one rigid pendulum. A softly bent elbow remains close to the ribs.
    const foreSwing=-side*Math.cos(cycle-.30)*.19*motion;
    const elbowBend=.22+.045*Math.sin(cycle-.45)*motion;
    const upperDirection=v(Math.sin(shoulderAngle),-Math.cos(shoulderAngle),side*.045).normalize();
    const foreDirection=v(Math.sin(.015+foreSwing+elbowBend),-Math.cos(.015+foreSwing+elbowBend),side*.035).normalize();
    const joint=shoulder.clone().addScaledVector(upperDirection,.55);
    return {joint,end:joint.clone().addScaledVector(foreDirection,.52)};
  }
  function draw(clock){
    const t=choreographyTime(clock);
    const walked=1.52*smooth(t/2.35),remaining=1.52-walked;
    const settle=smooth((t-2.35)/.6),walking=1-smooth((t-2.15)/.3);
    const walkCycle=walked/.76*Math.PI*2;
    const walkSwing=Math.sin(walkCycle)*walking;
    const bodyBob=(1-Math.cos(walkCycle*2))*.012*walking;
    // Finish the approach within striking distance. The torso then rotates
    // over the feet instead of having to reach forward from the waist.
    actor.position.set(-.35+Math.cos(.92)*(.22-remaining),.08,1.55-Math.sin(.92)*(.22-remaining));
    // Short acceleration into contact, then an immediate, slower recoil.
    // Hips initiate the drive before the fist, rather than extending the arm.
    const {wind,drive,extension}=punchMotion(t);
    const relax=smooth((t-7.5)/.8);
    const reachPhone=smooth((t-9.35)/.65);
    const raisePhone=smooth((t-10)/.85);
    const supportPhone=smooth((t-10.15)/.65);
    const lowerPhone=smooth((t-12.4)/.6);
    const prepare=smooth((t-3.05)/.45);
    const naturalWeight=clamp(1-prepare+relax)*(1-reachPhone);
    const armMotion=smooth(t/.3)*(1-smooth((t-1.95)/.5));
    const nearArm=relaxedArm(1,walkCycle,armMotion),farArm=relaxedArm(-1,walkCycle,armMotion);
    const breathe=Math.sin(t*2.5)*.008;
    const afterImpact=clamp((t-CONTACT_TIME)/.18),followThrough=Math.sin(afterImpact*Math.PI);
    const shift=.16*drive-.06*wind;
    const idleWeight=naturalWeight*settle;
    upper.position.set(shift+.012*followThrough,1.43-.04*wind+.015*drive+breathe+bodyBob,-.045*drive+.028*idleWeight);
    upper.rotation.set(.018*idleWeight,.24*wind-.3*drive-.045*walkSwing-.018*followThrough,.025*wind-.035*drive-.025*walking-.012*followThrough);
    pelvis.position.set(shift*.65,1.42-.04*wind+bodyBob,.0);
    pelvis.rotation.y=.1*wind-.16*drive+.04*walkSwing;
    const punchFocus=prepare*(1-relax);
    headGroup.rotation.y=THREE.MathUtils.lerp(-.42,-.08,punchFocus)-upper.rotation.y*.8+.25*raisePhone;
    headGroup.rotation.z=.018*wind+.02*drive+.12*raisePhone-.15*lowerPhone;
    ghutra.rotation.x=Math.sin(t*2.5)*.006+drive*.025+walkSwing*.025;
    tassel.rotation.z=-drive*.14+Math.sin(t*3)*.015-walkSwing*.08;
    // Walk in, place both feet, then widen into the punching stance.
    const nearStep=walkingFoot(walked,0),farStep=walkingFoot(walked,.38);
    const nearSettle=smooth((t-2.35)/.25),farSettle=smooth((t-2.6)/.3);
    const soleHeight=-.035;
    const stanceWidth=THREE.MathUtils.lerp(.14,.16,prepare);
    shoeA.position.set(THREE.MathUtils.lerp(nearStep.x,THREE.MathUtils.lerp(.1,.2,prepare),nearSettle),soleHeight+nearStep.lift*(1-nearSettle)+Math.sin(nearSettle*Math.PI)*.035,THREE.MathUtils.lerp(.16,stanceWidth,nearSettle));
    shoeB.position.set(THREE.MathUtils.lerp(farStep.x,THREE.MathUtils.lerp(-.11,-.22,prepare),farSettle),soleHeight+farStep.lift*(1-farSettle)+Math.sin(farSettle*Math.PI)*.035+.04*drive,THREE.MathUtils.lerp(-.16,-stanceWidth,farSettle));
    shoeA.rotation.set(0,.1*(1-prepare)*nearSettle,nearStep.pitch*(1-nearSettle));
    shoeB.rotation.set(0,-.14*(1-prepare)*farSettle-.24*drive,farStep.pitch*(1-farSettle)-.16*drive);
    const legSections=[];
    for(const [side,foot,thigh,calf,knee,shorts,ankleJoint,legSurface] of [[1,shoeA,legA,legB,kneeA,shortsA,ankleA,lowerLegA],[-1,shoeB,legC,legD,kneeB,shortsB,ankleB,lowerLegB]]){
      const hip=v(shift*.55,1.43-.04*wind-.08*drive+bodyBob,side*.13);
      const ankle=v(-.045,.16,0).applyEuler(foot.rotation).add(foot.position);
      const {joint}=solveJoint(hip,ankle,.68,.67,v(.9,.7,side*.24));
      const instep=v(.015,.08,0).applyEuler(foot.rotation).add(foot.position);
      legSurface.update([joint,joint.clone().lerp(ankle,.55),ankle,instep],[.098,.083,.059,.07]);
      legSections.push({knee:joint,ankle});
      limb(thigh,hip,joint);knee.position.copy(joint);ankleJoint.position.copy(ankle);
      limb(shorts,hip,hip.clone().lerp(joint,.57));
    }
    world.updateMatrixWorld(true);
    const clothLag=Math.sin((t-CONTACT_TIME)*8)*Math.exp(-Math.max(0,t-CONTACT_TIME)*2)*(t>CONTACT_TIME?1:0);
    const ankleSpread=Math.max(Math.abs(shoeA.position.x-.045),Math.abs(shoeB.position.x-.045));
    // Only the hem needs CPU clearance updates; the garment above it is skinned.
    for(let row=0;row<=7;row++){
      const f=row/robeRings,height=THREE.MathUtils.lerp(.25,2.47,f);
      const follow=smooth((height-.5)/1.6),profile=kanduraProfile(height);
      const hemEase=(1-smooth((height-.25)/.4))*Math.max(0,ankleSpread-.32);
      for(let col=0;col<=robeSegments;col++){
        const angle=col/robeSegments*Math.PI*2;
        const fold=(Math.sin(angle*11+.28*f)*.011+Math.sin(angle*19-.8*f)*.0035)*(1-.65*f)+Math.sin(height*21+angle*4)*.003*Math.exp(-(((height-2.1)/.3)**2));
        const x=Math.cos(angle)*(profile.depth+fold+hemEase*Math.abs(Math.cos(angle))**6),z=Math.sin(angle)*(profile.width+fold);
        const base=v(x,height,z),bent=v(x,height-1.43,z).applyEuler(upper.rotation).add(upper.position);
        base.lerp(bent,follow);
        // Allow the lower fabric to drape over each calf, keeping every
        // clipped upper leg inside the garment instead of piercing its side.
        if(height<.43){
          const ray=v(base.x,0,base.z).normalize();let radius=Math.hypot(base.x,base.z);
          for(const section of legSections){
            const blend=THREE.MathUtils.clamp((height-section.ankle.y)/(section.knee.y-section.ankle.y),0,1);
            const center=section.ankle.clone().lerp(section.knee,blend),along=center.x*ray.x+center.z*ray.z;
            const perpendicular=center.x**2+center.z**2-along**2,clearance=.105;
            if(perpendicular<clearance**2)radius=Math.max(radius,along+Math.sqrt(clearance**2-perpendicular)*(1-smooth((height-.285)/.145)));
          }
          base.x=ray.x*radius;base.z=ray.z*radius;
        }
        const offset=(row*(robeSegments+1)+col)*3;
        robePositions[offset]=base.x+(clothLag*.013-walkSwing*.012)*(1-f);
        robePositions[offset+1]=base.y+Math.sin(angle*5)*.004*(1-f)+Math.abs(walkSwing)*.012*(1-f);
        robePositions[offset+2]=base.z+walkSwing*.01*(1-f);
      }
    }
    avatarBody.update(upper,robePositions);
    humanAvatar.update(upper,headGroup);
    // Compact rear-hand guard by the cheek, with the elbow underneath it.
    // Coil through the hips/shoulder rather than pulling the arm far back.
    const guard=v(.26-.025*wind,.9+.015*wind,.255+.012*wind);
    // Contact is on the near surface of the bag. Convert it into the rotating
    // chest's space so body rotation cannot accidentally lengthen the arm.
    const contact=upper.worldToLocal(v(.64,2.8,.6485));
    const wrist=guard.clone().lerp(contact,extension);
    wrist.y+=Math.sin(extension*Math.PI)*.012;
    wrist.lerp(v(.08,.12,.39),relax);
    phone.visible=t>=10;
    phone.position.copy(v(.24,.38,.23).lerp(v(.61,1.14,.015).lerp(v(.47,.67,.025),lowerPhone),raisePhone));
    const lensDirection=upper.worldToLocal(v(.75,4,.07)).sub(phone.position).normalize();
    lensDirection.y*=.7;lensDirection.normalize();
    const phoneRight=v(0,1,0).cross(lensDirection).normalize();
    const phoneUp=lensDirection.clone().cross(phoneRight).normalize();
    const aimRotation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(phoneRight,phoneUp,lensDirection));
    const pocketRotation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(v(0,0,-1),v(0,1,0),v(1,0,0)));
    phone.quaternion.copy(pocketRotation).slerp(aimRotation,raisePhone);
    const rightAnchor=gripAnchors[0].clone().applyQuaternion(phone.quaternion).add(phone.position);
    const leftAnchor=gripAnchors[1].clone().applyQuaternion(phone.quaternion).add(phone.position);
    // Take the phone with the near hand first; the other hand closes around
    // the opposite edge while it rises. Forearms end at the modeled wrists.
    wrist.lerp(rightAnchor,reachPhone);
    // Let the elbow rise into the line of the shot, leaving the forearm and
    // knuckles aligned at contact instead of pointing the fist upward.
    const punchingElbow=v(-.08,.1,.33).lerp(v(.25,1.25,.42),extension);
    poseArm(v(.02,.9,.29),wrist,punchingElbow,armA,armB,elbowA,sleeveA,glove,nearArm,naturalWeight,extension);
    const support=v(.26,.96,-.235).lerp(v(.04,.15,-.34),relax).lerp(leftAnchor,supportPhone);
    poseArm(v(.02,.9,-.29),support,v(.04,.3,-.42),backA,backB,elbowB,sleeveB,backGlove,farArm,naturalWeight);
    const fistClosure=prepare*(1-relax);
    for(const hand of [glove,backGlove]){
      for(const [i,finger] of hand.userData.fingers.entries()){
        const curl=THREE.MathUtils.lerp(.13,.95,fistClosure);
        finger.root.rotation.z=(i-1.5)*.035*(1-fistClosure);
        finger.bones[0].rotation.x=curl;
        finger.bones[1].rotation.x=THREE.MathUtils.lerp(.2,1.32,fistClosure);
        finger.bones[2].rotation.x=THREE.MathUtils.lerp(.12,.8,fistClosure);
      }
      hand.userData.thumb.rotation.z=-hand.userData.side*THREE.MathUtils.lerp(.35,.65,fistClosure);
      hand.userData.thumb.rotation.x=.35*fistClosure;
    }
    const supporting=t>=10.85;
    glove.visible=!phone.visible;backGlove.visible=!supporting;
    rightGrip.visible=false;leftGrip.visible=false;glove.visible=backGlove.visible=false;
    humanAvatar.grip(upper,phone,[reachPhone,supportPhone]);
    humanAvatar.fingers(fistClosure,[reachPhone,supportPhone]);
    humanAvatar.fitPhone(phone,[reachPhone,supportPhone]);
    phoneFlash.visible=t>=11.65&&t<11.82;
    const sinceHit=Math.max(0,t-CONTACT_TIME);
    bagPivot.quaternion.setFromAxisAngle(bagSwingAxis,bagMotion(t).angle);
    const impactLife=clamp(sinceHit/.12);impact.visible=t>=CONTACT_TIME&&t<CONTACT_TIME+.12;impact.scale.setScalar(.3+impactLife*.6);impact.rotation.z=impactLife*.15;
    impact.position.set(.704,2.826,.533);
    const scoreValue=t<CONTACT_TIME?0:Math.round(742*smooth(sinceHit/2));
    if(scoreValue!==previousScore){const ctx=score.ctx;ctx.fillStyle='#141d1d';ctx.fillRect(0,0,score.canvas.width,score.canvas.height);ctx.font='bold 260px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=scoreValue>600?'#ffcd69':'#ec9c36';ctx.shadowColor='#ff8d25';ctx.shadowBlur=10;ctx.fillText(translateExperienceText(String(scoreValue).padStart(3,'0')),512,score.canvas.height/2+10);ctx.shadowBlur=0;score.texture.needsUpdate=true;previousScore=scoreValue;}
    particles.forEach(({m,seed},i)=>{const p=t-6.8;m.visible=p>=0&&p<3.2;if(m.visible){m.position.set(.75+Math.sin(seed)*p*1.2,3.5+p*(1.7+(i%4)*.2)-p*p*.85,.1+Math.cos(seed)*p);m.rotation.set(p*seed,p*2,p*3);m.scale.setScalar(1-clamp((p-2)/1.2));}});
    if((t<10&&(previewTaken||photoTaken))||(t<11.65&&photoTaken)){
      previewTaken=photoTaken=false;photoURL=null;
      phoneScreen.plane.material.map=phoneScreen.texture;phoneScreen.plane.material.needsUpdate=true;
    }
    if(t>=11.65&&!photoTaken){photograph(true,scoreValue);photoTaken=previewTaken=true;}
    else if(t>=10.6&&!previewTaken){photograph(false,scoreValue);previewTaken=true;}
    const aspect=container.clientWidth/container.clientHeight;
    const zoom=smooth((t-5.4)/1.5)*(1-smooth((t-10)/1.3));
    const captureZoom=smooth((t-9.4)/1.2)*(1-smooth((t-13)/1));
    camera.position.set(10.5-zoom*.5+captureZoom*.9,5.9-zoom*.3-captureZoom*.3,8.4-zoom*.8-captureZoom*3.6);
    // A brief, small camera kick communicates the contact impulse, then
    // settles within a quarter second. Respect reduced-motion preferences.
    const kick=!reducedMotion&&t>=CONTACT_TIME?Math.exp(-sinceHit*18)*(1-smooth(sinceHit/.27)):0;
    camera.position.x+=Math.sin(sinceHit*75)*.075*kick;
    camera.position.y+=Math.cos(sinceHit*65)*.045*kick;
    cameraTarget.set(.1,1.95+captureZoom*.25,0);
    cameraOffset.copy(camera.position).sub(cameraTarget);orbit.setFromVector3(cameraOffset);
    orbit.theta+=view.yaw;orbit.phi=THREE.MathUtils.clamp(orbit.phi-view.pitch,.3,Math.PI/2-.08);orbit.radius*=view.zoom;
    camera.position.copy(cameraTarget).add(cameraOffset.setFromSpherical(orbit));
    if(inspectHands){
      const focus=glove.getWorldPosition(v());
      cameraTarget.copy(focus);camera.position.copy(focus).add(v(1.35,.48,1.55));
    }
    camera.lookAt(cameraTarget);
    camera.fov=aspect<1?48:34;camera.updateProjectionMatrix();
    renderer.render(scene,camera);
    const step=t<3?0:t<10?1:t<13?2:3;
    onUpdate({time:t,duration:CHOREOGRAPHY_DURATION,playbackTime:clock,playbackDuration:JOURNEY_DURATION,step,score:scoreValue,playing,speed,upload:clamp((t-13.5)/2.1),complete:t>=16});
  }
  const resize=new ResizeObserver(()=>{const {width,height}=container.getBoundingClientRect();if(width&&height){renderer.setSize(width,height);camera.aspect=width/height;draw(elapsed);}});resize.observe(container);
  function tick(now){if(disposed)return;const delta=Math.max(0,Math.min((now-last)/1000,.1));last=now;const damping=reducedMotion?1:1-Math.exp(-delta*14);for(const key of ['yaw','pitch','zoom'])view[key]+= (view['target'+key[0].toUpperCase()+key.slice(1)]-view[key])*damping;if(playing)elapsed=(elapsed+delta*speed)%JOURNEY_DURATION;draw(elapsed);raf=requestAnimationFrame(tick);}raf=requestAnimationFrame(tick);
  return {
    play(){playing=true;}, pause(){playing=false;}, toggle(){playing=!playing;},
    seek(time){elapsed=playbackTime(clamp(time,0,18.999));draw(elapsed);},
    setSpeed(value){speed=value;},
    resetView,
    capturedPhoto(){return photoURL;},
    capture(){draw(elapsed);return renderer.domElement.toDataURL('image/png');},
    dispose(){disposed=true;cancelAnimationFrame(raf);resize.disconnect();canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointermove',pointerMove);for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.removeEventListener(name,pointerUp);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('keydown',keyView);pointers.clear();scene.traverse(obj=>{obj.geometry?.dispose();if(obj.material){for(const m of Array.isArray(obj.material)?obj.material:[obj.material])m.dispose();}});resources.forEach(t=>t.dispose());photoTarget.dispose();renderer.dispose();renderer.domElement.remove();}
  };
}
