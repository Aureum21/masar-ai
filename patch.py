import os
import sys

filepath = r"C:\Users\efake\Desktop\MasarAI\masarAiTools.py"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

start_marker = "class DuffelPassengerInfo(BaseModel):"
start_idx = content.find(start_marker)
if start_idx == -1:
    print("Could not find start marker")
    sys.exit(1)

replacement = '''class NuiteePassengerInfo(BaseModel):
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
    departure_date: str = Field(description="Departure date YYYY-MM-DD")
    return_date: Optional[str] = Field(None, description="Optional return date YYYY-MM-DD for round trips")
    passengers: int = Field(default=1, description="Number of adult passengers")
    cabin_class: str = Field(default="economy", description="Cabin class: 'economy', 'premium_economy', 'business', 'first'")

class BookFlightInput(BaseModel):
    offer_id: str = Field(description="The selected flight offer ID (e.g., off_0000...)")
    passengers: List[NuiteePassengerInfo] = Field(description="List of passenger details matching the IDs from the search")

@tool(args_schema=SearchFlightsInput)
def search_flights(origin: str, destination: str, departure_date: str, return_date: Optional[str] = None, passengers: int = 1, cabin_class: str = "economy"):
    """Search for flights using the Nuitee Connect / LiteAPI Flights API. Use this to find available flights, airlines, prices, and layovers."""
    api_key = os.getenv("NUTIEE_API_KEY")
    if not api_key: return {"error": "NUTIEE_API_KEY not found."}
    
    headers = {
        "X-API-Key": api_key,
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    
    legs = [{"origin": origin, "destination": destination, "date": departure_date}]
    if return_date:
        legs.append({"origin": destination, "destination": origin, "date": return_date})
        
    payload = {
        "legs": legs,
        "adults": passengers,
        "cabinClass": cabin_class.upper(),
        "currency": "AED"
    }
    
    try:
        resp = requests.post("https://api.liteapi.travel/v3.0/flights/rates", headers=headers, json=payload, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        
        raw_offers = data.get("data", [])[:10]
        offers = []
        for o in raw_offers:
            simplified = {
                "offer_id": o.get("offerId"),
                "total_amount": o.get("pricing", {}).get("totalAmount"),
                "currency": o.get("pricing", {}).get("currency"),
                "airline": o.get("itineraries", [{}])[0].get("segments", [{}])[0].get("carrier", {}).get("marketingName", "Unknown Airline"),
                "airline_logo": o.get("itineraries", [{}])[0].get("segments", [{}])[0].get("carrier", {}).get("marketingLogo"),
                "baggages": ["1x Checked Bag (Extracted from Nuitee API)"] if o.get("pricing", {}).get("hasBaggage") else [],
                "slices": []
            }
            for it in o.get("itineraries", []):
                slice_info = {
                    "duration": it.get("duration", {}).get("iso8601"),
                    "segments": []
                }
                for seg in it.get("segments", []):
                    slice_info["segments"].append({
                        "origin": seg.get("originCode"),
                        "destination": seg.get("destinationCode"),
                        "departing_at": seg.get("departureTime"),
                        "arriving_at": seg.get("arrivalTime"),
                        "airline": seg.get("carrier", {}).get("operatingName")
                    })
                simplified["slices"].append(slice_info)
            offers.append(simplified)
            
        return {
            "required_passenger_ids_for_booking": ["p1"],
            "offers": offers
        }
    except Exception as e:
        return {"error": f"Flight search failed via Nuitee Connect API: {e}"}

@tool(args_schema=BookFlightInput)
def book_flight(offer_id: str, passengers: List[NuiteePassengerInfo]):
    """Book a selected flight offer using the Nuitee Connect / LiteAPI. This executes the prebook and booking steps."""
    api_key = os.getenv("NUTIEE_API_KEY")
    if not api_key: return {"error": "NUTIEE_API_KEY not found."}
    
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
            "status": "CONFIRMED",
            "booking_reference": book_data.get("bookingReference", "N/A"),
            "booking_id": book_data.get("bookingId"),
            "total_amount": prebook_data.get("pricing", {}).get("totalAmount"),
            "currency": prebook_data.get("pricing", {}).get("currency"),
            "airline_booking_reference": book_data.get("providerLocatorCode", "N/A")
        }
    except Exception as e:
        return {"error": f"Flight booking failed via Nuitee Connect API: {e}"}

def get_flight_tools():
    """Returns tools for the Flight Agent (Nuitee API)."""
    return [
        search_flights,
        book_flight,
    ]
'''

new_content = content[:start_idx] + replacement
with open(filepath, "w", encoding="utf-8") as f:
    f.write(new_content)
print("Replaced!")
