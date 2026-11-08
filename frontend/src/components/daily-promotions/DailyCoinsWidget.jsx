'use client';

import { useState } from 'react';
import { Coins, History, ChevronRight, X, Trophy, CheckCircle2, ArrowUpRight, RotateCw, Gamepad2, MapPin } from 'lucide-react';
import { usePassportResource } from '@/app/profile/_lib/passportApi';
import { openDailyPromotion } from './DailyPromotionHost';
import { LocalizedText } from '@/i18n/Localized';

export default function DailyCoinsWidget() {
  const coinsResource = usePassportResource('/daily-promotions/coins');
  const historyResource = usePassportResource('/daily-promotions/history');
  const [showHistory, setShowHistory] = useState(false);

  const balance = coinsResource.data?.balance || 0;
  const history = historyResource.data?.history || [];

  return (
    <>
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(15, 20, 30, 0.85) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '18px',
          padding: '18px 20px',
          marginBottom: '20px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(245, 158, 11, 0.08)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          {/* Left: Coin Badge & Balance */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: '#0A0B0E',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
                flexShrink: 0
              }}
            >
              <Coins size={24} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#F0B95F'
                  }}
                >
                  <LocalizedText message={"DAILY CHALLENGE REWARDS"} />
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: 'rgba(240, 185, 95, 0.15)',
                    color: '#FBBF24',
                    border: '1px solid rgba(240, 185, 95, 0.3)'
                  }}
                >
                  <LocalizedText message={"Independent of XP"} />
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
                <span style={{ fontSize: '24px', fontWeight: 900, color: '#F8FAFC' }}>
                  {balance}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 650, color: '#94A3B8' }}>
                  <LocalizedText message={"Daily Challenge Coins"} />
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => openDailyPromotion()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #F0B95F 0%, #D97706 100%)',
                color: '#0A0B0E',
                fontSize: '12.5px',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(240, 185, 95, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <RotateCw size={15} />
              <span><LocalizedText message={"Spin Today's Wheel"} /></span>
            </button>

            <button
              type="button"
              onClick={() => setShowHistory(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#CBD5E1',
                fontSize: '12px',
                fontWeight: 650,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <History size={14} />
              <span><LocalizedText message={"Activity History"} /></span>
            </button>
          </div>
        </div>

        <p
          style={{
            margin: '10px 0 0 0',
            fontSize: '11.5px',
            color: '#94A3B8',
            lineHeight: 1.5
          }}
        >
          <LocalizedText message={"Earn 1 coin each day by completing an in-app cultural arcade game or physical UAE venue challenge. Coins accumulate in your passport across all your travels."} />
        </p>
      </div>

      {/* History Dialog */}
      {showHistory && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10050,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            display: 'grid',
            placeItems: 'center',
            padding: 'clamp(12px, 2vw, 24px)',
            animation: 'masarModalFadeIn 0.25s ease-out'
          }}
          onClick={() => setShowHistory(false)}
        >
          <div
            style={{
              background: 'radial-gradient(ellipse at 50% 0, rgba(212, 178, 113, 0.10), transparent 65%), #101113',
              border: '1px solid rgba(212, 178, 113, 0.28)',
              borderRadius: '28px',
              padding: '28px 24px',
              maxWidth: '540px',
              width: '100%',
              maxHeight: '82vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85), 0 0 50px rgba(240, 185, 95, 0.15)',
              position: 'relative',
              animation: 'masarModalScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} color="#F0B95F" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#F8FAFC' }}>
                  <LocalizedText message={"Daily Promotional Activity"} />
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="masar-modal-close-btn"
                aria-label="Close activity history"
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B' }}>
                  <p style={{ margin: 0, fontSize: '13px' }}>
                    <LocalizedText message={"No daily challenge activity recorded yet."} />
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11.5px' }}>
                    <LocalizedText message={"Spin the wheel from the notification bell to get started!"} />
                  </p>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(240, 185, 95, 0.12)' }}>
                        {item.kind === 'game' ? <Gamepad2 size={16} color="#F0B95F" /> : <MapPin size={16} color="#F0B95F" />}
                      </span>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 750, color: '#F8FAFC' }}>
                          {item.title}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', fontSize: '11px', color: '#94A3B8' }}>
                          <span>{item.dubai_day}</span>
                          <span>·</span>
                          <span style={{ textTransform: 'capitalize' }}>{item.kind}</span>
                          <span>·</span>
                          <span
                            style={{
                              color:
                                item.state === 'completed'
                                  ? '#86EFAC'
                                  : item.state === 'rejected'
                                  ? '#FCA5A5'
                                  : '#FBBF24'
                            }}
                          >
                            {item.state}
                          </span>
                        </div>
                      </div>
                    </div>

                    {item.coins_earned > 0 && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#FBBF24',
                          fontWeight: 800,
                          fontSize: '12px'
                        }}
                      >
                        <Coins size={12} />
                        <span>+{item.coins_earned}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
