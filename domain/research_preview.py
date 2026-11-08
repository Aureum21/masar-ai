"""Bounded display data only, never raw tool payloads or provider credentials."""
import json,math
from urllib.parse import urlsplit,parse_qsl

COLLECTIONS={'event_result':'events','accommodation_result':'hotels','logistics_result':'routes','flight_result':'flights'}
FIELDS={'name','title','location','price','currency','rating','roomType','hotelId','lat','lng','imageUrl','description','date','venue','link','origin','destination','duration','distance','fare','offer_id','airline','airline_logo','total_amount','departing_at','arriving_at','offerId','board','environment','expiration','place_id','event_date','source','kind'}
URL_FIELDS={'imageUrl','link','airline_logo'}
PROVIDER_ID_FIELDS={'offerId','offer_id','hotelId'}
MAX_PROVIDER_ID_LENGTH=32768

def safe_url(value):
    try:
        url=urlsplit(value)
        if url.scheme not in {'http','https'} or not url.netloc or url.username or url.password:return None
        if any(any(secret in key.lower() for secret in ['key','token','signature','credential','auth']) for key,_ in parse_qsl(url.query)):return None
        return value[:2000]
    except (TypeError,ValueError):return None

def card(value,depth=0):
    if not isinstance(value,dict):return {}
    result={}
    from domain.accessibility import clean_evidence
    for key in ['accessibility','property_accessibility']:
        if isinstance(value.get(key),dict):result[key]=clean_evidence(value[key])
    if isinstance(value.get('roomId'),(str,int)):result['roomId']=str(value['roomId'])[:100]
    for key,item in value.items():
        if key not in FIELDS:continue
        if key in PROVIDER_ID_FIELDS and isinstance(item,str):
            # Opaque IDs must remain exact; a truncated quote cannot be reused.
            if len(item)>MAX_PROVIDER_ID_LENGTH:return {}
            result[key]=item
        elif key in URL_FIELDS:
            url=safe_url(item)
            if url:result[key]=url
        elif isinstance(item,str):result[key]=item[:2000]
        elif isinstance(item,(int,float)) and not isinstance(item,bool) and math.isfinite(item):result[key]=item
    if isinstance(value.get('images'),list):result['images']=[url for item in value['images'][:8] if (url:=safe_url(item))]
    if isinstance(value.get('steps'),list):result['steps']=[str(step)[:500] for step in value['steps'][:16] if isinstance(step,str)]
    if depth<2:
        for key in ['slices','segments']:
            if isinstance(value.get(key),list):result[key]=[card(item,depth+1) for item in value[key][:6] if isinstance(item,dict)]
    return result

def research_preview(kind,content):
    collection=COLLECTIONS.get(kind)
    if not collection:return None
    if isinstance(content,str):
        try:content=json.loads(content)
        except (ValueError,TypeError):return None
    if not isinstance(content,dict):return None
    if kind=='accommodation_result' and isinstance(content.get('rooms'),list) and content['rooms']:collection='rooms'
    items=content.get(collection)
    if not isinstance(items,list):return {'type':kind,'content':{collection:[]}}
    result=[]
    for item in items[:12]:
        clean=card(item)
        if not clean:continue
        if kind=='flight_result':
            clean['offer_id']=str(clean.get('offer_id',''))
            clean['slices']=[dict(part,segments=part.get('segments',[])) for part in clean.get('slices',[])]
        if len(json.dumps(result+[clean]).encode())>96000:break
        result.append(clean)
    total=content.get('total_items')
    total=max(len(items),total) if type(total) is int and total>=0 else len(items)
    preview={'type':kind,'content':{collection:result,'total_items':total,'preview_limited':len(result)<total}}
    if kind=='event_result' and isinstance(content.get('event_search'),dict):
        search=content['event_search']
        preview['content']['event_search']={key:search[key] for key in ['start_date','end_date','message'] if isinstance(search.get(key),str)}
    return preview

def stored_results(workers):
    """Old rows contain names; newer rows retain those names with display snapshots."""
    names=[];results=[]
    for item in workers or []:
        name=item if isinstance(item,str) else item.get('type') if isinstance(item,dict) else None
        if name not in COLLECTIONS:continue
        if name not in names:names.append(name)
        if isinstance(item,dict):
            preview=research_preview(name,item.get('content'))
            if preview:results.append(preview)
    return names,results
