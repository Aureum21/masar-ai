'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {BookOpen,Gift} from 'lucide-react';
import {LocalizedText} from '@/i18n/Localized';
import styles from '../rewards.module.css';

export default function RewardsTabs(){
  const path=usePathname();
  return <nav className={styles.tabs} aria-label="Rewards sections">
    <Link href="/rewards" aria-current={path==='/rewards'?'page':undefined}><BookOpen size={17}/><LocalizedText message="My Passport"/></Link>
    <Link href="/rewards/redeem" aria-current={path==='/rewards/redeem'?'page':undefined}><Gift size={17}/><LocalizedText message="Redeem coins"/></Link>
  </nav>;
}
