// Utility to safely parse hotel information from raw DB records (JSON or Python dict strings)

const UAE_HOTEL_IMAGES = [
  {
    keywords: ['meridien', 'royal meridien'],
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    stars: 5,
    location: 'Jumeirah Beach, Dubai'
  },
  {
    keywords: ['taj', 'exotica', 'palm'],
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
    stars: 5,
    location: 'Palm Jumeirah, Dubai'
  },
  {
    keywords: ['anantara'],
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
    stars: 5,
    location: 'Palm Jumeirah, Dubai'
  },
  {
    keywords: ['banyan tree', 'bluewaters'],
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
    stars: 5,
    location: 'Bluewaters Island, Dubai'
  },
  {
    keywords: ['sheraton', 'creek'],
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
    stars: 5,
    location: 'Dubai Creek, Dubai'
  },
  {
    keywords: ['radisson', 'deira'],
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80',
    stars: 4,
    location: 'Deira, Dubai'
  },
  {
    keywords: ['atlantis', 'royal'],
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
    stars: 5,
    location: 'Palm Jumeirah, Dubai'
  },
  {
    keywords: ['burj al arab', 'jumeirah'],
    image: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=800&q=80',
    stars: 5,
    location: 'Umm Suqeim, Dubai'
  },
  {
    keywords: ['emirates palace', 'mandarin'],
    image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80',
    stars: 5,
    location: 'Corniche, Abu Dhabi'
  }
];

const DEFAULT_HOTEL_IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'
];

export function parseHotelInfo(rawInfo, bookingId = 1) {
  if (!rawInfo) {
    return {
      name: 'Luxury UAE Resort & Spa',
      hotelId: `lp-resort-${bookingId}`,
      location: 'Dubai, United Arab Emirates',
      stars: 5,
      image: DEFAULT_HOTEL_IMAGES[bookingId % DEFAULT_HOTEL_IMAGES.length],
      referenceCode: `MASAR-${(bookingId * 84920 + 1042).toString(36).toUpperCase()}`
    };
  }

  let name = '';
  let hotelId = '';
  let location = 'Dubai, United Arab Emirates';
  let stars = 5;

  // 1. If it's already an object
  if (typeof rawInfo === 'object') {
    name = rawInfo.name || rawInfo.hotelName || rawInfo.title || '';
    hotelId = rawInfo.hotelId || rawInfo.id || '';
    location = rawInfo.location || rawInfo.address || location;
  } 
  // 2. Try regex extraction or JSON parsing
  else if (typeof rawInfo === 'string') {
    // Check if it's a Python dict string format (e.g. "{'hotelId': '...', 'name': '...'}")
    const nameMatch = rawInfo.match(/['"]name['"]\s*:\s*['"]([^'"]+)['"]/);
    const hotelIdMatch = rawInfo.match(/['"]hotelId['"]\s*:\s*['"]([^'"]+)['"]/);
    const locMatch = rawInfo.match(/['"]location['"]\s*:\s*['"]([^'"]+)['"]/);

    if (nameMatch) {
      name = nameMatch[1];
    }
    if (hotelIdMatch) {
      hotelId = hotelIdMatch[1];
    }
    if (locMatch) {
      location = locMatch[1];
    }

    // If regex didn't find name, try JSON.parse
    if (!name) {
      try {
        const parsed = JSON.parse(rawInfo);
        name = parsed.name || parsed.hotelName || parsed.title || '';
        hotelId = parsed.hotelId || parsed.id || '';
        location = parsed.location || parsed.address || location;
      } catch (e) {
        // Just use cleaned up string if not JSON
        name = rawInfo.replace(/[{}[\]'"]/g, '').trim();
      }
    }
  }

  // Clean up any bracket artifacts from agent outputs
  if (name) {
    name = name.replace(/^\[|\]$/g, '').trim();
  } else {
    name = 'Luxury UAE Resort & Spa';
  }

  // Match curated UAE imagery based on hotel name keywords
  const lower = name.toLowerCase();
  let matchedImage = null;
  let matchedStars = stars;
  let matchedLocation = location;

  for (const item of UAE_HOTEL_IMAGES) {
    if (item.keywords.some(k => lower.includes(k))) {
      matchedImage = item.image;
      matchedStars = item.stars;
      matchedLocation = item.location;
      break;
    }
  }

  if (!matchedImage) {
    matchedImage = DEFAULT_HOTEL_IMAGES[bookingId % DEFAULT_HOTEL_IMAGES.length];
  }

  return {
    name,
    hotelId: hotelId || `lp-${bookingId}`,
    location: matchedLocation,
    stars: matchedStars,
    image: matchedImage,
    referenceCode: `MASAR-${(bookingId * 84920 + 1042).toString(36).toUpperCase()}`
  };
}
