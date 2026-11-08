"""Offline provider/router regressions. No real API, booking, LLM or database call."""
import json
import os
from datetime import date
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

os.environ['MASAR_ENV'] = 'test'
os.environ.setdefault('DATABASE_URL', 'postgresql+asyncpg://masar_phase0:local_test_only@127.0.0.1:55432/masar_phase0')
os.environ['SECRET_KEY'] = 'isolated-discovery-test-key'
os.environ['LANGSMITH_TRACING'] = 'false'

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError
from services import discovery as service
from routers import discovery as routes


GOOGLE = {'place_id': 'ChIJ_test', 'name': 'Example UAE venue', 'formatted_address': 'Dubai, UAE',
          'geometry': {'location': {'lat': 25.2, 'lng': 55.3}}, 'rating': 4.3,
          'photos': [{'photo_reference': 'private-photo-reference'}], 'business_status': 'OPERATIONAL'}
EVENT = {'id': 'event_1', 'name': 'Example exhibition', 'url': 'https://ticketmaster.com/event/1',
         'dates': {'start': {'localDate': '2027-01-03'}, 'status': {'code': 'onsale'}},
         '_embedded': {'venues': [{'name': 'Example venue', 'country': {'countryCode': 'AE'}, 'city': {'name': 'Dubai'}}]}}


def response(data):
    result = Mock()
    result.json.return_value = data
    return result


class DiscoveryTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(os.environ, {'GOOGLE_MAPS_API_KEY': 'test-secret', 'TICKETMASTER_API_KEY': 'test-secret'})
        self.environment.start()
        service._event_cache.clear()
        routes._calls.clear()

    def tearDown(self):
        self.environment.stop()

    def test_google_result_ids_no_credentials_no_fake_hours_or_challenges(self):
        with patch.object(service.requests, 'get', return_value=response({'status': 'OK', 'results': [GOOGLE]})) as get:
            result = service.discover(service.DiscoveryQuery(category='restaurants', region='dubai', query='Emirati'))
        self.assertEqual(result.items[0].id, 'google:ChIJ_test')
        self.assertFalse(result.items[0].challengeEligible)
        self.assertFalse(result.items[0].mapAllowed)
        self.assertEqual(result.items[0].images, [])
        self.assertNotIn('test-secret', result.model_dump_json())
        self.assertNotIn('private-photo-reference', result.model_dump_json())
        self.assertEqual(get.call_args.kwargs['params']['type'], 'restaurant')
        self.assertEqual(get.call_args.kwargs['timeout'], (3, 10))

    def test_google_search_is_not_cached_and_passes_cursor(self):
        with patch.object(service.requests, 'get', return_value=response({'status': 'OK', 'results': [GOOGLE], 'next_page_token': 'next'})) as get:
            query = service.DiscoveryQuery(category='things-to-do')
            self.assertEqual(service.discover(query).nextCursor, 'next')
            service.discover(query)
            service.discover(service.DiscoveryQuery(category='things-to-do', cursor='next'))
        self.assertEqual(get.call_count, 3)
        self.assertEqual(get.call_args.kwargs['params']['pagetoken'], 'next')

    def test_unrelated_non_uae_or_malformed_results_are_not_discovered(self):
        invalid = {**GOOGLE, 'geometry': {'location': {'lat': 51.5, 'lng': -0.1}}}
        self.assertIsNone(service.normalise_google(invalid, 'things-to-do', 'all', service.now_iso()))
        self.assertIsNone(service.normalise_google({'name': 'No identity'}, 'things-to-do', 'all', service.now_iso()))
        self.assertIsNone(service.normalise_event({**EVENT, '_embedded': {}}, 'all', service.now_iso()))

    def test_event_date_filters_are_uae_day_boundaries_and_cache_is_scoped(self):
        data = {'_embedded': {'events': [EVENT]}, 'page': {'totalPages': 2}}
        query = service.DiscoveryQuery(category='events', region='dubai', start_date=date(2027, 1, 3), end_date=date(2027, 1, 4))
        with patch.object(service.requests, 'get', return_value=response(data)) as get:
            first = service.discover(query)
            cached = service.discover(query)
            self.assertEqual(get.call_count, 1)
            self.assertFalse(first.cached)
            self.assertTrue(cached.cached)
            self.assertEqual(first.nextCursor, '1')
            params = get.call_args.kwargs['params']
            self.assertEqual(params['startDateTime'], '2027-01-02T20:00:00Z')
            self.assertEqual(params['endDateTime'], '2027-01-04T19:59:59Z')
            service.discover(query.model_copy(update={'region': 'abudhabi'}))
            self.assertEqual(get.call_count, 2)

    def test_event_cache_expires_and_is_bounded(self):
        with patch.object(service.requests, 'get', return_value=response({'_embedded': {'events': [EVENT]}})) as get:
            for number in range(66):
                service.discover(service.DiscoveryQuery(category='events', query=str(number)))
            self.assertEqual(len(service._event_cache), 64)
            with patch.object(service.clock, 'monotonic', return_value=10**15):
                result = service.discover(service.DiscoveryQuery(category='events', query='65'))
            self.assertFalse(result.cached)
            self.assertEqual(get.call_count, 67)

    def test_errors_do_not_leak_key_or_become_success(self):
        with patch.object(service.requests, 'get', side_effect=RuntimeError('https://provider/?key=test-secret')):
            result = service.discover(service.DiscoveryQuery(category='restaurants'))
        self.assertEqual(result.status, 'unavailable')
        self.assertNotIn('test-secret', result.model_dump_json())
        with patch.object(service.requests, 'get', return_value=response({'status': 'REQUEST_DENIED'})):
            self.assertEqual(service.discover(service.DiscoveryQuery(category='restaurants')).status, 'unavailable')

    def test_missing_credentials_never_calls_network(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(service.requests, 'get') as get:
            self.assertEqual(service.discover(service.DiscoveryQuery(category='events')).status, 'unavailable')
            self.assertEqual(service.discover(service.DiscoveryQuery(category='stays')).status, 'unavailable')
            get.assert_not_called()

    def test_empty_and_invalid_dates_not_conflated_with_outage(self):
        with patch.object(service.requests, 'get', return_value=response({'status': 'ZERO_RESULTS'})):
            self.assertEqual(service.discover(service.DiscoveryQuery(category='restaurants')).status, 'empty')
        with self.assertRaises(ValidationError):
            service.DiscoveryQuery(category='events', start_date='2027-01-03', end_date='2027-01-02')
        with self.assertRaises(ValueError):
            service.event_date_range('sometime next summer')
        self.assertEqual(service.event_date_range('2027-01-03 to 2027-01-05'), (date(2027, 1, 3), date(2027, 1, 5)))

    def test_resolve_validates_identity_and_uae_and_reports_unavailable(self):
        with patch.object(service.requests, 'get', return_value=response({'status': 'OK', 'result': GOOGLE})) as get:
            result = service.resolve_places(['google:ChIJ_test', 'google:ChIJ_test', 'https://bad', 'google:other'])
        self.assertEqual(len(result['items']), 1)
        self.assertEqual(result['unavailable'], ['https://bad', 'google:other'])
        self.assertEqual(get.call_count, 2)

    def test_html_attribution_is_safe_structured_text(self):
        result = service.attributions(['<a href="https://example.com">Data owner</a>', '<a href="javascript:alert(1)">Other</a>'])
        self.assertEqual(result, [{'label': 'Data owner', 'url': 'https://example.com'}, {'label': 'Other', 'url': ''}])

    def test_http_auth_validation_limit_and_service_parity(self):
        app = FastAPI()
        app.include_router(routes.router)
        client = TestClient(app)
        self.assertEqual(client.post('/api/v1/discovery/search', json={'category': 'restaurants'}).status_code, 401)
        app.dependency_overrides[routes.auth.get_current_user] = lambda: SimpleNamespace(id=99)
        expected = service.DiscoveryResult(provider='google', status='empty', message='No matches', checkedAt=service.now_iso())
        with patch.object(routes, 'discover', return_value=expected) as discover:
            result = client.post('/api/v1/discovery/search', json={'category': 'restaurants', 'region': 'dubai'})
            self.assertEqual(result.json(), expected.model_dump(mode='json'))
            self.assertEqual(result.headers['cache-control'], 'no-store')
            self.assertEqual(discover.call_args.args[0].region, 'dubai')
            self.assertEqual(client.post('/api/v1/discovery/search', json={'category': 'not-a-category'}).status_code, 422)
            self.assertEqual(client.post('/api/v1/discovery/resolve', json={'ids': ['../../bad']}).status_code, 422)
            for _ in range(20):
                client.post('/api/v1/discovery/search', json={'category': 'restaurants'})
            self.assertEqual(client.post('/api/v1/discovery/search', json={'category': 'restaurants'}).status_code, 429)

    def test_agent_tools_use_shared_results_and_do_not_ignore_event_dates(self):
        import masarAiTools as agent
        expected = service.DiscoveryResult(provider='google', status='empty', message='No matches', checkedAt=service.now_iso())
        with patch.object(agent, 'discover', return_value=expected) as discover:
            data = json.loads(agent.search_restaurants.func('Emirati', 'Dubai'))
            self.assertEqual(data['status'], expected.status)
            self.assertEqual(discover.call_args.args[0].category, 'restaurants')
            agent.search_live_events.func('Dubai', '2027-01-03', 'Art')
            self.assertEqual(discover.call_args.args[0].start_date, date(2027, 1, 3))
            calls = discover.call_count
            agent.search_live_events.func('Dubai', 'sometime later')
            self.assertEqual(discover.call_count, calls)
        self.assertIn(agent.resolve_discovery_places, agent.get_event_tools())
        for tools in [agent.get_event_tools(), agent.get_accommodation_tools(), agent.get_orchestrator_tools()]:
            names = [tool.name for tool in tools]
            self.assertEqual(len(names), len(set(names)))
            self.assertIn('resolve_discovery_places', names)


if __name__ == '__main__':
    unittest.main()
