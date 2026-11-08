# Phase 3A — shared discovery checkpoint

Delivered on `codex/masar-experiences`, following Phase 2 commit `f7fc8f2`.

## What changed

Explore and the existing agent tools now call `services/discovery.py`, rather than maintaining separate provider integrations. Authenticated Explore has **MASAR picks** and **Search live sources**. Searches are explicit, not triggered on every keystroke or page load, and do not use an LLM.

| Content | Shared provider | Scope |
|---|---|---|
| Restaurants | Google Places | Directory leads, ratings when returned, source link |
| Attractions / locations | Google Places | UAE place discovery; no automatic challenge publication |
| Stays | Google Places directory, existing Nuitee rate service for the agent | Browsing finds hotel names; dated room rates still require the existing hotel flow |
| Events | Ticketmaster Discovery | UAE events, explicit dates or next 30 days, pagination |
| Guides / official research | Existing curated guides, official portal/RAG tools | These remain separate research/curation sources; this checkpoint does not turn scraped pages into structured live inventory |

New routes: authenticated `POST /api/v1/discovery/search` and `POST /api/v1/discovery/resolve`. Inputs have bounded lengths/closed categories/emirates, ordered dates, maximum 30 IDs per resolution request. A process-local 20 requests/user/minute limit protects browsing, with bounded limiter storage; this is not a distributed quota system.

Normalised results carry provider ID, source URL, observation time, nullable rating/coordinates, actual event date/status, and conservative price labels. No invented daily opening hours, ratings, coordinates, photos, room availability, or rewards. UAE country/address and coarse geographic checks reject unrelated matches. These checks do not certify precise boundaries or venue facilities.

Existing `search_restaurants`, `search_google_places`, and `search_live_events` delegate to the service. Restaurant/event tools preserve the existing `events` card envelope and add typed source metadata. Event dates now reach Ticketmaster as UTC boundaries of the requested UAE days; the previous function ignored its date parameter. Unsupported natural-language dates ask for clarification. `resolve_discovery_places` is bound to event, accommodation and orchestrator/planner tools so saved provider references can be refreshed.

The old restaurant tool emitted photo URLs containing the server Google key. Those URLs are no longer returned. Google photography is deliberately not part of this increment; live place cards use a neutral venue illustration and source link rather than unrelated stock photos.

## Shortlist and provider handling

- Existing curated selections and device-local drafts remain compatible. Live selections store **only namespaced provider IDs and user priority**, never provider photos/addresses/ratings, in local storage.
- Trip Brief and shortlist drawers resolve current details into React memory. Failed resolution preserves selections, offers retry, and blocks planning an unresolved identity rather than silently dropping it.
- A live-place handoff stores provider IDs and asks the agent to resolve them; provider titles/addresses are not copied into the saved handoff prompt. Existing chat handoff remains conversational pending the rest of Phase 3.
- No name-based merging with the challenge catalogue. Discovered venues have `challengeEligible: false`; no assumption that a mall has boxing/bowling. Existing three supported landmark badges remain curated-only.
- Google content is not cached in the service, response caches, or browser storage, and is not plotted on the existing Leaflet map. Live discovery is a separate list view. Google Maps attribution, safe third-party attribution and source links accompany displayed content. Existing curated content retains its Leaflet map.
- Ticketmaster searches use a maximum 64-entry, five-minute process-local cache, keyed by region, query, dates and page. Failures are not cached as successes. No stale-cache fallback is presented as live availability.
- Provider requests have connection/read timeouts. Raw provider exceptions/URLs are not returned, preventing credential-bearing errors. No database migration, new dependency or provider subscription was introduced.

Policy references reviewed: [Google Maps / Places attribution and caching](https://developers.google.com/maps/documentation/places/web-service/policies), [Ticketmaster Discovery parameters](https://developer.ticketmaster.com/products-and-docs/apis/discovery/v2/).

## Validation

- 12 offline Python regressions pass: normalisation, UAE checks, no credential/photo leakage, provider failure/empty states, real date filters, cursor handling, cache expiry/bounds, identity resolution, attribution safety, authenticated API validation/rate limiting, agent/service parity.
- 13 frontend Node regressions pass: existing draft/brief tests plus live IDs, provider-reference handoff, query date contract and pagination deduplication.
- Full frontend lint: **0 errors, 44 existing warnings**. Changed files also lint clean.
- Production build passes all 14 static pages.
- Running backend on port 8000 exposes both new routes; unauthenticated search returns 401. This check calls no external provider or database query.
- Browser verified source switch, compact discovery layout and event date controls. Curated pages still render. No live provider search, LLM planning request, booking, user draft mutation, or production migration was used for QA. Provider credentials/quotas and real live results remain unverified by these offline tests.

## Try it

Refresh `http://localhost:3000/explore`, choose a category/emirate and **Search live sources**, then press **Search places/events**. Existing server credentials are used. If unavailable, the UI explains this and **MASAR picks** remains accessible. Live searches and fresh selection resolution can consume normal existing provider quota.

The backend has already reloaded the routes on port 8000. Restart it only if running without reload. A production frontend needs rebuilding/restarting; the current development frontend reflects changes automatically.

## Next checkpoint

This completes the shared discovery addition, **not all of Phase 3**. Next: durable server-owned Trip Briefs and planning runs, deterministic flight/hotel/event worker selection, structured results/trip-ready references, and refresh/retry recovery. Official-portal structured feeds and provider photo presentation can be separate follow-ups. The original challenge catalogue and later reward review gates still apply.
