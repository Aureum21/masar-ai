"""Offline planning checks: no database, model, provider or production calls."""
import os
os.environ['MASAR_ENV'] = 'test'
os.environ.setdefault('DATABASE_URL', 'postgresql+asyncpg://masar_phase0:local_test_only@127.0.0.1:55432/masar_phase0')
os.environ['OPENAI_API_KEY'] = 'isolated-time-travel-fixture'
os.environ['LANGSMITH_TRACING'] = 'false'

import json
from pathlib import Path
import unittest
from unittest.mock import Mock, patch

from domain.attractions import BY_ID
from domain.itinerary_validation import PlanConflict
from domain.planning import PlanningDraft
from domain.time_travel_planning import ARCHIVE_BY_PLACE, recommendation, planner_instructions, require_visit


class TimeTravelPlanning(unittest.TestCase):
    def test_all_eleven_archives_have_valid_selectable_planning_destinations(self):
        archives = json.loads(Path('data/heritage_archive.v1.json').read_text(encoding='utf-8'))
        self.assertEqual(set(ARCHIVE_BY_PLACE.values()), set(archives))
        for identity in ARCHIVE_BY_PLACE:
            self.assertIn(identity, BY_ID)
            PlanningDraft(selections=[{'id': identity}])

    def test_choice_varies_between_runs_and_is_stable_during_repairs(self):
        first = recommendation(seed='run-1')
        self.assertEqual(first, recommendation(seed='run-1'))
        self.assertGreater(len({recommendation(seed=f'run-{i}')['place_id'] for i in range(50)}), 5)

    def test_dubai_shortlist_selects_nearby_sites_and_reuses_heritage(self):
        draft = {'selections': [{'id': 'burj-khalifa-sky'}]}
        for index in range(30):
            self.assertNotIn(recommendation(draft, seed=str(index))['emirate'], {'fujairah', 'rasalkhaimah', 'abudhabi'})
        draft['selections'] = [{'id': 'qasr-al-hosn'}]
        self.assertEqual(recommendation(draft, seed='anything')['place_id'], 'qasr-al-hosn')

    def test_known_essential_conflicts_never_enter_random_pool(self):
        draft = {'selections': [{'id': 'dhayah-fort'}], 'brief': {'traveller_support': [
            {'traveller': 1, 'needs': ['step_free'], 'essential': ['step_free']}]}}
        for index in range(20):
            self.assertNotEqual(recommendation(draft, seed=str(index))['place_id'], 'dhayah-fort')

    def test_save_requires_the_same_random_pick_as_the_planner(self):
        seed = 'stable-planning-run'
        chosen = recommendation(seed=seed)
        wrong = next(identity for identity in ARCHIVE_BY_PLACE if identity != chosen['place_id'])
        with self.assertRaises(PlanConflict):
            require_visit({'days': [{'activities': [{'title': 'Other fort', 'place_id': wrong}]}]}, seed=seed)
        result = require_visit({'days': [{'activities': [
            {'title': chosen['title'], 'place_id': chosen['place_id']}]}]}, seed=seed)
        self.assertIn(chosen['place_id'], result['planning_review']['time_travel_visits'])

    def test_real_visit_annotated_even_when_challenges_disabled(self):
        raw = {'days': [{'activities': [{'title': 'Visit Qasr Al Hosn', 'place_id': 'qasr-al-hosn'}]}]}
        saved = require_visit(raw, {'brief': {'challenges_enabled': False}})
        activity = saved['days'][0]['activities'][0]
        self.assertEqual(activity['time_travel']['landmark_id'], 'qasr_al_hosn')
        self.assertNotIn('challenge', activity)
        self.assertNotIn('points_awarded', activity)
        self.assertEqual(saved['planning_review']['time_travel_visits'], ['qasr-al-hosn'])

    def test_notes_forged_metadata_and_transport_do_not_count_as_visits(self):
        for activity in [
            {'title': 'Visit Al Fahidi', 'time_travel': {'landmark_id': 'al_fahidi'}},
            {'title': 'Rest', 'place_id': 'al-fahidi', 'kind': 'rest'},
            {'title': 'Drive past the fort', 'place_id': 'qasr-al-hosn', 'kind': 'transport'},
        ]:
            with self.subTest(activity=activity), self.assertRaises(PlanConflict):
                require_visit({'days': [{'activities': [activity]}]})

    def test_random_recommendation_reaches_the_model_prompt(self):
        from MasarAi import MasarAi
        from langchain_core.messages import AIMessage
        agent = MasarAi()
        agent.trip_planner_llm = Mock()
        agent.trip_planner_llm.invoke.return_value = AIMessage(content='Preparing the visit')
        agent.trip_planner_agent({'messages': [], 'planning_run_id': 'run-1'})
        messages = agent.trip_planner_llm.invoke.call_args.args[0]
        self.assertIn('TIME TRAVEL VISIT REQUIREMENT', messages[0].content)
        self.assertIn(recommendation(seed='run-1')['place_id'], messages[0].content)


class SaveRequirement(unittest.IsolatedAsyncioTestCase):
    async def test_missing_site_rejected_before_database_write(self):
        from masarAiTools import save_trip_to_database, TripItineraryDay
        for structured in [False, True]:
            from tests.test_planning_brief import draft
            settings = {'user_id': '1'}
            if structured:
                settings['trip_brief'] = draft()
            with patch('masarAiTools.AsyncSessionLocal') as sessions:
                result = await save_trip_to_database.coroutine(
                    title='Missing heritage', destination='Dubai', duration_days=3,
                    budget_tier='Standard', vibes=[],
                    itinerary_days=[TripItineraryDay(day_number=i, theme='Explore',
                        activities=[{'title': 'Skyline', 'place_id': 'burj-khalifa'}]) for i in range(1, 4)],
                    config={'configurable': settings})
            self.assertEqual(result['status'], 'validation_error')
            self.assertEqual(result['issues'][0]['code'], 'missing_time_travel_visit')
            sessions.assert_not_called()
