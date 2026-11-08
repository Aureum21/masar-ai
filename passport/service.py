"""Passport rules, normalization, immutable awards, and private evidence."""
import asyncio
from collections import defaultdict
from contextlib import asynccontextmanager
from copy import deepcopy
from datetime import date, datetime, timedelta, timezone
import hashlib
import json
import os
from pathlib import Path
import re
from io import BytesIO
import warnings
from PIL import Image, ImageOps, UnidentifiedImageError
from weakref import WeakValueDictionary
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import HTTPException
from sqlalchemy import select, update, func, case
from sqlalchemy.ext.asyncio import AsyncSession
import models as core
from services.booking_records import BookingOperation
from .evaluators import is_automatic, mode_for
from .catalogue import BADGES, CATEGORIES, OFFERS, template_for, heritage_for, main_challenge_activity
from .models import Award, Challenge, PassportActivity, PassportBadge, PassportEvent, PassportTrip, Submission, Voucher, uid, utcnow

MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_TEXT = 5000
LEVELS = [(0, "Curious traveler"), (100, "Pathfinder"), (300, "Story collector"), (700, "Wayfinder"), (1500, "Masar explorer")]
_locks = WeakValueDictionary()


@asynccontextmanager
async def user_lock(db, user_id):
    """DB row lock handles workers; local lock also makes SQLite tests deterministic."""
    lock = _locks.setdefault(user_id, asyncio.Lock())
    async with lock:
        await db.execute(select(core.User.id).where(core.User.id == user_id).with_for_update())
        yield


def iso(value):
    if isinstance(value, datetime) and value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat() if value else None


def aware(value):
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


async def owned_trip(db, user_id, trip_id):
    trip = await db.scalar(select(core.Trip).where(core.Trip.id == trip_id, core.Trip.user_id == user_id).with_for_update())
    if not trip:
        raise HTTPException(404, "Trip not found")
    return trip


async def owned_challenge(db, user_id, challenge_id):
    challenge = await db.scalar(select(Challenge).where(Challenge.id == challenge_id, Challenge.user_id == user_id))
    if not challenge:
        raise HTTPException(404, "Challenge not found")
    trip = await owned_trip(db, user_id, challenge.trip_id)
    await normalize(db, trip)
    return challenge, trip


async def sidecar(db, trip):
    record = await db.get(PassportTrip, trip.id)
    if not record:
        record = PassportTrip(trip_id=trip.id, user_id=trip.user_id, timezone="Asia/Dubai", challenges_enabled=False, is_demo=False, interests=[], pace="balanced")
        db.add(record)
        await db.flush()
    # Itinerary JSON is authoritative; migrate legacy sidecar dates once, without guessing.
    days, data = extract_days(trip.itinerary_data)
    if isinstance(data, dict):
        if 'start_date' in data:
            record.start_date = date.fromisoformat(data['start_date']) if data.get('start_date') else None
            record.end_date = date.fromisoformat(data['end_date']) if data.get('end_date') else None
        elif record.start_date:
            from domain.trips import normalise_itinerary
            trip.itinerary_data = normalise_itinerary(data, trip_id=trip.id, start_date=record.start_date.isoformat(), end_date=record.end_date.isoformat() if record.end_date else None, revision=data.get('revision', 1)+1)
        record.timezone = 'Asia/Dubai'
    return record


def extract_days(raw):
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except (ValueError, TypeError):
            return [], {"description": raw, "days": []}
    data = deepcopy(raw)
    if isinstance(data, list):
        return data, data
    if not isinstance(data, dict):
        return [], {"days": []}
    if isinstance(data.get("days"), list):
        return data["days"], data
    # Preserve old day-keyed itinerary payloads and their metadata.
    days = []
    for key, value in data.items():
        if isinstance(value, dict) and ("activities" in value or "items" in value):
            value.setdefault("theme", value.get("title") or key)
            if "activities" not in value:
                value["activities"] = value.get("items", [])
            days.append(value)
    return days, data


def clean(value, limit=1000):
    return str(value or "").strip()[:limit]


def fingerprint(title, location):
    def canonical(value):
        return re.sub(r"\s+", " ", value.casefold()).strip()
    return hashlib.sha256(f"{canonical(title)}\n{canonical(location)}".encode()).hexdigest()


def preserve_activity_ids(new_itinerary, previous_itinerary=None):
    """Pure hook for legacy trip creation/replanning; safe to call before commit."""
    old_days, _ = extract_days(previous_itinerary)
    old_by_fingerprint, old_ids = defaultdict(list), {}
    for day in old_days:
        if not isinstance(day, dict):
            continue
        for item in day.get("activities", []):
            if not isinstance(item, dict):
                continue
            identity = fingerprint(clean(item.get("title") or item.get("name") or "Planned activity", 500), clean(item.get("location") or item.get("place"), 500))
            candidate = str(item.get("id", ""))
            if re.fullmatch(r"[a-f0-9]{32}", candidate):
                old_by_fingerprint[identity].append(candidate)
                old_ids[candidate] = identity
    days, result = extract_days(new_itinerary)
    used = set()
    for day in days:
        if not isinstance(day, dict):
            continue
        for item in day.get("activities", []) if isinstance(day.get("activities", []), list) else []:
            if not isinstance(item, dict):
                continue
            identity = fingerprint(clean(item.get("title") or item.get("name") or "Planned activity", 500), clean(item.get("location") or item.get("place"), 500))
            candidate = str(item.get("id", ""))
            valid = re.fullmatch(r"[a-f0-9]{32}", candidate) and candidate not in used
            if previous_itinerary is not None:
                valid = valid and old_ids.get(candidate) == identity
            if not valid:
                candidate = next((old_id for old_id in old_by_fingerprint[identity] if old_id not in used), uid())
            item["id"] = candidate
            used.add(candidate)
    return result


async def normalize(db, trip):
    """Persist identities once; match reordered legacy activities by semantic identity.

    A retained ID with a changed title/location is a replacement, not permission to
    reuse a challenge. Completed challenge and award snapshots remain historical.
    """
    await sidecar(db, trip)
    from domain.trips import normalise_itinerary
    from domain.mall_challenges import locked_mall_challenges
    locked = await locked_mall_challenges(db, [trip.id])
    canonical = normalise_itinerary(trip.itinerary_data, trip_id=trip.id, locked_challenges=locked.get(trip.id))
    days, data = extract_days(canonical)
    old = list((await db.scalars(select(PassportActivity).where(PassportActivity.trip_id == trip.id))).all())
    by_id = {a.id: a for a in old}
    by_fingerprint = defaultdict(list)
    for activity in old:
        if activity.active:
            by_fingerprint[activity.fingerprint].append(activity)
    used, result = set(), []
    for index, day in enumerate(days):
        if not isinstance(day, dict):
            continue
        try:
            number = int(day.get("day_number") or index + 1)
        except (TypeError, ValueError):
            number = index + 1
        if number < 1 or number > 365:
            number = index + 1
        normalized = {"day_number": number, "date": None, "theme": clean(day.get("theme") or day.get("title")), "activities": []}
        activities = day.get("activities", [])
        for item in activities if isinstance(activities, list) else []:
            if not isinstance(item, dict):
                continue
            title = clean(item.get("title") or item.get("name") or "Planned activity", 500)
            location = clean(item.get("location") or item.get("place"), 500)
            identity = fingerprint(title, location)
            candidate = by_id.get(str(item.get("id", "")))
            if not candidate or not candidate.active or candidate.fingerprint != identity or candidate.id in used:
                candidate = next((a for a in by_fingerprint[identity] if a.id not in used), None)
            if not candidate:
                incoming_id = str(item.get("id", ""))
                safe_id = incoming_id if re.fullmatch(r"[a-f0-9]{32}", incoming_id) and incoming_id not in used and not await db.get(PassportActivity, incoming_id) else uid()
                candidate = PassportActivity(id=safe_id, trip_id=trip.id, fingerprint=identity, title=title, location=location, day_number=number, active=True)
                db.add(candidate)
            candidate.active, candidate.day_number = True, number
            used.add(candidate.id)
            item.setdefault("id", candidate.id)
            category = item.get("category") if item.get("category") in CATEGORIES else "discovery"
            normalized["activities"].append({**item, "id": candidate.id, "source_activity_id": item["id"], "title": title, "time": clean(item.get("time"), 80), "location": location, "description": clean(item.get("description"), 4000), "category": category})
        result.append(normalized)
    removed = [activity.id for activity in old if activity.id not in used]
    for activity in old:
        if activity.id in removed:
            activity.active = False
    if removed:
        await db.execute(update(Challenge).where(Challenge.activity_id.in_(removed), Challenge.state != "completed").values(state="retired"))
    if data != trip.itinerary_data:
        trip.itinerary_data = data
    await db.flush()
    return result


def validate_timezone(value):
    try:
        ZoneInfo(value)
    except (ValueError, ZoneInfoNotFoundError):
        raise HTTPException(422, "Choose a valid IANA timezone, such as Asia/Dubai or UTC")
    return value


def today_for(record):
    try:
        zone = ZoneInfo(record.timezone)
    except ZoneInfoNotFoundError:
        zone = timezone(timedelta(hours=4)) if record.timezone == "Asia/Dubai" else timezone.utc
    return datetime.now(zone).date()


async def summary_trip_views(db, user_id, awards):
    """Read the dashboard in two queries, with no per-trip writes or locks."""
    from types import SimpleNamespace
    rows = (await db.execute(select(core.Trip, PassportTrip).outerjoin(
        PassportTrip, (PassportTrip.trip_id == core.Trip.id) & (PassportTrip.user_id == user_id)
    ).where(core.Trip.user_id == user_id).order_by(core.Trip.created_at.desc()))).all()
    counts = (await db.execute(select(
        Challenge.trip_id,
        func.sum(case((Challenge.state == "completed", 1), else_=0)),
        func.sum(case((Challenge.state != "retired", 1), else_=0)),
    ).where(Challenge.user_id == user_id).group_by(Challenge.trip_id))).all()
    progress = {trip_id: {"completed": int(done or 0), "total": int(total or 0)} for trip_id, done, total in counts}
    stamp_counts = defaultdict(int)
    for award in awards:
        stamp_counts[award.trip_id] += 1
    views = []
    for trip, record in rows:
        _, data = extract_days(trip.itinerary_data)
        data = data if isinstance(data, dict) else {}
        start = record.start_date if record else None
        end = record.end_date if record else None
        # Match sidecar's authoritative itinerary dates without creating/updating it.
        if 'start_date' in data:
            start = date.fromisoformat(data['start_date']) if data.get('start_date') else None
            end = date.fromisoformat(data['end_date']) if data.get('end_date') else None
        zone = 'Asia/Dubai'
        today = today_for(SimpleNamespace(timezone=zone))
        state = 'saved'
        if start and end:
            state = 'upcoming' if today < start else 'past' if today > end else 'ongoing'
        views.append({"id": trip.id, "title": trip.title, "destination": trip.destination,
            "hero_image_url": trip.hero_image_url, "duration_days": trip.duration_days,
            "revision": data.get('revision', 1), "start_date": iso(start), "end_date": iso(end),
            "timezone": zone, "status": state, "is_demo": bool(record and record.is_demo),
            "challenges_enabled": bool(record and record.challenges_enabled),
            "progress": progress.get(trip.id, {"completed": 0, "total": 0}),
            "stamp_count": stamp_counts[trip.id]})
    return views


async def trip_view(db, trip):
    record = await sidecar(db, trip)
    today = today_for(record)
    state = "saved"
    if record.start_date and record.end_date:
        state = "upcoming" if today < record.start_date else "past" if today > record.end_date else "ongoing"
    challenges = list((await db.scalars(select(Challenge).where(Challenge.trip_id == trip.id))).all())
    awards = list((await db.scalars(select(Award).where(Award.user_id == trip.user_id, Award.trip_id == trip.id))).all())
    return {"id": trip.id, "title": trip.title, "destination": trip.destination, "hero_image_url": trip.hero_image_url,
            "duration_days": trip.duration_days, "revision": extract_days(trip.itinerary_data)[1].get("revision",1), "start_date": iso(record.start_date), "end_date": iso(record.end_date),
            "timezone": record.timezone, "status": state, "is_demo": record.is_demo, "challenges_enabled": record.challenges_enabled,
            "progress": {"completed": sum(c.state == "completed" for c in challenges), "total": sum(c.state != "retired" for c in challenges)}, "stamp_count": len(awards)}


def event_view(event):
    return {key: getattr(event, key) for key in ("id", "type", "title", "description", "trip_id", "is_demo")} | {"created_at": iso(event.created_at)}


def submission_view(submission):
    return {key: getattr(submission, key) for key in ("id", "status", "feedback", "text", "evidence_type")} | {"created_at": iso(submission.created_at), "verification": deepcopy(submission.verification)}


async def live_submission_view(db, submission):
    payload = submission_view(submission)
    if submission.status == "pending" and is_automatic(submission.verification):
        from .models import EvidenceCheck
        job = await db.get(EvidenceCheck, submission.id)
        info = dict(payload["verification"] or {})
        info["state"] = "queued" if not job else "reconnecting" if job.state == "running" and (not job.lease_until or aware(job.lease_until) < utcnow()) else job.state
        info["attempts"] = job.attempts if job else 0
        info["delayed"] = (utcnow() - aware(submission.created_at)).total_seconds() > 60
        payload["verification"] = info
    return payload


async def challenge_view(db, challenge, record):
    payload = deepcopy(challenge.payload)
    from .equivalent import equivalent_task
    payload['equivalent_task']=equivalent_task(payload)
    payload.pop("concepts", None)
    payload.pop("key", None)
    if payload.get('quiz'):
        payload['quiz'].pop('correct', None)
    activity = await db.get(PassportActivity, challenge.activity_id)
    state = challenge.state
    prerequisite = await db.get(Challenge, challenge.prerequisite_id) if challenge.prerequisite_id else None
    if state not in ("retired", "completed") and prerequisite and prerequisite.state != "completed":
        state = "locked"
    first_choice = None
    if record.is_demo:
        first = await db.scalar(select(Challenge).where(Challenge.trip_id == challenge.trip_id, Challenge.template_key == "maritime-reading-v1"))
        first_choice = first.choice if first else None
    if first_choice:
        payload["instructions"] += " Carry forward your chosen " + ("curving line: notice a curve and use it in your response." if first_choice == "curves" else "repeating pattern: notice its rhythm and use it in your response.")
    latest = await db.scalar(select(Submission).where(Submission.challenge_id == challenge.id).order_by(Submission.created_at.desc(), Submission.id.desc()).limit(1))
    payload["verification_mode"] = mode_for(payload, record.is_demo)
    from .verification import demo_allowed
    payload["evaluation_profiles"] = ["strict", "demo"] if payload["verification_mode"] != "manual" and demo_allowed() else ["strict"]
    return payload | {"id": challenge.id, "activity_id": challenge.activity_id, "place": payload.get("place", activity.location if activity else ""), "day_number": activity.day_number if activity else 1,
                      "state": state, "prerequisite_id": challenge.prerequisite_id, "unlock_message": f"Complete ‘{prerequisite.payload['title']}’ first." if prerequisite else None,
                      "is_demo": record.is_demo, "latest_submission": await live_submission_view(db, latest) if latest else None}


async def detail(db, trip):
    days = await normalize(db, trip)
    record = await sidecar(db, trip)
    for day in days:
        day["date"] = iso(record.start_date + timedelta(days=day["day_number"] - 1)) if record.start_date else None
    challenges = list((await db.scalars(select(Challenge).where(Challenge.trip_id == trip.id).order_by(Challenge.created_at, Challenge.id))).all())
    views = [await challenge_view(db, c, record) for c in challenges]
    views.sort(key=lambda c: (c["day_number"], c["state"] == "retired"))
    events = list((await db.scalars(select(PassportEvent).where(PassportEvent.user_id == trip.user_id, PassportEvent.trip_id == trip.id).order_by(PassportEvent.created_at.desc()).limit(30))).all())
    # Booking status comes from stored provider outcomes, never itinerary prose.
    bookings = list((await db.scalars(select(BookingOperation).where(BookingOperation.user_id == trip.user_id, BookingOperation.trip_id == trip.id))).all())
    history = [event_view(e) for e in events]
    history.extend({"id": "booking:" + b.id, "type": "booking_" + b.status.lower(), "title": f"{b.kind.title()} reservation · {b.status.lower()}", "description": f"Provider reference: {b.provider_reference or 'Awaiting confirmation'}" + (" · Sandbox booking" if b.environment == "sandbox" else ""), "created_at": iso(b.confirmed_at or b.created_at), "trip_id": trip.id, "is_demo": b.environment != "live"} for b in bookings)
    history.sort(key=lambda item: item["created_at"], reverse=True)
    return {"trip": await trip_view(db, trip), "days": days, "challenges": views, "events": history[:30]}


async def activate(db, trip, interests, pace):
    days = await normalize(db, trip)
    record = await sidecar(db, trip)
    raw = extract_days(trip.itinerary_data)[1]
    if isinstance(raw, dict) and raw.get('status') in {'cancelled','archived','completed'}:
        raise HTTPException(409, 'This trip is inactive. Review its status before enabling challenges.')
    record.challenges_enabled, record.interests, record.pace = True, interests, pace
    existing = list((await db.scalars(select(Challenge).where(Challenge.trip_id == trip.id))).all())
    by_activity = {c.activity_id: c for c in existing if c.state != 'retired'}
    chosen, previous, demo_index = set(), None, 0
    for day in days:
        main=main_challenge_activity(day['activities']) if not record.is_demo else None
        candidates = day['activities'] if record.is_demo else [main] if main else []
        for item in candidates:
            if record.is_demo and demo_index >= 3:
                break
            template = template_for(item, record.is_demo, demo_index)
            if not template:
                continue
            template.update(place=item['location'] or trip.destination or 'Your itinerary', source_activity_id=item['source_activity_id'])
            challenge = by_activity.get(item['id'])
            if challenge and challenge.template_key != template['key']:
                if challenge.state != 'completed':
                    challenge.state = 'retired'
                challenge = None
            if not challenge:
                # Keep old snapshots for history; a new version has a distinct template key.
                challenge = await db.scalar(select(Challenge).where(Challenge.activity_id == item['id'], Challenge.template_key == template['key']))
                if not challenge:
                    challenge = Challenge(id=uid(), user_id=trip.user_id, trip_id=trip.id, activity_id=item['id'], template_key=template['key'], payload=template, prerequisite_id=previous.id if record.is_demo and previous else None, state='available')
                    db.add(challenge)
                elif challenge.state == 'retired':
                    challenge.state = 'available'
            chosen.add(challenge.id)
            previous = challenge
            demo_index += 1
    for challenge in existing:
        if challenge.id not in chosen and challenge.state not in {'completed','retired'}:
            challenge.state = 'retired'
    await db.flush()
    return await detail(db, trip)


async def ensure_available(db, challenge, record):
    trip = await db.get(core.Trip, record.trip_id)
    raw = extract_days(trip.itinerary_data)[1] if trip else {}
    if isinstance(raw, dict) and raw.get('status') in {'cancelled','archived','completed'}:
        raise HTTPException(409, 'This trip is inactive.')
    if not record.is_demo:
        days = await normalize(db, trip)
        activity = next((a for d in days for a in d['activities'] if a['id'] == challenge.activity_id), None)
        template = template_for(activity) if activity else None
        if not template or template['key'] != challenge.template_key:
            raise HTTPException(409, 'This challenge is outside the supported catalogue. Refresh your journey.')
        same_day = next((d for d in days if any(a['id'] == challenge.activity_id for a in d['activities'])), None)
        allowed = main_challenge_activity(same_day['activities']) if same_day else None
        if not allowed or allowed['id'] != challenge.activity_id:
            raise HTTPException(409, 'Only one main challenge is available per day. Refresh your journey.')
    if not record.challenges_enabled:
        raise HTTPException(409, "Challenges are paused. Enable them before continuing.")
    if challenge.state == "retired":
        raise HTTPException(409, "This activity changed or was removed; its unfinished challenge is retired.")
    if challenge.prerequisite_id:
        prerequisite = await db.get(Challenge, challenge.prerequisite_id)
        if not prerequisite or prerequisite.state != "completed":
            raise HTTPException(409, "Complete the preceding challenge first")


def assess_reflection(text, template, choice=None):
    """Transparent reading rubric, intentionally not a location/attendance check."""
    sentences = [part.strip() for part in re.split(r"[.!?。！？]+(?:\s+|$)", text) if len(re.findall(r"\w+", part)) >= 4]
    words = text.casefold()
    concepts = sum(any(re.search(r"\b" + re.escape(term) + r"\w*\b", words) for term in group) for group in template["concepts"])
    personal = bool(re.search(r"\b(i|my|me|we|our|wonder|noticed|learned|learnt|imagine)\b", words))
    missing = []
    if len(sentences) < 3:
        missing.append("write at least three sentences with four or more words each")
    if concepts < 2:
        missing.append("connect at least two key ideas from the learning card")
    if not personal:
        missing.append("include your own observation, learning, or question")
    if missing:
        return "rejected", "Please " + "; ".join(missing) + ". You can revise and submit again."
    return "accepted", "Reading rubric met: three developed sentences, two grounded ideas, and a personal response. This approves a learning reflection and does not verify attendance."


def storage_root():
    return Path(os.getenv("PASSPORT_EVIDENCE_DIR", str(Path(__file__).resolve().parent.parent / "data" / "passport-evidence"))).resolve()


def validate_image(data, declared_type):
    """Decode bounded PNG/JPEG files before storing a sanitized copy."""
    if not data or len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Choose a PNG or JPEG image of at most 5 MB")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as image:
                width, height = image.size
                kind = {"PNG": "image/png", "JPEG": "image/jpeg"}.get(image.format)
                if not kind or not (0 < width <= 8192 and 0 < height <= 8192 and width * height <= 20_000_000):
                    raise ValueError()
                if declared_type and declared_type.split(";")[0].lower() != kind:
                    raise ValueError()
                image.load()
                return kind
    except (ValueError, OSError, UnidentifiedImageError, Image.DecompressionBombWarning, Image.DecompressionBombError):
        raise HTTPException(422, "Choose a valid PNG or JPEG with matching content type and at most 20 megapixels")


def save_image(user_id, data, image_type):
    directory = storage_root() / str(user_id)
    directory.mkdir(parents=True, exist_ok=True)
    files = [path for path in directory.iterdir() if path.is_file()]
    name = uid() + (".png" if image_type == "image/png" else ".jpg")
    path = directory / name
    # Re-encode pixels only: remove EXIF/GPS, comments and other identifying metadata.
    with Image.open(BytesIO(data)) as original:
        oriented = ImageOps.exif_transpose(original).convert("RGB")
        clean_image = Image.new("RGB", oriented.size)
        clean_image.paste(oriented)
        encoded = BytesIO()
        clean_image.save(encoded, format="PNG" if image_type == "image/png" else "JPEG", optimize=True)
    if len(files) >= 100 or sum(path.stat().st_size for path in files) + encoded.tell() > 100 * 1024 * 1024:
        raise HTTPException(413, "Private evidence storage limit reached (100 images / 100 MB)")
    with path.open("xb") as output:
        output.write(encoded.getvalue())
    return name


async def store_evidence(db, user_id, data, image_type):
    from . import evidence_storage as storage
    if storage.configured_backend() == 'local':
        name = save_image(user_id, data, image_type)
        db.info.setdefault('passport_new_files', []).append(storage_root()/str(user_id)/name)
        return name, None
    name = uid()+('.png' if image_type == 'image/png' else '.jpg')
    encoded = await asyncio.to_thread(storage.sanitized, data, image_type)
    ref = storage.new_s3_ref(user_id, name)
    ref = await asyncio.to_thread(storage.put_private, ref, encoded, image_type)
    db.info.setdefault('passport_new_objects', []).append(ref)
    db.info.setdefault('passport_saved_evidence', {})[name] = encoded
    return name, ref


def evidence_snapshot(submission):
    from types import SimpleNamespace
    return SimpleNamespace(user_id=submission.user_id, image_name=submission.image_name,
                           image_storage=deepcopy(getattr(submission,'image_storage',None)))


async def rollback_new_evidence(db):
    from .evidence_storage import delete_ref
    from .models import EvidenceDeletion
    import logging
    for path in db.info.pop('passport_new_files', []):
        path.unlink(missing_ok=True)
    pending = []
    for ref in db.info.pop('passport_new_objects', []):
        try:
            await asyncio.to_thread(delete_ref, ref)
        except Exception:
            pending.append(EvidenceDeletion(id=uid(),storage=ref,attempts=0,retry_at=utcnow()))
    if pending:
        try:
            db.add_all(pending)
            await db.commit()
        except Exception:
            await db.rollback()
            logging.getLogger(__name__).error('Evidence upload compensation could not be persisted; operator reconciliation required.')


def schedule_evidence_cleanup(db, background_tasks):
    from sqlalchemy.ext.asyncio import async_sessionmaker
    from .evidence_cleanup import process_deletions
    finish_evidence_cleanup(db)
    ids = db.info.pop('passport_delete_ids', [])
    if ids:
        background_tasks.add_task(process_deletions, async_sessionmaker(db.bind,expire_on_commit=False), ids)


def image_path(submission):
    if not submission.image_name or not re.fullmatch(r"[a-f0-9]{32}\.(png|jpg)", submission.image_name):
        raise HTTPException(404, "Evidence image not found")
    path = storage_root() / str(submission.user_id) / submission.image_name
    if not path.is_file():
        raise HTTPException(404, "Evidence image not found")
    return path


async def remove_evidence(db, submission):
    """Remove a private image after commit; preserve any earned stamp."""
    if submission.image_name:
        from .evidence_storage import ref_for
        from .models import EvidenceDeletion
        ref = ref_for(submission)
        if ref['backend'] == 's3':
            deletion = EvidenceDeletion(id=uid(),storage=ref,attempts=0,retry_at=utcnow())
            db.add(deletion)
            db.info.setdefault('passport_delete_ids', []).append(deletion.id)
        else:
            try:
                path = image_path(submission)
                if not path.resolve().is_relative_to(storage_root() / str(submission.user_id)):
                    raise HTTPException(409, "Evidence storage path is invalid")
                db.info.setdefault("passport_removed_files", []).append(path)
            except HTTPException as error:
                if error.status_code != 404:
                    raise
    submission.image_name = submission.image_type = submission.image_storage = None
    if submission.status == "pending":
        submission.status = "rejected"
        submission.feedback = "You removed this photograph. Submit new evidence when you are ready."
        challenge = await db.get(Challenge, submission.challenge_id)
        if challenge and challenge.state == "pending":
            challenge.state = "accepted"
    award = await db.scalar(select(Award).where(Award.submission_id == submission.id))
    if award:
        award.stamp = dict(award.stamp, evidence_available=False)


async def prepare_evidence_cleanup(db, user_id, trip_id=None):
    query = select(Submission).where(Submission.user_id == user_id)
    if trip_id is not None:
        query = query.join(Challenge).where(Challenge.trip_id == trip_id)
    for submission in (await db.scalars(query)).all():
        await remove_evidence(db, submission)
    if trip_id is not None:
        for award in (await db.scalars(select(Award).where(Award.user_id == user_id, Award.trip_id == trip_id))).all():
            award.stamp = dict(award.stamp, trip_deleted=True, evidence_available=False)


def finish_evidence_cleanup(db):
    for path in db.info.pop("passport_removed_files", []):
        path.unlink(missing_ok=True)


def stamp_place_label(value, place_id=None):
    from domain.attractions import ATTRACTIONS, BY_ID
    if place_id in BY_ID:
        return BY_ID[place_id]['title']
    parsed = value
    if isinstance(value, str):
        value = value.strip()
        if not value.startswith('{'):
            return value or 'UAE destination'
        try:
            parsed = json.loads(value.replace("'", '"'))
        except (ValueError, TypeError):
            return 'UAE destination'
    if isinstance(parsed, dict):
        for key in ('name', 'label', 'address', 'city'):
            if isinstance(parsed.get(key), str) and parsed[key].strip():
                return parsed[key].strip()
        try:
            lat, lng = float(parsed['lat']), float(parsed['lng'])
            if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                return 'UAE destination'
        except (ValueError, TypeError, KeyError):
            return 'UAE destination'
        # Resolve only a very close known catalogue coordinate; do not invent a venue.
        closest = min(ATTRACTIONS, key=lambda item: (item['lat']-lat)**2+(item['lng']-lng)**2)
        if (closest['lat']-lat)**2+(closest['lng']-lng)**2 <= .0005**2:
            return closest['title']
        return f'{lat:.4f}°, {lng:.4f}°'
    return 'UAE destination'


def stamp_view(award):
    stamp = deepcopy(award.stamp)
    stamp['place'] = stamp_place_label(stamp.get('place'), stamp.get('place_id'))
    return stamp | {"id": award.id, "trip_id": award.trip_id, "challenge_id": award.challenge_id, "submission_id": award.submission_id, "xp": award.xp, "is_demo": award.is_demo or award.challenge_id.startswith("game:"), "earned_at": iso(award.earned_at)}


async def complete(db, challenge, submission, record):
    existing = await db.scalar(select(Award).where(Award.challenge_id == challenge.id))
    if existing:
        return [stamp_view(existing)]
    # The unique challenge source prevents duplicate XP even across worker retries.
    changed = await db.execute(update(Challenge).where(Challenge.id == challenge.id, Challenge.state.notin_(["completed", "retired"])).values(state="completed", choice=submission.choice))
    if not changed.rowcount:
        raise HTTPException(409, "This challenge cannot be completed")
    award_is_demo = record.is_demo
    if is_automatic(submission.verification):
        submission.verification = dict(submission.verification, reward_is_demo=award_is_demo)
    payload = challenge.payload
    variant = submission.choice or "classic"
    if award_is_demo and challenge.prerequisite_id:
        first = await db.scalar(select(Challenge).where(Challenge.trip_id == challenge.trip_id, Challenge.template_key == "maritime-reading-v1"))
        variant = first.choice or "classic" if first else "classic"
    stamp = deepcopy(payload["stamp"]) | {"variant": variant, "place": payload["place"], "evidence_type": submission.evidence_type,
                                              "place_id": payload.get("place_id"), "challenge_key": payload.get("challenge_key"), "evaluation_profile": (submission.verification or {}).get("evaluation_profile"), "memory_text": submission.text, "evidence_available": bool(submission.image_name), "verification": "demo simulation" if award_is_demo else "operator reviewed equivalent task" if (submission.verification or {}).get("mode")=="manual_equivalent" else "learning rubric" if submission.evidence_type == "reflection" else "automatic photo content check" if is_automatic(submission.verification) else "operator reviewed"}
    award = Award(id=uid(), user_id=challenge.user_id, trip_id=challenge.trip_id, challenge_id=challenge.id, submission_id=submission.id, xp=payload["xp"], is_demo=award_is_demo, stamp=stamp)
    db.add(award)
    db.add(PassportEvent(user_id=challenge.user_id, trip_id=challenge.trip_id, type="stamp_earned", title=stamp["title"], description=f"{'Demo: ' if award_is_demo else ''}{payload['xp']} XP earned with an approved {submission.evidence_type}.", is_demo=award_is_demo, source_key="award:" + challenge.id))
    await db.flush()
    awards = list((await db.scalars(select(Award).where(Award.user_id == challenge.user_id, Award.is_demo == award_is_demo))).all())
    total_xp = sum(item.xp for item in awards)
    milestones = []
    if not award_is_demo:
        for threshold, name in LEVELS[1:]:
            if total_xp - award.xp < threshold <= total_xp:
                milestones.append(PassportEvent(user_id=challenge.user_id, trip_id=challenge.trip_id, type="level_up", title=f"Level up: {name}", description=f"You reached {threshold} XP through approved challenges.", is_demo=False, source_key=f"level:{challenge.user_id}:{threshold}"))
    remaining = await db.scalar(select(Challenge.id).where(Challenge.trip_id == challenge.trip_id, Challenge.state.notin_(["completed", "retired"])).limit(1))
    seal_key = f"journey:{challenge.trip_id}"
    existing_seal = await db.scalar(select(PassportEvent.id).where(PassportEvent.source_key == seal_key))
    if not remaining and not existing_seal:
        milestones.append(PassportEvent(user_id=challenge.user_id, trip_id=challenge.trip_id, type="journey_completed", title="Your journey seal is complete", description="You collected every active challenge in this chapter.", is_demo=award_is_demo, source_key=seal_key))
    db.add_all(milestones)
    for badge in BADGES:
        progress = len({a.stamp["category"] for a in awards}) if badge["id"] == "three-perspectives" else len(awards)
        if progress >= badge["target"]:
            earned = await db.scalar(select(PassportBadge).where(PassportBadge.user_id == challenge.user_id, PassportBadge.badge_key == badge["id"], PassportBadge.is_demo == award_is_demo))
            if not earned:
                db.add(PassportBadge(user_id=challenge.user_id, badge_key=badge["id"], is_demo=award_is_demo))
    await db.flush()
    award.stamp = dict(award.stamp, milestone_ids=[item.id for item in milestones])
    await db.flush()
    return [stamp_view(award)]


async def submission_result(db, submission):
    award = await db.scalar(select(Award).where(Award.submission_id == submission.id))
    milestones = []
    if award:
        milestones = list((await db.scalars(select(PassportEvent).where(PassportEvent.user_id == award.user_id, PassportEvent.id.in_(award.stamp.get("milestone_ids", []))))).all())
    return {"submission": await live_submission_view(db, submission), "awards": [stamp_view(award)] if award else [], "milestones": [event_view(item) for item in milestones]}


def voucher_view(voucher):
    state = "expired" if voucher.state == "issued" and aware(voucher.expires_at) <= utcnow() else voucher.state
    return deepcopy(voucher.snapshot) | {"id": voucher.id, "offer_id": voucher.offer_id, "code": voucher.code, "state": state, "is_demo": voucher.is_demo, "issued_at": iso(voucher.issued_at), "expires_at": iso(voucher.expires_at)}


async def reward_view(db, user_id):
    awards = list((await db.scalars(select(Award).where(Award.user_id == user_id))).all())
    vouchers = list((await db.scalars(select(Voucher).where(Voucher.user_id == user_id).order_by(Voucher.issued_at.desc()))).all())
    claimed = {v.offer_id for v in vouchers}
    offers = []
    for item in OFFERS:
        count = sum(a.is_demo == item["is_demo"] and not a.challenge_id.startswith("game:") for a in awards)
        offers.append(deepcopy(item) | {"earned_stamps": count, "eligible": count >= item["required_stamps"] and item["id"] not in claimed})
    return {"offers": offers, "vouchers": [voucher_view(v) for v in vouchers]}
