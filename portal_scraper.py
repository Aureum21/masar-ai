# ──────────────────────────────────────────────────────────────────────────────
# Masar AI — Portal Scraper Utility
# Handles dynamic, on-demand scraping of official UAE tourism portals.
# Strategy:
#   1. Try direct HTTP scraping (fast, no API cost)
#   2. On 403/block → fall back to Serper site-scoped search (reliable)
# Results are cached in-memory for 15 minutes to avoid overloading the portals.
# ──────────────────────────────────────────────────────────────────────────────
import os
import time
import requests
from bs4 import BeautifulSoup
from typing import Optional

# ── Portal URL Map ─────────────────────────────────────────────────────────────
PORTAL_URLS = {
    "visitdubai": {
        "events":       "https://www.visitdubai.com/en/festivals-and-events/dubai-events-calendar",
        "deals":        "https://www.visitdubai.com/en/deals-and-offers",
        "attractions":  "https://www.visitdubai.com/en/things-to-do",
        "hotels":       "https://www.visitdubai.com/en/deals-and-offers/hotel-deals",
        "news":         "https://www.visitdubai.com/en/things-to-do/new-and-trending",
    },
    "visitabudhabi": {
        "events":       "https://visitabudhabi.ae/en/events",
        "deals":        "https://visitabudhabi.ae/en/deals-and-offers",
        "attractions":  "https://visitabudhabi.ae/en/things-to-do",
        "hotels":       "https://visitabudhabi.ae/en/where-to-stay",
        "news":         "https://visitabudhabi.ae/en/news",
    },
    "uae_gov": {
        "events":       "https://u.ae/en/information-and-services/visiting-and-exploring-the-uae",
        "deals":        "https://u.ae/en/information-and-services/visiting-and-exploring-the-uae",
        "attractions":  "https://u.ae/en/information-and-services/visiting-and-exploring-the-uae",
        "news":         "https://u.ae/en/information-and-services/visiting-and-exploring-the-uae",
        "visas":        "https://u.ae/en/information-and-services/visa-and-emirates-id",
    },
}

# Portal domains for Serper site-scoped fallback
PORTAL_DOMAINS = {
    "visitdubai":    "visitdubai.com",
    "visitabudhabi": "visitabudhabi.ae",
    "uae_gov":       "u.ae",
}

# ── In-memory Cache (15 minute TTL) ───────────────────────────────────────────
_cache: dict[str, tuple[float, str]] = {}
CACHE_TTL_SECONDS = 900  # 15 minutes

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}


def _extract_text(html: str, max_chars: int = 4000) -> str:
    """Parse HTML and extract meaningful visible text, stripping nav/footer noise."""
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "footer", "header", "form", "noscript", "meta", "link"]):
        tag.decompose()
    main = soup.find("main") or soup.find("article") or soup.find("div", {"id": "content"})
    target = main if main else soup
    lines = []
    for el in target.find_all(["h1", "h2", "h3", "h4", "p", "li", "a"]):
        text = el.get_text(separator=" ", strip=True)
        if len(text) > 25:
            lines.append(text)
    raw = "\n".join(lines)
    return raw[:max_chars]


def _serper_fallback(portal: str, section: str) -> str:
    """
    When direct scraping is blocked (403), use Google Serper to search
    within the official portal domain for the requested section content.
    This is more reliable for portals that block scrapers.
    """
    api_key = os.getenv("SERPER_API_KEY") or os.getenv("SERPERDEV_API_KEY")
    if not api_key:
        return f"[Scraping blocked by {portal} and SERPER_API_KEY not set. Cannot fetch live data.]"

    domain = PORTAL_DOMAINS.get(portal, portal)

    # Build a targeted search query scoped to the official portal
    section_queries = {
        "events":      f"site:{domain} events calendar 2026 concerts festivals",
        "deals":       f"site:{domain} deals offers promotions 2026",
        "attractions": f"site:{domain} top attractions things to do",
        "hotels":      f"site:{domain} hotels accommodation deals",
        "news":        f"site:{domain} news updates 2026",
        "visas":       f"site:{domain} visa requirements tourists 2026",
    }
    query = section_queries.get(section, f"site:{domain} {section} UAE tourism 2026")

    try:
        resp = requests.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
            json={"q": query, "num": 5},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

        results = []
        for item in data.get("organic", [])[:5]:
            title = item.get("title", "")
            snippet = item.get("snippet", "")
            link = item.get("link", "")
            if snippet:
                results.append(f"- {title}\n  {snippet}\n  Source: {link}")

        if not results:
            return f"[No results found via Serper for {portal}/{section}]"

        return f"[Live data via site:{domain} search — {section}]\n\n" + "\n\n".join(results)

    except Exception as e:
        return f"[Serper fallback failed for {portal}/{section}: {e}]"


def scrape_portal(portal: str, section: str) -> str:
    """
    Scrape a live page from an official UAE tourism portal.
    Falls back to Serper site-scoped search if direct scraping is blocked.

    Args:
        portal:  "visitdubai" | "visitabudhabi" | "uae_gov"
        section: "events" | "deals" | "attractions" | "hotels" | "news" | "visas"
    """
    portal = portal.lower().strip()
    section = section.lower().strip()

    if portal not in PORTAL_URLS:
        return f"Unknown portal '{portal}'. Choose from: {', '.join(PORTAL_URLS.keys())}"

    section_map = PORTAL_URLS[portal]
    if section not in section_map:
        section = list(section_map.keys())[0]

    url = section_map[section]
    cache_key = f"{portal}:{section}"

    # Return cached result if still fresh
    if cache_key in _cache:
        cached_at, cached_text = _cache[cache_key]
        if time.time() - cached_at < CACHE_TTL_SECONDS:
            return f"[Cached ({int((time.time() - cached_at) / 60)}m ago) — {portal}/{section}]\n\n{cached_text}"

    # Strategy 1: Direct HTTP scrape
    try:
        response = requests.get(url, headers=HEADERS, timeout=12)

        if response.status_code == 403:
            # Strategy 2: Serper site-scoped search fallback
            text = _serper_fallback(portal, section)
            _cache[cache_key] = (time.time(), text)
            return text

        response.raise_for_status()
        text = _extract_text(response.text)

        if not text.strip():
            # Page may require JS — fall back to Serper
            text = _serper_fallback(portal, section)

        _cache[cache_key] = (time.time(), text)
        return f"[Live data from {url}]\n\n{text}"

    except requests.exceptions.Timeout:
        return f"Timeout scraping {url}. Trying search fallback...\n\n" + _serper_fallback(portal, section)
    except requests.exceptions.HTTPError as e:
        status = e.response.status_code if e.response else "unknown"
        if status in (403, 429, 503):
            text = _serper_fallback(portal, section)
            _cache[cache_key] = (time.time(), text)
            return text
        return f"HTTP error {status} when scraping {url}."
    except Exception as e:
        return f"Failed to scrape {portal}/{section}: {e}"
