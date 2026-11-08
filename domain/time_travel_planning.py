"""Route-aware Time Travel recommendations and the itinerary save requirement."""
import hashlib
import json
import math
import random

from domain.attractions import BY_ID
from domain.accessibility import compatibility, venue_evidence
from domain.places import resolve_place

# Archive identities differ from the canonical Explore / planning identities.
ARCHIVE_BY_PLACE = {
    'sharjah-fort': 'al_hisn',
    'qasr-al-hosn': 'qasr_al_hosn',
    'al-fahidi': 'al_fahidi',
    'dhayah-fort': 'dhayah_fort',
    'fujairah-fort': 'fujairah_fort',
    'al-jahili-fort': 'al_jahili',
    'al-bidya-mosque': 'al_badiyah',
    'al-jazirah-al-hamra': 'jazirat_al_hamra',
    'bait-al-naboodah': 'bait_al_naboodah',
    'ajman-museum': 'ajman_fort',
    'uaq-fort-museum': 'uaq_fort',
}


def canonical(identity):
    if not isinstance(identity, str):
        return None
    resolved = resolve_place(identity)
    return resolved['place_id'] if resolved else identity


def distance(first, second):
    lat1, lat2 = math.radians(first['lat']), math.radians(second['lat'])
    delta_lat = lat2 - lat1
    delta_lng = math.radians(second['lng'] - first['lng'])
    value = math.sin(delta_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lng / 2) ** 2
    return 6371 * 2 * math.asin(min(1, math.sqrt(value)))


def recommendation(draft=None, *, seed=None):
    """Keep one random pick stable across retries of the same planning run.

    Reuse a shortlisted heritage stop first. Otherwise draw from nearby sites;
    unknown accessibility remains a confirmation, never a positive guarantee.
    """
    draft = draft or {}
    brief = draft.get('brief', {})
    eligible = [place for identity, place in BY_ID.items() if identity in ARCHIVE_BY_PLACE
                and not compatibility(venue_evidence(identity), brief)['conflicts']]
    selected = {canonical(item['id']) for item in draft.get('selections', [])}
    pool = [place for place in eligible if place['id'] in selected]
    if not pool:
        anchors = [BY_ID[identity] for identity in selected if identity in BY_ID]
        if anchors and eligible:
            distances = {place['id']: min(distance(place, anchor) for anchor in anchors) for place in eligible}
            nearest = min(distances.values())
            # Do not send an Abu Dhabi city trip to Al Ain just to vary the pick.
            pool = [place for place in eligible if distances[place['id']] <= max(50, nearest + 20)]
        else:
            pool = eligible
    if not pool:
        return None
    # A run UUID provides variation between plans; the brief is a stable fallback.
    key = str(seed or draft.get('id') or json.dumps(draft, sort_keys=True))
    rng = random.Random(hashlib.sha256(key.encode()).digest())
    place = rng.choice(sorted(pool, key=lambda item: item['id']))
    return {'place_id': place['id'], 'title': place['title'],
            'landmark_id': ARCHIVE_BY_PLACE[place['id']], 'emirate': place['emirate']}


def planner_instructions(draft=None, *, seed=None):
    pick = recommendation(draft, seed=seed)
    return ('\nTIME TRAVEL VISIT REQUIREMENT: Every new trip must contain at least one actual visit to a '
            'supported heritage site, even when optional challenges are disabled. A rest, drive-by, heading '
            'or mention in notes does not count. Prefer this server-randomized route-aware recommendation: '
            + json.dumps(pick) + '. Include this chosen site in the scheduled activities; keep the same '
            'choice during repairs. Supported '
            'place IDs: ' + ', '.join(ARCHIVE_BY_PLACE) + '. Preserve all user must-visits, flight/hotel '
            'choices and accessibility requirements. Plan realistic travel and visit time; do not append '
            'an unscheduled extra stop after generating the itinerary. Use place_id; only use selection_id '
            'when the user actually shortlisted it. Confirm current access and hours. Time Travel archive '
            'browsing itself is not a challenge, ticket, verified visit or reward. At Al Fahidi, plan the '
            'fort exterior / heritage area and confirm museum access; do not promise interior admission.')


def require_visit(itinerary, draft=None, *, seed=None):
    """Reject missing visits before persistence, so the planner can repair timing."""
    from domain.itinerary_validation import PlanConflict, issue
    brief = (draft or {}).get('brief', {})
    visits = []
    for day in itinerary.get('days', []):
        for activity in day.get('activities', []):
            # Discard untrusted metadata supplied by the model.
            activity.pop('time_travel', None)
            identity = canonical(activity.get('place_id'))
            if identity not in ARCHIVE_BY_PLACE or activity.get('kind') in {'rest', 'travel', 'transport', 'transfer'}:
                continue
            if compatibility(venue_evidence(identity), brief)['conflicts']:
                continue
            activity['time_travel'] = {'landmark_id': ARCHIVE_BY_PLACE[identity], 'place_id': identity}
            visits.append(identity)
    chosen = recommendation(draft, seed=seed) if seed is not None else None
    if not visits or (chosen and chosen['place_id'] not in visits):
        raise PlanConflict([issue('missing_time_travel_visit',
            'Include at least one scheduled visit to a supported Time Travel heritage site. '
            + (f"This run selected {chosen['title']} (place_id={chosen['place_id']}). " if chosen else '') +
            'Preserve must-visits and accessibility needs, and allow travel time. Supported place IDs: '
            + ', '.join(ARCHIVE_BY_PLACE), 'days')])
    itinerary.setdefault('planning_review', {})['time_travel_visits'] = list(dict.fromkeys(visits))
    return itinerary
