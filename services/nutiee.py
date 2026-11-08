import asyncio
import os
import httpx
from copy import deepcopy
from time import monotonic
from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Dict
from config.runtime import load_environment
from domain.accessibility import provider_evidence

load_environment()
nutiee_api_key = os.getenv("NUTIEE_API_KEY")

class Occupancy(BaseModel):
    rooms: int = Field(..., description="Number of rooms")
    adults: int = Field(..., description="Number of adults")
    children: Optional[int] = Field(None, description="Number of children (omit if 0)")

    @model_validator(mode="before")
    @classmethod
    def remove_zero_children(cls, values):
        if isinstance(values, dict):
            if values.get("children") == 0:
                values.pop("children", None)
        return values
    
class SearchHotelsInput(BaseModel):
    checkin: str = Field(..., description="Check-in date YYYY-MM-DD")
    checkout: str = Field(..., description="Check-out date YYYY-MM-DD")
    currency: str = Field("USD", description="Currency code")
    guestNationality: str = Field(..., description="Guest nationality country code")
    occupancies: List[Occupancy] = Field(..., description="Room occupancy configuration")
    cityName: str = Field(..., description="City name")
    countryCode: str = Field(..., description="Country code")
    maxRatesPerHotel: int = Field(5, description="Maximum rates per hotel")
    hotelNameQuery: Optional[str] = Field(None, description="Optional name to filter results by")
    advancedAccessibilityOnly: bool | None = None
    facilities: list[int] | None = Field(default=None,max_length=30)
    strictFacilityFiltering: bool = True

class HotelInput(BaseModel):
    hotelId: str = Field(..., description="Hotel ID")
    hotelName: str | None = Field(None, description="Hotel name")

class SearchAvailabilityInput(BaseModel):
    hotelIdsandNames: List[HotelInput] = Field(..., description="List of hotel IDs and names")
    occupancies: List[Occupancy] = Field(..., description="Occupancy details")
    guestNationality: str
    currency: str
    checkin: str
    checkout: str
    roomMapping: bool = Field(False, description="Whether room mapping is enabled")
    maxRatesPerHotel: int = Field(5)

class PrebookInput(BaseModel):
    offerId: str = Field(..., description="Offer ID from availability step")

class Holder(BaseModel):
    firstName: str=Field(..., description="User's first name")
    lastName: str=Field(..., description="User's last name")
    email: str=Field(..., description="User's email address")
    phone: str=Field(..., description="User's phone number")

class Guest(BaseModel):
    occupancyNumber: int=Field(..., description="Occupancy number for the guest")
    firstName: str=Field(..., description="Guest's first name")
    lastName: str=Field(..., description="Guest's last name")
    email: str=Field(..., description="Guest's email address")

class ConfirmBookingInput(BaseModel):
    prebook_id: str=Field(..., description="Prebook ID from prebooking step")
    holder: Holder=Field(..., description="Booking holder information")
    guests: List[Guest]=Field(..., description="List of guests")
    payment_method: str = Field("ACC_CREDIT_CARD", description="Payment method: ACC_CREDIT_CARD, NUITEE_PAY, WALLET")


LUXURY_HOTEL_PHOTOS = [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80",
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
]

_DETAIL_CACHE={}
DETAIL_TTL=3600

async def fetch_liteapi_hotel_detail(client: httpx.AsyncClient, hotel_id: str, api_key: str) -> dict:
    if not hotel_id:
        return {}
    cached=_DETAIL_CACHE.get(hotel_id)
    if cached and cached[0]>monotonic():return deepcopy(cached[1])
    try:
        url = "https://api.liteapi.travel/v3.0/data/hotel"
        resp = await client.get(url, params={"hotelId":hotel_id,"advancedAccessibilityOnly":True}, headers={"X-API-Key": api_key}, timeout=6.0)
        if resp.status_code == 200:
            from datetime import datetime,timezone
            details=resp.json().get("data", {})
            if not isinstance(details,dict):return {}
            details={**details,'_accessibility_checked_at':datetime.now(timezone.utc).isoformat()}
            if len(_DETAIL_CACHE)>=100:_DETAIL_CACHE.pop(next(iter(_DETAIL_CACHE)))
            _DETAIL_CACHE[hotel_id]=(monotonic()+DETAIL_TTL,deepcopy(details))
            return details
    except Exception:
        pass
    return {}

async def nuitee_search_hotels(params_obj: SearchHotelsInput) -> dict:
    base_url = "https://api.liteapi.travel/v3.0/hotels/rates"
    headers = {"X-API-Key": nutiee_api_key}
    params = params_obj.model_dump(exclude_none=True, exclude={"hotelNameQuery"})
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(base_url, headers=headers, json=params)
        response.raise_for_status()
        data = response.json()
        raw_hotels = data.get("data", []) or data.get("hotels", [])
        
        if params_obj.hotelNameQuery:
            query = params_obj.hotelNameQuery.lower()
            raw_hotels = [h for h in raw_hotels if query in (h.get("name") or h.get("hotelName") or "").lower()]
            
        selected_raw = raw_hotels[:5]
        
        # Concurrently fetch static metadata (real name, real photos, address, starRating) from LiteAPI
        detail_tasks = [
            fetch_liteapi_hotel_detail(client, h.get("hotelId") or h.get("id"), nutiee_api_key)
            for h in selected_raw
        ]
        hotel_details = await asyncio.gather(*detail_tasks) if detail_tasks else []

        hotels = []
        for i, h in enumerate(selected_raw):
            details = hotel_details[i] if i < len(hotel_details) else {}
            hotel_id = h.get("hotelId") or h.get("id")
            hotel_name = details.get("name") or h.get("name") or h.get("hotelName")
            
            # If name is still missing, fallback to formatted name
            if not hotel_name or hotel_name == "Luxury Hotel":
                hotel_name = f"Premier {params_obj.cityName} Resort & Spa"

            # Extract real photo
            image_url = (
                details.get("main_photo") or 
                details.get("thumbnail") or 
                (details.get("photos", [{}])[0].get("url") if details.get("photos") and len(details.get("photos")) > 0 else None) or
                h.get("thumb") or 
                h.get("image") or
                LUXURY_HOTEL_PHOTOS[i % len(LUXURY_HOTEL_PHOTOS)]
            )
            
            # Location
            location = details.get("address") or f"{params_obj.cityName}, UAE"
            if details.get("city") and details.get("city").lower() not in location.lower():
                location = f"{location}, {details.get('city')}"

            # Rating
            rating = float(details.get("starRating") or details.get("rating") or h.get("starRating") or 4.8)

            # Coordinates
            lat = float(details.get("latitude") or h.get("latitude") or (24.4539 if "abu" in params_obj.cityName.lower() else 25.2048))
            lng = float(details.get("longitude") or h.get("longitude") or (54.3773 if "abu" in params_obj.cityName.lower() else 55.2708))

            # Extract just the starting price (No offerId or roomType needed for search_hotels!)
            price = 0.0
            currency = params_obj.currency or "AED"
            
            room_types = h.get("roomTypes", [])
            if room_types and len(room_types) > 0:
                first_rt = room_types[0]
                rate = first_rt.get("offerRetailRate", {}) or {}
                if isinstance(rate, dict):
                    price = float(rate.get("amount") or 0.0)
                    currency = rate.get("currency", currency)

            hotels.append({
                "hotelId": hotel_id,
                "name": hotel_name,
                "location": location,
                "price": price,
                "currency": currency,
                "rating": rating,
                "lat": lat,
                "lng": lng,
                "imageUrl": image_url,
                "accessibility": provider_evidence({**h,**details},hotel_id)
            })
            
        from services.accessibility_evidence import remember
        for hotel in hotels:remember('property',hotel['hotelId'],hotel['accessibility'])
        return {"hotels": hotels if hotels else []}

async def nuitee_search_availability(params_obj: SearchAvailabilityInput) -> dict | str:
    base_url = "https://api.liteapi.travel/v3.0/hotels/rates?rm=true"
    headers = {"X-API-Key": nutiee_api_key}
    hotel_map = {h.hotelId: h.hotelName for h in params_obj.hotelIdsandNames}
    
    params = {
        "hotelIds": list(hotel_map.keys()),
        "occupancies": [o.model_dump(exclude_none=True) for o in params_obj.occupancies],
        "guestNationality": params_obj.guestNationality,
        "checkin": params_obj.checkin,
        "checkout": params_obj.checkout,
        "currency": params_obj.currency,
        "roomMapping": params_obj.roomMapping,
        "maxRatesPerHotel": params_obj.maxRatesPerHotel
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(base_url, headers=headers, json=params)
        response.raise_for_status()
        all_data = response.json().get("data", [])
        
        if not all_data:
            return "No Available Data for the provided hotel IDs"
            
        rooms = []
        for hotel in all_data:
            hotel_id = hotel.get("hotelId")
            hotel_name = hotel_map.get(hotel_id)
            if len(hotel.get("roomTypes", [])) > 0:
                for roomType in hotel.get("roomTypes"):
                    offer_id = roomType.get("offerId")
                    rate = roomType.get("offerRetailRate", {})
                    price = f"{rate.get('amount')} {rate.get('currency')}"        
                    name = roomType.get("rates")[0].get("name")
                    rooms.append({
                        "hotelId": hotel_id,
                        "hotelName": hotel_name,
                        "offer_id": offer_id,
                        "price": price,
                        "name": name,
                        "image_url": hotel.get("thumb", "") or hotel.get("image", "")
                    })
        return rooms if rooms else "No rooms available for the provided hotel IDs"

async def nuitee_prebook(offerId: str) -> dict:
    base_url = "https://book.liteapi.travel/v3.0/rates/prebook"
    headers = {"X-API-Key": nutiee_api_key}
    params = {"offerId": offerId, "usePaymentSdk": False}
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(base_url, headers=headers, json=params)
        response.raise_for_status()
        data = response.json().get("data")
        
        if not data:
            return {"error": "No prebooking available for the provided offer ID!"}
            
        room_type = data.get('roomTypes')[0]
        rate = room_type.get("rates")[0]
        
        return {
            "prebook_id": data.get("prebookId"),
            "board_type": rate.get('boardName'),
            "final_price": data.get('price'),
            "currency": data.get('currency'),
            "room_name": rate.get("name"),
            "checkin": data.get("checkin"),
            "checkout": data.get("checkout"),
            "remarks": rate.get('remarks'),
            "cancelation_policy": room_type.get('rates')[0].get('cancellationPolicies')
        }

async def nuitee_confirm_booking(params_obj: ConfirmBookingInput) -> dict:
    base_url = "https://book.liteapi.travel/v3.0/rates/book"
    headers = {"X-API-Key": nutiee_api_key}
    
    payload = {
        "holder": params_obj.holder.model_dump(exclude_none=True),
        "guests": [g.model_dump(exclude_none=True) for g in params_obj.guests],
        "payment": {"method": params_obj.payment_method},
        "prebookId": params_obj.prebook_id,
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(base_url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json().get("data")
        
        if not data:
            return {"error": "Booking failed, no data returned"}
            
        return {
            "booking_id": data.get('bookingId') or data.get('booking_id'),
            "status": data.get('status'),
            "checkin": data.get('checkin'),
            "checkout": data.get('checkout'),
            "hotel": data.get('hotel'),
            "firstName": data.get('firstName'),
            "lastName": data.get('lastName'),
            "email": data.get('email'),
            "hotelRemarks": data.get('hotelRemarks'),
            "specialRemarks": data.get('specialRemarks')
        }

class HotelDetailsInput(BaseModel):
    hotelId: str = Field(..., description="Hotel ID")

async def nuitee_get_hotel_details(params_obj: HotelDetailsInput) -> dict:
    url = f"https://api.liteapi.travel/v3.0/data/hotel?hotelId={params_obj.hotelId}"
    headers = {"X-API-Key": nutiee_api_key}
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, headers=headers, params={'advancedAccessibilityOnly':True})
        response.raise_for_status()
        return response.json()

async def nuitee_get_hotel_reviews(params_obj: HotelDetailsInput) -> dict:
    url = f"https://api.liteapi.travel/v3.0/data/reviews?hotelId={params_obj.hotelId}"
    headers = {"X-API-Key": nutiee_api_key}
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        return response.json()

class HotelRoomsInput(BaseModel):
    hotelId: str = Field(..., description="Hotel ID")
    checkin: str = Field(..., description="Check-in date YYYY-MM-DD")
    checkout: str = Field(..., description="Check-out date YYYY-MM-DD")
    occupancies: List[Occupancy] = Field(..., description="Room occupancy configuration")
    guestNationality: str = Field("AE", description="Guest nationality")
    currency: str = Field("AED", description="Currency")

async def nuitee_get_hotel_rooms(params_obj: HotelRoomsInput) -> dict:
    base_url = "https://api.liteapi.travel/v3.0/hotels/rates?rm=true"
    headers = {"X-API-Key": nutiee_api_key}
    params = {
        "hotelIds": [params_obj.hotelId],
        "occupancies": [o.model_dump(exclude_none=True) for o in params_obj.occupancies],
        "guestNationality": params_obj.guestNationality,
        "checkin": params_obj.checkin,
        "checkout": params_obj.checkout,
        "currency": params_obj.currency,
        "roomMapping": True
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        import asyncio
        # 1. Fetch live rates and 2. Fetch static hotel details concurrently
        rates_task = client.post(base_url, headers=headers, json=params)
        details_task = fetch_liteapi_hotel_detail(client, params_obj.hotelId, nutiee_api_key)
        
        rates_response, static_details = await asyncio.gather(rates_task, details_task)
        rates_response.raise_for_status()
        
        all_data = rates_response.json().get("data", [])
        if not all_data:
            return {"error": "No rooms available for this hotel on these dates."}
            
        hotel = all_data[0]
        rooms = []
        static_rooms = static_details.get("rooms", [])
        static_rooms = [room for room in static_rooms if isinstance(room,dict)] if isinstance(static_rooms,list) else []
        
        if len(hotel.get("roomTypes", [])) > 0:
            for roomType in hotel.get("roomTypes")[:5]:
                offer_id = roomType.get("offerId")
                rate = roomType.get("offerRetailRate", {})
                price = rate.get('amount')
                currency = rate.get('currency')
                
                rates = roomType.get("rates", [])
                name = rates[0].get("name") if rates else "Standard Room"
                board = rates[0].get("boardName") if rates else ""
                # Only stable provider mappings establish room-specific evidence.
                mapped_ids={str(r.get('mappedRoomId') or r.get('roomId') or '') for r in rates}
                mapped_ids.discard('')
                mapped_id=next(iter(mapped_ids)) if len(mapped_ids)==1 else None
                matched_room=next((r for r in static_rooms if mapped_id and str(r.get('id'))==mapped_id),None)
                room_evidence=provider_evidence(static_details,params_obj.hotelId,matched_room or {})
                
                # Match images from static details
                room_images = []
                best_match_score = 0
                name_words = set(name.lower().replace('-', ' ').replace(',', ' ').replace('(', ' ').replace(')', ' ').split())
                
                for static_room in static_rooms:
                    s_name = static_room.get("roomName", "")
                    s_words = set(s_name.lower().replace('-', ' ').replace(',', ' ').replace('(', ' ').replace(')', ' ').split())
                    
                    overlap = len(name_words.intersection(s_words))
                    if overlap > best_match_score:
                        best_match_score = overlap
                        photos = static_room.get("photos", [])
                        if photos:
                            room_images = [p.get("url") for p in photos if isinstance(p, dict) and p.get("url")]
                            
                if not room_images:
                    hotel_photos = static_details.get("hotelImages") or static_details.get("photos") or []
                    if hotel_photos:
                        room_images = [p.get("url") for p in hotel_photos if isinstance(p, dict) and p.get("url")][:6]
                    elif static_details.get("main_photo"):
                        room_images = [static_details.get("main_photo")]
                    elif static_details.get("thumbnail"):
                        room_images = [static_details.get("thumbnail")]

                image_url = room_images[0] if room_images else None
                        
                rooms.append({
                    "offerId": offer_id,
                    "price": price,
                    "currency": currency,
                    "name": name,
                    "board": board,
                    "imageUrl": image_url,
                    "images": room_images,
                    "hotelId": params_obj.hotelId,
                    "roomId": mapped_id,
                    "accessibility": room_evidence,
                    "property_accessibility": provider_evidence(static_details,params_obj.hotelId)
                })
        from services.accessibility_evidence import remember
        for room in rooms:remember('room',room['offerId'],room['accessibility'],room['property_accessibility'])
        return {"rooms": rooms}
