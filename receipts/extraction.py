"""Bounded dual-engine receipt extraction: on-device PaddleOCR combined with OpenAI Vision.
Evaluates Planet Tax Free UAE Tourist Refund eligibility based on official FTA guidelines.
"""
import asyncio
import base64
import json
import logging
import os
import re
from datetime import date
from decimal import Decimal
from io import BytesIO
from typing import Any, Dict, List, Tuple

from .schemas import ReceiptFields

logger = logging.getLogger(__name__)

# Keywords for UAE Tourist Refund Scheme (TRS) operated by Planet Payment
SERVICE_KEYWORDS = {
    'hotel', 'resort', 'room charge', 'stay', 'accommodation', 'hospitality',
    'restaurant', 'cafe', 'coffee', 'dining', 'bistro', 'buffet', 'food & beverage',
    'burger', 'pizza', 'shawarma', 'grill', 'bar', 'lounge', 'catering',
    'car rental', 'rent a car', 'taxi', 'uber', 'careem', 'parking', 'transport',
    'spa', 'massage', 'salon', 'haircut', 'wellness',
    'cinema', 'ticket', 'admission', 'theme park', 'telecom', 'recharge', 'sim card'
}

GOODS_KEYWORDS = {
    'apple', 'samsung', 'sharaf dg', 'virgin megastore', 'electronics', 'mobile', 'laptop', 'iphone', 'macbook',
    'bloomingdale', 'harvey nichols', 'zara', 'h&m', 'gucci', 'dior', 'chanel', 'louis vuitton',
    'fashion', 'clothing', 'apparel', 'shoes', 'footwear', 'bag', 'handbag',
    'perfume', 'fragrance', 'cosmetics', 'makeup', 'beauty products',
    'watch', 'watches', 'jewelry', 'jewellery', 'gold', 'diamond',
    'retail', 'department store', 'souvenir', 'gift shop'
}

PLANET_TAG_KEYWORDS = {
    'planet', 'planet payment', 'planet tax free', 'tax free tag', 'tourist refund',
    'tag number', 'tag no', 'tag#', 'trs', 'tax refund scheme', 'vat refund tag',
    'digital tag', 'scan to track', 'claim your vat back', 'www.planetpayment.ae'
}


def evaluate_planet_candidate(
    total_amount: str | None,
    vat_amount: str | None,
    currency: str | None,
    category: str | None,
    is_service: bool | None,
    has_planet_tag: bool | None,
    purchase_date: str | None
) -> Tuple[bool, str]:
    """Evaluates whether the receipt meets Planet Payment UAE Tourist Tax Free refund criteria.
    Rules researched from UAE Federal Tax Authority (FTA) and Planet Payment:
    1. Only physical, exportable goods qualify. Services (hotel, dining, transport) are excluded.
    2. Minimum gross invoice amount of AED 250 is strictly required.
    3. Currency must be UAE Dirhams (AED).
    4. Must have a Planet Tax-Free digital tag/barcode issued by the merchant.
    5. Purchase must be exported and validated within 90 days from the purchase date.
    """
    if is_service is True or category in {'hotel', 'dining', 'services'}:
        return False, "Excluded from tourist refund: Services, hotel stays, restaurant dining, and consumed food/beverages do not qualify."

    if currency and currency != 'AED':
        return False, f"Non-qualifying currency ({currency}): Planet Tax Free only validates UAE Dirhams (AED) transactions."

    if total_amount is not None:
        try:
            total_num = float(str(total_amount).replace(',', ''))
            if total_num < 250.0:
                return False, f"Below minimum threshold: Total spend ({total_num:.2f} AED) is under the required AED 250 minimum."
        except ValueError:
            pass

    if purchase_date:
        try:
            p_date = date.fromisoformat(str(purchase_date))
            today = date.today()
            if p_date > today:
                return False, "Invalid date: Purchase date is recorded in the future."
            if (today - p_date).days > 90:
                return False, f"Expired for tourist refund: Purchase is over 90 days old ({(today - p_date).days} days). Planet requires export validation within 90 days."
        except ValueError:
            pass

    if not has_planet_tag:
        return False, "Missing Planet Tax Free tag: No Planet validation tag or barcode detected. A Planet digital or sticker tag is required before departure."

    return True, "Eligible candidate for Planet Tourist VAT Refund: Physical goods over AED 250 with Planet Tax-Free Tag within the 90-day export window."


def parse_receipt_text_lines(lines: List[str]) -> Dict[str, Any]:
    """Rule-based extractor for UAE Tax Invoices and Planet Tax Free tags from OCR text lines."""
    raw_text = "\n".join(lines)
    lower = raw_text.lower()

    # 1. 15-digit UAE TRN (Tax Registration Number, typically starts with 100)
    trn = None
    trn_match = re.search(r'\b(100\d{12})\b', raw_text)
    if trn_match:
        trn = trn_match.group(1)
    else:
        trn_any = re.search(r'(?:trn|tax\s*reg|registration\s*no)[:\s]*(\d{15})', raw_text, re.IGNORECASE)
        if trn_any:
            trn = trn_any.group(1)

    # 2. Planet Tax-Free Tag / QR code / barcode
    has_planet = any(kw in lower for kw in PLANET_TAG_KEYWORDS)
    planet_tag_no = None
    tag_match = re.search(r'(?:tag\s*no|tag\s*#|tag\s*number|planet\s*tag|tax\s*free\s*tag|reference)[:\s#]*([0-9A-Za-z-]{8,25})', raw_text, re.IGNORECASE)
    if tag_match:
        planet_tag_no = tag_match.group(1)
        has_planet = True

    # 3. Currency
    currency = None
    if any(c in lower for c in ['aed', 'dhs', 'dirham', 'د.إ']):
        currency = 'AED'
    elif 'usd' in lower or '$' in raw_text:
        currency = 'USD'
    elif 'eur' in lower or '€' in raw_text:
        currency = 'EUR'

    # 4. Service vs Physical Goods Category
    is_service = None
    category = 'unknown'
    if any(kw in lower for kw in SERVICE_KEYWORDS):
        is_service = True
        if any(kw in lower for kw in ['hotel', 'resort', 'room charge', 'stay']):
            category = 'hotel'
        elif any(kw in lower for kw in ['restaurant', 'cafe', 'dining', 'coffee', 'food', 'buffet']):
            category = 'dining'
        else:
            category = 'services'
    elif any(kw in lower for kw in GOODS_KEYWORDS):
        is_service = False
        if any(kw in lower for kw in ['electronics', 'mobile', 'laptop', 'apple', 'sharaf dg', 'phone', 'iphone', 'macbook']):
            category = 'electronics'
        elif any(kw in lower for kw in ['fashion', 'clothing', 'apparel', 'shoes', 'bag', 'zara', 'bloomingdale', 'gucci', 'dior']):
            category = 'fashion'
        else:
            category = 'retail'

    # 5. Purchase Date
    purchase_date = None
    date_match = re.search(r'\b(202[4-7][-/.](?:0[1-9]|1[0-2])[-/.](?:0[1-9]|[12]\d|3[01]))\b', raw_text)
    if date_match:
        purchase_date = date_match.group(1).replace('/', '-').replace('.', '-')
    else:
        dmy_match = re.search(r'\b((?:0[1-9]|[12]\d|3[01])[-/.](?:0[1-9]|1[0-2])[-/.](202[4-7]))\b', raw_text)
        if dmy_match:
            parts = re.split(r'[-/.]', dmy_match.group(1))
            purchase_date = f"{parts[2]}-{parts[1]}-{parts[0]}"

    # 6. Amounts (Total & 5% VAT)
    total_amount = None
    vat_amount = None
    total_match = re.search(r'(?:total|grand\s*total|amount\s*paid|due|net\s*payable)[:\s]*(?:aed|dhs)?[:\s]*([0-9,]+\.[0-9]{2})', raw_text, re.IGNORECASE)
    if total_match:
        total_amount = total_match.group(1).replace(',', '')

    vat_match = re.search(r'(?:vat(?:\s*\(?5%\)?)?|tax(?:\s*\(?5%\)?)?)[:\s]*(?:aed|dhs)?[:\s]*([0-9,]+\.[0-9]{2})', raw_text, re.IGNORECASE)
    if vat_match:
        vat_amount = vat_match.group(1).replace(',', '')

    # 7. Merchant Name (first prominent non-noise header line)
    merchant_name = None
    for line in lines[:6]:
        clean_line = line.strip()
        if len(clean_line) >= 3 and not any(kw in clean_line.lower() for kw in ['tax invoice', 'trn', 'date', 'receipt', 'welcome', 'tel', 'phone', 'dubai', 'uae', 'vat', 'simplified']):
            merchant_name = clean_line[:150]
            break

    # 8. Planet Tax Free Candidate Evaluation
    is_candidate, candidate_reason = evaluate_planet_candidate(
        total_amount=total_amount,
        vat_amount=vat_amount,
        currency=currency,
        category=category,
        is_service=is_service,
        has_planet_tag=has_planet,
        purchase_date=purchase_date
    )

    return {
        'merchant_name': merchant_name,
        'purchase_date': purchase_date,
        'currency': currency,
        'total_amount': total_amount,
        'vat_amount': vat_amount,
        'category': category,
        'is_service': is_service,
        'has_planet_tag': has_planet,
        'trn': trn,
        'planet_tag_number': planet_tag_no,
        'is_refund_candidate': is_candidate,
        'candidate_reason': candidate_reason,
        'detected_lines': lines,
        'raw_text': raw_text
    }


def run_paddle_ocr(data: bytes) -> Dict[str, Any]:
    """Runs on-device PaddleOCR lazily, extracting text lines from the receipt image."""
    lines: List[str] = []
    try:
        from PIL import Image, ImageOps
        import numpy as np

        with Image.open(BytesIO(data)) as original:
            image = ImageOps.exif_transpose(original).convert('RGB')
            image.thumbnail((2000, 2000))
            img_array = np.array(image)

        try:
            from passport.vision_models import get_paddle_ocr
            ocr = get_paddle_ocr()
        except (ImportError, AttributeError):
            from paddleocr import PaddleOCR
            ocr = PaddleOCR(
                text_detection_model_name='PP-OCRv5_mobile_det',
                text_recognition_model_name='en_PP-OCRv5_mobile_rec',
                use_doc_orientation_classify=False,
                use_doc_unwarping=False,
                use_textline_orientation=False,
                device='cpu',
                enable_mkldnn=False,
                cpu_threads=2
            )

        predictions = ocr.predict(img_array)
        for output in predictions:
            out_data = output.json
            if callable(out_data):
                out_data = out_data()
            if isinstance(out_data, str):
                out_data = json.loads(out_data)
            out_data = out_data.get('res', out_data) if isinstance(out_data, dict) else out_data
            if isinstance(out_data, dict):
                rec_texts = out_data.get('rec_texts', [])
                for t in rec_texts:
                    if t and str(t).strip():
                        lines.append(str(t).strip())
            elif isinstance(out_data, list):
                for item in out_data:
                    if isinstance(item, (list, tuple)) and len(item) >= 2 and isinstance(item[1], (list, tuple)):
                        lines.append(str(item[1][0]).strip())
    except Exception as e:
        logger.debug("PaddleOCR optional step bypassed: %s", e)

    return parse_receipt_text_lines(lines)


async def extract(data: bytes) -> Dict[str, Any]:
    """Dual-engine extraction: executes PaddleOCR on-device text parsing and optionally
    enhances with OpenAI Vision to detect VAT details and Planet Tax Free refund eligibility.
    """
    # Step 1: Run on-device PaddleOCR (thread-safe, CPU-based)
    paddle_result = await asyncio.to_thread(run_paddle_ocr, data)

    # Step 2: Check if OpenAI Vision is configured
    openai_enabled = os.getenv('RECEIPT_OCR_ENABLED', 'true').lower() == 'true'
    openai_key = os.getenv('OPENAI_API_KEY')

    raw = {}
    if openai_enabled and openai_key:
        try:
            from openai import AsyncOpenAI
            paddle_lines = paddle_result.get('detected_lines', [])
            paddle_context = f"\nOn-device PaddleOCR detected text lines:\n{json.dumps(paddle_lines, ensure_ascii=False)}" if paddle_lines else ""

            system_prompt = (
                "You are the MASAR UAE Tax-Free Receipt Extraction Assistant.\n"
                "Analyze the receipt image and pre-extracted PaddleOCR text according to the UAE Federal Tax Authority (FTA) "
                "and Planet Tax Free Tourist Refund Scheme criteria.\n\n"
                "PLANET TAX FREE REFUND ELIGIBILITY RULES IN THE UAE:\n"
                "1. ELIGIBLE GOODS: Only physical, exportable goods (electronics, mobile phones, computers, fashion, apparel, "
                "jewelry, watches, perfumes, cosmetics, retail goods) qualify for tourist refund.\n"
                "2. EXCLUDED SERVICES: Services of any kind are strictly INELIGIBLE. This includes hotel stays, resort charges, "
                "room service, restaurants, cafes, dining, food & beverage consumed in UAE, car rentals, transport, spa, salon, "
                "and event tickets. If any of these are present, set is_service=true and category='hotel', 'dining', or 'services'.\n"
                "3. MINIMUM SPEND: Total purchase must be at least AED 250 (including VAT) on a single invoice. Purchases under AED 250 are strictly INELIGIBLE.\n"
                "4. PLANET TAX FREE TAG: Must have a Planet Tax Free Tag (sticker with barcode, QR code, or Planet tag reference number) "
                "registered by the merchant with the tourist's passport. Set has_planet_tag=true if evidence of a Planet tax free tag/QR code/number is visible.\n"
                "5. CURRENCY: Must be UAE Dirhams (AED). Other currencies do not qualify.\n"
                "6. 90-DAY EXPORT LIMIT: Purchases must be validated at airport/border within 90 days from the purchase date.\n"
                "7. TAX REGISTRATION NUMBER (TRN): Look for the merchant's 15-digit UAE TRN (typically starts with 100).\n\n"
                "Return a strictly valid JSON object with the following fields:\n"
                "- merchant_name: string or null\n"
                "- purchase_date: YYYY-MM-DD string or null\n"
                "- currency: 3-letter ISO code (e.g. 'AED') or null\n"
                "- total_amount: decimal string including VAT (e.g. '3499.00') or null\n"
                "- vat_amount: decimal string of 5% VAT (e.g. '166.62') or null\n"
                "- category: one of 'retail', 'electronics', 'fashion', 'hotel', 'dining', 'services', 'mixed', 'unknown'\n"
                "- is_service: boolean (true if hotel, dining, or services; false if tangible goods)\n"
                "- has_planet_tag: boolean (true only if Planet Tax Free tag, barcode, tag number, or QR code is present)\n"
                "- trn: 15-digit UAE TRN string or null\n"
                "- planet_tag_number: string or null\n"
                "- is_refund_candidate: boolean (true if total >= 250 AED, tangible goods, has Planet tag, and not a service)\n"
                "- candidate_reason: short explanation of candidate status or why it is rejected"
            )

            async with asyncio.timeout(35):
                async with AsyncOpenAI(timeout=25, max_retries=0) as client:
                    result = await client.chat.completions.create(
                        model=os.getenv('RECEIPT_OCR_MODEL', 'gpt-4o-mini'),
                        response_format={'type': 'json_object'},
                        max_completion_tokens=650,
                        messages=[
                            {'role': 'system', 'content': system_prompt},
                            {'role': 'user', 'content': [
                                {'type': 'text', 'text': f'Read this UAE receipt and extract details.{paddle_context}'},
                                {'type': 'image_url', 'image_url': {'url': 'data:image/jpeg;base64,' + base64.b64encode(data).decode(), 'detail': 'high'}}
                            ]}
                        ]
                    )
            raw = json.loads(result.choices[0].message.content)
            if not isinstance(raw, dict):
                raw = {}
        except Exception as e:
            logger.warning("OpenAI receipt extraction did not complete: %s; falling back to PaddleOCR.", e)
            raw = {}

    # Step 3: Combine PaddleOCR and OpenAI Vision extractions
    combined = {**paddle_result}
    for k, v in raw.items():
        if v is not None:
            combined[k] = v

    # Re-evaluate candidate status if amounts or category were updated by OpenAI
    candidate, reason = evaluate_planet_candidate(
        total_amount=combined.get('total_amount'),
        vat_amount=combined.get('vat_amount'),
        currency=combined.get('currency'),
        category=combined.get('category'),
        is_service=combined.get('is_service'),
        has_planet_tag=combined.get('has_planet_tag'),
        purchase_date=combined.get('purchase_date')
    )
    combined['is_refund_candidate'] = raw.get('is_refund_candidate', candidate)
    combined['candidate_reason'] = raw.get('candidate_reason', reason)

    # If neither OpenAI nor PaddleOCR produced anything and OCR was required
    if not combined.get('merchant_name') and not combined.get('total_amount') and not openai_key:
        if not paddle_result.get('detected_lines'):
            raise RuntimeError('Receipt OCR requires either local PaddleOCR or an OpenAI API key.')

    # Clean and validate against ReceiptFields schema
    clean = {}
    for name in ReceiptFields.model_fields:
        val = combined.get(name)
        try:
            clean[name] = getattr(ReceiptFields(**{name: val}), name)
        except (ValueError, TypeError):
            clean[name] = None

    return ReceiptFields(**clean).model_dump(mode='json')
