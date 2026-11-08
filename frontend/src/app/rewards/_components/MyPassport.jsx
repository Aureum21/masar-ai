'use client';
import {useI18n} from '@/i18n/LocaleProvider';

import {Localized,LocalizedText} from '@/i18n/Localized';


import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowUpRight, 
  Award, 
  BookOpen, 
  Check, 
  Gift, 
  Gamepad2,
  MapPin, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { passportDate, usePassportResource } from '@/app/profile/_lib/passportApi';
import { computeUserInitials, filterStampsByCategory, extractUniqueCategories } from '@/lib/passportUtils';
import { passportActivity } from '@/lib/passportActivity.mjs';
import StampArt from '@/app/profile/_components/StampArt';
import PassportLoading from '@/app/profile/_components/PassportLoading';
import {StampCard,StampMemory,PassportXP} from '@/app/profile/_components/PassportCollectibles';
import { PassportShell, ResourceState } from '@/app/profile/_components/PassportUI';
import DailyCoinsWidget from '@/components/daily-promotions/DailyCoinsWidget';
import styles from '@/app/profile/passport.module.css';
import rewardsStyles from '../rewards.module.css';

export default function MyPassport() {
 const {locale:uiLocale}=useI18n();

  const resource = usePassportResource('/summary');
  const [category, setCategory] = useState('all');
  const [selectedStamp, setSelectedStamp] = useState(null);

  const data = resource.data;
  if (!data) return <PassportShell contentClassName={rewardsStyles.page}>{resource.error ? <ResourceState resource={resource}/> : <PassportLoading/>}</PassportShell>;

  const stamps = filterStampsByCategory(data.stamps || [], category);
  const categories = extractUniqueCategories(data.stamps || []);
  const userName = data.user?.name || 'Traveler';
  const initials = computeUserInitials(userName, data.user?.email || '');

  return (
    <PassportShell contentClassName={rewardsStyles.page}>
      <DailyCoinsWidget />

      {/* Hero Progress Banner */}
      <Localized element={"section"} attributes={["aria-label"]} className={styles.hero} aria-label="Traveler progress">
        <div className={styles.identity}>
          <div className={styles.identityTop}>
            <span className={styles.eyebrow}><LocalizedText message={"TRAVELER IDENTITY"} /></span>
            <div className={styles.verifiedChip}>
              <ShieldCheck size={12} />
              <span><LocalizedText message={"VERIFIED"} /></span>
            </div>
          </div>
          <div className={styles.member}>
            <div className={styles.monogram}>{initials}</div>
            <div>
              <h2>{userName}</h2>
              <span className={styles.level}>
                <Sparkles size={13} /><LocalizedText message={"Level "} />{data.level?.number || 1} · <LocalizedText>{data.level?.name || 'Explorer'}</LocalizedText>
              </span>
            </div>
          </div>
          <PassportXP xp={data.xp||0} level={data.level||{}}/>
        </div>
        
        <div className={styles.heroStats}>
          <span className={styles.eyebrow} style={{ color: '#51635e' }}><LocalizedText message={"YOUR WORLD, A LITTLE RICHER"} /></span>
          <div className={styles.statsGrid}>
            <div className={styles.stat}>
              <strong>{data.stats?.stamps || 0}</strong>
              <span><LocalizedText message={"stamps collected"} /></span>
            </div>
            <div className={styles.stat}>
              <strong>{data.stats?.trips || 0}</strong>
              <span><LocalizedText message={"journeys saved"} /></span>
            </div>
            <div className={styles.stat}>
              <strong>{(data.badges || []).filter(b => b.earned).length}</strong>
              <span><LocalizedText message={"badges earned"} /></span>
            </div>
          </div>
          {data.demo_xp>0&&<div className={styles.demoNote}>
            <span className={styles.demoPill}><LocalizedText message={"Pilot"} /></span>
            <span><LocalizedText message={"⟦0⟧ demo XP · kept separate from your traveler level"} values={[data.demo_xp || 0]} /></span>
          </div>}
        </div>
      </Localized>

      {/* Main Two-Column Passport Dossier */}
      <div className={styles.columns}>
        <div>
          {/* Section 1: Stamp Collection */}
          <section aria-labelledby="passport-heading">
            <div className={styles.sectionHeading}>
              <div>
                <h2 id="passport-heading"><span className={styles.sectionNumber}>01</span><LocalizedText message={"The stamp collection"} /></h2>
                <p><LocalizedText message={"Every stamp opens a memory from your journey."} /></p>
              </div>
              <BookOpen size={21} className={styles.gold} />
            </div>
            <div className={styles.paper}>
              <div className={styles.passportTop}>
                <span className={styles.eyebrow}><LocalizedText message={"PERSONAL EDITION"} /><br />
                  {(data.stamps || []).length}<LocalizedText message={" MEMORIES, AND COUNTING"} /></span>
                <div className={styles.filters}>
                  {categories.map(item => (
                    <button 
                      key={item} 
                      className={styles.filter} 
                      aria-pressed={category === item} 
                      onClick={() => setCategory(item)}
                    >
                      <LocalizedText>{item === 'all' ? 'All stamps' : item}</LocalizedText>
                    </button>
                  ))}
                </div>
              </div>

              {stamps.length ? (
                <div className={styles.stampGrid}>
                  {stamps.map(stamp => <StampCard key={stamp.id} stamp={stamp} onOpen={setSelectedStamp}/>)}
                </div>
              ) : (
                <div className={styles.empty}>
                  <div className={styles.outlineSeal}>
                    <StampArt stamp={{ category: 'discovery', title: 'Your first discovery' }} locked size={125} />
                  </div>
                  <strong><LocalizedText message={"Your first story is still unwritten."} /></strong>
                  <p><LocalizedText message={"Choose an optional challenge on a journey. An accepted reflection or reviewed experience earns a stamp here."} /></p>
                  <Link href="/trips" className={styles.primaryButton}><LocalizedText message={"Explore your journeys "} /><ArrowUpRight size={15} />
                  </Link>
                </div>
              )}

              <div className={styles.passportFoot}>
                <span><LocalizedText message={"COLLECT EXPERIENCES. KEEP THE MEMORIES."} /></span>
                <span>مسار</span>
              </div>
            </div>
          </section>

          {/* Section 2: Your Next Chapter */}
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <h2><span className={styles.sectionNumber}>02</span><LocalizedText message={"Your next chapter"} /></h2>
              <Link href="/trips" className={styles.textLink}><LocalizedText message={"All journeys "} /><ArrowUpRight size={14} /></Link>
            </div>
            <div className={styles.panel}>
              {(data.active_trips || []).length ? (
                data.active_trips.slice(0, 3).map(trip => (
                  <Link key={trip.id} href={`/trips/${trip.id}`} className={styles.adventure}>
                    <div className={styles.tripIcon}><MapPin size={22} /></div>
                    <div className={styles.tripInfo}>
                      <strong>{trip.title}</strong>
                      <div className={styles.tripMeta}>
                        <span className={styles.status}>{trip.status}</span>
                        <span>·</span>
                        <span><LocalizedText preserveValues={[true,true]} message={"⟦0⟧/⟦1⟧ optional challenges"} values={[trip.progress?.completed || 0,trip.progress?.total || 0]} /></span>
                        {trip.is_demo && <span className={styles.demoPill}><LocalizedText message={"Demo"} /></span>}
                      </div>
                      <Localized element={"progress"} attributes={["aria-label"]}
                        className={styles.progress} 
                        aria-label={`${trip.title} challenge progress`} 
                        max={trip.progress?.total || 1} 
                        value={trip.progress?.completed || 0} 
                      />
                    </div>
                    <ArrowUpRight size={17} className={styles.gold} />
                  </Link>
                ))
              ) : (
                <>
                  <h3 className={styles.panelTitle}><LocalizedText message={"Where will your story begin?"} /></h3>
                  <p className={styles.muted}><LocalizedText message={"Save a trip with your travel concierge, then add adventures when you feel like exploring a little deeper."} /></p>
                  <Link className={styles.textLink} href="/chat"><LocalizedText message={"Plan a journey "} /><ArrowUpRight size={14} /></Link>
                </>
              )}
            </div>
          </section>
        </div>

        {/* Aside Sidebar Panel */}
        <aside>

          <div className={styles.panel}>
            <Gift size={22} className={styles.gold} />
            <h2 className={styles.panelTitle} style={{ marginTop: 14 }}><LocalizedText message={"A little more to discover."} /></h2>
            <p className={styles.muted}><LocalizedText message={"Try sample attraction tickets and UAE mall gift cards with a separate demo wallet. Your earned coins, stamps and XP stay unchanged."} /></p>
            <Link className={styles.textLink} href="/rewards/redeem"><LocalizedText message={"Explore the rewards demo "} /><ArrowUpRight size={15} /></Link>
          </div>

          <div className={styles.panel}>
            <div className={styles.sectionHeading}>
              <h2><LocalizedText message={"Recently collected"} /></h2>
              <Sparkles size={16} />
            </div>
            {(data.recent_events || []).length ? (
              <ol className={styles.events}>
                {data.recent_events.slice(0, 4).map(event => {
                  const activity = passportActivity(event, uiLocale);
                  return (
                  <li key={event.id} className={styles.event}>
                    <span className={styles.eventIcon}>{activity.kind === 'game' ? <Gamepad2 size={13} aria-hidden="true"/> : <Check size={11} aria-hidden="true"/>}</span>
                    <div className={styles.eventContent}>
                      {activity.status && <span className={styles.eventStatus}><LocalizedText>{activity.status}</LocalizedText></span>}
                      <strong><LocalizedText>{activity.title}</LocalizedText></strong>
                      {activity.metrics.length > 0 && <dl className={styles.eventMetrics}>
                        {activity.metrics.map(metric => <div key={metric.label}><dt><LocalizedText>{metric.label}</LocalizedText></dt><dd>{metric.value}</dd></div>)}
                      </dl>}
                      <p><LocalizedText>{activity.description}</LocalizedText></p>
                      <time dateTime={event.created_at}>{passportDate(event.created_at, uiLocale)}</time>
                    </div>
                  </li>
                  );
                })}
              </ol>
            ) : (
              <p className={styles.muted}><LocalizedText message={"The moments you collect will appear here, one memory at a time."} /></p>
            )}
          </div>
        </aside>
      </div>

      {/* Section 3: Milestones & Badges */}
      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <h2><span className={styles.sectionNumber}>03</span><LocalizedText message={"Milestones along the way"} /></h2>
            <p><LocalizedText message={"Earned through approved experiences. Demo stamps are excluded."} /></p>
          </div>
          <Award size={22} className={styles.gold} />
        </div>
        <div className={styles.badgeGrid}>
          {(data.badges || []).map(badge => (
            <div key={badge.id} className={`${styles.badge} ${!badge.earned ? styles.badgeLocked : ''}`}>
              <StampArt stamp={badge} size={52} locked={!badge.earned} />
              <div>
                <strong>{badge.title}</strong>
                <p><LocalizedText>{badge.description}</LocalizedText></p>
                <span className={styles.badgeState}>
                  <LocalizedText>{badge.earned ? 'Earned' : `${badge.progress} / ${badge.target} completed`}</LocalizedText>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedStamp&&<StampMemory stamp={selectedStamp} onClose={()=>setSelectedStamp(null)} onPhotoRemoved={()=>setSelectedStamp(previous=>({...previous,evidence_available:false}))}/>}
    </PassportShell>
  );
}
