/**
 * parseWorkerResult — Maps the structured JSON payload from the backend
 * to the format expected by the ContextPanel component.
 */

export function parseWorkerResult(type, content) {
  if (!content) {
    return { resultType: 'unknown', items: [], raw: content };
  }

  // Handle case where backend might stringify the JSON
  let parsedContent = content;
  if (typeof content === 'string') {
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      console.warn("Could not parse worker result JSON", e);
      return { resultType: 'unknown', items: [], raw: content };
    }
  }

  switch (type) {
    case 'accommodation_result':
      if (parsedContent.rooms && parsedContent.rooms.length > 0) {
        return { resultType: 'rooms', items: parsedContent.rooms, raw: parsedContent };
      }
      return { resultType: 'hotels', items: parsedContent.hotels || [], raw: parsedContent };
    case 'logistics_result':
      return { resultType: 'route', items: parsedContent.routes || [], raw: parsedContent };
    case 'event_result':
      return { resultType: 'events', items: parsedContent.events || [], raw: parsedContent };
    case 'flight_result':
      return { resultType: 'flights', items: parsedContent.flights || [], raw: parsedContent };
    // Legacy support for non-refactored types
    case 'itinerary_result':
      return { resultType: 'itinerary', items: Array.isArray(parsedContent) ? parsedContent : [parsedContent], raw: parsedContent };
    case 'booking_result':
      return { resultType: 'booking', items: Array.isArray(parsedContent) ? parsedContent : [parsedContent], raw: parsedContent };
    case 'official_info_result':
      return { resultType: 'official', items: Array.isArray(parsedContent) ? parsedContent : [parsedContent], raw: parsedContent };
    default:
      return { resultType: 'unknown', items: [], raw: parsedContent };
  }
}

export function formatCurrency(amount, currency = 'AED') {
  if (typeof amount !== 'number') return `${amount} ${currency}`;
  return `${amount.toFixed(2)} ${currency}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-AE', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}
