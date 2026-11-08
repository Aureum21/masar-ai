import {translateExperienceText} from "../../locale.js";
import * as T from '../../vendor/three.module.js';

export function createArcadeView(canvas,model,{reducedMotion=false}={}){
  const {level,state}=model,scene=new T.Scene();scene.background=new T.Color('#101319');
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  const camera=new T.OrthographicCamera(-25,25,20,-20,.1,140),focus=new T.Vector3(1,0,0),offset=new T.Vector3(24,32,27);
  scene.add(new T.HemisphereLight(0xe7edfa,0x4b3826,2.2));const sun=new T.DirectionalLight(0xffe1ac,3);sun.position.set(-12,24,12);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-28,right:28,top:28,bottom:-28,far:70});sun.shadow.normalBias=.035;scene.add(sun);const fill=new T.DirectionalLight(0xc2dae3,1);fill.position.set(15,12,-8);scene.add(fill);
  const material=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.85,...extra});
  const gold=material('#e9b85c',{metalness:.4,roughness:.4,emissive:'#6f4711',emissiveIntensity:.15}),wood=material('#704b32'),dark=material('#252932'),sand=material('#bba685'),teal=material('#487976');
  function mesh(geometry,mat,parent=scene,x=0,y=0,z=0){const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  const box=(w,h,d,mat,parent=scene,x=0,y=0,z=0)=>mesh(new T.BoxGeometry(w,h,d),mat,parent,x,y,z);
  const ball=(r,mat,parent=scene,x=0,y=0,z=0)=>mesh(new T.SphereGeometry(r,12,8),mat,parent,x,y,z);
  box(42,.65,35,material('#252a32'),scene,1,-.44,.5);box(41.6,.12,34.6,material('#342f2a'),scene,1,-.055,.5);
  // A creek accent anchors the northern edge of this cartographic diorama.
  box(41,.03,2,material('#255354',{metalness:.35,roughness:.35}),scene,1,.01,-15.5);
  for(let i=0;i<9;i++)box(2.4,.012,.025,material('#69908b'),scene,-16+i*4,.04,-15.4+(i%3)*.28);
  const edge=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(41.7,.14,34.7)),new T.LineBasicMaterial({color:'#8f733e',transparent:true,opacity:.65}));edge.position.set(1,-.02,.5);scene.add(edge);
  const lanes=new T.InstancedMesh(new T.BoxGeometry(1,1,1),material('#ffffff'),level.edges.length),matrix=new T.Matrix4(),q=new T.Quaternion();
  level.edges.forEach(([a,b],i)=>{a=level.nodes[a];b=level.nodes[b];const dx=b[0]-a[0],dz=b[1]-a[1];q.setFromAxisAngle(new T.Vector3(0,1,0),Math.atan2(dx,dz));matrix.compose(new T.Vector3((a[0]+b[0])/2,.018,(a[1]+b[1])/2),q,new T.Vector3(.68,.025,Math.hypot(dx,dz)+.12));lanes.setMatrixAt(i,matrix);});lanes.receiveShadow=true;scene.add(lanes);
  const buildings=[];
  level.buildings.forEach((b,index)=>{
    const shape=new T.Shape();b.outline.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
    const geometry=new T.ExtrudeGeometry(shape,{depth:b.height,bevelEnabled:false});geometry.rotateX(-Math.PI/2);
    const mat=material('#c4af8a');const building=mesh(geometry,mat);
    const cx=b.outline.reduce((sum,p)=>sum+p[0],0)/b.outline.length,cz=b.outline.reduce((sum,p)=>sum+p[1],0)/b.outline.length;
    const outline=new T.LineSegments(new T.EdgesGeometry(geometry,25),new T.LineBasicMaterial({color:'#d9c59d',transparent:true,opacity:.32}));building.add(outline);
    const nearest=model.nearest({x:cx,z:cz});buildings.push({mesh:building,mat,cx,cz,nearest});
    if(b.tower){
      const tower=new T.Group();tower.position.set(cx,b.height,cz);scene.add(tower);
      box(.59,.07,.59,sand,tower,0,.06,0);box(.5,.42,.5,sand,tower,0,.28,0);
      for(const side of [-1,1]){box(.37,.22,.012,dark,tower,0,.3,side*.254);box(.012,.22,.37,dark,tower,side*.254,.3,0);}
      for(const x of [-.24,.24])for(const z of [-.24,.24])box(.065,.34,.065,sand,tower,x,.37,z);
      box(.65,.09,.65,sand,tower,0,.58,0);box(.7,.04,.7,gold,tower,0,.64,0);
    }
    if(index%7===0){const hatch=box(.24,.035,.25,wood,scene,cx,b.height+.025,cz);hatch.rotation.y=index*.8;}
  });
  // Decorative date palms live on the edge of the playable lanes.
  for(const i of [8,51,98,143]){
    const p=level.nodes[i],tree=new T.Group();tree.position.set(p[0]+.9,0,p[1]+.5);scene.add(tree);
    mesh(new T.CylinderGeometry(.055,.075,.95,7),wood,tree,0,.48,0);
    for(let k=0;k<7;k++){const leaf=mesh(new T.CapsuleGeometry(.055,.6,2,5),teal,tree,Math.sin(k)*.22,1.04,Math.cos(k)*.22);leaf.rotation.set(Math.cos(k)*.9,0,Math.sin(k)*.9);}
  }
  const checkpoints=level.checkpoints.map((c,index)=>{
    const [x,z]=level.nodes[c.node],g=new T.Group();g.position.set(x,.05,z);scene.add(g);
    const mat=material('#f2c364',{emissive:'#b87921',emissiveIntensity:.45}),ring=mesh(new T.TorusGeometry(.43,.035,8,40),mat,g);ring.rotation.x=-Math.PI/2;
    const beacon=mesh(new T.OctahedronGeometry(.18),mat,g,0,.72,0);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#17191e';ctx.beginPath();ctx.arc(64,64,50,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f2c364';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle='#f2c364';ctx.font='bold 55px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(translateExperienceText(String(index+1)),64,66);
    const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;const sprite=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:false}));sprite.scale.set(.62,.62,1);sprite.position.y=1.4;g.add(sprite);
    return {g,ring,beacon,mat,sprite};
  });
  const coins=level.coins.map(([x,z])=>{const m=mesh(new T.OctahedronGeometry(.13),gold,scene,x,.4,z);return m;});
  const carts=level.hazards.map((h,index)=>{
    const g=new T.Group();scene.add(g);box(.55,.25,.45,wood,g,0,.27,0);box(.44,.28,.32,material(index?'#b9955f':'#687d78'),g,0,.51,0);
    for(const x of [-.23,.23])for(const z of [-.18,.18]){const wheel=mesh(new T.CylinderGeometry(.085,.085,.04,10),dark,g,x,.13,z);wheel.rotation.z=Math.PI/2;}
    g.rotation.y=Math.atan2(h.axis[0],h.axis[1]);
    const points=[-1,1].map(s=>new T.Vector3(h.center[0]+h.axis[0]*h.amplitude*s,.06,h.center[1]+h.axis[1]*h.amplitude*s));const line=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineDashedMaterial({color:'#cc9960',dashSize:.12,gapSize:.15,transparent:true,opacity:.7}));line.computeLineDistances();scene.add(line);return g;
  });
  const player=new T.Group(),body=new T.Group();player.add(body);scene.add(player);
  const ivory=material('#f3e9d4'),skin=material('#b7885d'),hair=material('#392b22'),boots=material('#272b31');
  const core=mesh(new T.CapsuleGeometry(.125,.24,5,12),ivory,body,0,.41,0);core.scale.z=.78;
  ball(.125,skin,body,0,.74,0);const hat=mesh(new T.SphereGeometry(.13,14,8,0,Math.PI*2,0,Math.PI/2),ivory,body,0,.77,0);
  box(.2,.045,.15,ivory,body,0,.79,.08);
  for(const side of [-1,1])ball(.014,hair,body,side*.047,.75,.11);
  const arms=[],legs=[];
  for(const side of [-1,1]){
    const arm=new T.Group();arm.position.set(side*.155,.54,0);body.add(arm);mesh(new T.CapsuleGeometry(.043,.18,3,8),ivory,arm,0,-.12,0);ball(.046,skin,arm,0,-.245,0);arms.push(arm);
    const leg=new T.Group();leg.position.set(side*.071,.28,0);body.add(leg);mesh(new T.CapsuleGeometry(.044,.16,3,8),wood,leg,0,-.115,0);box(.10,.075,.16,boots,leg,0,-.245,.025);legs.push(leg);
  }
  box(.22,.25,.105,teal,body,0,.45,-.13);for(const side of [-1,1])box(.022,.23,.02,gold,body,side*.085,.48,.105);
  const halo=mesh(new T.TorusGeometry(.29,.026,8,40),gold,player,0,.045,0);halo.rotation.x=-Math.PI/2;
  const arrow=mesh(new T.ConeGeometry(.11,.2,3),new T.MeshBasicMaterial({color:'#f3c771',depthTest:false}),player,0,1.11,0);arrow.rotation.z=Math.PI;arrow.renderOrder=5;arrow.castShadow=false;
  const trail=new T.Line(new T.BufferGeometry(),new T.LineDashedMaterial({color:'#f6cc77',dashSize:.16,gapSize:.11,transparent:true,opacity:1}));scene.add(trail);
  let trailPoints=[],overview=false,halfHeight=21,lastTint=-1,walkPhase=0,heading=0,width=1,height=1;
  const clock=new T.Clock(),ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0);
  function resize(){const r=canvas.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);renderer.setSize(width,height,false);}
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  function draw(dt){
    const time=clock.getElapsedTime(),active=state.status==='running',won=state.status==='won';
    const desired=(overview||won||state.status==='ready')?Math.max(21,27/(width/height)):10.8;halfHeight+=(desired-halfHeight)*(reducedMotion?1:1-Math.exp(-dt*3.4));
    const target=(overview||won||state.status==='ready')?new T.Vector3(1,0,.5):new T.Vector3(state.player.x,.15,state.player.z);
    focus.lerp(target,reducedMotion?1:1-Math.exp(-dt*4));camera.position.copy(focus).add(offset);camera.lookAt(focus);camera.left=-halfHeight*width/height;camera.right=halfHeight*width/height;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();
    player.position.set(state.player.x,.03,state.player.z);
    let difference=Math.atan2(Math.sin(state.heading-heading),Math.cos(state.heading-heading));heading+=difference*(1-Math.exp(-dt*13));player.rotation.y=heading;
    if(state.moving&&active)walkPhase+=dt*12;
    const swing=state.moving&&active?Math.sin(walkPhase)*.55:0;arms.forEach((a,i)=>a.rotation.x=T.MathUtils.damp(a.rotation.x,(i?1:-1)*swing*.7,14,dt));legs.forEach((l,i)=>l.rotation.x=T.MathUtils.damp(l.rotation.x,(i?-1:1)*swing,14,dt));body.position.y=state.moving&&active?Math.abs(Math.sin(walkPhase))*.025:0;halo.material=state.invulnerable>0?teal:gold;
    checkpoints.forEach((c,i)=>{const done=i<state.checkpoints,hot=i===state.checkpoints;c.mat.color.set(done?'#78b7a5':hot?'#f2c364':'#68665e');c.mat.emissiveIntensity=hot?.5:.1;c.beacon.rotation.y=time*.8;c.beacon.position.y=.73+(reducedMotion?0:Math.sin(time*2+i)*.07);c.sprite.visible=!done;c.sprite.scale.setScalar(1.05*halfHeight/10.8);c.sprite.material.opacity=hot?1:.55;c.ring.scale.setScalar(hot?1+Math.sin(time*2)*.05:1);});
    coins.forEach((coin,i)=>{coin.visible=!state.coins.has(i);coin.rotation.y=time;coin.position.y=.4+(reducedMotion?0:Math.sin(time*2+i)*.055);});
    carts.forEach((cart,i)=>{const p=model.hazardPosition(i);cart.position.set(p.x,0,p.z);});
    trail.visible=state.hintUntil>state.elapsed&&state.status==='running';trail.material.opacity=Math.min(1,Math.max(0,state.hintUntil-state.elapsed));
    if(time-lastTint>.18){lastTint=time;const tint=new T.Color();level.edges.forEach(([a,b],i)=>lanes.setColorAt(i,tint.set(won||state.discovered.has(a)||state.discovered.has(b)?'#827155':'#32363e')));lanes.instanceColor.needsUpdate=true;buildings.forEach(b=>{
      const seen=won||state.discovered.has(b.nearest),close=Math.hypot(b.cx-state.player.x,b.cz-state.player.z)<1.1;
      b.mat.color.set(seen?'#c4af8a':'#343943');b.mat.transparent=close;b.mat.opacity=close?.42:1;
    });}
    renderer.render(scene,camera);
  }
  return {draw,
    showTrail(points){trailPoints=points;trail.geometry.dispose();trail.geometry=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(p.x,.075,p.z)));trail.computeLineDistances();},
    toggleMap(){overview=!overview;return overview;},
    groundPoint(clientX,clientY){const rect=canvas.getBoundingClientRect(),p=new T.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);ray.setFromCamera(p,camera);const marker=ray.intersectObjects(checkpoints.map(c=>c.sprite)).find(hit=>hit.object.visible);if(marker){const i=checkpoints.findIndex(c=>c.sprite===marker.object),node=level.nodes[level.checkpoints[i].node];return {x:node[0],z:node[1]};}const hit=ray.ray.intersectPlane(plane,new T.Vector3());return hit?{x:hit.x,z:hit.z}:null;},
    screenInput(x,y){const forward=new T.Vector2(-offset.x,-offset.z).normalize(),right=new T.Vector2(-forward.y,forward.x);return {x:right.x*x+forward.x*y,z:right.y*x+forward.y*y};},
    dispose(){observer.disconnect();const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);if(m.map)textures.add(m.map);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();}
  };
}
