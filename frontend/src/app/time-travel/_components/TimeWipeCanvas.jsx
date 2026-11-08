'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';


import { useState, useRef, useEffect, useCallback } from 'react';
import {
  History,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Eye,
  Layers,
  Compass,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import styles from './TimeWipeCanvas.module.css';

export default function TimeWipeCanvas({
  eras = [],
  currentEraIndex = 0,
  onEraChange,
  isScanning = false,
  landmarkData = null
}) {
  const [sliderPos, setSliderPos] = useState(50); // 0 to 100%
  const [isDragging, setIsDragging] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);
  const containerRef = useRef(null);

  const presentEra = eras.find(e => e.id === '2026') || eras[0] || {};
  const currentPastEra = eras[currentEraIndex] || eras[1] || {};

  // Update slider position from mouse or touch event
  const updateSliderPosition = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  }, []);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    updateSliderPosition(e.clientX);
  };

  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      setTouchStartX(e.touches[0].clientX);
      setIsDragging(true);
      updateSliderPosition(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = (e) => {
    setIsDragging(false);
    if (touchStartX !== null && e.changedTouches && e.changedTouches[0]) {
      const touchEndX = e.changedTouches[0].clientX;
      const diffX = touchStartX - touchEndX;
      // If significant swipe left (more than 60px): move backward in time!
      if (diffX > 60) {
        // Move backward in time: index increases toward older eras (2026 -> 1969 -> 1823)
        if (currentEraIndex < eras.length - 1) {
          onEraChange(currentEraIndex + 1);
        }
      } else if (diffX < -60) {
        // Swipe right: move forward toward present
        if (currentEraIndex > 0) {
          onEraChange(currentEraIndex - 1);
        }
      }
      setTouchStartX(null);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      updateSliderPosition(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, updateSliderPosition]);

  return (
    <div className={styles.wipeWrapper}>
      {/* Visual Canvas Container */}
      <div
        ref={containerRef}
        className={styles.canvasContainer}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={(e) => {
          if (isDragging && e.touches[0]) {
            updateSliderPosition(e.touches[0].clientX);
          }
        }}
        onTouchEnd={handleTouchEnd}
      >
        {/* Layer 1: Present Day (Right/Background) */}
        <div className={styles.imageLayer}>
          <Localized element={"img"} attributes={["alt"]}
            src={presentEra.image_url || '/time-travel/era-present.jpg'}
            alt={presentEra.era_title || 'Present Day'}
            className={styles.targetImage}
          />
          <div className={styles.eraPillRight}>
            <span className={styles.eraTag}><LocalizedText message={"PRESENT"} /></span>
            <strong>{presentEra.year || '2026'}</strong>
          </div>
        </div>

        {/* Layer 2: Historical Past (Clipped by sliderPos on Left) */}
        <div
          className={styles.clippedLayer}
          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
        >
          <Localized element={"img"} attributes={["alt"]}
            src={currentPastEra.image_url || '/time-travel/era-1969.jpg'}
            alt={currentPastEra.era_title || 'Historical Past'}
            className={styles.targetImage}
          />
          <div className={styles.eraPillLeft}>
            <span className={styles.eraTag}><LocalizedText message={"PAST"} /></span>
            <strong>{currentPastEra.year || '1969'}</strong>
          </div>
        </div>

        {/* Scanning Laser Animation Overlay when AI is detecting */}
        {isScanning && (
          <div className={styles.scanLaserOverlay}>
            <div className={styles.scanGrid} />
            <div className={styles.laserBar} />
            <div className={styles.scanTextBadge}>
              <Sparkles size={14} className={styles.sparkleIcon} />
              <span><LocalizedText message={"AI Vision Analyzing Coral Masonry & Heritage Archives..."} /></span>
            </div>
          </div>
        )}

        {/* Split Divider Handle */}
        <div
          className={styles.sliderDivider}
          style={{ left: `${sliderPos}%` }}
        >
          <div className={styles.dividerLine} />
          <div className={styles.dividerHandle}>
            <ChevronLeft size={16} />
            <ChevronRight size={16} />
          </div>
        </div>

        {/* Swipe Prompt Toast */}
        <div className={styles.swipePrompt}>
          <ArrowLeft size={14} />
          <span><LocalizedText message={"Swipe left or drag slider to reveal ⟦0⟧"} values={[currentPastEra.year]} /></span>
          <ArrowRight size={14} />
        </div>
      </div>

      <label style={{display:'flex',gap:12,alignItems:'center',padding:'12px 18px',fontSize:12,color:'#d4b271'}}><LocalizedText message={"Reveal the past"} /><Localized element={"input"} attributes={["aria-label"]} aria-label="Reveal the past" type="range" min="0" max="100" value={sliderPos} onChange={event=>setSliderPos(Number(event.target.value))} style={{flex:1,accentColor:'#d4b271'}}/>
      </label>
      {/* Quick Era Timeline Navigation */}
      <div className={styles.timelineScrubber}>
        <div className={styles.timelineLabel}>
          <History size={14} color="#f59e0b" />
          <span><LocalizedText message={"Historical Archive Eras:"} /></span>
        </div>

        <div className={styles.eraChips}>
          {eras.map((era, idx) => (
            <button
              key={era.id}
              type="button"
              className={`${styles.eraChip} ${currentEraIndex === idx ? styles.eraChipActive : ''}`}
              onClick={() => onEraChange(idx)}
            >
              <span className={styles.chipYear}>{era.year}</span>
              <span className={styles.chipTitle}>{era.era_title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Difference Insight Bar */}
      <div className={styles.insightBox}>
        <div className={styles.insightIcon}>
          <Compass size={18} color="#f59e0b" />
        </div>
        <div className={styles.insightText}>
          <strong><LocalizedText message={"What Changed (⟦0⟧ vs ⟦1⟧):"} values={[presentEra.year,currentPastEra.year]} /></strong>
          <p><LocalizedText>{currentPastEra.what_changed || currentPastEra.description}</LocalizedText></p>
        </div>
      </div>
    </div>
  );
}
