import * as THREE from '../../vendor/three.module.js';
import {buildFutureMuseum} from './future-museum.js';
/** Recognisable miniature interpretations, rather than survey-accurate replicas. */
export function buildLandmarks(world){
 const material=(color,roughness=.5,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const stone=material('#e5d5b9',.8),white=material('#f5f0e4',.4),gold=material('#c6a151',.3,.65),glass=material('#a2b8c3',.28,.62),silver=material('#c1cad3',.34,.45),dark=material('#273747',.4);
 function mesh(g,m,p,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;}
 const box=(p,w,h,d,m,x=0,y=0,z=0)=>mesh(new THREE.BoxGeometry(w,h,d),m,p,x,y,z);
 const cyl=(p,a,b,h,m,x=0,y=0,z=0)=>mesh(new THREE.CylinderGeometry(a,b,h,40),m,p,x,y,z);
 const groups={};for(const id of ['burj','future','mosque']){const g=new THREE.Group();groups[id]=g;world.add(g);}
 const burj=groups.burj;
 // Three tapering wings with alternating setbacks around a continuous core.
 cyl(burj,.18,.48,8.8,glass,0,4.4,0);
 for(let wing=0;wing<3;wing++){
  const angle=wing*Math.PI*2/3;const g=new THREE.Group();g.rotation.y=angle;burj.add(g);
  for(let tier=0;tier<8;tier++){
   const height=1.3+tier*.91+wing*.11,width=1.12-tier*.105,depth=1.9-tier*.19;
   const o=cyl(g,width*.5,width*.51,.96,glass,0,.48+tier*.96,-depth*.36);o.scale.z=depth/width;
   for(let floor=0;floor<6;floor++){const ledge=cyl(g,(width+.025)*.5,(width+.025)*.5,.018,silver,0,tier*.96+.10+floor*.15,-depth*.36);ledge.scale.z=(depth+.025)/(width+.025);ledge.castShadow=false;}
   for(const x of [-.34,0,.34])if(Math.abs(x)<width/2){box(g,.014,.94,.012,silver,x,.48+tier*.96,depth*.14+.009);}
  }
 }
 cyl(burj,.075,.19,1.65,silver,0,8.75,0);cyl(burj,.012,.07,1.25,silver,0,10.08,0);
 cyl(burj,2.2,2.45,.15,stone,0,.04,0);
 // Museum shell has an offset void, asymmetric mass and local steel reflections.
 buildFutureMuseum(groups.future);
 // Mosque courtyard, arcades, domes, four minarets and reflecting water.
 const mosque=groups.mosque;
 box(mosque,8,.15,6,white,0,.02,0);box(mosque,5.1,1.6,2.45,white,0,.87,-1.05);
 const water=material('#397681',.15,.4);
 box(mosque,1.0,.045,5.9,water,-4.35,.02,0);box(mosque,1.0,.045,5.9,water,4.35,.02,0);box(mosque,7.8,.045,.85,water,0,.025,3.2);
 function dome(x,z,r,y){const profile=[[0,0],[r*.85,0],[r,.18*r],[r*.95,.65*r],[r*.6,1.25*r],[r*.15,1.6*r],[0,1.68*r]].map(([a,b])=>new THREE.Vector2(a,b));mesh(new THREE.LatheGeometry(profile,48),white,mosque,x,y,z);cyl(mosque,.02,.035,.3,gold,x,y+1.68*r+.12,z);}
 dome(0,-1.1,1.13,1.67);dome(-1.9,-1.05,.63,1.67);dome(1.9,-1.05,.63,1.67);
 for(const x of [-3.65,3.65])for(const z of [-2.5,2.5]){cyl(mosque,.14,.25,3.7,white,x,1.93,z);cyl(mosque,.32,.32,.13,gold,x,3.4,z);cyl(mosque,.12,.14,.7,white,x,4.1,z);mesh(new THREE.ConeGeometry(.15,.6,32),gold,mosque,x,4.75,z);}
 for(const z of [.2,1.65])for(let i=-4;i<=4;i++){const x=i*.7;cyl(mosque,.06,.075,1.5,white,x,.8,z);cyl(mosque,.13,.06,.19,gold,x,1.58,z);}
 for(const z of [.2,1.65]){box(mosque,6.1,.15,.24,white,0,1.75,z);for(let x=-2.8;x<=2.8;x+=.7)dome(x,z,.23,1.82);}
 // Geometric courtyard inlay hints at the floral marble floor without copying it.
 for(let i=0;i<9;i++){const petal=mesh(new THREE.CircleGeometry(.20,24),gold,mosque,Math.cos(i*.7)*1.05,.105,Math.sin(i*.7)*.65+1.8);petal.rotation.x=-Math.PI/2;petal.scale.y=.5;}
 return groups;
}
