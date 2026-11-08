"""
scrape_clean_data.py  —  Re-scrapes official UAE portals into CLEAN text files.
Fixes the HTML noise in uae_gov.md and replaces the nav-bar-only visit_dubai.md 
with actual content from specific content pages.

Run: python scrape_clean_data.py
"""
import os
import re
import requests
from bs4 import BeautifulSoup
from pathlib import Path

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

def scrape_clean(url: str, label: str, max_chars: int = 50000) -> str:
    """Scrape a URL and return clean plain text."""
    print(f"  Fetching: {url}")
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
    except Exception as e:
        print(f"  FAILED ({e}) — skipping.")
        return ""

    soup = BeautifulSoup(resp.text, "lxml")

    # Remove noise elements
    for tag in soup(["script", "style", "nav", "footer", "header", "form",
                     "noscript", "meta", "link", "button", "input", "select",
                     "iframe", "svg", "img"]):
        tag.decompose()

    # Try to find main content
    main = (
        soup.find("main") or
        soup.find("article") or
        soup.find("div", {"id": re.compile(r"content|main|body", re.I)}) or
        soup.find("div", {"class": re.compile(r"content|main|body|page", re.I)}) or
        soup.body
    )
    target = main if main else soup

    lines = []
    seen = set()
    for el in target.find_all(["h1", "h2", "h3", "h4", "h5", "p", "li", "td", "th", "span", "div"]):
        # Only leaf-level or near-leaf text
        children_text = [c for c in el.children if hasattr(c, 'get_text')]
        text = el.get_text(separator=" ", strip=True)
        text = re.sub(r'\s+', ' ', text).strip()

        if len(text) < 20:
            continue
        if len(text) > 800:  # Probably a container div — skip
            continue

        # Skip nav/boilerplate
        noise_patterns = [
            'cookie', 'javascript', 'skip to', 'back to top',
            'all rights reserved', 'follow us', 'subscribe',
            'newsletter', 'terms', 'privacy policy', 'sitemap',
            'login', 'register', 'sign in', 'loading',
            '@media', '{', '}', 'function(', 'var ', 'window.',
        ]
        lower = text.lower()
        if any(n in lower for n in noise_patterns):
            continue

        # Deduplicate
        key = text.lower()[:100]
        if key in seen:
            continue
        seen.add(key)

        lines.append(text)

    content = f"=== {label} ===\nSource: {url}\n\n" + "\n".join(lines)
    return content[:max_chars]


def scrape_uae_gov() -> str:
    """Scrape multiple specific pages from u.ae for clean government tourism info."""
    pages = [
        ("https://u.ae/en/information-and-services/visiting-and-exploring-the-uae", "UAE Government — Visiting & Exploring the UAE"),
        ("https://u.ae/en/information-and-services/visa-and-emirates-id/do-you-need-a-uae-visa", "UAE Government — Visa Requirements"),
        ("https://u.ae/en/information-and-services/visiting-and-exploring-the-uae/list-of-uae-public-places-and-etiquette", "UAE Government — Public Places Etiquette"),
    ]
    parts = []
    for url, label in pages:
        text = scrape_clean(url, label)
        if text:
            parts.append(text)
    return "\n\n---\n\n".join(parts)


def scrape_visit_dubai() -> str:
    """Scrape SPECIFIC content pages from Visit Dubai (not homepage nav)."""
    pages = [
        ("https://www.visitdubai.com/en/plan-your-trip/visa-information", "Visit Dubai — Visa Information"),
        ("https://www.visitdubai.com/en/plan-your-trip/practical-information", "Visit Dubai — Practical Information & Etiquette"),
        ("https://www.visitdubai.com/en/plan-your-trip/getting-around-dubai", "Visit Dubai — Getting Around Dubai"),
        ("https://www.visitdubai.com/en/things-to-do/dubai-attractions", "Visit Dubai — Top Attractions"),
        ("https://www.visitdubai.com/en/explore-dubai/local-culture-and-heritage", "Visit Dubai — Culture & Heritage"),
    ]
    parts = []
    for url, label in pages:
        text = scrape_clean(url, label, max_chars=8000)
        if text:
            parts.append(text)
        else:
            # Fallback: Serper site-scoped search
            parts.append(f"=== {label} ===\nSource: {url}\n(Live scraping blocked — use Serper fallback for real-time queries)")
    return "\n\n---\n\n".join(parts)


def scrape_visit_abudhabi() -> str:
    """Scrape specific content pages from Visit Abu Dhabi."""
    pages = [
        ("https://visitabudhabi.ae/en/plan-your-trip", "Visit Abu Dhabi — Plan Your Trip"),
        ("https://visitabudhabi.ae/en/things-to-do", "Visit Abu Dhabi — Things to Do"),
    ]
    parts = []
    for url, label in pages:
        text = scrape_clean(url, label, max_chars=8000)
        if text:
            parts.append(text)
        else:
            parts.append(f"=== {label} ===\nSource: {url}\n(Live scraping blocked — use Serper fallback for real-time queries)")
    return "\n\n---\n\n".join(parts)


def main():
    print("=" * 60)
    print("  Masar AI — Clean Portal Data Scraper")
    print("=" * 60)

    raw_dir = Path("data/raw")
    raw_dir.mkdir(parents=True, exist_ok=True)

    print("\n[1/3] Scraping UAE Government Portal (u.ae)...")
    uae_gov = scrape_uae_gov()
    (raw_dir / "uae_gov.md").write_text(
        f"Title: UAE Government — Visiting the UAE\nDescription: Official UAE government tourism and visa information\nSource: https://u.ae/en\n\n---\n\n{uae_gov}",
        encoding="utf-8"
    )
    print(f"  Saved: data/raw/uae_gov.md ({len(uae_gov):,} chars)")

    print("\n[2/3] Scraping Visit Dubai (content pages)...")
    visit_dubai = scrape_visit_dubai()
    (raw_dir / "visit_dubai.md").write_text(
        f"Title: Visit Dubai — Official Tourism Guide\nDescription: Dubai visa info, attractions, culture, and practical travel information\nSource: https://www.visitdubai.com/en\n\n---\n\n{visit_dubai}",
        encoding="utf-8"
    )
    print(f"  Saved: data/raw/visit_dubai.md ({len(visit_dubai):,} chars)")

    print("\n[3/3] Scraping Visit Abu Dhabi (content pages)...")
    visit_abudhabi = scrape_visit_abudhabi()
    (raw_dir / "visit_abudhabi.md").write_text(
        f"Title: Visit Abu Dhabi — Official Tourism Guide\nDescription: Abu Dhabi attractions, experiences, and travel planning\nSource: https://visitabudhabi.ae/en\n\n---\n\n{visit_abudhabi}",
        encoding="utf-8"
    )
    print(f"  Saved: data/raw/visit_abudhabi.md ({len(visit_abudhabi):,} chars)")

    print("\n[DONE] All portal data scraped cleanly.")
    print("   Next: run python ingest_knowledge.py to rebuild the FAISS index.")


if __name__ == "__main__":
    main()
