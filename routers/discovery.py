"""Authenticated, bounded provider browsing. No database changes or LLM calls."""
from collections import OrderedDict, deque
import threading
import time
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field, field_validator
import auth
from services.discovery import DiscoveryQuery, DiscoveryResult, IDENTITY, discover, resolve_places

router = APIRouter(prefix='/api/v1/discovery', tags=['discovery'])
_calls = OrderedDict()
_lock = threading.Lock()


def discovery_user(user=Depends(auth.get_current_user)):
    now = time.monotonic()
    with _lock:
        calls = _calls.setdefault(user.id, deque())
        while calls and calls[0] <= now-60:
            calls.popleft()
        if len(calls) >= 20:
            raise HTTPException(429, 'Please wait a moment before searching again.', headers={'Retry-After': '60'})
        calls.append(now)
        _calls.move_to_end(user.id)
        while len(_calls) > 2048:
            _calls.popitem(last=False)
    return user


@router.post('/search', response_model=DiscoveryResult)
def search(query: DiscoveryQuery, response: Response, user=Depends(discovery_user)):
    response.headers['Cache-Control'] = 'no-store'
    return discover(query)


class ResolveRequest(BaseModel):
    ids: list[str] = Field(max_length=30)

    @field_validator('ids')
    @classmethod
    def provider_ids_only(cls, values):
        if any(not IDENTITY.fullmatch(value) for value in values):
            raise ValueError('Choose valid provider place IDs.')
        return values


@router.post('/resolve')
def resolve(body: ResolveRequest, response: Response, user=Depends(discovery_user)):
    response.headers['Cache-Control'] = 'no-store'
    return resolve_places(body.ids)
