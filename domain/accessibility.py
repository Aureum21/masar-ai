"""Bounded evidence and deterministic support matching. Unknown is never a yes."""
from copy import deepcopy
from datetime import datetime, timezone
import json, math
from pathlib import Path
from urllib.parse import urlsplit, quote, parse_qsl

FACT_KEYS={'step_free_entrance','accessible_toilets','lift','surface','walking_distance_m','quiet_times','assistance_contact','wheelchair_room','low_sensory','captions','screen_reader','rest_seating','entrance_door_width','shower_chair'}
NEED_FACT={'step_free':'step_free_entrance','wheelchair_room':'wheelchair_room','short_walks':'walking_distance_m','frequent_rests':'rest_seating','low_sensory':'low_sensory','captions':'captions','screen_reader':'screen_reader'}
VENUE_FACTS=json.loads((Path(__file__).resolve().parents[1]/'data/accessibility.v1.json').read_text(encoding='utf-8'))

def clean_url(value):
    if not isinstance(value,str):return None
    try:
        url=urlsplit(value)
        if url.scheme in {'https','http'} and url.netloc and not url.username and not url.password and all(key=='hotelId' for key,_ in parse_qsl(url.query)):return value[:1500]
    except ValueError:pass
    return None

def clean_evidence(value):
    if not isinstance(value,dict):return {'scope':'venue','facts':{}}
    facts={}
    for key,raw in (value.get('facts',{}) if isinstance(value.get('facts'),dict) else {}).items():
        if key not in FACT_KEYS or not isinstance(raw,dict):continue
        fact_value=raw.get('value')
        if not (fact_value is None or isinstance(fact_value,(bool,str,int,float))):continue
        if isinstance(fact_value,float) and not math.isfinite(fact_value):continue
        source=clean_url(raw.get('source_url'))
        status=raw.get('status') if raw.get('status') in {'confirmed','reported'} and source and fact_value is not None else 'unknown'
        fact={'value':fact_value[:400] if isinstance(fact_value,str) else fact_value,'status':status}
        for field in ['source','last_checked','note']:
            if isinstance(raw.get(field),str):fact[field]=raw[field][:500]
        if source:fact['source_url']=source
        facts[key]=fact
    result={'scope':value.get('scope') if value.get('scope') in {'venue','property','room'} else 'venue','facts':facts}
    if value.get('room_id') is not None:result['room_id']=str(value['room_id'])[:100]
    # Supplier feature reports never confirm availability for this offer/date.
    result['confirmation_required']=True
    if isinstance(value.get('reported_features'),list):
        result['reported_features']=[item[:500] for item in value['reported_features'][:30] if isinstance(item,str)]
    source=clean_url(value.get('source_url'))
    if source:result['source_url']=source
    if isinstance(value.get('last_checked'),str):result['last_checked']=value['last_checked'][:40]
    return result

def venue_evidence(identity):
    if not isinstance(identity,str):identity=''
    aliases={'sheikh-zayed-mosque':'sheikh-zayed-grand-mosque','burj-khalifa-sky':'burj-khalifa','old-dubai-heritage':'al-fahidi'}
    return clean_evidence({'scope':'venue','facts':deepcopy(VENUE_FACTS.get(aliases.get(identity,identity),{}))})

def provider_evidence(details,hotel_id,room=None):
    """Explicit attributes/amenities only. Never use fuzzy names or missing flags."""
    scope='room' if room is not None else 'property'
    raw=room if room is not None else details
    source='https://api.liteapi.travel/v3.0/data/hotel?hotelId='+quote(str(hotel_id),safe='')
    checked=details.get('_accessibility_checked_at') or datetime.now(timezone.utc).isoformat()
    facts={}
    def fact(key,value,note=''):
        facts[key]={'value':value,'status':'reported','source':'LiteAPI / Nuitée','source_url':source,'last_checked':checked,'note':note}
    accessibility=raw.get('accessibility') if isinstance(raw.get('accessibility'),dict) else {}
    attrs=raw.get('accessibilityAttributes') or accessibility.get('accessibilityAttributes') or accessibility
    attrs=attrs if isinstance(attrs,dict) else {}
    flags=attrs.get('attributes') if isinstance(attrs.get('attributes'),list) else []
    if 'entranceLeveled' in flags:fact('step_free_entrance',True,'Level entrance reported; confirm the complete arrival route.')
    if isinstance(attrs.get('entranceDoorWidth'),(int,float)) and attrs['entranceDoorWidth']>0:fact('entrance_door_width',str(attrs['entranceDoorWidth']),'Provider measurement; confirm units and clearance with the hotel.')
    if attrs.get('showerChair') is True or attrs.get('showerChair') in ['yes','Yes']:fact('shower_chair',True)
    amenities=raw.get('roomAmenities' if scope=='room' else 'hotelFacilities',[]) or []
    if not isinstance(amenities,list):amenities=[]
    for amenity in amenities[:100]:
        name=amenity.get('name','') if isinstance(amenity,dict) else amenity
        if not isinstance(name,str):continue
        label=name.casefold().strip()
        # Exact labels avoid interpreting "not wheelchair accessible" positively.
        if scope=='room' and label in {'entire unit wheelchair accessible','wheelchair accessible room','wheelchair-accessible room'}:fact('wheelchair_room',True,'Matched by exact room ID; room suitability and availability still need confirmation.')
        if label in {'toilet with grab rails','accessible toilet','accessible toilets'}:fact('accessible_toilets',True)
        if label in {'elevator','lift'}:fact('lift',True,'Lift dimensions and operation need confirmation.')
    reported=[]
    def collect(value,path='',depth=0):
        if depth>3 or len(reported)>=30:return
        if isinstance(value,dict):
            for key,item in list(value.items())[:40]:
                if isinstance(key,str) and not any(word in key.lower() for word in ['token','key','credential','signature']):collect(item,(path+' / ' if path else '')+key,depth+1)
        elif isinstance(value,list):
            for item in value[:20]:collect(item,path,depth+1)
        elif isinstance(value,str) and value.strip():reported.append((path+': '+value)[:500])
        elif isinstance(value,bool):reported.append(path+': '+('Yes' if value else 'No'))
        elif type(value) in {int,float} and math.isfinite(value) and value>0:reported.append(path+': '+str(value)+' (confirm units)')
    collect(accessibility)
    return clean_evidence({'scope':scope,'facts':facts,'room_id':room.get('id') if room else None,'reported_features':reported,'source_url':source,'last_checked':checked})

def support_rows(brief):
    return brief.get('traveller_support',[]) if isinstance(brief,dict) else [row.model_dump() for row in brief.traveller_support]

def compatibility(evidence,brief,scope='venue',essential_only=True):
    evidence=clean_evidence(evidence);facts=evidence['facts'];conflicts=[];unknown=[]
    for row in support_rows(brief):
        for need in row.get('essential' if essential_only else 'needs',[]):
            if need=='wheelchair_room' and scope=='venue':continue
            # Website presentation is provided by the app, not inferred from a hotel.
            if need=='screen_reader':continue
            key=NEED_FACT[need];fact=facts.get(key,{})
            value=fact.get('value');known=fact.get('status') in {'confirmed','reported'}
            label=f'Traveller {row["traveller"]}: {need.replace("_"," ")}'
            if need=='short_walks':
                maximum=row.get('max_walk_m')
                if known and type(value) in {int,float} and maximum:
                    if value>maximum:conflicts.append(label)
                else:unknown.append(label)
            elif known and value is False:conflicts.append(label)
            elif not known or value is not True:unknown.append(label)
        maximum=row.get('max_walk_m')
        if maximum and 'short_walks' not in row.get('essential',[]):
            value=facts.get('walking_distance_m',{}).get('value')
            if type(value) in {int,float} and value>maximum:conflicts.append(f'Traveller {row["traveller"]}: maximum walking distance')
    return {'conflicts':list(dict.fromkeys(conflicts)),'unknown':list(dict.fromkeys(unknown)),'confirmation_required':bool(conflicts or unknown or support_rows(brief))}

def support_instructions(brief):
    rows=support_rows(brief)
    if not rows:return ''
    return (' Accessibility: exclude stops with known essential conflicts. Unknown means "Confirm with venue", never verified accessible. '
            'Keep an accessibility_notes list on every day. Add scheduled rest activities (kind=rest) and realistic transfer times. '
            'Give walking_distance_m and duration_minutes for walking activities when supported by research; unknowns need confirmation. '
            'Accessible property facilities never confirm a specific room, airline assistance or transfer. Support requirements: '+json.dumps(rows))

def annotate_candidates(content,brief):
    """Server-owned catalogue evidence, not a model's claimed verification."""
    output=deepcopy(content)
    if not isinstance(output,dict):return output
    for key in ['events','places','items']:
        if not isinstance(output.get(key),list):continue
        accepted=[]
        for item in output[key]:
            if not isinstance(item,dict):continue
            evidence=venue_evidence(item.get('place_id') or item.get('id'))
            match=compatibility(evidence,brief)
            if match['conflicts']:continue
            item['accessibility']=evidence;item['accessibility_review']=match;accepted.append(item)
        output[key]=accepted
    return output
