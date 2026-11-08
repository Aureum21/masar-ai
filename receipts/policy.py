"""Versioned provisional estimates. Planet remains responsible for official validation."""
from decimal import Decimal,ROUND_HALF_UP
from datetime import date

VERSION='uae-receipt-2026-10-29'
SOURCES=['https://tax.gov.ae/en/services/tourist.VAT.refunds.aspx','https://www.planetpayment.ae/tourists-landing/tourist-frequently-asked-questions/']
SERVICE_CATEGORIES={'hotel','dining','services'}
GOODS_CATEGORIES={'retail','electronics','fashion'}

def assess(fields,today=None):
    result={'status':'needs_review','estimated_refund':None,'policy_version':VERSION,'official_status':'unknown','sources':SOURCES,
            'reason':'Confirm the receipt details and the retailer’s tax-free transaction.','assumptions':['Estimate only; tourist, merchant, goods and export validation are not performed by MASAR.']}
    total,vat=fields.get('total_amount'),fields.get('vat_amount')
    if fields.get('is_service') is True or fields.get('category') in SERVICE_CATEGORIES:
        return {**result,'status':'excluded','estimated_refund':'0.00','reason':'Services, including hotel stays and dining, are excluded from the tourist goods refund scheme.'}
    if fields.get('currency')!='AED':return {**result,'reason':'Confirm that the printed currency is AED. Other or unknown currencies cannot produce a UAE refund estimate.'}
    if fields.get('category') not in GOODS_CATEGORIES or fields.get('is_service') is not False:
        return {**result,'reason':'Confirm whether these are eligible retail goods. Mixed or unknown goods/services need review.'}
    if total is None or vat is None:return {**result,'reason':'Enter the printed total and VAT. Missing tax is never inferred.'}
    try:
        total,vat=Decimal(str(total)),Decimal(str(vat))
        if not total.is_finite() or not vat.is_finite() or total<0 or vat<0 or vat>total:raise ValueError()
    except Exception:return {**result,'reason':'Check the receipt amounts.'}
    if total<250:return {**result,'status':'below_minimum','estimated_refund':'0.00','reason':'Below the published AED 250 minimum.'}
    if total-vat<250:return {**result,'reason':'Confirm the minimum with Planet: the FTA service page describes AED 250 excluding VAT; other published summaries differ.'}
    if not fields.get('purchase_date'):return {**result,'reason':'Confirm the printed purchase date.'}
    try: purchased=date.fromisoformat(str(fields['purchase_date']))
    except ValueError:return result
    if purchased>(today or date.today()):return {**result,'reason':'The purchase date is in the future. Please correct it.'}
    if ((today or date.today())-purchased).days>90:return {**result,'reason':'This purchase is over 90 days old. Confirm validation timing directly with Planet.'}
    if fields.get('has_planet_tag') is not True:
        return {**result,'reason':'Confirm with the retailer that a tax-free transaction was issued. A logo or OCR result alone is not official proof.'}
    if vat==0:return {**result,'status':'excluded','estimated_refund':'0.00','reason':'No recorded VAT is available for a refund estimate.'}
    amount=max(Decimal(0),vat*Decimal('.87')-Decimal('3.60')).quantize(Decimal('.01'),rounding=ROUND_HALF_UP)
    return {**result,'status':'eligible','estimated_refund':str(amount),'reason':'Possible estimate: 87% of recorded VAT less AED 3.60 per transaction. Subject to Planet’s official validation.'}
