# Golden Roll — Al Fahidi heritage trail

A ball-rolling discovery game set in Al Fahidi Historical Neighbourhood, Dubai.
Three connected chapters follow the bundled walking network: wind towers,
courtyards and the creek-side gateway. Nine site quizzes turn knowledge into
points. Uses bundled Three.js r170; no npm, paid assets or runtime external API.

## Play

Run `node serve.mjs` in the project root. Open `/ball-roll/index.html`.
A low chase camera follows behind the orb and turns with the lane.
Arrows/WASD or a drag steer relative to the camera: up moves forward, down
reverses, and left/right steer sideways. Space or the Hop button jumps;
Shift or the hold button brakes. The district overview uses map-aligned controls.
P/Escape pauses. M or the map button toggles the full district view.
Follow the gold line to the next story token. The ball and timer stop during
its quiz. Pick one answer, read the sourced explanation, then keep exploring.
Correct answers earn 100 points; incorrect answers earn 0 and reveal the fact.
There is one attempt per token per chapter run, no time penalty and no point
award just for touching the token. Finish after answering all three questions.
Maximum: 300 points per chapter. Take-it-slowly mode reduces rolling and cart speed.
Timber hurdles, clay pots and moving market carts are fictional arcade obstacles
placed clear of story stops and tight junctions. Jump or steer around them.
A collision returns to the last answered story stop (or the chapter start),
keeps all earned points and answers, and briefly protects against another hit.
Hops have gravity, landing and no double jump; pausing also freezes a mid-air hop.

## Authenticity and sources

The street network and 61 building footprints come from the existing bundled
OpenStreetMap extract (187 walking nodes). The geometry is simplified and scaled
for play; it is not a survey, photogrammetric model or navigation aid. Wind-tower
placement, heights, plaster finish, facade details, furnishings, creek accent,
boats and quiz stops are stylized. Museum questions do not mark museum entrances.
See [SOURCES.md](./SOURCES.md) for ODbL attribution and quiz references.
No real opening hours, admissions or accessibility claims are made by the game.

## Embed

Copy `components/ball-roll/` and `vendor/three.module.js` with its license,
keeping the relative directory layout. The JSON and CSS load from module URLs.

```js
import {mountBallRoll} from './components/ball-roll/index.js';
const game = await mountBallRoll(container, {
  course: 0,                // 0 wind towers, 1 courtyards, 2 creek side
  relaxed: false,
  onProgress: snapshot => {}, // at most 10 Hz plus UI actions
  onObstacleHit: ({courseId, obstacleId, hits}) => {},
  onQuiz: ({courseId, id, index}) => {}, // index is zero-based
  onAnswer: ({courseId, id, selected, correct, points, totalPoints}) => {},
  onCheckpoint: ({courseId, id, index, correct}) => {}, // index is 1–3
  onComplete: result => {},  // once per chapter attempt
  onDestinationSelect: destination => {} // host planner handoff
});
game.start();
game.pause();
game.resume();
game.restart();             // reset current chapter to its intro
game.selectCourse(2);       // reset selected chapter to its intro
game.snapshot();
game.dispose();             // unmount: events, observer and GPU cleanup
```

Also available as `mountMasarExperience('ball-roll', container, options)`.
In React, mount inside an effect; dispose its result on cleanup, including if
the async mount resolves after the effect was cancelled. The host supplies no
height requirement; the component manages its own responsive layout.

Snapshot schema v2: `{gameId, schemaVersion, courseId, course, status, elapsed,
points, hits, airborne, answered, totalQuestions, correct, relaxed, result}`. Quiz status is
`quiz`; calling resume does not bypass an unanswered question. Public quiz
answering stays inside the accessible modal UI. One attempt is enforced in the
model, with a focus trap, keyboard options 1/2/3 and feedback before continuing.

Completion schema v2: `{schemaVersion, gameId, courseId, points, elapsed,
correct, totalQuestions, hits, answers:[{id,selected,correct,points}], mode,
destination:{id,name,emirate,url}}`. Personal bests are saved per chapter/mode
under `masar-ball-roll:v2:*` when local storage is available. Older maze records
are kept separate. Selecting or restarting a chapter starts a new attempt.

These results are client-side demo XP. For redeemable points, the host must
issue an authenticated attempt, validate answers server-side, prevent replay
credits and award through its own ledger. No wallet or coupons are supplied.

Run `node verify-ball-roll.mjs` to check all routes, quiz freezing, single-answer
scoring, wrong answers, duplicate rejection, collision and chapter completion.
The prior maze source is retained at `versions/before-authentic-ball-roll/` as a
source snapshot; its copied relative paths need restoring for standalone use.

The preceding high camera version is saved as source in
`versions/before-chase-camera-obstacles/`. The renderer includes a close-up
procedural hex texture, ground shadow and foreground occlusion fading.
