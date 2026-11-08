"""Small trusted registry. No model runtimes or user-selected evaluator names."""
from dataclasses import dataclass
import os
from . import boxing_rules
from .scene_rules import assess_scene


@dataclass(frozen=True)
class Evaluator:
    key: str
    name: str
    labels: tuple
    photos: int = 1
    ocr: bool = False

    def policy(self, profile):
        if self.key == 'boxing':
            return boxing_rules.DEMO_POLICY if profile == 'demo' else boxing_rules.POLICY
        return self.key + '-vision-' + ('light-' if profile == 'demo' else '') + 'v1'

    def assess(self, observed, profile, score=None):
        if self.key == 'boxing':
            return boxing_rules.assess(observed['scores'], observed['lines'], score, evaluation_profile=profile)
        return assess_scene(self, observed['scores'], profile)


REGISTRY = {
    'boxing': Evaluator('boxing', 'Boxing arcade machine', tuple(boxing_rules.LABELS), ocr=True),
    'sunset-seeker': Evaluator('sunset-seeker', 'Beach or coastal sunset', (
        'a photograph of a beach or coastal waterfront at sunset with warm evening light',
        'a screenshot of a beach sunset animation or video game',
        'a drawing or illustration of a sunset beach',
        'a photograph of a beach in bright daylight',
        'a photograph of an inland desert or city sunset without a coast',
        'a photograph of an unrelated indoor room')),
    'burj-khalifa': Evaluator('burj-khalifa', 'Burj Khalifa', (
        'a photograph of Burj Khalifa Dubai, a very tall tapering stepped skyscraper with a slender spire',
        'a screenshot of a video game or 3D render of Burj Khalifa',
        'a drawing or illustration of Burj Khalifa',
        'a photograph of Dubai Frame, a large rectangular golden frame',
        'a photograph of another skyscraper or a generic city skyline without Burj Khalifa',
        'a photograph of an unrelated indoor room'), photos=3),
    'dubai-frame': Evaluator('dubai-frame', 'Dubai Frame', (
        'a photograph of Dubai Frame, a giant rectangular golden architectural frame in Zabeel Park',
        'a screenshot of a video game or 3D render of Dubai Frame',
        'a drawing or illustration of Dubai Frame',
        'a photograph of Burj Khalifa, a tapering skyscraper with a spire',
        'a photograph of a small picture frame, another building or an unrelated arch',
        'a photograph of an unrelated indoor room'), photos=3),
}


def resolve(payload):
    if payload.get('challenge_key') in {'boxing', 'sunset-seeker'}:
        return REGISTRY[payload['challenge_key']]
    place = payload.get('place_id')
    if place in {'burj-khalifa', 'dubai-frame'} and payload.get('required_photos') == 3 and payload.get('quiz'):
        return REGISTRY[place]
    return None


def mode_for(payload, is_demo=False):
    evaluator = resolve(payload)
    if is_demo or not evaluator:
        return 'manual'
    flag = 'PASSPORT_AUTO_BOXING' if evaluator.key == 'boxing' else 'PASSPORT_AUTO_SCENES'
    if os.getenv(flag, 'false').lower() != 'true':
        return 'manual'
    return 'automatic_boxing' if evaluator.key == 'boxing' else 'automatic_scene'


def is_automatic(verification):
    return (verification or {}).get('mode') in {'automatic_boxing', 'automatic_scene'}


def for_submission(verification):
    info = verification or {}
    key = info.get('evaluator_key') or ('boxing' if info.get('mode') == 'automatic_boxing' else None)
    return REGISTRY.get(key)
