# Live planning UI restoration — 23 October 2026

User feedback: the durable planning screen lost the animated concierge and generative right-side UI from chat.

## Delivered

- Replaced the static orbit/milestone card composition with an active concierge feed and the original LuxuryOrchestrationLoader on the right. It retains the original compass, logo animation and flight-path motion; only eligible agent pills appear. Real statuses drive the text. Queued requests do not claim research has begun.
- Reuses ContextPanel's existing hotel, event/experience, route and flight cards as actual research arrives, including its animated concierge-active banner, card reveals and category filters. Terminal/empty states do not show its unrelated sample discovery feed. No invented results or percentage.
- Graph custom events publish each parallel worker's result immediately, before fan-in completes. Blocking specialist model/save calls run in threads so they no longer block delivery or worker heartbeat. Combined updates cannot duplicate cards already streamed to chat.
- Persisted presentation snapshots use the existing JSON workers field, preserving the existing public workers-name array and old name-only records. New research_results and enabled_workers fields support cards and eligible stages. Snapshots survive refresh and remain owner-scoped; stale/cancelled attempts cannot replace them.
- Display snapshots keep only bounded card fields (up to 12 per worker, 96KB preview), not raw tool responses, authentication metadata or credential-bearing URLs. Limited previews are labelled. Full synthesis inputs remain in the graph; this UI change does not replace the separately pending 2,000-character synthesis truncation.
- Generated hotel inquiry buttons open the existing chat flow on an explicit click. Flight previews do not offer the existing inert Book Flight button. Reservations remain separate.
- Responsive split view, scrollable research pane, visible activity, live status text and reduced-motion support. No packages or database migrations added.

## Verification

- 32 offline backend tests passed across new live-stream/snapshot tests and existing brief/run contracts. The updated progressive-stream regression was rerun and passed after adding de-duplication. It verifies a fast agent emits exactly one card batch while a slower agent is still waiting.
- Production frontend build passed. Targeted lint: 0 errors, 6 existing image warnings in the reused card/loader components.
- Isolated API/preview browser: restored loader rendered, live fixture cards appeared without a refresh, and cards remained after refresh. No app console errors. Only disposable fixtures were used; no real provider/model calls or user-account modifications.
- Experience workspace screenshots: preview-live-planning-loader.png and preview-live-planning-cards.png. These show fixture research, not certified live provider results.

## Runtime note

The frontend refreshes its code through the existing development server. Restart the separate planning worker before the next planning request to load progressive streaming and snapshot persistence:

```powershell
cd C:\Users\efake\Desktop\MasarAI
.\.myenv\Scripts\python.exe -m tools.planning_worker
```

Do not kill a user's active worker automatically. Existing name-only runs remain readable but cannot reconstruct research payloads that were previously discarded. New attempts after restart retain the cards. Recovery, cancellation and duplicate-trip protections remain in place.

Phase 3 is still in progress; full synthesis validation and editable Trip Workspace remain separate increments.
