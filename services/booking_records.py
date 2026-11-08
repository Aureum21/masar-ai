"""Durable booking outcomes shared by checkout and agent tools.

An ambiguous provider outcome is retained and never automatically retried. This
module intentionally awards no XP: travel purchases are not challenge evidence.
"""

import hashlib
import json
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal,InvalidOperation

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Column, DateTime, Integer, JSON, String, UniqueConstraint, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

import auth
import models
from database import Base
from services.nutiee import ConfirmBookingInput, nuitee_confirm_booking


class BookingOperation(Base):
    __tablename__ = "booking_operations"
    __table_args__ = (UniqueConstraint("user_id", "kind", "source_key", name="uq_booking_operation_source"),)

    id = Column(String(36), primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    kind = Column(String(16), nullable=False)
    source_key = Column(String(512), nullable=False)
    request_digest = Column(String(64), nullable=False)
    context_key = Column(String(255), nullable=True)
    trip_id = Column(Integer, nullable=True)
    legacy_booking_id = Column(Integer, nullable=True)
    status = Column(String(24), nullable=False, default="PROCESSING")
    environment = Column(String(16), nullable=False, default="unknown")
    provider_reference = Column(String(255), nullable=True)
    result = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    confirmed_at = Column(DateTime(timezone=True), nullable=True)


router = APIRouter(prefix="/api/v1/bookings", tags=["Booking outcomes"])


class TripLink(BaseModel):
    trip_id: int | None = None


@router.get("/records")
async def booking_records(user=Depends(auth.get_current_user), db: AsyncSession = Depends(auth.get_db)):
    records = list((await db.scalars(select(BookingOperation).where(BookingOperation.user_id == user.id).order_by(BookingOperation.created_at.desc()).limit(100))).all())
    return {"records": [event_payload(record) | {"created_at": record.created_at.isoformat(), "total_amount": (record.result or {}).get("total_amount"), "currency": (record.result or {}).get("currency")} for record in records]}


@router.patch("/events/{event_id}/trip")
async def link_booking_trip(event_id: str, payload: TripLink, user=Depends(auth.get_current_user), db: AsyncSession = Depends(auth.get_db)):
    record = await db.scalar(select(BookingOperation).where(BookingOperation.id == event_id, BookingOperation.user_id == user.id))
    if not record:
        raise HTTPException(404, "Booking record not found")
    if payload.trip_id is not None:
        trip = await db.scalar(select(models.Trip).where(models.Trip.id == payload.trip_id, models.Trip.user_id == user.id))
        if not trip:
            raise HTTPException(404, "Trip not found")
    record.trip_id = payload.trip_id
    await db.commit()
    return event_payload(record)


def provider_environment(result=None):
    result = result or {}
    if result.get("sandbox") in (True, 1, "1") or os.getenv("NUTIEE_API_KEY", "").startswith("sand_"):
        return "sandbox"
    # Live environment is explicitly configured, never inferred from a missing flag.
    if result.get("sandbox") in (False, 0, "0") or os.getenv("TRAVEL_PROVIDER_ENVIRONMENT") == "live":
        return "live"
    return "unknown"


def valid_amount(amount,currency):
    try:
        number=Decimal(str(amount))
        if isinstance(amount,bool) or not number.is_finite() or number<0 or not isinstance(currency,str) or len(currency)!=3 or not currency.isascii() or not currency.isalpha():return None
        return {'total_amount':format(number,'f'),'currency':currency.upper()}
    except (InvalidOperation,ValueError,TypeError):return None

def reservation_payloads(operations):
    # Recover prices for earlier bookings from the exact matching accepted hold.
    holds={(op.user_id,op.trip_id,op.kind,(op.result or {}).get('prebook_id')):op for op in operations if op.kind in {'hotel_hold','flight_hold'} and op.status=='HELD'}
    result=[]
    for op in operations:
        item=event_payload(op)
        if op.status=='CONFIRMED' and op.kind in {'hotel','flight'} and item['total_amount'] is None:
            key=op.source_key.removeprefix('prebook:') if op.kind=='flight' else op.source_key
            hold=holds.get((op.user_id,op.trip_id,op.kind+'_hold',key))
            price=valid_amount((hold.result or {}).get('amount'),(hold.result or {}).get('currency')) if hold and hold.environment==op.environment else None
            if price:item.update(price,amount_source='accepted_prebook')
        result.append(item)
    return result

def event_payload(operation):
    result=operation.result or {}
    price=valid_amount(result.get('total_amount'),result.get('currency'))
    return {
        'total_amount':price['total_amount'] if price else None,
        'currency':price['currency'] if price else None,
        'amount_source':result.get('amount_source','provider') if price else None,
        "event_id": operation.id,
        "booking_id": operation.provider_reference,
        "kind": operation.kind,
        "status": operation.status,
        "source": "provider",
        "environment": operation.environment,
        "confirmed_at": operation.confirmed_at.isoformat() if operation.confirmed_at else None,
        "trip_id": operation.trip_id,
    }


def outcome(operation, is_new=False):
    return {
        "message": "Booking confirmed" if operation.status == "CONFIRMED" else "Booking awaiting confirmation",
        "booking": operation.result or {},
        "confirmation": event_payload(operation),
        "is_new_confirmation": bool(is_new and operation.status == "CONFIRMED"),
    }


async def reserve_operation(db, user_id, kind, source_key, payload, *, context_key=None, trip_id=None):
    if not source_key or "mock" in source_key.lower():
        raise HTTPException(400, "Demo offers cannot create a travel booking.")
    if trip_id is not None:
        trip = await db.scalar(select(models.Trip).where(models.Trip.id == trip_id, models.Trip.user_id == user_id))
        if not trip:
            raise HTTPException(404, "Trip not found")
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()
    statement = select(BookingOperation).where(
        BookingOperation.user_id == user_id, BookingOperation.kind == kind, BookingOperation.source_key == source_key
    )
    existing = await db.scalar(statement)
    if existing:
        if existing.request_digest != digest:
            raise HTTPException(409, "This offer already has a booking attempt with different details. Check its status before trying again.")
        if existing.status in ("PROCESSING", "UNKNOWN"):
            raise HTTPException(409, "The previous booking attempt is awaiting reconciliation. Do not submit another payment.")
        if existing.status == "FAILED":
            raise HTTPException(409, "This booking attempt failed. Select a fresh offer before starting a new booking.")
        return existing, False
    operation = BookingOperation(
        id=str(uuid.uuid4()), user_id=user_id, kind=kind, source_key=source_key,
        request_digest=digest, context_key=context_key, trip_id=trip_id,
        status="PROCESSING", environment=provider_environment(),
    )
    db.add(operation)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "This booking is already being processed. Check your reservations.")
    return operation, True


async def persist_outcome(db, operation, result, prebooking=None):
    raw_status = str(result.get("status") or "PENDING").upper()
    reference = result.get("booking_id") or result.get("bookingId") or result.get("booking_reference")
    confirmed = raw_status == "CONFIRMED" and reference and "mock" not in str(reference).lower()
    operation.status = "CONFIRMED" if confirmed else (raw_status if raw_status in {"PENDING", "FAILED", "CANCELLED"} else "UNKNOWN")
    operation.provider_reference = str(reference) if reference else None
    operation.environment = provider_environment(result)
    result=dict(result)
    if prebooking is not None and not valid_amount(result.get('total_amount'),result.get('currency')):
        accepted=valid_amount(prebooking.final_price,prebooking.currency)
        if accepted:result.update(accepted,amount_source='accepted_prebook')
    operation.result = result
    if confirmed:
        operation.confirmed_at = datetime.now(timezone.utc)
    if prebooking is not None:
        prebooking.status = operation.status
        booking = models.Booking(
            prebooking_id=prebooking.id, user_id=str(operation.user_id), status=operation.status,
            checkin=result.get("checkin") or prebooking.checkin,
            checkout=result.get("checkout") or prebooking.checkout,
            hotel_info=json.dumps(result.get("hotel") or {}, ensure_ascii=False),
        )
        db.add(booking)
        await db.flush()
        operation.legacy_booking_id = booking.id
    await db.commit()
    return outcome(operation, is_new=True)


async def failed_outcome(db, operation, error):
    # A timeout, crash, or 5xx can occur after the provider creates an order.
    definitive = isinstance(error, httpx.HTTPStatusError) and 400 <= error.response.status_code < 500
    operation.status = "FAILED" if definitive else "UNKNOWN"
    operation.result = {"status": operation.status}
    await db.commit()
    message = "Provider rejected the booking. Select a fresh offer." if definitive else "Confirmation could not be verified. Check the booking with support before retrying."
    raise HTTPException(502, message)


async def confirm_hotel(db, user_id, params: ConfirmBookingInput, *, context_key=None, trip_id=None, provider=None):
    prebooking = await db.scalar(select(models.PreBooking).where(
        models.PreBooking.prebook_id == params.prebook_id, models.PreBooking.user_id == str(user_id)
    ))
    if not prebooking:
        raise HTTPException(404, "Prebooking not found")
    existing_booking = await db.scalar(select(models.Booking).where(
        models.Booking.prebooking_id == prebooking.id, models.Booking.user_id == str(user_id)
    ))
    if existing_booking:
        operation = await db.scalar(select(BookingOperation).where(BookingOperation.legacy_booking_id == existing_booking.id))
        if operation:
            return outcome(operation)
        # Historical rows have no trustworthy provider reference/environment.
        raise HTTPException(409, "This rate hold already has a reservation. Open it in your receipts.")
    operation, created = await reserve_operation(
        db, user_id, "hotel", params.prebook_id, params.model_dump(), context_key=context_key, trip_id=trip_id
    )
    if not created:
        return outcome(operation)
    provider_params = params.model_copy(update={"client_reference": operation.id})
    try:
        result = await (provider or nuitee_confirm_booking)(provider_params)
        if not isinstance(result, dict) or result.get("error"):
            raise ValueError("Provider did not return a booking")
    except Exception as error:
        return await failed_outcome(db, operation, error)
    return await persist_outcome(db, operation, result, prebooking)


async def request_flight_booking(offer_id, passengers):
    api_key = os.getenv("NUTIEE_API_KEY")
    if not api_key:
        raise ValueError("Flight provider unavailable")
    headers = {"X-API-Key": api_key, "Accept": "application/json"}
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post("https://api.liteapi.travel/v3.0/flights/prebooks", headers=headers, json={"offerId": offer_id})
        response.raise_for_status()
        prebook = response.json().get("data") or {}
        if not prebook.get("prebookId"):
            raise ValueError("Provider did not return a prebook reference")
        response = await client.post("https://api.liteapi.travel/v3.0/flights/bookings", headers=headers, json={
            "prebookId": prebook["prebookId"], "passengers": passengers,
        })
        response.raise_for_status()
        booking = response.json().get("data") or {}
        return {
            "status": booking.get("status") or "PENDING", "booking_id": booking.get("bookingId"),
            "booking_reference": booking.get("bookingReference"),
            "airline_booking_reference": booking.get("providerLocatorCode"),
            "total_amount": prebook.get("pricing", {}).get("totalAmount"),
            "currency": prebook.get("pricing", {}).get("currency"),
            **({"sandbox": booking["sandbox"]} if "sandbox" in booking else {}),
        }


async def confirm_flight(db, user_id, offer_id, passengers, *, context_key=None, trip_id=None, provider=None):
    operation, created = await reserve_operation(
        db, user_id, "flight", offer_id, {"offer_id": offer_id, "passengers": passengers},
        context_key=context_key, trip_id=trip_id,
    )
    if not created:
        return outcome(operation)
    try:
        result = await (provider or request_flight_booking)(offer_id, passengers)
        if not isinstance(result, dict) or result.get("error"):
            raise ValueError("Provider did not return a booking")
    except Exception as error:
        return await failed_outcome(db, operation, error)
    return await persist_outcome(db, operation, result)


@router.get("/events/{event_id}")
async def get_booking_event(event_id: str, user=Depends(auth.get_current_user), db: AsyncSession = Depends(auth.get_db)):
    operation = await db.scalar(select(BookingOperation).where(BookingOperation.id == event_id, BookingOperation.user_id == user.id))
    if not operation:
        raise HTTPException(404, "Booking event not found")
    return event_payload(operation)
