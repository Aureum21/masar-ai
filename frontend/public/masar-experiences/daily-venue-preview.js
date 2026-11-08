/** Scene-only adapters. Standalone experience pages retain their original UI. */
export const PREVIEW_CHAPTERS = {
  bowling: [
    {at:0,title:'Find your rhythm',copy:'Line up the approach and watch the bowler prepare.'},
    {at:3.5,title:'Follow the roll',copy:'Watch the release, the lane and the pin action.'},
    {at:8,title:'Remember the moment',copy:'At the venue, keep a photo of your lane or scorecard.'}
  ],
  boxing: [
    {at:0,title:'Step into the ring',copy:'Explore the stance and the training space.'},
    {at:3.5,title:'Watch the technique',copy:'Follow the movement, guard and controlled contact.'},
    {at:10,title:'See it in action',copy:'An illustrated introduction before your real-world challenge.'}
  ],
  sunset: [
    {at:0,title:'Meet the shoreline',copy:'An illustrated coastal scene, made for a quieter moment.'},
    {at:3,title:'Let the light change',copy:'Watch the warm light fall across the waterfront.'},
    {at:8,title:'Frame the horizon',copy:'On your visit, look for the colours and shapes of the coast.'}
  ],
  heritage: [
    {at:0,title:'Walk into old Dubai',copy:'Discover a stylised Al Fahidi courtyard and its wind towers.'},
    {at:2,title:'Look a little closer',copy:'Follow the tower openings, coral-coloured walls and shaded lanes.'},
    {at:9,title:'Take the story with you',copy:'Notice the architectural details to look for on your own visit.'}
  ]
};

async function windTowers(world) {
  const T=await import('./vendor/three.module.js');
  const group=new T.Group();world.add(group);
  const stone=new T.MeshStandardMaterial({color:'#c3ac86',roughness:.95});
  const shadow=new T.MeshStandardMaterial({color:'#514437',roughness:1});
  const wood=new T.MeshStandardMaterial({color:'#746048',roughness:.9});
  function box(w,h,d,x,y,z,material=stone){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;}
  for(const [x,z,height] of [[-1.8,-.8,3.1],[1.5,-1.1,2.7]]){
    box(2.7,1.8,2.4,x,.9,z);box(1.3,height,1.3,x,height/2+1.6,z);
    for(const side of [-1,1]){
      box(1.1,.85,.04,x,height+1.05,z+side*.665,shadow);
      box(.04,.85,1.1,x+side*.665,height+1.05,z,shadow);
      for(const offset of [-.34,0,.34]){
        box(.075,.95,.08,x+offset,height+1.05,z+side*.72);
        box(.08,.95,.075,x+side*.72,height+1.05,z+offset);
      }
    }
    box(1.55,.14,1.55,x,height+1.65,z);box(.7,1.1,.06,x,.55,z+1.23,wood);
    for(const offset of [-.9,.9])box(.4,.45,.04,x+offset,1.2,z+1.23,shadow);
    for(let i=-2;i<=2;i++)box(.06,.06,2.8,x+i*.5,1.85,z,wood);
  }
  box(6,.14,4,0,.02,0);box(1.0,1.0,.16,0,.5,-2,wood);
  return group;
}

export async function mountDailyVenuePreview(key,container,options={}) {
  if(!PREVIEW_CHAPTERS[key])throw new Error('Unknown daily preview');
  if(key==='bowling'){
    const {mountBowlingChallenge}=await import('./components/bowling/index.js');
    return mountBowlingChallenge(container,{...options,framing:'daily'});
  }
  if(key==='sunset'){
    const {mountSunsetChallenge}=await import('./components/sunset/index.js');
    return mountSunsetChallenge(container,options);
  }
  if(key==='boxing'){
    const {createPunchAnimation,loadAvatarAssets}=await import('./components/boxing/animation.js');
    const avatarAssets=await loadAvatarAssets();
    if(options.signal?.aborted)throw new DOMException('Cancelled','AbortError');
    return createPunchAnimation(container,{...options,avatarAssets});
  }
  const {mountHeritageChallenge}=await import('./components/heritage/index.js');
  // Reuse the heritage renderer/avatar with an opt-in Al Fahidi model. The
  // standalone renderer's landmark catalogue and default scenes stay intact.
  const T=await import('./vendor/three.module.js');
  // Prepare geometry first because the renderer's custom model hook is synchronous.
  const staging=new T.Group(),model=await windTowers(staging);
  if(options.signal?.aborted){model.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});throw new DOMException('Cancelled','AbortError');}
  try {
    return await mountHeritageChallenge(container,{...options,landmark:'fahidi',
      landmarkDefinition:{id:'fahidi',name:'Al Fahidi',details:[{target:[-1.8,4,0]},{target:[1.5,2.7,0]},{target:[0,.8,1]}],correct:0},
      buildCustomLandmark:world=>{world.add(model);return model;}
    });
  } catch(error) {
    model.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
    throw error;
  }
}
