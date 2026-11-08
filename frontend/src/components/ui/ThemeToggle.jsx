'use client';
import {Localized} from '@/i18n/Localized';


import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function ThemeToggle({ className = '', style = {} }) {
  const { theme, toggleTheme, isDark, mounted } = useTheme();

  if (!mounted) {
    return (
      <div 
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          border: '1px solid var(--color-border, rgba(255, 255, 255, 0.1))',
          backgroundColor: 'transparent',
          ...style
        }} 
      />
    );
  }

  return (
    <Localized element={"button"} attributes={["aria-label","title"]}
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`theme-toggle-btn ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '38px',
        height: '38px',
        borderRadius: '10px',
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.12)'}`,
        color: isDark ? '#FBBF24' : '#D97706',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    >
      <span 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: isDark ? 'rotate(0deg)' : 'rotate(360deg)',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {isDark ? (
          <Sun size={18} color="#FBBF24" />
        ) : (
          <Moon size={18} color="#D97706" />
        )}
      </span>
    </Localized>
  );
}
