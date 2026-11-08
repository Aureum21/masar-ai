from fastapi import BackgroundTasks, FastAPI, HTTPException, Depends, status
from contextlib import asynccontextmanager
from starlette.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from config.production import production, validate_settings, cors_origins, allowed_hosts
from services.agent_checkpoints import checkpoint_lifespan
from services.api_protection import ApiProtection
import asyncio
import logging
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field, model_validator
from uuid import UUID
from typing import Literal
from domain.planning import PlanningDraft, research_policy
import json
from sqlalchemy.ext.asyncio import AsyncSession
from database import AsyncSessionLocal
import models
import schemas
import auth
from datetime import timedelta
from sqlalchemy import select
from domain.preferences import normalise_preferences
from domain.trips import normalise_itinerary
import email_utils

from routers.discovery import router as discovery_router

@asynccontextmanager
async def lifespan(app):
    validate_settings()
    async with checkpoint_lifespan():
        try:
            yield
        finally:
            from database import engine
            await engine.dispose()

app = FastAPI(title="Masar AI API", lifespan=lifespan,
    docs_url=None if production() else '/docs', redoc_url=None if production() else '/redoc',
    openapi_url=None if production() else '/openapi.json')

@app.get('/health/live', include_in_schema=False)
async def live():
    return {'status': 'alive'}

@app.get('/health/ready', include_in_schema=False)
async def ready():
    from sqlalchemy import text
    try:
        async with asyncio.timeout(5):
            async with AsyncSessionLocal() as session:
                exists=await session.scalar(text("SELECT to_regclass('public.planning_runs') IS NOT NULL AND to_regclass('public.attractions') IS NOT NULL"))
        if not exists:
            raise RuntimeError('Schema not ready')
        return {'status': 'ready'}
    except Exception:
        return JSONResponse({'status': 'not_ready'}, status_code=503)

from routers.planning import router as planning_router, owned_brief
app.include_router(discovery_router)
from routers.attractions import router as attractions_router
app.include_router(attractions_router)
from routers.time_travel import router as time_travel_router
app.include_router(time_travel_router)
from receipts.router import router as receipt_router
app.include_router(receipt_router)
app.include_router(planning_router)
from routers.planning_runs import router as planning_runs_router
app.include_router(planning_runs_router)
from passport.router import router as passport_router
app.include_router(passport_router)
from services.booking_records import router as booking_records_router
app.include_router(booking_records_router)
from routers.trip_bookings import router as trip_bookings_router
app.include_router(trip_bookings_router)

# Admission controls run inside CORS so browsers can read 429 responses.
app.add_middleware(ApiProtection)
# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "X-Passport-Operator-Key", "Idempotency-Key"],
    expose_headers=["Retry-After"],
)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts())

class ChatRequest(BaseModel):
    locale: Literal['en', 'ar', 'hi'] = 'en'
    message: str = Field(min_length=1, max_length=20000)
    thread_id: str = Field(default="default_thread", max_length=160)
    trip_brief: PlanningDraft | None = None
    brief_id: UUID | None = None
    brief_revision: int | None = Field(default=None,ge=1)

    @model_validator(mode='after')
    def brief_reference(self):
        if (self.brief_id is None)!=(self.brief_revision is None):
            raise ValueError('A saved brief requires its ID and revision.')
        if self.brief_id and self.trip_brief:
            raise ValueError('Use a saved brief reference or inline brief, not both.')
        return self

@app.post("/api/v1/auth/signup", response_model=schemas.UserResponse)
async def signup(user: schemas.UserCreate, db: AsyncSession = Depends(auth.get_db)):
    result = await db.execute(select(models.User).where(models.User.email == user.email))
    db_user = result.scalars().first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(email=user.email, name=user.name, hashed_password=hashed_password)
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@app.post("/api/v1/auth/login", response_model=schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(auth.get_db)):
    result = await db.execute(select(models.User).where(models.User.email == form_data.username))
    user = result.scalars().first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/v1/auth/forgot-password")
async def forgot_password(req: schemas.ForgotPasswordRequest, db: AsyncSession = Depends(auth.get_db)):
    result = await db.execute(select(models.User).where(models.User.email == req.email))
    user = result.scalars().first()
    
    # Always return success even if email not found to prevent email enumeration
    if user:
        token = auth.create_reset_token(email=user.email)
        try:
            email_utils.send_reset_password_email(to_email=user.email, token=token)
        except Exception as e:
            # In a production environment, you might log the error instead of returning it directly
            raise HTTPException(status_code=500, detail="Failed to send email")
            
    return {"message": "If that email is in our system, you will receive a password reset link shortly."}

@app.post("/api/v1/auth/reset-password")
async def reset_password(req: schemas.ResetPasswordRequest, db: AsyncSession = Depends(auth.get_db)):
    email = auth.verify_reset_token(req.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    result = await db.execute(select(models.User).where(models.User.email == email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
        
    user.hashed_password = auth.get_password_hash(req.new_password)
    db.add(user)
    await db.commit()
    
    return {"message": "Password has been reset successfully"}
@app.get("/api/v1/users/me", response_model=schemas.UserResponse)
async def get_current_user_profile(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.put("/api/v1/users/me", response_model=schemas.UserResponse)
async def update_current_user(
    user_update: schemas.UserUpdate, 
    current_user: models.User = Depends(auth.get_current_user), 
    db: AsyncSession = Depends(auth.get_db)
):
    email_changed = user_update.email is not None and user_update.email != current_user.email
    if user_update.name is not None:
        current_user.name = user_update.name
    if user_update.email is not None:
        # Check if email is already taken
        result = await db.execute(select(models.User).where(models.User.email == user_update.email))
        existing_user = result.scalars().first()
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=400, detail="Email already registered by another user")
        current_user.email = user_update.email
        
    if user_update.phone_number is not None:
        current_user.phone_number = user_update.phone_number
    if user_update.nationality is not None:
        current_user.nationality = user_update.nationality
    if user_update.travel_preferences is not None:
        try:
            current_user.travel_preferences = normalise_preferences(current_user.travel_preferences, user_update.travel_preferences)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    response = schemas.UserResponse.model_validate(current_user)
    if email_changed:
        response.access_token = auth.create_access_token(data={"sub": current_user.email}, expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES))
    return response

@app.post("/api/v1/users/me/password")
async def update_password(
    req: schemas.UpdatePasswordRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(auth.get_db)
):
    if not auth.verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    current_user.hashed_password = auth.get_password_hash(req.new_password)
    db.add(current_user)
    await db.commit()
    
    return {"message": "Password updated successfully"}

@app.delete("/api/v1/users/me")
async def delete_current_user(
    current_user: models.User = Depends(auth.get_current_user), 
    db: AsyncSession = Depends(auth.get_db)
):
    from services.agent_checkpoints import delete_user_checkpoints
    await delete_user_checkpoints(current_user.id)
    await db.delete(current_user)
    await db.commit()
    return {"message": "User deleted successfully"}

@app.post("/api/v1/chat")
async def chat_endpoint(req: ChatRequest, current_user: models.User = Depends(auth.get_current_user), db: AsyncSession = Depends(auth.get_db)):
    """
    Receives a message from the user and streams back the Orchestrator's thought process
    and final response using Server-Sent Events (SSE).
    """
    structured_brief=req.trip_brief.model_dump(mode='json') if req.trip_brief else None
    if req.brief_id:
        structured_brief=await owned_brief(db,current_user.id,req.brief_id,req.brief_revision)
    # Ensure conversation exists
    result = await db.execute(select(models.Conversation).where(models.Conversation.id == req.thread_id))
    conv = result.scalar_one_or_none()
    
    if conv and conv.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if not conv:
        # Generate a simple title based on first message
        title = req.message[:30] + "..." if len(req.message) > 30 else req.message
        if "[INTERNAL_SYSTEM]" in title:
            title = "Trip Customization"
            
        conv = models.Conversation(
            id=req.thread_id,
            user_id=current_user.id,
            title=title
        )
        db.add(conv)
        await db.commit()
    else:
        # Update updated_at
        from datetime import datetime, timezone
        conv.updated_at = datetime.now(timezone.utc)
        db.add(conv)
        await db.commit()

    # Save User Message (don't save internal system prompts to UI chat history DB)
    if not req.message.startswith("[INTERNAL_SYSTEM]"):
        user_msg = models.Message(
            conversation_id=req.thread_id,
            role="user",
            content=req.message
        )
        db.add(user_msg)
        await db.commit()

    # Load full chat history to rehydrate Agent (crucial for stateless restarts)
    history_result = await db.execute(select(models.Message).where(models.Message.conversation_id == req.thread_id).order_by(models.Message.created_at.asc()))
    db_history = history_result.scalars().all()
    
    from langchain_core.messages import HumanMessage, AIMessage
    langchain_history = []
    for m in db_history:
        # Avoid passing internal system messages back to LLM to prevent confusion
        if m.content.startswith("[INTERNAL_SYSTEM]"): continue
        if m.role == "user":
            langchain_history.append(HumanMessage(content=m.content))
        else:
            langchain_history.append(AIMessage(content=m.content))

    # Clarification does not initialise a model or call any provider.
    if structured_brief and not research_policy(structured_brief)['ready']:
        policy=research_policy(structured_brief)
        from config.localization import planning_clarification
        answer=planning_clarification(req.locale, policy['missing'])
        db.add(models.Message(conversation_id=req.thread_id,role='ai',content=answer))
        await db.commit()
        async def clarification():
            yield f"data: {json.dumps({'final':True,'response':answer,'user_input_needed':True,'itinerary_complete':False,'missing_fields':policy['missing']})}\n\n"
        return StreamingResponse(clarification(),media_type='text/event-stream')

    from MasarAi import MasarAi
    agent = MasarAi()
    agent.masar_ai_id = req.thread_id
    
    async def sse_generator():
        final_ai_response = None
        try:
            await agent.setup(planning=structured_brief is not None)
            combined_prefs = normalise_preferences(current_user.travel_preferences)
            combined_prefs.update({
                "response_locale": req.locale,
                "name": current_user.name,
                "email": current_user.email,
                "phone_number": current_user.phone_number,
                "nationality": current_user.nationality
            })
            
            # run_stream already yields dictionaries natively, now with full history!
            async for chunk in agent.run_stream(
                message=req.message, 
                history=langchain_history,
                user_id=str(current_user.id), 
                user_preferences=combined_prefs,
                trip_brief=structured_brief
            ):
                if "response" in chunk and chunk["response"]:
                    final_ai_response = chunk["response"]
                # SSE standard format
                yield f"data: {json.dumps(chunk)}\n\n"
                
            # Stream finished, save AI response if available
            if final_ai_response:
                ai_msg = models.Message(
                    conversation_id=req.thread_id,
                    role="ai",
                    content=final_ai_response
                )
                db.add(ai_msg)
                await db.commit()
                
        except Exception as e:
            logging.getLogger(__name__).error('Chat failed (%s)', type(e).__name__)
            yield f"data: {json.dumps({'error': 'The request could not be completed. Please try again.'})}\n\n"
            
    return StreamingResponse(sse_generator(), media_type="text/event-stream")

async def trip_context(db, user_id, trips):
    from passport.models import PassportTrip
    from services.booking_records import BookingOperation, reservation_payloads
    enabled = set((await db.scalars(select(PassportTrip.trip_id).where(PassportTrip.user_id == user_id, PassportTrip.challenges_enabled.is_(True)))).all())
    bookings = list((await db.scalars(select(BookingOperation).where(BookingOperation.user_id == user_id, BookingOperation.trip_id.in_([t.id for t in trips])))).all()) if trips else []
    reservation_rows=reservation_payloads(bookings)
    from domain.mall_challenges import locked_mall_challenges
    from sqlalchemy.orm.attributes import set_committed_value
    locked=await locked_mall_challenges(db, [t.id for t in trips])
    for trip in trips:
        set_committed_value(trip, "itinerary_data", normalise_itinerary(trip.itinerary_data, trip_id=trip.id, locked_challenges=locked.get(trip.id)))
        trip.challenges_enabled = trip.id in enabled
        trip.reservations = [item for item in reservation_rows if item['trip_id'] == trip.id]
    return trips

@app.get("/api/v1/trips", response_model=list[schemas.TripResponse])
async def get_user_trips(current_user: models.User = Depends(auth.get_current_user), db: AsyncSession = Depends(auth.get_db)):
    result = await db.execute(select(models.Trip).where(models.Trip.user_id == current_user.id).order_by(models.Trip.created_at.desc()))
    records = result.scalars().all()
    return await trip_context(db, current_user.id, records)

@app.get("/api/v1/trips/{trip_id}", response_model=schemas.TripResponse)
async def get_single_trip(trip_id: int, current_user: models.User = Depends(auth.get_current_user), db: AsyncSession = Depends(auth.get_db)):
    result = await db.execute(select(models.Trip).where(models.Trip.id == trip_id, models.Trip.user_id == current_user.id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    await trip_context(db, current_user.id, [trip])
    return trip

@app.delete("/api/v1/trips/{trip_id}")
async def delete_user_trip(trip_id: int, background_tasks: BackgroundTasks, current_user: models.User = Depends(auth.get_current_user), db: AsyncSession = Depends(auth.get_db)):
    from passport.service import prepare_evidence_cleanup, schedule_evidence_cleanup
    from passport.models import PassportEvent
    from services.booking_records import BookingOperation
    from sqlalchemy import update, delete
    await db.execute(select(models.User.id).where(models.User.id==current_user.id).with_for_update())
    trip = await db.scalar(select(models.Trip).where(models.Trip.id==trip_id,models.Trip.user_id==current_user.id).with_for_update())
    if not trip:
        raise HTTPException(404, 'Trip not found')
    try:
        await prepare_evidence_cleanup(db,current_user.id,trip_id)
        await db.execute(update(BookingOperation).where(BookingOperation.user_id==current_user.id,BookingOperation.trip_id==trip_id).values(trip_id=None))
        await db.execute(update(models.PlanningRun).where(models.PlanningRun.user_id==current_user.id,models.PlanningRun.trip_id==trip_id).values(trip_id=None,status='cancelled',message='The saved trip was deleted from My Trips.',response=None,lease_token=None,lease_expires_at=None))
        await db.execute(delete(PassportEvent).where(PassportEvent.user_id==current_user.id,PassportEvent.trip_id==trip_id,PassportEvent.type=='notification'))
        await db.delete(trip)
        await db.commit()
    except BaseException:
        await db.rollback()
        db.info.pop('passport_removed_files',None)
        db.info.pop('passport_delete_ids',None)
        raise
    schedule_evidence_cleanup(db,background_tasks)
    return {'message':'Trip deleted successfully','trip_id':trip_id}

@app.post("/api/v1/trips", response_model=schemas.TripResponse)
async def create_user_trip(trip: schemas.TripCreate, current_user: models.User = Depends(auth.get_current_user), db: AsyncSession = Depends(auth.get_db)):
    new_trip = models.Trip(
        user_id=current_user.id,
        title=trip.title,
        destination=trip.destination,
        hero_image_url=trip.hero_image_url,
        duration_days=trip.duration_days,
        budget_tier=trip.budget_tier,
        vibes=trip.vibes,
        featured_hotel=trip.featured_hotel,
        itinerary_data=trip.itinerary_data
    )
    db.add(new_trip)
    await db.commit()
    await db.refresh(new_trip)
    return new_trip

@app.patch("/api/v1/trips/{trip_id}", response_model=schemas.TripResponse)
async def update_user_trip(
    trip_id: int,
    patch: schemas.TripUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(auth.get_db)
):
    await db.execute(select(models.User.id).where(models.User.id == current_user.id).with_for_update())
    result = await db.execute(select(models.Trip).where(models.Trip.id == trip_id, models.Trip.user_id == current_user.id).with_for_update().execution_options(populate_existing=True))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if patch.expected_revision is None:
        raise HTTPException(428, 'Reload the trip and supply expected_revision before editing.')

    await trip_context(db, current_user.id, [trip])
    current_itinerary = normalise_itinerary(trip.itinerary_data, trip_id=trip.id)
    current_revision = current_itinerary.get("revision", 1)

    if patch.expected_revision is not None and patch.expected_revision != current_revision:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Conflict: trip revision is {current_revision}, expected {patch.expected_revision}"
        )

    target_data = patch.itinerary_data if patch.itinerary_data is not None else current_itinerary
    metadata = {}
    if patch.status is not None:
        metadata["status"] = patch.status

    next_revision = current_revision + 1
    metadata["revision"] = next_revision

    try:
        updated_itinerary = normalise_itinerary(
            target_data,
            trip_id=trip.id,
            previous=current_itinerary,
            **metadata
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    from domain.trip_edits import validate_edit
    from passport.models import Challenge
    submitted = list((await db.scalars(select(Challenge).where(Challenge.trip_id == trip.id, Challenge.state.in_(['pending','completed'])))).all())
    protected = {c.payload.get('source_activity_id', c.activity_id) for c in submitted}
    validate_edit(current_itinerary, updated_itinerary, protected)
    if updated_itinerary['days'] != current_itinerary['days']:
        updated_itinerary['planning_review'] = {'version':1,'required_stops_checked':False,'warnings':[{'code':'manual_edit','message':'You edited this itinerary. Recheck required stops, travel times, opening hours and reservations before following it.'}],'omitted_optional':[]}
    trip.itinerary_data = updated_itinerary
    if patch.title is not None:
        trip.title = patch.title
    if patch.destination is not None:
        trip.destination = patch.destination
    if patch.hero_image_url is not None:
        trip.hero_image_url = patch.hero_image_url
    if patch.duration_days is not None:
        trip.duration_days = patch.duration_days
    elif "days" in updated_itinerary and len(updated_itinerary["days"]) > 0:
        trip.duration_days = len(updated_itinerary["days"])
    if patch.budget_tier is not None:
        trip.budget_tier = patch.budget_tier
    if patch.vibes is not None:
        trip.vibes = patch.vibes
    if patch.featured_hotel is not None:
        trip.featured_hotel = patch.featured_hotel

    await db.commit()
    await db.refresh(trip)
    await trip_context(db, current_user.id, [trip])
    return trip

from services.nutiee import nuitee_confirm_booking, ConfirmBookingInput, Guest, Holder

@app.post("/api/v1/bookings/confirm")
async def confirm_direct_booking(req: schemas.ConfirmBookingRequest, current_user: models.User = Depends(auth.get_current_user), db: AsyncSession = Depends(auth.get_db)):
    # Look up the prebooking
    db_result = await db.execute(select(models.PreBooking).where(models.PreBooking.prebook_id == req.prebook_id))
    pre_booking = db_result.scalars().first()
    if not pre_booking:
        raise HTTPException(status_code=404, detail="Prebooking not found")
        
    if pre_booking.user_id != str(current_user.id) and pre_booking.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Prebooking not found")
        
    params = ConfirmBookingInput(
        prebook_id=req.prebook_id,
        holder=Holder(**req.holder.model_dump()),
        guests=[Guest(**{**g.model_dump(), "occupancyNumber": i+1, "email": req.holder.email}) for i, g in enumerate(req.guests)],
        payment_method=req.payment_method
    )
    
    result = await nuitee_confirm_booking(params)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    # Update prebooking status
    pre_booking.status = "CONFIRMED"
    
    # Save booking to db
    new_booking = models.Booking(
        prebooking_id=pre_booking.id,
        user_id=str(current_user.id),
        status="CONFIRMED",
        checkin=result.get("checkin"),
        checkout=result.get("checkout"),
        hotel_info=str(result.get("hotel"))
    )
    db.add(new_booking)
    await db.commit()
    
    return {"message": "Booking confirmed successfully", "booking": result}

@app.get("/api/v1/bookings")
async def get_bookings(current_user: models.User = Depends(auth.get_current_user), db: AsyncSession = Depends(auth.get_db)):
    """
    Retrieves all bookings and pre-bookings from the PostgreSQL database for the authenticated user.
    Useful for populating a 'My Trips' or 'Dashboard' page.
    """
    try:
        # Fetch confirmed bookings
        result = await db.execute(select(models.Booking).where(models.Booking.user_id == str(current_user.id)))
        bookings = result.scalars().all()
        
        # Fetch pending pre-bookings
        pb_result = await db.execute(select(models.PreBooking).where(models.PreBooking.user_id == str(current_user.id)))
        pre_bookings = pb_result.scalars().all()
        
        return {
            "bookings": [
                {
                    "id": b.id, 
                    "checkin": b.checkin, 
                    "checkout": b.checkout, 
                    "hotel_info": b.hotel_info, 
                    "status": b.status
                } for b in bookings
            ],
            "pre_bookings": [
                {
                    "id": pb.id, 
                    "prebook_id": pb.prebook_id, 
                    "room_name": pb.room_name, 
                    "final_price": pb.final_price, 
                    "currency": pb.currency, 
                    "status": pb.status
                } for pb in pre_bookings
            ]
        }
    except Exception as e:
        logging.getLogger(__name__).error('Request failed (%s)', type(e).__name__)
        raise HTTPException(status_code=500, detail='The request could not be completed.') from None

@app.get("/api/v1/conversations", response_model=list[schemas.ConversationResponse])
async def get_user_conversations(current_user: models.User = Depends(auth.get_current_user), db: AsyncSession = Depends(auth.get_db)):
    result = await db.execute(select(models.Conversation).where(models.Conversation.user_id == current_user.id).order_by(models.Conversation.updated_at.desc()))
    return result.scalars().all()

@app.get("/api/v1/conversations/{conversation_id}/messages", response_model=list[schemas.MessageResponse])
async def get_conversation_messages(conversation_id: str, current_user: models.User = Depends(auth.get_current_user), db: AsyncSession = Depends(auth.get_db)):
    # Verify ownership
    result = await db.execute(select(models.Conversation).where(models.Conversation.id == conversation_id, models.Conversation.user_id == current_user.id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    result = await db.execute(select(models.Message).where(models.Message.conversation_id == conversation_id).order_by(models.Message.created_at.asc()))
    return result.scalars().all()

@app.delete("/api/v1/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, current_user: models.User = Depends(auth.get_current_user), db: AsyncSession = Depends(auth.get_db)):
    # Verify ownership
    result = await db.execute(select(models.Conversation).where(models.Conversation.id == conversation_id, models.Conversation.user_id == current_user.id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    from services.agent_checkpoints import delete_conversation_checkpoints
    await delete_conversation_checkpoints(current_user.id, conversation_id)
    await db.delete(conv)
    await db.commit()
    return {"message": "Conversation deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    # Run the server locally on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
