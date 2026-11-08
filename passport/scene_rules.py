"""Pure provisional scene rules: these scores do not establish attendance."""
import math
from datetime import datetime
from zoneinfo import ZoneInfo


def capture_facts(captured_at, capture_location, window=None):
    """Validate user declarations, never represent them as EXIF/GPS verification."""
    if not isinstance(capture_location, str) or not 3 <= len(capture_location.strip()) <= 200:
        raise ValueError('Enter the beach/viewpoint location (3–200 characters).')
    try:
        instant = datetime.fromisoformat(captured_at.replace('Z', '+00:00'))
        if instant.tzinfo is None:
            raise ValueError()
        local = instant.astimezone(ZoneInfo('Asia/Dubai'))
    except (ValueError, AttributeError, TypeError, OverflowError):
        raise ValueError('Enter the capture date and time with its timezone.')
    if window and all(window.get(key) for key in ('date', 'start', 'end')):
        try:
            start = datetime.fromisoformat(f"{window['date']}T{window['start']}+04:00")
            end = datetime.fromisoformat(f"{window['date']}T{window['end']}+04:00")
        except (ValueError, TypeError):
            raise ValueError('The suggested sunset window is invalid. Refresh this challenge.')
        if not start <= local <= end:
            raise ValueError('The declared capture time must fall within this challenge’s suggested sunset window.')
    return {'captured_at': instant.isoformat(), 'capture_location': capture_location.strip(), 'capture_source': 'user_declared'}


def assess_scene(evaluator, scores, evaluation_profile='strict'):
    if evaluation_profile not in {'strict', 'demo'}:
        raise ValueError('Unknown evaluation profile')
    if len(scores) != len(evaluator.labels) or not all(math.isfinite(float(x)) and 0 <= float(x) <= 1 for x in scores):
        raise ValueError('Invalid scene observations')
    target, screenshot, illustration = map(float, scores[:3])
    other = max(map(float, scores[3:]))
    base = {'policy': evaluator.policy(evaluation_profile), 'scene_score': round(target, 4)}
    def result(decision, feedback):
        return dict(base, decision=decision, feedback=feedback)
    if other >= .65 and other > target + .15:
        return result('reject', f'{evaluator.name} was not identified. Submit a photo of the correct subject.')
    if evaluation_profile == 'strict' and max(screenshot, illustration) >= .35:
        return result('retry', 'This may be a screenshot or illustration. Strict evaluation needs a clear original photograph.')
    threshold, margin = (.45, .05) if evaluation_profile == 'demo' else (.70, .20)
    competitor = other if evaluation_profile == 'demo' else max(other, screenshot, illustration)
    if target < threshold or target - competitor < margin:
        return result('retry', f'{evaluator.name} is not clear enough to identify. Include its recognizable features in a sharper photo.')
    return result('accept', f'{evaluator.name} identified in the submitted photo. Photo content only; attendance, GPS and capture time are not verified.')
