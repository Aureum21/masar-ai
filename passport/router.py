"""Authenticated Passport API. All writes are scoped to the authenticated owner."""
from datetime import date, timedelta
import hashlib
import hmac
import json
import os
from typing import Literal

import asyncio
from fastapi import BackgroundTasks, APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, update

import auth
import models as core
from . import service as s
from .catalogue import BADGES, CATEGORIES, GAMES, OFFERS
from .equivalent import equivalent_task as s_equivalent_task
from .models import Award, Challenge, PassportBadge, PassportEvent, PassportTrip, Submission, Voucher, uid, utcnow, DailyPromoAssignment, DailyCoinLedger, DailyPromoSubmission
from . import promotions as promo
from . import coin_rewards as coins

router = APIRouter(prefix="/api/v1/passport", tags=["Passport"])


async def session(background_tasks: BackgroundTasks, user=Depends(auth.get_current_user), db=Depends(auth.get_db)):
    async with s.user_lock(db, user.id):
        try:
            yield db
            await db.commit()
        except BaseException:
            await db.rollback()
            await s.rollback_new_evidence(db)
            db.info.pop("passport_removed_files", None)
            db.info.pop("passport_delete_ids", None)
            raise
        finally:
            db.info.pop("passport_new_files", None)
            db.info.pop("passport_new_objects", None)
            db.info.pop("passport_saved_evidence", None)
        s.schedule_evidence_cleanup(db, background_tasks)


DB = Depends(session, scope="function")
USER = Depends(auth.get_current_user)


class Payload(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Schedule(Payload):
    expected_revision: int = Field(ge=1)
    start_date: date | None
    end_date: date | None
    timezone: Literal['Asia/Dubai'] | None = None


class Activation(Payload):
    interests: list[str] = Field(default_factory=list, max_length=6)
    pace: Literal["light", "balanced"] = "balanced"


class GameCompletion(Payload):
    session_id: str = Field(pattern=r"^[a-f0-9]{32}$")
    elapsed_seconds: int = Field(default=0, ge=0, le=86400)
    score: int = Field(default=0, ge=0, le=1000000)
    mode: str = Field(default="normal", max_length=50)
    details: dict = Field(default_factory=dict)


class Action(Payload):
    action: Literal["accept", "skip", "resume"]


class Claim(Payload):
    idempotency_key: str = Field(min_length=8, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")


class Review(Payload):
    decision: Literal["accepted", "rejected"]
    feedback: str = Field(min_length=3, max_length=2000)


def require_operator(key):
    secret = os.getenv("PASSPORT_OPERATOR_KEY", "")
    if not secret or not key or not hmac.compare_digest(key, secret):
        raise HTTPException(403, "Authorized passport operator key required")


@router.get("/summary")
async def summary(user=USER, db=Depends(auth.get_db)):
    # Dashboard reads must not queue behind evidence/booking writes for this user.
    awards = list((await db.scalars(select(Award).where(Award.user_id == user.id).order_by(Award.earned_at.desc()))).all())
    views = await s.summary_trip_views(db, user.id, awards)
    events = list((await db.scalars(select(PassportEvent).where(PassportEvent.user_id == user.id, PassportEvent.type.notin_(['notification','game_session'])).order_by(PassportEvent.created_at.desc()).limit(20))).all())
    live = [a for a in awards if not a.is_demo and not a.challenge_id.startswith("game:")]
    xp, demo_xp = sum(a.xp for a in live), sum(a.xp for a in awards if a.is_demo and not a.challenge_id.startswith("game:"))
    levels = s.LEVELS
    number = max(i for i, (threshold, _) in enumerate(levels) if xp >= threshold)
    current, name = levels[number]
    next_xp = levels[number + 1][0] if number + 1 < len(levels) else None
    badges = []
    for badge in BADGES:
        progress = len({a.stamp["category"] for a in live}) if badge["id"] == "three-perspectives" else len(live)
        badges.append(dict(badge) | {"earned": progress >= badge["target"], "progress": min(progress, badge["target"])})
    return {"user": {"id": user.id, "name": user.name}, "xp": xp, "demo_xp": demo_xp,
            "level": {"name": name, "number": number + 1, "current_xp": current, "next_xp": next_xp, "progress": min(1, (xp - current) / (next_xp - current)) if next_xp else 1},
            "stamps": [s.stamp_view(a) for a in awards if not a.challenge_id.startswith("game:")], "badges": badges, "recent_events": [s.event_view(e) for e in events],
            "active_trips": [v for v in views if v["status"] != "past"],
            "stats": {"trips": len(views), "stamps": len(awards), "challenges": len(awards)}, "reviewer_enabled": False}


@router.get("/trips")
async def trips(user=USER, db=DB):
    records = list((await db.scalars(select(core.Trip).where(core.Trip.user_id == user.id).order_by(core.Trip.created_at.desc()))).all())
    views = []
    for trip in records:
        await s.normalize(db, trip)
        views.append(await s.trip_view(db, trip))
    return {"trips": views}


@router.get("/trips/{trip_id}")
async def trip_detail(trip_id: int, user=USER, db=DB):
    return await s.detail(db, await s.owned_trip(db, user.id, trip_id))


@router.patch("/trips/{trip_id}")
async def schedule(trip_id: int, payload: Schedule, user=USER, db=DB):
    trip = await s.owned_trip(db, user.id, trip_id)
    record = await s.sidecar(db, trip)
    if bool(payload.start_date) != bool(payload.end_date):
        raise HTTPException(422, "Provide both start and end dates, or clear both")
    if payload.start_date:
        duration = (payload.end_date - payload.start_date).days + 1
        if duration < 1 or duration > 365:
            raise HTTPException(422, "The end date must follow the start date; trips may span at most 365 days")
        if trip.duration_days and duration != trip.duration_days:
            raise HTTPException(422, f"Choose dates spanning exactly {trip.duration_days} days for this itinerary")
    if payload.timezone:
        record.timezone = s.validate_timezone(payload.timezone)
    from domain.trips import normalise_itinerary
    current = normalise_itinerary(trip.itinerary_data, trip_id=trip.id)
    if current['revision'] != payload.expected_revision:
        raise HTTPException(409, 'Trip revision changed. Reload before rescheduling.')
    before = json.loads(json.dumps(current))
    current.update(start_date=payload.start_date.isoformat() if payload.start_date else None, end_date=payload.end_date.isoformat() if payload.end_date else None)
    if not payload.start_date and current.get('status') == 'active':
        current['status'] = 'draft'
    # Recalculate day dates rather than retaining stale dates after a reschedule.
    for day in current['days']:
        day.pop('date', None)
    next_itinerary = normalise_itinerary(current, trip_id=trip.id, revision=current['revision']+1)
    from domain.trip_edits import validate_edit
    submitted_query = select(Challenge).where(Challenge.trip_id==trip.id,Challenge.state.in_(['pending','completed']))
    submitted = (await db.scalars(submitted_query)).all()
    validate_edit(before,next_itinerary,{c.payload.get('source_activity_id',c.activity_id) for c in submitted})
    trip.itinerary_data = next_itinerary
    record.start_date, record.end_date = payload.start_date, payload.end_date
    await db.flush()
    return await s.trip_view(db, trip)


@router.post("/trips/{trip_id}/activate")
async def activate(trip_id: int, payload: Activation, user=USER, db=DB):
    if any(interest not in CATEGORIES for interest in payload.interests):
        raise HTTPException(422, "Choose interests from heritage, discovery, creative, adventure, nature, connection")
    return await s.activate(db, await s.owned_trip(db, user.id, trip_id), payload.interests, payload.pace)


@router.post("/trips/{trip_id}/pause")
async def pause(trip_id: int, user=USER, db=DB):
    trip = await s.owned_trip(db, user.id, trip_id)
    record = await s.sidecar(db, trip)
    record.challenges_enabled = False
    await db.flush()
    return await s.detail(db, trip)


@router.post("/demo-trip")
async def demo_trip(user=USER, db=DB):
    existing = await db.scalar(select(PassportTrip).join(core.Trip, core.Trip.id == PassportTrip.trip_id).where(PassportTrip.user_id == user.id, PassportTrip.demo_key == "sharjah-pilot-v1", core.Trip.user_id == user.id))
    if existing:
        return {"trip_id": existing.trip_id}
    trip = core.Trip(user_id=user.id, title="Sharjah stories · fictional demo", destination="Sharjah (demo itinerary)", duration_days=3, budget_tier="demo", vibes=["heritage", "creative"], itinerary_data={"days": [
        {"day_number": 1, "theme": "Sea and stories · demo", "activities": [{"title": "Maritime learning card", "time": "10:00", "location": "Fictional maritime study stop", "description": "Read a supplied sample story. No museum attendance is asserted.", "category": "heritage"}]},
        {"day_number": 2, "theme": "Look for a detail · demo", "activities": [{"title": "Architecture observation", "time": "10:00", "location": "Fictional architecture stop", "description": "Use a sample or your own image to simulate a review.", "category": "discovery"}]},
        {"day_number": 3, "theme": "Make a memory · demo", "activities": [{"title": "Creative motif studio", "time": "10:00", "location": "Fictional creative studio", "description": "Try a creative response; demo approval is explicitly simulated.", "category": "creative"}]},
    ]})
    db.add(trip)
    await db.flush()
    today = date.today()
    record = PassportTrip(trip_id=trip.id, user_id=user.id, start_date=today, end_date=today + timedelta(days=2), timezone="Asia/Dubai", challenges_enabled=True, is_demo=True, demo_key="sharjah-pilot-v1", interests=["heritage", "creative"], pace="balanced")
    db.add(record)
    await db.flush()
    await s.activate(db, trip, record.interests, "balanced")
    return {"trip_id": trip.id}


@router.post("/challenges/{challenge_id}/action")
async def action(challenge_id: str, payload: Action, user=USER, db=DB):
    challenge, trip = await s.owned_challenge(db, user.id, challenge_id)
    record = await s.sidecar(db, trip)
    await s.ensure_available(db, challenge, record)
    if challenge.state in ("completed", "pending"):
        if payload.action == "accept":
            return await s.challenge_view(db, challenge, record)
        raise HTTPException(409, "A completed or pending challenge cannot be skipped or resumed")
    challenge.state = "skipped" if payload.action == "skip" else "accepted"
    await db.flush()
    return await s.challenge_view(db, challenge, record)


@router.post("/challenges/{challenge_id}/submissions")
async def submit(challenge_id: str, evidence_type: str = Form(...), idempotency_key: str = Form(...), text: str = Form(""), choice: str = Form(""), file: UploadFile | None = File(None), photos: list[UploadFile] = File(default=[]), quiz_answer: int | None = Form(None), boxing_score: int | None = Form(None), machine_confirmed: bool = Form(False), own_photo_confirmed: bool = Form(False), evaluation_profile: str = Form("strict"), captured_at: str = Form(""), capture_location: str = Form(""), equivalent: bool = Form(False), user=USER, db=DB):
    from .verification import demo_allowed
    if evaluation_profile not in {'strict', 'demo'}:
        raise HTTPException(422, 'Choose strict or demo evaluation.')
    if evaluation_profile == 'demo' and not demo_allowed():
        raise HTTPException(403, 'Demo evaluation is not enabled on this server.')
    # Bound the read even when the request's Content-Length is missing/untrusted.
    data = await file.read(s.MAX_IMAGE_BYTES + 1) if file else b""
    if file:
        await file.close()
    if len(data) > s.MAX_IMAGE_BYTES:
        raise HTTPException(413, "Choose an image of at most 5 MB")
    try:
        Claim(idempotency_key=idempotency_key)
    except ValueError:
        raise HTTPException(422, "Use an 8–100 character idempotency key containing letters, digits, underscores, or dashes")
    if len(text) > s.MAX_TEXT or len(choice) > 80:
        raise HTTPException(422, "Reflection/caption is limited to 5000 characters")
    text, choice = text.strip(), choice.strip() or None
    if len(photos) > 3:
        raise HTTPException(422, 'Submit exactly three discovery photographs.')
    photo_data = []
    for photo in photos:
        content = await photo.read(s.MAX_IMAGE_BYTES + 1)
        await photo.close()
        if len(content) > s.MAX_IMAGE_BYTES:
            raise HTTPException(413, 'Each photograph must be at most 5 MB.')
        s.validate_image(content, photo.content_type)
        photo_data.append(content)
    if photo_data:
        # A private contact sheet keeps all three discoveries in the existing evidence contract.
        from io import BytesIO
        from PIL import Image, ImageOps
        sheet = Image.new('RGB', (1000, 2250), 'white')
        for index, content in enumerate(photo_data):
            with Image.open(BytesIO(content)) as image:
                tile = ImageOps.contain(ImageOps.exif_transpose(image).convert('RGB'), (1000,750))
                sheet.paste(tile, ((1000-tile.width)//2, index*750+(750-tile.height)//2))
        output = BytesIO()
        sheet.save(output, format='JPEG', quality=88)
        data = output.getvalue()
    request_parts = [challenge_id, evidence_type, text, choice, quiz_answer, hashlib.sha256(data).hexdigest()]
    if boxing_score is not None or machine_confirmed or own_photo_confirmed:
        request_parts.append([boxing_score, machine_confirmed, own_photo_confirmed])
    if evaluation_profile != 'strict':
        request_parts.append(['evaluation_profile', evaluation_profile])
    if captured_at or capture_location:
        request_parts.append(['capture', captured_at, capture_location])
    if equivalent:request_parts.append(['equivalent','equivalent-observation-v1'])
    request_hash = hashlib.sha256(json.dumps(request_parts, ensure_ascii=False).encode()).hexdigest()
    replay = await db.scalar(select(Submission).where(Submission.user_id == user.id, Submission.idempotency_key == idempotency_key))
    if replay:
        if replay.request_hash != request_hash:
            raise HTTPException(409, "This idempotency key was already used for a different submission")
        return await s.submission_result(db, replay)
    challenge, trip = await s.owned_challenge(db, user.id, challenge_id)
    record = await s.sidecar(db, trip)
    await s.ensure_available(db, challenge, record)
    if challenge.state != "accepted":
        raise HTTPException(409, "Accept or resume this challenge before submitting; pending or completed work cannot be submitted again")
    from .equivalent import validate_equivalent
    equivalent_verification=None
    if equivalent:
        try:equivalent_verification=validate_equivalent(challenge.payload,evidence_type,text)
        except ValueError as error:raise HTTPException(422,str(error))
        if file or photos or quiz_answer is not None or boxing_score is not None or evaluation_profile!='strict':raise HTTPException(422,'The equivalent task accepts a reflection for authorized review only.')
    if not equivalent and evidence_type not in challenge.payload["evidence_methods"]:
        raise HTTPException(422, "Choose an evidence method offered for this challenge")
    choices = {option["id"] for option in challenge.payload.get("choice_options", [])}
    if (choices and choice not in choices) or (not choices and choice):
        raise HTTPException(422, "Choose one of the challenge's listed paths")
    if not equivalent and challenge.payload.get('required_photos') == 3:
        if evidence_type != 'photo' or len(photo_data) != 3 or file:
            raise HTTPException(422, 'Capture all three discovery photographs, then answer the landmark quiz.')
        if quiz_answer != challenge.payload['quiz']['correct']:
            raise HTTPException(422, 'Revisit the architectural clues and try the quiz again.')
        text = 'Three discovery photos and correct quiz answer. '+text
    elif photos:
        raise HTTPException(422, 'This challenge accepts a single evidence photograph.')
    from .evaluators import mode_for, resolve
    auto_mode = mode_for(challenge.payload, record.is_demo) if evidence_type == 'photo' else 'manual'
    automatic = auto_mode != 'manual'
    auto_boxing = auto_mode == 'automatic_boxing'
    if evaluation_profile == 'demo' and not automatic:
        raise HTTPException(422, 'Light image evaluation is available only for supported automatic checks.')
    facts = {}
    if automatic and not auto_boxing:
        if not own_photo_confirmed:
            raise HTTPException(422, 'Confirm your evidence declaration for this evaluation mode.')
        if resolve(challenge.payload).key == 'sunset-seeker':
            from .scene_rules import capture_facts
            try:
                facts = capture_facts(captured_at, capture_location, challenge.payload.get('sunset_window'))
            except ValueError as error:
                raise HTTPException(422, str(error))
    if auto_boxing:
        if not machine_confirmed or not own_photo_confirmed:
            raise HTTPException(422, 'Confirm a working machine with staff and submit your own photograph of your attempt.')
        if boxing_score is None or not 601 <= boxing_score <= 9999:
            raise HTTPException(422, 'Enter your final score above 600 (maximum 9999).')
    image_type, image_name, image_storage = None, None, None
    if evidence_type == "reflection":
        if file:
            raise HTTPException(422, "Reflection challenges accept text only")
        if equivalent:status,feedback='pending','Equivalent learning task submitted for authorized review against its rubric. No XP or stamp has been awarded.'
        else:status, feedback = s.assess_reflection(text, challenge.payload, choice=choice)
    else:
        if len(text) < 12:
            raise HTTPException(422, "Add a caption of at least 12 characters explaining your evidence")
        if evidence_type == "photo":
            if not file and not photo_data:
                raise HTTPException(422, "Attach a PNG or JPEG photograph")
            image_type = s.validate_image(data, "image/jpeg" if photo_data else file.content_type)
            image_name, image_storage = await s.store_evidence(db, user.id, data, image_type)
        elif file:
            raise HTTPException(422, "Partner evidence accepts a reference only")
        status, feedback = "pending", "Awaiting authorized review. No XP or stamp has been awarded."
        if record.is_demo:
            feedback = "Demo evidence saved. Use ‘Simulate approval’ to preview an award; no real visit is verified."
    submission = Submission(id=uid(), user_id=user.id, challenge_id=challenge.id, idempotency_key=idempotency_key, request_hash=request_hash, evidence_type=evidence_type, text=text, choice=choice, image_name=image_name, image_type=image_type, image_storage=image_storage, status=status, feedback=feedback)
    if equivalent_verification:submission.verification=equivalent_verification
    db.add(submission)
    await db.flush()
    if automatic:
        from .verification import enqueue
        submission.feedback = "Checking your machine photo and displayed score. You can leave and return to this challenge." if auto_boxing else "Checking your required photos. You can leave and return to see the saved result."
        await enqueue(db, submission, boxing_score, evaluation_profile=evaluation_profile,
                      payload=challenge.payload, source_photos=photo_data or [data], facts=facts)
    if status == "accepted":
        await s.complete(db, challenge, submission, record)
    elif status == "pending":
        challenge.state = "pending"
    await db.flush()
    return await s.submission_result(db, submission)


@router.get("/submissions/{submission_id}")
async def submission_status(submission_id: str, user=USER, db=DB):
    submission = await db.scalar(select(Submission).where(Submission.id == submission_id, Submission.user_id == user.id))
    if not submission:
        raise HTTPException(404, "Submission not found")
    return await s.submission_result(db, submission)


@router.get("/submissions/{submission_id}/image")
async def evidence_image(submission_id: str, x_passport_operator_key: str | None = Header(None), user=USER, db=DB):
    submission = await db.get(Submission, submission_id)
    if not submission:
        raise HTTPException(404, "Evidence image not found")
    if submission.user_id != user.id:
        if not x_passport_operator_key:
            raise HTTPException(404, "Evidence image not found")
        require_operator(x_passport_operator_key)
    from .evidence_storage import read_bytes
    content = await asyncio.to_thread(read_bytes, s.evidence_snapshot(submission))
    return Response(content, media_type=submission.image_type, headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "Content-Disposition": "inline"})


@router.delete("/submissions/{submission_id}/image")
async def delete_evidence_image(submission_id: str, user=USER, db=DB):
    submission = await db.scalar(select(Submission).where(Submission.id == submission_id, Submission.user_id == user.id))
    if not submission:
        raise HTTPException(404, "Evidence image not found")
    await s.remove_evidence(db, submission)
    return {"message": "Private photograph removed. Any earned stamp is kept."}


async def review_submission(db, submission, decision, feedback, simulate=False):
    challenge, trip = await s.owned_challenge(db, submission.user_id, submission.challenge_id)
    record = await s.sidecar(db, trip)
    await s.ensure_available(db, challenge, record)
    if simulate and not record.is_demo:
        raise HTTPException(403, "Only demo evidence permits simulated approval")
    if submission.status == "accepted":
        if decision == "accepted":
            return await s.submission_result(db, submission)
        raise HTTPException(409, "An accepted award is permanent and cannot be rejected through this endpoint")
    if s.is_automatic(submission.verification) and submission.status == "pending":
        raise HTTPException(409, "The automatic image check is in progress.")
    if submission.status != "pending":
        raise HTTPException(409, "Only pending evidence can be reviewed")
    if challenge.state != "pending":
        raise HTTPException(409, "The challenge is no longer awaiting review")
    submission.status, submission.feedback, submission.reviewed_at = decision, feedback, utcnow()
    if decision == "accepted":
        await s.complete(db, challenge, submission, record)
    else:
        challenge.state = "accepted"
    await db.flush()
    return await s.submission_result(db, submission)


@router.post("/submissions/{submission_id}/demo-approve")
async def demo_approve(submission_id: str, user=USER, db=DB):
    submission = await db.scalar(select(Submission).where(Submission.id == submission_id, Submission.user_id == user.id))
    if not submission:
        raise HTTPException(404, "Submission not found")
    return await review_submission(db, submission, "accepted", "Simulated approval for the fictional demo only. This is not evidence of real attendance or a real partner benefit.", simulate=True)


@router.get("/review/submissions")
async def review_queue(x_passport_operator_key: str | None = Header(None), user=USER, db=DB):
    require_operator(x_passport_operator_key)
    pending = list((await db.scalars(select(Submission).where(Submission.status == "pending").order_by(Submission.created_at).limit(100))).all())
    result = []
    for submission in pending:
        challenge = await db.get(Challenge, submission.challenge_id)
        record = await db.get(PassportTrip, challenge.trip_id) if challenge else None
        if not record or record.is_demo or challenge.state == "retired":
            continue
        result.append(s.submission_view(submission) | {"challenge_id": challenge.id, "trip_id": challenge.trip_id, "title": challenge.payload["title"], "instructions": ((s_equivalent_task(challenge.payload)['card']+' Review rubric: '+s_equivalent_task(challenge.payload)['rubric']) if (submission.verification or {}).get('mode')=='manual_equivalent' and s_equivalent_task(challenge.payload) else challenge.payload['instructions']), "image_url": f"/api/v1/passport/submissions/{submission.id}/image" if submission.image_name else None})
    return {"submissions": result}


@router.post("/review/submissions/{submission_id}")
async def operator_review(submission_id: str, payload: Review, x_passport_operator_key: str | None = Header(None), user=USER, db=DB):
    require_operator(x_passport_operator_key)
    submission = await db.get(Submission, submission_id)
    if not submission:
        raise HTTPException(404, "Submission not found")
    # Serialize on the traveler's row, including when an operator owns another account.
    if submission.user_id != user.id:
        async with s.user_lock(db, submission.user_id):
            return await review_submission(db, submission, payload.decision, payload.feedback.strip())
    return await review_submission(db, submission, payload.decision, payload.feedback.strip())


@router.get("/rewards")
async def rewards(user=USER, db=DB):
    return await s.reward_view(db, user.id)


@router.post("/rewards/{offer_id}/claim")
async def claim(offer_id: str, payload: Claim, user=USER, db=DB):
    offer = next((item for item in OFFERS if item["id"] == offer_id), None)
    if not offer:
        raise HTTPException(404, "Approved offer not found")
    replay = await db.scalar(select(Voucher).where(Voucher.user_id == user.id, Voucher.idempotency_key == payload.idempotency_key))
    if replay:
        if replay.offer_id != offer_id:
            raise HTTPException(409, "This idempotency key belongs to a different offer")
        return {"voucher": s.voucher_view(replay)}
    existing = await db.scalar(select(Voucher).where(Voucher.user_id == user.id, Voucher.offer_id == offer_id))
    if existing:
        return {"voucher": s.voucher_view(existing)}
    award_count = len(list((await db.scalars(select(Award.id).where(Award.user_id == user.id, Award.is_demo == offer["is_demo"], ~Award.challenge_id.startswith("game:")))).all()))
    if award_count < offer["required_stamps"]:
        raise HTTPException(409, "Earn the required approved stamps before claiming this offer")
    # Catalogue currently includes only clearly labeled fictional pilot offers.
    if not offer["is_demo"]:
        raise HTTPException(409, "Live rewards require an enrolled partner and merchant issuance integration")
    code_prefix = offer.get("code_prefix", "DEMO-")
    code = code_prefix + uid()[:10].upper()
    voucher = Voucher(id=uid(), user_id=user.id, offer_id=offer_id, idempotency_key=payload.idempotency_key, code=code, state="issued", is_demo=True,
                      snapshot={key: offer[key] for key in ("title", "partner", "benefit", "category", "location") if key in offer}, expires_at=utcnow() + timedelta(days=30))
    db.add(voucher)
    db.add(PassportEvent(user_id=user.id, type="reward_claimed", title=offer["title"], description="Demo voucher issued; no monetary value. Your permanent stamps remain.", is_demo=True, source_key=f"claim:{user.id}:{offer_id}"))
    await db.flush()
    return {"voucher": s.voucher_view(voucher)}


@router.post("/vouchers/{voucher_id}/demo-redeem")
async def demo_redeem(voucher_id: str, user=USER, db=DB):
    voucher = await db.scalar(select(Voucher).where(Voucher.id == voucher_id, Voucher.user_id == user.id))
    if not voucher:
        raise HTTPException(404, "Voucher not found")
    if not voucher.is_demo:
        raise HTTPException(403, "Real vouchers require merchant authentication")
    if voucher.state == "redeemed":
        return {"voucher": s.voucher_view(voucher)}
    if voucher.state != "issued" or s.aware(voucher.expires_at) <= utcnow():
        raise HTTPException(409, "This voucher is expired or unavailable")
    changed = await db.execute(update(Voucher).where(Voucher.id == voucher.id, Voucher.state == "issued", Voucher.expires_at > utcnow()).values(state="redeemed", redeemed_at=utcnow()).execution_options(synchronize_session="fetch"))
    if not changed.rowcount:
        raise HTTPException(409, "This voucher was already redeemed or expired")
    db.add(PassportEvent(user_id=user.id, type="reward_redeemed", title=voucher.snapshot["title"], description="Demo redemption simulated once; no real partner benefit was used.", is_demo=True, source_key="redeem:" + voucher.id))
    await db.flush()
    return {"voucher": s.voucher_view(voucher)}


@router.get('/games')
async def list_games(user=USER, db=DB):
    events = list((await db.scalars(select(PassportEvent).where(PassportEvent.user_id == user.id, PassportEvent.type == 'game_completed'))).all())
    done = {json.loads(e.description)['game_id'] for e in events}
    return {'games': [dict(g, completed=g['id'] in done) for g in GAMES]}


@router.post('/games/{game_id}/sessions')
async def start_game(game_id: str, user=USER, db=DB):
    if not any(g['id'] == game_id for g in GAMES):
        raise HTTPException(404, 'Game not found')
    event = PassportEvent(id=uid(), user_id=user.id, type='game_session', title='Practice game session', description=json.dumps({'game_id':game_id}), is_demo=True, source_key='game-session:'+uid())
    db.add(event)
    await db.flush()
    return {'session_id': event.id, 'reward_mode': 'practice-only', 'xp_awarded': 0}


@router.post('/games/{game_id}/complete')
async def complete_game(game_id: str, payload: GameCompletion, user=USER, db=DB):
    event = await db.scalar(select(PassportEvent).where(PassportEvent.id == payload.session_id, PassportEvent.user_id == user.id))
    if not event or event.type not in {'game_session','game_completed'}:
        raise HTTPException(404, 'Game session not found')
    stored = json.loads(event.description)
    if stored['game_id'] != game_id:
        raise HTTPException(409, 'The session belongs to another game.')
    if event.type == 'game_completed':
        return stored['result']
    if (utcnow()-s.aware(event.created_at)).total_seconds() > 86400:
        raise HTTPException(409, 'Game session expired; start another practice run.')
    result = {'status':'success','game_id':game_id,'first_time':False,'xp_awarded':0,'practice_only':True,'message':'Practice result saved. Browser scores do not grant verified XP, stamps or redeemable points.'}
    event.type = 'game_completed'
    event.title = 'Practice game completed'
    event.description = json.dumps({'game_id':game_id,'score':payload.score,'elapsed_seconds':payload.elapsed_seconds,'mode':payload.mode,'result':result})
    await db.flush()
    return result


@router.get('/notifications')
async def notifications(user=USER, db=DB):
    from .notifications import inbox
    trips=list((await db.scalars(select(core.Trip).where(core.Trip.user_id==user.id))).all())
    return {'notifications':await inbox(db,user.id,trips)}

class NoticeAction(Payload):
    action: Literal['read','read_all','dismiss_all']
    id: str | None = None

@router.post('/notifications/actions')
async def notification_action(payload: NoticeAction, user=USER, db=DB):
    events=list((await db.scalars(select(PassportEvent).where(PassportEvent.user_id==user.id,PassportEvent.type=='notification'))).all())
    for event in events:
        if payload.action == 'read' and event.id != payload.id:
            continue
        data=json.loads(event.description)
        data['read']=True
        if payload.action=='dismiss_all':data['dismissed']=True
        event.description=json.dumps(data)
    return {'status':'saved'}


# ── DAILY PROMOTIONAL CHALLENGE WHEEL ──

class PromoGameComplete(Payload):
    session_id: str
    score: int = Field(default=0, ge=0)
    elapsed_seconds: int = Field(default=0, ge=0)
    details: dict = Field(default_factory=dict)


class PromoSubmission(Payload):
    idempotency_key: str = Field(min_length=6, max_length=100)
    evidence_type: Literal['photo', 'reflection']
    text: str = Field(default='', max_length=2000)
    image_name: str | None = None
    image_storage: dict | None = None


@router.get('/daily-promotions/today')
async def daily_promotion_today(user=USER, db=DB):
    assignment = await promo.get_today_assignment(db, user.id)
    pool = promo.build_wheel_pool()
    balance = await promo.get_daily_coin_balance(db, user.id)
    return {
        'dubai_day': promo.current_dubai_day(),
        'server_time': promo.utcnow().isoformat(),
        'expires_at': promo.dubai_midnight_expiry().isoformat(),
        'seconds_remaining': promo.remaining_seconds_today(),
        'has_spun': assignment is not None,
        'assignment': promo.assignment_view(assignment, pool),
        'wheel_pool': assignment.wheel_pool if assignment else pool,
        'coins_balance': balance
    }


@router.post('/daily-promotions/spin')
async def daily_promotion_spin(user=USER, db=DB):
    assignment = await promo.spin_daily_wheel(db, user.id)
    balance = await promo.get_daily_coin_balance(db, user.id)
    return {
        'assignment': promo.assignment_view(assignment),
        'selected_slot': assignment.selected_slot,
        'coins_balance': balance
    }


@router.post('/daily-promotions/{assignment_id}/accept')
async def daily_promotion_accept(assignment_id: str, user=USER, db=DB):
    assignment = await db.scalar(
        select(DailyPromoAssignment).where(
            DailyPromoAssignment.id == assignment_id,
            DailyPromoAssignment.user_id == user.id
        )
    )
    if not assignment:
        raise HTTPException(404, 'Daily challenge assignment not found')
    assignment = await promo.accept_daily_assignment(db, assignment)
    return {'assignment': promo.assignment_view(assignment)}


@router.post('/daily-promotions/{assignment_id}/reject')
async def daily_promotion_reject(assignment_id: str, user=USER, db=DB):
    assignment = await db.scalar(
        select(DailyPromoAssignment).where(
            DailyPromoAssignment.id == assignment_id,
            DailyPromoAssignment.user_id == user.id
        )
    )
    if not assignment:
        raise HTTPException(404, 'Daily challenge assignment not found')
    assignment = await promo.reject_daily_assignment(db, assignment)
    return {'assignment': promo.assignment_view(assignment)}


@router.post('/daily-promotions/{assignment_id}/game-sessions')
async def daily_promotion_game_session(assignment_id: str, user=USER, db=DB):
    assignment = await db.scalar(
        select(DailyPromoAssignment).where(
            DailyPromoAssignment.id == assignment_id,
            DailyPromoAssignment.user_id == user.id
        )
    )
    if not assignment:
        raise HTTPException(404, 'Daily challenge assignment not found')
    if assignment.kind != 'game':
        raise HTTPException(400, 'This assignment is not an in-app game.')
    if assignment.state in {'completed', 'rejected', 'expired'}:
        raise HTTPException(400, f'Cannot start session for assignment in state {assignment.state}.')
    try:
        session_id = await promo.create_game_session(db, assignment)
    except ValueError as error:
        raise HTTPException(400, str(error)) from error
    game_id = assignment.template_snapshot.get('game_id')
    return {'session_id': session_id, 'game_id': game_id, 'assignment_id': assignment.id}


@router.post('/daily-promotions/{assignment_id}/game-complete')
async def daily_promotion_game_complete(assignment_id: str, payload: PromoGameComplete, user=USER, db=DB):
    assignment = await db.scalar(
        select(DailyPromoAssignment).where(
            DailyPromoAssignment.id == assignment_id,
            DailyPromoAssignment.user_id == user.id
        )
    )
    if not assignment:
        raise HTTPException(404, 'Daily challenge assignment not found')
    if assignment.kind != 'game':
        raise HTTPException(400, 'This assignment is not a game.')
    if assignment.state == 'completed':
        balance = await promo.get_daily_coin_balance(db, user.id)
        return {'status': 'completed', 'already_awarded': True, 'coins_awarded': assignment.coins_reward, 'balance': balance}
    if assignment.state in {'rejected', 'expired'}:
        raise HTTPException(400, f'Assignment is {assignment.state}.')
    if promo.aware(promo.utcnow()) >= promo.aware(assignment.expires_at):
        raise HTTPException(400, 'Assignment has expired.')
    if not assignment.game_session_id or assignment.game_session_id != payload.session_id:
        raise HTTPException(403, 'Invalid or expired promotional game session.')

    # Validate objective
    tmpl = assignment.template_snapshot
    min_score = tmpl.get('min_score', 0)
    score = payload.score
    details = payload.details or {}
    parcel_delivered = details.get('parcel_delivered', False)

    objective_met = (score >= min_score) or (tmpl.get('game_id') == 'sikka-run' and parcel_delivered is True)
    if not objective_met:
        return {
            'status': 'retry',
            'message': f'Objective not yet met. Minimum required score is {min_score}. Try again before midnight!',
            'coins_awarded': 0
        }

    game_title = tmpl.get('title', 'Game')
    balance = await promo.award_coins_for_assignment(
        db, assignment, f'Completed promotional game: {game_title}'
    )
    return {
        'status': 'completed',
        'message': f'Congratulations! You earned {assignment.coins_reward} Daily Challenge Coin.',
        'coins_awarded': assignment.coins_reward,
        'balance': balance,
        'assignment': promo.assignment_view(assignment)
    }


@router.post('/daily-promotions/{assignment_id}/submissions')
async def daily_promotion_submit_evidence(assignment_id: str, payload: PromoSubmission, user=USER, db=DB):
    assignment = await db.scalar(
        select(DailyPromoAssignment).where(
            DailyPromoAssignment.id == assignment_id,
            DailyPromoAssignment.user_id == user.id
        )
    )
    if not assignment:
        raise HTTPException(404, 'Daily challenge assignment not found')
    if assignment.kind != 'venue':
        raise HTTPException(400, 'This assignment is not a venue challenge.')
    if assignment.state == 'completed':
        balance = await promo.get_daily_coin_balance(db, user.id)
        return {'status': 'completed', 'already_awarded': True, 'coins_awarded': assignment.coins_reward, 'balance': balance}
    if assignment.state in {'rejected', 'expired'}:
        raise HTTPException(400, f'Assignment is {assignment.state}.')
    if promo.aware(promo.utcnow()) >= promo.aware(assignment.expires_at):
        raise HTTPException(400, 'Assignment has expired.')
    if assignment.state != 'accepted':
        raise HTTPException(400, 'Accept the venue challenge before submitting evidence.')

    # Replay protection
    existing_sub = await db.scalar(
        select(DailyPromoSubmission).where(
            DailyPromoSubmission.assignment_id == assignment.id,
            DailyPromoSubmission.idempotency_key == payload.idempotency_key
        )
    )
    if existing_sub:
        balance = await promo.get_daily_coin_balance(db, user.id)
        return {'status': existing_sub.status, 'coins_awarded': assignment.coins_reward if existing_sub.status == 'approved' else 0, 'balance': balance}

    # Validate reflection or photo
    if payload.evidence_type == 'reflection':
        if len(payload.text.strip()) < 15:
            raise HTTPException(400, 'Please write at least 15 characters for your reflection.')

    # Create submission record
    sub = DailyPromoSubmission(
        id=uid(),
        assignment_id=assignment.id,
        user_id=user.id,
        idempotency_key=payload.idempotency_key,
        status='approved',
        evidence_type=payload.evidence_type,
        text=payload.text.strip(),
        image_name=payload.image_name,
        image_storage=payload.image_storage,
        feedback='Challenge objective validated.',
        submitted_at=promo.utcnow(),
        reviewed_at=promo.utcnow()
    )
    db.add(sub)
    await db.flush()

    venue_title = assignment.template_snapshot.get('title', 'Venue')
    balance = await promo.award_coins_for_assignment(
        db, assignment, f'Completed promotional venue challenge: {venue_title}'
    )
    return {
        'status': 'completed',
        'message': f'Venue challenge verified! You earned {assignment.coins_reward} Daily Challenge Coin.',
        'coins_awarded': assignment.coins_reward,
        'balance': balance,
        'assignment': promo.assignment_view(assignment)
    }


@router.get('/daily-promotions/coins')
async def daily_promotion_coins(user=USER, db=DB):
    balance = await promo.get_daily_coin_balance(db, user.id)
    return {'balance': balance}


@router.get('/daily-promotions/history')
async def daily_promotion_history(user=USER, db=DB):
    history = await promo.get_daily_promo_history(db, user.id)
    balance = await promo.get_daily_coin_balance(db, user.id)
    return {'history': history, 'balance': balance}

# Demo coin rewards never spend earned Daily Challenge Coins or Passport XP.
class CoinRewardRequest(Payload):
    idempotency_key: str = Field(min_length=8, max_length=100, pattern=r'^[a-zA-Z0-9_-]+$')
    expected_coins: int = Field(ge=1, le=100000)


@router.get('/coin-rewards')
async def coin_reward_catalogue(user=USER, db=DB):
    return {'offers': coins.catalogue(), 'balance': await coins.balance(db, user.id),
            'earned_coins': await promo.get_daily_coin_balance(db, user.id),
            'starting_coins': coins.STARTING_COINS, 'redemptions': await coins.history(db, user.id), 'is_demo': True}


@router.post('/coin-rewards/{offer_id}/redeem')
async def request_coin_reward(offer_id: str, payload: CoinRewardRequest, user=USER, db=DB):
    record = await coins.redeem(db, user.id, offer_id, payload.idempotency_key, payload.expected_coins)
    return {'redemption': coins.view(record), 'balance': await coins.balance(db, user.id), 'is_demo': True}


@router.post('/coin-redemptions/{redemption_id}/demo-use')
async def use_demo_coin_reward(redemption_id: str, user=USER, db=DB):
    record = await coins.use_demo(db, user.id, redemption_id)
    return {'redemption': coins.view(record), 'balance': await coins.balance(db, user.id), 'is_demo': True}
