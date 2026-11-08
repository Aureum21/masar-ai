import * as THREE from '../../vendor/three.module.js';
import {createHumanAvatar} from '../boxing/makehuman-avatar.js';
import {createAvatarBody} from '../boxing/avatar-body.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z),clamp=THREE.MathUtils.clamp;
export function createSunsetVisitor(world,assets,photoTexture){
 const actor=new THREE.Group();world.add(actor);const torso=new THREE.Group();torso.position.y=1.43;actor.add(torso);const head=new THREE.Group();torso.add(head);
 const fabric=new THREE.MeshPhysicalMaterial({color:'#f7f3eb',roughness:.88,sheen:.4,side:THREE.DoubleSide});
 const human=createHumanAvatar(assets,actor,fabric),body=createAvatarBody(actor,fabric),hem=body.mesh.geometry.attributes.position.array.slice(0,8*81*3);
 const dark=new THREE.MeshStandardMaterial({color:'#141b25',roughness:.3}),metal=new THREE.MeshStandardMaterial({color:'#65717b',metalness:.8,roughness:.25});
 const mesh=(g,m,p,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o;};
 const box=(w,h,d,m,p,x=0,y=0,z=0)=>mesh(new THREE.BoxGeometry(w,h,d),m,p,x,y,z);
 const feet=[];for(const side of [-1,1]){const foot=new THREE.Group();actor.add(foot);box(.38,.07,.2,new THREE.MeshStandardMaterial({color:'#352a20'}),foot,.06,.055,side*.22);box(.13,.04,.2,metal,foot,.09,.105,side*.22);feet.push(foot);}
 const phone=new THREE.Group();torso.add(phone);
 function rounded(w,h,d,r,m,x=0,y=0,z=0){const s=new THREE.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,curveSegments:8});g.translate(0,0,-d/2);return mesh(g,m,phone,x,y,z);}
 rounded(.25,.49,.034,.024,metal);rounded(.232,.468,.006,.02,dark,0,0,-.023);rounded(.087,.12,.016,.018,dark,-.06,.15,.029);
 for(const y of [.125,.18]){const lens=mesh(new THREE.SphereGeometry(.021,20,12),dark,phone,-.06,y,.045);lens.scale.z=.25;}
 const screen=mesh(new THREE.PlaneGeometry(.214,.285),new THREE.MeshBasicMaterial({map:photoTexture,toneMapped:false}),phone,0,.02,-.028);screen.rotation.y=Math.PI;
 const shutter=mesh(new THREE.SphereGeometry(.022,20,12),new THREE.MeshBasicMaterial({color:'#f3e9d8'}),phone,0,-.184,-.03);shutter.scale.z=.1;
 box(.045,.006,.003,metal,phone,0,.212,-.03);
 function arm(side,target,pole){const shoulder=V(.02,.9,side*.29),dir=target.clone().sub(shoulder),d=clamp(dir.length(),.04,1.055);dir.normalize();const end=shoulder.clone().addScaledVector(dir,d),along=(.55**2-.52**2+d*d)/(2*d),bend=pole.clone().sub(shoulder);bend.addScaledVector(dir,-bend.dot(dir)).normalize();const elbow=shoulder.clone().addScaledVector(dir,along).addScaledVector(bend,Math.sqrt(Math.max(0,.55**2-along*along)));body.setArm(side,shoulder,elbow,end);const forward=end.clone().sub(elbow).normalize(),normal=V(.03,0,-side);normal.addScaledVector(forward,-normal.dot(forward)).normalize().multiplyScalar(side);const across=forward.clone().cross(normal).normalize();human.setArm(side,shoulder,elbow,end,new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,forward,normal)),torso);}
 function update(t,s,sun){
  const gait=Math.sin(s.walk*Math.PI*5)*Math.sin(s.walk*Math.PI);
  actor.position.set(-4.7+s.walk*3.55,.08+Math.abs(gait)*.018,3.8-s.walk*1.95);actor.rotation.y=.5+(1.65-.5)*THREE.MathUtils.smoothstep(s.walk,.65,1);
  torso.position.y=1.43+Math.sin(t*2.1)*.006;torso.rotation.set(0,gait*.025,-Math.abs(gait)*.018);head.rotation.z=.04*s.lift-.13*s.review;
  feet[0].position.x=gait*.12;feet[1].position.x=-gait*.12;feet[0].position.y=Math.max(0,gait)*.04;feet[1].position.y=Math.max(0,-gait)*.04;
  body.update(torso,hem);human.update(torso,head);actor.updateMatrixWorld(true);
  phone.visible=s.reach>.8;phone.position.copy(V(.25,.18,.25).lerp(V(.60,1.02,.015).lerp(V(.44,.66,.09),s.review),s.lift));
  const lens=torso.worldToLocal(sun.clone()).sub(phone.position).normalize(),right=V(0,1,0).cross(lens).normalize(),up=lens.clone().cross(right).normalize();
  const aim=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,lens));phone.quaternion.setFromEuler(new THREE.Euler(0,Math.PI/2,-.12)).slerp(aim,s.lift*(1-.5*s.review));
  const anchors=[V(-.30,-.135,.042),V(.30,-.135,.042)].map(p=>p.applyQuaternion(phone.quaternion).add(phone.position));
  const near=V(.1+gait*.12,.10,.34).lerp(anchors[0],s.reach),far=V(.1-gait*.12,.1,-.34).lerp(anchors[1],s.support);
  arm(1,near,V(.08,.2,.49));arm(-1,far,V(.08,.2,-.49));human.grip(torso,phone,[s.reach,s.support]);human.fingers(0,[s.reach,s.support]);human.fitPhone(phone,[s.reach,s.support]);actor.updateMatrixWorld(true);
 }
 return {actor,phone,update};
}
