"""Explicit, owner-scoped Day 1 booking tasks. No booking is triggered by planning."""
import hashlib,json,os
from datetime import date
from decimal import Decimal,InvalidOperation
from typing import Literal
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel,ConfigDict,Field,EmailStr,model_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import auth,models
from domain.planning_choices import flow_state
from services.booking_records import BookingOperation,reserve_operation,persist_outcome,failed_outcome,confirm_hotel,provider_environment,event_payload
from services.nutiee import nuitee_prebook,ConfirmBookingInput,Holder,Guest
import httpx

router=APIRouter(prefix='/api/v1/trip-bookings',tags=['Trip booking tasks'])

class Contact(BaseModel):
    model_config=ConfigDict(extra='forbid')
    firstName:str=Field(min_length=1,max_length=100)
    lastName:str=Field(min_length=1,max_length=100)
    email:EmailStr
    phoneCountryCode:str=Field(pattern=r'^\+?[0-9]{1,4}$')
    phoneNumber:str=Field(min_length=5,max_length=24,pattern=r'^[0-9 +()-]+$')

class Passenger(BaseModel):
    model_config=ConfigDict(extra='forbid')
    firstName:str=Field(min_length=1,max_length=100)
    lastName:str=Field(min_length=1,max_length=100)
    birthday:date
    gender:Literal['M','F']
    nationality:str=Field(pattern='^[A-Z]{2}$')
    documentType:Literal['passport']='passport'
    documentNumber:str=Field(min_length=3,max_length=40)
    documentIssueCountry:str=Field(pattern='^[A-Z]{2}$')
    documentExpiry:date
    passengerType:Literal[0]=0

class PrebookRequest(BaseModel):
    model_config=ConfigDict(extra='forbid')
    kind:Literal['hotel','flight']
    contact:Contact|None=None
    passengers:list[Passenger]=Field(default_factory=list,max_length=50)

class BookRequest(BaseModel):
    model_config=ConfigDict(extra='forbid')
    kind:Literal['hotel','flight']
    prebook_id:str=Field(min_length=1,max_length=255)
    confirm_payment:bool=False
    confirm_simulation:bool=False
    contact:Contact|None=None
    guest_names:list[dict[str,str]]=Field(default_factory=list,max_length=50)

    @model_validator(mode='after')
    def explicit_confirmation(self):
        if not self.confirm_payment and not self.confirm_simulation:raise ValueError('Confirm the booking simulation or payment before continuing.')
        return self

async def owned_context(db,user_id,trip_id):
    trip=await db.scalar(select(models.Trip).where(models.Trip.id==trip_id,models.Trip.user_id==user_id))
    if not trip:raise HTTPException(404,'Trip not found')
    # Use the immutable planner record, not editable itinerary JSON supplied by a browser.
    run=await db.scalar(select(models.PlanningRun).where(models.PlanningRun.trip_id==trip_id,models.PlanningRun.user_id==user_id))
    flow=flow_state(run) if run else None
    if not flow:raise HTTPException(409,'This trip has no saved provider selections. Find fresh flight or room options first.')
    itinerary=trip.itinerary_data or {}
    if isinstance(itinerary,str):
        try:itinerary=json.loads(itinerary)
        except ValueError:itinerary={}
    for field in ['start_date','end_date']:
        if itinerary.get(field) and itinerary[field]!=run.brief_snapshot['brief'][field]:raise HTTPException(409,'Travel dates changed since these offers were selected. Find fresh quotes before booking.')
    return trip,run,flow

def source_key(kind,selected):
    identity=selected.get('offerId' if kind=='hotel' else 'offer_id','')
    if not identity or 'mock' in identity.lower():raise HTTPException(409,'Choose a current provider offer before booking.')
    return kind+':'+hashlib.sha256(identity.encode()).hexdigest()

def task_payload(op):
    result=op.result or {}
    return {'event_id':op.id,'kind':op.kind,'status':op.status,'environment':op.environment,'prebook_id':result.get('prebook_id'),
            'amount':result.get('amount'),'currency':result.get('currency'),'terms':result.get('terms'),'payment_methods':result.get('payment_methods',[]),
            'provider_reference':op.provider_reference}

@router.get('/{trip_id}')
async def tasks(trip_id:int,user=Depends(auth.get_current_user),db:AsyncSession=Depends(auth.get_db)):
    _,run,flow=await owned_context(db,user.id,trip_id)
    rows=(await db.scalars(select(BookingOperation).where(BookingOperation.user_id==user.id,BookingOperation.trip_id==trip_id,BookingOperation.context_key=='trip_day_one').order_by(BookingOperation.created_at))).all()
    return {'operations':[task_payload(x) for x in rows],'travellers':run.brief_snapshot['brief']['travellers'],'simulation':provider_environment()=='sandbox',
            'traveller_support':run.brief_snapshot['brief'].get('traveller_support',[]),'support_confirmations':flow.get('support_confirmations',{})}

class SupportConfirmation(BaseModel):
    model_config=ConfigDict(extra='forbid')
    traveller:int=Field(ge=1,le=50,strict=True)
    kind:Literal['hotel','flight']
    status:Literal['not_requested','requested','confirmed','unavailable']
    reference:str=Field(default='',max_length=500)

def support_requirements(run,kind):
    rows=run.brief_snapshot['brief'].get('traveller_support',[])
    irrelevant={'screen_reader','wheelchair_room'} if kind=='flight' else {'screen_reader'}
    return [row for row in rows if set(row.get('essential',[])) - irrelevant]

def require_support_confirmation(run,flow,kind):
    if not support_requirements(run,kind):return
    selected=flow['selected'].get('room' if kind=='hotel' else 'flight',{})
    target=source_key(kind,selected)
    for row in support_requirements(run,kind):
        saved=flow.get('support_confirmations',{}).get(f'{kind}:{row["traveller"]}',{})
        if saved.get('status')!='confirmed' or saved.get('offer_key')!=target:
            raise HTTPException(409,'Confirm essential '+('room requirements with the hotel' if kind=='hotel' else 'assistance with the airline')+' for each traveller in the support checklist before booking.')

@router.put('/{trip_id}/support')
async def update_support(trip_id:int,body:SupportConfirmation,user=Depends(auth.get_current_user),db:AsyncSession=Depends(auth.get_db)):
    trip,run,flow=await owned_context(db,user.id,trip_id)
    run=await db.scalar(select(models.PlanningRun).where(models.PlanningRun.id==run.id).with_for_update().execution_options(populate_existing=True))
    flow=flow_state(run)
    if not any(row['traveller']==body.traveller and row.get('needs') for row in run.brief_snapshot['brief'].get('traveller_support',[])):
        raise HTTPException(422,'Choose a traveller with saved support requirements.')
    selected=flow['selected'].get('room' if body.kind=='hotel' else 'flight')
    if not selected:raise HTTPException(409,'No selected offer exists for this support confirmation.')
    if body.status=='confirmed' and len(body.reference.strip())<6:raise HTTPException(422,'Record who confirmed the requirements and their confirmation reference or contact details.')
    from datetime import datetime,timezone
    value={'status':body.status,'reference':body.reference.strip(),'offer_key':source_key(body.kind,selected),'recorded_at':datetime.now(timezone.utc).isoformat(),'reported_by':'traveller','traveller':body.traveller,'kind':body.kind}
    flow.setdefault('support_confirmations',{})[f'{body.kind}:{body.traveller}']=value
    from domain.planning_choices import put_flow
    put_flow(run,flow)
    # Separate from ticket/room booking status: this is a traveller's external confirmation record.
    itinerary=trip.itinerary_data
    if isinstance(itinerary,str):
        try:itinerary=json.loads(itinerary)
        except ValueError:itinerary={}
    trip.itinerary_data={**(itinerary if isinstance(itinerary,dict) else {}),'support_confirmations':flow['support_confirmations']}
    await db.commit()
    return {'support_confirmations':flow['support_confirmations']}

def first_data(payload):
    data=payload.get('data') or {}
    return data[0] if isinstance(data,list) and data else data

async def flight_prebook(offer,body):
    async with httpx.AsyncClient(timeout=30) as client:
        response=await client.post('https://api.liteapi.travel/v3.0/flights/prebooks',headers={'X-API-Key':os.getenv('NUTIEE_API_KEY','')},json={'offerId':offer,'usePaymentSdk':False,'contact':body.contact.model_dump(mode='json'),'passengers':[p.model_dump(mode='json') for p in body.passengers]})
        response.raise_for_status();data=first_data(response.json())
        return {'prebook_id':data.get('prebookId'),'amount':data.get('price'),'currency':data.get('currency'),'terms':(data.get('booking') or {}).get('journey',{}).get('terms'),'payment_methods':data.get('paymentTypes') or []}

@router.post('/{trip_id}/prebook')
async def prebook(trip_id:int,body:PrebookRequest,user=Depends(auth.get_current_user),db:AsyncSession=Depends(auth.get_db)):
    trip,run,flow=await owned_context(db,user.id,trip_id)
    selected=flow['selected'].get('room' if body.kind=='hotel' else 'flight')
    if not selected:raise HTTPException(409,'No matching provider offer is saved in this trip.')
    if body.kind=='flight':
        if not body.contact or len(body.passengers)!=run.brief_snapshot['brief']['travellers']:raise HTTPException(422,'Provide contact and passport details for every traveller.')
        end=date.fromisoformat(run.brief_snapshot['brief']['end_date'])
        if any(p.birthday>=date.today() or p.documentExpiry<=end for p in body.passengers):raise HTTPException(422,'Check birth dates and passport expiry dates for the trip.')
    payload={'offer':source_key(body.kind,selected),'travellers':run.brief_snapshot['brief']['travellers'],'simulation':provider_environment()=='sandbox'}
    if body.kind=='flight':payload['details_digest']=hashlib.sha256(body.model_dump_json().encode()).hexdigest()
    operation,new=await reserve_operation(db,user.id,body.kind+'_hold',payload['offer'],payload,context_key='trip_day_one',trip_id=trip_id)
    if not new:
        if operation.trip_id!=trip_id:raise HTTPException(409,'This offer already has an attempt in another trip. Check your existing reservations.')
        return task_payload(operation)
    try:
        if body.kind=='hotel':
            raw=await nuitee_prebook(selected['offerId'])
            if not raw.get('prebook_id'):raise ValueError('No prebook reference')
            result={'prebook_id':raw['prebook_id'],'amount':raw.get('final_price'),'currency':raw.get('currency'),'terms':raw.get('cancelation_policy') or raw.get('remarks'),'payment_methods':['ACC_CREDIT_CARD']}
            if raw.get('final_price') is None or not raw.get('currency'):raise ValueError('No current room price returned')
            db.add(models.PreBooking(user_id=str(user.id),prebook_id=raw['prebook_id'],room_name=raw.get('room_name'),final_price=str(raw.get('final_price')),currency=raw.get('currency'),checkin=raw.get('checkin'),checkout=raw.get('checkout'),status='PENDING'))
        else:result=await flight_prebook(selected['offer_id'],body)
        if not result.get('prebook_id') or result.get('amount') is None or not isinstance(result.get('currency'),str) or len(result['currency'])!=3:raise ValueError('No current quote returned')
        amount=Decimal(str(result['amount']))
        if isinstance(result['amount'],bool) or not amount.is_finite() or amount<=0:raise ValueError('Invalid current price')
    except Exception as error:return await failed_outcome(db,operation,error)
    operation.result=result;operation.status='HELD';await db.commit();return task_payload(operation)

async def flight_book(prebook_id):
    async with httpx.AsyncClient(timeout=30) as client:
        response=await client.post('https://api.liteapi.travel/v3.0/flights/bookings',headers={'X-API-Key':os.getenv('NUTIEE_API_KEY','')},json={'prebookId':prebook_id,'payment':{'method':'ACC_CREDIT_CARD'}})
        response.raise_for_status();data=first_data(response.json());booking=data.get('booking') or data
        return {'status':booking.get('status'),'booking_id':booking.get('bookingId') or booking.get('booking_id'),'booking_reference':booking.get('bookingReference')}

@router.post('/{trip_id}/book')
async def book(trip_id:int,body:BookRequest,user=Depends(auth.get_current_user),db:AsyncSession=Depends(auth.get_db)):
    trip,run,flow=await owned_context(db,user.id,trip_id)
    require_support_confirmation(run,flow,body.kind)
    hold=await db.scalar(select(BookingOperation).where(BookingOperation.user_id==user.id,BookingOperation.trip_id==trip_id,BookingOperation.kind==body.kind+'_hold',BookingOperation.context_key=='trip_day_one'))
    if not hold or hold.status!='HELD' or (hold.result or {}).get('prebook_id')!=body.prebook_id:raise HTTPException(409,'Prebook this selected offer and review its current price first.')
    simulation=provider_environment()=='sandbox'
    if simulation:
        if hold.environment!='sandbox' or not body.confirm_simulation:raise HTTPException(422,'Confirm this sandbox booking simulation. No real card is required.')
    elif body.confirm_simulation or hold.environment=='sandbox':
        raise HTTPException(409,'The server is not using the sandbox credentials for this hold. Simulation cannot create a live booking.')
    elif not body.confirm_payment:raise HTTPException(422,'Confirm the current price and payment before booking.')
    if not simulation and 'ACC_CREDIT_CARD' not in hold.result.get('payment_methods',[]):raise HTTPException(409,'This provider offer requires a payment method not yet connected in MASAR.')
    if body.kind=='hotel':
        if not body.contact or len(body.guest_names)!=run.brief_snapshot['brief']['travellers'] or any(not n.get('firstName','').strip() or not n.get('lastName','').strip() for n in body.guest_names):raise HTTPException(422,'Enter the holder and every guest’s name.')
        contact=body.contact
        params=ConfirmBookingInput(prebook_id=body.prebook_id,holder=Holder(firstName=contact.firstName,lastName=contact.lastName,email=str(contact.email),phone=contact.phoneCountryCode+contact.phoneNumber),guests=[Guest(occupancyNumber=1,firstName=n['firstName'],lastName=n['lastName'],email=str(contact.email)) for n in body.guest_names],payment_method='ACC_CREDIT_CARD')
        return await confirm_hotel(db,user.id,params,context_key='trip_day_one',trip_id=trip_id)
    operation,new=await reserve_operation(db,user.id,'flight','prebook:'+body.prebook_id,{'prebook_id':body.prebook_id,'payment':'ACC_CREDIT_CARD'},context_key='trip_day_one',trip_id=trip_id)
    if not new:return {'confirmation':event_payload(operation)}
    try:
        result=await flight_book(body.prebook_id)
        if not isinstance(result,dict) or result.get('error'):raise ValueError('No flight booking result')
        result.update(total_amount=hold.result['amount'],currency=hold.result['currency'])
    except Exception as error:return await failed_outcome(db,operation,error)
    return await persist_outcome(db,operation,result)
