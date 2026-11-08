# Sunset Seeker — MASAR AI

Preview: `http://localhost:4173/sunset/index.html`.
Run the existing local server from the workspace root: `node serve.mjs`.

A standalone, 12.8-second looping task demonstration: walk to a waterfront viewpoint, watch the light warm, lift the phone and capture the sunset, then preview the evidence checks and proof preparation.

## Mount

```js
import {mountSunsetChallenge} from './components/sunset/index.js';
const abort = new AbortController();
const demo = await mountSunsetChallenge(container, {
  signal: abort.signal,
  onUpdate(state) {},
  onCapture({image, sampleTime, locationLabel, demo}) {},
  onComplete({image, sampleTime, locationLabel, sampleChecks, demo}) {},
});
demo.pause(); demo.play(); demo.toggle(); demo.replay();
demo.seek(7.5); demo.resetView(); demo.getState();
abort.abort(); // or demo.dispose() on unmount
```

Use a container with a defined height. Copy `components/sunset`, `components/boxing` (the shared human rig and local licensed assets), and `vendor` in their existing relative layout. The example page uses `bowling/bowling.css` for the common MASAR layout, progress rings and phone frame, plus `sunset/sunset.css`. No npm or runtime internet is needed.

The avatar is loaded once; loops reset only the choreography. The local scene includes a gradient sky, low sun, a moving boat, rippling water, broken golden reflections, promenade lighting, palms, benches and an abstract city skyline. The skyline/viewpoint is an illustrative Abu Dhabi-inspired composition, not a geographically accurate Corniche replica or navigable map.

The captured 480 x 600 JPEG is rendered from the character's viewpoint. It contains the actual scene, and is shown on the character's handset and the floating phone preview. Live phone previews update at 10 Hz until the shutter; the final capture stays frozen. Orbit controls never change the proof camera. The walkthrough respects reduced motion by starting paused and offers keyboard, drag, scroll and pinch controls.

## Evidence and host responsibilities

All callback evidence includes `demo: true`. `18:24` is an illustrative sample capture time, not the current time or an astronomical sunset forecast. The location label and readiness checks are simulated; this module requests no geolocation, webcam, credentials or backend access, uploads nothing and awards no points. The 100-point reward is example UI copy.

During integration, MASAR AI must provide actual destination-specific golden-hour windows, real capture timestamp/location and permission handling, upload storage, evidence verification and user rewards. Do not use this demo's completion callback as proof that a user visited a real location.

Character licenses/attribution remain with `components/boxing/assets`. Other animations and games are unchanged.
