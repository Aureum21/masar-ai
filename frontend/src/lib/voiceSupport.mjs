export const speechLanguage = locale => ({en: 'en-US', ar: 'ar-AE', hi: 'hi-IN'})[locale] || 'en-US';

export const voiceLabels = {
  en: {start: 'Speak to MASAR', stop: 'Stop listening', listening: 'Listening… speak now.', review: 'Review your words, then send.', unsupported: 'Voice input is not available in this browser.', denied: 'Microphone access was denied.', failed: 'Could not hear you. Try again.', listen: 'Listen to reply', stopReply: 'Stop reading', outputUnavailable: 'Spoken replies are not available in this browser.'},
  ar: {start: 'تحدث إلى مسار', stop: 'إيقاف الاستماع', listening: 'أستمع إليك الآن…', review: 'راجع كلماتك ثم أرسلها.', unsupported: 'الإدخال الصوتي غير متاح في هذا المتصفح.', denied: 'تم رفض الوصول إلى الميكروفون.', failed: 'تعذر سماعك. حاول مرة أخرى.', listen: 'استمع إلى الرد', stopReply: 'إيقاف القراءة', outputUnavailable: 'الردود الصوتية غير متاحة في هذا المتصفح.'},
  hi: {start: 'MASAR से बोलें', stop: 'सुनना बंद करें', listening: 'सुन रहे हैं… अब बोलें।', review: 'अपने शब्द जाँचें, फिर भेजें।', unsupported: 'इस ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है।', denied: 'माइक्रोफ़ोन की अनुमति नहीं मिली।', failed: 'आपकी आवाज़ नहीं सुन पाए। फिर कोशिश करें।', listen: 'जवाब सुनें', stopReply: 'पढ़ना बंद करें', outputUnavailable: 'इस ब्राउज़र में बोले गए जवाब उपलब्ध नहीं हैं।'}
};

export function speechText(markdown) {
  return String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/(?:^|\n)\s*#{1,6}\s*/g, ' ')
    .replace(/[\*_`~>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
