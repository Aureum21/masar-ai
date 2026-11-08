'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';


import { Check, Sparkles } from 'lucide-react';
import PassportDialog from './PassportDialog';
import StampArt from './StampArt';
import styles from '../passport.module.css';

export default function Celebration({ kind = 'stamp', title, subtitle, stamp, milestones = [], onClose }) {
  return <Localized element={PassportDialog} attributes={["title"]} title={title || 'A new chapter, collected.'} onClose={onClose} className={styles.celebration}>
    <div className={styles.confetti} aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ '--i': index, '--rotation': `${index * 30}deg` }} />)}</div>
    <div className={styles.celebrationArt}>{kind === 'stamp' ? <StampArt stamp={stamp || { category: 'discovery', title: 'A new stamp' }} size={148} /> : <div className={styles.celebrationCheck}>{kind === 'booking' ? <Check size={52} /> : <Sparkles size={52} />}</div>}</div>
    <p className={styles.muted}><LocalizedText>{subtitle}</LocalizedText></p>
    {milestones.map(milestone => <p key={milestone.id} className={styles.milestone}><Sparkles size={16} aria-hidden="true" />{milestone.title}</p>)}
    <button type="button" className={styles.primaryButton} onClick={onClose}><LocalizedText message={"Keep exploring "} /><span aria-hidden="true">↗</span></button>
  </Localized>;
}
