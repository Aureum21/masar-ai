'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';


import { useEffect, useRef, useState } from 'react';
import styles from './receipts.module.css';

export default function ReceiptCamera({ onCapture, onClose, onUpload }) {
  const video = useRef(null);
  const dialog = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [capturing, setCapturing] = useState(false);
  const active = useRef(true);

  useEffect(() => {
    dialog.current.showModal();
    let cancelled = false;
    let stream;
    active.current = true;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera unavailable');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (cancelled) { stream.getTracks().forEach(track => track.stop()); return; }
        video.current.srcObject = stream;
        await video.current.play();
        if (!cancelled) setReady(true);
      } catch {
        stream?.getTracks().forEach(track => track.stop());
        if (!cancelled) setError('We could not open your camera. Allow camera access in your browser, or upload a receipt photo instead.');
      }
    }
    start();
    return () => { cancelled = true; active.current = false; stream?.getTracks().forEach(track => track.stop()); };
  }, []);

  function capture() {
    const source = video.current;
    if (!source?.videoWidth || !source.videoHeight) return;
    setCapturing(true);
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2400 / Math.max(source.videoWidth, source.videoHeight));
    canvas.width = Math.round(source.videoWidth * scale);
    canvas.height = Math.round(source.videoHeight * scale);
    canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!active.current) return;
      if (!blob) { setError('Could not capture the photo. Please try again.'); setCapturing(false); return; }
      onCapture(new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  }

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="camera-title" onCancel={onClose}>
    <div className={styles.dialogBar}><h2 id="camera-title"><LocalizedText message={"Scan receipt"} /></h2><button type="button" className={styles.secondary} onClick={onClose}><LocalizedText message={"Close camera"} /></button></div>
    <p><LocalizedText message={"Place the receipt flat in good light. Keep all edges visible and avoid blur or glare."} /></p>
    <Localized element={"video"} attributes={["aria-label"]} ref={video} className={styles.video} muted playsInline aria-label="Live receipt camera preview" />
    {error ? <p role="alert" className={styles.error}><LocalizedText>{error}</LocalizedText></p> : !ready && <p role="status"><LocalizedText message={"Waiting for camera access…"} /></p>}
    <div className={styles.actions}><button type="button" className={styles.primary} disabled={!ready || capturing} onClick={capture}><LocalizedText>{capturing ? 'Capturing…' : 'Take photo'}</LocalizedText></button><button type="button" className={styles.secondary} onClick={onUpload}><LocalizedText message={"Upload a photo instead"} /></button></div>
  </dialog>;
}
