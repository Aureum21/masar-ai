"""Short-lived provider evidence bridge across specialist extraction, never LLM claims."""
from copy import deepcopy
from time import monotonic
from domain.accessibility import clean_evidence
_CACHE={}
TTL=900
LIMIT=500

def remember(kind,identity,evidence,property_evidence=None):
    if not identity:return
    now=monotonic()
    for key,(expiry,_) in list(_CACHE.items()):
        if expiry<=now:_CACHE.pop(key,None)
    if len(_CACHE)>=LIMIT:_CACHE.pop(next(iter(_CACHE)))
    result={'accessibility':clean_evidence(evidence)}
    if property_evidence is not None:result['property_accessibility']=clean_evidence(property_evidence)
    _CACHE[(kind,str(identity))]=(now+TTL,result)

def trusted_results(content):
    if not isinstance(content,dict):return content
    result=deepcopy(content)
    for collection,kind,field in [('hotels','property','hotelId'),('rooms','room','offerId')]:
        for item in result.get(collection,[]):
            if not isinstance(item,dict):continue
            saved=_CACHE.get((kind,str(item.get(field))))
            item.pop('accessibility_review',None);item.pop('property_accessibility',None)
            item['accessibility']={'scope':kind,'facts':{},'confirmation_required':True}
            if saved and saved[0]>monotonic():item.update(deepcopy(saved[1]))
    return result
