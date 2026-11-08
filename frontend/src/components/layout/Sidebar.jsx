'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';

import LanguageSwitcher from '@/i18n/LanguageSwitcher';

import { APP_HOME } from '@/config/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  MessageSquare, 
  Luggage, 
  Map, 
  Gamepad2,
  Gift,
  ReceiptText,
  Plus, 
  ChevronLeft, 
  ChevronRight,
  User,
  LogOut,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useConversations } from '@/lib/conversationStore';

export default function Sidebar({ onNewChat }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { token, userEmail, logout } = useAuth();
  const { conversations: recentChats, deleteConversation: removeChat } = useConversations(token);

  const navItems = [
    { name: 'Explore UAE', href: '/explore', icon: Map },
    { name: 'My Trips', href: '/trips', icon: Luggage },
    { name: 'Receipts', href: '/receipts', icon: ReceiptText },
    { name: 'Challenges', href: '/challenges', icon: Gamepad2 },
    { name: 'Rewards', href: '/rewards', icon: Gift },
    { name: 'Ask MASAR', href: '/chat', icon: MessageSquare },
  ];

  const handleDeleteConversation = async (e, id) => {
    e.preventDefault(); // Prevent navigating to the chat
    e.stopPropagation();
    await removeChat(id);
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* ── Brand Header ── */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div className="sidebar-header">
          <Link href={APP_HOME} className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Localized element={"img"} attributes={["alt"]}
              src="/MasarAiLogo.png" 
              alt="Masar AI" 
              style={{ 
                height: collapsed ? '38px' : '40px', 
                width: 'auto', 
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 12px rgba(245, 158, 11, 0.45))'
              }} 
            />
            {!collapsed && (
              <span style={{ 
                background: 'linear-gradient(135deg, #FFFFFF 30%, #F59E0B 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 800,
                fontSize: '1.2rem',
                letterSpacing: '-0.02em'
              }}><LocalizedText message={"Masar AI"} /></span>
            )}
          </Link>
          <Localized element={"button"} attributes={["title"]}
            className="sidebar-toggle-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Localized>
        </div>

        {/* ── Navigation Items ── */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/' 
              ? pathname === '/' 
              : pathname.startsWith(item.href) || 
                (item.href === '/explore' && pathname === '/plan') ||
                (item.href === '/rewards' && (pathname === '/rewards' || pathname.startsWith('/profile/rewards')));

            return (
              <Localized element={Link} attributes={["aria-label","title"]}
                key={item.name}
                href={item.href}
                aria-label={item.name}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                title={collapsed ? item.name : undefined}
              >
                <Icon size={18} />
                {!collapsed && (
                  <>
                    <span><LocalizedText>{item.name}</LocalizedText></span>
                    {item.badge && <span className="sidebar-nav-badge">{item.badge}</span>}
                  </>
                )}
              </Localized>
            );
          })}
        </nav>

        {/* ── Action: New Chat ── */}
        <Localized element={"button"} attributes={["title"]}
          className="sidebar-new-chat-btn" 
          onClick={onNewChat || (() => router.push('/chat'))}
          title="Start new conversation"
        >
          <Plus size={16} />
          {!collapsed && <span><LocalizedText message={"New chat"} /></span>}
        </Localized>

        {/* ── Recent Conversations / Chat History (Instant SWR cache) ── */}
        {!collapsed && (
          <div className="sidebar-recent-conversations" style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: '14px',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 8px 8px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}>
              <span><LocalizedText message={"Recent Conversations"} /></span>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              overflowY: 'auto',
              paddingInlineEnd: '4px'
            }}>
              {recentChats.map((chat) => {
                const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
                const isCurrent = pathname === '/chat' && searchParams?.get('thread_id') === chat.id;
                
                // Format relative time safely accounting for UTC offset
                let updatedTime = new Date();
                if (chat.updated_at) {
                  const raw = String(chat.updated_at).trim();
                  if (!raw.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(raw)) {
                    updatedTime = new Date(`${raw}Z`);
                  } else {
                    updatedTime = new Date(raw);
                  }
                }
                const diffMs = Math.max(0, new Date() - updatedTime);
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMins / 60);
                const diffDays = Math.floor(diffHours / 24);
                let timeStr = 'Just now';
                if (diffDays > 0) timeStr = `${diffDays}d ago`;
                else if (diffHours > 0) timeStr = `${diffHours}h ago`;
                else if (diffMins > 0) timeStr = `${diffMins}m ago`;

                return (
                  <Link
                    key={chat.id}
                    href={`/chat?thread_id=${chat.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      backgroundColor: isCurrent ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                      border: isCurrent ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid transparent',
                      color: isCurrent ? '#FBBF24' : '#CBD5E1',
                      fontSize: '13px',
                      fontWeight: isCurrent ? 600 : 500,
                      transition: 'all 0.15s ease'
                    }}
                    className="hover:bg-white/5"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <MessageSquare size={14} color={isCurrent ? '#F59E0B' : '#64748B'} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <LocalizedText>{chat.title?.startsWith('[MASAR_TRIP_BRIEF]') ? 'Your UAE trip brief' : chat.title}</LocalizedText>
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', color: '#64748B', flexShrink: 0, marginInlineStart: '6px' }}>
                        <LocalizedText>{timeStr}</LocalizedText>
                      </span>
                      <Localized element={"button"} attributes={["title"]}
                        onClick={(e) => handleDeleteConversation(e, chat.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748B',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px'
                        }}
                        className="hover:text-red-500 transition-colors"
                        title="Delete conversation"
                      >
                        <Trash2 size={12} />
                      </Localized>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Profile Footer ── */}
      <div className="sidebar-footer"><LanguageSwitcher/>
        {token ? (
          <div className="sidebar-profile">
            <Localized element={Link} attributes={["aria-label"]} href="/profile/account" aria-label="Account settings" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
              <div className="sidebar-avatar">
                <User size={16} />
              </div>
              {!collapsed && (
                <div className="sidebar-profile-info" style={{ minWidth: 0 }}>
                  <div className="sidebar-profile-name" style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span className="hover:text-amber-400 transition-colors">{userEmail.split('@')[0]}</span>
                  </div>
                </div>
              )}
            </Localized>
            {!collapsed && (
              <Localized element={"button"} attributes={["title"]} onClick={logout} className="text-gray-400 hover:text-white transition-colors" title="Logout" style={{ flexShrink: 0 }}>
                <LogOut size={16} />
              </Localized>
            )}
          </div>
        ) : (
          <div className="sidebar-profile" style={{ cursor: 'default' }}>
            <div className="sidebar-avatar" style={{ backgroundColor: 'transparent', border: '1px solid var(--color-border)' }}>
              <User size={16} color="var(--color-text-muted)" />
            </div>
            {!collapsed && (
              <div className="sidebar-profile-info" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Link href="/login" className="text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors"><LocalizedText message={"Log in"} /></Link>
                <span className="text-gray-500 text-sm"><LocalizedText message={"or"} /></span>
                <Link href="/signup" className="text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors"><LocalizedText message={"Sign up"} /></Link>
              </div>
            )}
          </div>
        )}
        {!collapsed && (
          <div className="sidebar-legal-links">
            <div><LocalizedText message={"Company • Privacy • Help"} /></div>
            <div><LocalizedText message={"© 2026 Masar AI, UAE"} /></div>
          </div>
        )}
      </div>
    </aside>
  );
}
