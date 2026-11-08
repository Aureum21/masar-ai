import requests
import os
from dotenv import load_dotenv

load_dotenv(override=True)
api_key = os.getenv("NUTIEE_API_KEY")

if not api_key:
    print("API Key not found.")
    exit(1)

headers = {
    "X-API-Key": api_key,
    "Accept": "application/json",
    "Content-Type": "application/json"
}

payload = {
    "legs": [{"origin": "DXB", "destination": "LHR", "date": "2026-10-15"}],
    "adults": 1,
    "cabinClass": "ECONOMY",
    "currency": "AED"
}

print("Testing Nuitee flights API directly...")
try:
    resp = requests.post("https://api.liteapi.travel/v3.0/flights/rates", headers=headers, json=payload, timeout=20)
    print(f"Status Code: {resp.status_code}")
    if resp.status_code != 200:
        print("Response Text:", resp.text)
    else:
        data = resp.json()
        raw_offers = data.get("data", [])
        print(f"Found {len(raw_offers)} offers.")
        if len(raw_offers) > 0:
            print("Sample offer ID:", raw_offers[0].get("offerId"))
            print("Total amount:", raw_offers[0].get("pricing", {}).get("totalAmount"))
except Exception as e:
    print("Error:", e)
