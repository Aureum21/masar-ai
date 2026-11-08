'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';

import LanguageSwitcher from '@/i18n/LanguageSwitcher';
import Link from 'next/link';
import {APP_HOME} from '@/config/navigation';
import { Plus, LogOut, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ui/ThemeToggle';
import NotificationBell from '@/components/notifications/NotificationBell';

export default function Header({ activeTab, onNewChat }) {
  const { token, userEmail, logout } = useAuth();

  return (
    <header className="header"><LanguageSwitcher/>
      <div className="header-left">
        <Link href={APP_HOME} className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Localized element={"img"} attributes={["alt"]}
            src="/MasarAiLogo.png" 
            alt="Masar AI" 
            style={{ height: '34px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(245, 158, 11, 0.4))' }} 
          />
          <span className="header-brand-name" style={{ fontSize: '1.15rem' }}><LocalizedText message={"Masar AI"} /></span>
        </Link>
        <nav className="header-nav">
          <Link href="/explore" className={`header-nav-item ${activeTab === 'explore' ? 'active' : ''}`}><LocalizedText message={"Explore UAE"} /></Link>
          <Link 
            href="/chat" 
            className={`header-nav-item ${activeTab === 'chat' ? 'active' : ''}`}
          ><LocalizedText message={"Ask MASAR"} /></Link>
          <Link 
            href="/trips" 
            className={`header-nav-item ${activeTab === 'trips' ? 'active' : ''}`}
          ><LocalizedText message={"My Trips"} /></Link>
        </nav>
      </div>
      <div className="header-right flex items-center gap-3">
        <NotificationBell />
        <ThemeToggle />
        {token ? (
          <div className="flex items-center gap-3">
            <Link href="/profile/account" className="text-sm flex items-center gap-2 transition-colors" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
              <User size={16} className="text-amber-500" />
              <span className="hover:text-amber-400">{userEmail?.split('@')[0]}</span>
            </Link>
            <Localized element={"button"} attributes={["title"]}
              className="text-gray-400 hover:text-white transition-colors" 
              onClick={logout} 
              title="Logout"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <LogOut size={18} />
            </Localized>
            <button className="header-btn-primary ml-1" onClick={onNewChat}>
              <Plus size={18} /><LocalizedText message={"New Chat"} /></button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link 
              href="/login" 
              className="text-sm font-medium transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
            ><LocalizedText message={"Log in"} /></Link>
            <Link href="/signup" className="header-btn-primary" style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #F59E0B', color: '#F59E0B' }}><LocalizedText message={"Sign up"} /></Link>
            <button className="header-btn-primary ml-1" onClick={onNewChat}>
              <Plus size={18} /><LocalizedText message={"New Chat"} /></button>
          </div>
        )}
      </div>
    </header>
  );
}
