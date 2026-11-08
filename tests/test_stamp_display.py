"""Display contracts for old and new collectible awards; no database writes."""
import unittest
from types import SimpleNamespace
from datetime import datetime,timezone
from passport.service import stamp_view,stamp_place_label

class StampDisplayTests(unittest.TestCase):
    def test_old_coordinate_string_resolves_to_its_known_planned_venue(self):
        label=stamp_place_label("{'lat': 25.1142, 'lng': 55.1399}")
        self.assertIn('Palm Jumeirah Mall',label)
        self.assertNotIn('lat',label)

    def test_display_preserves_xp_and_does_not_rewrite_saved_award(self):
        raw={'title':'Boxing Challenge','place':"{'lat': 25.1142, 'lng': 55.1399}"}
        award=SimpleNamespace(stamp=raw,id='stamp',trip_id='trip',challenge_id='challenge',submission_id='submission',xp=60,is_demo=False,earned_at=datetime.now(timezone.utc))
        result=stamp_view(award)
        self.assertEqual(result['xp'],60)
        self.assertEqual(result['submission_id'],'submission')
        self.assertIn('Palm Jumeirah Mall',result['place'])
        self.assertEqual(raw['place'],"{'lat': 25.1142, 'lng': 55.1399}")

    def test_names_and_unrecognized_locations_are_not_invented(self):
        self.assertEqual(stamp_place_label('Al Fahidi'),'Al Fahidi')
        self.assertEqual(stamp_place_label({'name':'Actual venue'}),'Actual venue')
        self.assertEqual(stamp_place_label({'lat':0,'lng':0}),'0.0000°, 0.0000°')
        self.assertEqual(stamp_place_label('{malformed}'),'UAE destination')
        self.assertEqual(stamp_place_label({'lat':999,'lng':0}),'UAE destination')
