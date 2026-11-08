'use client';
import LanguageSwitcher from '@/i18n/LanguageSwitcher';
import {Localized,LocalizedText} from '@/i18n/Localized';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUpRight, BookOpen, Gift, Luggage, Settings } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import RewardsTabs from '@/app/rewards/_components/RewardsTabs';
import DailyPromotionHost from '@/components/daily-promotions/DailyPromotionHost';
import { useAuth } from '@/context/AuthContext';
import { notifyPassportChanged, passportRequest } from '../_lib/passportApi';
import styles from '../passport.module.css';

export function PassportShell({ children, title = 'My Passport', subtitle, contentClassName = '' }) {
  const pathname = usePathname();
  return <div className={`app-container ${styles.shell}`}><Sidebar /><DailyPromotionHost/><main className={`main-content ${styles.main}`}><div className={`${styles.page} ${contentClassName}`}>
    <div className={styles.topbar}><Link href="/rewards" className={styles.breadcrumb}><strong><LocalizedText message={"MASAR"} /></strong><span><LocalizedText message={"/ REWARDS"} /></span></Link><div className={styles.headerLinks}><LanguageSwitcher/><Link href="/trips" className={styles.textLink}><Luggage size={15} /><LocalizedText message={"My journeys"} /></Link><Link href="/rewards/redeem" className={styles.textLink}><Gift size={15} /><LocalizedText message={"Rewards"} /></Link><Localized element={Link} attributes={["aria-label"]} href="/profile/account" className={styles.textLink} aria-label="Account settings"><Settings size={15} /><LocalizedText message={"Account"} /></Localized></div></div>
    <div className={styles.intro}><div><h1 className={styles.title}><LocalizedText>{title}</LocalizedText></h1><p className={styles.subtitle}><LocalizedText>{subtitle || 'The places you discover. The stories you keep.'}</LocalizedText></p></div><span className={styles.issue}><LocalizedText message={"A life well explored"} /><br /><LocalizedText message={"مسار · Your own path"} /></span></div>
    {pathname.startsWith('/rewards')&&<RewardsTabs/>}
    {children}
    <Localized element={"nav"} attributes={["aria-label"]} className={styles.mobileBar} aria-label="Traveler navigation"><Link href="/rewards" aria-current={pathname === '/rewards' ? 'page' : undefined}><BookOpen size={17} /><LocalizedText message={"Passport"} /></Link><Link href="/trips"><Luggage size={17} /><LocalizedText message={"Journeys"} /></Link><Link href="/rewards/redeem" aria-current={pathname === '/rewards/redeem' ? 'page' : undefined}><Gift size={17} /><LocalizedText message={"Rewards"} /></Link><Localized element={Link} attributes={["aria-label"]} href="/profile/account" aria-label="Account settings"><Settings size={17} /></Localized></Localized>
  </div></main></div>;
}

export function DemoAdventureButton({ className = styles.primaryButton, children = 'Try the Sharjah adventure' }) {
  const { token } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function start() {
    if (busy) return;
    setBusy(true); setError('');
    try { const result = await passportRequest(token, '/demo-trip', { method: 'POST' }); notifyPassportChanged(); router.push(`/trips/${result.trip_id}/challenges`); }
    catch (e) { setError(e.message); setBusy(false); }
  }
  return <><button className={className} onClick={start} disabled={busy}><LocalizedText>{busy ? 'Opening your adventure…' : children}</LocalizedText><ArrowUpRight size={15} /></button>{error && <p className={styles.error} role="alert"><LocalizedText>{error}</LocalizedText></p>}</>;
}

export function PrivateEvidence({ submissionId, operatorKey, canDelete = false, onRemoved }) {
  const { token } = useAuth();
  const [state, setState] = useState({ url: '', error: '' });
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [removed, setRemoved] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    passportRequest(token, `/submissions/${submissionId}/image`, { responseType: 'blob', signal: controller.signal, headers: operatorKey ? { 'X-Passport-Operator-Key': operatorKey } : {} })
      .then(blob => { if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setState({ url: objectUrl, error: '' }); } })
      .catch(error => { if (error.name !== 'AbortError') setState({ url: '', error: error.message }); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [token, submissionId, operatorKey]);
  async function remove() {
    setBusy(true);
    try {
      await passportRequest(token, `/submissions/${submissionId}/image`, { method: 'DELETE' });
      setRemoved(true); onRemoved?.(); notifyPassportChanged();
    } catch (error) { setState(previous => ({ ...previous, error: error.message })); }
    finally { setBusy(false); }
  }
  if (removed) return <p className={styles.muted} role="status"><LocalizedText message={"Private photo removed. Your earned stamp is kept."} /></p>;
  return <>{state.error ? <p role="status" className={styles.muted}>{state.error}</p> : state.url ? <Localized element={"img"} attributes={["alt"]} src={state.url} alt="Your privately stored challenge evidence" className={styles.evidenceImage} /> : <p className={styles.muted} role="status"><LocalizedText message={"Opening your private photo…"} /></p>}{canDelete && state.url && <div className={styles.formActions}>{confirming ? <><p className={styles.muted}><LocalizedText message={"Permanently remove this photo? Any earned stamp stays in your passport."} /></p><button className={styles.secondaryButton} disabled={busy} onClick={remove}><LocalizedText>{busy ? 'Removing…' : 'Remove photo permanently'}</LocalizedText></button><button className={styles.textLink} onClick={() => setConfirming(false)}><LocalizedText message={"Keep photo"} /></button></> : <button className={styles.textLink} onClick={() => setConfirming(true)}><LocalizedText message={"Remove private photo"} /></button>}</div>}</>;
}

export function ResourceState({ resource }) {
  if (resource.error) return <div className={styles.error} role="alert"><span>{resource.error}</span><button className={styles.secondaryButton} onClick={resource.refresh}><LocalizedText message={"Try again"} /></button></div>;
  return <div className={styles.loading} role="status"><div className={styles.spinner} /><span><LocalizedText message={"Opening your passport…"} /></span></div>;
}
