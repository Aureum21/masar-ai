"""Offline contracts for the partial per-traveller support model; no DB or provider."""
import unittest
from pydantic import ValidationError
from domain.planning import BriefDetails, PlanningDraft


class TravellerSupportContracts(unittest.TestCase):
    def test_existing_briefs_default_to_no_assigned_support(self):
        self.assertEqual(PlanningDraft.model_validate({'brief': {}}).brief.traveller_support, [])

    def test_distinct_traveller_needs_survive_json_round_trip(self):
        support = [
            {'traveller': 1, 'needs': ['step_free', 'frequent_rests'], 'essential': ['step_free']},
            {'traveller': 2, 'needs': ['captions'], 'essential': []},
        ]
        draft = PlanningDraft(brief=BriefDetails(travellers=2, traveller_support=support))
        restored = PlanningDraft.model_validate_json(draft.model_dump_json())
        self.assertEqual(restored.model_dump(mode='json',exclude_none=True)['brief']['traveller_support'], support)

    def test_essential_support_must_also_be_selected(self):
        with self.assertRaises(ValidationError):
            BriefDetails(traveller_support=[{'traveller': 1, 'needs': [], 'essential': ['step_free']}])

    def test_duplicate_or_out_of_party_travellers_are_rejected(self):
        for support in [
            [{'traveller': 1}, {'traveller': 1}],
            [{'traveller': 2}],
            [{'traveller': 0}],
        ]:
            with self.subTest(support=support), self.assertRaises(ValidationError):
                BriefDetails(travellers=1, traveller_support=support)

    def test_unknown_needs_and_diagnosis_fields_are_rejected(self):
        for support in [
            {'traveller': 1, 'needs': ['unregistered_need']},
            {'traveller': 1, 'diagnosis': 'not part of this support contract'},
        ]:
            with self.subTest(support=support), self.assertRaises(ValidationError):
                BriefDetails(traveller_support=[support])
