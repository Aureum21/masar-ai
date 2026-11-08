import {createPunchAnimation,loadAvatarAssets} from './animation.js';
export {createPunchAnimation,loadAvatarAssets};

/** Await once on mount; call dispose() when the host screen unmounts. */
export async function mountBoxingChallenge(container,options={}){
  const assets=options.avatarAssets??await loadAvatarAssets();
  if(options.signal?.aborted)throw new DOMException('Mount cancelled','AbortError');
  const animation=createPunchAnimation(container,{...options,avatarAssets:assets});
  options.signal?.addEventListener('abort',()=>animation.dispose(),{once:true});
  return animation;
}
