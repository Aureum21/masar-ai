# Phase 2 — Explore-first discovery and Trip Brief

Branch: `codex/masar-experiences`. Previous checkpoint: `0380062`.

## Delivered flow

**Explore UAE → add places → set priorities → Curate my trip → review Trip Brief
→ Continue in Ask MASAR → explicit Start planning**

- Explore is the default after login, onboarding and Launch App. Public marketing
  landing and direct chat/conversation links remain available. Sidebar app logo
  returns to Explore, and Ask MASAR remains a first-class navigation item.
- A shared JourneyShell provides the discovery/brief header, dark/gold theme,
  mobile navigation, responsive content and keyboard-visible controls.
- Explore retains search, emirate/category filters, filter modal, interactive map,
  quick map jumps and single-place assistant questions. Reworked cards use the
  existing curated photography, lazy loading and explicit add/remove controls.
- An always-visible shortlist dock shows count and priorities. Its drawer supports
  removal, Must visit / If time allows, Escape to close and keyboard focus return.
- Heritage Detective labels appear only on the three supported landmark entries.
  No new challenge eligibility or points are invented. Specific ticket products,
  such as At The Top SKY, retain their identity.
- `/plan` provides dates, travellers/party, origin, flight/accommodation status,
  budget, pace, interests, optional discoveries and extra wishes. Defaults come
  from the travel profile; edits are trip-specific and do not update that profile.
- Flight and accommodation start as “Decide with MASAR”; origin is required if
  flight research is requested. Dates, date range and traveller count are checked.
- The normal signed-in user can save an unfinished brief, refresh and return.
  Missing/blocked storage and unreadable drafts have explicit feedback.
- A one-use, owner-checked 30-minute session handoff carries the brief to the
  existing assistant. Personal notes/preferences are not put in URL query text.
  A Start planning action is required before sending it; mounting/reloading the
  handoff does not call the AI. Existing prompt links retain their behaviour.
- Login redirects preserve the intended app route and reject external redirects.

## Persistence boundary

This release is deliberately local-first: one current brief/shortlist per
authenticated user on this browser/device, keyed by server-provided user ID.
It survives refresh and route changes and updates across same-origin tabs.
It is NOT yet cross-device/account database sync; the UI says “Saved on this
device.” A handoff is session storage, separately owner-checked and single-use.

There are no new database migrations, provider dependencies or package installs
in Phase 2. Existing curated place/event prices and ratings are discovery content,
not live availability guarantees. The assistant is instructed to verify them.

Phase 3 will persist briefs/planning runs on the backend, replace the conversational
handoff with the common structured planner, enforce conditional worker calls and
validate dated itineraries/challenge selection. The current fallback passes the
brief to the existing agent; it is not represented as that new pipeline.

## Feature switches

`NEXT_PUBLIC_MASAR_EXPLORE_FIRST` defaults on now. Set it to `false` and rebuild
to restore chat as the default entry. This is a presentation/home-route switch,
not an authorisation boundary. Structured-planning/rewards switches remain off.

## Checks

- Installed Next production build passed, including the new `/plan` route (14
  static pages including not-found).
- Installed frontend ESLint: zero errors, 44 remaining warnings; no rules disabled.
- Ten Node regression tests cover persistence/deduplication/removal, priority,
  corrupt/versioned drafts, limits, profile isolation, validation, closed challenge
  instructions, handoff ownership/expiry/replay and safe local login redirects.
- Browser checks covered Launch App → Explore, landmark filtering, adding three
  places, shortlist priority changes, Escape/focus return, saved state in `/plan`,
  and missing-date validation. A full refresh verified profile loading.
- The user began their own planning request during verification. That tab and
  their revised draft were left intact; further checks used separate read-only
  previews. No test booking, production migration or automatic AI request was made
  by the verification workflow.
- A 390px-wide iframe preview was visually checked: heading, search/categories,
  single-column cards, persistent shortlist action and bottom navigation fit.
  Desktop map tiles/markers and controls rendered in a separate read-only tab.
- Refined Trip Brief inputs have stable accessible labels even with validation
  feedback. Comfort/dining overrides are explicit and trip-specific.
- Brief chat bubbles summarise the request rather than exposing transport
  instructions or place IDs; the model still receives the full brief. Existing
  stored conversations are not rewritten.
- Final production build passed and ESLint remained at zero errors/44 warnings.
- Browser preview console showed no errors. No user draft was reset during final
  QA; the user's active conversation was left in place.
- Local screenshots: `C:/Users/efake/Desktop/threeJs_animation/preview-phase2-explore.png`
  and `C:/Users/efake/Desktop/threeJs_animation/preview-phase2-mobile.png`.

Repeat pure tests from `frontend`:

```powershell
node --test tests/trip-draft.test.mjs
npm.cmd run lint
npm.cmd run build
```

Node may print a module-type auto-detection warning for the pure JS helpers.
The tests pass without changing package module semantics or adding dependencies.

## Review in the running app

Refresh once after this checkpoint to discard stale development hot-reload state.
Open `/explore`, add places, then select **Curate my trip**. Adjust `/plan`, save,
and continue to the assistant if desired. The **Start planning** action sends an
actual request through the existing backend; simply opening the preview does not.

Next checkpoint: Phase 3 structured AI curation and durable planning runs.
