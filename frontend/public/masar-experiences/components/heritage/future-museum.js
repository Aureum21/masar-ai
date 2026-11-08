import {translateExperienceText} from "../../locale.js";
import * as THREE from '../../vendor/three.module.js';
/** Asymmetric oval shell, with continuous inner/outer surfaces and a real void. */
export function museumShellGeometry(segments=160,crossSegments=56){
 const positions=[],uv=[],indices=[];
 for(let i=0;i<=segments;i++){
  const a=i/segments*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
  const outer=new THREE.Vector2(3.87*c,2.20*s+.12*c);
  const inner=new THREE.Vector2(-.65+2.12*c,-.13+1.15*s+.08*c);
  const mid=outer.clone().add(inner).multiplyScalar(.5),radial=outer.clone().sub(inner).multiplyScalar(.5);
  const depth=.83+.16*(c+1)/2+.06*Math.sin(a-.4);
  for(let j=0;j<=crossSegments;j++){
   const b=j/crossSegments*Math.PI*2,x=mid.x+radial.x*Math.cos(b),y=mid.y+radial.y*Math.cos(b),z=depth*Math.sin(b);
   positions.push(x,y,z);uv.push((x+4.05)/8.1,(y+2.4)/4.8);
  }
 }
 for(let i=0;i<segments;i++)for(let j=0;j<crossSegments;j++){const a=i*(crossSegments+1)+j,b=a+crossSegments+1;indices.push(a,b,a+1,a+1,b,b+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function facadeMaps(){
 const c=document.createElement('canvas');c.width=2048;c.height=1536;const ctx=c.getContext('2d');
 ctx.fillStyle='#c4c9ce';ctx.fillRect(0,0,c.width,c.height);
 // Fine horizontal brushing, kept below the scale of the facade lettering.
 for(let y=0;y<c.height;y++){const value=155+Math.round(Math.sin(y*3.71)*5);ctx.strokeStyle=`rgba(${value},${value+2},${value+4},.12)`;ctx.beginPath();ctx.moveTo(0,y+.5);ctx.lineTo(c.width,y+.5);ctx.stroke();}
 // Meaningful Arabic words in a flowing, varied composition. This is an
 // interpretation of the facade, not a facsimile of Mattar bin Lahej's artwork.
 ctx.direction='rtl';ctx.textAlign='center';ctx.textBaseline='middle';
 const words=['المستقبل','الإبداع','المعرفة','الابتكار','الإنسان'];
 for(let row=-1;row<9;row++)for(let col=-1;col<7;col++){
  const x=col*385+(row%2)*160,y=125+row*187;
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(row*2.3+col*.9)*.14);ctx.transform(1,.08*Math.cos(col),-.14,1,0,0);
  ctx.font=`bold ${190+(row+col+20)%3*18}px "Traditional Arabic","Arabic Typesetting","Times New Roman",serif`;
  ctx.fillStyle='#0c141b';ctx.strokeStyle='#0c141b';ctx.lineWidth=3;ctx.strokeText(words[(row+col+20)%words.length],0,0);ctx.fillText(translateExperienceText(words[(row+col+20)%words.length]),0,0);
  ctx.restore();
 }
 // Slender sweeping strokes break the typeset baseline into a calligraphic rhythm.
 ctx.lineCap='round';ctx.lineWidth=7;ctx.strokeStyle='#101820';
 for(let i=0;i<15;i++){const x=70+i*143,y=230+(i%6)*202;ctx.beginPath();ctx.moveTo(x-75,y+45);ctx.bezierCurveTo(x+10,y+50,x+90,y-65,x+35,y-150);ctx.stroke();}
 ctx.strokeStyle='#79889430';ctx.lineWidth=1.2;for(let x=0;x<=2048;x+=256){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+80,1536);ctx.stroke();}for(let y=0;y<=1536;y+=192){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(2048,y+30);ctx.stroke();}
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
 // The lettering behaves as dark recessed glass, independently of the metal.
 // Uniform metalness would reflect white highlights across the lettering.
 const pixels=ctx.getImageData(0,0,c.width,c.height);
 function channel(kind){const out=document.createElement('canvas');out.width=c.width;out.height=c.height;const oc=out.getContext('2d'),data=oc.createImageData(c.width,c.height);
  for(let i=0;i<data.data.length;i+=4){const l=(pixels.data[i]+pixels.data[i+1]+pixels.data[i+2])/3,metal=THREE.MathUtils.smoothstep(l,35,140);
   const value=kind==='metal'?Math.round(metal*250):kind==='rough'?Math.round(140+metal*44):Math.round(70+metal*115);
   data.data[i]=data.data[i+1]=data.data[i+2]=value;data.data[i+3]=255;
  }oc.putImageData(data,0,0);const t=new THREE.CanvasTexture(out);t.anisotropy=4;return t;}
 return {map,metalnessMap:channel('metal'),roughnessMap:channel('rough'),bumpMap:channel('bump')};
}
function reflectionStudio(){
 // Local studio reflections keep stainless steel bright in MASAR's dark scene.
 const faces=Array.from({length:6},(_,i)=>{
  const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),g=ctx.createLinearGradient(0,0,0,256);
  if(i===2){g.addColorStop(0,'#d6e0e9');g.addColorStop(1,'#b0bdcb');}
  else if(i===3){g.addColorStop(0,'#8d908c');g.addColorStop(1,'#3c464e');}
  else{g.addColorStop(0,'#b9c9d8');g.addColorStop(.36,'#d9dfe5');g.addColorStop(.49,'#7b8793');g.addColorStop(.65,'#969b9e');g.addColorStop(1,'#46535e');}
  ctx.fillStyle=g;ctx.fillRect(0,0,256,256);
  if(i!==3){const stripe=ctx.createLinearGradient(0,0,256,0);stripe.addColorStop(0,'#ffffff00');stripe.addColorStop(.3,'#ffffff00');stripe.addColorStop(.47,'#ffffff70');stripe.addColorStop(.58,'#ffffff00');ctx.fillStyle=stripe;ctx.fillRect(0,0,256,256);}
  return c;
 });
 const texture=new THREE.CubeTexture(faces);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;return texture;
}
/** Offset a shell along its own normals so recess depth survives camera orbit. */
export function insetMuseumGeometry(source,depth){
 const geometry=source.clone(),p=geometry.attributes.position,n=geometry.attributes.normal;
 for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)-n.getX(i)*depth,p.getY(i)-n.getY(i)*depth,p.getZ(i)-n.getZ(i)*depth);
 p.needsUpdate=true;geometry.computeBoundingSphere();return geometry;
}
export function buildFutureMuseum(group){
 const maps=facadeMaps(),environment=reflectionStudio();
 // A softened cut mask allows concentric thresholds to model the chamfer.
 // These are real apertures with inset surfaces, not painted black letters.
 const alphaCanvas=document.createElement('canvas');alphaCanvas.width=2048;alphaCanvas.height=1536;
 const alphaContext=alphaCanvas.getContext('2d');alphaContext.filter='blur(2px)';alphaContext.drawImage(maps.metalnessMap.image,0,0);
 const cuts=new THREE.CanvasTexture(alphaCanvas);cuts.anisotropy=4;
 const steel=new THREE.MeshPhysicalMaterial({color:'#d0d5da',...maps,envMap:environment,envMapIntensity:.85,metalness:1,roughness:.40,bumpScale:.008,clearcoat:.04,clearcoatRoughness:.45,alphaMap:cuts,alphaTest:.72});
 const geometry=museumShellGeometry();
 const shell=new THREE.Mesh(geometry,steel);shell.name='Museum stainless-steel skin with cut calligraphy';shell.position.y=2.65;shell.castShadow=shell.receiveShadow=true;group.add(shell);
 // Stepped silver chamfers narrow the opening toward a dark glazed backing.
 // Their depth creates parallax and catches light as the user rotates the scene.
 for(const [depth,threshold,color] of [[.012,.46,'#a9b2bc'],[.030,.20,'#77838e']]){
  const edge=new THREE.Mesh(insetMuseumGeometry(geometry,depth),new THREE.MeshStandardMaterial({color,envMap:environment,envMapIntensity:.7,metalness:.85,roughness:.32,alphaMap:cuts,alphaTest:threshold}));
  edge.name='Recessed calligraphy bevel';edge.position.y=2.65;edge.receiveShadow=true;group.add(edge);
 }
 const glass=new THREE.Mesh(insetMuseumGeometry(geometry,.065),new THREE.MeshPhysicalMaterial({color:'#080f18',envMap:environment,envMapIntensity:.18,metalness:.08,roughness:.27,clearcoat:.25,clearcoatRoughness:.2}));
 glass.name='Dark glass behind the engraved Arabic openings';glass.position.y=2.65;glass.receiveShadow=true;group.add(glass);
 // Soft landscaped mound, with a shallow recess for the glazed entrance.
 const p=[],idx=[],rings=28,cols=96;
 for(let r=0;r<=rings;r++)for(let k=0;k<=cols;k++){
  const f=r/rings,a=k/cols*Math.PI*2,x=4.8*f*Math.cos(a),z=3.0*f*Math.sin(a);
  let h=.08+.98*Math.pow(Math.max(0,1-f*f),1.3);
  const corridor=Math.exp(-Math.pow(x/1.1,4))*THREE.MathUtils.smoothstep(z,1.25,2.4);h-=corridor*.65;
  p.push(x,Math.max(.07,h),z);
 }
 for(let r=0;r<rings;r++)for(let k=0;k<cols;k++){const a=r*(cols+1)+k,b=a+cols+1;idx.push(a,a+1,b,a+1,b+1,b);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();
 const turf=new THREE.MeshStandardMaterial({color:'#486438',roughness:.94,side:THREE.DoubleSide});const hill=new THREE.Mesh(g,turf);hill.receiveShadow=true;group.add(hill);
 const entrance=new THREE.Shape();entrance.moveTo(-1.08,.08);entrance.lineTo(1.08,.08);entrance.lineTo(1.38,.44);entrance.lineTo(0,1.0);entrance.lineTo(-1.38,.44);entrance.closePath();
 const glazing=new THREE.Mesh(new THREE.ShapeGeometry(entrance),new THREE.MeshPhysicalMaterial({color:'#25444a',metalness:.45,roughness:.2,side:THREE.DoubleSide}));glazing.position.set(0,.0,2.58);group.add(glazing);
 const frame=new THREE.MeshStandardMaterial({color:'#b3bcc0',metalness:.65,roughness:.35});
 for(let i=-5;i<=5;i++){const x=i*.22,height=.83*(1-Math.abs(x)/1.5);const m=new THREE.Mesh(new THREE.BoxGeometry(.018,Math.max(.13,height),.035),frame);m.position.set(x,.08+height*.5,2.61);group.add(m);}
 const paving=new THREE.MeshStandardMaterial({color:'#b0b3af',roughness:.8});
 for(let i=0;i<7;i++){const s=new THREE.Mesh(new THREE.BoxGeometry(1.85,.035,.22),paving);s.position.set(0,.075+i*.017,3.9-i*.21);s.receiveShadow=true;group.add(s);}
 return shell;
}
