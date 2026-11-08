export const PLAYER_RADIUS=.16;
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const point=a=>({x:a[0],z:a[1]});
export function segmentDistance(p,a,b){
  const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.z-a[1])*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(p.x-a[0]-dx*t,p.z-a[1]-dz*t);
}
export function inPolygon(p,vertices){
  let inside=false;
  for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){
    const a=vertices[i],b=vertices[j];
    if((a[1]>p.z)!==(b[1]>p.z)&&p.x<(b[0]-a[0])*(p.z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
export function createArcadeModel(level,{hazardsEnabled=true,relaxed=false}={}){
  const graph=level.nodes.map(()=>[]);
  level.edges.forEach(([a,b])=>{const cost=Math.hypot(level.nodes[a][0]-level.nodes[b][0],level.nodes[a][1]-level.nodes[b][1]);graph[a].push({node:b,cost});graph[b].push({node:a,cost});});
  const nearest=p=>level.nodes.reduce((best,v,i)=>Math.hypot(p.x-v[0],p.z-v[1])<Math.hypot(p.x-level.nodes[best][0],p.z-level.nodes[best][1])?i:best,0);
  function findPath(a,b){
    const distances=level.nodes.map(()=>Infinity),previous=[],open=new Set([a]);distances[a]=0;
    while(open.size){
      let current=[...open].reduce((a,b)=>distances[a]<distances[b]?a:b);open.delete(current);if(current===b)break;
      for(const edge of graph[current]){const d=distances[current]+edge.cost;if(d<distances[edge.node]){distances[edge.node]=d;previous[edge.node]=current;open.add(edge.node);}}
    }
    if(!Number.isFinite(distances[b]))return [];
    const path=[b];while(path[0]!==a)path.unshift(previous[path[0]]);return path;
  }
  const state={status:'ready',player:point(level.nodes[level.spawn]),heading:0,moving:false,elapsed:0,checkpoints:0,coins:new Set(),discovered:new Set(),lives:3,hits:0,hints:0,invulnerable:0,route:[],hintUntil:0,relaxed,points:0,runId:'',result:null};
  const events=[];
  let checkpointNode=level.spawn,routeCursor=0,wallCooldown=0;
  function emit(type,detail={}){events.push({type,...detail});}
  function discover(){level.nodes.forEach((n,i)=>{if(Math.hypot(n[0]-state.player.x,n[1]-state.player.z)<3.2)state.discovered.add(i);});}
  discover();
  function laneDistance(p){let best=Infinity;for(const [a,b] of level.edges)best=Math.min(best,segmentDistance(p,level.nodes[a],level.nodes[b]));return best;}
  function walkable(p){
    const [x0,z0,x1,z1]=level.bounds;if(p.x<x0||p.x>x1||p.z<z0||p.z>z1)return false;
    const lane=laneDistance(p);if(lane>.8)return false;
    for(const building of level.buildings){
      const outline=building.outline;
      if(inPolygon(p,outline)||outline.some((v,i)=>segmentDistance(p,v,outline[(i+1)%outline.length])<PLAYER_RADIUS)){
        // Some surveyed ways are covered passages. Keep the mapped centerline
        // passable while the rest of each building remains solid.
        if(lane>.185)return false;
      }
    }
    return true;
  }
  function start(){
    if(state.status==='won'||state.status==='lost')return;
    state.status='running';if(!state.runId)state.runId=globalThis.crypto?.randomUUID?.()??`run-${Date.now()}-${Math.random().toString(36).slice(2)}`;emit('start');
  }
  function setTarget(p){
    if(state.status!=='running')return false;
    const target=nearest(p);
    if(Math.hypot(p.x-level.nodes[target][0],p.z-level.nodes[target][1])>2.4){emit('notice',{message:'Choose a spot on one of the lanes.'});return false;}
    state.route=findPath(nearest(state.player),target).map(i=>point(level.nodes[i]));routeCursor=0;emit('target');return true;
  }
  function hint(){
    if(state.status!=='running')return [];
    state.hints++;state.hintUntil=state.elapsed+4;
    const path=findPath(nearest(state.player),level.checkpoints[state.checkpoints].node).map(i=>point(level.nodes[i]));emit('hint',{path});return path;
  }
  function hazardPosition(index){const h=level.hazards[index],offset=Math.sin(state.elapsed*Math.PI*2/h.period+index*2.3)*h.amplitude;return {x:h.center[0]+h.axis[0]*offset,z:h.center[1]+h.axis[1]*offset};}
  function win(){
    state.status='won';state.moving=false;state.route=[];
    level.nodes.forEach((_,i)=>state.discovered.add(i));
    const timeBonus=Math.max(0,120-Math.floor(state.elapsed)),points=300+state.coins.size*15+timeBonus;
    state.points=points;
    state.result={schemaVersion:1,gameId:'tourist-destination-arcade',levelId:level.id,runId:state.runId,completedAt:new Date().toISOString(),points,elapsedSeconds:Math.round(state.elapsed*10)/10,checkpoints:level.checkpoints.map(c=>c.id),fragments:state.coins.size,hits:state.hits,hints:state.hints,mode:state.relaxed?'relaxed':'explorer',nextDestination:{...level.destination}};
    emit('complete',{result:state.result});
  }
  function step(input={},delta=0){
    if(state.status!=='running'){state.moving=false;return;}
    const dt=Math.max(0,Math.min(.05,delta));state.elapsed+=dt;state.invulnerable=Math.max(0,state.invulnerable-dt);wallCooldown=Math.max(0,wallCooldown-dt);
    let dx=input.x||0,dz=input.z||0,goal=null;
    if(dx||dz)state.route=[];
    else if(state.route.length){
      goal=state.route[routeCursor];
      if(distance(state.player,goal)<.06){routeCursor++;goal=state.route[routeCursor];if(!goal){state.route=[];goal=null;}}
      if(goal){dx=goal.x-state.player.x;dz=goal.z-state.player.z;}
    }
    const length=Math.hypot(dx,dz),speed=2.35*(input.slow?.62:1),travel=Math.min(speed*dt,goal?distance(state.player,goal):Infinity);
    state.moving=false;
    if(length>.001){
      dx=dx/length*travel;dz=dz/length*travel;
      // Substeps and axis sliding stop tunneling and preserve smooth corners.
      const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.055));
      for(let i=0;i<count;i++){
        const x={x:state.player.x+dx/count,z:state.player.z},z={x:state.player.x,z:state.player.z+dz/count};
        if(walkable(x)){state.player.x=x.x;state.moving=true;}
        z.x=state.player.x;if(walkable(z)){state.player.z=z.z;state.moving=true;}
      }
      if(state.moving)state.heading=Math.atan2(dx,dz);
      else if(wallCooldown===0){wallCooldown=1;emit('wall');}
    }
    discover();
    level.coins.forEach((coin,index)=>{if(!state.coins.has(index)&&Math.hypot(coin[0]-state.player.x,coin[1]-state.player.z)<.45){state.coins.add(index);emit('coin',{index});}});
    const active=level.checkpoints[state.checkpoints];
    if(active&&distance(state.player,point(level.nodes[active.node]))<.58){
      checkpointNode=active.node;state.checkpoints++;emit('checkpoint',{index:state.checkpoints-1,checkpoint:active});
      if(state.checkpoints===level.checkpoints.length){win();return;}
    }
    if(hazardsEnabled&&!state.relaxed&&state.invulnerable===0)for(let i=0;i<level.hazards.length;i++)if(distance(state.player,hazardPosition(i))<.45){
      state.hits++;state.lives--;state.invulnerable=2.5;state.player=point(level.nodes[checkpointNode]);state.route=[];emit('hit');
      if(state.lives===0){state.status='lost';emit('lost');}break;
    }
  }
  return {level,state,graph,nearest,findPath,walkable,laneDistance,start,setTarget,hint,hazardPosition,step,
    pause(){if(state.status==='running'){state.status='paused';emit('pause');}else if(state.status==='paused'){state.status='running';emit('resume');}},
    recover(){if(state.status==='lost'){state.lives=3;state.status='running';state.invulnerable=3;emit('resume');}},
    reset(){Object.assign(state,{status:'ready',player:point(level.nodes[level.spawn]),heading:0,moving:false,elapsed:0,checkpoints:0,coins:new Set(),discovered:new Set(),lives:3,hits:0,hints:0,invulnerable:0,route:[],hintUntil:0,points:0,runId:'',result:null});checkpointNode=level.spawn;routeCursor=0;discover();emit('reset');},
    drainEvents(){return events.splice(0);},
    snapshot(){return {status:state.status,elapsed:state.elapsed,checkpoints:state.checkpoints,totalCheckpoints:3,fragments:state.coins.size,lives:state.lives,points:state.status==='won'?state.points:state.checkpoints*100+state.coins.size*15,discovery:state.discovered.size/level.nodes.length};}
  };
}
