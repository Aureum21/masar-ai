"""Unit tests for Dual-Engine Receipt OCR (PaddleOCR + OpenAI Vision) and Planet Refund Candidate Rules."""
import unittest
from datetime import date, timedelta
from receipts.extraction import parse_receipt_text_lines, evaluate_planet_candidate
from receipts.schemas import ReceiptFields


class ReceiptOCRPlanetCandidateTests(unittest.TestCase):
    def test_eligible_goods_over_250_with_planet_tag_is_candidate(self):
        lines = [
            "Apple Store",
            "The Dubai Mall",
            "Tax Invoice",
            "TRN: 100234567890003",
            "Date: 2026-10-24",
            "iPhone 16 Pro Max",
            "Total: 3499.00 AED",
            "VAT (5%): 166.62 AED",
            "Planet Tax Free Tag: 902847192847"
        ]
        result = parse_receipt_text_lines(lines)
        self.assertEqual(result['merchant_name'], "Apple Store")
        self.assertEqual(result['category'], "electronics")
        self.assertFalse(result['is_service'])
        self.assertEqual(result['currency'], "AED")
        self.assertEqual(result['total_amount'], "3499.00")
        self.assertEqual(result['vat_amount'], "166.62")
        self.assertEqual(result['trn'], "100234567890003")
        self.assertTrue(result['has_planet_tag'])
        self.assertTrue(result['is_refund_candidate'])
        self.assertIn("Eligible candidate", result['candidate_reason'])

        # Verify validates through ReceiptFields
        validated = ReceiptFields(**result).model_dump(mode='json')
        self.assertEqual(validated['merchant_name'], "Apple Store")
        self.assertTrue(validated['is_refund_candidate'])

    def test_excluded_services_hotel_and_dining_are_rejected(self):
        hotel_lines = [
            "Atlantis The Royal",
            "Palm Jumeirah",
            "TRN: 100987654321001",
            "Date: 2026-10-24",
            "Room Charge - 2 Nights",
            "Total: 2850.00 AED",
            "VAT: 135.71 AED",
            "Planet Tax Free Tag: 902111"
        ]
        result = parse_receipt_text_lines(hotel_lines)
        self.assertTrue(result['is_service'])
        self.assertEqual(result['category'], "hotel")
        self.assertFalse(result['is_refund_candidate'])
        self.assertIn("Excluded from tourist refund", result['candidate_reason'])

        dining_lines = [
            "Nobu Dubai",
            "Dining & Beverage",
            "Total: 650.00 AED",
            "VAT: 30.95 AED"
        ]
        dining_result = parse_receipt_text_lines(dining_lines)
        self.assertTrue(dining_result['is_service'])
        self.assertEqual(dining_result['category'], "dining")
        self.assertFalse(dining_result['is_refund_candidate'])

    def test_below_250_minimum_threshold_is_rejected(self):
        zara_lines = [
            "Zara",
            "Dubai Hills Mall",
            "Total: 185.00 AED",
            "VAT: 8.81 AED",
            "Planet Tax Free Tag: 902333"
        ]
        result = parse_receipt_text_lines(zara_lines)
        self.assertFalse(result['is_refund_candidate'])
        self.assertIn("Below minimum threshold", result['candidate_reason'])

    def test_missing_planet_tag_is_flagged(self):
        retail_lines = [
            "Sharaf DG",
            "Mall of the Emirates",
            "Headphones",
            "Total: 850.00 AED",
            "VAT: 40.48 AED"
        ]
        result = parse_receipt_text_lines(retail_lines)
        self.assertFalse(result['has_planet_tag'])
        self.assertFalse(result['is_refund_candidate'])
        self.assertIn("Missing Planet Tax Free tag", result['candidate_reason'])

    def test_expired_purchases_over_90_days_are_rejected(self):
        old_date = (date.today() - timedelta(days=95)).isoformat()
        candidate, reason = evaluate_planet_candidate(
            total_amount="1200.00",
            vat_amount="57.14",
            currency="AED",
            category="fashion",
            is_service=False,
            has_planet_tag=True,
            purchase_date=old_date
        )
        self.assertFalse(candidate)
        self.assertIn("over 90 days old", reason)


if __name__ == '__main__':
    unittest.main()
