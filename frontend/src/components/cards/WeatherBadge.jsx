'use client';
import {LocalizedText} from '@/i18n/Localized';


import React from 'react';
import { Sun, Cloud, CloudRain } from 'lucide-react';

export default function WeatherBadge({ weather }) {
  if (!weather) return null;
  const { temperature, condition, city } = weather;

  let Icon = Sun;
  const conditionLower = condition?.toLowerCase() || '';
  if (conditionLower.includes('rain')) {
    Icon = CloudRain;
  } else if (conditionLower.includes('cloud')) {
    Icon = Cloud;
  }

  return (
    <div className="weather-badge">
      <Icon size={16} />
      <span className="weather-badge-temp">{temperature}°</span>
      <span className="weather-badge-condition">{condition} <LocalizedText>{city ? `in ${city}` : ''}</LocalizedText></span>
    </div>
  );
}
