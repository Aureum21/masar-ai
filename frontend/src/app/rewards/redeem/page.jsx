'use client';
import {useRef,useState} from 'react';
import Image from 'next/image';
import {Coins,Ticket,Gift,ArrowRight,Clock,CheckCircle2,X,ShoppingBag,MapPin} from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {useAuth} from '@/context/AuthContext';
import {PassportShell,ResourceState} from '@/app/profile/_components/PassportUI';
import {passportRequest,notifyPassportChanged,usePassportResource,passportDate} from '@/app/profile/_lib/passportApi';
import {useDialogFocus} from '@/hooks/useDialogFocus';
import {openDailyPromotion} from '@/components/daily-promotions/DailyPromotionHost';
import {LocalizedText} from '@/i18n/Localized';
import styles from '../rewards.module.css';

export default function RedeemPage(){return <ProtectedRoute><RedeemContent/></ProtectedRoute>;}

export function RedeemContent(){
  const {token}=useAuth();
  const resource=usePassportResource('/coin-rewards');
  const [filter,setFilter]=useState('all'),[selected,setSelected]=useState(null),[busy,setBusy]=useState('');
  const [message,setMessage]=useState(''),[error,setError]=useState('');
  const requestKey=useRef(''),pending=useRef(false);
  const data=resource.data;
  const balance=data?.balance??0;
  const records=data?.redemptions||[];
  const earned=data?.earned_coins??0;
  function choose(offer){requestKey.current=crypto.randomUUID();setSelected(offer);setError('');setMessage('');}
  async function confirm(){
    if(!selected||pending.current)return;
    pending.current=true;setBusy(selected.id);setError('');
    try{
      const result=await passportRequest(token,`/coin-rewards/${selected.id}/redeem`,{method:'POST',body:{idempotency_key:requestKey.current,expected_coins:selected.coins_cost}});
      setMessage(`Demo reward added to your wallet. ${result.redemption.coins_cost} demo coins spent; ${result.balance} remain. Your earned Daily Challenge Coins are unchanged.`);
      setSelected(null);notifyPassportChanged();
    }catch(e){setError(e.message);notifyPassportChanged();}
    finally{pending.current=false;setBusy('');}
  }
  async function markDemoUsed(record){
    if(pending.current)return;
    pending.current=true;setBusy(record.id);setError('');setMessage('');
    try{
      await passportRequest(token,`/coin-redemptions/${record.id}/demo-use`,{method:'POST'});
      setMessage('Demo visit completed. Your sample reward is now marked as used.');notifyPassportChanged();
    }catch(e){setError(e.message);}
    finally{pending.current=false;setBusy('');}
  }
  return <PassportShell contentClassName={styles.page} title="Make your next discovery." subtitle="Try attraction tickets and UAE mall gift cards with a separate demo coin wallet.">
    {!data?<ResourceState resource={resource}/>:<>
      <section className={styles.hero} aria-label="Your coin wallet">
        <div><span className={styles.eyebrow}><Coins size={13}/><LocalizedText message="YOUR DEMO REWARD WALLET"/></span><h2><LocalizedText message="Good days lead to new places."/></h2><p><LocalizedText message="Start with 200 demo coins. Choose a sample reward and try the full redemption experience. Your earned coins, Passport XP and stamps stay untouched."/></p></div>
        <div className={styles.balance}><Coins size={28}/><strong>{balance}</strong><span><LocalizedText message="demo coins available"/></span><small>{earned} <LocalizedText message="earned daily coins · kept separate"/></small></div>
      </section>
      <div className={styles.explainer}><Clock size={18}/><p><LocalizedText message="Demonstration only. Sample tickets and gift cards are issued instantly here for testing. They have no cash value and cannot be used at attractions or shops."/></p></div>
      {resource.error&&<ResourceState resource={resource}/>}
      {message&&<p className={styles.success} role="status"><CheckCircle2 size={17}/><LocalizedText>{message}</LocalizedText></p>}
      {error&&!selected&&<p className={styles.error} role="alert">{error}</p>}
      <div className={styles.sectionHeading}><div><span className={styles.eyebrow}><LocalizedText message="COLLECT MOMENTS, THEN CHOOSE YOUR NEXT"/></span><h2><LocalizedText message="A little more to look forward to."/></h2></div><button type="button" className={styles.quiet} onClick={openDailyPromotion}><LocalizedText message="Play daily challenge"/><ArrowRight size={15}/></button></div>
      <div className={styles.filters} aria-label="Reward categories">{[['all','All rewards'],['ticket','Attraction tickets'],['gift_card','Mall gift cards']].map(([id,label])=><button type="button" key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}><LocalizedText>{label}</LocalizedText></button>)}</div>
      <div className={styles.grid}>{data.offers.filter(offer=>filter==='all'||offer.kind===filter).map(offer=><OfferCard key={offer.id} offer={offer} balance={balance} busy={Boolean(busy)||Boolean(resource.error)} onChoose={()=>choose(offer)}/>)}</div>
      <section className={styles.history} aria-labelledby="redemption-history"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}><LocalizedText message="YOUR NEXT EXPERIENCES"/></span><h2 id="redemption-history"><LocalizedText message="Your demo reward wallet"/></h2></div></div>
        {!records.length?<div className={styles.empty}><Ticket size={26}/><h3><LocalizedText message="Your next experience starts here."/></h3><p><LocalizedText message="Redeem demo coins to collect sample tickets and gift cards here."/></p></div>:<div className={styles.requests}>{records.map(record=><article key={record.id} className={styles.request}>
          <div className={styles.requestTop}><div><span className={styles.eyebrow}><LocalizedText>{record.offer.kind==='ticket'?'ATTRACTION TICKET':'MALL GIFT CARD'}</LocalizedText></span><h3>{record.offer.title}</h3><p>{record.coins_cost} <LocalizedText message="demo coins"/> · {passportDate(record.created_at)} · <LocalizedText>{record.offer.value_label}</LocalizedText></p></div><span className={styles.state} data-state={record.state}><LocalizedText>{record.state==='issued'?'Demo pass · available':'Demo pass · used'}</LocalizedText></span></div>
          <p className={styles.feedback}><LocalizedText message="DEMO ONLY · Not valid for entry or purchases."/></p><small className={styles.reference}><LocalizedText message="Wallet reference"/>: {record.id}</small>
          {record.state==='issued'&&<button className={styles.quiet} disabled={Boolean(busy)} type="button" onClick={()=>markDemoUsed(record)}><LocalizedText>{busy===record.id?'Saving…':'Simulate using this reward'}</LocalizedText></button>}
          <div className={styles.delivery}><div><span><LocalizedText message="Demo code · no merchant acceptance"/></span><code>{record.code}</code></div><Ticket size={28}/></div>
        </article>)}</div>}
      </section>
    </>}
    {selected&&<Confirmation offer={selected} balance={balance} busy={Boolean(busy)} error={error} onConfirm={confirm} onClose={()=>{if(!pending.current)setSelected(null);}}/>}
  </PassportShell>;
}

function OfferCard({offer,balance,busy,onChoose}){
  const missing=Math.max(0,offer.coins_cost-balance);
  return <article className={styles.card}>
    <div className={`${styles.art} ${!offer.image?styles.giftArt:''}`}>{offer.image?<Image src={offer.image} alt={offer.title} width={700} height={420} sizes="(max-width:700px) 100vw, 50vw"/>:<>{offer.kind==='ticket'?<Ticket size={60}/>:<ShoppingBag size={52}/>}<span>MASAR <b>{offer.kind==='ticket'?'DEMO EXPERIENCE PASS':'DEMO GIFT COLLECTION'}</b></span></>}<span className={styles.kind}>{offer.kind==='ticket'?<Ticket size={13}/>:<Gift size={13}/>}<LocalizedText>{offer.kind==='ticket'?'Attraction ticket':'Mall gift card'}</LocalizedText></span></div>
    <div className={styles.cardBody}><p className={styles.location}><MapPin size={12}/>{offer.location}</p><h3>{offer.title}</h3><span className={styles.value}><LocalizedText>{offer.value_label}</LocalizedText></span><p>{offer.description}</p><details className={styles.terms}><summary><LocalizedText message="Demo details & conditions"/></summary><p>{offer.terms}</p></details><div className={styles.cardFoot}><span><Coins size={16}/><strong>{offer.coins_cost}</strong><LocalizedText message="demo coins"/></span><button type="button" className={styles.primary} disabled={busy||missing>0||!offer.available} onClick={onChoose}><LocalizedText>{!offer.available?'Temporarily paused':missing>0?`${missing} more demo coins needed`:'Redeem demo coins'}</LocalizedText>{!missing&&<ArrowRight size={14}/>}</button></div></div>
  </article>;
}

function Confirmation({offer,balance,busy,error,onConfirm,onClose}){
  const ref=useRef(null);useDialogFocus(ref,true,onClose);
  return <div className={styles.overlay} onClick={onClose}><section className={styles.confirm} role="dialog" aria-modal="true" aria-labelledby="reward-confirm-title" tabIndex={-1} ref={ref} onClick={e=>e.stopPropagation()}><button type="button" className={styles.close} disabled={busy} aria-label="Close reward confirmation" onClick={onClose}><X size={19}/></button><span className={styles.eyebrow}><LocalizedText message="YOUR NEXT DISCOVERY"/></span><h2 id="reward-confirm-title"><LocalizedText message="Make it yours."/></h2><h3>{offer.title}</h3><p>{offer.value_label}</p><dl className={styles.costSummary}><div><dt><LocalizedText message="Demo coins to spend"/></dt><dd>{offer.coins_cost}</dd></div><div><dt><LocalizedText message="Demo balance after redemption"/></dt><dd>{balance-offer.coins_cost}</dd></div></dl><p><LocalizedText message="This spends demo coins and creates a sample pass in your wallet. It cannot be used for admission or purchases. Earned Daily Challenge Coins are not spent."/></p><small>{offer.terms}</small>{error&&<p className={styles.error} role="alert">{error}</p>}<div className={styles.confirmActions}><button type="button" className={styles.secondary} disabled={busy} onClick={onClose}><LocalizedText message="Keep exploring"/></button><button type="button" className={styles.primary} disabled={busy||balance<offer.coins_cost} onClick={onConfirm}><LocalizedText>{busy?'Creating your demo pass…':`Confirm · ${offer.coins_cost} demo coins`}</LocalizedText></button></div></section></div>;
}
