'use client';
import {LocalizedText} from '@/i18n/Localized';

import React from 'react';

export default function Badge({ children, variant = 'default' }) {
  const className = `badge badge-${variant}`;
  return (
    <span className={className}>
      <LocalizedText>{children}</LocalizedText>
    </span>
  );
}
