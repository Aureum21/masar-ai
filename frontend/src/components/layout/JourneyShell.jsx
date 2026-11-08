'use client';
import {LocalizedText} from '@/i18n/Localized';

import LanguageSwitcher from '@/i18n/LanguageSwitcher';
import Link from 'next/link';
import {Map} from 'lucide-react';
import MobileNavigation from './MobileNavigation';
import Sidebar from './Sidebar';
import ThemeToggle from '@/components/ui/ThemeToggle';
import NotificationBell from '@/components/notifications/NotificationBell';
import DailyPromotionHost from '@/components/daily-promotions/DailyPromotionHost';
import './journey.css';
export default function JourneyShell({children,title,action,brand,brandHref,hideTopbar=false,headerVariant='default',showBrand=true}) {
  const showBrandLink = showBrand && headerVariant !== 'planning' && title !== false && title !== null;
  return <div className="app-container journey-shell">
    <a className="skip-link" href="#journey-main-content">Skip to main content</a><Sidebar/>
    <main id="journey-main-content" tabIndex={-1} className={`journey-main ${headerVariant === 'planning' ? 'journey-main-planning' : ''}`}>
      {!hideTopbar&&<header className={`journey-topbar ${headerVariant === 'planning' ? 'journey-topbar-planning' : headerVariant === 'workspace' ? 'journey-topbar-workspace' : ''}`}>{brand ? brand : showBrandLink ? <Link href={brandHref || "/explore"} className="journey-brand">{headerVariant !== 'workspace' && <Map size={18}/>}<span><LocalizedText>{title||'Explore UAE'}</LocalizedText></span></Link> : <div className="journey-topbar-spacer" aria-hidden="true" />}<div className="journey-top-actions"><LanguageSwitcher/><NotificationBell/><ThemeToggle/>{action}</div></header>}
      {children}
    </main>
    <MobileNavigation/>
    <DailyPromotionHost/>
  </div>;
}
