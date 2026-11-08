/** Render real interlocking silhouettes from one local photograph. */
export function renderPieces(image,size){
  const cw=240,ch=cw*(image.naturalHeight||image.height)/(image.naturalWidth||image.width),m=Math.ceil(Math.min(cw,ch)*.25),pieces=[];
  const seam=(r,c)=>(r*7+c*11)%2?1:-1;
  for(let id=0;id<size*size;id++){
    const row=Math.floor(id/size),col=id%size,canvas=document.createElement('canvas');
    canvas.width=cw+2*m;canvas.height=Math.ceil(ch+2*m);canvas.setAttribute('aria-hidden','true');
    canvas.style.cssText=`left:${-m/cw*100}%;top:${-m/ch*100}%;width:${(cw+2*m)/cw*100}%;height:${(ch+2*m)/ch*100}%`;
    const ctx=canvas.getContext('2d'),path=new Path2D();path.moveTo(m,m);
    function edge(x,y,dx,dy,nx,ny,sign){
      const p=(t,d=0)=>[x+dx*t+nx*Math.min(cw,ch)*d*sign,y+dy*t+ny*Math.min(cw,ch)*d*sign];
      if(!sign){path.lineTo(...p(1));return;}
      path.lineTo(...p(.34));path.bezierCurveTo(...p(.44),...p(.4,.04),...p(.4,.08));
      path.bezierCurveTo(...p(.29,.25),...p(.71,.25),...p(.6,.08));
      path.bezierCurveTo(...p(.6,.04),...p(.56),...p(.66));path.lineTo(...p(1));
    }
    edge(m,m,cw,0,0,-1,row?-seam(row-1,col):0);
    edge(m+cw,m,0,ch,1,0,col<size-1?seam(row,col):0);
    edge(m+cw,m+ch,-cw,0,0,1,row<size-1?seam(row,col):0);
    edge(m,m+ch,0,-ch,-1,0,col?-seam(row,col-1):0);
    path.closePath();ctx.save();ctx.clip(path);
    ctx.drawImage(image,m-col*cw,m-row*ch,cw*size,ch*size);ctx.restore();
    ctx.strokeStyle='#fff2d65c';ctx.lineWidth=1.5;ctx.stroke(path);
    pieces.push(canvas);
  }
  return pieces;
}
