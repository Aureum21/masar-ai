"""Read-only heritage archive and bounded, optional visual recognition.

No Passport awards or evidence verification are performed here. Archive images
and narratives are illustrative content imported from Alazar, pending review.
"""
import asyncio
import base64
import binascii
from collections import OrderedDict, deque
from copy import deepcopy
from functools import lru_cache
from io import BytesIO
import json
import math
import os
from pathlib import Path
import time

from fastapi import HTTPException

MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_PIXELS = 16_000_000
_slots = asyncio.Semaphore(2)
_requests = OrderedDict()

@lru_cache(maxsize=1)
def catalogue():
    return json.loads((Path(__file__).resolve().parents[1] / 'data/heritage_archive.v1.json').read_text(encoding='utf-8'))

def archive(identity):
    item = catalogue().get(identity)
    if not item:
        raise HTTPException(404, 'This landmark is not in the Time Travel archive.')
    return {**deepcopy(item), 'source': 'illustrative_archive', 'is_recognized': False,
            'confidence': None, 'content_notice': 'Illustrative reconstructions and draft historical narratives; source review is pending.'}

def admit(user_id):
    now = time.monotonic()
    queue = _requests.pop(str(user_id), deque())
    while queue and queue[0] <= now - 60:
        queue.popleft()
    allowed = len(queue) < 5
    if allowed:
        queue.append(now)
    _requests[str(user_id)] = queue
    while len(_requests) > 2000:
        _requests.popitem(last=False)
    if not allowed:
        raise HTTPException(429, 'Please wait a minute before another scan.', headers={'Retry-After': '60'})

def prepare_image(value):
    # Decode and re-encode locally: remove EXIF and reject invalid/oversized input.
    from PIL import Image, ImageOps, UnidentifiedImageError
    if value.startswith('data:'):
        header, separator, value = value.partition(',')
        if not separator or header not in ('data:image/jpeg;base64', 'data:image/png;base64'):
            raise HTTPException(422, 'Choose a JPG or PNG image.')
    try:
        raw = base64.b64decode(value, validate=True)
        if not raw or len(raw) > MAX_IMAGE_BYTES:
            raise ValueError('size')
        with Image.open(BytesIO(raw)) as image:
            if image.format not in ('JPEG', 'PNG') or image.width * image.height > MAX_PIXELS:
                raise ValueError('format or dimensions')
            image = ImageOps.exif_transpose(image).convert('RGB')
            image.thumbnail((1280,1280))
            output = BytesIO()
            image.save(output, format='JPEG', quality=85)
        return 'data:image/jpeg;base64,' + base64.b64encode(output.getvalue()).decode('ascii')
    except (ValueError, binascii.Error, OSError, UnidentifiedImageError, Image.DecompressionBombError):
        raise HTTPException(422, 'Use a valid JPG or PNG, up to 5 MB and 16 megapixels.') from None

# Use the same CPU SigLIP 2 runtime as scene evidence.
# Extra negatives prevent every photo from being forced into a heritage identity.
NEGATIVES = (
    'a photograph of Burj Khalifa Dubai, a very tall tapering stepped skyscraper with a slender spire',
    'a photograph of Dubai Frame, a giant rectangular golden architectural frame',
    'a photograph of Museum of the Future Dubai, a silver torus covered in Arabic calligraphy',
    'a photograph of Sheikh Zayed Grand Mosque Abu Dhabi, white marble domes and minarets',
    'a photograph of a different fort, castle or traditional building',
    'a photograph of an unrelated indoor room, person, food or object',
    'a screenshot of a video game or 3D rendered heritage building',
    'a drawing or illustration of a heritage building',
)


LANDMARK_SCENES = {
    'al_hisn': 'Sharjah Fort Al Hisn, a beige stone fort with round corner towers and crenellated walls in Sharjah city',
    'qasr_al_hosn': 'a white stone fort with round watchtowers in the city of Abu Dhabi, Qasr Al Hosn',
    'al_fahidi': 'Al Fahidi Fort Dubai Museum, a sandy stone fort with a round tower and a traditional wooden boat outside',
    'dhayah_fort': 'Dhayah Fort, two small sandy mudbrick towers on a rocky hilltop above a palm oasis in Ras Al Khaimah',
    'fujairah_fort': 'Fujairah Fort, a sandy stone castle with round towers on a hill',
    'al_jahili': 'Al Jahili Fort in Al Ain, a sand coloured mudbrick fortress with a round stepped watchtower',
    'al_badiyah': 'Al Badiyah Mosque in Fujairah, a small earth coloured mosque with four low rounded domes',
    'jazirat_al_hamra': 'Jazirat Al Hamra, an abandoned village of ruined coral stone houses and sandy lanes in Ras Al Khaimah',
    'bait_al_naboodah': 'Bait Al Naboodah in Sharjah, a traditional coral stone courtyard house with a wooden balcony and carved pillars',
    'ajman_fort': 'Ajman Fort Museum, a sand coloured fort with two round towers framing a central entrance',
    'uaq_fort': 'Umm Al Quwain Fort Museum, a white walled fort with round watchtowers and a central gateway',
}


def recognition_labels():
    return tuple('a photograph of ' + LANDMARK_SCENES[key] for key in catalogue()) + NEGATIVES


def scene_observation(scores):
    labels = recognition_labels()
    if len(scores) != len(labels) or not all(
        isinstance(score, (int, float)) and not isinstance(score, bool)
        and math.isfinite(score) and 0 <= score <= 1 for score in scores
    ):
        raise ValueError('Invalid scene observations')
    identities = tuple(catalogue())
    winner = max(range(len(scores)), key=scores.__getitem__)
    score = scores[winner]
    runner_up = max(value for index, value in enumerate(scores) if index != winner)
    # These are scene similarities, not identity probabilities. Require a strong,
    # separated catalogue match; never offer selectable guesses after rejection.
    identity = identities[winner] if winner < len(identities) and score >= .90 and score - runner_up >= .30 else None
    return {'landmark_id': identity, 'score': score}



async def infer(image):
    from passport.vision_models import analyse_scene
    raw = base64.b64decode(image.partition(',')[2], validate=True)
    observed = await asyncio.to_thread(analyse_scene, BytesIO(raw), recognition_labels())
    return scene_observation(observed['scores'])

def resolve_observation(observation):
    identity = observation.get('landmark_id')
    score = observation.get('score')
    if isinstance(score, bool) or not isinstance(score, (int,float)) or not 0 <= score <= 1:
        raise ValueError('Invalid model response')
    if not isinstance(identity, str) or identity not in catalogue() or score < .90:
        return {'is_recognized': False, 'confidence': score,
                'message': 'Time Travel is unavailable for this photo. Take a clearer photo of one of the 11 supported heritage landmarks and try again.'}
    return {**archive(identity), 'source':'model_match', 'is_recognized':True, 'confidence':score}

async def recognize(value, user_id):
    if os.getenv('TIME_TRAVEL_VISION_ENABLED','false').lower() != 'true':
        raise HTTPException(503, 'Photo recognition is not enabled. You can still explore every archive below.')
    admit(user_id)
    image = await asyncio.to_thread(prepare_image,value)
    try:
        async with asyncio.timeout(120):
            async with _slots:
                observation = await infer(image)
        return resolve_observation(observation)
    except TimeoutError:
        raise HTTPException(504, 'Recognition took too long. Please retry or browse the archive.') from None
    except Exception:
        raise HTTPException(503, 'Local photo recognition is unavailable. The SigLIP evidence model must be installed and downloaded on this server.') from None
