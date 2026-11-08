"use client";
import {LocalizedText} from '@/i18n/Localized';
import {useEffect, useId, useRef} from 'react';
import {createPortal} from 'react-dom';
import {Trash2, MapPin} from 'lucide-react';
import styles from './DeleteTripDialog.module.css';

export default function DeleteTripDialog({trip, busy, error, onCancel, onConfirm}) {
  const heading = useId();
  const cancel = useRef(null);
  const box = useRef(null);

  useEffect(() => {
    if (!trip) return;
    const previous = document.activeElement;
    cancel.current?.focus();
    return () => previous?.focus?.();
  }, [trip]);

  if (!trip || typeof document === 'undefined') return null;

  function keyDown(event) {
    if (event.key === 'Escape' && !busy) {
      event.preventDefault();
      onCancel();
    }
    if (event.key === 'Tab') {
      const buttons = box.current?.querySelectorAll('button:not(:disabled)');
      if (!buttons || buttons.length === 0) { event.preventDefault(); return; }
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  return createPortal(
    <div
      className={styles.overlay}
      onKeyDown={keyDown}
      onClick={() => { if (!busy) onCancel(); }}
    >
      <section
        ref={box}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={heading}
        aria-describedby={`${heading}-copy`}
        onClick={event => event.stopPropagation()}
        className={styles.card}
      >
        <div className={styles.headerIcon}>
          <Trash2 size={24} />
        </div>

        <h2 id={heading} className={styles.title}>
          <LocalizedText message={"Delete this trip?"} />
        </h2>

        <div className={styles.tripPill}>
          <div className={styles.tripPillIcon}>
            <MapPin size={18} />
          </div>
          <div className={styles.tripPillText}>
            <span className={styles.tripPillLabel}>
              <LocalizedText message={"Trip Itinerary"} />
            </span>
            <strong className={styles.tripPillTitle}>{trip.title}</strong>
          </div>
        </div>

        <div id={`${heading}-copy`} className={styles.bulletList}>
          <div className={styles.bulletItem}>
            <span className={styles.bulletDotWarning} />
            <span className={styles.bulletTextWarning}>
              <LocalizedText message={"Removes the itinerary and private challenge photos"} />
            </span>
          </div>
          <div className={styles.bulletItem}>
            <span className={styles.bulletDotSafe} />
            <span className={styles.bulletTextSafe}>
              <LocalizedText message={"Earned passport stamps & booking records remain safe"} />
            </span>
          </div>
        </div>

        {error && (
          <p role="alert" className={styles.errorAlert}>
            <LocalizedText>{error}</LocalizedText>
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            ref={cancel}
            disabled={busy}
            onClick={onCancel}
            className={styles.btnKeep}
          >
            <LocalizedText message={"Keep trip"} />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={styles.btnDelete}
          >
            <LocalizedText>
              {busy ? 'Deleting…' : error ? 'Retry deletion' : 'Delete trip'}
            </LocalizedText>
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}
