'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Trash2, ArrowUpRight, X, RotateCw, Coins } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { normalizeNotifications, updateNotifications } from '@/lib/notifications';
import { usePassportResource } from '@/app/profile/_lib/passportApi';
import { openDailyPromotion } from '@/components/daily-promotions/DailyPromotionHost';

export default function NotificationBell() {
  const { token } = useAuth();
  const resource = usePassportResource('/notifications');
  const notifications = normalizeNotifications(resource.data?.notifications);
  const [isOpen, setIsOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const refresh = useRef(resource.refresh);
  useEffect(() => {refresh.current = resource.refresh;},[resource.refresh]);
  useEffect(() => {
    if (!token) return;
    const timer=setInterval(() => refresh.current(),30000);
    const visible=()=>{ if(document.visibilityState==='visible') refresh.current(); };
    document.addEventListener('visibilitychange',visible);
    return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  },[token]);
  useEffect(() => {
    if (!isOpen) return;
    const outside=e=>{if(!dropdownRef.current?.contains(e.target))setIsOpen(false);};
    document.addEventListener('mousedown',outside);
    return ()=>document.removeEventListener('mousedown',outside);
  },[isOpen]);
  async function act(action,id) {
    try {await updateNotifications(token,action,id);setActionError('');resource.refresh();}
    catch(error){setActionError(error.message);}
  }
  const unreadCount=notifications.filter(n=>!n.read).length;
  const onOpenItem=n=>{act('read',n.id);setIsOpen(false);};
  const onMarkAll=()=>act('read_all');
  const onClear=()=>act('dismiss_all');

  const onOpenDailyPromo = (item) => {
    if (item?.id) act('read', item.id);
    setIsOpen(false);
    openDailyPromotion();
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <Localized element={"button"} attributes={["aria-label","title"]}
        type="button"
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`In-app notifications (${unreadCount} unread)`}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: isOpen ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
          border: `1px solid ${isOpen ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
          color: isOpen ? 'var(--color-accent-gold)' : 'var(--color-text-secondary)',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        title="Notifications & Schedule Reminders"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: '#f59e0b',
              color: '#1a1306',
              fontSize: '10px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.6)'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Localized>

      {/* Luxury Glass Dropdown Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '46px',
            right: 0,
            width: '360px',
            maxWidth: '90vw',
            maxHeight: '480px',
            backgroundColor: 'rgba(15, 20, 30, 0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '18px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245, 158, 11, 0.1)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(255, 255, 255, 0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--color-accent-gold)', textTransform: 'uppercase' }}><LocalizedText message={"Trip Alerts"} /></span>
              {unreadCount > 0 && (
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}><LocalizedText message={"⟦0⟧ new"} values={[unreadCount]} /></span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {notifications.length > 0 && (
                <Localized element={"button"} attributes={["title"]}
                  type="button"
                  onClick={onMarkAll}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                  title="Mark all as read"
                >
                  <CheckCheck size={14} /><LocalizedText message={" Read all"} /></Localized>
              )}
              <Localized element={"button"} attributes={["title"]}
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                title="Close"
              >
                <X size={15} />
              </Localized>
            </div>
          </div>

          {/* Compact Pinned Daily Challenge Action (Accessible even if notifications are dismissed) */}
          <div
            onClick={() => onOpenDailyPromo()}
            style={{
              padding: '10px 14px',
              margin: '8px 10px 4px 10px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(217, 119, 6, 0.08) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RotateCw size={15} color="#F59E0B" />
              <div>
                <h5 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#f8fafc' }}>
                  <LocalizedText message={"Daily Promotional Wheel"} />
                </h5>
                <span style={{ fontSize: '10px', color: '#D4B271' }}>
                  <LocalizedText message={"Spin or resume today's challenge"} />
                </span>
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <LocalizedText message={"Open"} /> <ArrowUpRight size={12} />
            </span>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {(resource.error || actionError) && <p role="alert"><LocalizedText>{actionError || resource.error}</LocalizedText></p>}
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 16px', color: '#64748b' }}>
                <Bell size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '12.5px', fontWeight: 600, color: '#94a3b8' }}><LocalizedText message={"All caught up!"} /></p>
                <p style={{ margin: '4px 0 0', fontSize: '11px' }}><LocalizedText message={"Trip schedule reminders and quest alerts will appear here."} /></p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    marginBottom: '6px',
                    background: item.read ? 'rgba(255, 255, 255, 0.02)' : 'rgba(245, 158, 11, 0.08)',
                    border: `1px solid ${item.read ? 'rgba(255, 255, 255, 0.05)' : 'rgba(245, 158, 11, 0.25)'}`,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '2px', display: 'flex', alignItems: 'center' }}>
                      {item.type === 'daily_promotion' ? <RotateCw size={15} color="#F59E0B" /> : item.icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                          {item.title}
                        </h4>
                        {!item.read && (
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b', flexShrink: 0 }} />
                        )}
                      </div>
                      <p style={{ margin: '3px 0 8px', fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
                        <LocalizedText>{item.message}</LocalizedText>
                      </p>

                      {item.type === 'daily_promotion' ? (
                        <button
                          type="button"
                          onClick={() => onOpenDailyPromo(item)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--color-accent-gold)',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          <LocalizedText message={item.action === 'spin' ? "Spin Challenge Wheel " : item.action === 'view' ? "View Result " : "Resume Challenge "} />
                          <ArrowUpRight size={12} />
                        </button>
                      ) : item.deepLink ? (
                        <Link
                          href={item.deepLink}
                          onClick={() => onOpenItem(item)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--color-accent-gold)',
                            textDecoration: 'none'
                          }}
                        >
                          <LocalizedText message={"View in Trip Workspace "} /><ArrowUpRight size={12} />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              style={{
                padding: '10px 16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(255, 255, 255, 0.02)'
              }}
            >
              <button
                type="button"
                onClick={onClear}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Trash2 size={12} /><LocalizedText message={" Clear history"} /></button>
              <span style={{ fontSize: '10px', color: '#64748b' }}><LocalizedText message={"Dubai Time (UTC+4)"} /></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
