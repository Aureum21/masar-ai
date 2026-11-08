"""Equivalent learning tasks share the original challenge and award entitlement."""
CARDS={
    'boxing': {
        'title':'Observe and explain: force and movement',
        'card':'A scoring machine responds to a moving target and sensor readings. A displayed score is specific to that machine, not a medical or standardized measure of strength. Technique, timing and calibration can change the result. Safe participation requires staff guidance and space around the equipment.',
        'rubric':'Explain two factors that could change a score, compare what a score can and cannot tell you, and describe a safe way to include people with different support needs.'
    },
    'bowling': {
        'title':'Observe and explain: paths and patterns',
        'card':'In bowling, the ball path depends on direction, speed, spin and lane conditions. Pins transfer movement through collisions. A strike means all ten pins fall on the first roll of a frame. Ramps and other support can help some participants direct a ball; venue availability must be confirmed.',
        'rubric':'Explain two influences on a ball path, describe how a strike differs from a spare, and suggest an inclusive approach while identifying what must be confirmed with a venue.'
    },
    'sunset-seeker': {
        'title':'Observe and explain: changing light',
        'card':'As the sun approaches the horizon, light travels through more atmosphere. The colours and shadows in a scene can change, while clouds, haze and the direction of a viewpoint affect what is visible. A predicted sunset time is an estimate for planning, not a guarantee of weather or accessible access to a beach.',
        'rubric':'Explain two reasons sunset scenes differ, distinguish a predicted time from an observed condition, and propose an inclusive viewing plan with the access and weather checks it needs.'
    }
}

def equivalent_task(payload):
    card=CARDS.get(payload.get('challenge_key'))
    if not card and payload.get('landmark') in {'burj','frame','future','mosque'} and payload.get('required_photos')==3:
        card={'title':'Read and interpret: architectural details',
              'card':payload.get('title','Landmark')+' has these catalogue details: '+', '.join(payload.get('details',[]))+'. These descriptions can be studied without visiting or taking a photograph. Shape, repetition, materials and the relationship between open and enclosed space can guide an architectural interpretation.',
              'rubric':'Discuss at least two of the named details, compare their shapes or roles in the design, and give your own reasoned interpretation or question. Identify what is described by the card and what is your interpretation; do not claim a visit.'}
    return dict(card,policy='equivalent-observation-v1',verification='authorized_review',minimum_characters=120) if card else None

def validate_equivalent(payload,evidence_type,text):
    task=equivalent_task(payload)
    if not task:raise ValueError('This challenge has no registered equivalent task.')
    if evidence_type!='reflection' or len(text.strip())<task['minimum_characters']:
        raise ValueError('Submit at least 120 characters addressing every part of the equivalent task rubric.')
    return {'mode':'manual_equivalent','policy':task['policy']}
