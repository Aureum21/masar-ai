"""Conservative boxing evidence rules. Recognition does not verify attendance."""
import hashlib
from io import BytesIO
import re
from PIL import Image, ImageOps

LABELS = [
    'a photo of an arcade boxing punching machine with a digital scoreboard',
    'a screenshot of a video game or a 3D animation of a boxing machine',
    'a drawing or illustration of a punching machine',
    'a photo of a boxing gym with a hanging punching bag',
    'a photo of a bowling alley',
    'a photo of an unrelated indoor room',
]
POLICY = 'boxing-vision-v1'


def fingerprints(data):
    with Image.open(BytesIO(data)) as source:
        image = ImageOps.exif_transpose(source).convert('RGB')
        digest = hashlib.sha256(str(image.size).encode()+image.tobytes()).hexdigest()
        pixels = list(image.convert('L').resize((9, 8)).tobytes())
        bits = sum((pixels[y*9+x] > pixels[y*9+x+1]) << (y*8+x) for y in range(8) for x in range(8))
        return digest, f'{bits:016x}'


def assess_strict(scores, lines, declared_score):
    """Return accept/reject/retry plus only facts measured from the evidence."""
    def result(decision, reason):
        return {'policy': POLICY, 'decision': decision, 'feedback': reason,
                'scene_score': round(float(scores[0]), 4), 'declared_score': declared_score}
    if len(scores) != len(LABELS) or not all(0 <= float(s) <= 1 for s in scores):
        raise ValueError('Invalid scene model result')
    if max(scores[1:3]) >= .35:
        return result('retry', 'This image may be a screenshot or illustration. Take a clear photograph of your own machine result at the venue.')
    if max(scores[3:]) >= .65 and max(scores[3:]) > scores[0]+.15:
        return result('reject', 'A boxing arcade score machine could not be identified. Photograph the machine and its final score together.')
    if scores[0] < .70 or scores[0]-max(scores[1:]) < .20:
        return result('retry', 'The machine is not clear enough to check. Include the punching machine and a legible scoreboard in one photo.')
    if declared_score is None or not 601 <= declared_score <= 9999:
        return result('reject', 'This challenge requires a final score above 600.')
    # Never select the largest number. Require the submitted result itself to be
    # legible on a standalone display and reject obvious high-score labels nearby.
    matched = [line for line in lines if float(line.get('score', 0)) >= .95
               and re.fullmatch(r'\s*0*'+str(declared_score)+r'\s*', line.get('text', ''))]
    if not matched:
        return result('retry', 'Your entered score could not be read clearly on the display. Upload a sharper machine photo and check the number you entered.')
    for match in matched:
        polygon = match.get('polygon') or []
        if len(polygon) < 4:
            continue
        left, right = min(p[0] for p in polygon), max(p[0] for p in polygon)
        top, bottom = min(p[1] for p in polygon), max(p[1] for p in polygon)
        height = max(1, bottom-top)
        ambiguous = False
        for line in lines:
            if not re.search(r'high\s*score|record|best|top\s*score', line.get('text', ''), re.I):
                continue
            points = line.get('polygon') or []
            if points and min(p[0] for p in points) <= right+height*2 and max(p[0] for p in points) >= left-height*2:
                if min(abs(p[1]-top) for p in points) < height*3:
                    ambiguous = True
        if not ambiguous:
            return result('accept', f'Machine and displayed score {declared_score} matched the challenge requirements. Points and your stamp have been awarded. This checks photo content, not attendance.')
    return result('retry', 'The number may be a high score or record. Photograph your own current result with its display labels visible.')


DEMO_POLICY = 'boxing-vision-demo-v1'


def assess(scores, lines, declared_score, evaluation_profile='strict'):
    if evaluation_profile == 'strict':
        return assess_strict(scores, lines, declared_score)
    if evaluation_profile != 'demo':
        raise ValueError('Unknown evaluation profile')
    if len(scores) != len(LABELS) or not all(0 <= float(value) <= 1 for value in scores):
        raise ValueError('Invalid scene model result')
    def result(decision, feedback):
        return {'policy': DEMO_POLICY, 'evaluation_profile': 'demo', 'decision': decision,
                'feedback': feedback, 'scene_score': round(float(scores[0]), 4), 'declared_score': declared_score}
    # Ignore screenshot/illustration scores; still require positive arcade-machine
    # evidence and a lead over the gym, bowling, and unrelated-room descriptions.
    if scores[0] < .45 or scores[0] - max(scores[3:]) < .05:
        return result('reject', 'Demo check: a boxing arcade score machine was not clearly identified. Choose an image showing the machine and scoreboard.')
    if declared_score is None or not 601 <= declared_score <= 9999:
        return result('reject', 'Demo check: enter a final score above 600 (maximum 9999).')
    for line in lines:
        if float(line.get('score', 0)) < .70:
            continue
        # Exact numeric tokens only: 689 must not match 1689 or 6890.
        tokens = re.findall(r'\d+', line.get('text', ''))
        if any(int(token) == declared_score for token in tokens):
            return result('accept', f'Light check passed: boxing machine and displayed score {declared_score} matched. XP and your stamp have been awarded. Screenshots are allowed in this test mode; attendance is not verified.')
    return result('retry', 'Demo check: the entered score did not match a readable number in the image. Check your number or choose a clearer scoreboard image.')
