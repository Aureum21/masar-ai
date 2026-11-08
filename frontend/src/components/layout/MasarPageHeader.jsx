'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';

import LanguageSwitcher from '@/i18n/LanguageSwitcher';

import React from 'react';
import Link from 'next/link';
import styles from './MasarPageHeader.module.css';

/**
 * Standard MASAR AI Unified Page Header
 * Matches the obsidian dark luxury layout from the Traveler Passport view:
 * 1. Top bar: MASAR / <SECTION> breadcrumb + Top Right Actions (Notification, Actions)
 *    (Special passport destination links are only rendered if explicitly passed via headerLinks)
 * 2. Intro: Large bold heading + subtitle + Luxury motto (A LIFE WELL EXPLORED / مسار · YOUR OWN PATH)
 * 3. Tabs & Actions: Optional pill switchers (gold active, frosted glass inactive)
 */
export default function MasarPageHeader({
  breadcrumbSection = 'EXPLORE UAE',
  breadcrumbHref = '/explore',
  title = 'Explore UAE',
  subtitle = 'Find a place you love. Make it part of your journey.',
  issueMotto = (
    <><LocalizedText message={"A LIFE WELL EXPLORED"} /><br /><LocalizedText message={"مسار · YOUR OWN PATH"} /></>
  ),
  headerLinks = null,     // ONLY rendered if explicitly passed (e.g. for Passport pages)
  topRightActions = null, // Controls rendered on the top right of Row 1 (Notifications, primary actions)
  tabs = [],              // Array of { id, label, icon: Icon, active, onClick, href }
  actions = null,         // Optional elements rendered on the right side of the tabs row (Row 3)
  compact = false,
  topbarOnly = false,
  className = ''
}) {
  const isTopbarOnly = topbarOnly || (!title && !subtitle && !issueMotto && (!tabs || tabs.length === 0) && !actions);

  return (
    <div className={`${styles.headerWrapper} ${compact ? styles.compact : ''} ${isTopbarOnly ? styles.topbarOnly : ''} ${className}`}>
      {/* ── 1. Topbar: MASAR / SECTION Breadcrumb & Top Right Actions ── */}
      <div className={styles.topbar}>
        <Link href={breadcrumbHref} className={styles.breadcrumb}>
          <strong><LocalizedText message={"MASAR"} /></strong>
          <span>/ <LocalizedText>{breadcrumbSection}</LocalizedText></span>
        </Link>

        <div className={styles.headerRightArea}><LanguageSwitcher/>
          {/* Explicit Header Links (Only when requested, e.g. on Passport pages) */}
          {headerLinks && headerLinks.length > 0 && (
            <div className={styles.headerLinks}>
              {headerLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Localized element={Link} attributes={["aria-label"]}
                    key={link.href} 
                    href={link.href} 
                    className={styles.textLink}
                    aria-label={link.ariaLabel || link.label}
                  >
                    {Icon && <Icon size={15} />}
                    <span><LocalizedText>{link.label}</LocalizedText></span>
                  </Localized>
                );
              })}
            </div>
          )}

          {/* Top Right Actions (Notifications, Primary Action Button) */}
          {topRightActions && (
            <div className={styles.topRightActions}>
              {topRightActions}
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Intro: Large Title, Subtitle & Luxury Slogan (Optional) ── */}
      {(title || subtitle || issueMotto) && (
        <div className={styles.intro}>
          {(title || subtitle) && (
            <div className={styles.introLeft}>
              {title && <h1 className={styles.title}><LocalizedText>{title}</LocalizedText></h1>}
              {subtitle && <p className={styles.subtitle}><LocalizedText>{subtitle}</LocalizedText></p>}
            </div>
          )}

          {issueMotto && (
            <div className={styles.issue}>
              {issueMotto}
            </div>
          )}
        </div>
      )}

      {/* ── 3. Tabs / Filter Row (Optional) ── */}
      {(tabs.length > 0 || actions) && (
        <div className={styles.tabsRow}>
          {tabs.length > 0 ? (
            <div className={styles.tabGroup} role="tablist">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = Boolean(tab.active);

                if (tab.href) {
                  return (
                    <Link
                      key={tab.id || tab.href}
                      href={tab.href}
                      className={active ? styles.tabActive : styles.tabInactive}
                      role="tab"
                      aria-selected={active}
                    >
                      {Icon && <Icon size={14} />}
                      <span><LocalizedText>{tab.label}</LocalizedText></span>
                    </Link>
                  );
                }

                return (
                  <button
                    key={tab.id || tab.label}
                    type="button"
                    onClick={tab.onClick}
                    className={active ? styles.tabActive : styles.tabInactive}
                    role="tab"
                    aria-selected={active}
                  >
                    {Icon && <Icon size={14} />}
                    <span><LocalizedText>{tab.label}</LocalizedText></span>
                  </button>
                );
              })}
            </div>
          ) : <div />}

          {actions && (
            <div className={styles.actionsRight}>
              {actions}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
