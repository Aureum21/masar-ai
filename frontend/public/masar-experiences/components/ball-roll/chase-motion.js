// Ground-plane math shared by the chase camera and its controls.
export function routeDirection(player,path,fallback={x:0,z:-1},lookAhead=.85){
  if(!path.length)return {...fallback};
  let best=Infinity,index=0,along=0;
  for(let i=0;i<path.length-1;i++){
    const a=path[i],b=path[i+1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),t=Math.max(0,Math.min(1,((player.x-a.x)*dx+(player.z-a.z)*dz)/(len*len||1))),distance=Math.hypot(player.x-a.x-dx*t,player.z-a.z-dz*t);
    if(distance<best){best=distance;index=i;along=t*len;}
  }
  let target=path.at(-1),remaining=lookAhead;
  for(let i=index;i<path.length-1;i++){
    const a=path[i],b=path[i+1],len=Math.hypot(b.x-a.x,b.z-a.z),start=i===index?along:0,available=len-start;
    if(remaining<=available){const t=(start+remaining)/(len||1);target={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};break;}remaining-=available;
  }
  const dx=target.x-player.x,dz=target.z-player.z,length=Math.hypot(dx,dz);
  return length>.08?{x:dx/length,z:dz/length}:{...fallback};
}
export function chaseSteering(x,z,heading){
  const fx=Math.sin(heading),fz=Math.cos(heading);
  return {x:-fz*x-fx*z,z:fx*x-fz*z};
}
