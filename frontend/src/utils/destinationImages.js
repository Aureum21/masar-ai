// Utility for generating curated UAE destination imagery based on itinerary titles, destinations, and vibes

const DESTINATION_HERO_IMAGES = {
  dubai: [
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=85', // Downtown skyline
    'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=1200&q=85', // Burj Khalifa & Fountain
    'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=85', // Burj Al Arab sunset
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85', // Palm Jumeirah luxury resort
    'https://images.unsplash.com/photo-1578895101408-1a36b834405b?auto=format&fit=crop&w=1200&q=85'  // Dubai Marina evening
  ],
  abudhabi: [
    'https://images.unsplash.com/photo-1590075865003-e48277faa558?auto=format&fit=crop&w=1200&q=85', // Sheikh Zayed Grand Mosque
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85', // Louvre Abu Dhabi dome
    'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=85'  // Emirates Palace / Corniche
  ],
  desert: [
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=85', // Arabian Desert Golden Hour
    'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=85'  // Red Sand Dunes
  ],
  beach: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85', // Arabian Gulf Turquoise Waters
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=85'  // Luxury Coastal Beach Club
  ],
  culture: [
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=85', // Grand Architecture
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85'  // Old Dubai Al Fahidi
  ]
};

export function getItineraryHeroImage(trip, index = null) {
  if (trip?.hero_image_url && trip.hero_image_url.startsWith('http') && !trip.hero_image_url.includes('example.com')) {
    return trip.hero_image_url;
  }

  const title = (trip?.title || '').toLowerCase();
  const dest = (trip?.destination || '').toLowerCase();
  const vibes = Array.isArray(trip?.vibes) ? trip.vibes.join(' ').toLowerCase() : '';

  // Derive stable image index from trip.id when available so cards and workspace match
  let stableIndex = 0;
  if (typeof trip?.id === 'number') {
    stableIndex = Math.abs(trip.id);
  } else if (trip?.id && !isNaN(Number(trip.id))) {
    stableIndex = Math.abs(Number(trip.id));
  } else if (typeof index === 'number') {
    stableIndex = Math.abs(index);
  } else if (trip?.id) {
    stableIndex = Math.abs(String(trip.id).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
  }

  if (dest.includes('abu dhabi') || title.includes('abu dhabi')) {
    const list = DESTINATION_HERO_IMAGES.abudhabi;
    return list[stableIndex % list.length];
  }

  if (vibes.includes('desert') || title.includes('desert') || title.includes('safari')) {
    const list = DESTINATION_HERO_IMAGES.desert;
    return list[stableIndex % list.length];
  }

  if (vibes.includes('beach') || vibes.includes('coastal') || title.includes('beach') || title.includes('resort')) {
    const list = DESTINATION_HERO_IMAGES.beach;
    return list[stableIndex % list.length];
  }

  if (vibes.includes('culture') || vibes.includes('heritage') || title.includes('culture')) {
    const list = DESTINATION_HERO_IMAGES.culture;
    return list[stableIndex % list.length];
  }

  // Default to Dubai luxury set with index rotation
  const list = DESTINATION_HERO_IMAGES.dubai;
  return list[stableIndex % list.length];
}

const ACTIVITY_IMAGE_MAP = [
  { match: ['burj khalifa', 'at the top'], url: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=800&q=80', cat: 'Iconic Skyline', icon: '🌆' },
  { match: ['dubai mall', 'fountain', 'souk al bahar'], url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80', cat: 'Luxury Shopping', icon: '🛍️' },
  { match: ['sheikh zayed', 'grand mosque', 'mosque'], url: 'https://images.unsplash.com/photo-1590075865003-e48277faa558?auto=format&fit=crop&w=800&q=80', cat: 'Architectural Heritage', icon: '🕌' },
  { match: ['museum of the future', 'future'], url: 'https://images.unsplash.com/photo-1687754715959-41fed2161528?auto=format&fit=crop&w=800&q=80', cat: 'Innovation & Art', icon: '✨' },
  { match: ['louvre', 'saadiyat'], url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80', cat: 'Fine Arts & Culture', icon: '🎨' },
  { match: ['desert', 'safari', 'dune', 'bedouin', 'camel'], url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80', cat: 'Desert Adventure', icon: '🏜️' },
  { match: ['marina', 'yacht', 'cruise', 'boat', 'water'], url: 'https://images.unsplash.com/photo-1578895101408-1a36b834405b?auto=format&fit=crop&w=800&q=80', cat: 'Waterfront Luxury', icon: '⛵' },
  { match: ['palm jumeirah', 'atlantis', 'aquaventure', 'the view'], url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80', cat: 'Coastal Island', icon: '🌴' },
  { match: ['old dubai', 'al fahidi', 'creek', 'souk', 'spice', 'gold souk', 'abra'], url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80', cat: 'Old World Heritage', icon: '🏛️' },
  { match: ['burj al arab', 'madinat', 'jumeirah'], url: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=800&q=80', cat: 'Ultra-Luxury', icon: '👑' },
  { match: ['beach', 'jbr', 'kite beach', 'la mer'], url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', cat: 'Beach & Seaside', icon: '🌊' },
  { match: ['emirates palace', 'qasr al watan', 'palace'], url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80', cat: 'Royal Landmarks', icon: '🏰' },
  { match: ['dinner', 'lunch', 'restaurant', 'culinary', 'tasting', 'brunch', 'food'], url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80', cat: 'Fine Dining', icon: '🍽️' },
  { match: ['ferrari', 'yas', 'warner', 'theme park', 'adventure'], url: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?auto=format&fit=crop&w=800&q=80', cat: 'Thrill & Leisure', icon: '🏎️' }
];

export function getActivityImage(activity, dayIndex = 0, activityIndex = 0) {
  if (activity?.image_url && activity.image_url.startsWith('http')) {
    return activity.image_url;
  }
  const text = `${activity?.title || ''} ${activity?.location || ''} ${activity?.description || ''}`.toLowerCase();
  for (const item of ACTIVITY_IMAGE_MAP) {
    if (item.match.some(keyword => text.includes(keyword))) {
      return item.url;
    }
  }
  const fallbackList = [
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1578895101408-1a36b834405b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'
  ];
  return fallbackList[(dayIndex * 3 + activityIndex) % fallbackList.length];
}

export function getActivityCategory(activity) {
  const text = `${activity?.title || ''} ${activity?.location || ''} ${activity?.description || ''}`.toLowerCase();
  for (const item of ACTIVITY_IMAGE_MAP) {
    if (item.match.some(keyword => text.includes(keyword))) {
      return { label: item.cat, icon: item.icon };
    }
  }
  return { label: 'Signature Experience', icon: '📍' };
}
