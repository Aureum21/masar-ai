'use client';

import React from 'react';
import { Star } from 'lucide-react';

export default function StarRating({ rating = 0, count }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Star 
        key={i} 
        size={16} 
        className={i <= Math.round(rating) ? 'star-filled' : 'star-empty'} 
      />
    );
  }

  return (
    <div className="star-rating">
      {stars}
      {count !== undefined && <span className="star-rating-count">({count})</span>}
    </div>
  );
}
