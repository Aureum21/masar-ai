import {translateExperienceText} from "../../locale.js";
import * as T from '../../vendor/three.module.js';
import {BALL_RADIUS} from './engine.js';
import {routeDirection,chaseSteering} from './chase-motion.js';
export function createBallRollView(host,level){
  const {map}=level,scene=new T.Scene();scene.background=new T.Color('#d4d9d5');const atmosphere=new T.Fog('#d4d9d5',30,75);scene.fog=atmosphere;
  const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','Al Fahidi chase-camera trail. Arrows or WASD steer, Space hops obstacles, Shift brakes, P pauses, M opens the map.');host.prepend(canvas);
  const camera=new T.PerspectiveCamera(64,1,.04,140),focus=new T.Vector3(level.start.x,0,level.start.z);
  const chapterPath=level.path.map(i=>({x:map.nodes[i][0],z:map.nodes[i][1]})),initialForward=routeDirection(level.start,chapterPath);
  let heading=Math.atan2(initialForward.x,initialForward.z),cameraInitialized=false;
  scene.add(new T.HemisphereLight('#f0f6f5','#8d7354',2));const sun=new T.DirectionalLight('#ffe0aa',3.6);sun.position.set(-15,28,9);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);Object.assign(sun.shadow.camera,{left:-28,right:28,top:28,bottom:-28,far:80});sun.shadow.normalBias=.035;scene.add(sun);const fill=new T.DirectionalLight('#b7d7de',.8);fill.position.set(12,15,-10);scene.add(fill);
  const textures=[];
  function plaster(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#dfc9a6';ctx.fillRect(0,0,128,128);for(let i=0;i<4500;i++){const x=(i*73)%128,y=(i*37+Math.floor(i/128)*13)%128;ctx.fillStyle=i%3?'#ac8f6720':'#fff4dc38';ctx.fillRect(x,y,1+i%2,1);}const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(2,2);textures.push(tex);return tex;}
  const stoneTexture=plaster(),mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.85,...extra}),stone=mat('#f3dfbc',{map:stoneTexture}),roof=mat('#bda37b'),wood=mat('#604735'),shadow=mat('#343c37'),gold=mat('#e8bd69',{metalness:.65,roughness:.3,emissive:'#8b5914',emissiveIntensity:.1}),mint=mat('#539f94',{metalness:.3,roughness:.3}),clay=mat('#a96d4d'),green=mat('#5d7455');
  function mesh(geometry,material,x=0,y=0,z=0,parent=scene){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  const box=(w,h,d,m,x,y,z,p)=>mesh(new T.BoxGeometry(w,h,d),m,x,y,z,p);
  box(47,.4,40,mat('#b5a185'),1,-.25,.5);box(47,.03,39,mat('#cfb88e'),1,-.025,.5);
  const water=box(55,.05,9,mat('#578f91',{metalness:.35,roughness:.24}),1,-.01,-20.7);
  box(46,.15,.28,roof,1,.04,-16.1);
  const ripples=[];for(let i=0;i<28;i++)ripples.push(box(.7+(i%5)*.3,.012,.025,mat('#a3c3bc',{transparent:true,opacity:.5}),-22+i*1.7,.04,-17-i%4*.9));
  function boat(x,z){const g=new T.Group();g.position.set(x,.07,z);scene.add(g);const hull=mesh(new T.SphereGeometry(.7,16,8),wood,0,.03,0,g);hull.scale.set(1,.25,.4);box(.8,.05,.42,roof,0,.2,0,g);for(const dx of [-.3,.3])box(.035,.4,.035,wood,dx,.42,0,g);box(1,.07,.57,wood,0,.66,0,g);return g;}
  const boats=[boat(-7,-18.4),boat(9,-19.7)];
  const laneMat=mat('#eddbb8');
  const lanes=new T.InstancedMesh(new T.BoxGeometry(1,1,1),laneMat,map.edges.length),matrix=new T.Matrix4(),q=new T.Quaternion(),axis=new T.Vector3(0,1,0);
  map.edges.forEach(([ia,ib],i)=>{const a=map.nodes[ia],b=map.nodes[ib],dx=b[0]-a[0],dz=b[1]-a[1];q.setFromAxisAngle(axis,Math.atan2(dx,dz));matrix.compose(new T.Vector3((a[0]+b[0])/2,.01,(a[1]+b[1])/2),q,new T.Vector3(1.3,.035,Math.hypot(dx,dz)+.3));lanes.setMatrixAt(i,matrix);});lanes.receiveShadow=true;scene.add(lanes);
  // Paver joints along the surveyed walking centre-lines.
  const joints=[];map.edges.forEach(([ia,ib])=>{const a=map.nodes[ia],b=map.nodes[ib],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);for(let d=.3;d<len;d+=.42){const x=a[0]+dx*d/len,z=a[1]+dz*d/len;joints.push(x-dz/len*.5,.031,z+dx/len*.5,x+dz/len*.5,.031,z-dx/len*.5);}});
  const jointGeo=new T.BufferGeometry();jointGeo.setAttribute('position',new T.Float32BufferAttribute(joints,3));scene.add(new T.LineSegments(jointGeo,new T.LineBasicMaterial({color:'#aa916a',transparent:true,opacity:.25})));
  const buildings=[];
  map.buildings.forEach((b,index)=>{
    const g=new T.Group();scene.add(g);const h=b.height*1.65+.25,shape=new T.Shape();b.outline.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
    const geo=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false});geo.rotateX(-Math.PI/2);geo.computeBoundingBox();const bounds=geo.boundingBox.clone().expandByScalar(.12);const wallMat=stone.clone(),body=mesh(geo,wallMat,0,0,0,g);wallMat.transparent=true;
    const cx=b.outline.reduce((s,v)=>s+v[0],0)/b.outline.length,cz=b.outline.reduce((s,v)=>s+v[1],0)/b.outline.length;
    const roofShape=new T.Shape();b.outline.forEach(([x,z],i)=>i?roofShape.lineTo(x,-z):roofShape.moveTo(x,-z));roofShape.closePath();const roofGeo=new T.ShapeGeometry(roofShape);roofGeo.rotateX(-Math.PI/2);mesh(roofGeo,roof,0,h+.008,0,g);
    // Parapets, exposed timber beams, recessed doors and timber screens.
    b.outline.forEach((a,i)=>{
      const b2=b.outline[(i+1)%b.outline.length],dx=b2[0]-a[0],dz=b2[1]-a[1],len=Math.hypot(dx,dz),x=(a[0]+b2[0])/2,z=(a[1]+b2[1])/2;if(len<.32)return;
      const cap=box(len+.04,.14,.1,stone,x,h+.05,z,g);cap.rotation.y=-Math.atan2(dz,dx);
      if(len>.8){
        const normal=new T.Vector3(dz/len,0,-dx/len),facade=new T.Group();facade.position.set(x,.02,z);facade.rotation.y=Math.atan2(normal.x,normal.z);g.add(facade);
        box(.31,.65,.035,wood,0,.32,.04,facade);const arch=mesh(new T.CircleGeometry(.155,16,0,Math.PI),wood,0,.65,.06,facade);box(.36,.045,.1,roof,0,.01,.05,facade);
        if(len>1.6)for(const side of [-1,1]){box(.22,.28,.035,shadow,side*.55,.95,.055,facade);for(let slat=0;slat<5;slat++)box(.012,.28,.025,wood,side*.55-.085+slat*.043,.95,.08,facade);}
        if(index%4===0){for(const side of [-1,1])box(.035,.4,.035,wood,side*.27,1.1,.1,facade);box(.65,.05,.48,wood,0,1.3,.22,facade);}
      }
    });
    if(b.tower){const tower=new T.Group();tower.position.set(cx,h,cz);g.add(tower);box(.65,.48,.65,stone,0,.24,0,tower);for(const side of [-1,1]){box(.5,.45,.02,shadow,0,.67,side*.32,tower);box(.02,.45,.5,shadow,side*.32,.67,0,tower);}for(const x of [-.3,.3])for(const z of [-.3,.3])box(.09,.68,.09,stone,x,.7,z,tower);box(.78,.1,.78,stone,0,1.06,0,tower);for(const side of [-1,1])box(.035,.06,1.05,wood,side*.15,1.04,0,tower);}
    const copies=new Map([[wallMat,wallMat]]);g.traverse(o=>{if(!o.material)return;if(!copies.has(o.material))copies.set(o.material,o.material.clone());o.material=copies.get(o.material);o.material.transparent=true;});
    buildings.push({body,wallMat,cx,cz,g,bounds,fadeMaterials:[...copies.values()]});
  });
  // Date palms at the district edges; furnishings sit clear of walking lines.
  for(const [x,z] of [[-19.8,12.8],[-16,7],[-10,15],[4,14],[12,10],[18,5],[17,-13],[-9,-13]]){
    const tree=new T.Group();tree.position.set(x,0,z);scene.add(tree);mesh(new T.CylinderGeometry(.07,.11,1.9,9),wood,0,.95,0,tree);
    for(let k=0;k<9;k++){const leaf=mesh(new T.SphereGeometry(1,12,6),green,Math.sin(k*.7)*.38,1.96,Math.cos(k*.7)*.38,tree);leaf.scale.set(.13,.07,.9);leaf.rotation.set(.25,k*.7,0);}
    mesh(new T.CylinderGeometry(.25,.18,.35,12),clay,0,.17,0,tree);
  }
  const labels=[];
  function label(text,x,z){const c=document.createElement('canvas');c.width=512;c.height=100;const ctx=c.getContext('2d');ctx.fillStyle='#253d37ee';ctx.fillRect(0,0,512,100);ctx.strokeStyle='#ccae78';ctx.lineWidth=4;ctx.strokeRect(3,3,506,94);ctx.fillStyle='#f5e8cd';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='500 30px Arial';ctx.fillText(translateExperienceText(text),256,52);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;textures.push(tex);const sprite=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:false}));sprite.position.set(x,2.4,z);sprite.scale.set(1.8,.35,1);scene.add(sprite);labels.push(sprite);}
  label('AL FAHIDI  /  الفهيدي',level.start.x,level.start.z-2.1);
  const rewards=level.rewards.map((r,i)=>{
    const g=new T.Group();g.position.set(r.x,0,r.z);scene.add(g);const ring=mesh(new T.TorusGeometry(.34,.035,8,40),gold,0,.06,0,g);ring.rotation.x=Math.PI/2;const coin=mesh(new T.CylinderGeometry(.23,.23,.06,32),gold,0,.55,0,g);coin.rotation.x=Math.PI/2;const inner=mesh(new T.TorusGeometry(.155,.012,6,32),mint,0,.55,.04,g);return {g,coin,inner,ring};
  });
  const finish=mesh(new T.TorusGeometry(.4,.045,10,48),mint,level.finish.x,.06,level.finish.z);finish.rotation.x=Math.PI/2;
  const cargo=level.obstacles.map(o=>{
    const g=new T.Group();scene.add(g);g.rotation.y=-Math.atan2(o.nz,o.nx);
    if(o.kind==='pot'){
      mesh(new T.CylinderGeometry(.13,.17,.23,20),clay,0,.12,0,g);const lip=mesh(new T.TorusGeometry(.135,.025,8,28),roof,0,.25,0,g);lip.rotation.x=Math.PI/2;mesh(new T.CircleGeometry(.11,20),shadow,0,.252,0,g).rotation.x=-Math.PI/2;
    }else if(o.kind==='cart'){
      box(.47,.18,.35,wood,0,.15,0,g);for(const x of [-.19,.19])for(const z of [-.14,.14])mesh(new T.SphereGeometry(.055,10,8),shadow,x,.06,z,g);
      for(const x of [-.1,.1])box(.16,.1,.17,roof,x,.29,0,g);
    }else{
      box(.57,.13,.2,wood,0,.1,0,g);for(const x of [-.24,.24])box(.055,.18,.25,roof,x,.09,0,g);
      for(const x of [-.18,0,.18]){const stripe=box(.045,.009,.2,gold,x,.17,0,g);stripe.rotation.y=-.35;}
    }
    // An in-world warning ring is visible before the obstacle is reached.
    const ring=mesh(new T.TorusGeometry(o.r+.1,.012,6,32),mat('#c58840'),0,.05,0,g);ring.rotation.x=Math.PI/2;
    return g;
  });
  const hex=document.createElement('canvas');hex.width=hex.height=256;const hx=hex.getContext('2d');hx.fillStyle='#e5c57c';hx.fillRect(0,0,256,256);hx.lineWidth=1.5;hx.strokeStyle='#705832';
  for(let row=-1;row<16;row++)for(let col=-1;col<14;col++){const cx=col*Math.sqrt(3)*13+(row%2)*Math.sqrt(3)*6.5,cy=row*19.5;hx.beginPath();for(let k=0;k<6;k++){const a=-Math.PI/2+k*Math.PI/3;const x=cx+13*Math.cos(a),y=cy+13*Math.sin(a);k?hx.lineTo(x,y):hx.moveTo(x,y);}hx.closePath();hx.stroke();}
  const hexTex=new T.CanvasTexture(hex);hexTex.colorSpace=T.SRGBColorSpace;textures.push(hexTex);
  const player=new T.Group();scene.add(player);const orb=mesh(new T.SphereGeometry(BALL_RADIUS,48,32),mat('#f7dca1',{map:hexTex,bumpMap:hexTex,bumpScale:.006,metalness:.55,roughness:.3}),0,BALL_RADIUS+.035,0,player);const stripe=mesh(new T.TorusGeometry(BALL_RADIUS+.003,.016,8,40),shadow,0,0,0,orb);stripe.rotation.x=.4;
  const halo=mesh(new T.TorusGeometry(.27,.014,6,32),gold,0,.055,0,player);halo.rotation.x=Math.PI/2;
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const shadowContext=shadowCanvas.getContext('2d'),shadowGradient=shadowContext.createRadialGradient(32,32,2,32,32,32);shadowGradient.addColorStop(0,'#493b29dd');shadowGradient.addColorStop(.45,'#493b2988');shadowGradient.addColorStop(1,'#493b2900');shadowContext.fillStyle=shadowGradient;shadowContext.fillRect(0,0,64,64);const shadowTexture=new T.CanvasTexture(shadowCanvas);textures.push(shadowTexture);
  const contactShadow=mesh(new T.CircleGeometry(.24,32),new T.MeshBasicMaterial({map:shadowTexture,transparent:true,opacity:.35,depthWrite:false}),0,.042,0,player);contactShadow.rotation.x=-Math.PI/2;
  const trail=new T.Line(new T.BufferGeometry(),new T.LineDashedMaterial({color:'#d18a19',dashSize:.15,gapSize:.12,transparent:true,opacity:.9,depthTest:false}));trail.renderOrder=3;scene.add(trail);
  const dir=mesh(new T.ConeGeometry(.09,.22,3),gold,0,.45,0,player);dir.rotation.x=Math.PI/2;
  const raycaster=new T.Raycaster(),occlusionObjects=[],owners=new WeakMap();
  buildings.forEach(b=>b.g.traverse(o=>{if(o.isMesh){occlusionObjects.push(o);owners.set(o,b.body);}}));
  // A readable player silhouette remains visible through covered passages.
  orb.material.depthTest=false;orb.material.transparent=true;orb.renderOrder=8;stripe.material=shadow.clone();stripe.material.depthTest=false;stripe.material.transparent=true;stripe.renderOrder=9;
  let width=1,height=1,lastX=level.start.x,lastZ=level.start.z,overview=false,lastRouteKey='',lastTick=0,hideTick=-1;
  function resize(){width=host.clientWidth;height=host.clientHeight;if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  return {canvas,toggleMap(){overview=!overview;return overview;},steer(x,z){return overview?{x,z}:chaseSteering(x,z,heading);},
    render(state,t,model){
      const dt=Math.min(.05,Math.max(0,t-lastTick));lastTick=t;const mapView=overview||state.status==='won';
      scene.fog=mapView?null:atmosphere;
      if(!mapView&&(state.status==='running'||state.status==='ready')){
        const f=routeDirection(state,chapterPath,{x:Math.sin(heading),z:Math.cos(heading)}),targetHeading=Math.atan2(f.x,f.z),delta=Math.atan2(Math.sin(targetHeading-heading),Math.cos(targetHeading-heading));heading+=delta*(1-Math.exp(-dt*4));
      }
      const fx=Math.sin(heading),fz=Math.cos(heading),target=mapView?new T.Vector3(1,0,.5):new T.Vector3(state.x+fx*.85,.2+state.y*.25,state.z+fz*.85);
      const cameraTarget=mapView?new T.Vector3(1,Math.max(38,37/camera.aspect),22.5):new T.Vector3(state.x-fx*1.45,1.05+state.y*.15,state.z-fz*1.45);
      const teleport=Math.hypot(state.x-lastX,state.z-lastZ)>1;
      if(!cameraInitialized||teleport){camera.position.copy(cameraTarget);focus.copy(target);cameraInitialized=true;}else{focus.lerp(target,1-Math.exp(-dt*9));camera.position.lerp(cameraTarget,1-Math.exp(-dt*8));}camera.lookAt(focus);
      const dx=state.x-lastX,dz=state.z-lastZ;if(Math.hypot(dx,dz)<1){orb.rotateOnWorldAxis(new T.Vector3(0,0,-1),dx/BALL_RADIUS);orb.rotateOnWorldAxis(new T.Vector3(1,0,0),dz/BALL_RADIUS);}lastX=state.x;lastZ=state.z;player.position.set(state.x,state.y,state.z);orb.visible=state.invulnerable===0||Math.floor(t*12)%2===0;stripe.visible=orb.visible;
      cargo.forEach((g,i)=>{const p=model.obstaclePosition(level.obstacles[i]);g.position.set(p.x,0,p.z);});
      contactShadow.position.y=.042-state.y;contactShadow.scale.setScalar(1+state.y*.6);contactShadow.material.opacity=.35/(1+state.y*3);
      rewards.forEach((r,i)=>{r.g.visible=!state.answered.has(level.rewards[i].quiz.id);r.coin.rotation.z=state.elapsed*.7;r.inner.rotation.z=state.elapsed*.7;r.g.scale.setScalar(i===state.answered.size?1:.75);});
      halo.visible=mapView;dir.visible=mapView;
      finish.visible=state.answered.size===3;const next=model.nextReward()??level.finish;dir.position.set(Math.sin(Math.atan2(next.x-state.x,next.z-state.z))*.38,.4,Math.cos(Math.atan2(next.x-state.x,next.z-state.z))*.38);dir.rotation.z=-Math.atan2(next.x-state.x,next.z-state.z);
      const routeKey=`${model.nearest(state)}-${state.answered.size}`;if(routeKey!==lastRouteKey){lastRouteKey=routeKey;const pts=model.targetPath().map(p=>new T.Vector3(p.x,.075,p.z));trail.geometry.dispose();trail.geometry=new T.BufferGeometry().setFromPoints(pts);trail.computeLineDistances();}
      if(t-hideTick>.12){hideTick=t;const ballPosition=new T.Vector3(state.x,.23+state.y,state.z),direction=ballPosition.clone().sub(camera.position);raycaster.set(camera.position,direction.clone().normalize());scene.updateMatrixWorld(true);const occluders=new Set(mapView?[]:raycaster.intersectObjects(occlusionObjects,false).filter(h=>h.distance<direction.length()-.15).map(h=>owners.get(h.object)));buildings.forEach(b=>{const fade=!mapView&&(occluders.has(b.body)||b.bounds.containsPoint(camera.position));b.fadeMaterials.forEach(m=>{m.opacity=fade?.1:1;m.depthWrite=!fade;});});}
      ripples.forEach((r,i)=>r.position.x+=Math.sin(t*.3+i)*.0005);boats.forEach((b,i)=>b.position.y=.09+Math.sin(t*.7+i)*.015);renderer.render(scene,camera);
    },
    dispose(){observer.disconnect();const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());sun.shadow.map?.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();}
  };
}
