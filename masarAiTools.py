import os
import json
from typing import Optional, List, Dict, Any

import resend
# pyrefly: ignore [missing-import]
from langchain_core.runnables import RunnableConfig
# pyrefly: ignore [missing-import]
from langchain_community.utilities import GoogleSerperAPIWrapper
# pyrefly: ignore [missing-import]
from langchain_core.tools import tool
from pydantic import BaseModel, Field, model_validator
from config.runtime import load_environment
import googlemaps
from datetime import datetime
import requests
from portal_scraper import scrape_portal

from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from domain.trips import normalise_itinerary
from services.discovery import DiscoveryQuery, discover, resolve_places, region_for_city, event_date_range
from database import AsyncSessionLocal
import models
from sqlalchemy import select

from services.nutiee import (
    Occupancy, 
    SearchHotelsInput, 
    HotelInput, 
    SearchAvailabilityInput, 
    PrebookInput, 
    Holder, 
    Guest, 
    ConfirmBookingInput,
    nuitee_search_hotels,
    nuitee_search_availability,
    nuitee_prebook,
    nuitee_confirm_booking
)

load_environment()
nutiee_api_key = os.getenv("NUTIEE_API_KEY")


# =============================================================================
# Pydantic Input Schemas
# =============================================================================

class EmailInput(BaseModel):
    subject:str=Field(description="The subject of the email")
    html_body:str=Field(description="The html body of the email")

class HotelDetailsInput(BaseModel):
    hotelId: str = Field(..., description="Hotel ID to get details or reviews for")

@tool(args_schema=HotelDetailsInput)
async def get_hotel_details(hotelId: str):
    """Get detailed information about a specific hotel, including description, facilities, and photos."""
    from services.nutiee import nuitee_get_hotel_details
    try:
        # Wrap it in HotelDetailsInput because nuitee_get_hotel_details expects it
        from services.nutiee import HotelDetailsInput as NutieeHotelDetailsInput
        return await nuitee_get_hotel_details(NutieeHotelDetailsInput(hotelId=hotelId))
    except Exception as e:
        return {"error": f"Failed to fetch hotel details: {e}"}

@tool(args_schema=HotelDetailsInput)
async def get_hotel_reviews(hotelId: str):
    """Get reviews for a specific hotel."""
    from services.nutiee import nuitee_get_hotel_reviews
    try:
        from services.nutiee import HotelDetailsInput as NutieeHotelDetailsInput
        return await nuitee_get_hotel_reviews(NutieeHotelDetailsInput(hotelId=hotelId))
    except Exception as e:
        return {"error": f"Failed to fetch hotel reviews: {e}"}

class HotelRoomsInput(BaseModel):
    hotelId: str = Field(..., description="Hotel ID")
    checkin: str = Field(..., description="Check-in date YYYY-MM-DD")
    checkout: str = Field(..., description="Check-out date YYYY-MM-DD")
    occupancies: List[Occupancy] = Field(..., description="Room occupancy configuration")

@tool(args_schema=HotelRoomsInput)
async def get_hotel_rooms(hotelId: str, checkin: str, checkout: str, occupancies: List[Occupancy]):
    """Fetch available room types and their prices for a specific hotel. Call this when the user wants to browse rooms or see specific room options for a hotel."""
    from services.nutiee import nuitee_get_hotel_rooms
    from services.nutiee import HotelRoomsInput as NutieeHotelRoomsInput
    try:
        params = NutieeHotelRoomsInput(
            hotelId=hotelId,
            checkin=checkin,
            checkout=checkout,
            occupancies=occupancies,
            guestNationality="AE",
            currency="AED"
        )
        return await nuitee_get_hotel_rooms(params)
    except Exception as e:
        return {"error": f"Failed to fetch hotel rooms: {e}"}

class UAESearchInput(BaseModel):
    query:str=Field(description="Search query about UAE travel, transit, transportation, logistics, or tourism")

class TavilySearchInput(BaseModel):
    query: str = Field(description="Research query about UAE tourism, culture, regulations, or travel planning")

class RestaurantSearchInput(BaseModel):
    query: str = Field(description="Restaurant search query e.g. 'best Indian restaurants in Dubai Marina' or 'Emirati cuisine Abu Dhabi'")
    city: str = Field(default="Dubai", description="UAE city to search in")

class PrayerTimesInput(BaseModel):
    city: str = Field(description="UAE city for prayer times (e.g. 'Dubai', 'Abu Dhabi', 'Sharjah')")

class CurrencyInput(BaseModel):
    from_currency: str = Field(default="USD", description="Source currency code (e.g. USD, EUR, GBP)")
    to_currency: str = Field(default="AED", description="Target currency code, usually AED for UAE")
    amount: float = Field(default=1.0, description="Amount to convert")

class LiveEventSearchInput(BaseModel):
    city: str = Field(description="City in the UAE (e.g. 'Dubai', 'Abu Dhabi')")
    date: str = Field(description="Date or date range to search (e.g., '2026-10-15' or 'this weekend')")
    keyword: Optional[str] = Field(None, description="Optional keyword like 'music', 'sports', or artist name")

class PortalKnowledgeSearchInput(BaseModel):
    query: str = Field(description="Question about UAE tourism: visa rules, heritage sites, museums, cultural guidelines, attractions, or government policies")

class ScrapePortalInput(BaseModel):
    portal: str = Field(description="Which portal to scrape: 'visitdubai', 'visitabudhabi', or 'uae_gov'")
    section: str = Field(description="Which section to scrape: 'events', 'deals', 'attractions', 'hotels', 'news', or 'visas' (uae_gov only)")

class GoogleMapsRouteInput(BaseModel):
    origin: str = Field(description="Starting point in the UAE (e.g. 'Dubai Marina', 'Abu Dhabi Airport')")
    destination: str = Field(description="Ending point in the UAE")
    mode: str = Field(default="driving", description="Mode of transit: 'driving', 'transit', or 'walking'")

class TaxiFareInput(BaseModel):
    distance_km: float = Field(description="Distance of the trip in kilometers")
    duration_mins: float = Field(description="Estimated duration of the trip in minutes")
    emirate: str = Field(default="Dubai", description="Emirate where the trip takes place (e.g., 'Dubai', 'Abu Dhabi')")
    is_airport_pickup: bool = Field(default=False, description="True if the trip originates from an airport")

class UAEWeatherInput(BaseModel):
    city: str = Field(description="City or emirate in the UAE (e.g. 'Dubai', 'Abu Dhabi')")

class GooglePlacesSearchInput(BaseModel):
    query: str = Field(description="Search query for Google Places (e.g., 'romantic hotels near Burj Khalifa')")

class SimpleSearchHotelsInput(BaseModel):
    checkin: str = Field(description="Check-in date YYYY-MM-DD")
    checkout: str = Field(description="Check-out date YYYY-MM-DD")
    cityName: str = Field(description="City name in the UAE (e.g., 'Dubai')")
    occupancies: List[Occupancy] = Field(description="Room occupancy configuration")
    guestNationality: str = Field(default="AE", description="Guest nationality country code (e.g., 'AE', 'US')")
    hotelNameQuery: Optional[str] = Field(None, description="Specific hotel name to search for (from Google Places)")

class SimpleAvailabilityInput(BaseModel):
    hotelIdsandNames: List[HotelInput] = Field(description="List of hotel IDs and names to check")
    checkin: str = Field(description="Check-in date YYYY-MM-DD")
    checkout: str = Field(description="Check-out date YYYY-MM-DD")
    occupancies: List[Occupancy] = Field(description="Occupancy details")
    guestNationality: str = Field(default="AE", description="Guest nationality country code")



# =============================================================================
# ACCOMMODATION TOOLS (Nuitee API & Google Places)
# =============================================================================

@tool(args_schema=GooglePlacesSearchInput)
def search_google_places(query: str) -> str:
    """Discover UAE hotels or places through the same provider service used by Explore.
    Results are discovery leads; verify details and use search_hotels for dated room rates."""
    return discover(DiscoveryQuery(category='locations', query=query)).model_dump_json()

@tool(args_schema=SimpleSearchHotelsInput)
async def search_hotels(checkin: str, checkout: str, cityName: str, occupancies: List[Occupancy], guestNationality: str = "AE", hotelNameQuery: Optional[str] = None, config: RunnableConfig = None):
    """Search for hotels using the Nuitee API. Use this to find available hotels in a UAE city based on dates, guest nationality, and room requirements."""
    from domain.accessibility import support_rows
    brief=(config or {}).get('configurable',{}).get('trip_brief',{}).get('brief',{})
    mobility=any(set(row.get('needs',[])) & {'step_free','wheelchair_room'} for row in support_rows(brief))
    params = SearchHotelsInput(
        checkin=checkin, checkout=checkout, currency="AED", guestNationality=guestNationality,
        occupancies=occupancies, cityName=cityName, countryCode="AE", maxRatesPerHotel=5,
        hotelNameQuery=hotelNameQuery, advancedAccessibilityOnly=True if mobility else None
    )
    try:
        return await nuitee_search_hotels(params)
    except Exception as e:
        return {"error": f"Failed to search hotels: {e}"}

@tool(args_schema=SimpleAvailabilityInput)
async def search_for_availability(hotelIdsandNames: List[HotelInput], occupancies: List[Occupancy], checkin: str, checkout: str, guestNationality: str = "AE"):
    """Search for room availability for specific hotels. Use this after finding hotels to check which rooms are actually available and get offer IDs for booking."""
    params = SearchAvailabilityInput(
        hotelIdsandNames=hotelIdsandNames, occupancies=occupancies, guestNationality=guestNationality,
        currency="AED", checkin=checkin, checkout=checkout, roomMapping=False, maxRatesPerHotel=5
    )
    try:
        return await nuitee_search_availability(params)
    except Exception as e:
        return {"error": f"Failed to search availability: {e}"}
    
@tool(args_schema=PrebookInput)                   
async def makePrebook(offerId: str, config: RunnableConfig):
    """Make a prebook for a specific offer ID using the Nuitee API. Use this to lock in a hotel room offer before final confirmation."""
    user_id = config.get("configurable", {}).get("user_id")
    if not user_id: return {"error": "User authentication required"}
    try:
        result = await nuitee_prebook(offerId)
        if "error" in result: return result
            
        # 2. Save to database
        async with AsyncSessionLocal() as db:
            new_prebook = models.PreBooking(
                prebook_id=result.get("prebook_id"),
                user_id=user_id,
                board_type=result.get("board_type"),
                final_price=str(result.get("final_price")),
                currency=result.get("currency"),
                room_name=result.get("room_name"),
                checkin=result.get("checkin"),
                checkout=result.get("checkout"),
                status="PENDING"
            )
            db.add(new_prebook)
            await db.commit()
        # 3. Return the exact markdown needed for the UI
        import json
        details = {
            "hotelName": result.get("room_name", "Selected Hotel"),
            "price": f"{result.get('final_price')} {result.get('currency')}",
            "location": "UAE"
        }
        return f"[PREBOOK_ID: {result.get('prebook_id')}]\n[PREBOOK_DETAILS: {json.dumps(details)}]"
    except Exception as e:
        return {"error": f"Failed to process prebooking: {e}"}

@tool(args_schema=ConfirmBookingInput)
async def confirm_booking(prebook_id: str, holder: Dict[str, str] | Holder, guests: List[Dict[str, str]] | List[Guest], config: RunnableConfig, payment_method: str = "ACC_CREDIT_CARD"):
    """Confirm a hotel booking using a prebook ID. This is the final step to complete a hotel reservation."""
    user_id = config.get("configurable", {}).get("user_id")
    if not user_id: return {"error": "User authentication required"}
    
    async with AsyncSessionLocal() as ownership_db:
        row = await ownership_db.execute(select(models.PreBooking).where(models.PreBooking.prebook_id == prebook_id))
        owned = row.scalars().first()
        if not owned or str(owned.user_id) != str(user_id):
            return {"error": "Prebooking not found"}

    # Clean up LangChain inputs
    if isinstance(holder, dict): holder = Holder(**holder)
    parsed_guests = [Guest(**g) if isinstance(g, dict) else g for g in guests]
    
    params = ConfirmBookingInput(prebook_id=prebook_id, holder=holder, guests=parsed_guests, payment_method=payment_method)
    
    try:
        result = await nuitee_confirm_booking(params)
        if "error" in result: return result
        
        # 2. Save to database
        async with AsyncSessionLocal() as db:
            db_result = await db.execute(select(models.PreBooking).where(models.PreBooking.prebook_id == prebook_id))
            pre_booking = db_result.scalars().first()
            if pre_booking: pre_booking.status = "CONFIRMED"
                
            new_booking = models.Booking(
                prebooking_id=pre_booking.id if pre_booking else None,
                user_id=user_id, status="CONFIRMED",
                checkin=result.get("checkin"), checkout=result.get("checkout"), hotel_info=str(result.get("hotel"))
            )
            db.add(new_booking)
            await db.commit()
        return result
    except Exception as e:
        return {"error": f"Failed to confirm booking: {e}"}


# =============================================================================
# LOGISTICS TOOLS (UAE Transit & Transportation)
# =============================================================================

@tool(args_schema=UAESearchInput)
def search_web_uae(query: str) -> str:
    """Search the web for UAE-specific travel, transit, tourism, and logistics information.
    Prefers Tavily AI search for high-quality structured results. Falls back to Serper.
    Use for: metro schedules, bus routes, inter-emirate travel, general UAE tourism facts."""
    # Try Tavily first (higher quality for agents)
    tavily_key = os.getenv("TAVILY_API_KEY")
    if tavily_key:
        try:
            from tavily import TavilyClient
            client = TavilyClient(api_key=tavily_key)
            result = client.search(
                query=f"UAE {query}",
                search_depth="basic",
                max_results=5,
                include_answer=True
            )
            if result.get("answer"):
                return f"[Tavily] {result['answer']}\n\nSources:\n" + "\n".join(
                    f"- {r['title']}: {r['content'][:200]}" for r in result.get("results", [])[:3]
                )
        except Exception as e:
            pass  # Fall through to Serper

    # Fallback: Serper
    try:
        search = GoogleSerperAPIWrapper(k=5)
        results = search.run(f"UAE {query}")
        return results
    except Exception as e:
        return f"Failed to search UAE info: {e}"

@tool(args_schema=GoogleMapsRouteInput)
def get_route_directions(origin: str, destination: str, mode: str = "driving") -> Dict:
    """Get precise travel times, distances, and step-by-step routes using Google Maps.
    Use this to find exact driving routes, or 'transit' to find RTA Metro/Bus options between two places in the UAE."""
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        return {"error": "Google Maps API key not configured"}
    
    try:
        gmaps = googlemaps.Client(key=api_key)
        now = datetime.now()
        directions_result = gmaps.directions(origin, destination, mode=mode, departure_time=now)
        
        if not directions_result:
            return {"error": f"No routes found from {origin} to {destination} using mode {mode}"}
            
        leg = directions_result[0]['legs'][0]
        
        response = {
            "distance_text": leg['distance']['text'],
            "distance_value_km": leg['distance']['value'] / 1000,
            "duration_text": leg['duration']['text'],
            "duration_value_mins": leg['duration']['value'] / 60,
            "start_address": leg['start_address'],
            "end_address": leg['end_address'],
            "steps": []
        }
        
        for step in leg['steps']:
            step_info = f"{step['html_instructions']} ({step['distance']['text']}, {step['duration']['text']})"
            # Strip basic HTML tags returned by Google
            step_info = step_info.replace('<b>', '').replace('</b>', '').replace('<div style="font-size:0.9em">', ' - ').replace('</div>', '')
            response["steps"].append(step_info)
            
        return response
    except Exception as e:
        return {"error": f"Failed to get route: {e}"}

@tool(args_schema=TaxiFareInput)
def estimate_taxi_fare(distance_km: float, duration_mins: float, emirate: str = "Dubai", is_airport_pickup: bool = False) -> Dict:
    """Calculate an estimated taxi fare and Careem (ride-hailing) fare in the UAE.
    Use this AFTER calling get_route_directions to estimate the cost of a car trip."""
    try:
        emirate = emirate.lower()
        
        # Dubai basic calculation
        if "dubai" in emirate:
            # RTA Standard Taxi
            taxi_base = 25 if is_airport_pickup else 12  # App booking or street hail
            taxi_per_km = 2.14
            taxi_total = taxi_base + (distance_km * taxi_per_km)
            
            # Careem Economy (Rough Estimate)
            careem_base = 15
            careem_per_km = 2.5
            careem_per_min = 0.5
            careem_total = careem_base + (distance_km * careem_per_km) + (duration_mins * careem_per_min)
            if is_airport_pickup:
                careem_total += 30 # Airport surcharge
                
            return {
                "emirate": "Dubai",
                "rta_taxi_aed": round(taxi_total, 2),
                "careem_economy_aed": round(careem_total, 2),
                "currency": "AED",
                "notes": "Fares are estimates. Tolls (Salik) of 4 AED per gate are NOT included but may apply."
            }
            
        # Abu Dhabi basic calculation
        elif "abu dhabi" in emirate:
            taxi_base = 25 if is_airport_pickup else 5.5
            taxi_per_km = 1.82
            taxi_total = taxi_base + (distance_km * taxi_per_km)
            
            return {
                "emirate": "Abu Dhabi",
                "itc_taxi_aed": round(taxi_total, 2),
                "currency": "AED",
                "notes": "Fares are estimates. Darb tolls may apply during peak hours."
            }
            
        else:
            return {"error": "Fare estimation currently only supports Dubai and Abu Dhabi"}
            
    except Exception as e:
        return {"error": f"Failed to calculate fare: {e}"}

@tool(args_schema=UAEWeatherInput)
def get_uae_weather(city: str) -> Dict:
    """Get the REAL current weather and temperature for a UAE city using Open-Meteo (free, no API key).
    Use this to determine if walking between transit stations is viable (extreme heat in UAE summers).
    If temperature is above 35C, ALWAYS recommend indoor transport (taxi/metro) instead of walking."""
    # UAE city coordinates for Open-Meteo
    UAE_COORDS = {
        "dubai":           {"lat": 25.2048, "lon": 55.2708},
        "abu dhabi":       {"lat": 24.4539, "lon": 54.3773},
        "abu-dhabi":       {"lat": 24.4539, "lon": 54.3773},
        "sharjah":         {"lat": 25.3462, "lon": 55.4209},
        "ajman":           {"lat": 25.4052, "lon": 55.5136},
        "ras al khaimah":  {"lat": 25.7895, "lon": 55.9432},
        "fujairah":        {"lat": 25.1288, "lon": 56.3265},
        "umm al quwain":   {"lat": 25.5647, "lon": 55.5554},
        "hatta":           {"lat": 24.7994, "lon": 56.1161},
    }
    city_key = city.lower().strip()
    coords = UAE_COORDS.get(city_key)

    # Fallback: try partial match
    if not coords:
        for key, val in UAE_COORDS.items():
            if key in city_key or city_key in key:
                coords = val
                break

    if not coords:
        coords = UAE_COORDS["dubai"]  # Default to Dubai

    try:
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": coords["lat"],
            "longitude": coords["lon"],
            "current": "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
            "timezone": "Asia/Dubai",
            "forecast_days": 1,
        }
        resp = requests.get(url, params=params, timeout=8)
        resp.raise_for_status()
        data = resp.json()
        current = data["current"]

        # WMO weather code to description
        wmo_codes = {
            0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
            45: "Foggy", 48: "Depositing rime fog",
            51: "Light drizzle", 61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
            80: "Slight showers", 81: "Moderate showers", 82: "Violent showers",
            95: "Thunderstorm",
        }
        weather_code = current.get("weather_code", 0)
        condition = wmo_codes.get(weather_code, f"Code {weather_code}")
        temp = current["temperature_2m"]
        feels_like = current["apparent_temperature"]
        humidity = current["relative_humidity_2m"]

        outdoor_warning = ""
        if temp >= 40:
            outdoor_warning = "EXTREME HEAT: Prolonged outdoor exposure is dangerous. Use air-conditioned transport (metro/taxi)."
        elif temp >= 35:
            outdoor_warning = "VERY HOT: Walking outdoors is uncomfortable. Recommend metro or taxi between locations."
        elif temp >= 28:
            outdoor_warning = "Warm weather. Short walks are fine but carry water."

        return {
            "city": city,
            "temperature_celsius": temp,
            "feels_like_celsius": feels_like,
            "humidity_percent": humidity,
            "condition": condition,
            "is_day": 6 <= datetime.now().hour <= 19,
            "outdoor_recommendation": outdoor_warning or "Pleasant conditions for outdoor activities.",
            "data_source": "Open-Meteo (real-time)",
        }
    except Exception as e:
        # Final fallback: month-based estimate with clear labeling
        month = datetime.now().month
        if 5 <= month <= 9:
            temp = 42
            condition = "Sunny and extremely hot (summer)"
        elif month in (10, 11, 3, 4):
            temp = 30
            condition = "Warm"
        else:
            temp = 24
            condition = "Pleasant"
        return {
            "city": city,
            "temperature_celsius": temp,
            "condition": condition,
            "outdoor_recommendation": "Very hot — use metro/taxi" if temp >= 35 else "Pleasant for outdoor activities.",
            "data_source": f"Estimated (Open-Meteo unavailable: {e})",
        }

@tool(args_schema=PrayerTimesInput)
def get_prayer_times(city: str) -> Dict:
    """Get today's Islamic prayer times for a UAE city.
    Use this when scheduling activities around mosques or during Ramadan."""
    try:
        url = f"http://api.aladhan.com/v1/timingsByCity?city={city}&country=United Arab Emirates&method=8"
        resp = requests.get(url, timeout=5)
        resp.raise_for_status()
        data = resp.json()["data"]["timings"]
        return {
            "city": city,
            "Fajr": data["Fajr"],
            "Dhuhr": data["Dhuhr"],
            "Asr": data["Asr"],
            "Maghrib": data["Maghrib"],
            "Isha": data["Isha"],
            "notes": "Prayer times change daily. Do not schedule mosque visits during these times (especially Friday Dhuhr)."
        }
    except Exception as e:
        return {"error": f"Could not fetch prayer times: {e}"}

@tool(args_schema=CurrencyInput)
def get_currency_rate(from_currency: str, to_currency: str = "AED", amount: float = 1.0) -> Dict:
    """Convert a currency amount to AED (or vice versa).
    The UAE Dirham (AED) is pegged to the USD at 3.6725.
    Use this to help tourists understand costs in their home currency."""
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()
    
    # Fast path for USD peg
    if from_currency == "USD" and to_currency == "AED":
        return {"amount": amount, "from": "USD", "to": "AED", "result": round(amount * 3.6725, 2)}
    if from_currency == "AED" and to_currency == "USD":
        return {"amount": amount, "from": "AED", "to": "USD", "result": round(amount / 3.6725, 2)}
        
    try:
        url = f"https://api.exchangerate-api.com/v4/latest/{from_currency}"
        resp = requests.get(url, timeout=5)
        resp.raise_for_status()
        rates = resp.json().get("rates", {})
        if to_currency in rates:
            rate = rates[to_currency]
            return {
                "amount": amount,
                "from": from_currency,
                "to": to_currency,
                "rate": rate,
                "result": round(amount * rate, 2)
            }
        return {"error": f"Currency {to_currency} not found in rates"}
    except Exception as e:
        return {"error": f"Could not fetch live exchange rates: {e}"}

@tool(args_schema=RestaurantSearchInput)
def search_restaurants(query: str, city: str = 'Dubai') -> str:
    """Search UAE restaurants using Explore's shared discovery service. Confirm hours before visiting."""
    try:
        result = discover(DiscoveryQuery(category='restaurants', query=query, region=region_for_city(city)))
        return _discovery_events(result)
    except ValueError:
        return 'Choose a UAE emirate for the restaurant search.'


def _discovery_events(result):
    # Preserve the current event-card contract and include typed source identities.
    data = result.model_dump(mode='json')
    data['events'] = [{'name': p.title, 'date': p.eventDate or 'Opening hours not verified',
        'venue': p.neighborhood, 'description': p.tagline, 'imageUrl': p.images[0] if p.images else None,
        'link': p.sourceUrl, 'place_id': p.id, 'source': p.sourceLabel} for p in result.items]
    return json.dumps(data)



# =============================================================================
# EVENT TOOLS (UAE Events, Heritage, Culture — RAG & Live APIs)
# =============================================================================

# Global variable to cache the vector store
_vector_store = None

FAISS_INDEX_PATH = "data/faiss_index"
LEGACY_CULTURE_FILE = "data/uae_culture.txt"

def _get_vector_store():
    """Load the FAISS vector store. Tries the pre-built index first, falls back to rebuilding."""
    global _vector_store
    if _vector_store is not None:
        return _vector_store
    try:
        # 1. Try loading the pre-built persistent FAISS index (fastest)
        if os.path.exists(FAISS_INDEX_PATH):
            embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
            _vector_store = FAISS.load_local(
                FAISS_INDEX_PATH, embeddings, allow_dangerous_deserialization=True
            )
            print("[OK] FAISS index loaded from disk.")
            return _vector_store

        # 2. Fallback: build from legacy uae_culture.txt
        if os.path.exists(LEGACY_CULTURE_FILE):
            print("[WARN] FAISS index not found. Falling back to uae_culture.txt.")
            print("   Run: python ingest_knowledge.py  to build the full index.")
            loader = TextLoader(LEGACY_CULTURE_FILE, encoding="utf-8")
            docs = loader.load()
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=80)
            splits = text_splitter.split_documents(docs)
            embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
            _vector_store = FAISS.from_documents(splits, embeddings)
            return _vector_store

        print("❌ No knowledge base found. Run: python ingest_knowledge.py")
        return None
    except Exception as e:
        print(f"Failed to load vector store: {e}")
        return None

@tool(args_schema=PortalKnowledgeSearchInput)
def search_portal_knowledge(query: str) -> str:
    """Search the Masar AI official UAE knowledge base — sourced from Visit Dubai, Visit Abu Dhabi, and the UAE Government Portal (u.ae).
    Use this FIRST for any query about:
    - Permanent attractions (Louvre Abu Dhabi, Sheikh Zayed Mosque, Burj Khalifa)
    - UAE visa rules, entry requirements, customs regulations
    - Cultural guidelines, dress codes, Ramadan etiquette
    - Attraction ticket prices and opening hours
    - UAE travel safety, currency, and practical information
    This is your fastest source of authoritative, factual UAE information."""
    store = _get_vector_store()
    if not store:
        return "Error: UAE Knowledge Base is not loaded. Please run: python ingest_knowledge.py"
    
    docs = store.similarity_search(query, k=4)
    if not docs:
        return "No relevant information found in the official UAE knowledge base for this query."

    results = []
    for doc in docs:
        source = doc.metadata.get('source', 'official_portal')
        results.append(f"[Source: {source}]\n{doc.page_content}")
        
    return "\n\n---\n\n".join(results)

@tool(args_schema=ScrapePortalInput)
def scrape_official_portal(portal: str, section: str) -> str:
    """Dynamically scrape a LIVE page from an official UAE tourism portal for real-time, up-to-date information.
    Use this when you need CURRENT data that may have changed since the knowledge base was last updated.
    
    Best used for:
    - Current events calendar and what's happening NOW in Dubai/Abu Dhabi
    - Live hotel deals and promotions active this week/month
    - New restaurant or attraction openings
    - Latest government travel advisories or visa policy updates
    - Dubai Summer Surprises or seasonal promotions

    portal options: 'visitdubai', 'visitabudhabi', 'uae_gov'
    section options: 'events', 'deals', 'attractions', 'hotels', 'news', 'visas' (uae_gov only)
    
    Results are cached for 15 minutes to avoid overloading the portals."""
    return scrape_portal(portal, section)

@tool(args_schema=LiveEventSearchInput)
def search_live_events(city: str, date: str, keyword: Optional[str] = None) -> str:
    """Find dated UAE events through Explore's Ticketmaster service.
    Date: YYYY-MM-DD, two ISO dates, today, tomorrow, or this weekend. Other phrases need clarification."""
    try:
        start, end = event_date_range(date)
        return _discovery_events(discover(DiscoveryQuery(category='events', region=region_for_city(city),
            query=keyword or '', start_date=start, end_date=end)))
    except ValueError:
        return 'Please provide a UAE emirate and exact event dates (YYYY-MM-DD or an ISO date range).'


@tool
def resolve_discovery_places(ids: List[str]) -> str:
    """Resolve shortlisted google:PLACE_ID or ticketmaster:EVENT_ID references from a Trip Brief.
    Refresh these identities before planning. Unavailable results require clarification, never invention.
    Discovery does not establish challenge eligibility or booked availability."""
    if len(ids) > 30:
        return 'Resolve at most 30 place IDs at a time.'
    return json.dumps(resolve_places(ids))



# =============================================================================
# ORCHESTRATOR TOOLS (Email — only the brain sends emails)
# =============================================================================

@tool(args_schema=EmailInput)
def send_email(subject:str, html_body:str) -> Dict[str,str]:  
    """Sends an email with the given body. Use this to send itinerary summaries, 
    booking confirmations, or hotel details to the user."""
    resend.api_key = os.getenv("RESEND_API_KEY")
    resend.Emails.send({
    "from": "onboarding@resend.dev",
    "to": "efakdr2@gmail.com",
    "subject": f"{subject}",
    "html": f"<p>{html_body}</strong>!</p>"
    })
    return {"status":"success"}
    

class TripItineraryDay(BaseModel):
    date: Optional[str] = None
    day_number: int
    theme: str
    accessibility_notes: List[str] = Field(default_factory=list,max_length=60,description='Daily unresolved support confirmations, rest arrangements and route/walking estimates. Never claim unknown accessibility is confirmed.')
    activities: List[Dict[str, Any]] = Field(description="Activities with exact selection_id/place_id/product_id, title, description, location, estimated cost, optional HH:MM start_time/end_time or duration_minutes, travel_minutes_from_previous and event_date when known. Optional challenge must be a catalogue key; never invent venue verification or rewards.")

class TripInput(BaseModel):
    omissions: List[Dict[str,str]] = Field(default_factory=list,description='For each omitted optional selected stop: selection_id and reason. Must-visits cannot be omitted.')
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    title: str = Field(description="Catchy title for the trip, e.g. '5-Day Luxury Dubai Getaway'")
    destination: str = Field(description="The primary destination, e.g. 'Dubai, UAE'")
    hero_image_url: Optional[str] = Field(description="URL of a representative image for the destination or hotel")
    duration_days: int = Field(description="Number of days the trip spans")
    budget_tier: str = Field(description="E.g., 'Premium', 'Ultra-Luxury', 'Mid-Range'")
    vibes: List[str] = Field(description="List of themes, e.g. ['Relaxation', 'Culture', 'Fine Dining']")
    featured_hotel: Optional[Dict[str, str]] = Field(description="Dict with 'name', 'rating', 'price' of the main recommended hotel")
    itinerary_days: List[TripItineraryDay] = Field(description="The day-by-day structured itinerary")

@tool(args_schema=TripInput)
async def save_trip_to_database(
    title: str,
    destination: str,
    duration_days: int,
    budget_tier: str,
    vibes: List[str],
    itinerary_days: List[TripItineraryDay],
    config: RunnableConfig,
    hero_image_url: str = None,
    featured_hotel: Dict[str, str] = None,
    start_date: str = None,
    end_date: str = None,
    omissions: List[Dict[str,str]] = None,
) -> Dict[str, Any]:
    """Saves a fully curated, premium structured trip itinerary directly to the user's Masar AI database account.
    MUST be called by the agent when it has finished curating the itinerary, BEFORE responding to the user.
    """
    user_id = config.get("configurable", {}).get("user_id")
    if not user_id:
        return {"error": "User authentication required"}
        
    itinerary_data = {"days": [day.model_dump() for day in itinerary_days]}
    structured_brief=config.get('configurable',{}).get('trip_brief')
    if structured_brief:
        # Dates come from validated user choices, not a model-invented arrival date.
        start_date=structured_brief['brief']['start_date']
        end_date=structured_brief['brief']['end_date']
        from domain.itinerary_validation import validate_proposal,PlanConflict
        try:
            itinerary_data=validate_proposal(itinerary_data,structured_brief,duration_days,omissions)
        except PlanConflict as conflict:
            return {'status':'validation_error','issues':conflict.issues,'message':'Repair these conflicts before saving. Do not omit required stops or invent verification.'}
    
    from domain.time_travel_planning import require_visit
    from domain.itinerary_validation import PlanConflict
    try:
        itinerary_data = require_visit(itinerary_data, structured_brief,
            seed=config.get('configurable', {}).get('time_travel_seed'))
    except PlanConflict as conflict:
        return {'status':'validation_error','issues':conflict.issues,'message':'Add a Time Travel heritage visit and repair the schedule before saving.'}

    try:
        async with AsyncSessionLocal() as db:
            new_trip = models.Trip(
                user_id=int(user_id),
                title=title,
                destination=destination,
                hero_image_url=hero_image_url,
                duration_days=duration_days,
                budget_tier=budget_tier,
                vibes=vibes,
                featured_hotel=featured_hotel,
                itinerary_data=normalise_itinerary(itinerary_data, trip_id=str(__import__("uuid").uuid4()), start_date=start_date, end_date=end_date)
            )
            run_id=config.get('configurable',{}).get('planning_run_id')
            if run_id:
                from services.planning_runs import save_run_trip
                return await save_run_trip(db,run_id,config['configurable'].get('planning_lease_token'),user_id,new_trip)
            db.add(new_trip)
            await db.commit()
            await db.refresh(new_trip)
            
        return {"status": "success", "trip_id": new_trip.id, "message": "Trip saved successfully"}
    except Exception as e:
        return {'status':'save_error','issues':[{'code':'save_failed','message':'The trip could not be saved. Retry when the service is available.','field':'itinerary'}],'message':'Trip save failed; no success was confirmed.'}

@tool
async def get_trip_from_database(trip_id: int, config: RunnableConfig) -> Dict[str, Any]:
    """Fetches an existing trip itinerary from the database by its ID. Use this when the user asks to modify or customize a specific trip."""
    user_id = config.get("configurable", {}).get("user_id")
    if not user_id:
        return {"error": "User authentication required"}
        
    try:
        from sqlalchemy.future import select
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(models.Trip).where(models.Trip.id == trip_id, models.Trip.user_id == int(user_id)))
            trip = result.scalar_one_or_none()
            if not trip:
                return {"error": f"Trip with ID {trip_id} not found or you don't have access to it."}
            
            return {
                "id": trip.id,
                "title": trip.title,
                "destination": trip.destination,
                "duration_days": trip.duration_days,
                "budget_tier": trip.budget_tier,
                "vibes": trip.vibes,
                "featured_hotel": trip.featured_hotel,
                "itinerary_data": normalise_itinerary(trip.itinerary_data, trip_id=trip.id)
            }
    except Exception as e:
        return {"error": f"Failed to fetch trip: {e}"}

class TripUpdateInput(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    trip_id: int = Field(description="The ID of the trip to update in the database")
    title: str = Field(description="Catchy title for the trip, e.g. '5-Day Luxury Dubai Getaway'")
    destination: str = Field(description="The primary destination, e.g. 'Dubai, UAE'")
    hero_image_url: Optional[str] = Field(description="URL of a representative image for the destination or hotel")
    duration_days: int = Field(description="Number of days the trip spans")
    budget_tier: str = Field(description="E.g., 'Premium', 'Ultra-Luxury', 'Mid-Range'")
    vibes: List[str] = Field(description="List of themes, e.g. ['Relaxation', 'Culture', 'Fine Dining']")
    featured_hotel: Optional[Dict[str, str]] = Field(description="Dict with 'name', 'rating', 'price' of the main recommended hotel")
    itinerary_days: List[TripItineraryDay] = Field(description="The day-by-day structured itinerary")

@tool(args_schema=TripUpdateInput)
async def update_trip_in_database(
    trip_id: int,
    title: str,
    destination: str,
    duration_days: int,
    budget_tier: str,
    vibes: List[str],
    itinerary_days: List[TripItineraryDay],
    config: RunnableConfig,
    hero_image_url: str = None,
    featured_hotel: Dict[str, str] = None,
    start_date: str = None,
    end_date: str = None,
) -> Dict[str, str]:
    """Updates an existing trip itinerary in the database. Use this after you have made customizations to an existing trip."""
    user_id = config.get("configurable", {}).get("user_id")
    if not user_id:
        return {"error": "User authentication required"}
        
    itinerary_data = {"days": [day.model_dump() for day in itinerary_days]}
    
    try:
        from sqlalchemy.future import select
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(models.Trip).where(models.Trip.id == trip_id, models.Trip.user_id == int(user_id)))
            trip = result.scalar_one_or_none()
            
            if not trip:
                return {"error": f"Trip with ID {trip_id} not found."}
                
            trip.title = title
            trip.destination = destination
            trip.duration_days = duration_days
            trip.budget_tier = budget_tier
            trip.vibes = vibes
            previous = normalise_itinerary(trip.itinerary_data, trip_id=trip.id)
            trip.itinerary_data = normalise_itinerary(itinerary_data, trip_id=trip.id, previous=previous, revision=previous["revision"] + 1, start_date=start_date, end_date=end_date)
            if hero_image_url:
                trip.hero_image_url = hero_image_url
            if featured_hotel:
                trip.featured_hotel = featured_hotel
                
            await db.commit()
            await db.refresh(trip)
            
        return {"status": "success", "trip_id": trip.id, "message": "Trip updated successfully"}
    except Exception as e:
        return {"error": f"Failed to update trip in database: {e}"}

# =============================================================================
# DOMAIN-SPLIT TOOL GETTERS
# =============================================================================

@tool(args_schema=PortalKnowledgeSearchInput)
def search_transit_rules(query: str) -> str:
    """Search the official UAE knowledge base specifically for transit, logistics, visas, and practical travel rules.
    Use this FIRST for any query about:
    - Metro, buses, Nol cards, or taxis
    - Visa requirements and entry permits
    - Public holidays, weekends, or electrical plug types
    - Telecom/SIM cards and practical logistics
    This queries the same official RAG database but is documented to help the Logistics Agent find travel rules."""
    store = _get_vector_store()
    if not store:
        return "Error: UAE Knowledge Base is not loaded. Please run: python ingest_knowledge.py"
    
    docs = store.similarity_search(query, k=4)
    if not docs:
        return "No relevant logistics information found in the official UAE knowledge base for this query."

    results = []
    for doc in docs:
        source = doc.metadata.get('source', 'official_portal')
        results.append(f"[Source: {source}]\n{doc.page_content}")
        
    return "\n\n---\n\n".join(results)

def get_accommodation_tools():
    """Returns tools for the Accommodation Agent (Nuitee hotel API & Google Places)."""
    return [
        search_google_places,
        resolve_discovery_places,
        search_hotels,
        search_for_availability,
        makePrebook,
        get_hotel_details,
        get_hotel_reviews,
        get_hotel_rooms
    ]

def get_logistics_tools():
    """Returns tools for the Logistics Agent (UAE transit, transportation & weather)."""
    return [
        search_transit_rules,
        get_route_directions,
        estimate_taxi_fare,
        get_uae_weather,
    ]

def get_event_tools():
    """Returns tools for the Event/Experience Agent (Ticketmaster, Restaurants, and Experiences)."""
    return [
        search_live_events,
        get_planning_catalogue,
        search_restaurants,
        search_google_places,
        resolve_discovery_places,
        search_portal_knowledge,
    ]

def get_orchestrator_tools():
    """Returns tools for the Orchestrator (Email, Trip Saving, and General UAE Knowledge RAG)."""
    return [
        send_email,
        save_trip_to_database,
        get_trip_from_database,
        update_trip_in_database,
        resolve_discovery_places,
        search_portal_knowledge,
        scrape_official_portal,
    ]

class NuiteePassengerInfo(BaseModel):
    title: str = Field(default="mr", description="Passenger title: 'mr', 'ms', 'mrs'")
    given_name: str = Field(description="First name")
    family_name: str = Field(description="Last name")
    gender: str = Field(description="Gender: 'male' or 'female'")
    born_on: str = Field(description="Date of birth YYYY-MM-DD")
    email: str = Field(description="Email address")
    phone_number: str = Field(description="Phone number with country code, e.g., +971501234567")

class SearchFlightsInput(BaseModel):
    origin: str = Field(description="Origin IATA code (e.g. 'LHR')")
    destination: str = Field(description="Destination IATA code (e.g. 'DXB')")
    departure_date: str = Field(description="Departure date YYYY-MM-DD. If the user did not specify a date, YOU MUST set this exactly to 'UNKNOWN'. DO NOT GUESS.")
    return_date: Optional[str] = Field(None, description="Optional return date YYYY-MM-DD for round trips")
    passengers: int = Field(default=1, description="Number of adult passengers")
    cabin_class: str = Field(default="economy", description="Cabin class: 'economy', 'premium_economy', 'business', 'first'")

class BookFlightInput(BaseModel):
    offer_id: str = Field(description="The selected flight offer ID (e.g., off_0000...)")
    passengers: List[NuiteePassengerInfo] = Field(description="List of passenger details matching the IDs from the search")

@tool(args_schema=SearchFlightsInput)
def search_flights(origin: str, destination: str, departure_date: str, return_date: Optional[str] = None, passengers: int = 1, cabin_class: str = "economy"):
    """Search for flights using the Nuitee Connect / LiteAPI Flights API. Use this to find available flights, airlines, prices, and layovers."""
    
    from services.flight_search import search
    return search(origin,destination,departure_date,return_date,passengers,cabin_class)


@tool(args_schema=BookFlightInput)
def book_flight(offer_id: str, passengers: List[NuiteePassengerInfo]):
    """Book a selected flight offer using the Nuitee Connect / LiteAPI. This executes the prebook and booking steps."""
    api_key = os.getenv("NUTIEE_API_KEY")
    if not api_key: return {"error": "NUTIEE_API_KEY not found."}
    if offer_id.startswith(("off_mock_", "bkg_mock_")):
        return {"error": "Demo offers cannot be booked.", "status": "REJECTED"}
    
    headers = {
        "X-API-Key": api_key,
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    
    try:
        prebook_resp = requests.post(
            "https://api.liteapi.travel/v3.0/flights/prebooks", 
            headers=headers, 
            json={"offerId": offer_id}, 
            timeout=15
        )
        prebook_resp.raise_for_status()
        prebook_data = prebook_resp.json().get("data", {})
        prebook_id = prebook_data.get("prebookId")
        
        if not prebook_id:
            return {"error": "Failed to generate Prebook ID from Nuitee API"}

        liteapi_passengers = []
        for p in passengers:
            liteapi_passengers.append({
                "title": p.title,
                "firstName": p.given_name,
                "lastName": p.family_name,
                "email": p.email,
                "phoneNumber": p.phone_number,
                "birthDate": p.born_on,
                "gender": p.gender
            })

        book_payload = {
            "prebookId": prebook_id,
            "passengers": liteapi_passengers
        }
        
        book_resp = requests.post(
            "https://api.liteapi.travel/v3.0/flights/bookings", 
            headers=headers, 
            json=book_payload, 
            timeout=20
        )
        book_resp.raise_for_status()
        book_data = book_resp.json().get("data", {})
        
        return {
            "status": "CONFIRMED" if str(book_data.get("status", "")).upper() in {"CONFIRMED", "BOOKED"} and book_data.get("bookingId") else "PENDING",
            "booking_reference": book_data.get("bookingReference", "N/A"),
            "booking_id": book_data.get("bookingId"),
            "total_amount": prebook_data.get("pricing", {}).get("totalAmount"),
            "currency": prebook_data.get("pricing", {}).get("currency"),
            "airline_booking_reference": book_data.get("providerLocatorCode", "N/A")
        }
    except Exception:
        return {"error": "Flight booking status could not be verified. Check with the provider before retrying.", "status": "UNKNOWN"}


def get_flight_tools():
    """Returns tools for the Flight Agent (Nuitee API)."""
    return [
        search_flights,
        book_flight,
    ]


@tool
async def get_planning_catalogue(place_ids: Optional[List[str]] = None, region: str = 'all', query: str = '', offset: int = 0, config: RunnableConfig = None) -> Dict[str, Any]:
    """Look up curated place/product identities and the closed supported challenge catalogue.
    This verifies identities only, not current opening hours, tickets or venue facilities.
    """
    from domain.itinerary_validation import catalogue
    from services.attractions import search_attractions
    from services.discovery import REGIONS
    if region not in REGIONS or offset<0 or offset>10000 or len(query)>160 or (place_ids is not None and len(place_ids)>30):return {'error':'Choose a valid emirate, query and at most 30 place IDs.'}
    async with AsyncSessionLocal() as db:
        result=await search_attractions(db,region,query,offset,12,ids=place_ids,hydrate_media=False)
    from domain.accessibility import annotate_candidates
    brief=(config or {}).get('configurable',{}).get('trip_brief',{}).get('brief',{})
    result=annotate_candidates(result,brief)
    return {**result,'rules':catalogue([])['rules']}
