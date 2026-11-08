import {CHAPTERS,DESTINATION} from './content.js';
export const COURSES=CHAPTERS;
export const BALL_RADIUS=.18;
export function segmentDistance(p,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a[0]-dx*t,p.z-a[1]-dz*t);}
function inside(p,v){let c=false;for(let i=0,j=v.length-1;i<v.length;j=i++){const a=v[i],b=v[j];if((a[1]>p.z)!==(b[1]>p.z)&&p.x<(b[0]-a[0])*(p.z-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
const point=n=>({x:n[0],z:n[1]});
export function createBallRollModel({map,course=0,relaxed=false,obstaclesEnabled=true}={}){
  if(!map?.nodes?.length||!map.edges?.length)throw new TypeError('Al Fahidi map is required');
  if(!Number.isInteger(course)||!COURSES[course])throw new RangeError('Unknown chapter');
  const graph=map.nodes.map(()=>[]);map.edges.forEach(([a,b])=>{const cost=Math.hypot(map.nodes[a][0]-map.nodes[b][0],map.nodes[a][1]-map.nodes[b][1]);graph[a].push({node:b,cost});graph[b].push({node:a,cost});});
  const nearest=p=>map.nodes.reduce((best,v,i)=>Math.hypot(p.x-v[0],p.z-v[1])<Math.hypot(p.x-map.nodes[best][0],p.z-map.nodes[best][1])?i:best,0);
  function findPath(a,b){const distances=map.nodes.map(()=>Infinity),previous=[],open=new Set([a]);distances[a]=0;while(open.size){const current=[...open].reduce((a,b)=>distances[a]<distances[b]?a:b);open.delete(current);if(current===b)break;for(const e of graph[current]){const d=distances[current]+e.cost;if(d<distances[e.node]){distances[e.node]=d;previous[e.node]=current;open.add(e.node);}}}if(!Number.isFinite(distances[b]))return [];const path=[b];while(path[0]!==a)path.unshift(previous[path[0]]);return path;}
  const startNode=course?map.checkpoints[course-1].node:map.spawn,endNode=map.checkpoints[course].node,path=findPath(startNode,endNode),lengths=[0];
  path.slice(1).forEach((n,i)=>lengths.push(lengths[i]+Math.hypot(map.nodes[n][0]-map.nodes[path[i]][0],map.nodes[n][1]-map.nodes[path[i]][1])));
  const rewards=[.18,.48,.78].map((ratio,i)=>{const k=lengths.findIndex(d=>d>=lengths.at(-1)*ratio),node=path[Math.max(1,k)];return {id:`${COURSES[course].id}-${i}`,node,...point(map.nodes[node]),quiz:COURSES[course].quizzes[i]};});
  const candidates=path.slice(1).map((node,i)=>{const a=map.nodes[path[i]],b=map.nodes[node],len=lengths[i+1]-lengths[i];return {x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,nx:-(b[1]-a[1])/(len||1),nz:(b[0]-a[0])/(len||1),distance:lengths[i]+len/2,len};}).filter(o=>o.len>1.5&&rewards.every(r=>Math.hypot(r.x-o.x,r.z-o.z)>1)&&path.every(n=>Math.hypot(o.x-map.nodes[n][0],o.z-map.nodes[n][1])>.7));
  const obstacles=[];
  for(const [i,ratio] of [.09,.34,.64,.9].entries()){
    const candidate=candidates.filter(o=>obstacles.every(a=>Math.hypot(a.x-o.x,a.z-o.z)>1.3)).sort((a,b)=>Math.abs(a.distance-lengths.at(-1)*ratio)-Math.abs(b.distance-lengths.at(-1)*ratio))[0];
    if(candidate)obstacles.push({...candidate,id:`cargo-${course}-${i}`,kind:['hurdle','pot','cart','hurdle'][i],r:i===2?.24:.19,h:i===1?.28:i===2?.34:.18,phase:i*.8});
  }
  const level={...COURSES[course],index:course,map,startNode,endNode,path,rewards,obstacles:obstaclesEnabled?obstacles:[],start:point(map.nodes[startNode]),finish:point(map.nodes[endNode]),destination:DESTINATION};
  const state={status:'ready',...level.start,y:0,vy:0,vx:0,vz:0,hits:0,invulnerable:0,elapsed:0,points:0,answered:new Map(),activeQuiz:null,feedback:null,relaxed:!!relaxed,result:null};
  let accumulator=0,events=[];
  const boxes=map.buildings.map(b=>({...b,minX:Math.min(...b.outline.map(v=>v[0]))-BALL_RADIUS,maxX:Math.max(...b.outline.map(v=>v[0]))+BALL_RADIUS,minZ:Math.min(...b.outline.map(v=>v[1]))-BALL_RADIUS,maxZ:Math.max(...b.outline.map(v=>v[1]))+BALL_RADIUS}));
  const laneDistance=p=>map.edges.reduce((best,[a,b])=>Math.min(best,segmentDistance(p,map.nodes[a],map.nodes[b])),Infinity);
  function walkable(p){const [x0,z0,x1,z1]=map.bounds;if(p.x<x0||p.x>x1||p.z<z0||p.z>z1)return false;const lane=laneDistance(p);if(lane>.72)return false;if(lane<=.185)return true;for(const b of boxes){if(p.x<b.minX||p.x>b.maxX||p.z<b.minZ||p.z>b.maxZ)continue;if(inside(p,b.outline)||b.outline.some((v,i)=>segmentDistance(p,v,b.outline[(i+1)%b.outline.length])<BALL_RADIUS))return false;}return true;}
  function snapshot(){return {gameId:'ball-roll',schemaVersion:2,courseId:level.id,course,status:state.status,elapsed:state.elapsed,points:state.points,hits:state.hits,airborne:state.y>0,answered:state.answered.size,totalQuestions:3,correct:[...state.answered.values()].filter(a=>a.correct).length,relaxed:state.relaxed,result:state.result};}
  function emit(type,detail={}){events.push({type,...detail});}
  function nextReward(){return rewards[state.answered.size]??null;}
  function targetPath(){const target=nextReward(),nodes=findPath(nearest(state),target?.node??endNode);return nodes.map(i=>point(map.nodes[i]));}
  function obstaclePosition(o){const sway=o.kind==='cart'?Math.sin(state.elapsed*(state.relaxed?1.1:1.7)+o.phase)*.32:0;return {x:o.x+o.nx*sway,z:o.z+o.nz*sway};}
  function obstacleDistance(p,o){const center=obstaclePosition(o),dx=p.x-center.x,dz=p.z-center.z;if(o.kind==='pot')return Math.hypot(dx,dz)-o.r;const across=dx*o.nx+dz*o.nz,along=-dx*o.nz+dz*o.nx;return Math.hypot(Math.max(0,Math.abs(across)-(o.kind==='hurdle'?.285:.235)),Math.max(0,Math.abs(along)-(o.kind==='hurdle'?.1:.175)));}
  function win(){state.status='won';state.vx=state.vz=0;state.result={schemaVersion:2,gameId:'ball-roll',courseId:level.id,points:state.points,elapsed:Math.round(state.elapsed*10)/10,correct:[...state.answered.values()].filter(a=>a.correct).length,totalQuestions:3,hits:state.hits,answers:[...state.answered.values()].map(a=>({...a})),mode:state.relaxed?'relaxed':'classic',destination:{...DESTINATION}};emit('complete',{result:state.result});}
  function tick(input,dt){
    if(state.status!=='running')return;state.elapsed+=dt;state.invulnerable=Math.max(0,state.invulnerable-dt);
    if(state.y>0||state.vy>0){state.vy-=12*dt;state.y=Math.max(0,state.y+state.vy*dt);if(state.y===0)state.vy=0;}
    let ix=Number.isFinite(input.x)?input.x:0,iz=Number.isFinite(input.z)?input.z:0,n=Math.max(1,Math.hypot(ix,iz));ix/=n;iz/=n;
    const damp=Math.exp(-(input.brake?15:3)*dt),max=state.relaxed?1.7:2.5,accel=state.relaxed?6:8.5;
    state.vx=(state.vx+ix*accel*dt)*damp;state.vz=(state.vz+iz*accel*dt)*damp;const speed=Math.hypot(state.vx,state.vz);if(speed>max){state.vx*=max/speed;state.vz*=max/speed;}
    if(walkable({x:state.x+state.vx*dt,z:state.z}))state.x+=state.vx*dt;else state.vx*=-.12;
    if(walkable({x:state.x,z:state.z+state.vz*dt}))state.z+=state.vz*dt;else state.vz*=-.12;
    if(state.invulnerable===0)for(const o of level.obstacles){if(state.y<o.h-.015&&obstacleDistance(state,o)<BALL_RADIUS){const checkpoint=state.answered.size?rewards[state.answered.size-1]:level.start;Object.assign(state,{x:checkpoint.x,z:checkpoint.z,y:0,vy:0,vx:0,vz:0,invulnerable:1.25});state.hits++;emit('hit',{obstacleId:o.id,hits:state.hits});return;}}
    const reward=nextReward();
    if(reward&&state.y<.04&&Math.hypot(state.x-reward.x,state.z-reward.z)<.46){state.status='quiz';state.vx=state.vz=state.vy=state.y=0;state.activeQuiz=reward;state.feedback=null;accumulator=0;emit('quiz',{id:reward.quiz.id,index:state.answered.size});return;}
    if(!reward&&Math.hypot(state.x-level.finish.x,state.z-level.finish.z)<.48)win();
  }
  return {state,level,nearest,findPath,walkable,laneDistance,targetPath,nextReward,obstaclePosition,obstacleDistance,snapshot,
    jump(){if(state.status!=='running'||state.y>.001||state.vy>0)return false;state.vy=4.2;emit('jump');return true;},
    start(){if(state.status==='ready'){state.status='running';emit('start');}},
    pause(){if(state.status==='running'){state.status='paused';state.vx=state.vz=0;accumulator=0;}},
    resume(){if(state.status==='paused')state.status='running';},
    answer(index){if(state.status!=='quiz'||state.feedback||!Number.isInteger(index)||index<0||index>2)return null;const q=state.activeQuiz.quiz,correct=index===q.answer;state.feedback={id:q.id,selected:index,correct,points:correct?100:0};state.answered.set(q.id,{...state.feedback});state.points+=state.feedback.points;emit('answer',{...state.feedback,courseId:level.id,totalPoints:state.points});return {...state.feedback};},
    continueQuiz(){if(state.status!=='quiz'||!state.feedback)return false;state.activeQuiz=null;state.feedback=null;state.status='running';accumulator=0;return true;},
    step(input={},dt=0){if(state.status!=='running')return;accumulator+=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.1));while(accumulator>=1/120){accumulator-=1/120;tick(input,1/120);if(state.status!=='running')break;}},
    drainEvents(){const out=events;events=[];return out;}
  };
}
