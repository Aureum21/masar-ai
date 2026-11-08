"""Durable recommendation choices. Prices and IDs always come from returned snapshots."""
from copy import deepcopy
from decimal import Decimal, InvalidOperation
from hashlib import sha256
from datetime import datetime,timezone

STATE_TYPE='planning_state'
def flow_state(run):
    return next((deepcopy(x['content']) for x in run.workers or [] if isinstance(x,dict) and x.get('type')==STATE_TYPE),None)
def put_flow(run,flow):
    run.workers=[x for x in run.workers or [] if not isinstance(x,dict) or x.get('type')!=STATE_TYPE]+[{'type':STATE_TYPE,'content':flow}]
def initial_flow(draft):
    b=draft['brief']
    stage='flights' if b.get('flight_requirement')=='needed' else 'hotels' if b.get('stay_requirement')=='needed' else 'research'
    return {'version':1,'stage':stage,'awaiting':False,'revision':0,'selected':{},'resume':False}
def collection(run,kind,key):
    result=next((x.get('content',{}) for x in run.workers or [] if isinstance(x,dict) and x.get('type')==kind),{})
    return result.get(key,[]) if isinstance(result.get(key),list) else []
def options(run,stage):
    return collection(run,'flight_result','flights') if stage=='flights' else collection(run,'accommodation_result','rooms' if stage=='rooms' else 'hotels')
def option_id(item,stage):
    return str(item.get('offer_id' if stage=='flights' else 'offerId' if stage=='rooms' else 'hotelId') or '')
def choice_reference(item,stage):
    # Short reference to the owner's stored option, not a rewritten provider ID.
    return 'choice:'+sha256((stage+'\0'+option_id(item,stage)).encode()).hexdigest()

def quote(item,stage):
    value=item.get('total_amount' if stage=='flights' else 'price')
    try:
        if isinstance(value,bool):return None
        amount=Decimal(str(value));currency=item.get('currency','')
        if not amount.is_finite() or amount<=0 or not isinstance(currency,str) or len(currency)!=3 or not currency.isalpha():return None
        return {'amount':str(amount),'currency':currency.upper()}
    except (InvalidOperation,ValueError,TypeError):return None
def selectable(item,stage):
    return bool(option_id(item,stage)) and (stage=='hotels' or bool(quote(item,stage)))
def auto_option(run,stage):
    values=[x for x in options(run,stage) if selectable(x,stage)]
    if stage in {'hotels','rooms'}:
        from domain.accessibility import compatibility,support_rows
        brief=run.brief_snapshot['brief']
        values=[x for x in values if not any(compatibility(x.get('accessibility'),brief,'room' if stage=='rooms' else 'property')[key] for key in ['conflicts','unknown'])]
        # A room's reported features are not a confirmed allocation for this trip.
        if stage=='rooms' and any(row.get('essential') for row in support_rows(brief)):return None
    # Never compare currencies or pretend an unpriced rate is free. Providers are asked for AED.
    aed=[x for x in values if (quote(x,stage) or {}).get('currency')=='AED']
    if aed:return min(aed,key=lambda x:Decimal(quote(x,stage)['amount']))
    if stage=='hotels' and values:return values[0]
    return None
def advance(run,flow,item):
    stage=flow['stage']
    if not selectable(item,stage):raise ValueError('This option has no usable provider quote. Choose another option or refresh research.')
    if stage in {'hotels','rooms'}:
        from domain.accessibility import compatibility
        match=compatibility(item.get('accessibility'),run.brief_snapshot['brief'],'room' if stage=='rooms' else 'property')
        if match['conflicts']:raise ValueError('This option conflicts with essential support: '+', '.join(match['conflicts']))
        item={**item,'accessibility_review':{**match,'status':'needs_confirmation' if match['confirmation_required'] else 'not_requested'}}
    selected=flow.setdefault('selected',{})
    if stage=='flights':
        selected['flight']=deepcopy(item)
        flow['stage']='hotels' if run.brief_snapshot['brief'].get('stay_requirement')=='needed' else 'research'
    elif stage=='hotels':
        flow['hotel_options']=deepcopy(options(run,'hotels'))
        selected['hotel']=deepcopy(item);selected.pop('room',None);flow['stage']='rooms'
    elif stage=='rooms':
        if item.get('hotelId')!=selected.get('hotel',{}).get('hotelId'):raise ValueError('Choose a room from the selected hotel.')
        selected['room']=deepcopy(item);flow['stage']='research'
    else:raise ValueError('This planning stage is not accepting choices.')
    flow['revision']+=1;flow['awaiting']=False;flow['resume']=True
    run.status='queued';run.message='Your choice is saved. Continuing your journey.'
    put_flow(run,flow)
def public_flow(run):
    flow=flow_state(run)
    if not flow:return None
    return {k:flow.get(k) for k in ['version','stage','awaiting','revision','selected']}
def quoted_budget(flow):
    items=[];totals={}
    for key,stage,label in [('flight','flights','Selected flight · all travellers'),('room','rooms','Selected room · full stay')]:
        selected=flow.get('selected',{}).get(key)
        if not selected:continue
        price=quote(selected,stage)
        if not price:raise ValueError('A selected option has no valid quoted price.')
        currency=price['currency'];totals[currency]=totals.get(currency,Decimal(0))+Decimal(price['amount'])
        items.append({'kind':key,'label':label,'offer_id':option_id(selected,stage),**price})
    return {'source':'selected_provider_quotes','items':items,'currency_totals':[{'currency':c,'amount':str(a)} for c,a in sorted(totals.items())],
            'quoted_at':datetime.now(timezone.utc).isoformat(),'excludes':['Dining','Attraction tickets','Local transport','Other unquoted costs'],'booking_status':'not_booked'}
