/** Pure puzzle rules. No DOM, timers, assets, or host dependencies. */
export const DIFFICULTIES = Object.freeze({
  easy: Object.freeze({name:'Easy',label:'Explorer',size:3,points:150}),
  medium: Object.freeze({name:'Medium',label:'Wayfinder',size:4,points:250}),
  hard: Object.freeze({name:'Hard',label:'Pathfinder',size:5,points:400})
});

export function createPuzzleModel({landmarkId='burj-khalifa',difficulty='easy',random=Math.random}={}) {
  if(!DIFFICULTIES[difficulty]) throw new RangeError('Unknown puzzle difficulty');
  const config=DIFFICULTIES[difficulty],count=config.size**2;
  let state;
  function reset(){
    const tiles=Array.from({length:count},(_,i)=>i);
    for(let i=count-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[tiles[i],tiles[j]]=[tiles[j],tiles[i]];}
    // Every session begins with every piece misplaced, including pathological RNGs.
    for(let i=0;i<count;i++)if(tiles[i]===i){const j=(i+1)%count;[tiles[i],tiles[j]]=[tiles[j],tiles[i]];}
    state={status:'ready',tiles,moves:0,elapsed:0,hints:0,result:null};
    return snapshot();
  }
  const correct=()=>state.tiles.reduce((n,id,slot)=>n+(id===slot),0);
  function snapshot(){return {landmarkId,difficulty,size:config.size,status:state.status,tiles:[...state.tiles],moves:state.moves,elapsed:state.elapsed,hints:state.hints,correct:correct(),total:count,result:state.result?{...state.result}:null};}
  function start(){if(state.status==='ready')state.status='playing';}
  function swap(a,b){
    if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=count||b>=count||a===b||state.status!=='playing'||state.tiles[a]===a||state.tiles[b]===b)return false;
    [state.tiles[a],state.tiles[b]]=[state.tiles[b],state.tiles[a]];state.moves++;
    if(correct()===count){
      state.status='won';
      state.result={experienceId:'landmark-puzzle',landmarkId,difficulty,pieces:count,moves:state.moves,elapsed:Math.round(state.elapsed*10)/10,hints:state.hints,points:config.points,rewardKind:'demo-xp'};
    }
    return true;
  }
  reset();
  return {snapshot,start,swap,reset,
    tick(seconds){if(state.status==='playing'&&Number.isFinite(seconds)&&seconds>0)state.elapsed+=seconds;},
    pause(){if(state.status==='playing')state.status='paused';},
    resume(){if(state.status==='paused')state.status='playing';},
    hint(){if(state.status!=='playing')return null;const slot=state.tiles.findIndex((id,i)=>id!==i);if(slot<0)return null;state.hints++;return {from:state.tiles.indexOf(slot),to:slot};}
  };
}
