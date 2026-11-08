'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';

import { useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { notifyPassportChanged, passportRequest } from '../_lib/passportApi';
import { PassportShell, PrivateEvidence } from '../_components/PassportUI';
import styles from '../passport.module.css';

export default function ReviewPage() { return <ProtectedRoute><Review /></ProtectedRoute>; }
function Review() {
  const { token } = useAuth();
  const [key, setKey] = useState('');
  const [queue, setQueue] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function load(event) {
    event?.preventDefault(); setBusy(true); setError('');
    try { const data = await passportRequest(token, '/review/submissions', { headers: { 'X-Passport-Operator-Key': key } }); setQueue(data.submissions); }
    catch (e) { setError(e.message); setQueue(null); } finally { setBusy(false); }
  }
  async function decide(submission, decision, feedback) {
    setBusy(true); setError('');
    try { await passportRequest(token, `/review/submissions/${submission.id}`, { method: 'POST', headers: { 'X-Passport-Operator-Key': key }, body: { decision, feedback } }); setQueue(previous => previous.filter(item => item.id !== submission.id)); notifyPassportChanged(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Localized element={PassportShell} attributes={["title","subtitle"]} title="The review desk." subtitle="Approve evidence against the stated challenge criteria."><div className={styles.notice}><LocalizedText message={"Restricted to authorized operators. Your review key stays in this page’s memory and is cleared when you leave."} /></div><form onSubmit={load} className={styles.panel}><label className={styles.field}><LocalizedText message={"Operator key"} /><input className={styles.input} type="password" autoComplete="off" required value={key} onChange={event => { setKey(event.target.value); setQueue(null); }} /></label><button className={styles.primaryButton} style={{ marginTop: 16 }} disabled={busy}><LocalizedText message={"Open review queue"} /></button></form>{error && <p className={styles.error} role="alert"><LocalizedText>{error}</LocalizedText></p>}{queue?.length === 0 && <p className={styles.muted}><LocalizedText message={"No live submissions are awaiting review."} /></p>}{queue?.map(submission => <ReviewItem key={submission.id} submission={submission} operatorKey={key} busy={busy} decide={decide} />)}</Localized>;
}
function ReviewItem({ submission, operatorKey, busy, decide }) {
  const [feedback, setFeedback] = useState('');
  return <article className={styles.panel}><h2 className={styles.panelTitle}>{submission.title}</h2><p className={styles.muted}>{submission.instructions}</p><blockquote className={styles.memoryText}>{submission.text}</blockquote>{submission.image_url && <PrivateEvidence submissionId={submission.id} operatorKey={operatorKey} />}<label className={styles.field}><LocalizedText message={"Review feedback"} /><textarea className={styles.input} rows={3} minLength={3} maxLength={2000} value={feedback} onChange={event => setFeedback(event.target.value)} /></label><div className={styles.formActions}><button className={styles.primaryButton} disabled={busy || feedback.trim().length < 3} onClick={() => decide(submission, 'accepted', feedback.trim())}><LocalizedText message={"Approve evidence"} /></button><button className={styles.secondaryButton} disabled={busy || feedback.trim().length < 3} onClick={() => decide(submission, 'rejected', feedback.trim())}><LocalizedText message={"Return for another attempt"} /></button></div></article>;
}
