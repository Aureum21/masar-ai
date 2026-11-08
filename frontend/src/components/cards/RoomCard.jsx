'use client';
import AccessibilityFacts from '@/components/planning/AccessibilityFacts';
import {Localized,LocalizedText} from '@/i18n/Localized';


import { useState, useEffect,useRef } from 'react';
import {useDialogFocus} from '@/hooks/useDialogFocus';
import { useHydrated } from '@/hooks/useHydrated';
import { createPortal } from 'react-dom';
import { 
  ArrowRight, 
  CreditCard, 
  BedDouble, 
  ChevronLeft, 
  ChevronRight, 
  Images, 
  Maximize2, 
  X 
} from 'lucide-react';

export default function RoomCard({ room, onBook, selectionMode=false, readOnly=false, disabled=false }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const mounted = useHydrated();
  const dialog=useRef(null);
  useDialogFocus(dialog,isExpanded,()=>setIsExpanded(false));

  const defaultImg = "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80";
  
  // Extract images array, fallback to imageUrl, deduplicate and filter
  const rawList = room && Array.isArray(room.images) && room.images.length > 0 
    ? room.images 
    : (room?.imageUrl ? [room.imageUrl] : [defaultImg]);
  
  const images = Array.from(new Set(rawList)).filter(Boolean);
  const total = images.length;
  const hasMultiple = total > 1;

  // Keyboard navigation & body scroll lock when expanded in popup modal
  useEffect(() => {
    if (!isExpanded) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev - 1 + total) % total);
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev + 1) % total);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isExpanded, total]);

  if (!room) return null;

  const handlePrev = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const handleDotClick = (e, idx) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex(idx);
  };

  return (
    <>
      {/* ── Room Card in Feed / Context Panel ── */}
      <div className="hotel-card-dark" style={{ overflow: 'hidden' }}>
        {/* ── Photo Banner Carousel ── */}
        <Localized element={"div"} attributes={["title"]}
          className="hotel-media-banner" 
          onClick={() => setIsExpanded(true)}
          title="Click to view room photos in detail"
          style={{ 
            position: 'relative', 
            overflow: 'hidden',
            backgroundColor: '#111317',
            height: '190px',
            cursor: 'pointer'
          }}
        >
          <Localized element={"img"} attributes={["alt"]}
            key={currentIndex}
            src={images[currentIndex] || defaultImg} 
            alt={`${room.name || 'Room'} view ${currentIndex + 1}`} 
            onError={(e) => { e.currentTarget.src = defaultImg; }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transition: 'opacity 0.25s ease-in-out'
            }}
          />

          {/* Subtle Top & Bottom Gradient Vignettes */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.7) 100%)',
            pointerEvents: 'none',
            zIndex: 1
          }} />

          {/* Category Tag */}
          <div 
            className="mindtrip-badge-top-left" 
            style={{ 
              zIndex: 2 
            }}
          ><LocalizedText message={"ROOM"} /></div>

          {/* Expand Hint Badge */}
          <div 
            style={{
              position: 'absolute',
              top: '10px',
              left: '66px',
              backgroundColor: 'rgba(10, 11, 14, 0.72)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#F8FAFC',
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              zIndex: 2,
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            <Maximize2 size={11} color="#F59E0B" />
            <span><LocalizedText message={"Expand"} /></span>
          </div>

          {/* Multiple Photos Counter Badge */}
          {hasMultiple && (
            <div 
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                backgroundColor: 'rgba(10, 11, 14, 0.78)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#F8FAFC',
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                zIndex: 2,
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
              }}
            >
              <Images size={12} color="#F59E0B" />
              <span>{currentIndex + 1}</span>
              <span style={{ opacity: 0.4 }}>/</span>
              <span>{total}</span>
            </div>
          )}

          {/* Carousel Navigation Chevron Arrows */}
          {hasMultiple && (
            <>
              <Localized element={"button"} attributes={["aria-label"]}
                type="button"
                onClick={handlePrev}
                aria-label="Previous photo"
                className="room-carousel-btn"
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(10, 11, 14, 0.72)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  border: '1px solid rgba(255, 255, 255, 0.22)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 3,
                  transition: 'all 0.2s ease',
                  padding: 0
                }}
              >
                <ChevronLeft size={16} />
              </Localized>

              <Localized element={"button"} attributes={["aria-label"]}
                type="button"
                onClick={handleNext}
                aria-label="Next photo"
                className="room-carousel-btn"
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(10, 11, 14, 0.72)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  border: '1px solid rgba(255, 255, 255, 0.22)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 3,
                  transition: 'all 0.2s ease',
                  padding: 0
                }}
              >
                <ChevronRight size={16} />
              </Localized>
            </>
          )}

          {/* Carousel Pagination Dots */}
          {hasMultiple && (
            <div 
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                zIndex: 3,
                padding: '3px 8px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(10, 11, 14, 0.65)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)'
              }}
            >
              {images.map((_, idx) => (
                <Localized element={"button"} attributes={["aria-label"]}
                  key={idx}
                  type="button"
                  onClick={(e) => handleDotClick(e, idx)}
                  style={{
                    width: idx === currentIndex ? '14px' : '5px',
                    height: '5px',
                    borderRadius: '9999px',
                    backgroundColor: idx === currentIndex ? '#F59E0B' : 'rgba(255, 255, 255, 0.45)',
                    boxShadow: idx === currentIndex ? '0 0 6px rgba(245, 158, 11, 0.7)' : 'none',
                    transition: 'all 0.25s ease',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer'
                  }}
                  aria-label={`Jump to photo ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </Localized>

        {/* ── Card Body ── */}
        <div className="hotel-body-dark">
          <div className="hotel-title-row">
            <div>
              <Localized element={"h3"} attributes={["title"]} className="hotel-name-text" title={room.name}>{room.name}</Localized>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '3px' }}>
                <BedDouble size={13} color="var(--color-accent-hover)" />
                <span><LocalizedText>{room.board || 'Room Only'}</LocalizedText></span>
              </div>
            </div>
            {room.price && Number(room.price) > 0 ? (
              <div className="hotel-price-badge">
                {room.price} <LocalizedText>{room.currency || 'AED'}</LocalizedText>
                <span><LocalizedText message={"/ total"} /></span>
              </div>
            ) : (
              <div className="hotel-price-badge" style={{ fontSize: '11px', color: '#94A3B8' }}><LocalizedText message={"Rates on Request"} /></div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBlock: '10px' }}>
            <button type="button" className="journey-btn subtle small" aria-expanded={isExpanded} onClick={()=>setIsExpanded(true)}>
              View room photos
            </button>
          </div>

          <AccessibilityFacts evidence={room.accessibility} propertyEvidence={room.property_accessibility}/>

          {!readOnly&&<div className="hotel-action-row" style={{ marginTop: '16px' }}>
            <button 
              className="btn-book-now"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                if (onBook) onBook(room);
              }}
            >
              <CreditCard size={14} />
              <span><LocalizedText>{selectionMode?'Choose this room':'Instant Pre-Book'}</LocalizedText></span>
              <ArrowRight size={13} />
            </button>
          </div>}
        </div>
      </div>

      {/* ── Floating Popup Modal Dialog (Page at back remains visible) ── */}
      {isExpanded && mounted && createPortal(
        <div 
          className="room-popup-backdrop"
          onClick={() => setIsExpanded(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(12px, 2.5vw, 24px)',
            animation: 'masarModalFadeIn 0.25s ease-out'
          }}
        >
          {/* Centered Floating Modal Card with Edge-to-Edge Image */}
          <div 
            className="room-popup-card" ref={dialog} role="dialog" tabIndex={-1} aria-modal="true" aria-label={`${room.name||'Room'} photos`}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '960px',
              height: '590px',
              maxHeight: '86vh',
              borderRadius: '28px',
              overflow: 'hidden',
              border: '1px solid rgba(212, 178, 113, 0.28)',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85), 0 0 50px rgba(240, 185, 95, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundColor: '#0E1117',
              animation: 'masarModalScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Background Image Fills the Entire Card (100% width and height) */}
            <Localized element={"img"} attributes={["alt"]}
              key={currentIndex}
              src={images[currentIndex] || defaultImg} 
              alt={`${room.name || 'Room'} full view ${currentIndex + 1}`} 
              onError={(e) => { e.currentTarget.src = defaultImg; }}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                transition: 'opacity 0.2s ease-in-out'
              }}
            />

            {/* Cinematic Vignette Overlay (keeps controls readable over any photo) */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(8, 9, 12, 0.85) 0%, rgba(0, 0, 0, 0.1) 25%, rgba(0, 0, 0, 0.1) 70%, rgba(8, 9, 12, 0.92) 100%)',
              pointerEvents: 'none'
            }} />

            {/* 1. Floating Header Overlay */}
            <div 
              style={{
                position: 'relative',
                zIndex: 10,
                padding: '20px 24px 12px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    color: '#0A0B0E',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    letterSpacing: '0.06em',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)'
                  }}><LocalizedText message={"ROOM GALLERY"} /></span>
                  <h3 style={{ 
                    fontSize: '20px', 
                    fontWeight: 700, 
                    margin: 0, 
                    color: '#FFFFFF',
                    textShadow: '0 2px 10px rgba(0,0,0,0.8)' 
                  }}>
                    {room.name}
                  </h3>
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '12px', 
                  color: '#CBD5E1', 
                  marginTop: '4px',
                  textShadow: '0 1px 6px rgba(0,0,0,0.8)' 
                }}>
                  <BedDouble size={13} color="#F59E0B" />
                  <span><LocalizedText>{room.board || 'Room Only'}</LocalizedText></span>
                  <span>•</span>
                  <span><LocalizedText message={"High-Resolution Photo Gallery"} /></span>
                </div>
              </div>

              {/* Counter Badge & Close Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {hasMultiple && (
                  <div style={{
                    backgroundColor: 'rgba(10, 11, 14, 0.72)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#FDE68A',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '5px 14px',
                    borderRadius: '9999px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
                  }}>
                    <Images size={13} color="#F59E0B" />
                    <span><LocalizedText message={"Photo ⟦0⟧ of ⟦1⟧"} values={[currentIndex + 1,total]} /></span>
                  </div>
                )}
                
                <Localized element={"button"} attributes={["aria-label"]}
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  aria-label="Close modal"
                  className="room-popup-close-btn"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(10, 11, 14, 0.72)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
                    transition: 'all 0.2s ease',
                    padding: 0
                  }}
                >
                  <X size={18} />
                </Localized>
              </div>
            </div>

            {/* 2. Mid Floating Chevrons (Centered over the photo) */}
            {hasMultiple && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                zIndex: 10,
                pointerEvents: 'none'
              }}>
                <Localized element={"button"} attributes={["aria-label"]}
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous photo"
                  className="room-popup-nav-btn"
                  style={{
                    pointerEvents: 'auto',
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(10, 11, 14, 0.78)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(245, 158, 11, 0.55)',
                    color: '#F59E0B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
                    transition: 'all 0.2s ease',
                    padding: 0
                  }}
                >
                  <ChevronLeft size={24} />
                </Localized>

                <Localized element={"button"} attributes={["aria-label"]}
                  type="button"
                  onClick={handleNext}
                  aria-label="Next photo"
                  className="room-popup-nav-btn"
                  style={{
                    pointerEvents: 'auto',
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(10, 11, 14, 0.78)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(245, 158, 11, 0.55)',
                    color: '#F59E0B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
                    transition: 'all 0.2s ease',
                    padding: 0
                  }}
                >
                  <ChevronRight size={24} />
                </Localized>
              </div>
            )}

            {/* 3. Floating Footer Overlay */}
            <div 
              style={{
                position: 'relative',
                zIndex: 10,
                padding: '16px 24px 20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px'
              }}
            >
              {/* Thumbnail Strip in a Frosted Glass Capsule */}
              {hasMultiple ? (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  background: 'rgba(10, 11, 14, 0.65)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '6px 10px',
                  borderRadius: '12px',
                  overflowX: 'auto',
                  maxWidth: '65%'
                }}>
                  {images.map((img, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      style={{
                        width: '52px',
                        height: '38px',
                        flexShrink: 0,
                        borderRadius: '6px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: idx === currentIndex ? '2px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.15)',
                        boxShadow: idx === currentIndex ? '0 0 10px rgba(245, 158, 11, 0.7)' : 'none',
                        opacity: idx === currentIndex ? 1 : 0.45,
                        transform: idx === currentIndex ? 'scale(1.05)' : 'scale(1)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Localized element={"img"} attributes={["alt"]}
                        src={img || defaultImg} 
                        alt={`Thumbnail ${idx + 1}`} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  fontSize: '12px', 
                  color: '#CBD5E1',
                  background: 'rgba(10, 11, 14, 0.65)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '8px 14px',
                  borderRadius: '10px'
                }}><LocalizedText message={"Single photo available for this room option"} /></div>
              )}

              {/* Price & Book CTA in a Glass Capsule */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px', 
                flexShrink: 0,
                background: 'rgba(10, 11, 14, 0.72)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                padding: '8px 16px',
                borderRadius: '14px'
              }}>
                {room.price && Number(room.price) > 0 ? (
                  <div style={{ textAlign: 'end' }}>
                    <div style={{ fontSize: '19px', fontWeight: 800, color: '#F59E0B', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                      {room.price} <LocalizedText>{room.currency || 'AED'}</LocalizedText>
                    </div>
                    <div style={{ fontSize: '11px', color: '#CBD5E1' }}><LocalizedText message={"quoted stay total · confirm inclusions"} /></div>
                  </div>
                ) : null}

                {!readOnly&&<button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setIsExpanded(false);
                    if (onBook) onBook(room);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    color: '#0A0B0E',
                    fontWeight: 700,
                    fontSize: '13px',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(245, 158, 11, 0.5)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <CreditCard size={14} />
                  <span><LocalizedText>{selectionMode?'Choose this room':'Instant Pre-Book'}</LocalizedText></span>
                  <ArrowRight size={13} />
                </button>}
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Embedded CSS for Interactive Button Glows */}
      <style jsx>{`
        .room-carousel-btn:hover {
          background-color: rgba(245, 158, 11, 0.95) !important;
          color: #0A0B0E !important;
          border-color: #F59E0B !important;
          box-shadow: 0 0 12px rgba(245, 158, 11, 0.6) !important;
          transform: translateY(-50%) scale(1.08) !important;
        }
        .room-popup-nav-btn:hover {
          background-color: rgba(245, 158, 11, 1) !important;
          color: #0A0B0E !important;
          border-color: #F59E0B !important;
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.8) !important;
          transform: scale(1.08) !important;
        }
        .room-popup-close-btn:hover {
          background-color: rgba(245, 158, 11, 0.2) !important;
          border-color: #F59E0B !important;
          color: #F59E0B !important;
          transform: scale(1.08) !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}
