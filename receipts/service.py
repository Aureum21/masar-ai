import asyncio,base64,hashlib,json
from datetime import datetime,timedelta,timezone
from uuid import uuid4
from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy import select,or_,and_,func
from .models import Receipt
from . import storage
from .policy import assess
from .schemas import ReceiptFields

CORE_FIELDS=('merchant_name','purchase_date','currency','total_amount','vat_amount','category','is_service','has_planet_tag')
FIELDS=CORE_FIELDS
INTRO_VERSION='receipt-private-v3'
def now():return datetime.now(timezone.utc)
def aware(value):return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
def fields_for(row):return {name:(str(getattr(row,name,None)) if isinstance(getattr(row,name,None),Decimal) else getattr(row,name,None)) for name in CORE_FIELDS}
def serialize(row):
    ext=row.extracted_fields or {}
    return {'id':row.id,**fields_for(row),
            'trn':getattr(row,'trn',ext.get('trn')),
            'planet_tag_number':getattr(row,'planet_tag_number',ext.get('planet_tag_number')),
            'is_refund_candidate':ext.get('is_refund_candidate'),
            'candidate_reason':ext.get('candidate_reason'),
            'estimated_refund':str(row.estimated_refund) if row.estimated_refund is not None else None,
            'trip_id':row.trip_id,'file_name':row.file_name,'is_demo':row.is_demo,'state':row.state,'status':row.assessment_status,
            'reason':row.assessment.get('reason') if row.assessment else row.feedback,'feedback':row.feedback,
            'assessment':row.assessment,'policy_version':row.policy_version,'official_status':'unknown','revision':row.revision,
            'created_at':aware(row.created_at).isoformat(),'image_url':f'/api/v1/receipts/{row.id}/image' if row.storage else None,
            'extracted_fields':row.extracted_fields,'corrections':row.corrections,'attempts':row.attempts}

async def owned(db,identity,user_id,lock=False,include_deleted=False):
    query=select(Receipt).where(Receipt.id==identity,Receipt.user_id==user_id)
    if not include_deleted:query=query.where(Receipt.deleted_at.is_(None))
    if lock:query=query.with_for_update()
    row=await db.scalar(query)
    if not row:raise HTTPException(404,'Receipt not found.')
    return row

async def check_trip(db,trip_id,user_id):
    if trip_id is not None:
        from models import Trip
        if not await db.scalar(select(Trip.id).where(Trip.id==trip_id,Trip.user_id==user_id)):raise HTTPException(404,'Trip not found.')

def apply_assessment(row):
    report=assess(fields_for(row))
    row.assessment=report;row.assessment_status=report['status'];row.policy_version=report['policy_version']
    row.estimated_refund=Decimal(report['estimated_refund']) if report['estimated_refund'] is not None else None
    row.feedback=report['reason'];row.updated_at=now()
    row.state='needs_review' if report['status']=='needs_review' else 'ready'

def set_fields(row,values):
    for key,value in values.items():
        if key not in FIELDS or not hasattr(Receipt, key):continue
        if key in {'total_amount','vat_amount'} and value is not None:value=Decimal(str(value))
        if key=='purchase_date' and value is not None:value=str(value)
        setattr(row,key,value)

def validate_amounts(values):
    total,vat=values.get('total_amount'),values.get('vat_amount')
    if total is not None and vat is not None and Decimal(str(vat))>Decimal(str(total)):
        raise HTTPException(422,'VAT cannot exceed the receipt total.')

def check_revision(row,revision):
    if row.revision!=revision:raise HTTPException(409,'This receipt changed. Refresh it before saving your correction.')

async def create(db,user_id,key,raw,filename,trip_id,manual,acknowledgement):
    if acknowledgement!=INTRO_VERSION:raise HTTPException(422,'Read and acknowledge the current receipt privacy notice before uploading.')
    data,image_sha=await asyncio.to_thread(storage.sanitize,raw)
    digest=hashlib.sha256(raw+json.dumps({'trip_id':trip_id,'manual':manual},sort_keys=True).encode()).hexdigest()
    # Serialise per-owner reservation/quota checks; no provider call happens in this transaction.
    from models import User
    await db.scalar(select(User.id).where(User.id==user_id).with_for_update())
    await check_trip(db,trip_id,user_id)
    existing=await db.scalar(select(Receipt).where(Receipt.user_id==user_id,Receipt.idempotency_key==key))
    if existing:
        if existing.deleted_at:raise HTTPException(409,'That upload was deleted. Select the image again to create a new receipt.')
        if existing.request_hash!=digest:raise HTTPException(409,'This upload key belongs to different receipt data.')
        return serialize(existing)
    duplicate=await db.scalar(select(Receipt).where(Receipt.user_id==user_id,Receipt.image_sha==image_sha))
    if duplicate:
        if duplicate.deleted_at:raise HTTPException(409,'The previous copy is being deleted. Retry shortly.')
        return {**serialize(duplicate),'duplicate':True}
    active=list((await db.scalars(select(Receipt).where(Receipt.user_id==user_id,Receipt.state!='deleted').limit(101))).all())
    if len(active)>=100 or sum((r.storage or {}).get('bytes',0) for r in active)+len(data)>100*1024*1024:raise HTTPException(413,'Receipt storage limit reached: 100 images or 100 MB. Delete old images before uploading more.')
    import os
    daily_limit=max(1,min(100,int(os.getenv('RECEIPT_DAILY_LIMIT','20'))))
    today=now().replace(hour=0,minute=0,second=0,microsecond=0)
    if (await db.scalar(select(func.count()).select_from(Receipt).where(Receipt.user_id==user_id,Receipt.created_at>=today)))>=daily_limit:
        raise HTTPException(429,'Daily receipt upload limit reached. Try tomorrow.',headers={'Retry-After':'3600'})
    identity=uuid4().hex;ref={**storage.reference(user_id,identity),'sha256':image_sha,'bytes':len(data)}
    row=Receipt(id=identity,user_id=user_id,trip_id=trip_id,idempotency_key=key,request_hash=digest,image_sha=image_sha,storage=ref,
                file_name=filename[:180],state='uploading',created_at=now(),updated_at=now(),lease_until=now()+timedelta(minutes=2),acknowledged_version=acknowledgement,
                assessment={},extracted_fields={},corrections=[],is_demo=False,revision=1,attempts=0)
    db.add(row)
    from sqlalchemy.exc import IntegrityError
    try:await db.commit()  # Durable reservation exists before any object write.
    except IntegrityError:
        await db.rollback()
        existing=await db.scalar(select(Receipt).where(Receipt.user_id==user_id,or_(Receipt.idempotency_key==key,Receipt.image_sha==image_sha)))
        if existing and existing.deleted_at is None:
            if existing.idempotency_key==key and existing.request_hash!=digest:raise HTTPException(409,'This upload key belongs to different data.')
            return {**serialize(existing),'duplicate':True}
        raise HTTPException(409,'A receipt with this image or request is already being changed. Retry shortly.') from None
    try:
        stored_ref=await asyncio.to_thread(storage.put,ref,data)
    except Exception:
        await db.refresh(row)
        if row.deleted_at is None:row.state='failed';row.feedback='The private upload did not finish. Delete this entry and upload again.'
        row.lease_until=None;row.updated_at=now();row.revision+=1
        await db.commit()
        raise HTTPException(503,'Private upload did not finish. The saved entry can be deleted and uploaded again.') from None
    await db.refresh(row)
    row.storage=stored_ref
    row.lease_until=None;row.revision+=1;row.updated_at=now()
    if row.deleted_at is None:
        if manual:apply_assessment(row)
        else:row.state='queued';row.feedback='Saved privately. Waiting for receipt analysis.'
    await db.commit();await db.refresh(row)
    if row.deleted_at:raise HTTPException(409,'This receipt was deleted while its image was uploading.')
    return serialize(row)

async def list_owned(db,user_id,limit=24,cursor=None,trip_id=None):
    query=select(Receipt).where(Receipt.user_id==user_id,Receipt.deleted_at.is_(None))
    if trip_id is not None:query=query.where(Receipt.trip_id==trip_id)
    if cursor:
        try:
            stamp,identity=json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
            stamp=datetime.fromisoformat(stamp)
            if len(identity)!=32:raise ValueError()
        except Exception:raise HTTPException(422,'Invalid receipt page cursor.') from None
        query=query.where(or_(Receipt.created_at<stamp,and_(Receipt.created_at==stamp,Receipt.id<identity)))
    rows=list((await db.scalars(query.order_by(Receipt.created_at.desc(),Receipt.id.desc()).limit(limit+1))).all())
    page=rows[:limit];next_cursor=None
    if len(rows)>limit:
        last=page[-1];next_cursor=base64.urlsafe_b64encode(json.dumps([aware(last.created_at).isoformat(),last.id]).encode()).decode()
    return {'items':[serialize(r) for r in page],'next_cursor':next_cursor}

async def patch_receipt(db,identity,user_id,changes):
    row=await owned(db,identity,user_id,lock=True);check_revision(row,changes.expected_revision)
    if row.state in {'queued','running','uploading'}:raise HTTPException(409,'Wait for analysis or choose a saved receipt before editing.')
    update=changes.model_dump(exclude_unset=True,mode='json');update.pop('expected_revision')
    merged={**fields_for(row),**update};validate_amounts(merged)
    if update:
        row.corrections=[*(row.corrections or []),{'at':now().isoformat(),'revision':row.revision,'fields':update}][-30:]
        set_fields(row,update);apply_assessment(row);row.revision+=1
    await db.commit();await db.refresh(row);return serialize(row)

async def retry(db,identity,user_id,revision):
    row=await owned(db,identity,user_id,lock=True);check_revision(row,revision)
    if row.state!='failed' or row.attempts>=3:raise HTTPException(409,'This receipt cannot be retried. Review its details manually or upload a clearer photo.')
    if not row.storage:raise HTTPException(409,'Upload a new image before retrying.')
    row.state='queued';row.feedback='Queued for another analysis attempt.';row.lease_token=None;row.lease_until=None;row.revision+=1;row.updated_at=now()
    await db.commit();return serialize(row)

async def remove(db,identity,user_id):
    row=await owned(db,identity,user_id,lock=True,include_deleted=True)
    if row.deleted_at is None:
        was_uploading=row.state=='uploading'
        row.deleted_at=now();row.state='deleting';row.lease_token=None
        if not was_uploading:row.lease_until=None
        set_fields(row,{key:None for key in FIELDS})
        row.estimated_refund=None;row.assessment={};row.extracted_fields={};row.corrections=[];row.file_name=None;row.trip_id=None;row.feedback=None
        row.revision+=1;row.updated_at=now();await db.commit()
    return {'id':identity,'state':row.state,'message':'Removed from your collection. Private image deletion is queued.'}

async def claim(sessions):
    async with sessions() as db:
        async with db.begin():
            row=await db.scalar(select(Receipt).where(Receipt.deleted_at.is_(None),or_(Receipt.state=='queued',and_(Receipt.state=='running',Receipt.lease_until<now()))).order_by(Receipt.created_at).with_for_update(skip_locked=True).limit(1))
            if not row:return None
            if not row.storage or row.storage.get('user_id')!=row.user_id or row.storage.get('receipt_id')!=row.id:
                row.state='failed';row.feedback='The private image reference needs attention. Upload a new copy.';row.revision+=1
                return None
            if row.attempts>=3:
                row.state='failed';row.feedback='Automatic analysis stopped after interrupted attempts. Review the receipt manually.';row.revision+=1
                return None
            row.state='running';row.lease_token=uuid4().hex;row.lease_until=now()+timedelta(seconds=90);row.attempts+=1;row.revision+=1;row.updated_at=now()
            return row.id,row.lease_token,row.storage

async def process(sessions,identity,token,ref,extractor=None):
    from .extraction import extract
    values=None
    try:
        async with asyncio.timeout(60):
            data=await asyncio.to_thread(storage.read,ref)
            values=await (extractor or extract)(data)
            values=ReceiptFields(**values).model_dump(mode='json')
    except asyncio.CancelledError:raise
    except Exception:values=None
    async with sessions() as db:
        async with db.begin():
            row=await db.scalar(select(Receipt).where(Receipt.id==identity,Receipt.state=='running',Receipt.lease_token==token,Receipt.deleted_at.is_(None)).with_for_update())
            if not row:return False
            if values is None:
                row.state='failed';row.feedback='Receipt analysis could not finish. Retry or review the saved image manually. No sample data was substituted.'
            else:
                row.extracted_fields=values;set_fields(row,values);apply_assessment(row)
            row.lease_token=None;row.lease_until=None;row.revision+=1;row.updated_at=now()
            return True

async def cleanup(sessions):
    async with sessions() as db:
        async with db.begin():
            row=await db.scalar(select(Receipt).where(Receipt.state=='deleting',or_(Receipt.lease_until.is_(None),Receipt.lease_until<now())).with_for_update(skip_locked=True).limit(1))
            if not row:return False
            identity,ref,token=row.id,row.storage,uuid4().hex
            row.lease_token=token;row.lease_until=now()+timedelta(seconds=60)
    try:
        if ref:await asyncio.to_thread(storage.delete,ref)
    except Exception:return False
    async with sessions() as db:
        async with db.begin():
            row=await db.scalar(select(Receipt).where(Receipt.id==identity,Receipt.state=='deleting',Receipt.lease_token==token).with_for_update())
            if row:
                row.state='deleted';row.storage=None;row.image_sha=None;row.lease_token=None;row.lease_until=None;row.updated_at=now()
    return True

async def recover_uploads(sessions):
    async with sessions() as db:
        async with db.begin():
            rows=(await db.scalars(select(Receipt).where(Receipt.state=='uploading',Receipt.lease_until<now()).with_for_update(skip_locked=True).limit(20))).all()
            for row in rows:
                row.state='failed';row.feedback='Upload was interrupted. Review the saved image if available, or delete and upload again.';row.lease_until=None;row.revision+=1;row.updated_at=now()
