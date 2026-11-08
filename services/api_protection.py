"""Bounded single-process admission controls; deploy exactly one API process per host.

Does not trust forwarded headers itself. Uvicorn must trust only the reverse proxy.
Scaling API replicas requires a shared limiter; these counters intentionally stay local.
"""
import time
from collections import OrderedDict, deque
from starlette.responses import JSONResponse
from config.production import production
import os

class ApiProtection:
    def __init__(self, app, enabled=None, clock=time.monotonic):
        self.app = app
        self.enabled = production() if enabled is None else enabled
        self.clock = clock
        self.buckets = OrderedDict()
        self.max_buckets = 10000
        self.active_chat = 0
        self.active_clients = set()

    def admit(self, key, limit, window):
        now = self.clock()
        # Ordered by last use; remove stale entries, never create unbounded IP state.
        while self.buckets and next(iter(self.buckets.values()))[1] < now - 3600:
            self.buckets.popitem(last=False)
        if key not in self.buckets and len(self.buckets) >= self.max_buckets:
            return False
        queue, _ = self.buckets.pop(key, (deque(), now))
        while queue and queue[0] <= now-window:
            queue.popleft()
        allowed = len(queue) < limit
        if allowed:
            queue.append(now)
        self.buckets[key] = (queue, now)
        return allowed

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)
        path, method = scope.get('path', ''), scope['method']
        if method == 'POST' and path in {'/api/v1/time-travel/detect','/api/v1/receipts/process'}:
            chunks, size = [], 0
            while True:
                message = await receive()
                if message['type'] == 'http.disconnect':
                    return
                chunk = message.get('body', b'')
                size += len(chunk)
                maximum_body = 11_000_000 if path == '/api/v1/receipts/process' else 7_100_000
                if size > maximum_body:
                    return await JSONResponse({'detail': 'Image request is too large'}, status_code=413)(scope, receive, send)
                chunks.append(chunk)
                if not message.get('more_body', False):
                    break
            delivered = False
            original_receive = receive
            async def bounded_receive():
                nonlocal delivered
                if not delivered:
                    delivered = True
                    return {'type':'http.request','body':b''.join(chunks),'more_body':False}
                return await original_receive()
            receive = bounded_receive
        ip = (scope.get('client') or ('unknown', 0))[0]
        is_chat = method == 'POST' and path == '/api/v1/chat'
        if self.enabled:
            headers = dict(scope.get('headers', []))
            length = headers.get(b'content-length')
            if length:
                try:
                    too_large = int(length) > 20*1024*1024
                except ValueError:
                    too_large = True
                if too_large:
                    return await JSONResponse({'detail': 'Request body too large'}, status_code=413)(scope, receive, send)
            rule = None
            if method == 'POST' and path.startswith('/api/v1/auth/'):
                rule = ('auth:'+path, 10 if path.endswith('/login') else 5, 300)
            elif is_chat:
                rule = ('chat', 10, 60)
            elif method == 'POST' and path.startswith('/api/v1/planning/runs'):
                rule = ('planning', 12, 60)
            elif method not in ('GET', 'HEAD', 'OPTIONS') and path.startswith('/api/'):
                rule = ('writes', 60, 60)
            if rule and not self.admit((ip, rule[0]), rule[1], rule[2]):
                return await JSONResponse({'detail': 'Too many requests. Please try again shortly.'}, status_code=429, headers={'Retry-After': str(rule[2])})(scope, receive, send)
            if is_chat:
                maximum = max(1, int(os.getenv('MAX_CONCURRENT_CHATS', '2')))
                if self.active_chat >= maximum or ip in self.active_clients:
                    return await JSONResponse({'detail': 'Chat is busy. Please try again shortly.'}, status_code=429, headers={'Retry-After': '10'})(scope, receive, send)
                self.active_chat += 1
                self.active_clients.add(ip)
        async def protected_send(message):
            if message['type'] == 'http.response.start':
                headers = list(message.get('headers', []))
                names = {key.lower() for key, _ in headers}
                for key, value in [(b'x-content-type-options', b'nosniff'), (b'referrer-policy', b'no-referrer')]:
                    if key not in names:
                        headers.append((key, value))
                message = {**message, 'headers': headers}
            await send(message)
        try:
            await self.app(scope, receive, protected_send)
        finally:
            if self.enabled and is_chat:
                self.active_chat -= 1
                self.active_clients.discard(ip)
