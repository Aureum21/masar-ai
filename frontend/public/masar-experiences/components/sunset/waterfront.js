import * as THREE from '../../vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
/** Illustrative UAE waterfront. No geographic/navigation accuracy is implied. */
export function buildWaterfront(scene){
 const world=new THREE.Group();scene.add(world);
 const mat=(color,r=.6,m=0)=>new THREE.MeshStandardMaterial({color,roughness:r,metalness:m});
 const stone=mat('#c8b69b',.85),gold=mat('#ba985c',.3,.55),dark=mat('#27313c'),wood=mat('#84664b');
 function mesh(g,m,p=world,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
 const box=(w,h,d,m,x=0,y=0,z=0,p=world)=>mesh(new THREE.BoxGeometry(w,h,d),m,p,x,y,z);
 const sky=new THREE.Mesh(new THREE.SphereGeometry(65,40,24),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{golden:{value:0}},vertexShader:'varying vec3 vPosition;void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 vPosition;uniform float golden;void main(){vec3 d=normalize(vPosition);float h=smoothstep(-.8,.25,d.y);vec3 top=mix(vec3(.07,.13,.22),vec3(.10,.075,.16),golden);vec3 horizon=mix(vec3(.32,.44,.53),vec3(.33,.19,.24),golden);vec3 color=mix(horizon,top,h);float glow=pow(max(0.,dot(d,normalize(vec3(-2.,3.,-9.)))),18.);color+=vec3(.24,.12,.035)*glow*golden;gl_FragColor=vec4(color,1.);}` }));sky.renderOrder=-10;scene.add(sky);
 // Rounded diorama base, with water behind and the visitor promenade in front.
 function rounded(w,h,r){const s=new THREE.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return s;}
 const base=mesh(new THREE.ExtrudeGeometry(rounded(16,13.8,1.0),{depth:.3,bevelEnabled:false}),dark);base.rotation.x=-Math.PI/2;base.position.y=-.34;
 const paving=box(15.6,.12,6.2,stone,0,.01,3.55);
 for(let x=-7.5;x<=7.5;x+=.75)box(.013,.006,6.2,mat('#a3947d'),x,.075,3.55);
 for(let z=.8;z<6.6;z+=.75)box(15.6,.006,.013,mat('#a3947d'),0,.077,z);
 const waterGeo=new THREE.PlaneGeometry(15.6,7,72,38);waterGeo.rotateX(-Math.PI/2);const waterMat=new THREE.ShaderMaterial({uniforms:{time:{value:0},golden:{value:0}},vertexShader:'varying vec3 vWater;void main(){vWater=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWater,1.);}',fragmentShader:`varying vec3 vWater;uniform float time;uniform float golden;void main(){vec3 color=mix(vec3(.07,.23,.31),vec3(.075,.15,.23),golden);float waves=sin(vWater.z*28.+sin(vWater.x*8.+time)*.6-time*1.7);color+=vec3(.012,.025,.03)*waves;float spread=.25+.11*(vWater.z+6.5);float band=exp(-pow((vWater.x+2.)/spread,2.));float shimmer=pow(max(0.,sin(vWater.z*58.+sin(vWater.x*17.+time*1.4)*1.2+time*2.)),10.);color=mix(color,vec3(.95,.62,.29),band*shimmer*golden*.75);gl_FragColor=vec4(color,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});const water=mesh(waterGeo,waterMat,world,0,.055,-2.95);water.receiveShadow=true;water.castShadow=false;
 const rest=waterGeo.attributes.position.array.slice();
 // Small glints form the broken golden reflection below the sunset.
 const glintMaterial=new THREE.MeshBasicMaterial({color:'#ffd390',transparent:true,opacity:.4,depthWrite:false});
 const glints=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),glintMaterial,64);world.add(glints);const dummy=new THREE.Object3D();
 const lightMaterial=new THREE.MeshStandardMaterial({color:'#f4d49b',emissive:'#f8b24c',emissiveIntensity:0});
 for(let i=-7;i<=7;i++){
  const x=i*1.03;box(.035,.83,.035,gold,x,.49,.67);if(i<7)box(1.03,.035,.035,gold,x+.515,.90,.67);
  box(.055,.04,.055,lightMaterial,x,.94,.67);
 }
 // Clear walk-up target: a fine brass circle in the promenade paving.
 const target=mesh(new THREE.TorusGeometry(.57,.018,8,64),gold,world,-1.15,.087,1.85);target.rotation.x=Math.PI/2;
 for(const x of [-5.9,5.9]){
  for(let slat=0;slat<5;slat++)box(1.7,.07,.075,wood,x,.48,3.7+slat*.09);
  for(const dx of [-.65,.65])box(.08,.45,.35,dark,x+dx,.25,3.9);
  const trunk=mesh(new THREE.CylinderGeometry(.085,.14,3,16),mat('#8b755b'),world,x,1.5,5.2);trunk.rotation.z=x>0?-.05:.05;
  for(let k=0;k<9;k++){const a=k/9*Math.PI*2,path=new THREE.CatmullRomCurve3([V(x,2.95,5.2),V(x+Math.cos(a)*.65,3.45,5.2+Math.sin(a)*.65),V(x+Math.cos(a)*1.3,2.85,5.2+Math.sin(a)*1.3)]);mesh(new THREE.TubeGeometry(path,14,.07,6,false),mat('#45634f'));}
 }
 // An abstract Abu Dhabi skyline; these are scenery silhouettes, not replica models.
 const skyline=new THREE.Group();world.add(skyline);const glass=mat('#54798b',.32,.55);
 for(let i=0;i<5;i++){const h=2.2+[.4,1.1,.8,.2,.7][i],x=3.4+i*.65,z=-6.05;const g=new THREE.Group();skyline.add(g);const tower=box(.42,h,.44,glass,x,h/2+.1,z,g);tower.rotation.z=(i-2)*.025;for(let f=0;f<10;f++)box(.43,.012,.45,mat('#a7bcc1',.4,.4),x,.22+f*h/10,z,g);}
 const sun=mesh(new THREE.SphereGeometry(.65,48,32),new THREE.MeshBasicMaterial({color:'#ffd997'}),world,-2,3.6,-8.3);sun.castShadow=sun.receiveShadow=false;
 const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=256;const ctx=glowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(128,128,15,128,128,128);gradient.addColorStop(0,'#ffe3adcc');gradient.addColorStop(.35,'#f5ad5755');gradient.addColorStop(1,'#e58e2200');ctx.fillStyle=gradient;ctx.fillRect(0,0,256,256);const glowMap=new THREE.CanvasTexture(glowCanvas);glowMap.colorSpace=THREE.SRGBColorSpace;const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowMap,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));glow.scale.set(5,5,1);world.add(glow);
 const boat=new THREE.Group();world.add(boat);const hull=mesh(new THREE.SphereGeometry(1,24,12),wood,boat);hull.scale.set(.65,.13,.23);box(.03,1.3,.03,gold,0,.64,0,boat);const sailShape=new THREE.Shape();sailShape.moveTo(.035,.25);sailShape.lineTo(.035,1.3);sailShape.quadraticCurveTo(.46,.9,.6,.25);sailShape.closePath();mesh(new THREE.ShapeGeometry(sailShape),new THREE.MeshStandardMaterial({color:'#d5bc91',side:THREE.DoubleSide}),boat);
 const warmLight=new THREE.DirectionalLight('#ffe0ac',3.0);warmLight.position.set(-5,9,-7);warmLight.castShadow=true;warmLight.shadow.mapSize.set(2048,2048);Object.assign(warmLight.shadow.camera,{left:-13,right:13,top:13,bottom:-13,far:45});warmLight.shadow.normalBias=.025;scene.add(warmLight);
 const ambient=new THREE.HemisphereLight(0xc4dced,0x686050,2.1);scene.add(ambient);const fill=new THREE.DirectionalLight(0xc5d8f6,1.8);fill.position.set(5,7,9);scene.add(fill);
 const fromWater=new THREE.Color('#37778e'),toWater=new THREE.Color('#405367'),fromSun=new THREE.Color('#fff0bd'),toSun=new THREE.Color('#ffb77b'),dayLight=new THREE.Color('#fff1d7'),goldLight=new THREE.Color('#ffb56d');
 function update(t,golden){
  sky.material.uniforms.golden.value=golden;waterMat.uniforms.golden.value=golden;waterMat.uniforms.time.value=t;sun.position.y=3.6-1.25*golden;sun.material.color.copy(fromSun).lerp(toSun,golden);glow.position.copy(sun.position);glow.material.opacity=.3+.5*golden;
  warmLight.color.copy(dayLight).lerp(goldLight,golden);warmLight.intensity=3.0+golden*.8;ambient.intensity=2.1-golden*.65;lightMaterial.emissiveIntensity=golden*1.6;
  const p=waterGeo.attributes.position;for(let i=0;i<p.count;i++){const x=rest[i*3],z=rest[i*3+2];p.setY(i,Math.sin(x*2.6+t*1.4+z*1.1)*.014+Math.sin(z*4.8-t*1.9)*.008);}p.needsUpdate=true;waterGeo.computeVertexNormals();
  glintMaterial.opacity=.1+.47*golden;
  for(let i=0;i<64;i++){const z=-6.2+i*.10,phase=Math.sin(i*8.31+t*2.4);dummy.position.set(-2+Math.sin(i*7.12)*(.1+(i/64)*.55),.095+Math.sin(t*1.1+i)*.008,z);dummy.rotation.set(-Math.PI/2,0,Math.sin(i*2.3)*.08);dummy.scale.set((.25+i/64*.85)*(.7+phase*.25),.018+Math.abs(Math.sin(i*6.4))*.03,1);dummy.updateMatrix();glints.setMatrixAt(i,dummy.matrix);}glints.instanceMatrix.needsUpdate=true;
  boat.position.set(3.3+Math.sin(t*.3)*.4,.19+Math.sin(t*1.4)*.015,-3.8);boat.rotation.set(Math.sin(t)*.018,-.4,Math.sin(t*1.1)*.02);
 }
 return {world,sun,update};
}
