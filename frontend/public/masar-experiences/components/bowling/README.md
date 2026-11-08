# MASAR AI Bowling Challenge

Standalone preview: http://localhost:4173/bowling/index.html
Run the existing project server with `node serve.mjs` from the workspace root.

This is an animated real-world task demonstration, not a bowling game or reward-verification service. The sample task is one strike, with a configurable host-side reward. No points are persisted and no proof is uploaded by this module.

## Embed

Copy `components/bowling`, `components/boxing` (shared character, rig and licensed local assets), and `vendor` with their existing relative layout. This implementation uses the same local Three.js build as boxing; no npm or remote asset requests are needed.

```js
import {mountBowlingChallenge} from './components/bowling/index.js';
const abort = new AbortController();
const demo = await mountBowlingChallenge(container, {
  signal: abort.signal,
  onUpdate: ({stage, stageProgress, pins, playing}) => {},
  onCapture: ({image, pins, demo}) => {}, // JPEG data URL of the actual rendered scoreboard
  onComplete: ({image, pins, demo}) => {},
});
// container must have a defined width and height.
demo.pause();
demo.play();
demo.replay();
demo.resetView();
// On unmount:
abort.abort(); // or demo.dispose()
```

Additional API: `getState()` and `seek(seconds)` for inspection. Duration: 12.8 seconds. Camera gestures do not change playback. Reduced-motion preference starts paused. Playback automatically loops after a brief completion hold, like the boxing walkthrough. Pause holds the current moment; stage buttons jump to that stage and resume. Camera orbit is preserved across loops.

`motion.js` runs a fixed 120 Hz simulation. The ball transfers impulses to pins; contacting pins transfer impulses to each other, tip and slide with damping. It is a tuned demonstration, not a regulation bowling simulator. A brief gravity-driven ball drop precedes lane contact. Approach, pendulum swing, release, follow-through, celebration and two-handed phone capture use the shared human rig and garment. The photo uses a separate camera aimed at the real 3D scoreboard, independent of user orbit.

For production, let MASAR AI handle venue selection, actual camera/photo submission, verification, account points and reward policy. `demo: true` on callbacks prevents preview data from being mistaken for user evidence. The UI's 100-point reward is an example.

Character provenance and licenses remain in `components/boxing/assets`. Existing boxing, puzzle and ball-roll components are untouched.

Phone choreography: first-hand pocket reach, supported lift, a steady shutter moment, and lowering for photo review. A rounded handset has lens details, side controls, a camera UI, and a live scoreboard preview at 12 Hz until capture. The captured image keeps its aspect ratio on the handset. Finger contact uses the shared anatomical grip solver; wrist anchors sit outside the phone edges.
