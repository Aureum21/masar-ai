"""Provider discovery shared by HTTP browsing and agent tools. No LLM or bookings.

Google content is request-scoped: no disk/result cache and no photo-key URLs.
Only Ticketmaster responses have a bounded, five-minute process-local cache.
"""
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, time, timedelta, timezone
import os
import re
import threading
import time as clock
from typing import Literal
from urllib.parse import quote, urlparse
from html.parser import HTMLParser

from pydantic import BaseModel, Field, model_validator
import requests

REGIONS = {'all': 'United Arab Emirates', 'dubai': 'Dubai', 'abudhabi': 'Abu Dhabi',
           'sharjah': 'Sharjah', 'rasalkhaimah': 'Ras Al Khaimah', 'fujairah': 'Fujairah',
           'ajman': 'Ajman', 'ummalquwain': 'Umm Al Quwain'}
CATEGORIES = {'restaurants': 'restaurant', 'things-to-do': 'tourist_attraction',
              'stays': 'lodging', 'locations': None, 'events': None}
# UAE has a fixed UTC+04:00 offset; avoids a tzdata download on Windows.
UAETZ = timezone(timedelta(hours=4), name='Asia/Dubai')
IDENTITY = re.compile(r'^(google|ticketmaster):[A-Za-z0-9_-]{1,200}$')


class DiscoveryQuery(BaseModel):
    category: Literal['restaurants', 'things-to-do', 'stays', 'locations', 'events']
    region: Literal['all', 'dubai', 'abudhabi', 'sharjah', 'rasalkhaimah', 'fujairah', 'ajman', 'ummalquwain'] = 'all'
    query: str = Field(default='', max_length=160)
    start_date: date | None = None
    end_date: date | None = None
    cursor: str | None = Field(default=None, max_length=512)

    @model_validator(mode='after')
    def dates_in_order(self):
        if self.end_date and not self.start_date:
            raise ValueError('Choose a start date before an end date.')
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError('End date must follow start date.')
        return self


class DiscoveredPlace(BaseModel):
    id: str
    provider: Literal['google', 'ticketmaster']
    providerId: str
    category: str
    title: str
    neighborhood: str
    emirate: str = 'all'
    description: str = ''
    tagline: str = ''
    lat: float | None = None
    lng: float | None = None
    rating: float | None = None
    reviewCount: int | None = None
    priceTier: str | None = None
    priceLabel: str = 'Check current prices'
    images: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    sourceUrl: str
    sourceLabel: str
    observedAt: str
    eventDate: str | None = None
    status: str | None = None
    attribution: list[dict[str, str]] = Field(default_factory=list)
    # No provider search can publish a challenge or establish venue facilities.
    challengeEligible: Literal[False] = False
    mapAllowed: bool = False


class DiscoveryResult(BaseModel):
    items: list[DiscoveredPlace] = Field(default_factory=list)
    provider: str
    status: Literal['ok', 'empty', 'unavailable', 'invalid_query']
    message: str
    checkedAt: str
    nextCursor: str | None = None
    cached: bool = False


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def safe_url(value):
    if not isinstance(value, str):
        return ''
    parsed = urlparse(value)
    return value if parsed.scheme == 'https' and parsed.netloc and not parsed.username else ''


def coordinate(value, lower, upper):
    try:
        number = float(value)
        return number if lower <= number <= upper else None
    except (ValueError, TypeError):
        return None


def uae_location(lat, lng):
    # Coarse guard against unrelated overseas text-search matches; not a border check.
    return lat is not None and lng is not None and 22.5 <= lat <= 26.5 and 51 <= lng <= 56.6


def attributions(values):
    class Credit(HTMLParser):
        def __init__(self):
            super().__init__()
            self.text = []
            self.url = ''

        def handle_starttag(self, tag, attrs):
            if tag == 'a':
                self.url = safe_url(dict(attrs).get('href'))

        def handle_data(self, value):
            self.text.append(value)

    credits = []
    for value in values:
        parser = Credit()
        parser.feed(str(value))
        label = ''.join(parser.text).strip()
        if label:
            credits.append({'label': label, 'url': parser.url})
    return credits


def normalise_google(raw, category, region, observed):
    identity = raw.get('place_id', '')
    if not IDENTITY.fullmatch(f'google:{identity}') or not raw.get('name'):
        return None
    loc = raw.get('geometry', {}).get('location', {})
    lat, lng = coordinate(loc.get('lat'), -90, 90), coordinate(loc.get('lng'), -180, 180)
    address = raw.get('formatted_address') or raw.get('vicinity') or ''
    countries = [c.get('short_name') for c in raw.get('address_components', []) if 'country' in c.get('types', [])]
    if not uae_location(lat, lng) or (countries and 'AE' not in countries):
        return None
    if not countries and not re.search(r'United Arab Emirates|\bUAE\b', address, re.I):
        return None
    price = raw.get('price_level')
    tier = '$' * price if type(price) is int and 1 <= price <= 4 else None
    rating = coordinate(raw.get('rating'), 0, 5)
    return DiscoveredPlace(
        id=f'google:{identity}', provider='google', providerId=identity, category=category,
        title=raw['name'], neighborhood=raw.get('formatted_address') or raw.get('vicinity') or 'UAE',
        emirate=region, lat=lat, lng=lng, rating=rating,
        reviewCount=raw.get('user_ratings_total'), priceTier=tier,
        priceLabel=tier or 'Check current prices', status=raw.get('business_status'),
        tagline='Verify opening hours and availability before visiting.',
        sourceLabel='Google Maps', sourceUrl=f'https://www.google.com/maps/search/?api=1&query={quote(raw["name"])}&query_place_id={quote(identity)}',
        observedAt=observed, attribution=attributions(raw.get('html_attributions') or []))


def normalise_event(raw, region, observed):
    identity = raw.get('id', '')
    if not IDENTITY.fullmatch(f'ticketmaster:{identity}') or not raw.get('name'):
        return None
    venues = raw.get('_embedded', {}).get('venues') or [{}]
    venue = venues[0]
    if venue.get('country', {}).get('countryCode') != 'AE':
        return None
    location = venue.get('location') or {}
    images = [safe_url(image.get('url')) for image in raw.get('images', [])]
    start = raw.get('dates', {}).get('start', {})
    return DiscoveredPlace(
        id=f'ticketmaster:{identity}', provider='ticketmaster', providerId=identity,
        category='events', title=raw['name'], emirate=region,
        neighborhood=', '.join(filter(None, [venue.get('name'), venue.get('city', {}).get('name')])),
        lat=coordinate(location.get('latitude'), -90, 90), lng=coordinate(location.get('longitude'), -180, 180),
        images=list(dict.fromkeys(filter(None, images)))[:3],
        eventDate=start.get('localDate'), status=raw.get('dates', {}).get('status', {}).get('code'),
        tagline='Check event status and ticket availability with the organiser.',
        sourceLabel='Ticketmaster', sourceUrl=safe_url(raw.get('url')) or 'https://www.ticketmaster.com',
        observedAt=observed)


_event_cache = OrderedDict()
_cache_lock = threading.Lock()


def _google(query):
    api_key = os.getenv('GOOGLE_MAPS_API_KEY')
    if not api_key:
        raise RuntimeError('provider_unavailable')
    params = {'key': api_key, 'region': 'ae', 'language': 'en'}
    if query.cursor:
        params['pagetoken'] = query.cursor
    else:
        params['query'] = f'{query.query or query.category.replace("-", " ")} in {REGIONS[query.region]}, UAE'
        if CATEGORIES[query.category]:
            params['type'] = CATEGORIES[query.category]
    response = requests.get('https://maps.googleapis.com/maps/api/place/textsearch/json', params=params, timeout=(3, 10))
    response.raise_for_status()
    data = response.json()
    if data.get('status') not in {'OK', 'ZERO_RESULTS'}:
        raise RuntimeError('provider_unavailable')
    observed = now_iso()
    items = [normalise_google({**p, 'html_attributions': [*(data.get('html_attributions') or []), *(p.get('html_attributions') or [])]}, query.category, query.region, observed) for p in data.get('results', [])[:20]]
    return DiscoveryResult(items=[p for p in items if p], provider='google', status='ok',
                           message='Places from Google Maps. Visiting details require confirmation.',
                           checkedAt=observed, nextCursor=data.get('next_page_token'))


def _events(query):
    api_key = os.getenv('TICKETMASTER_API_KEY')
    if not api_key:
        raise RuntimeError('provider_unavailable')
    start = query.start_date or datetime.now(UAETZ).date()
    end = query.end_date or start + timedelta(days=30)
    if (end-start).days > 366:
        raise ValueError('Choose an event window of at most one year.')
    page = int(query.cursor or '0')
    if not 0 <= page <= 49:
        raise ValueError('Invalid event page.')
    key = (query.region, query.query.strip().lower(), start, end, page)
    with _cache_lock:
        entry = _event_cache.get(key)
        if entry and entry[0] > clock.monotonic():
            return entry[1].model_copy(deep=True, update={'cached': True})
    def utc(day, end_of_day=False):
        return datetime.combine(day, time(23, 59, 59) if end_of_day else time(), UAETZ).astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    params = {'apikey': api_key, 'countryCode': 'AE', 'size': 12, 'page': page, 'sort': 'date,asc',
              'startDateTime': utc(start), 'endDateTime': utc(end, True)}
    if query.region != 'all':
        params['city'] = REGIONS[query.region]
    if query.query.strip():
        params['keyword'] = query.query.strip()
    response = requests.get('https://app.ticketmaster.com/discovery/v2/events.json', params=params, timeout=(3, 10))
    response.raise_for_status()
    data = response.json()
    if 'errors' in data or 'fault' in data:
        raise RuntimeError('provider_unavailable')
    observed = now_iso()
    items = [normalise_event(p, query.region, observed) for p in data.get('_embedded', {}).get('events', [])]
    result = DiscoveryResult(items=[p for p in items if p], provider='ticketmaster', status='ok',
        checkedAt=observed, message=f'Events from Ticketmaster, {start} to {end}. Confirm tickets with the organiser.',
        nextCursor=str(page+1) if page+1 < min(data.get('page', {}).get('totalPages', 0), 50) else None)
    with _cache_lock:
        _event_cache[key] = (clock.monotonic()+300, result.model_copy(deep=True))
        _event_cache.move_to_end(key)
        while len(_event_cache) > 64:
            _event_cache.popitem(last=False)
    return result


def discover(query: DiscoveryQuery) -> DiscoveryResult:
    provider = 'ticketmaster' if query.category == 'events' else 'google'
    try:
        result = _events(query) if provider == 'ticketmaster' else _google(query)
        if not result.items:
            result.status = 'empty'
            result.message = 'No matching results from this source. Try another search or browse curated places.'
        return result
    except ValueError:
        return DiscoveryResult(provider=provider, status='invalid_query', checkedAt=now_iso(), message='Check the event dates or page and try again.')
    except Exception:
        # Provider errors can include keys in request URLs. Never return raw exceptions.
        return DiscoveryResult(provider=provider, status='unavailable', checkedAt=now_iso(), message='Live discovery is unavailable from this source. Curated places are still available.')


def resolve_one(identity):
    if not IDENTITY.fullmatch(identity):
        return None
    provider, provider_id = identity.split(':', 1)
    try:
        observed = now_iso()
        if provider == 'google':
            key = os.getenv('GOOGLE_MAPS_API_KEY')
            if not key:
                return None
            response = requests.get('https://maps.googleapis.com/maps/api/place/details/json', params={
                'key': key, 'place_id': provider_id, 'language': 'en',
                'fields': 'place_id,name,formatted_address,address_components,geometry,types,business_status,rating,user_ratings_total,price_level'}, timeout=(3, 10))
            response.raise_for_status()
            data = response.json()
            if data.get('status') != 'OK':
                return None
            raw = data.get('result', {})
            if raw.get('place_id') != provider_id:
                return None
            types = raw.get('types') or []
            category = 'restaurants' if 'restaurant' in types else 'stays' if 'lodging' in types else 'things-to-do'
            return normalise_google(raw, category, 'all', observed)
        key = os.getenv('TICKETMASTER_API_KEY')
        if not key:
            return None
        response = requests.get(f'https://app.ticketmaster.com/discovery/v2/events/{quote(provider_id)}.json', params={'apikey': key}, timeout=(3, 10))
        response.raise_for_status()
        data = response.json()
        return normalise_event(data, 'all', observed) if data.get('id') == provider_id else None
    except Exception:
        return None


def resolve_places(identities):
    unique = list(dict.fromkeys(identities))
    with ThreadPoolExecutor(max_workers=4) as pool:
        places = list(pool.map(resolve_one, unique))
    return {'items': [p.model_dump() for p in places if p],
            'unavailable': [identity for identity, place in zip(unique, places) if not place]}


def region_for_city(city):
    normal = re.sub(r'[^a-z]', '', city.lower())
    for region, name in REGIONS.items():
        if normal in {region, re.sub(r'[^a-z]', '', name.lower())}:
            return region
    raise ValueError('Choose a UAE emirate.')


def event_date_range(value):
    """Do not silently ignore the agent's requested event dates."""
    today = datetime.now(UAETZ).date()
    if value.lower().strip() in {'today', 'tomorrow'}:
        day = today + timedelta(days=value.lower().strip() == 'tomorrow')
        return day, day
    if value.lower().strip() == 'this weekend':
        saturday = today + timedelta(days=(5-today.weekday()) % 7)
        return (today, today) if today.weekday() == 6 else (saturday, saturday+timedelta(days=1))
    dates = re.findall(r'\d{4}-\d{2}-\d{2}', value)
    if 1 <= len(dates) <= 2:
        return date.fromisoformat(dates[0]), date.fromisoformat(dates[-1])
    raise ValueError('Provide an exact event date or date range (YYYY-MM-DD), today, tomorrow, or this weekend.')
