import os
from masarAiTools import search_flights
import json

# Setup environment variables for test if needed, though they should be in the .env
from dotenv import load_dotenv
load_dotenv(override=True)

print("Starting flight search test...")
result = search_flights("DXB", "LHR", "2026-11-15", None, 1, "economy")
print("Search Result:")
print(json.dumps(result, indent=2))
