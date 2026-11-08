# Heritage Detective — MASAR AI

Local preview: `http://localhost:4173/heritage/index.html`.
Run the existing server from the workspace root: `node serve.mjs`.

A 14.5-second looping task demonstration with Burj Khalifa, Museum of the Future, and Sheikh Zayed Grand Mosque. The character approaches, discovers and photographs three architectural details, views a sample quiz answer, and prepares the discovery bundle. This is a preview: no actual submissions or points are issued.

## Embed

```js
import {mountHeritageChallenge} from './components/heritage/index.js';
const controller = new AbortController();
const scene = await mountHeritageChallenge(container, {
  landmark: 'burj', // 'future' or 'mosque'
  signal: controller.signal,
  onUpdate(state) {},
  onCapture({landmark, detail, image, demo}) {},
  onComplete({landmark, photos, answer, demo}) {},
});
scene.setLandmark('future');
scene.pause(); scene.play(); scene.toggle(); scene.replay();
scene.seek(9); scene.resetView(); scene.getState();
controller.abort(); // or scene.dispose() on unmount
```

The container needs an explicit height. Copy `components/heritage`, `components/boxing` (shared human, rig and local character assets), and `vendor` in the same relative layout. No npm packages or runtime internet are needed. The provided page additionally uses `bowling/bowling.css` as its common MASAR walkthrough and phone styling, plus `heritage/heritage.css`. Character attribution and licenses remain under `components/boxing/assets`.

Landmarks are stylised procedural miniatures; their scale, planting, routes and viewing positions are illustrative, not surveyed navigation or exact architectural replicas. Museum lettering is a decorative Arabic texture, not a reproduction of its facade artwork. Photographs are 480 x 640 JPEG data URLs rendered from the actual selected model with marker overlays and the actor excluded. Three captures occur at 3.5, 5.7 and 7.9 seconds. The sample quiz selects its correct answer at 10.6 seconds. Completion fires once per loop with `demo: true`.

Landmark switching reuses the loaded avatar and preserves user orbit. Reduced-motion preference starts paused. Drag, pinch/scroll and keyboard controls change the view independently of playback. Hosts must validate real-world evidence and answers, check venue access/photography requirements and implement points themselves. The 150-point reward is example UI copy. During mosque visits, follow venue conduct and photography guidance.

## Architectural references

- Burj Khalifa: Y-shaped floor plan and setbacks — https://www.burjkhalifa.ae/the-tower/architecture-design/
- Museum of the Future: calligraphy, green mound, and void symbolising the unknown future — https://museumofthefuture.ae/en/the-building
- Sheikh Zayed Grand Mosque: domes, columns and reflecting pools — https://www.szgmc.gov.ae/en/islamic-architectures?slug=the-domes
- Date-palm-inspired columns — https://www.szgmc.gov.ae/en/islamic-architecture/The%20Columns

References checked 2026-10-22. The website does not make claims about current opening hours or access.

Museum refinement: `future-museum.js` builds a custom asymmetric shell with a left-offset elliptical void, varying depth, a locally generated flowing Arabic facade texture and studio reflection cube map. The mound has an entrance recess, glazed entry and steps. Reference: official building page and exterior photographs inspected during development. Geometry remains a stylised interpretation rather than an exact scan; lettering is not a facsimile of the original artist’s work.

Facade material update: independent metalness, roughness and bump maps distinguish the brushed stainless-steel skin from the dark recessed lettering. All maps and reflections are generated locally; no extra downloads are required.

Engraving update: Arabic apertures are alpha-cut through the outer skin. Two inset metallic chamfer surfaces and a dark glass backing sit 0.012, 0.030 and 0.065 model units beneath it, producing depth and parallax during orbit. This models the recess visually using layered geometry rather than a full architectural boolean mesh.
