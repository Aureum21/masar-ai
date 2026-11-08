"""Versioned editorial catalogue. No provider or language model grants rewards.

Sources below are self-contained learning cards, not claims of attendance.
Photo templates award only after authenticated human review (demo: simulation).
"""
from copy import deepcopy
import re

CATEGORIES = {"heritage", "discovery", "creative", "adventure", "nature", "connection"}

MARITIME = {
    "key": "maritime-reading-v1", "title": "Read the sea, find a story",
    "description": "Explore the relationship between sea, craft, and community.",
    "instructions": "Read the learning card. Write at least three complete sentences, including two of its key ideas and your own observation or question. Choose a detail to carry into the next challenge.",
    "category": "heritage", "xp": 40,
    "stamp": {"title": "Maritime storyteller", "category": "heritage", "design": "dhow"},
    "evidence_methods": ["reflection"],
    "source_text": "Learning card: Wooden boats called dhows connect maritime craft with coastal life. Pearl diving depended on divers and boat crews working together. Fishing and trade linked livelihoods to the sea. These ideas invite us to ask how tools, materials, and teamwork preserve a community's memories. This card is a learning exercise and does not verify a museum visit.",
    "reflection_prompt": "In three or more sentences, connect two ideas from the card with something you noticed, learned, or wonder about. This earns a learning stamp, not proof of attendance.",
    "concepts": [["dhow", "wooden boat", "boatbuilding"], ["pearl", "diver", "diving"], ["fish", "trade", "trading"], ["crew", "teamwork", "community", "coastal"]],
    "choice_options": [{"id": "curves", "label": "Follow the curve of a dhow"}, {"id": "patterns", "label": "Follow repeating craft patterns"}],
}

ARCHITECTURE = {
    "key": "architecture-photo-v1", "title": "Notice an architectural detail",
    "description": "Slow down and photograph a detail that tells a story about a place.",
    "instructions": "From a public, permitted area, photograph a detail of the building or streetscape. Add a short caption about its shape or material. Respect photography rules and avoid identifiable bystanders.",
    "category": "discovery", "xp": 60,
    "stamp": {"title": "Architecture observer", "category": "discovery", "design": "arch"},
    "evidence_methods": ["photo"], "source_text": "Observation card: Look for the rhythm of openings, the shape of an arch, or a contrast between materials. Describe only what you can observe. A reviewer will assess the submitted photo and caption.",
    "reflection_prompt": "What shape or material caught your attention?", "concepts": [], "choice_options": [],
}

CREATIVE = {
    "key": "motif-photo-v1", "title": "Make a motif of your own",
    "description": "Turn a detail from the journey into a small original design.",
    "instructions": "Draw or assemble your own motif inspired by an observed curve or pattern. Upload a photograph of the result and explain the connection in a caption. Use materials you already have; no purchase is required.",
    "category": "creative", "xp": 75,
    "stamp": {"title": "Motif maker", "category": "creative", "design": "motif"},
    "evidence_methods": ["photo"], "source_text": "Creative card: A motif is a visual idea you can repeat or adapt. Try simplifying an observed shape, then change its size or rhythm to make an original composition.",
    "reflection_prompt": "How did you transform the detail into your own motif?", "concepts": [], "choice_options": [],
}

OBSERVATION = {
    "key": "place-reflection-v1", "title": "Pause for a closer look",
    "description": "Practice thoughtful observation through a short learning reflection.",
    "instructions": "Read the observation card, then write at least three sentences using two key ideas and a personal observation or question. Reading can be completed from anywhere and does not establish attendance.",
    "category": "discovery", "xp": 25,
    "stamp": {"title": "Curious observer", "category": "discovery", "design": "compass"},
    "evidence_methods": ["reflection"],
    "source_text": "Observation card: Notice how light changes the appearance of a place. Look for patterns in shapes or sounds. Materials reveal textures, while movement shows how people or nature use a space. A thoughtful description separates direct observation from a question or an inference.",
    "reflection_prompt": "Use two ideas from the card in three or more sentences. Include what you noticed, learned, imagined, or wonder about.",
    "concepts": [["light", "shadow"], ["pattern", "shape", "sound"], ["material", "texture"], ["movement", "nature", "space"]],
    "choice_options": [],
}

NATURE = deepcopy(ARCHITECTURE) | {
    "key": "nature-observation-v1", "title": "Find a living detail", "category": "nature", "xp": 45,
    "description": "Notice a small detail of a landscape without disturbing it.",
    "instructions": "From an established public path, photograph a plant, texture, or landscape detail. Leave everything where you found it and describe the detail in a caption. A reviewer checks your image; no wildlife interaction is required.",
    "stamp": {"title": "Nature noticer", "category": "nature", "design": "leaf"},
    "source_text": "Observation card: Look at shape, texture and changes in light. Describe what is visible rather than guessing a species or approaching an animal.",
    "reflection_prompt": "What small natural detail changed how you looked at this place?",
}
RIDE = deepcopy(ARCHITECTURE) | {
    "key": "ride-memory-v1", "title": "Keep your high-speed memory", "category": "adventure", "xp": 60,
    "description": "Turn the thrill of a ride into a memory you can keep.",
    "instructions": "After the ride, upload your official ride photo or a photograph at the designated exit/photo station. Add a caption about the experience. Never use a phone while riding. Buying a ride photo is optional; the exit-station alternative earns the same stamp.",
    "stamp": {"title": "Velocity seeker", "category": "adventure", "design": "mountain"},
    "source_text": "Experience card: A memorable ride can be described through anticipation, movement and your reaction afterward. Use the attraction's permitted photo areas.",
    "reflection_prompt": "What moment from the ride will you remember?",
}
LIGHT = deepcopy(ARCHITECTURE) | {
    "key": "light-observation-v1", "title": "Catch the changing light", "category": "discovery", "xp": 45,
    "description": "Discover how the same place changes with the light.",
    "instructions": "Photograph a patch of light or shadow from a permitted area. Explain how it changes the colors or shapes around you. Stay within public paths; this task never requires reaching a particular lookout.",
    "stamp": {"title": "Light collector", "category": "discovery", "design": "sun"},
    "reflection_prompt": "How did the light change your view?",
}
HOST = deepcopy(ARCHITECTURE) | {
    "key": "host-story-v1", "title": "Learn a host's favorite detail", "category": "connection", "xp": 50,
    "description": "Give a small conversation a place in your travel story.",
    "instructions": "At an opted-in hosted experience, ask the host about a detail they enjoy sharing. Write what you learned and include the host's review reference. Participation is optional for both people; an authorized operator must confirm this encounter before a stamp is awarded.",
    "stamp": {"title": "Shared story", "category": "connection", "design": "coffee"},
    "evidence_methods": ["partner"], "source_text": "Connection card: Ask permission, listen to the host's explanation, and preserve the idea in your own words. Do not include another person's contact details.",
    "reflection_prompt": "What did you learn, and what review reference did your participating host give you?",
}

BADGES = [
    {"id": "first-memory", "title": "First memory", "description": "Earn your first approved stamp.", "target": 1, "category": "discovery"},
    {"id": "three-perspectives", "title": "Three perspectives", "description": "Collect stamps in three different categories.", "target": 3, "category": "creative"},
    {"id": "five-memories", "title": "Five memories", "description": "Earn five approved stamps.", "target": 5, "category": "heritage"},
]

GAMES = [
    {
        "id":"sikka-run", "title":"Al Fahidi Secret Sikka Run", "kind":"runner",
        "category":"heritage", "badge":"Sikka Explorer", "xp":0,
        "description":"A practice arcade through a stylised Al Fahidi district, with optional parcel delivery.",
        "landmarks":["Al Fahidi Historical District"], "modes":["practice"],
        "destination":{"name":"Al Fahidi", "emirate":"dubai", "slug":"old-dubai-heritage"}
    },
    {
        "id": "landmark-puzzle",
        "title": "Piece by Place",
        "kind": "puzzle",
        "category": "discovery",
        "badge": "Heritage Jigsaw",
        "description": "Assemble 5 iconic UAE landmarks piece by piece. Uncover hidden architectural trivia and facts.",
        "xp": 35,
        "landmarks": ["Burj Khalifa", "Sheikh Zayed Grand Mosque", "Burj Al Arab", "Al Noor Mosque", "Jebel Jais"],
        "modes": ["easy", "medium", "hard"],
        "destination": {"name": "Burj Khalifa", "emirate": "dubai", "slug": "burj-khalifa-sky"}
    },
    {
        "id": "tourist-arcade",
        "title": "The Lost Compass",
        "kind": "arcade",
        "category": "heritage",
        "badge": "Al Fahidi Arcade",
        "description": "Navigate the wind-tower lanes of Old Dubai, collect lost heritage fragments, and find secret checkpoints.",
        "xp": 50,
        "landmarks": ["Al Fahidi Historical District", "Dubai Creek", "Al Seef"],
        "modes": ["classic", "relaxed"],
        "destination": {"name": "Al Seef", "emirate": "dubai", "slug": "old-dubai-heritage"}
    },
    {
        "id": "ball-roll",
        "title": "Golden Roll",
        "kind": "physics",
        "category": "adventure",
        "badge": "Physics and Lore",
        "description": "Roll through historic Dubai alleyways, find glowing story tokens, and answer cultural quizzes.",
        "xp": 40,
        "landmarks": ["Al Fahidi Quarter", "Al Bastakiya", "Heritage Village"],
        "modes": ["normal", "relaxed"],
        "destination": {"name": "Al Fahidi", "emirate": "dubai", "slug": "old-dubai-heritage"}
    }
]


OFFERS = [
    {
        "id": "demo-postcard-v1",
        "title": "Demo postcard studio",
        "partner": "Masar fictional pilot partner",
        "description": "Preview a reward wallet with a simulated postcard experience.",
        "benefit": "Demo postcard experience — no monetary value",
        "required_stamps": 1,
        "expires_at": None,
        "terms": "Simulation only. No enrolled merchant, real discount, purchase, or entitlement. One claim per account; expires 30 days after issue. Stamps remain in your passport.",
        "is_demo": True,
        "category": "creative",
        "code_prefix": "DEMO-POST-"
    },
    {
        "id": "demo-creative-route-v1",
        "title": "Demo creative route bundle",
        "partner": "Masar fictional pilot partner",
        "description": "Complete the three-part pilot to preview a second simulated reward.",
        "benefit": "Demo creative bundle — no monetary value",
        "required_stamps": 3,
        "expires_at": None,
        "terms": "Simulation only. Requires three approved demo stamps. No real attendance or partner benefit is asserted. One claim per account; expires 30 days after issue.",
        "is_demo": True,
        "category": "discovery",
        "code_prefix": "DEMO-ROUTE-"
    },
    {
        "id": "al-fahidi-gahwa-v1",
        "title": "Traditional Gahwa & Dates at Al Fahidi",
        "partner": "Bait Al Khanyar Cultural Lounge",
        "description": "Savor authentic Emirati hospitality with wood-roasted cardamom gahwa and heritage dates in the historic wind-tower quarter.",
        "benefit": "Complimentary Gahwa & Heritage Date Pairing",
        "required_stamps": 1,
        "expires_at": None,
        "terms": "Pilot partner reward voucher. Valid for 30 days from issue date. Show single-use voucher code to your host upon seating. One redemption per explorer.",
        "is_demo": True,
        "category": "heritage",
        "location": "Al Fahidi, Dubai",
        "code_prefix": "MASAR-GAHWA-"
    },
    {
        "id": "burj-sky-treat-v1",
        "title": "At.mosphere Sunset Skyline Beverage",
        "partner": "At.mosphere Lounge at Burj Khalifa",
        "description": "Enjoy high-altitude panoramic views across Dubai with a signature artisanal botanical mocktail on Level 122.",
        "benefit": "Complimentary Signature Skyline Mocktail",
        "required_stamps": 2,
        "expires_at": None,
        "terms": "Pilot partner perk. Valid Sunday through Thursday with advance lounge booking. Single-use voucher expires 30 days after issue.",
        "is_demo": True,
        "category": "discovery",
        "location": "Downtown Dubai",
        "code_prefix": "MASAR-SKY-"
    },
    {
        "id": "creek-abra-crossing-v1",
        "title": "Private Creek Abra Sunset Crossing",
        "partner": "Deira Maritime Heritage Association",
        "description": "Glide across Dubai Creek between Bur Dubai and Deira spice souks aboard a traditional motorized wooden abra during golden hour.",
        "benefit": "Private 30-Minute Sunset Abra Crossing",
        "required_stamps": 3,
        "expires_at": None,
        "terms": "Pilot maritime partner voucher. Valid for up to 2 persons at Bur Dubai Abra Station. Subject to marine weather conditions.",
        "is_demo": True,
        "category": "connection",
        "location": "Dubai Creek",
        "code_prefix": "MASAR-ABRA-"
    },
    {
        "id": "louvre-calligraphy-v1",
        "title": "Arabic Calligraphy Masterclass Pass",
        "partner": "Saadiyat Cultural District Studios",
        "description": "Master traditional reed pen techniques and geometric gold leaf illumination under the guidance of master calligraphers.",
        "benefit": "50% Off Master Calligraphy Workshop Admission",
        "required_stamps": 4,
        "expires_at": None,
        "terms": "Pilot cultural workshop partner. Reservation recommended 48 hours prior. Valid for 45 days from issue date.",
        "is_demo": True,
        "category": "creative",
        "location": "Saadiyat, Abu Dhabi",
        "code_prefix": "MASAR-CALIG-"
    },
    {
        "id": "mleiha-stargazing-v1",
        "title": "Bedouin Fireside Astronomy & Herbal Tea",
        "partner": "Mleiha Archaeological Centre",
        "description": "Gather around the desert hearth for a guided celestial navigation session under pristine desert skies with fresh mint tea.",
        "benefit": "Complimentary Stargazing Session & Fireside Tea",
        "required_stamps": 5,
        "expires_at": None,
        "terms": "Pilot eco-adventure partner voucher. Valid for 60 days. Advance reservation required for night sky sessions.",
        "is_demo": True,
        "category": "adventure",
        "location": "Mleiha, Sharjah",
        "code_prefix": "MASAR-STARS-"
    }
]


LANDMARKS = {
    "dubai-frame": {"landmark": "frame", "name": "Dubai Frame", "details": ["The complete golden frame", "The two towers and sky bridge", "The patterned facade"], "question": "Which shape defines Dubai Frame?", "answers": ["A rectangle", "A circle", "A pyramid"], "correct": 0},
    "burj-khalifa": {"landmark": "burj", "name": "Burj Khalifa", "details": ["Three-wing footprint", "Spiralling setbacks", "Slender spire"], "question": "Which shape underlies the tower's floor plan?", "answers": ["A Y shape", "A square", "A circle"], "correct": 0},
    "museum-of-the-future": {"landmark": "future", "name": "Museum of the Future", "details": ["Calligraphic facade", "The open centre", "The green mound"], "question": "What does the building's open centre represent?", "answers": ["The ocean", "The unknown future", "A desert oasis"], "correct": 1},
    "sheikh-zayed-grand-mosque": {"landmark": "mosque", "name": "Sheikh Zayed Grand Mosque", "details": ["White domes", "Palm-inspired columns", "Reflective pools"], "question": "What inspired the exterior column design?", "answers": ["Sailing boats", "Desert dunes", "Date palms"], "correct": 2},
}

def heritage_for(activity):
    from domain.places import resolve_place
    value = activity if isinstance(activity, dict) else vars(activity)
    raw_id = value.get('place_id') or value.get('product_id')
    found = resolve_place(raw_id) if raw_id else None
    place_id = found['place_id'] if found else None
    if not raw_id:
        title = value.get('title', '').casefold()
        place_id = next((key for key, item in LANDMARKS.items() if re.search(r'\b'+re.escape(item['name'].casefold())+r'\b', title)), None)
    item = LANDMARKS.get(place_id)
    if not item:
        return None
    return deepcopy(ARCHITECTURE) | {
        'key': 'heritage:'+item['landmark']+':v1', 'title': item['name']+' · Heritage Detective',
        'place_id': place_id, 'landmark': item['landmark'], 'details': item['details'],
        'animation_available': place_id != 'dubai-frame',
        'instructions': 'Capture three photographs from permitted public areas: '+', '.join(item['details'])+'. Answer the quiz and describe your observations. A human reviewer checks all three photographs before any award.',
        'required_photos': 3, 'quiz': {'question': item['question'], 'answers': item['answers'], 'correct': item['correct']},
        'stamp': {'title': item['name']+' detective', 'category': 'heritage', 'design': 'arch'}, 'category': 'heritage',
    }

def template_for(activity, is_demo=False, demo_index=0):
    if is_demo:
        return deepcopy([MARITIME, ARCHITECTURE, CREATIVE][demo_index])
    heritage=heritage_for(activity)
    if heritage:return heritage
    from domain.attractions import BY_ID,supported_challenge,ANIMATIONS
    value=activity if isinstance(activity,dict) else vars(activity)
    challenge=value.get('challenge') or {}
    key=challenge.get('key') if isinstance(challenge,dict) else None
    pid=value.get('place_id')
    # Older planner output can omit optional task metadata. Only infer a listed bowling facility;
    # never infer a conditional boxing machine or a timed sunset task from a generic mall/beach.
    if not challenge and 'bowling' in BY_ID.get(pid,{}).get('challengeKeys',[]):key='bowling'
    if not supported_challenge(pid,key):return None
    place=BY_ID[pid]
    titles={'boxing':'Beat 600 · Boxing Challenge','bowling':'Make a strike · Bowling Challenge','sunset-seeker':'Sunset Seeker'}
    instructions={
        'boxing':'First ask venue staff to confirm a working punching-score machine. If available, score above 600, then photograph the score and describe the venue. This is a conditional demonstration until machine availability is confirmed.',
        'bowling':'At the listed mall bowling venue, score a strike or the agreed target and photograph the scoreboard. Include the venue and score in your caption.',
        'sunset-seeker':'From a permitted beach viewpoint, capture the changing light during the suggested sunset window. Include capture date, time and location in your caption. A reviewer checks the evidence; no automatic GPS or attendance verification is claimed.'}
    if key not in titles:return None
    return deepcopy(ARCHITECTURE)|{'key':key+':'+pid+':v1','challenge_key':key,'animation_key':ANIMATIONS[key],'landmark':key,'title':titles[key],'place_id':pid,'required_photos':1,'details':['Sunset scene with capture time and location' if key=='sunset-seeker' else 'Your scoreboard and venue'],'instructions':instructions[key],'quiz':None,'category':'nature' if key=='sunset-seeker' else 'adventure','stamp':{'title':titles[key],'category':'nature' if key=='sunset-seeker' else 'adventure','design':'sun' if key=='sunset-seeker' else 'compass'},'sunset_window':challenge.get('sunset_window'),'source_url':place['sourceUrl']}


# Catalogue offers are fictional demos until a partner is enrolled. Never imply a contract.
for offer in OFFERS:
    offer.update(is_demo=True, title='Demo · '+offer['title'].removeprefix('Demo · '),
                 partner='Fictional partner preview', code_prefix='DEMO-',
                 terms='Simulation only; no enrolled merchant, monetary value or real discount. One claim per account, expires 30 days after issue. Demo stamps unlock this preview; points are not spent.')
for game in GAMES:
    game.update(xp=0, reward_mode='practice-only')

def main_challenge_activity(activities):
    """Respect the planner's explicit daily quest before legacy landmark suggestions."""
    explicit=next((a for a in activities if a.get('challenge') and template_for(a)),None)
    return explicit or next((a for a in activities if template_for(a)),None)
