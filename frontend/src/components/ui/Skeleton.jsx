'use client';

import React from 'react';

export default function Skeleton({ variant = 'text' }) {
  if (variant === 'card') {
    return (
      <div className="skeleton-card">
        <div className="skeleton skeleton-image"></div>
        <div className="skeleton skeleton-title"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text"></div>
      </div>
    );
  }

  return <div className={`skeleton skeleton-${variant}`}></div>;
}
