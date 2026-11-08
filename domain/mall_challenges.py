"""Deterministic, catalogue-limited defaults for unassigned mall challenge days."""
from copy import deepcopy
from domain.attractions import supported_challenge, ANIMATIONS


def distribute_mall_challenges(days, enabled=True, locked=None):
    result = deepcopy(days)
    counts = {'boxing': 0, 'bowling': 0}
    locked = locked or {}
    for day in sorted(result, key=lambda d: d.get('day_number', 0)):
        activities = day.get('activities') or []
        for activity in activities:
            saved = locked.get(activity.get('id'))
            if saved:
                activity['challenge'] = deepcopy(saved)
        assigned = [a for a in activities if a.get('challenge')]
        if assigned:
            for activity in assigned:
                task = activity['challenge']
                key = task.get('key') if isinstance(task, dict) else task
                if key in counts:
                    counts[key] += 1
            continue
        if not enabled:
            continue
        candidates = [a for a in activities if any(supported_challenge(a.get('place_id'), key) for key in counts)]
        if not candidates:
            continue
        preferred = ['boxing', 'bowling'] if counts['boxing'] <= counts['bowling'] else ['bowling', 'boxing']
        choice = next(((activity, key) for key in preferred for activity in candidates if supported_challenge(activity.get('place_id'), key)), None)
        if not choice:
            continue
        activity, key = choice
        activity['challenge'] = {'key': key, 'place_id': activity['place_id'], 'animation_key': ANIMATIONS[key], 'optional': True, 'reward_status': 'not_awarded', 'assignment_source': 'mall_fallback_v1'}
        if key == 'boxing':
            activity['challenge']['availability'] = 'Confirm a working punching-score machine with venue staff before attempting this conditional challenge.'
        counts[key] += 1
    return result


async def locked_mall_challenges(db, trip_ids):
    """Protect accepted, pending and completed tasks, including pre-fallback legacy tasks."""
    from sqlalchemy import select
    from passport.models import Challenge
    rows = (await db.scalars(select(Challenge).where(Challenge.trip_id.in_(trip_ids), Challenge.state.in_(['accepted', 'pending', 'completed'])))).all() if trip_ids else []
    locked = {}
    for row in rows:
        payload = row.payload or {}
        key = payload.get('challenge_key') or payload.get('landmark')
        if key not in {'boxing', 'bowling'}:
            continue
        locked.setdefault(row.trip_id, {})[payload.get('source_activity_id', row.activity_id)] = {'key': key, 'place_id': payload.get('place_id'), 'animation_key': ANIMATIONS[key], 'optional': True, 'reward_status': 'not_awarded'}
    return locked
