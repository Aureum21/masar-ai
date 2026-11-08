# Phase 5A Handoff: Server-Owned Challenge Attempt Lifecycle & Photo Evidence

## Status: COMPLETE

### Overview
Delivered Increment 5A of Phase 5, introducing the server-owned challenge attempt lifecycle, real device camera/photo evidence submission, server-side MIME & size bounds, private file isolation, and interactive submission UI in both the Trip Workspace and 3D Challenge Previews.

---

### Key Implementations

1. **Server-Owned Attempt Lifecycle & Review Queues**:
   - Implemented in [`passport/router.py`](file:///c:/Users/efake/Desktop/MasarAI/passport/router.py) and [`passport/service.py`](file:///c:/Users/efake/Desktop/MasarAI/passport/service.py):
     - State machine: `available` → `accepted` → `pending` (under review) → `completed` (approved) or `rejected` (needs retry).
     - Endpoints under `/api/v1/passport`:
       - `POST /challenges/{id}/action`: accept/skip/resume.
       - `POST /challenges/{id}/submissions`: multipart evidence submission with idempotency key and request hashing.
       - `GET /submissions/{id}/image`: authenticated private image retrieval.
       - `GET /review/submissions` & `POST /review/submissions/{id}`: operator verification queue protected with `X-Passport-Operator-Key`.

2. **Photo Evidence Validation & Private File Storage**:
   - Max 5MB file size limit enforced both on client and server.
   - Decompression bomb protection, PNG/JPEG header decoding via Pillow, and EXIF/location metadata stripping before saving to disk.
   - Files stored privately under `data/passport-evidence/{userId}/{filename}` (not in a public static directory).
   - Rollback and evidence cleanup on error or withdrawal.

3. **Approved Landmark Challenge Quests (`supported-challenges.json`)**:
   - Strictly enforces quests for the 3 approved landmarks:
     - **Burj Khalifa** (Skyline Perspective & Architectural Wonder)
     - **Museum of the Future** (Calligraphy Facade & Future Architectural Clues)
     - **Sheikh Zayed Grand Mosque** (Grand Domes & Marble Florals)

4. **Frontend Evidence Submission Modal & Workflow**:
   - Implemented in [`ChallengeEvidenceModal.jsx`](file:///c:/Users/efake/Desktop/MasarAI/frontend/src/components/trips/workspace/ChallengeEvidenceModal.jsx):
     - Native camera capture & file selector with instant local preview.
     - 12–5000 character observation caption requirement.
     - Live submission status display (`pending`, `approved`, `rejected`).
     - Integrated directly into:
       - [`ChallengePreviewModal.jsx`](file:///c:/Users/efake/Desktop/MasarAI/frontend/src/components/trips/workspace/ChallengePreviewModal.jsx) ("Submit Evidence (+60 XP)" CTA buttons).
       - [`TripWorkspace.jsx`](file:///c:/Users/efake/Desktop/MasarAI/frontend/src/components/trips/workspace/TripWorkspace.jsx) (Direct 1-click button on each landmark activity stop).

---

### Verification
- **Backend Tests**: 96/96 passing (`python -m unittest discover -s tests`).
  - Added test suite: `tests/test_passport.py` (13 tests testing live review, forged image rejection, concurrent claims, reordering preservation, and user isolation).
- **Frontend Tests**: 32/32 passing (`node --test tests/*.test.mjs`).
- **ESLint**: 0 errors across all frontend files (`npm run lint`).
- **Database Migrations**: Reused existing relational passport tables (`passport_challenges`, `passport_submissions`, `passport_awards`, `passport_trips`, `passport_activities`) without needing unapproved migrations.
