"""Display-language preferences never change provider schemas or stored amounts."""
LANGUAGE_NAMES = {'en': 'English', 'ar': 'Arabic', 'hi': 'Hindi'}


def response_language_instruction(locale):
    language = LANGUAGE_NAMES.get(locale, 'English')
    return (
        f'Write user-facing answers and progress updates in {language}. '
        'Keep tool names, JSON keys, enum values, provider IDs, booking references, '
        'currency codes, URLs, dates used by tools, and monetary amounts unchanged. '
        'Do not translate or reinterpret user-supplied names or references. '
        'Use clear Modern Standard Arabic for Arabic and natural Hindi for Hindi. '
        'This display preference does not authorize any booking or other action.'
    )


def planning_clarification(locale, missing):
    """Local clarification copy; never starts a model/translation request."""
    if locale == 'en':
        return 'Before I research your trip, ' + ' '.join(item['message'] for item in missing) + ' Update these choices in your [trip brief](/plan), then continue planning.'
    labels = {
        'ar': {'start_date': 'اختر تاريخ وصول يبدأ من اليوم أو بعده.', 'end_date': 'اختر تاريخ المغادرة، مع ليلة واحدة على الأقل إذا كنت تحتاج إلى إقامة.',
               'flight_requirement': 'حدّد ما إذا كنت تحتاج إلى البحث عن رحلات طيران أو سبق أن رتّبتها أو لا تحتاج إليها.',
               'stay_requirement': 'حدّد ما إذا كنت تحتاج إلى البحث عن إقامة أو سبق أن رتّبتها أو لا تحتاج إليها.',
               'origin': 'حدّد المدينة أو المطار الذي ستغادر منه.'},
        'hi': {'start_date': 'आज या उसके बाद की आगमन तारीख चुनें।', 'end_date': 'प्रस्थान की तारीख चुनें। ठहरने की जगह चाहिए तो कम-से-कम एक रात रखें।',
               'flight_requirement': 'बताएँ कि उड़ानें खोजनी हैं, उनकी व्यवस्था पहले से है या उनकी ज़रूरत नहीं है।',
               'stay_requirement': 'बताएँ कि ठहरने की जगह खोजनी है, उसकी व्यवस्था पहले से है या उसकी ज़रूरत नहीं है।',
               'origin': 'वह शहर या हवाई अड्डा बताएँ जहाँ से आप यात्रा करेंगे।'},
    }
    locale = locale if locale in labels else 'en'
    if locale == 'en': return planning_clarification('en', missing)
    details = ' '.join(dict.fromkeys(labels[locale].get(item['field'], '') for item in missing))
    return (f'قبل البحث عن رحلتك، {details} حدّث هذه الخيارات في [موجز الرحلة](/plan)، ثم تابع التخطيط.' if locale == 'ar'
            else f'यात्रा की खोज शुरू करने से पहले, {details} [यात्रा की रूपरेखा](/plan) में ये जानकारी अपडेट करके आगे बढ़ें।')
