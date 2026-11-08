import * as THREE from '../../vendor/three.module.js';

// One garment draw call, with a shared skeleton for the chest and both
// articulated sleeves. Skin weights blend the shoulder and elbow regions.
export function createAvatarBody(actor,material){
  const p=[],uv=[],indices=[],skinIndices=[],weights=[];
  const rows=64,columns=80;
  const sections=[[.25,.32,.325],[.5,.31,.335],[1.05,.285,.345],[1.5,.265,.35],[1.9,.265,.37],[2.2,.285,.415],[2.33,.26,.41],[2.40,.21,.32],[2.46,.15,.19],[2.51,.115,.115]];
  function profile(y){
    for(let i=1;i<sections.length;i++)if(y<=sections[i][0]){const a=sections[i-1],b=sections[i],t=THREE.MathUtils.smoothstep(y,a[0],b[0]);return [THREE.MathUtils.lerp(a[1],b[1],t),THREE.MathUtils.lerp(a[2],b[2],t)];}
    return [.115,.115];
  }
  for(let r=0;r<=rows;r++)for(let c=0;c<=columns;c++){
    const f=r/rows,y=.25+f*2.26,a=c/columns*Math.PI*2,[depth,width]=profile(y);
    const fold=(Math.sin(a*11+.45*f)*.011+Math.sin(a*19-.8*f)*.0035)*(1-.65*f);
    p.push(Math.cos(a)*(depth+fold),y,Math.sin(a)*(width+fold));uv.push(c/columns,f);
    const chest=THREE.MathUtils.smoothstep(y,.5,2.1);skinIndices.push(0,1,0,0);weights.push(1-chest,chest,0,0);
  }
  for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){const a=r*(columns+1)+c,b=a+columns+1;indices.push(a,b,a+1,a+1,b,b+1);}
  // A rounded neckline overlaps the tapered skin neck and the shoulder mesh.
  // It is weighted to the chest, rather than rotating with the head.
  const collarStart=p.length/3,collarRows=10,collarColumns=80;
  for(let r=0;r<=collarRows;r++)for(let c=0;c<=collarColumns;c++){
    const t=r/collarRows,a=c/collarColumns*Math.PI*2,radius=THREE.MathUtils.lerp(.15,.115,t);
    p.push(.015+Math.cos(a)*radius,2.465+t*.045,Math.sin(a)*radius);uv.push(c/collarColumns,t*.05);skinIndices.push(1,0,0,0);weights.push(1,0,0,0);
  }
  for(let r=0;r<collarRows;r++)for(let c=0;c<collarColumns;c++){const a=collarStart+r*(collarColumns+1)+c,b=a+collarColumns+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const root=new THREE.Bone(),chest=new THREE.Bone();chest.position.y=1.43;root.add(chest);
  const bones=[root,chest],arms=new Map();
  for(const side of [1,-1]){
    const upper=new THREE.Bone(),fore=new THREE.Bone();upper.position.set(.02,.9,side*.29);fore.position.y=-.55;upper.add(fore);chest.add(upper);
    const upperIndex=bones.length; bones.push(upper,fore);arms.set(side,{upper,fore});
    const start=p.length/3,sleeveRows=52,sleeveColumns=40;
    for(let r=0;r<=sleeveRows;r++)for(let c=0;c<=sleeveColumns;c++){
      const t=r/sleeveRows,a=c/sleeveColumns*Math.PI*2;
      const radius=(THREE.MathUtils.lerp(.151,.073,t)+Math.sin(a*6+t*8)*.003+Math.sin(t*43+a*2)*.004*Math.sin(Math.PI*t))*THREE.MathUtils.smoothstep(t,0,.09);
      p.push(.02+Math.cos(a)*radius,2.33-t*1.07,side*(.21+.08*THREE.MathUtils.smoothstep(t,0,.12))+Math.sin(a)*radius);uv.push(c/sleeveColumns,t);
      const shoulder=1-THREE.MathUtils.smoothstep(t,0,.15),elbow=THREE.MathUtils.smoothstep(t,.4,.64);
      skinIndices.push(1,upperIndex,upperIndex+1,0);weights.push(shoulder,(1-shoulder)*(1-elbow),(1-shoulder)*elbow,0);
    }
    for(let r=0;r<sleeveRows;r++)for(let c=0;c<sleeveColumns;c++){const a=start+r*(sleeveColumns+1)+c,b=a+sleeveColumns+1;indices.push(a,a+1,b,a+1,b+1,b);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.SkinnedMesh(geometry,material);mesh.add(root);actor.add(mesh);mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton(bones));
  const down=new THREE.Vector3(0,-1,0),direction=new THREE.Vector3(),rotation=new THREE.Quaternion();
  return {
    mesh,
    setArm(side,shoulder,joint,end){
      const {upper,fore}=arms.get(side);upper.position.copy(shoulder);
      upper.quaternion.setFromUnitVectors(down,direction.copy(joint).sub(shoulder).normalize());
      rotation.setFromUnitVectors(down,direction.copy(end).sub(joint).normalize());fore.quaternion.copy(upper.quaternion).invert().multiply(rotation);
    },
    update(torso,hem){
      chest.position.copy(torso.position);chest.quaternion.copy(torso.quaternion);
      // Keep the original foot-clearance envelope underneath the new skin.
      const position=geometry.attributes.position;
      for(let r=0;r<=7;r++)for(let c=0;c<=columns;c++){const i=r*(columns+1)+c;position.setXYZ(i,hem[i*3],hem[i*3+1],hem[i*3+2]);}
      position.needsUpdate=true;
    }
  };
}
