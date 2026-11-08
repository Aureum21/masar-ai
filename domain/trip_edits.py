"""Validate manual edits independently of the AI; protect fixed commitments."""
from copy import deepcopy
from fastapi import HTTPException
from domain.itinerary_validation import minutes

_ACTIVITY_STATUS_KEYS = {'status', 'visit_status', 'completed', 'is_completed', 'user_notes', 'notes', 'review', 'rating'}


def _is_schedule_change(prev_activities, curr_activities):
    if len(prev_activities) != len(curr_activities):
        return True
    for p, c in zip(prev_activities, curr_activities):
        if not isinstance(p, dict) or not isinstance(c, dict):
            if p != c:
                return True
            continue
        p_core = {k: v for k, v in p.items() if k not in _ACTIVITY_STATUS_KEYS}
        c_core = {k: v for k, v in c.items() if k not in _ACTIVITY_STATUS_KEYS}
        if p_core != c_core:
            return True
    return False


def validate_edit(previous, proposed, protected_ids=None):
    from domain.accessibility import compatibility, venue_evidence
    support = previous.get('traveller_support', [])
    proposed['traveller_support'] = support
    proposed['support_confirmations'] = previous.get('support_confirmations', {})
    for day in proposed['days']:
        intervals = [row.get('rest_every_minutes') or 60 for row in support if row.get('rest_every_minutes') or 'frequent_rests' in row.get('needs', [])]
        rests = [row.get('rest_minutes') or 15 for row in support if row.get('rest_every_minutes') or 'frequent_rests' in row.get('needs', [])]
        since_rest = 0
        for activity in day['activities']:
            match = compatibility(venue_evidence(activity.get('place_id')), {'traveller_support': support})
            if match['conflicts']:
                raise HTTPException(409, 'This stop conflicts with essential traveller support.')
            walk = activity.get('walking_distance_m')
            duration = activity.get('duration_minutes')
            if any(row.get('max_walk_m') and type(walk) in {int, float} and walk > row['max_walk_m'] for row in support):
                raise HTTPException(409, 'The walking estimate exceeds a traveller’s saved limit.')
            if activity.get('kind') == 'rest':
                if rests and (type(duration) is not int or duration < max(rests)):
                    raise HTTPException(409, 'Keep the requested rest duration.')
                since_rest = 0
            elif type(duration) is int:
                travel = activity.get('travel_minutes_from_previous', 0)
                since_rest += duration + (travel if type(travel) is int and travel >= 0 else 0)
                if intervals and since_rest > min(intervals):
                    raise HTTPException(409, 'This change exceeds the saved rest interval. Add a rest or split the activity.')
        prev_day = next((d for d in previous.get('days', []) if d.get('id') == day.get('id')), None)
        prev_acts = prev_day.get('activities', []) if prev_day else []
        curr_acts = day.get('activities', [])
        if _is_schedule_change(prev_acts, curr_acts):
            if support:
                day['accessibility_notes'] = ['The schedule changed. Reconfirm venue access, walking distances, transfers and rest arrangements before travel.']
        else:
            if prev_day and 'accessibility_notes' in prev_day:
                day['accessibility_notes'] = deepcopy(prev_day.get('accessibility_notes', []))
    new = {a['id']: (d, a) for d in proposed['days'] for a in d['activities']}
    for day in previous['days']:
        for activity in day['activities']:
            match = new.get(activity['id'])
            protected = activity['id'] in (protected_ids or set()) or activity.get('booking_ref') or activity.get('booking_status') in {'confirmed', 'hold'} or activity.get('evidence_status') in {'pending', 'accepted'}
            if protected and (not match or match[0]['day_number'] != day['day_number'] or match[0].get('date') != day.get('date') or any(match[1].get(key) != activity.get(key) for key in ('title', 'place_id', 'product_id', 'time', 'start_time', 'end_time', 'event_date', 'booking_ref', 'challenge'))):
                raise HTTPException(409, 'A reservation or submitted challenge needs review before moving, removing or changing its activity.')
    for day in proposed['days']:
        end = None
        for activity in day['activities']:
            if activity.get('event_date') and activity['event_date'] != day.get('date'):
                raise HTTPException(409, 'A dated event must stay on its actual date.')
            start = minutes(activity.get('start_time', activity.get('time')))
            finish = minutes(activity.get('end_time'))
            if start is not None and finish is not None:
                if finish <= start or (end is not None and start < end):
                    raise HTTPException(409, 'Activity times overlap. Clear or revise their schedule before saving.')
                end = finish
