'use client';
import {useI18n} from '@/i18n/LocaleProvider';
import {formattingLocale} from '@/i18n/messages.mjs';

import {Localized,LocalizedText} from '@/i18n/Localized';

import {useState,useEffect,useRef,useCallback,useSyncExternalStore,useMemo} from 'react';
import Link from 'next/link';
import {Camera,Upload,ReceiptText,ArrowRight,LockKeyhole,Printer,MapPin,X,Info,Check,Eye} from 'lucide-react';
import JourneyShell from '@/components/layout/JourneyShell';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {useAuth} from '@/context/AuthContext';
import {convertCurrency,RATES} from '@/utils/currency.mjs';
import samples from '@/data/sampleReceipts.json';
import ReceiptCamera from './ReceiptCamera';
import ReceiptCard from './ReceiptCard';
import ReceiptDocument from './ReceiptDocument';
import useReceipts from './useReceipts';
import {validateReceiptSelection} from './receiptFiles.mjs';
import {eligibleForPrint,receiptPrintHtml} from './receiptPrint.mjs';
import {isReceiptScannedOrEdited} from './receiptFilter.mjs';
import {INTRO_VERSION,request,privateImage} from './receiptApi';
import styles from './receiptWorkspace.module.css';

// Tooltip component displaying long reasons in an info icon with a transparent blurred backdrop
function ReasonTooltip({ reason }) {
  const [open, setOpen] = useState(false);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div
      ref={tooltipRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
    >
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#F59E0B',
          cursor: 'pointer',
          padding: 0,
          transition: 'all 0.2s ease',
          outline: 'none'
        }}
        aria-label="View reason"
        title="View reason"
      >
        <Info size={12} />
      </button>

      {open && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 10px)',
            right: 0,
            zIndex: 1000,
            width: '280px',
            maxWidth: 'calc(100vw - 32px)',
            padding: '12px 14px',
            borderRadius: '12px',
            background: 'rgba(15, 18, 24, 0.94)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.75)',
            color: '#E2E8F0',
            fontSize: '11px',
            lineHeight: 1.55,
            textAlign: 'left',
            pointerEvents: 'auto'
          }}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <Info size={14} style={{ color: '#F59E0B', flexShrink: 0, marginTop: '2px' }} />
            <span>{reason}</span>
          </div>
          <div style={{
            position: 'absolute',
            top: '100%',
            right: '8px',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid rgba(15, 18, 24, 0.88)'
          }} />
        </div>
      )}
    </div>
  );
}

const subscribeQuery=(callback)=>{window.addEventListener('popstate',callback);return ()=>window.removeEventListener('popstate',callback);};

function ReceiptWorkspace({mode}){
  const {locale:uiLocale, t}=useI18n();

  const {user,token}=useAuth();
  const queryTrip=useSyncExternalStore(subscribeQuery,()=>new URLSearchParams(window.location.search).get('trip_id')||'',()=> '');
  const [chosenTrip]=useState(null);const tripId=chosenTrip??queryTrip;
  const data=useReceipts(token,tripId);

  const [tab,setTab]=useState('mine'),[files,setFiles]=useState([]),[camera,setCamera]=useState(false),[photo,setPhoto]=useState(null);
  const [demoReceipts,setDemoReceipts]=useState(samples);
  const [error,setError]=useState(''),[ack,setAck]=useState(false),[help,setHelp]=useState(false),[currency,setCurrency]=useState('AED');
  const [selected,setSelected]=useState(new Set()),[printing,setPrinting]=useState(false),[showAll,setShowAll]=useState(false);
  const [storeFilter,setStoreFilter]=useState('');

  const input=useRef(null),urls=useRef(new Set()),active=useRef(new Set()),mounted=useRef(true),helpRef=useRef(null);

  useEffect(()=>{
    if(!help)return;
    const outside=(e)=>{if(helpRef.current&&!helpRef.current.contains(e.target))setHelp(false);};
    document.addEventListener('mousedown',outside);
    return ()=>document.removeEventListener('mousedown',outside);
  },[help]);

  useEffect(()=>{
    mounted.current=true;const allocated=urls.current;
    return ()=>{mounted.current=false;allocated.forEach(url=>URL.revokeObjectURL(url));allocated.clear();};
  },[]);

  const addFiles=useCallback((incoming)=>{
    const images=Array.from(incoming).filter(file=>['image/jpeg','image/png','image/webp'].includes(file.type));
    const result=validateReceiptSelection(images,files.map(item=>item.file));
    const additions=result.accepted.map(file=>{const url=URL.createObjectURL(file);urls.current.add(url);return {file,url,key:crypto.randomUUID(),busy:false,error:''};});
    setFiles(previous=>[...previous,...additions]);
    setError([...result.errors,...(images.length!==incoming.length?['PDF and multi-page OCR are not supported yet. Choose receipt images.']:[])].join(' '));
  },[files]);

  const accept=()=>setAck(true);
  const acknowledged=ack;
  const discard=(item)=>{if(active.current.has(item.key))return;URL.revokeObjectURL(item.url);urls.current.delete(item.url);setFiles(previous=>previous.filter(row=>row.key!==item.key));};

  const upload=async(item,manual=false)=>{
    if(!acknowledged||active.current.has(item.key))return;
    active.current.add(item.key);setFiles(previous=>previous.map(row=>row.key===item.key?{...row,busy:true,error:''}:row));
    const body=new FormData();body.append('file',item.file);body.append('acknowledged_version',INTRO_VERSION);body.append('save_unrecognized',String(manual));if(tripId)body.append('trip_id',tripId);
    try{
      await request(token,'/process',{method:'POST',headers:{'Idempotency-Key':item.key},body});
      if(mounted.current){URL.revokeObjectURL(item.url);urls.current.delete(item.url);setFiles(previous=>previous.filter(row=>row.key!==item.key));await data.refresh();}
    }catch(err){if(mounted.current){setFiles(previous=>previous.map(row=>row.key===item.key?{...row,busy:false,error:err.message}:row));await data.refresh();}}
    finally{active.current.delete(item.key);}
  };

  const toggle=(id)=>{setError("");setSelected(previous=>{const next=new Set(previous);if(next.has(id))next.delete(id);else next.add(id);return next;});};
  const money=(value)=>{const converted=convertCurrency(value??0,currency);return `${currency==='AED'?'':'≈ '}${currency} ${(converted??0).toLocaleString(formattingLocale(uiLocale, undefined),{minimumFractionDigits:2,maximumFractionDigits:2})}`;};

  const sampleSummary=useMemo(()=>{
    let spend=0,refund=0,eligible=0,attention=0;
    for(const s of demoReceipts){
      spend+=parseFloat(s.total_amount)||0;
      const ref=parseFloat(s.estimated_refund)||0;
      if(s.status==='eligible'||(ref>0)){refund+=ref;eligible+=1;}
      else{attention+=1;}
    }
    return {
      recorded_spend_aed:String(spend.toFixed(2)),
      possible_refund_aed:String(refund.toFixed(2)),
      count:demoReceipts.length,
      eligible_count:eligible,
      review_count:attention,
      processing_count:0
    };
  },[demoReceipts]);

  const filteredUserReceipts = useMemo(() => {
    return (data.rows || []).filter(r => {
      if (!isReceiptScannedOrEdited(r)) return false;
      return true;
    });
  }, [data.rows]);

  const userSummary = useMemo(() => {
    let spend = 0, refund = 0, eligible = 0, attention = 0;
    for (const r of filteredUserReceipts) {
      if (r.currency === 'AED' && r.total_amount != null) {
        spend += parseFloat(r.total_amount) || 0;
      }
      const ref = parseFloat(r.estimated_refund) || 0;
      if (r.status === 'eligible' || (r.state === 'ready' && ref > 0)) {
        refund += ref;
        eligible += 1;
      } else {
        attention += 1;
      }
    }
    return {
      recorded_spend_aed: String(spend.toFixed(2)),
      possible_refund_aed: String(refund.toFixed(2)),
      count: filteredUserReceipts.length,
      eligible_count: eligible,
      review_count: attention,
      processing_count: 0
    };
  }, [filteredUserReceipts]);

  const summary = tab === 'samples' ? sampleSummary : userSummary;
  const visible = useMemo(() => {
    return tab === 'samples' ? demoReceipts.map(row => ({...row, state: 'ready', is_demo: true})) : filteredUserReceipts;
  }, [tab, demoReceipts, filteredUserReceipts]);

  // Extract only store/shop names from currently scanned, sample, or edited receipts
  const availableStores = useMemo(() => {
    const pool = tab === 'samples' ? demoReceipts : filteredUserReceipts;
    const storeSet = new Set();
    for (const r of pool) {
      const name = (r.merchant_name || '').trim();
      if (name && name !== 'Store name not recognized' && name !== 'Retailer') {
        storeSet.add(name);
      }
    }
    return Array.from(storeSet).sort();
  }, [tab, demoReceipts, filteredUserReceipts]);

  // Filter receipts by selected store
  const displayedReceipts = useMemo(() => {
    if (!storeFilter) return visible;
    return visible.filter(r => 
      (r.merchant_name || '').toLowerCase().includes(storeFilter.toLowerCase())
    );
  }, [visible, storeFilter]);

  // Auto-select eligible receipts when entering summary & print mode
  useEffect(() => {
    if (mode === 'summary') {
      const eligibleIds = displayedReceipts.filter(r => r.status === 'eligible').map(r => r.id);
      setSelected(prev => {
        if (prev.size === eligibleIds.length && eligibleIds.every(id => prev.has(id))) {
          return prev;
        }
        return new Set(eligibleIds);
      });
    }
  }, [mode, tab, storeFilter, displayedReceipts]);

  const print=async()=>{
    const allowDemo = tab === "samples" || displayedReceipts.some(r => r.is_demo);
    const rows = eligibleForPrint(displayedReceipts.filter(row=>selected.has(row.id)), allowDemo);
    if(!rows.length||rows.length>15){setError('Select between 1 and 15 eligible receipts with possible estimates to print.');return;}
    const popup=window.open('','_blank','width=1000,height=850');
    if(!popup){setError('Allow pop-ups to print your receipt summary.');return;}
    popup.document.title='Preparing your receipt summary';
    popup.document.body.innerHTML='<div style="font-family:sans-serif;padding:30px;color:#1e293b;font-size:16px;">Preparing your selected receipts for print &amp; PDF export…</div>';
    setPrinting(true);setError('');
    const releases=[];
    try{
      const images={};
      for(const row of rows){
        if(row.is_demo && row.image_url){
          images[row.id]=row.image_url;
        }else{
          const result=await privateImage(token,row);releases.push(result.release);
          const blob=result.blob;
          images[row.id]=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
        }
      }
      if(popup.closed)throw new Error('The print window was closed.');
      popup.document.open();popup.document.write(receiptPrintHtml(rows,images,window.location.origin));popup.document.close();
    }catch(err){popup.close();setError('Could not prepare the summary. '+err.message);}
    finally{releases.forEach(release=>release());setPrinting(false);}
  };

  const handleDelete=useCallback((id)=>{
    if(tab==='samples'){
      setDemoReceipts(prev=>prev.filter(r=>r.id!==id));
    }else{
      data.remove(id);
    }
  },[tab,data]);

  const handleUpdateDemo=useCallback((updated)=>{
    setDemoReceipts(prev=>prev.map(r=>r.id===updated.id?{...r,...updated}:r));
  },[]);

  return <Localized element={JourneyShell} attributes={["title"]} title="Receipt Assistant" headerVariant="workspace" action={<div ref={helpRef} style={{ position: "relative" }}><Localized element="button" attributes={["aria-label", "title"]} type="button" className="journey-icon-btn" onClick={()=>setHelp(prev=>!prev)} aria-expanded={help} aria-label="How it works" title="How it works" style={{ background: "transparent", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}><Info size={18}/></Localized>{help&&<div role="region" aria-label="How it works" style={{ position: "absolute", top: "calc(100% + 12px)", right: 0, zIndex: 1000, width: "360px", maxWidth: "calc(100vw - 32px)", padding: "18px 20px", borderRadius: "16px", background: "rgba(15, 18, 24, 0.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255, 255, 255, 0.12)", boxShadow: "0 20px 45px rgba(0, 0, 0, 0.65)", display: "flex", gap: "14px", alignItems: "flex-start", color: "#cbd5e1", textAlign: "start" }}><Info size={20} style={{ color: "#94a3b8", flexShrink: 0, marginTop: "2px" }} /><div><strong style={{ display: "block", color: "#f1f5f9", fontSize: "13.5px", marginBottom: "8px", fontWeight: 700 }}><LocalizedText message={"Organize your receipts for VAT refunds."} /></strong><p style={{ margin: "0 0 10px 0", color: "#94a3b8", fontSize: "12px", lineHeight: 1.65 }}><LocalizedText message={"MASAR helps you keep all your shopping receipts organized in one place and locate purchases that may qualify for a UAE tourist VAT refund."} /></p><p style={{ margin: "0 0 12px 0", color: "#94a3b8", fontSize: "12px", lineHeight: 1.65 }}><LocalizedText message={"Please note that MASAR does not reimburse or pay out refunds directly. To claim your money back, you will need to validate your tax-free tags with Planet at the airport or departure point before leaving the UAE."} /></p><div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "4px" }}><a href="https://www.planettaxfree.ae/tourists-landing/tourist-home/" target="_blank" rel="noopener noreferrer" style={{ color: "#38bdf8", fontSize: "12px", textDecoration: "underline", display: "inline-flex", alignItems: "center" }}><LocalizedText message={"Planet Tax Free Tourist Portal ↗"} /></a><a href="https://tax.gov.ae/en/taxes/Vat/refunds.aspx" target="_blank" rel="noopener noreferrer" style={{ color: "#38bdf8", fontSize: "12px", textDecoration: "underline", display: "inline-flex", alignItems: "center" }}><LocalizedText message={"UAE Federal Tax Authority ↗"} /></a></div></div></div>}</div>}>
    <div className="journey-scroll"><div className={styles.workspace}>
      <header className={styles.heading}><div><p className={styles.eyebrow}><LocalizedText message={"MASAR / YOUR PURCHASES, ORGANIZED"} /></p><h1><LocalizedText>{mode==='summary'?'A clearer view of your spending.':'Keep the receipt. Enjoy the journey.'}</LocalizedText></h1><p><LocalizedText message={"Private shopping records. Helpful estimates. The official refund process stays with Planet."} /></p></div></header>
      <Localized element={"nav"} attributes={["aria-label"]} className={styles.tabs} aria-label="Receipt pages"><Link aria-current={mode==='collection'?'page':undefined} href="/receipts"><LocalizedText message={"Collection"} /></Link><Link aria-current={mode==='summary'?'page':undefined} href="/receipts/summary"><LocalizedText message={"Summary & print"} /></Link><Link href="/receipts/map"><MapPin size={15}/><LocalizedText message={" Shopping & departure map"} /></Link></Localized>
      <div className={styles.tools}>
        <div className={styles.segmented}>
          <button aria-pressed={tab==='mine'} onClick={()=>{setTab('mine');setStoreFilter('');setError('');}}><LocalizedText message={"My receipts"} /></button>
          <button aria-pressed={tab==='samples'} onClick={()=>{setTab('samples');setStoreFilter('');setError('');}}><LocalizedText message={"Try examples"} /></button>
        </div>
        <div className={styles.toolControl}>
          <label htmlFor="receipt-store-select" className={styles.toolLabel}>
            <LocalizedText message={"Store / Shop"} />
          </label>
          <select id="receipt-store-select" className={styles.tripSelect} value={storeFilter} onChange={event=>setStoreFilter(event.target.value)}>
            <option value="">{t ? t("All stores & shops") : "All stores & shops"}</option>
            {availableStores.map(store => (
              <option key={store} value={store}>{store}</option>
            ))}
          </select>
        </div>
        <div className={styles.toolControl}>
          <label htmlFor="receipt-currency-select" className={styles.toolLabel}>
            <LocalizedText message={"Display currency"} />
          </label>
          <select id="receipt-currency-select" className={styles.currencySelect} value={currency} onChange={event=>setCurrency(event.target.value)}>
            {Object.keys(RATES).map(code=><option key={code}>{code}</option>)}
          </select>
        </div>
      </div>
      {tab==='samples'&&<div className={styles.notice}><Info size={20}/><p><LocalizedText message={"These five synthetic examples are separate from your records. They do not enter real spending, refund totals, exports or rewards."} /></p></div>}
      {mode !== 'summary' && <Localized element={"section"} attributes={["aria-label"]} className={styles.metrics} aria-label="Receipt overview"><div><small><LocalizedText message={"Recorded spending · AED receipts"} /></small><strong>{money(summary?.recorded_spend_aed)}</strong><span><LocalizedText message={tab==='samples'?"⟦0⟧ sample records":"⟦0⟧ private records"} values={[summary?.count||0]} /></span></div><div><small><LocalizedText message={"Possible refund estimate"} /></small><strong className={styles.gold}>{money(summary?.possible_refund_aed)}</strong><span><LocalizedText message={"⟦0⟧ possible estimates · official status unknown"} values={[summary?.eligible_count||0]} /></span></div><div><small><LocalizedText message={"Needs your attention"} /></small><strong>{summary?.review_count||0}</strong></div></Localized>}

      {tab==='mine'&&mode==='collection'&&<section className={styles.uploadPanel}>
        <div><p className={styles.eyebrow}><LocalizedText message={"CAPTURE THE DETAILS"} /></p><h2><LocalizedText message={"A small photo. Everything in one place."} /></h2><p><LocalizedText message={"Choose a clear, single-page receipt image. You decide when it leaves this device."} /></p><label className={styles.consent}><input type="checkbox" checked={acknowledged} onChange={event=>event.target.checked?accept():setAck(false)}/><span><LocalizedText message={"I understand that Analyze sends my image to MASAR and its AI provider. Originals are stored privately; estimates are not official approval. Save without OCR does not send the image to the provider."} /></span></label></div>
        <div className={styles.uploadActions}><button className={styles.primary} onClick={()=>input.current?.click()}><Upload size={18}/><LocalizedText message={" Choose receipt photos"} /></button><button className={styles.secondary} onClick={()=>setCamera(true)}><Camera size={18}/><LocalizedText message={" Open camera"} /></button><small><LocalizedText message={"JPG, PNG or WebP · 10 MB each · up to 20 selected images"} /></small><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={event=>{addFiles(event.target.files);event.target.value='';}}/></div>
      </section>}
      {error&&<p className={styles.error} role="alert"><LocalizedText>{error}</LocalizedText></p>}{data.error&&tab==='mine'&&<div className={styles.error} role="alert">{data.error}<p><LocalizedText message={"If this is a fresh setup, apply the receipt migration and start the receipt worker."} /></p></div>}
      {files.length>0&&tab==='mine'&&<Localized element={"section"} attributes={["aria-label"]} className={styles.previewGrid} aria-label="Unsaved receipt previews">{files.map(item=><article key={item.key} className={styles.preview}><Localized element={"img"} attributes={["alt"]} src={item.url} alt={`Unsaved receipt ${item.file.name}`}/><div><strong>{item.file.name}</strong><small><LocalizedText message={"On this device until you choose an action"} /></small>{item.error&&<p className={styles.error}>{item.error}</p>}<div className={styles.cardActions}><button className={styles.primary} disabled={!acknowledged||item.busy} onClick={()=>upload(item)}><LocalizedText>{item.busy?'Saving privately…':'Analyze & save'}</LocalizedText></button><button className={styles.secondary} disabled={!acknowledged||item.busy} onClick={()=>upload(item,true)}><LocalizedText message={"Save without OCR"} /></button><Localized element={"button"} attributes={["aria-label"]} className={styles.iconButton} disabled={item.busy} aria-label={`Discard ${item.file.name}`} onClick={()=>discard(item)}><X size={16}/></Localized></div></div></article>)}</Localized>}
      
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}><LocalizedText message={"YOUR COLLECTION"} /></p>
          {tab!=='samples'&&<h2><LocalizedText>{mode==='summary'?'Receipt summary & print vouchers':'Your purchases, in perspective'}</LocalizedText></h2>}
          {tab==='samples'&&<h2><LocalizedText>{mode==='summary'?'Sample receipt summary & print vouchers':'Explore the examples'}</LocalizedText></h2>}
        </div>
        {mode==='summary'&&<button className={styles.primary} disabled={!selected.size||printing} onClick={print}><Printer size={17}/><LocalizedText>{printing?'Preparing…':`Print selected (${selected.size})`}</LocalizedText></button>}
      </div>

      {data.loading&&tab==='mine'?<div className={styles.skeleton} role="status"><LocalizedText message={"Opening your private collection…"} /></div>:displayedReceipts.length?<>
        {mode==='summary' ? (
          /* Brief Summary View */
          <div className={styles.summaryContainer}>
            {displayedReceipts.map((receipt) => {
              const isEligible = receipt.status === 'eligible';
              const isChecked = selected.has(receipt.id);
              const reasonText = receipt.feedback
                || (receipt.status === 'excluded' 
                  ? 'Services are excluded from tourist refund' 
                  : receipt.status === 'below_minimum' 
                    ? 'Below AED 250 minimum purchase' 
                    : (receipt.reason || 'Not qualifying for tourist refund'));

              const isReasonLong = reasonText.length > 30;

              return (
                <div
                  key={receipt.id}
                  className={`${styles.summaryCard} ${isChecked ? styles.summaryCardSelected : ''}`}
                >
                  <div className={styles.summaryCardLeft}>
                    {isEligible ? (
                      <input
                        type="checkbox"
                        className={styles.summaryCheckbox}
                        checked={isChecked}
                        onChange={() => toggle(receipt.id)}
                        aria-label={`Select ${receipt.merchant_name} for print`}
                      />
                    ) : (
                      <div style={{ width: 18, height: 18, flexShrink: 0 }} />
                    )}
                    <div className={styles.summaryStoreDate}>
                      <h3 className={styles.summaryStoreName}>{receipt.merchant_name || 'Store name not recorded'}</h3>
                      <p className={styles.summaryDateText}>
                        <span>{receipt.purchase_date || 'Date not recorded'}</span>
                        {receipt.category && (
                          <span style={{ margin: '0 6px', color: '#64748B' }}>•</span>
                        )}
                        <span style={{ textTransform: 'capitalize' }}>{receipt.category}</span>
                      </p>
                    </div>
                  </div>

                  <div className={styles.summaryCardRight}>
                    <div className={styles.summaryAmountBox}>
                      <span className={styles.summaryPaidVal}>{money(receipt.total_amount)}</span>
                      <span className={styles.summaryPaidLbl}>
                        <LocalizedText message="Paid" />
                      </span>
                    </div>

                    <div className={styles.summaryBadgeCol}>
                      {isEligible ? (
                        <span className={styles.possibleRefundTag}>
                          <Check size={13} strokeWidth={2.5} />
                          <LocalizedText message="Possible refund" />: {money(receipt.estimated_refund)}
                        </span>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className={styles.excludedTag}>
                              <X size={13} strokeWidth={2.5} />
                              <LocalizedText message="Not eligible for refund" />
                            </span>
                            {isReasonLong && <ReasonTooltip reason={reasonText} />}
                          </div>
                          {!isReasonLong && (
                            <span className={styles.summaryReason}>
                              {reasonText}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {receipt.image_url && (
                      <button
                        type="button"
                        className={styles.eyeBtn}
                        onClick={() => setPhoto(receipt)}
                        title="View receipt image"
                        aria-label="View receipt image"
                      >
                        <Eye size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Collection 3-column Card Grid */
          <>
            <div className={styles.cardList}>
              {(showAll?displayedReceipts:displayedReceipts.slice(0,3)).map((receipt,index)=><ReceiptCard key={receipt.id} isFirst={index===0} receipt={receipt} currency={currency} token={token} trips={[]} onRefresh={data.refresh} onDelete={handleDelete} onUpdateDemo={handleUpdateDemo} onView={setPhoto} selected={selected.has(receipt.id)} onSelect={undefined}/>)}
            </div>
            {displayedReceipts.length>3&&<div className={styles.showMoreContainer}>
              <button type="button" className={`${styles.secondary} ${styles.showMoreBtn}`} onClick={()=>setShowAll(prev=>!prev)}>
                <LocalizedText>{showAll?'Show less':'Show more'}</LocalizedText>
              </button>
            </div>}
          </>
        )}
      </>:<section className={styles.empty}><ReceiptText size={32}/><h2><LocalizedText message={"Your collection starts with a receipt."} /></h2><p><LocalizedText message={"Add a photo to get started, or find tax-free shopping locations and airport kiosks."} /></p>{tab==='mine'?<Link className={styles.secondary} href="/receipts/map"><MapPin size={15}/><LocalizedText message={"Explore shops and kiosks"} /><ArrowRight size={15}/></Link>:<button className={styles.secondary} onClick={()=>setTab('mine')}><LocalizedText message={"Back to my receipts"} /></button>}</section>}
      {data.cursor&&tab==='mine'&&<button className={styles.secondary} onClick={data.more}><LocalizedText message={"Load more receipts"} /></button>}
      {visible.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '32px 0 16px' }}>
          <Link
            className={styles.primary}
            href="/receipts/map"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            <MapPin size={16} />
            <LocalizedText message="Explore shops and kiosks" />
            <ArrowRight size={15} />
          </Link>
        </div>
      )}
      <footer className={styles.footer}><LockKeyhole size={15}/><p><LocalizedText message={"Private originals · provisional estimates · no official submission or payout. Card, cash and digital-wallet options depend on Planet’s current terms."} /></p><a href="https://tax.gov.ae/en/taxes/Vat/refunds.aspx" target="_blank" rel="noopener noreferrer"><LocalizedText message={"UAE Federal Tax Authority (FTA) ↗"} /></a></footer>
      {camera&&<ReceiptCamera onClose={()=>setCamera(false)} onUpload={()=>{setCamera(false);input.current?.click();}} onCapture={file=>{addFiles([file]);setCamera(false);}}/>}
      {photo&&<ReceiptDocument receipt={photo} onClose={()=>setPhoto(null)}/>}
    </div></div>
  </Localized>;
}

export default function ReceiptAssistant({mode='collection'}){const {user}=useAuth();return <ProtectedRoute><ReceiptWorkspace key={`${user?.id}:${mode}`} mode={mode}/></ProtectedRoute>;}
