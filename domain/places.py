"""Initial, explicitly supported identities. No venue facilities are assumed."""
PLACES = [
    {"id": "burj-khalifa", "name": "Burj Khalifa", "aliases": ["burj"]},
    {"id": "museum-of-the-future", "name": "Museum of the Future", "aliases": ["future"]},
    {"id": "sheikh-zayed-grand-mosque", "name": "Sheikh Zayed Grand Mosque", "aliases": ["mosque", "grand-mosque", "sheikh-zayed-mosque"]},
    {"id": "al-fahidi", "name": "Al Fahidi Historical Neighbourhood", "aliases": []},
    {"id": "burj-al-arab", "name": "Burj Al Arab", "aliases": []},
    {"id": "al-noor-mosque", "name": "Al Noor Mosque", "aliases": ["al-noor"]},
    {"id": "jebel-jais", "name": "Jebel Jais", "aliases": []},
]


def resolve_place(identity):
    if identity == "burj-khalifa-sky":
        return {"place_id": "burj-khalifa", "product_id": identity}
    from domain.attractions import BY_ID
    if identity in BY_ID:return {'place_id':identity,'product_id':None}
    for place in PLACES:
        if identity in [place["id"], *place["aliases"]]:
            return {"place_id": place["id"], "product_id": None}
    return None


def challenge_is_eligible(challenge, place_id=None, venue=None):
    if challenge == "heritage-detective":
        found = resolve_place(place_id)
        return bool(found and found["place_id"] in {"burj-khalifa", "museum-of-the-future", "sheikh-zayed-grand-mosque"})
    venue = venue or {}
    if not venue.get("verified"):
        return False
    if challenge in {"boxing", "bowling"}:
        facility = "punching-machine" if challenge == "boxing" else "bowling"
        return venue.get("kind") == "mall" and facility in venue.get("facilities", [])
    if challenge == "sunset-seeker":
        return venue.get("kind") == "beach" and venue.get("accessible") is True and venue.get("sunset_window_valid") is True
    return False
