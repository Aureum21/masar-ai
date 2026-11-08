'use client';

import { Localized, LocalizedText } from '@/i18n/Localized';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import ExploreMap from '@/components/explore/ExploreMap';
import { MapPin, ArrowLeft, Info, RotateCcw } from 'lucide-react';
import JourneyShell from '@/components/layout/JourneyShell';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { TAX_FREE_LOCATIONS } from '@/data/taxFreeLocations';
import styles from './receiptWorkspace.module.css';

export default function TaxFreeMapPage() {
  const [selected, setSelected] = useState(null);
  const [type, setType] = useState('all');
  const [help, setHelp] = useState(false);
  const helpRef = useRef(null);
  const mapCanvasRef = useRef(null);

  useEffect(() => {
    if (!help) return;
    const outside = (e) => {
      if (helpRef.current && !helpRef.current.contains(e.target)) setHelp(false);
    };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [help]);

  const locations = TAX_FREE_LOCATIONS.filter(
    (item) => type === 'all' || item.type === type
  );

  const handleSelectLocation = (loc) => {
    setSelected(loc);
    // On small screens, scroll the map into view so user sees where it flew
    if (typeof window !== 'undefined' && window.innerWidth <= 800) {
      setTimeout(() => {
        mapCanvasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const handleResetView = () => {
    setSelected(null);
  };

  return (
    <ProtectedRoute>
      <Localized
        element={JourneyShell}
        attributes={["title"]}
        title="Explore shops and kiosks"
        headerVariant="workspace"
        brand={
          <Link
            href="/receipts"
            className={styles.backLink}
          >
            <ArrowLeft size={16} />
            <span><LocalizedText message="My Receipts" /></span>
          </Link>
        }
        action={
          <div ref={helpRef} style={{ position: "relative" }}>
            <Localized
              element="button"
              attributes={["aria-label", "title"]}
              type="button"
              className="journey-icon-btn"
              onClick={() => setHelp((prev) => !prev)}
              aria-expanded={help}
              aria-label="Important Disclaimer & Guidance"
              title="Important Disclaimer & Guidance"
              style={{
                background: help ? "rgba(245, 158, 11, 0.15)" : "transparent",
                border: help ? "1px solid #f59e0b" : "1px solid var(--color-border)",
                color: help ? "#f59e0b" : "var(--color-text-secondary)"
              }}
            >
              <Info size={18} />
            </Localized>
            {help && (
              <div
                role="region"
                aria-label="Tax-Free Disclaimer & Guidance"
                style={{
                  position: "absolute",
                  top: "calc(100% + 12px)",
                  right: 0,
                  zIndex: 1000,
                  width: "380px",
                  maxWidth: "calc(100vw - 32px)",
                  padding: "18px 20px",
                  borderRadius: "18px",
                  background: "rgba(15, 18, 24, 0.94)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(245, 158, 11, 0.28)",
                  boxShadow: "0 22px 50px rgba(0, 0, 0, 0.75)",
                  display: "flex",
                  gap: "14px",
                  alignItems: "flex-start",
                  color: "#cbd5e1",
                  textAlign: "start"
                }}
              >
                <Info size={20} style={{ color: "#f59e0b", flexShrink: 0, marginTop: "2px" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <strong style={{ color: "#f8fafc", fontSize: "13.5px", fontWeight: 700 }}>
                      <LocalizedText message="Important VAT Refund Notice" />
                    </strong>
                    <button
                      type="button"
                      onClick={() => setHelp(false)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                        fontSize: "16px",
                        lineHeight: 1,
                        padding: "2px 4px"
                      }}
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>
                  <p style={{ margin: "0 0 10px 0", color: "#94a3b8", fontSize: "12px", lineHeight: 1.65 }}>
                    <LocalizedText message="This is a curated orientation map, not Planet’s live merchant directory. A mall listing does not mean every store participates. Airport terminal access, opening hours and inspection requirements must be confirmed." />
                  </p>
                  <p style={{ margin: "0 0 10px 0", color: "#94a3b8", fontSize: "12px", lineHeight: 1.65 }}>
                    <LocalizedText message="Please note that MASAR does not reimburse or pay out refunds directly. To claim your money back, you will need to validate your tax-free tags with Planet at the airport or departure point before leaving the UAE." />
                  </p>
                  <p style={{ margin: "0 0 12px 0", color: "#cbd5e1", fontSize: "11.5px", lineHeight: 1.6 }}>
                    <strong style={{ color: "#fbbf24" }}><LocalizedText message="Before departure:" /> </strong>
                    <LocalizedText message="Keep your original receipts, travel document and purchased goods available. Confirm that the retailer issued a tax-free tag before leaving the store." />
                  </p>
                  <a
                    href="https://www.planettaxfree.ae/tourists-landing/brands-locations/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#f59e0b",
                      fontSize: "12px",
                      fontWeight: 650,
                      textDecoration: "underline",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <LocalizedText message="Planet validation kiosks & locations ↗" />
                  </a>
                </div>
              </div>
            )}
          </div>
        }
      >
        <div className="journey-scroll">
          <div className={styles.workspace}>
            <header className={styles.heading}>
              <div>
                <h1>
                  <LocalizedText message="Explore shops and kiosks" />
                </h1>
              </div>
            </header>

            {/* Navigation Tabs */}
            <Localized
              element="nav"
              attributes={["aria-label"]}
              className={styles.tabs}
              aria-label="Receipt pages"
            >
              <Link href="/receipts">
                <LocalizedText message="Collection" />
              </Link>
              <Link href="/receipts/summary">
                <LocalizedText message="Summary & print" />
              </Link>
              <Link aria-current="page" href="/receipts/map">
                <MapPin size={15} />
                <LocalizedText message=" Shopping & departure map" />
              </Link>
            </Localized>

            {/* Filter segmented buttons & Reset View */}
            <div className={styles.tools}>
              <div className={styles.segmented}>
                {[
                  ['all', 'All places'],
                  ['mall', 'Shopping areas'],
                  ['airport', 'Airports'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={type === value}
                    onClick={() => {
                      setType(value);
                      setSelected(null);
                    }}
                  >
                    <LocalizedText>{label}</LocalizedText>
                  </button>
                ))}
              </div>

              {selected && (
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={handleResetView}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <RotateCcw size={14} />
                  <LocalizedText message="UAE Overview" />
                </button>
              )}
            </div>

            {/* Interactive Map and Location List */}
            <div className={styles.mapLayout}>
              <div className={styles.mapList} role="tablist" aria-label="Tax-free locations list">
                {locations.map((item) => {
                  const isSelected = selected?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      aria-pressed={isSelected}
                      onClick={() => handleSelectLocation(item)}
                    >
                      <img
                        src={item.images?.[0]}
                        alt={item.name}
                        className={styles.mapItemThumb}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          if (item.imageFallbacks?.[0]) {
                            e.currentTarget.src = item.imageFallbacks[0];
                          } else {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=400&q=80';
                          }
                        }}
                      />
                      <div className={styles.mapItemMeta}>
                        <strong>{item.name}</strong>
                        <span>{item.area}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div ref={mapCanvasRef} className={styles.mapCanvas}>
                <ExploreMap
                  places={locations}
                  center={selected ? [selected.lat, selected.lng] : [24.85, 54.9]}
                  zoom={selected ? 13 : 8}
                  selectedPlace={selected}
                  onSelectPlace={handleSelectLocation}
                  onPlanTrip={(place) => {
                    if (place.directionsUrl) {
                      window.open(place.directionsUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  planLabel="Get directions ↗"
                />
              </div>
            </div>
          </div>
        </div>
      </Localized>
    </ProtectedRoute>
  );
}
