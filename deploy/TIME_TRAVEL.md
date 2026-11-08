# Time Travel photo recognition

Photo recognition now uses `passport.vision_models.analyse_scene` with the same
`google/siglip2-base-patch16-224` model as Passport scene evidence. There is no
OpenAI call, API key requirement, OCR step, stored evidence or Passport award.
The authenticated API and the JPG/PNG, size, pixel and request-rate limits remain.

Install the local scene runtime into the Python environment serving the API:

```powershell
.\.backend-env\Scripts\python.exe -m pip install torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu
.\.backend-env\Scripts\python.exe -m pip install -r requirements.time-travel.txt
```

Set `TIME_TRAVEL_VISION_ENABLED=true` in the local `.env` and restart the API.
The first use downloads model weights into `PASSPORT_VISION_CACHE` (default
`.cache/passport-vision`). Warm the cache before serving scans. The model is
loaded lazily and reused in memory, with CPU work off the async event loop.
The API environment must have enough memory for the model. The normal backend
Docker image intentionally does not contain torch/transformers; a deployment
must include these optional dependencies and a writable persistent model cache
before enabling this feature. Do not enable it on an unchanged base image.

The existing evidence worker and its award policies are unchanged. Time Travel
compares the 11 catalogue scene descriptions against unrelated-building,
render and illustration negatives. A supported landmark must win with a score
of at least 0.90 and a margin of at least 0.30 over every other label. These
conservative thresholds are not calibrated identity probabilities or a guarantee
of accuracy. Unrelated, weak or ambiguous photos return no timeline and no
selectable guesses. The photo UI clears any previous timeline before each scan.
Explicit archive browsing remains separate from photo recognition. Archive
images remain labelled illustrative reconstructions, not historical photographs.

Checks: `python -m unittest tests.test_time_travel -q` uses mocked local-model
observations, including uncertain matches, invalid images, missing OpenAI keys,
authentication, rate limits and concurrent requests.

## Heritage visits in new plans

Every newly generated itinerary includes a server-randomized, route-aware Time
Travel heritage visit. This rule is always enabled and is independent of the
Passport challenges switch. The save boundary requires the chosen site before
persisting a plan; missing visits trigger planner repairs. Existing saved trips
are unchanged. See `docs/time-travel-planning.md` for the catalogue seed command
and deployment instructions. No test-only environment flag is required.
