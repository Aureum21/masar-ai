'use client';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import './picker-theme.css';

export default function MasarSelect({
  name,
  label,
  value,
  options = [],
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  error = false,
  compact = false,
  'aria-label': ariaLabel,
  className = '',
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const normalizedOptions = options.map(opt => Array.isArray(opt) ? opt : [opt.value ?? opt, opt.label ?? opt]);
  const currentOption = normalizedOptions.find(([val]) => String(val) === String(value));
  const displayText = currentOption ? currentOption[1] : (value || placeholder);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const currentIndex = normalizedOptions.findIndex(([val]) => String(val) === String(value));
      if (e.key === 'ArrowDown') {
        const nextIndex = currentIndex < normalizedOptions.length - 1 ? currentIndex + 1 : 0;
        onChange?.(normalizedOptions[nextIndex][0]);
      } else if (e.key === 'ArrowUp') {
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : normalizedOptions.length - 1;
        onChange?.(normalizedOptions[prevIndex][0]);
      } else if (e.key === 'Enter' || e.key === ' ') {
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const handleSelect = (val) => {
    onChange?.(val);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`masar-select-wrapper ${compact ? 'is-compact' : ''} ${isOpen ? 'is-open' : ''} ${error ? 'has-error' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}
    >
      <input type="hidden" name={name} value={value ?? ''} />
      <button
        type="button"
        id={id}
        name={name}
        aria-label={ariaLabel || label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="masar-select-trigger"
      >
        <span className="masar-select-value">{displayText}</span>
        <ChevronDown size={16} className={`masar-select-chevron ${isOpen ? 'rotate' : ''}`} />
      </button>

      {isOpen && (
        <div className="masar-select-popover" role="listbox" tabIndex={-1} aria-label={ariaLabel || label}>
          <div className="masar-select-options">
            {normalizedOptions.map(([optVal, optText]) => {
              const isSelected = String(optVal) === String(value);
              return (
                <div
                  key={String(optVal)}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(optVal)}
                  className={`masar-select-option ${isSelected ? 'is-selected' : ''}`}
                >
                  <span className="masar-select-option-text">{optText}</span>
                  {isSelected && <Check size={14} className="masar-select-check" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
