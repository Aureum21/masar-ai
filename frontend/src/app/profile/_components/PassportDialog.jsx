'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';


import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from '../passport.module.css';

export default function PassportDialog({ title, children, onClose, className = '', footer }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus?.(); };
  }, []);
  return createPortal(
    <dialog ref={ref} className={`${styles.dialog} ${className}`} aria-labelledby={titleId} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose(); } }}>
      <div className={styles.dialogTop}><span className={styles.eyebrow}><LocalizedText message={"MASAR PASSPORT"} /></span><Localized element={"button"} attributes={["aria-label"]} type="button" className={styles.iconButton} onClick={onClose} aria-label="Close dialog"><X size={20} /></Localized></div>
      <h2 id={titleId} className={styles.dialogTitle}><LocalizedText>{title}</LocalizedText></h2>
      {children}
      {footer&&<footer className={styles.stampDialogFooter}>{footer}</footer>}
    </dialog>, document.body,
  );
}
