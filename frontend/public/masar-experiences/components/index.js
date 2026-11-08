import {attachExperienceLocale} from '../locale.js';
/** Lazy entry points: only the selected experience and its assets are loaded. */
export const MASAR_EXPERIENCES=Object.freeze([
  {id:'ball-roll',title:'Golden Roll',kind:'game',demo:'ball-roll/index.html'},
  {id:'landmark-puzzle',title:'Piece by place',kind:'game',demo:'puzzle/index.html'},
  {id:'tourist-arcade',title:'The Lost Compass',kind:'game',demo:'arcade/index.html'},
  {id:'boxing',title:'Make your hit count',kind:'walkthrough',demo:'boxing.html'}
]);

async function mountExperience(id,container,options={}){
  if(id==='ball-roll'){
    const {mountBallRoll}=await import('./ball-roll/index.js');
    return mountBallRoll(container,options);
  }
  if(id==='landmark-puzzle'){
    const {mountLandmarkPuzzle}=await import('./landmark-puzzle/index.js');
    return mountLandmarkPuzzle(container,options);
  }
  if(id==='tourist-arcade'){
    const {mountTouristArcade}=await import('./tourist-arcade/index.js');
    return mountTouristArcade(container,options);
  }
  if(id==='boxing'){
    const {mountBoxingChallenge}=await import('./boxing/index.js');
    return mountBoxingChallenge(container,options);
  }
  throw new RangeError(`Unknown Masar experience: ${id}`);
}

export async function mountMasarExperience(id,container,options={}){
  const controller=await mountExperience(id,container,options);
  const detachLocale=attachExperienceLocale(container);
  const dispose=controller.dispose.bind(controller);
  controller.dispose=()=>{detachLocale();dispose();};
  return controller;
}
