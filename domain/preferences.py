"""Canonical preference keys with backwards-compatible UI aliases."""
from copy import deepcopy


def normalise_preferences(value, updates=None):
    result = deepcopy(value or {})
    incoming = deepcopy(updates or {})
    for canonical, alias in [("interests", "vibes"), ("dietary_restrictions", "dietary")]:
        if canonical in incoming or alias in incoming:
            selected = incoming.get(canonical, incoming.get(alias))
        else:
            selected = result.get(canonical, result.get(alias))
        if selected is not None:
            if not isinstance(selected, list) or not all(isinstance(x, str) for x in selected):
                raise ValueError(f"{canonical} must be a list of strings")
            incoming[canonical] = incoming[alias] = list(dict.fromkeys(selected))
    if 'personal_support' in incoming and incoming['personal_support'] is not None:
        from domain.planning import TravellerSupport
        incoming['personal_support']=TravellerSupport.model_validate({**incoming['personal_support'],'traveller':1}).model_dump(mode='json')
    result.update(incoming)
    return result
