import * as THREE from '../../vendor/three.module.js';
import {GLTFLoader} from '../../vendor/GLTFLoader.js';

export async function loadAvatarAssets(){
  const [gltf,rig]=await Promise.all([new GLTFLoader().loadAsync(new URL('./assets/makehuman/human.glb',import.meta.url).href),fetch(new URL('./assets/makehuman/rig.json',import.meta.url)).then(r=>r.json())]);
  return {gltf,rig};
}

// The face, neck and hands are regions of the same weighted MakeHuman mesh.
// No scan grafts, pupil decals, neck caps or independently attached palms.
export function createHumanAvatar(assets,actor,cloth){
  const model=assets.gltf.scene;actor.add(model);
  const bones={};model.traverse(o=>{if(o.isBone)bones[o.name]=o;if(o.isMesh){if(!o.geometry.attributes.normal)o.geometry.computeVertexNormals();o.material.flatShading=false;o.material.needsUpdate=true;o.castShadow=o.receiveShadow=true;o.frustumCulled=false;if(o.material.name==='Human skin'){
    o.material.color.set('#e6c7a9');o.material.roughness=.76;
    o.material.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 humanRest;').replace('#include <begin_vertex>','#include <begin_vertex>\nhumanRest=position;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 humanRest;').replace('#include <color_fragment>',`#include <color_fragment>
        float side=abs(humanRest.z);
        float grain=fract(sin(dot(humanRest.yz,vec2(12389.7,78233.1)))*43758.5453);
        float cheekLine=2.617+0.48*side+sin(side*31.)*.007;
        float beard=smoothstep(2.475,2.52,humanRest.y)*(1.-smoothstep(cheekLine-.012,cheekLine+.025,humanRest.y+(grain-.5)*.012));
        beard*=smoothstep(.065,.13,humanRest.x)*(1.-smoothstep(.15,.179,side));
        float lipDistance=length(vec2(humanRest.z/.066,(humanRest.y-2.607)/.024));
        beard*=smoothstep(.85,1.2,lipDistance);
        float moustache=(1.-smoothstep(.063,.077,side))*(1.-smoothstep(.008,.018,abs(humanRest.y-(2.633-.12*side))))*smoothstep(.20,.24,humanRest.x);
        float browHeight=2.743+sin((side-.025)*31.)*.010;
        float brow=smoothstep(.022,.04,side)*(1.-smoothstep(.105,.124,side))*(1.-smoothstep(.003,.008,abs(humanRest.y-browHeight)+(grain-.5)*.003))*smoothstep(.14,.19,humanRest.x);
        float hair=max(max(beard,moustache),brow);
        float strand=.65+.35*sin(humanRest.z*4700.+sin(humanRest.y*300.)*2.);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.035,.027,.021)*(0.7+grain*.6+strand*.25),hair*.94);
      `);
    };
  }}});
  const rest=assets.rig,V=a=>new THREE.Vector3(...a);
  const headwear=new THREE.Group();bones.head.add(headwear);
  addHeadwear(headwear,cloth);
  // Short surface-rooted strands give the beard a silhouette and catch light.
  // Every root comes from the actual skin triangles, in the head bind space.
  const hairPositions=[],hairColors=[],headOrigin=V(rest.head.head);
  let seed=1937;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  model.traverse(mesh=>{
    if(!mesh.isMesh||mesh.material.name!=='Human skin')return;
    const geometry=mesh.geometry,p=geometry.attributes.position,n=geometry.attributes.normal,index=geometry.index;
    for(let i=0;i<index.count;i+=3){
      const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)],vertices=ids.map(id=>new THREE.Vector3().fromBufferAttribute(p,id));
      if(vertices.some(v=>v.y<2.48||v.y>2.72||v.x<.07||Math.abs(v.z)>.18))continue;
      const area=vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0])).length()*.5;
      const count=Math.ceil(area*280000);
      for(let k=0;k<count;k++){
        let u=random(),v=random();if(u+v>1){u=1-u;v=1-v;}const w=1-u-v;
        const point=vertices[0].clone().multiplyScalar(w).addScaledVector(vertices[1],u).addScaledVector(vertices[2],v),side=Math.abs(point.z);
        const cheek=2.617+.48*side+Math.sin(side*31)*.007;
        const lip=Math.hypot(point.z/.066,(point.y-2.607)/.024);
        if(point.y>cheek-.006||lip<1.1||side>.164)continue;
        const normal=new THREE.Vector3();for(const [a,weight] of [[0,w],[1,u],[2,v]])normal.addScaledVector(new THREE.Vector3().fromBufferAttribute(n,ids[a]),weight);normal.normalize();
        const root=point.clone().addScaledVector(normal,.0007).sub(headOrigin),tip=root.clone().addScaledVector(normal,.002+random()*.0035);tip.y-=.0015+random()*.002;
        hairPositions.push(...root.toArray(),...tip.toArray());const tone=.022+random()*.025;hairColors.push(tone,tone*.78,tone*.61,tone*1.3,tone, tone*.8);
      }
    }
  });
  const hairGeo=new THREE.BufferGeometry();hairGeo.setAttribute('position',new THREE.Float32BufferAttribute(hairPositions,3));hairGeo.setAttribute('color',new THREE.Float32BufferAttribute(hairColors,3));
  const beard=new THREE.LineSegments(hairGeo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.8}));bones.head.add(beard);
  function pose(name,position,rotation){
    const b=bones[name];model.updateMatrixWorld(true);actor.updateWorldMatrix(true,false);
    const wp=actor.localToWorld(position.clone());b.position.copy(b.parent.worldToLocal(wp));
    const actorQ=actor.getWorldQuaternion(new THREE.Quaternion());
    b.quaternion.copy(b.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(actorQ.multiply(rotation));b.updateMatrixWorld(true);
  }
  const armRecords=new Map();
  for(const side of [1,-1]){
    const suffix=side>0?'r':'l',hand=V(rest['hand_'+suffix].head);
    const middle=V(rest['middle_01_'+suffix].head),index=V(rest['index_01_'+suffix].head),pinky=V(rest['pinky_01_'+suffix].head);
    const y=middle.clone().sub(hand).normalize(),x=index.sub(pinky).normalize(),z=x.clone().cross(y).normalize();x.crossVectors(y,z).normalize();
    const basis=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
    armRecords.set(side,{suffix,basis,normal:z,palm:z.clone().multiplyScalar(side)});
  }
  function opposeThumb(record,target,blend){
    const {suffix,palm}=record,names=[1,2,3].map(i=>'thumb_0'+i+'_'+suffix),chain=names.map(n=>bones[n]);
    const initial=chain.map(b=>b.quaternion.clone()),localTip=V(rest[names[2]].tail).sub(V(rest[names[2]].head));
    for(let iteration=0;iteration<9;iteration++)for(let i=2;i>=0;i--){
      const b=chain[i],origin=b.getWorldPosition(new THREE.Vector3()),tip=chain[2].localToWorld(localTip.clone());
      const from=tip.sub(origin).normalize(),to=target.clone().sub(origin).normalize();
      const parent=b.parent.getWorldQuaternion(new THREE.Quaternion());
      if(i===0){
        const inverse=parent.clone().invert(),delta=new THREE.Quaternion().setFromUnitVectors(from.applyQuaternion(inverse),to.applyQuaternion(inverse));
        const angle=delta.angleTo(new THREE.Quaternion());if(angle>.22)delta.slerp(new THREE.Quaternion(),1-.22/angle);
        b.quaternion.premultiply(delta);
        const total=b.quaternion.angleTo(new THREE.Quaternion());if(total>1.6)b.quaternion.slerp(new THREE.Quaternion(),1-1.6/total);
      }else{
        const axis=V(rest[names[i]].tail).sub(V(rest[names[i]].head)).normalize().cross(palm).normalize(),worldAxis=axis.clone().applyQuaternion(parent);
        from.addScaledVector(worldAxis,-from.dot(worldAxis)).normalize();to.addScaledVector(worldAxis,-to.dot(worldAxis)).normalize();
        const delta=Math.atan2(worldAxis.dot(from.clone().cross(to)),THREE.MathUtils.clamp(from.dot(to),-1,1));
        const angle=2*Math.atan2(new THREE.Vector3(b.quaternion.x,b.quaternion.y,b.quaternion.z).dot(axis),b.quaternion.w);
        b.quaternion.setFromAxisAngle(axis,THREE.MathUtils.clamp(angle+delta,0,1.2));
      }
      b.updateWorldMatrix(false,true);
    }
    chain.forEach((b,i)=>b.quaternion.copy(initial[i].clone().slerp(b.quaternion,blend)));chain[0].updateWorldMatrix(false,true);
  }
  return {model,bones,headwear,
    update(torso,headPose){
      const pivot=new THREE.Vector3(0,1.43,0);
      const pos=V(rest.spine_03.head).sub(pivot).applyQuaternion(torso.quaternion).add(torso.position);
      pose('spine_03',pos,torso.quaternion);
      bones.neck_01.quaternion.copy(headPose.quaternion).slerp(new THREE.Quaternion(),.55);
      bones.head.quaternion.copy(bones.neck_01.quaternion).invert().multiply(headPose.quaternion);
      model.updateMatrixWorld(true);
    },
    setArm(side,shoulder,joint,end,handRotation,torso){
      const {suffix,basis}=armRecords.get(side);
      const toActor=p=>p.clone().applyQuaternion(torso.quaternion).add(torso.position);
      for(const [name,a,b] of [['upperarm',shoulder,joint],['lowerarm',joint,end]]){
        const n=name+'_'+suffix,from=V(rest[n].tail).sub(V(rest[n].head)).normalize();
        const direction=b.clone().sub(a).normalize().applyQuaternion(torso.quaternion);
        pose(n,toActor(a),new THREE.Quaternion().setFromUnitVectors(from,direction));
      }
      pose('hand_'+suffix,toActor(end),torso.quaternion.clone().multiply(handRotation).multiply(basis.clone().invert()));
    },
    grip(torso,phone,amounts){
      for(const [i,side] of [1,-1].entries()){
        const {suffix,basis}=armRecords.get(side),edge=i===0?-1:1;
        const fingers=new THREE.Vector3(-edge*.97,.24,0).normalize(),normal=new THREE.Vector3(0,0,-side),across=fingers.clone().cross(normal).normalize();
        const frame=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,fingers,normal));
        const desired=torso.quaternion.clone().multiply(phone.quaternion).multiply(frame).multiply(basis.clone().invert());
        const b=bones['hand_'+suffix],parent=b.parent.getWorldQuaternion(new THREE.Quaternion());
        const world=actor.getWorldQuaternion(new THREE.Quaternion()).multiply(desired);
        const target=parent.invert().multiply(world);
        b.quaternion.slerp(target,amounts[i]);b.updateMatrixWorld(true);
      }
    },
    fingers(closure,grips=[0,0]){
      // The imported hands are mirrored. Their palmar flexion normals must
      // also be mirrored; a shared axis hyperextends one set of fingers.
      if(typeof grips==='boolean')grips=grips?[1,1]:[0,0];
      for(const [hand,{suffix,palm,normal,basis}] of [...armRecords.values()].entries()){
        const phone=grips[hand];
        for(const [digit,finger] of ['index','middle','ring','pinky','thumb'].entries())for(let i=1;i<=3;i++){
          const name=finger+'_'+String(i).padStart(2,'0')+'_'+suffix;if(!bones[name])continue;
          const direction=V(rest[name].tail).sub(V(rest[name].head)).normalize();
          const axis=direction.clone().cross(palm).normalize();
          const restCurl=[.10,.19,.13][i-1]+digit*.018;
          const fist=[1.03,1.27,.72][i-1]+digit*.025;
          const phoneCurl=[.36,.82,.55][i-1]+digit*.035;
          let amount=THREE.MathUtils.lerp(THREE.MathUtils.lerp(restCurl,fist,closure),phoneCurl,phone);
          if(finger==='thumb'){
            // Opposition brings the thumb across the outside of the curled
            // fingers, rather than folding it into the center of the fist.
            amount=THREE.MathUtils.lerp(THREE.MathUtils.lerp(.06,[.28,.46,.42][i-1],closure),[.25,.38,.28][i-1],phone);
            bones[name].quaternion.setFromAxisAngle(axis,amount);
            if(i===1){const across=new THREE.Vector3(1,0,0).applyQuaternion(basis);bones[name].quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(normal,THREE.MathUtils.lerp(.72*closure,.42,phone))).premultiply(new THREE.Quaternion().setFromAxisAngle(across,.18*closure*(hand===0?1:-1)));}
          }else bones[name].quaternion.setFromAxisAngle(axis,amount);
        }
        const hold=closure*(1-phone);
        if(hold>.001){
          const record=armRecords.get(hand===0?1:-1),names=[1,2,3].map(i=>'thumb_0'+i+'_'+suffix);
          if(hold>.9999&&record.fistThumb)names.forEach((n,i)=>bones[n].quaternion.copy(record.fistThumb[i]));
          else{
            const target=new THREE.Vector3(.015,.182,(hand===0?1:-1)*.065).applyQuaternion(basis);
            bones['hand_'+suffix].localToWorld(target);opposeThumb(record,target,hold);
            if(hold>.9999)record.fistThumb=names.map(n=>bones[n].quaternion.clone());
          }
        }
      }

    },
    fitPhone(phone,amounts){
      phone.updateWorldMatrix(true,false);
      for(const [hand,{suffix,palm}] of [...armRecords.values()].entries()){
        const blend=amounts[hand];if(blend<.001)continue;
        const record=armRecords.get(hand===0?1:-1),handBone=bones['hand_'+suffix];
        handBone.updateWorldMatrix(true,false);
        const relative=new THREE.Matrix4().copy(handBone.matrixWorld).invert().multiply(phone.matrixWorld);
        const key=relative.elements.map(v=>Math.round(v*1000)).join(',');
        // A settled grip is rigid in phone space: solve once, then reuse its
        // local joint rotations through lifting, lowering and camera orbit.
        if(blend>.9999&&record.phoneGrip?.key===key){
          for(const [name,rotation] of record.phoneGrip.rotations)bones[name].quaternion.copy(rotation);
          handBone.updateWorldMatrix(false,true);continue;
        }
        const edge=hand===0?-1:1;
        for(const finger of ['index','middle','ring','pinky','thumb']){
          const names=[1,2,3].map(i=>finger+'_'+String(i).padStart(2,'0')+'_'+suffix);
          const chain=names.map(n=>bones[n]),initial=chain.map(b=>b.quaternion.clone());
          const root=phone.worldToLocal(chain[0].getWorldPosition(new THREE.Vector3()));
          const thumb=finger==='thumb';
          const contact=new THREE.Vector3(edge*(thumb?.077:.113),THREE.MathUtils.clamp(root.y+(thumb?.04:.012),-.205,.14),thumb?.036:-.034);
          const target=phone.localToWorld(contact);
          if(thumb){opposeThumb(armRecords.get(hand===0?1:-1),target,blend);continue;}
          const localTip=V(rest[names[2]].tail).sub(V(rest[names[2]].head));
          // Constrained CCD: only anatomical flexion axes move. The palm and
          // wrist stay fixed to the prop while each fingertip finds its edge.
          for(let iteration=0;iteration<7;iteration++)for(let i=2;i>=(thumb?1:0);i--){
            const b=chain[i],direction=V(rest[names[i]].tail).sub(V(rest[names[i]].head)).normalize();
            const axis=direction.cross(palm).normalize();
            const worldAxis=axis.clone().applyQuaternion(b.parent.getWorldQuaternion(new THREE.Quaternion()));
            const origin=b.getWorldPosition(new THREE.Vector3()),tip=chain[2].localToWorld(localTip.clone());
            const from=tip.sub(origin),to=target.clone().sub(origin);
            from.addScaledVector(worldAxis,-from.dot(worldAxis));to.addScaledVector(worldAxis,-to.dot(worldAxis));
            if(from.lengthSq()<1e-10||to.lengthSq()<1e-10)continue;
            from.normalize();to.normalize();
            const delta=Math.atan2(worldAxis.dot(from.clone().cross(to)),THREE.MathUtils.clamp(from.dot(to),-1,1));
            const angle=2*Math.atan2(new THREE.Vector3(b.quaternion.x,b.quaternion.y,b.quaternion.z).dot(axis),b.quaternion.w);
            const next=THREE.MathUtils.clamp(angle+delta,0,[1.4,1.65,1.2][i]);
            b.quaternion.setFromAxisAngle(axis,next);b.updateWorldMatrix(false,true);
          }
          for(let i=0;i<3;i++)chain[i].quaternion.copy(initial[i].clone().slerp(chain[i].quaternion,blend));
          chain[0].updateWorldMatrix(false,true);
        }
        if(blend>.9999){
          const names=['index','middle','ring','pinky','thumb'].flatMap(f=>[1,2,3].map(i=>f+'_0'+i+'_'+suffix));
          record.phoneGrip={key,rotations:names.map(n=>[n,bones[n].quaternion.clone()])};
        }
      }
    }
  };
}

function addHeadwear(scarf,cloth){
  const material=cloth.clone();material.side=THREE.DoubleSide;
  const crown=new THREE.Mesh(new THREE.SphereGeometry(1,64,32,0,Math.PI*2,0,Math.PI/2),material);crown.scale.set(.185,.09,.19);crown.position.set(-.025,.21,0);scarf.add(crown);
  const foreheadFold=new THREE.Mesh(new THREE.CylinderGeometry(.188,.19,.055,80,2,true),material);foreheadFold.position.set(-.025,.195,0);foreheadFold.castShadow=true;scarf.add(foreheadFold);
  const p=[],uv=[],indices=[],rows=48,columns=96;
  for(let r=0;r<=rows;r++)for(let c=0;c<=columns;c++){
    const v=r/rows,u=c/columns,a=THREE.MathUtils.lerp(1.08,Math.PI*2-1.08,u);
    const fold=(Math.sin(a*13+v*1.4)*.008+Math.sin(a*23-v*2)*.003)*(.15+v),radius=.192+.085*Math.sin(v*Math.PI*.65)+fold;
    p.push(-.025+Math.cos(a)*radius-v*.026,.25-v*(.78+.03*Math.sin(a*3)),Math.sin(a)*radius);uv.push(u,v);
  }
  for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){const a=r*(columns+1)+c,b=a+columns+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();const drape=new THREE.Mesh(geo,material);drape.castShadow=drape.receiveShadow=true;scarf.add(drape);
  const black=new THREE.MeshStandardMaterial({color:'#141313',roughness:.86});
  for(const y of [.25,.222]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.198,.014,12,96),black);ring.rotation.x=Math.PI/2;ring.position.set(-.025,y,0);ring.castShadow=true;scarf.add(ring);}
}
