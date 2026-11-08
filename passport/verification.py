"""Durable registered photo checks, separate from the planner and API process."""
import asyncio
from datetime import timedelta
import json
import os
from pathlib import Path
from uuid import uuid4
from sqlalchemy import select, or_, update
from .models import Submission, Challenge, EvidenceCheck, EvidenceUse, EvidencePhotoUse, PassportEvent, uid, utcnow
from . import service as s
from .boxing_rules import POLICY, DEMO_POLICY, fingerprints
from .evaluators import resolve, for_submission, REGISTRY


def enabled():
    return os.getenv('PASSPORT_AUTO_BOXING', 'false').lower() == 'true'


def demo_allowed():
    return os.getenv('PASSPORT_VISION_LIGHT_ALLOWED', os.getenv('PASSPORT_BOXING_DEMO_ALLOWED', 'false')).lower() == 'true'


async def enqueue(db, submission, declared_score=None, evaluation_profile='strict', *, payload=None, source_photos=None, facts=None):
    from .evidence_storage import read_bytes
    stored = db.info.get('passport_saved_evidence', {}).get(submission.image_name)
    if stored is None:
        stored = await asyncio.to_thread(read_bytes, s.evidence_snapshot(submission))
    digest, perceptual = fingerprints(stored)
    submission.verification = {'mode': 'automatic_boxing', 'policy': DEMO_POLICY if evaluation_profile == 'demo' else POLICY, 'evaluation_profile': evaluation_profile, 'state': 'queued',
                               'declared_score': declared_score, 'machine_confirmed': True, 'own_photo_confirmed': evaluation_profile == 'strict', 'demo_evidence_confirmed': evaluation_profile == 'demo'}
    evaluator = resolve(payload) if payload else REGISTRY['boxing']
    if not evaluator:
        raise ValueError('Unsupported automatic evaluator')
    sources = source_photos or [stored]
    hashes = [fingerprints(content)[0] for content in sources]
    if len(hashes) != evaluator.photos or len(set(hashes)) != len(hashes):
        from fastapi import HTTPException
        raise HTTPException(422, 'Use a different photograph for each required discovery.')
    if evaluator.key != 'boxing':
        submission.verification = {key: value for key, value in submission.verification.items() if key not in {'declared_score','machine_confirmed'}}
    boxes = [[0, index*750, 1000, (index+1)*750] for index in range(3)] if evaluator.photos == 3 else [None]
    submission.verification = dict(submission.verification,
        mode='automatic_boxing' if evaluator.key == 'boxing' else 'automatic_scene',
        evaluator_key=evaluator.key, policy=evaluator.policy(evaluation_profile),
        photo_count=len(hashes), photo_boxes=boxes, source_hashes=hashes,
        facts=facts or {}, quiz_correct=bool(payload and payload.get('quiz')))
    db.add(EvidenceCheck(submission_id=submission.id, user_id=submission.user_id,
                         state='queued', image_sha=digest, image_phash=perceptual))


async def claim(sessions):
    async with sessions() as db:
        now = utcnow()
        job = await db.scalar(select(EvidenceCheck).where(or_(EvidenceCheck.state == 'queued',
            (EvidenceCheck.state == 'running') & (EvidenceCheck.lease_until < now)))
            .order_by(EvidenceCheck.created_at).with_for_update(skip_locked=True).limit(1))
        if not job:
            return None
        job.state, job.token, job.lease_until = 'running', uuid4().hex, now+timedelta(minutes=5)
        job.attempts += 1
        await db.commit()
        return job.submission_id, job.token


async def heartbeat(sessions, submission_id, token):
    while True:
        await asyncio.sleep(30)
        try:
            async with asyncio.timeout(15):
                async with sessions() as db:
                    result = await db.execute(update(EvidenceCheck).where(EvidenceCheck.submission_id == submission_id,
                        EvidenceCheck.token == token, EvidenceCheck.state == 'running').values(lease_until=utcnow()+timedelta(minutes=5)))
                    await db.commit()
                    if not result.rowcount:
                        return
        except asyncio.CancelledError:
            raise
        except Exception as error:
            import logging
            logging.getLogger(__name__).warning('Evidence lease refresh interrupted (%s); retrying. The current token is checked before any award.', type(error).__name__)


def known_render(job):
    entries = json.loads(Path(__file__).with_name('vision_reference_hashes.json').read_text())
    for entry in entries:
        if job.image_sha == entry['sha']:
            return True
        if (int(job.image_phash, 16)^int(entry['phash'], 16)).bit_count() <= 3:
            return True
    return False


async def receipts_used(db, hashes):
    """Bound reuse lookups regardless of the number of submitted photos."""
    return bool(await db.scalar(select(EvidenceUse.image_sha).where(EvidenceUse.image_sha.in_(hashes)).limit(1))) or bool(
        await db.scalar(select(EvidencePhotoUse.image_sha).where(EvidencePhotoUse.image_sha.in_(hashes)).limit(1)))


async def process(sessions, submission_id, token, analyser=None):
    health = asyncio.create_task(heartbeat(sessions, submission_id, token))
    try:
        async with sessions() as db:
            job = await db.get(EvidenceCheck, submission_id)
            submission = await db.get(Submission, submission_id)
            if not job or job.token != token or job.state != 'running' or not submission:
                return
            if submission.status != 'pending' or not submission.image_name:
                job.state = 'done'
                await db.commit()
                return
            info = dict(submission.verification or {})
            evaluator = for_submission(info)
            challenge = await db.get(Challenge, submission.challenge_id)
            trusted = resolve(challenge.payload) if challenge else None
            hashes = sorted(set([job.image_sha] + info.get('source_hashes', [])))
            reused = await receipts_used(db, hashes)
            if not evaluator or not trusted or trusted.key != evaluator.key:
                report = {'decision': 'retry', 'feedback': 'The challenge evaluator changed. Refresh this task and submit again.'}
            elif info.get('policy') not in {None, evaluator.policy(info.get('evaluation_profile', 'strict'))}:
                report = {'decision': 'retry', 'feedback': 'The saved evaluation policy changed. Submit a new attempt under the current policy.'}
            elif reused:
                report = {'decision': 'reject', 'feedback': 'This photograph has already earned points. Submit a new photograph from your own attempt.'}
            elif (submission.verification or {}).get('evaluation_profile', 'strict') == 'strict' and known_render(job):
                report = {'decision': 'retry', 'feedback': 'This resembles a MASAR demonstration image. Take a real photograph of your own result at the venue.'}
            elif job.attempts > 3:
                report = {'decision': 'retry', 'feedback': 'The automatic check could not finish. Please try submitting again later.'}
            else:
                snapshot = s.evidence_snapshot(submission)
                score = info.get('declared_score')
                profile = info.get('evaluation_profile', 'strict')
                boxes = info.get('photo_boxes', [None])
                await db.rollback()  # Do not leave a database transaction idle during model inference.
                try:
                    def analyse_private():
                        from .evidence_storage import materialized
                        with materialized(snapshot) as path:
                            if analyser is not None:
                                measured = analyser(path)
                                return [measured] if isinstance(measured, dict) else measured
                            if evaluator.key == 'boxing':
                                from .vision_models import analyse_boxing
                                return [analyse_boxing(path)]
                            from .vision_models import analyse_evidence
                            return analyse_evidence(path, evaluator, boxes)
                    observations = await asyncio.to_thread(analyse_private)
                    if len(observations) != evaluator.photos or len(boxes) != evaluator.photos:
                        raise ValueError('Missing required individual photo observations')
                    reports = [evaluator.assess(item, profile, score) for item in observations]
                    failed = next(((i, r) for i, r in enumerate(reports) if r['decision'] == 'reject'), None)
                    failed = failed or next(((i, r) for i, r in enumerate(reports) if r['decision'] != 'accept'), None)
                    report = dict(failed[1] if failed else reports[0])
                    if failed and evaluator.photos > 1:
                        report['feedback'] = f'Photo {failed[0]+1}: ' + report['feedback']
                    elif evaluator.photos > 1:
                        report['feedback'] = f'{evaluator.name} identified in all three discovery photos; quiz answer correct. Fine architectural details and attendance are not independently verified.'
                    report['photos'] = reports
                    report['model'] = 'siglip2-base / PP-OCRv5-mobile' if evaluator.ocr else 'siglip2-base'
                    report['read_text'] = [{'text': row['text'], 'score': row['score']} for row in observations[0].get('lines', [])[:40]]
                except Exception:
                    import logging
                    logging.getLogger(__name__).exception('Automatic evidence model unavailable')
                    report = {'decision': 'retry', 'feedback': 'The image checker is temporarily unavailable. No points were deducted. Please try again later.'}
        await finish(sessions, submission_id, token, report)
    finally:
        health.cancel()
        await asyncio.gather(health, return_exceptions=True)


async def finish(sessions, submission_id, token, report):
    async with sessions() as db:
        submission = await db.get(Submission, submission_id)
        if not submission:
            return
        async with s.user_lock(db, submission.user_id):
            job = await db.scalar(select(EvidenceCheck).where(EvidenceCheck.submission_id == submission_id).with_for_update())
            if not job or job.token != token or job.state != 'running':
                return  # A superseded worker must never award points.
            await db.refresh(submission)
            challenge, trip = await s.owned_challenge(db, submission.user_id, submission.challenge_id)
            record = await s.sidecar(db, trip)
            job.state, job.lease_until = 'done', None
            if submission.status != 'pending' or challenge.state != 'pending' or not submission.image_name:
                await db.commit()
                return  # Evidence removed or operator already handled this task.
            evaluator = for_submission(submission.verification)
            trusted = resolve(challenge.payload)
            if not record.challenges_enabled or record.is_demo or not evaluator or not trusted or evaluator.key != trusted.key:
                report = {'decision': 'retry', 'feedback': 'This challenge is no longer available for an automatic award.'}
            else:
                try:
                    await s.ensure_available(db, challenge, record)
                    if evaluator.key == 'sunset-seeker':
                        from .scene_rules import capture_facts
                        facts = (submission.verification or {}).get('facts', {})
                        capture_facts(facts.get('captured_at'), facts.get('capture_location'), challenge.payload.get('sunset_window'))
                    elif evaluator.photos == 3 and not (submission.verification or {}).get('quiz_correct'):
                        raise ValueError('Quiz verification missing')
                except Exception:
                    report = {'decision': 'retry', 'feedback': 'This trip or challenge changed. Review your trip before submitting again.'}
            if report['decision'] == 'accept':
                # Serialize equal-image awards across users on PostgreSQL, with a
                # unique receipt as a final transactional safeguard on every DB.
                hashes = sorted(set([job.image_sha] + (submission.verification or {}).get('source_hashes', [])))
                if db.bind.dialect.name == 'postgresql':
                    from sqlalchemy import text
                    for digest in hashes:
                        await db.execute(text('SELECT pg_advisory_xact_lock(:key)'), {'key': int(digest[:15], 16)})
                if await receipts_used(db, hashes):
                    report = {'decision': 'reject', 'feedback': 'This photograph has already earned points. Submit evidence from a new attempt.'}
            submission.verification = dict(submission.verification or {}, state='done', **report)
            submission.feedback, submission.reviewed_at = report['feedback'], utcnow()
            if report['decision'] == 'accept':
                db.add(EvidenceUse(image_sha=job.image_sha, submission_id=submission.id))
                for digest in hashes:
                    db.add(EvidencePhotoUse(image_sha=digest, submission_id=submission.id))
                submission.status = 'accepted'
                await s.complete(db, challenge, submission, record)
            else:
                submission.status, challenge.state = 'rejected', 'accepted'
            demo_result = (submission.verification or {}).get('evaluation_profile') == 'demo'
            name = evaluator.name if evaluator else 'Challenge'
            notice = {'key': 'evidence:'+submission.id, 'persistent': True, 'tripId': trip.id,
                      'type': 'challenge_result', 'title': (name+' approved · light evaluation' if demo_result else name+' approved') if submission.status == 'accepted' else name+' evidence needs another look',
                      'message': submission.feedback, 'deepLink': f'/trips/{trip.id}',
                      'scheduledFor': utcnow().isoformat(), 'icon': '🏆', 'read': False, 'dismissed': False}
            db.add(PassportEvent(id=uid(), user_id=submission.user_id, trip_id=trip.id,
                type='notification', title=notice['title'], description=json.dumps(notice),
                is_demo=record.is_demo, source_key='evidence:'+submission.id))
            await db.commit()
