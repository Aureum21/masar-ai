"""Versioned identity and eligibility metadata shared by seed, validation and UI."""
import json
from pathlib import Path
ATTRACTIONS=json.loads((Path(__file__).resolve().parents[1]/'data/attractions.v1.json').read_text(encoding='utf-8'))
from domain.accessibility import venue_evidence
for item in ATTRACTIONS:item['accessibility']=venue_evidence(item['id'])
BY_ID={item['id']:item for item in ATTRACTIONS}
ANIMATIONS={'heritage-detective':'heritage','boxing':'boxing','bowling':'bowling','sunset-seeker':'sunset'}
def supported_challenge(place_id,key):
    place=BY_ID.get(place_id,{})
    return key in place.get('challengeKeys',[]) or key in place.get('challengeCandidates',[])
