"""Quick smoke test for the Hybrid RAG + Dynamic Scraping integration."""
import os
os.environ.setdefault("OPENAI_API_KEY", os.getenv("OPENAI_API_KEY", ""))

from dotenv import load_dotenv
load_dotenv(override=True)

from masarAiTools import search_portal_knowledge, scrape_official_portal

print("=" * 60)
print("  Masar AI — Hybrid Integration Smoke Test")
print("=" * 60)

# Test 1: Static RAG — visa rules from u.ae
print("\n[TEST 1] Static RAG — UAE visa query...")
result = search_portal_knowledge.invoke({"query": "What are the visa requirements for tourists visiting Dubai?"})
print(f"  Result length: {len(result)} chars")
print(f"  Preview: {result[:300]}...")

# Test 2: Static RAG — cultural knowledge from Visit Abu Dhabi
print("\n[TEST 2] Static RAG — Sheikh Zayed Mosque query...")
result2 = search_portal_knowledge.invoke({"query": "Sheikh Zayed Grand Mosque visiting rules and dress code"})
print(f"  Result length: {len(result2)} chars")
print(f"  Preview: {result2[:300]}...")

# Test 3: Dynamic scrape — live events from Visit Dubai
print("\n[TEST 3] Dynamic Scrape — live Dubai events...")
result3 = scrape_official_portal.invoke({"portal": "visitdubai", "section": "events"})
print(f"  Result length: {len(result3)} chars")
print(f"  Preview: {result3[:400]}...")

print("\n[ALL TESTS COMPLETE]")
