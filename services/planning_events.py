"""A dated event search is mandatory for structured trips, independent of model tool choice."""
import asyncio
from datetime import date
from domain.attractions import BY_ID
from services.discovery import DiscoveryQuery,discover
async def planning_events(draft):
    brief=draft['brief'];start=date.fromisoformat(brief['start_date']);end=date.fromisoformat(brief['end_date'])
    from domain.places import resolve_place
    selected=[(resolve_place(p['id']) or {}).get('place_id',p['id']) for p in draft.get('selections',[])]
    regions=sorted({BY_ID[pid]['emirate'] for pid in selected if pid in BY_ID}) or ['all']
    # Search the full selected date range in each represented emirate. No LLM dates.
    results=await asyncio.gather(*[asyncio.to_thread(discover,DiscoveryQuery(category='events',region=region,start_date=start,end_date=end)) for region in regions])
    events={};checks=[]
    for region,result in zip(regions,results):
        checks.append({'emirate':region,'status':result.status,'message':result.message,'checked_at':result.checkedAt})
        for item in result.items:
            if item.eventDate and start.isoformat()<=item.eventDate[:10]<=end.isoformat():
                events[item.id]={'name':item.title,'date':item.eventDate,'event_date':item.eventDate[:10],'venue':item.neighborhood,'description':item.description or item.tagline,'imageUrl':item.images[0] if item.images else None,'link':item.sourceUrl,'place_id':item.id,'source':item.sourceLabel,'kind':'live_event'}
    values=list(events.values())[:36]
    summary='Found '+str(len(values))+' dated events for your travel dates.' if values else 'No dated events were returned for your travel dates.' if all(c['status'] in {'ok','empty'} for c in checks) else 'Live event search is unavailable for some locations; no event availability is assumed.'
    return {'events':values,'live_events':values,'event_search':{'start_date':start.isoformat(),'end_date':end.isoformat(),'checks':checks,'message':summary}}
