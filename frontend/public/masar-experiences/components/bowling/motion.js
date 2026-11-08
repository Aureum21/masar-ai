/** Small fixed-step bowling simulation. Metres, seconds; no external engine. */
export const RELEASE=3.45, IMPACT=5.42, DURATION=12.8;
export const STAGES=[
 {at:0,icon:'⌖',title:'Find your lane',copy:'Head to a bowling venue and get ready.',caption:'Your evening starts here.'},
 {at:1.8,icon:'◉',title:'Take your shot',copy:'A smooth approach. Let the ball roll.',caption:'Find your rhythm. Follow through.'},
 {at:5.35,icon:'✦',title:'Make it a strike',copy:'Knock down all ten pins in one roll.',caption:'One roll. All ten.'},
 {at:8.0,icon:'▣',title:'Capture your score',copy:'Photograph the scoreboard as your proof.',caption:'Keep the proof. Keep the memory.'},
 {at:10.5,icon:'↑',title:'Submit your moment',copy:'Submit in MASAR AI for verification.',caption:'Your next real-world challenge awaits.'}
];
export function createPinSimulation(){
 const dt=1/120, seeds=[];
 for(let row=0;row<4;row++)for(let col=0;col<=row;col++)seeds.push({x:10.5+row*.58,z:(col-row/2)*.65});
 let time=RELEASE;
 const pins=seeds.map((s,i)=>({...s,vx:0,vz:0,tilt:0,omega:0,axisX:0,axisZ:-1,down:false,index:i}));
 const ball={x:-3.6,z:.34,vx:7,vz:-.1};
 function reset(){time=RELEASE;Object.assign(ball,{x:-3.6,z:.34,vx:7,vz:-.1});pins.forEach((p,i)=>Object.assign(p,seeds[i],{vx:0,vz:0,tilt:0,omega:0,axisX:0,axisZ:-1,down:false}));}
 function knock(p,dx,dz,impulse){const length=Math.hypot(dx,dz)||1;p.vx+=dx/length*impulse;p.vz+=dz/length*impulse;p.axisX=dz/length;p.axisZ=-dx/length;p.omega=Math.max(p.omega,impulse*1.7);}
 function tick(){
  ball.x+=ball.vx*dt;ball.z+=ball.vz*dt;
  for(const p of pins){
   const dx=p.x-ball.x,dz=p.z-ball.z,d=Math.hypot(dx,dz);
   if(d<.54&&ball.x<13.6&&p.tilt<1.4){const rel=(ball.vx-p.vx)*(dx/(d||1))+(ball.vz-p.vz)*(dz/(d||1));if(rel>0){knock(p,dx,dz,rel*.72);ball.vx*=.94;ball.vz-=dz*.13;p.x+=dx/(d||1)*(.54-d)*.5;}}
  }
  for(let i=0;i<pins.length;i++)for(let j=i+1;j<pins.length;j++){
   const a=pins[i],b=pins[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),reach=.4+Math.sin(a.tilt)*.24+Math.sin(b.tilt)*.24;
   if(d<reach&&d>.001){const nx=dx/d,nz=dz/d,relative=(a.vx-b.vx)*nx+(a.vz-b.vz)*nz;
    if(relative>.03){const impulse=relative*.68;knock(b,nx,nz,impulse);knock(a,-nx,-nz,impulse*.24);}
    const gap=(reach-d)*.5;a.x-=nx*gap;a.z-=nz*gap;b.x+=nx*gap;b.z+=nz*gap;
   }
  }
  for(const p of pins){p.x+=p.vx*dt;p.z+=p.vz*dt;p.vx*=.986;p.vz*=.986;if(p.omega>.01||p.tilt>.03){p.omega+=Math.sin(p.tilt)*9*dt;p.tilt+=p.omega*dt;if(p.tilt>=1.55){p.tilt=1.55;p.omega=0;p.down=true;}}if(Math.abs(p.z)>1.8){p.z=Math.sign(p.z)*1.8;p.vz*=-.2;}p.x=Math.min(14,p.x);}
  time+=dt;
 }
 return {pins,ball,reset,advance(t){if(t<time-dt)reset();while(time+dt<=t&&time<8)tick();return pins.filter(p=>p.down).length;}};
}
