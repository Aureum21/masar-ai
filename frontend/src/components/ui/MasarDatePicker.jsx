'use client';
import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import './picker-theme.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function MasarDatePicker({
  name,
  label,
  value,
  min,
  max,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  error = false,
  'aria-label': ariaLabel,
  className = '',
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const parseDate = (str) => {
    if (!str || typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const selectedDate = parseDate(value);
  const minDate = parseDate(min);
  const maxDate = parseDate(max);

  const defaultYear = selectedDate ? selectedDate.getFullYear() : (minDate ? minDate.getFullYear() : new Date().getFullYear());
  const defaultMonth = selectedDate ? selectedDate.getMonth() : (minDate ? minDate.getMonth() : new Date().getMonth());

  const [viewYear, setViewYear] = useState(defaultYear);
  const [viewMonth, setViewMonth] = useState(defaultMonth);

  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen && selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
    setIsOpen(!isOpen);
  };

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

  const formatDisplay = (d) => {
    if (!d) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const prevMonthDays = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    prevMonthDays.push(daysInPrevMonth - i);
  }

  const currentMonthDays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    currentMonthDays.push(i);
  }

  const totalDisplayed = prevMonthDays.length + currentMonthDays.length;
  const nextMonthDays = [];
  const remaining = (7 - (totalDisplayed % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    nextMonthDays.push(i);
  }

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const isDateDisabled = (year, month, day) => {
    const d = new Date(year, month, day);
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  };

  const isDateSelected = (year, month, day) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month &&
      selectedDate.getDate() === day
    );
  };

  const isToday = (year, month, day) => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  const selectDay = (day) => {
    if (isDateDisabled(viewYear, viewMonth, day)) return;
    const formatted = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange?.(formatted);
    setIsOpen(false);
  };

  const selectToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    if (!isDateDisabled(y, m, d)) {
      const formatted = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      onChange?.(formatted);
      setIsOpen(false);
    }
  };

  const clearDate = () => {
    onChange?.('');
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`masar-datepicker-wrapper ${isOpen ? 'is-open' : ''} ${error ? 'has-error' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}
    >
      <input type="hidden" name={name} value={value ?? ''} />
      <button
        type="button"
        id={id}
        name={name}
        aria-label={ariaLabel || label}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setIsOpen(false);
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleOpen();
          }
        }}
        className="masar-datepicker-trigger"
      >
        <span className={`masar-datepicker-value ${!selectedDate ? 'is-placeholder' : ''}`}>
          {selectedDate ? formatDisplay(selectedDate) : placeholder}
        </span>
        <CalendarIcon size={16} className="masar-datepicker-icon" />
      </button>

      {isOpen && (
        <div className="masar-datepicker-popover" role="dialog" aria-label={ariaLabel || label}>
          <div className="masar-datepicker-header">
            <button type="button" onClick={prevMonth} className="masar-datepicker-nav-btn" aria-label="Previous month">
              <ChevronLeft size={16} />
            </button>
            <div className="masar-datepicker-title">
              <strong>{MONTH_NAMES[viewMonth]}</strong>
              <span>{viewYear}</span>
            </div>
            <button type="button" onClick={nextMonth} className="masar-datepicker-nav-btn" aria-label="Next month">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="masar-datepicker-grid">
            <div className="masar-datepicker-weekdays">
              {WEEKDAY_NAMES.map(day => (
                <span key={day} className="masar-datepicker-weekday">{day}</span>
              ))}
            </div>

            <div className="masar-datepicker-days">
              {prevMonthDays.map(day => (
                <span key={`prev-${day}`} className="masar-datepicker-day outside-month">{day}</span>
              ))}

              {currentMonthDays.map(day => {
                const disabledDay = isDateDisabled(viewYear, viewMonth, day);
                const selected = isDateSelected(viewYear, viewMonth, day);
                const today = isToday(viewYear, viewMonth, day);
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={disabledDay}
                    onClick={() => selectDay(day)}
                    className={`masar-datepicker-day ${selected ? 'is-selected' : ''} ${today ? 'is-today' : ''} ${disabledDay ? 'is-disabled' : ''}`}
                    aria-label={`${day} ${MONTH_NAMES[viewMonth]} ${viewYear}`}
                    aria-pressed={selected}
                  >
                    {day}
                  </button>
                );
              })}

              {nextMonthDays.map(day => (
                <span key={`next-${day}`} className="masar-datepicker-day outside-month">{day}</span>
              ))}
            </div>
          </div>

          <div className="masar-datepicker-footer">
            <button type="button" onClick={clearDate} className="masar-datepicker-btn subtle">
              <X size={12} /> Clear
            </button>
            <button type="button" onClick={selectToday} className="masar-datepicker-btn gold">
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
