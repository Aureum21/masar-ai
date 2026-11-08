
import {Localized,LocalizedText} from '@/i18n/Localized';
import {BookOpen} from 'lucide-react';
import styles from '../passport.module.css';

export default function PassportLoading(){
  return <Localized element={"div"} attributes={["aria-label"]} className={styles.passportSkeleton} role="status" aria-label="Loading your passport, XP and stamps">
    <div aria-hidden="true" className={styles.skeletonToolbar}><span/><span/></div>
    <div className={styles.skeletonHero} aria-hidden="true">
      <div className={styles.skeletonIdentity}><div className={styles.skeletonAvatar}><BookOpen size={29} strokeWidth={1.2}/></div><div className={styles.skeletonIdentityLines}><span/><span/></div></div>
      <div className={styles.skeletonXP}><span/><div/><span/></div>
    </div>
    <div className={styles.skeletonCollectionHeading}><span><LocalizedText message={"Your collected moments"} /></span><span className={styles.skeletonLabel}><LocalizedText message={"Opening your collection"} /><span className={styles.skeletonDots}>…</span></span></div>
    <div className={styles.skeletonCards} aria-hidden="true">{[0,1,2].map(item=><div key={item} className={styles.skeletonStamp}><div className={styles.skeletonSeal}/><div className={styles.skeletonStampLines}><span/><span/></div><div className={styles.skeletonStampFoot}><span/><span/></div></div>)}</div>
  </Localized>;
}
