"""Reviewed venue evidence must retain provenance and bounded scope."""
import json
import unittest
from datetime import date
from pathlib import Path

from domain.accessibility import VENUE_FACTS, clean_evidence, compatibility, venue_evidence


class AccessibilityCatalogueTests(unittest.TestCase):
    def test_records_match_catalogue_and_survive_evidence_validation(self):
        catalogue = json.loads((Path(__file__).resolve().parents[1] / 'data/attractions.v1.json').read_text(encoding='utf-8'))
        self.assertFalse(set(VENUE_FACTS) - {item['id'] for item in catalogue})
        for identity, facts in VENUE_FACTS.items():
            with self.subTest(place=identity):
                cleaned = clean_evidence({'scope': 'venue', 'facts': facts})
                self.assertEqual(cleaned['facts'], facts)
                self.assertTrue(cleaned['confirmation_required'])
                for fact in facts.values():
                    self.assertEqual(fact['status'], 'reported')
                    self.assertTrue(fact['source_url'].startswith('https://'))
                    self.assertLessEqual(date.fromisoformat(fact['last_checked']), date(2026, 10, 30))
                    self.assertTrue(fact['note'])

    def test_fort_barrier_is_a_conflict_not_an_unknown_or_positive(self):
        brief = {'traveller_support': [{'traveller': 1, 'needs': ['step_free'], 'essential': ['step_free']}]}
        result = compatibility(venue_evidence('dhayah-fort'), brief)
        self.assertTrue(result['conflicts'])
        self.assertEqual(result['unknown'], [])

    def test_local_reports_do_not_certify_other_venues_or_missing_features(self):
        self.assertEqual(venue_evidence('old-dubai-heritage'), venue_evidence('al-fahidi'))
        self.assertEqual(venue_evidence('kite-beach-uaq')['facts'], {})
        self.assertNotIn('accessible_toilets', venue_evidence('qasr-al-watan')['facts'])
        self.assertNotIn('step_free_entrance', venue_evidence('al-fahidi')['facts'])
        self.assertNotIn('walking_distance_m', venue_evidence('jubail-mangrove-park')['facts'])


if __name__ == '__main__':
    unittest.main()
