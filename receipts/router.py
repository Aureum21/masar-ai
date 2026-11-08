import asyncio,os,re
from fastapi import APIRouter,Depends,UploadFile,File,Form,Header,HTTPException,Query
from fastapi.responses import Response
from sqlalchemy import select
import auth
from . import service as s,storage
from .models import Receipt
from .schemas import ReceiptEdit,RevisionRequest,TripLink

def enabled():
    default='false' if os.getenv('MASAR_ENV')=='production' else 'true'
    if os.getenv('RECEIPTS_ENABLED',default).lower()!='true':raise HTTPException(503,'Receipt Assistant is not enabled on this server yet.')

router=APIRouter(prefix='/api/v1/receipts',tags=['receipts'],dependencies=[Depends(enabled)])
USER=Depends(auth.get_current_user);DB=Depends(auth.get_db)

@router.get('')
async def listing(limit:int=Query(24,ge=1,le=50),cursor:str|None=Query(None,max_length=250),trip_id:int|None=Query(None,ge=1),user=USER,db=DB):
    await s.check_trip(db,trip_id,user.id)
    return await s.list_owned(db,user.id,limit,cursor,trip_id)

@router.post('/process',status_code=202)
async def upload(file:UploadFile=File(...),trip_id:int|None=Form(None),save_unrecognized:bool=Form(False),acknowledged_version:str=Form(...),idempotency_key:str=Header(...,alias='Idempotency-Key'),user=USER,db=DB):
    if not re.fullmatch('[A-Za-z0-9_-]{8,100}',idempotency_key):raise HTTPException(422,'A valid idempotency key is required.')
    try:raw=await file.read(storage.MAX_BYTES+1)
    finally:await file.close()
    filename=(file.filename or 'receipt.jpg').replace('\\','/').split('/')[-1]
    return await s.create(db,user.id,idempotency_key,raw,filename,trip_id,save_unrecognized,acknowledged_version)

@router.get('/summary')
async def summary(trip_id:int|None=Query(None,ge=1),user=USER,db=DB):
    await s.check_trip(db,trip_id,user.id)
    query=select(Receipt).where(Receipt.user_id==user.id,Receipt.deleted_at.is_(None),Receipt.is_demo.is_(False))
    if trip_id is not None:query=query.where(Receipt.trip_id==trip_id)
    rows=list((await db.scalars(query)).all())
    from decimal import Decimal
    eligible=[r for r in rows if r.state=='ready' and r.assessment_status=='eligible' and r.currency=='AED']
    processing=[r for r in rows if r.state in {'uploading','queued','running'}]
    failed=[r for r in rows if r.state=='failed' or r.assessment_status=='needs_review' or (r.total_amount is None and r.merchant_name is None and r.state not in {'uploading','queued','running'})]
    ineligible=[r for r in rows if r not in eligible and r not in processing and r not in failed]
    review_count=len(rows)-len(eligible)
    return {'count':len(rows),'eligible_count':len(eligible),
            'recorded_spend_aed':str(sum((r.total_amount for r in rows if r.currency=='AED' and r.total_amount is not None),Decimal(0))),
            'possible_refund_aed':str(sum((r.estimated_refund for r in eligible if r.estimated_refund is not None),Decimal(0))),
            'review_count':review_count,
            'processing_count':len(processing),
            'failed_count':len(failed),
            'ineligible_count':len(ineligible),
            'unknown_currency_count':sum(r.currency is None or r.currency!='AED' for r in rows),'official_status':'unknown'}

@router.get('/{identity}')
async def detail(identity:str,user=USER,db=DB):return s.serialize(await s.owned(db,identity,user.id))

@router.get('/{identity}/image')
async def image(identity:str,user=USER,db=DB):
    row=await s.owned(db,identity,user.id)
    if not row.storage:raise HTTPException(404,'Receipt image unavailable.')
    if row.storage.get('user_id')!=user.id or row.storage.get('receipt_id')!=row.id:raise HTTPException(503,'Invalid receipt image reference.')
    data=await asyncio.to_thread(storage.read,row.storage)
    return Response(data,media_type='image/jpeg',headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline; filename="receipt.jpg"'})

@router.patch('/{identity}')
async def edit(identity:str,body:ReceiptEdit,user=USER,db=DB):return await s.patch_receipt(db,identity,user.id,body)

@router.put('/{identity}/trip')
async def link_trip(identity:str,body:TripLink,user=USER,db=DB):
    row=await s.owned(db,identity,user.id,lock=True);s.check_revision(row,body.expected_revision)
    await s.check_trip(db,body.trip_id,user.id)
    row.trip_id=body.trip_id;row.revision+=1;row.updated_at=s.now()
    await db.commit();return s.serialize(row)

@router.post('/{identity}/retry')
async def retry(identity:str,body:RevisionRequest,user=USER,db=DB):return await s.retry(db,identity,user.id,body.expected_revision)

@router.delete('/{identity}',status_code=202)
async def delete(identity:str,user=USER,db=DB):return await s.remove(db,identity,user.id)
