'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';

import { useState, useEffect, useRef } from 'react';
import { X, ShieldAlert, Award, Camera } from 'lucide-react';
import ChallengeEvidenceModal from './ChallengeEvidenceModal';

export default function ChallengePreviewModal({ challenge, isOpen, onClose }) {
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const dialog=useRef(null);
  const frame=useRef(null);

  useEffect(()=>{
    if(!isOpen||showEvidenceModal)return;
    const previous=document.activeElement;
    dialog.current?.focus();
    const contain=event=>{if(dialog.current&&!dialog.current.contains(event.target))dialog.current.focus();};
    document.addEventListener('focusin',contain);
    const message=event=>{if(event.origin===window.location.origin&&event.source===frame.current?.contentWindow&&event.data?.type==='masar-preview-close')onClose();};
    window.addEventListener('message',message);
    return()=>{document.removeEventListener('focusin',contain);window.removeEventListener('message',message);previous?.focus?.();};
  },[isOpen,showEvidenceModal,onClose]);

  function trap(event){
    if(event.key!=='Tab'||showEvidenceModal)return;
    const controls=[...dialog.current.querySelectorAll('button,a[href],input,select,textarea,iframe,summary')].filter(el=>!el.disabled&&el.getClientRects().length);
    const first=controls[0],last=controls.at(-1);
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===dialog.current)){event.preventDefault();first?.focus();}
  }

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !showEvidenceModal) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showEvidenceModal, onClose]);

  if (!isOpen || !challenge) return null;

  const noAnimation=challenge.animationAvailable===false||challenge.landmark==='frame';
  const landmarkId = challenge.landmark || 'future';
  const folder={boxing:'boxing',bowling:'bowling','sunset-seeker':'sunset'}[challenge.type]||'heritage';
  const iframeSrc = `/masar-experiences/${folder}/index.html?landmark=${encodeURIComponent(landmarkId)}&embedded=true&transparent=true`;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(12px, 2.5vw, 24px)',
          overflowY: 'auto',
          animation: 'masarModalFadeIn 0.25s ease-out'
        }}
        onClick={onClose}
      >
        <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="challenge-preview-title" onKeyDown={trap}
          style={{
            width: 'min(96vw, 1280px)',
            height: 'min(90vh, 920px)',
            background: 'radial-gradient(ellipse at 50% 0, rgba(212, 178, 113, 0.10), transparent 65%), #101113',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(212, 178, 113, 0.28)',
            borderRadius: '28px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85), 0 0 50px rgba(240, 185, 95, 0.15)',
            animation: 'masarModalScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(255, 255, 255, 0.02)'
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: 'var(--color-accent-gold)',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Award size={13} />
                <LocalizedText>{noAnimation?'REAL-WORLD SIDE QUEST · PHOTO DISCOVERY':'REAL-WORLD SIDE QUEST · 3D DEMONSTRATION PREVIEW'}</LocalizedText>
              </span>
              <h2 id="challenge-preview-title"
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                  margin: '4px 0 0'
                }}
              >
                <LocalizedText>{challenge.name}</LocalizedText><LocalizedText>{challenge.type==='heritage-detective'?' · Heritage Detective':''}</LocalizedText>
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {!challenge.previewOnly && (<button
                type="button"
                onClick={() => setShowEvidenceModal(true)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#000000',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
                }}
              >
                <Camera size={14} /><LocalizedText message={"Evidence & submission status"} /></button>)}

              <Localized element={"button"} attributes={["title"]}
                onClick={onClose}
                className="masar-modal-close-btn"
                title="Close preview"
              >
                <X size={16} />
              </Localized>
            </div>
          </div>

          {/* Honest Guardrail Banner */}
          <div
            style={{
              padding: '10px 24px',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              fontSize: '11px',
              lineHeight: 1.5,
              color: '#fbbf24'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              <span>
                {noAnimation?<><strong><LocalizedText message={"Photo discovery:"} /></strong><LocalizedText message={" Capture the required landmark photographs and answer the quiz. Awards follow evidence evaluation; image checks do not verify attendance."} /></>:<>{challenge.previewOnly&&<><strong><LocalizedText message={"Conditional preview:"} /></strong><LocalizedText message={" Confirm a working punching-score machine with venue staff. This is not the scheduled task for this stop. "} /></>}<strong><LocalizedText message={"Demonstration Only:"} /></strong><LocalizedText message={" This 3D simulation demonstrates your optional challenge. Watching earns no points. Evidence and any award require authorized review; venue access and availability need confirmation."} /></>}
              </span>
            </div>

            {!challenge.previewOnly && (<button
              type="button"
              onClick={() => setShowEvidenceModal(true)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                color: '#fde68a',
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Camera size={12} /><LocalizedText message={" Complete Real Quest"} /></button>)}
          </div>

          {/* 3D Scene Viewport */}
          <div style={{ flex: 1, minHeight: 0, width: '100%', height: '100%', position: 'relative', background: 'transparent' }}>
            {noAnimation ? (
              <div style={{padding:'48px',maxWidth:'680px',margin:'auto',color:'var(--color-text-primary)'}}>
                <h3><LocalizedText message={"Discover Dubai Frame"} /></h3>
                <p><LocalizedText message={"Capture three different photographs: the full golden frame, the two towers and sky bridge, and the patterned facade. Keep the landmark recognizable in each image, then answer the discovery quiz."} /></p>
                <p><LocalizedText message={"This task has no 3D animation yet. Use Submit evidence to complete the photo challenge."} /></p>
              </div>
            ) : (
              <Localized element={"iframe"} attributes={["title"]}
                ref={frame}
                src={iframeSrc}
                title={`${challenge.name} 3D Experience Preview`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                  background: 'transparent'
                }}
                loading="lazy"
                allow="fullscreen"
              />
            )}
          </div>
        </div>
      </div>

      {/* Evidence Submission Dialog */}
      {showEvidenceModal && !challenge.previewOnly && (
        <ChallengeEvidenceModal
          challenge={challenge}
          tripId={challenge.tripId}
          isOpen={showEvidenceModal}
          onClose={() => setShowEvidenceModal(false)}
        />
      )}
    </>
  );
}
