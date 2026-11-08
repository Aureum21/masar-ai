'use client';

import {useI18n} from '@/i18n/LocaleProvider';

import {formattingLocale} from '@/i18n/messages.mjs';

import {Localized,LocalizedText} from '@/i18n/Localized';

import {useState} from 'react';

import {Eye,Trash2,Pencil,Loader2,Check,RefreshCw,MapPin,X} from 'lucide-react';

import {convertCurrency} from '@/utils/currency.mjs';

import {request,jsonBody,ACTIVE_STATES} from './receiptApi';

import styles from './receiptWorkspace.module.css';

const names={uploading:'Saving image',queued:'Waiting for analysis',running:'Reading your receipt',failed:'Analysis needs attention',ready:'Details available',needs_review:'Analysis needs attention'};

const statusName={eligible:'Possible refund',excluded:'Excluded',below_minimum:'Below minimum',needs_review:'Needs review'};

export default function ReceiptCard({receipt,token,trips,onRefresh,onDelete,onView,selected,onSelect,currency='AED',onUpdateDemo,isFirst=false}){

  const {locale:uiLocale}=useI18n();

  const [editing,setEditing]=useState(false);

  const [showBreakdown,setShowBreakdown]=useState(false);

  const [form,setForm]=useState({});

  const [saving,setSaving]=useState(false);

  const [error,setError]=useState('');

  const busy=ACTIVE_STATES.has(receipt.state);

  const openEdit=()=>{

    setForm({

      purchase_date: receipt.purchase_date ?? '',

      total_amount: receipt.total_amount != null ? String(receipt.total_amount) : '',

      vat_amount: receipt.vat_amount != null ? String(receipt.vat_amount) : '',

      merchant_name: receipt.merchant_name ?? '',

      currency: receipt.currency || 'AED'

    });

    setError('');

    setEditing(prev => !prev);

  };

  const currentTotal = parseFloat(form.total_amount || 0);

  const currentVat = parseFloat(form.vat_amount || 0);

  let liveRefund = 0;

  if (!isNaN(currentTotal) && currentTotal >= 250 && !isNaN(currentVat) && currentVat > 0) {

    liveRefund = Math.max(0, currentVat * 0.87 - 3.60);

  }

  const handleTotalChange = (val) => {

    const num = parseFloat(val);

    const nextForm = { ...form, total_amount: val };

    if (!isNaN(num) && num > 0) {

      // Auto-compute 5% standard UAE VAT

      const computedVat = (num * 5 / 105).toFixed(2);

      nextForm.vat_amount = computedVat;

    }

    setForm(nextForm);

  };

  const handleVatChange = (val) => {

    setForm(prev => ({ ...prev, vat_amount: val }));

  };

  const save = async (event) => {

    event.preventDefault();

    setSaving(true);

    setError('');

    const numTotal = form.total_amount ? parseFloat(form.total_amount) : null;

    const numVat = form.vat_amount ? parseFloat(form.vat_amount) : null;

    const computedRefund = (numTotal && numTotal >= 250 && numVat && numVat > 0)

      ? Math.max(0, numVat * 0.87 - 3.60).toFixed(2)

      : '0.00';

    if (receipt.is_demo) {

      if (onUpdateDemo) {

        onUpdateDemo({

          id: receipt.id,

          purchase_date: form.purchase_date || null,

          total_amount: numTotal != null ? numTotal.toFixed(2) : null,

          vat_amount: numVat != null ? numVat.toFixed(2) : null,

          estimated_refund: computedRefund,

          merchant_name: form.merchant_name || receipt.merchant_name

        });

      }

      setSaving(false);

      setEditing(false);

      return;

    }

    try {

      await request(token, `/${receipt.id}`, {

        method: 'PATCH',

        ...jsonBody({

          purchase_date: form.purchase_date || null,

          total_amount: numTotal != null ? numTotal.toFixed(2) : null,

          vat_amount: numVat != null ? numVat.toFixed(2) : null,

          merchant_name: form.merchant_name || receipt.merchant_name,

          expected_revision: receipt.revision

        })

      });

      setEditing(false);

      await onRefresh();

    } catch(err) {

      setError(err.message);

      if (err.status === 409) await onRefresh();

    } finally {

      setSaving(false);

    }

  };

  const retry=async()=>{

    setSaving(true);setError('');

    try{await request(token,`/${receipt.id}/retry`,{method:'POST',...jsonBody({expected_revision:receipt.revision})});await onRefresh();}catch(err){setError(err.message);}finally{setSaving(false);}

  };

  const formatAmount=(val)=>{

    if(val==null||val==='')return '—';

    const num=parseFloat(val);

    if(isNaN(num))return '—';

    const converted=convertCurrency(num,currency);

    const formattedNum=(converted??0).toLocaleString(formattingLocale(uiLocale,undefined),{minimumFractionDigits:2,maximumFractionDigits:2});

    return `${currency==='AED'?'':'≈ '}${currency} ${formattedNum}`;

  };

  // Parse store and location from merchant name (e.g. "Apple Store — The Dubai Mall")

  const rawMerchant=receipt.merchant_name||receipt.file_name||'Receipt awaiting details';

  let storeName=rawMerchant;

  let locationName='';

  if(rawMerchant.includes(' — ')){

    const parts=rawMerchant.split(' — ');

    storeName=parts[0].trim();

    locationName=parts[1].trim();

  }else if(rawMerchant.includes(' - ')){

    const parts=rawMerchant.split(' - ');

    storeName=parts[0].trim();

    locationName=parts[1].trim();

  }

  // Format the bottom explanation with currency conversion

  let rawReason=receipt.feedback||receipt.reason||'Check all extracted details before relying on them.';

  let formattedReason=rawReason;

  if(currency!=='AED'&&rawReason.includes('AED 3.60')){

    const feeConverted=convertCurrency(3.60,currency);

    if(feeConverted!=null){

      formattedReason=rawReason.replace('AED 3.60',`${currency} ${feeConverted.toFixed(2)} (AED 3.60)`);

    }

  }

  const isEligible=receipt.status==='eligible'||(receipt.estimated_refund!=null&&parseFloat(receipt.estimated_refund)>0);

  return <article className={`${styles.receiptCard} ${selected?styles.selected:''}`}>

    <div className={styles.cardTopClean}>

      <div className={styles.storeInfo}>

        <span className={styles.eyebrow}><LocalizedText>{receipt.is_demo?'SAMPLE · NOT YOUR SPENDING':(receipt.state==='failed'||receipt.state==='needs_review'||receipt.status==='needs_review'?'Analysis needs attention':names[receipt.state]||'Saved receipt')}</LocalizedText></span>

        <h3 className={styles.storeTitle} title={storeName}><LocalizedText>{storeName}</LocalizedText></h3>

        {locationName&&<p className={styles.locationLine}><MapPin size={12}/><LocalizedText>{locationName}</LocalizedText></p>}

        <p className={styles.dateLine}><LocalizedText>{receipt.purchase_date||'Date not confirmed'}</LocalizedText><LocalizedText>{receipt.trip_id?' · Linked to a trip':''}</LocalizedText></p>

      </div>

      <div className={styles.cardTopActions}>

        <button type="button" className={`${styles.eyeBtn} ${editing?styles.activeBtn:''}`} title={editing?"Close editing":"Edit receipt details"} aria-label={`Edit ${storeName}`} onClick={openEdit}>

          <Pencil size={15}/>

        </button>

        <button type="button" className={styles.eyeBtn} title="View receipt image" aria-label={`View receipt for ${storeName}`} onClick={()=>onView(receipt)}>

          <Eye size={17}/>

        </button>

        <button type="button" className={`${styles.eyeBtn} ${styles.deleteBtn}`} title="Delete receipt" aria-label={`Delete ${storeName}`} onClick={()=>onDelete(receipt.id)}>

          <Trash2 size={15}/>

        </button>

        {onSelect&&<label className={styles.selectReceipt}><input type="checkbox" checked={selected} onChange={onSelect}/><LocalizedText message={" Print"} /></label>}

      </div>

    </div>

    <div className={styles.tagRow}>

      {isEligible ? (

        <span className={styles.possibleRefundTag}>

          <Check size={12} strokeWidth={2.5}/> <LocalizedText message={"possible refund"} />

        </span>

      ) : (

        <span className={receipt.status==='excluded'?styles.excludedTag:styles.attentionTag}>

          <LocalizedText>{statusName[receipt.status]||'Needs review'}</LocalizedText>

        </span>

      )}

    </div>

    <div className={styles.amounts}>

      <div>

        <small><LocalizedText message={"Printed total"} /></small>

        <strong><LocalizedText>{receipt.total_amount!=null?formatAmount(receipt.total_amount):'Not yet read'}</LocalizedText></strong>

      </div>

      <div>

        <small><LocalizedText message={"Recorded VAT"} /></small>

        <strong><LocalizedText>{receipt.vat_amount!=null?formatAmount(receipt.vat_amount):'Not confirmed'}</LocalizedText></strong>

      </div>

      <div>

        <small><LocalizedText message={"Possible refund"} /></small>

        <strong className={isEligible?styles.gold:''}>

          <LocalizedText>{isEligible?formatAmount(receipt.estimated_refund):(receipt.status==='excluded'?'Excluded':receipt.status==='below_minimum'?'Below min':'Needs review')}</LocalizedText>

        </strong>

      </div>

    </div>

    {editing&&<form onSubmit={save} className={styles.editFormClean}>

      <div className={styles.editFieldsGrid}>

        <label>

          <span><LocalizedText message={"Purchase date"} /></span>

          <input

            type="date"

            value={form.purchase_date ?? ''}

            onChange={e => setForm(prev => ({ ...prev, purchase_date: e.target.value }))}

          />

        </label>

        <label>

          <span><LocalizedText message={"Total amount (AED)"} /></span>

          <input

            type="number"

            step="0.01"

            min="0"

            value={form.total_amount ?? ''}

            onChange={e => handleTotalChange(e.target.value)}

            placeholder="0.00"

          />

        </label>

        <label>

          <span><LocalizedText message={"Recorded VAT (AED)"} /></span>

          <input

            type="number"

            step="0.01"

            min="0"

            value={form.vat_amount ?? ''}

            onChange={e => handleVatChange(e.target.value)}

            placeholder="0.00"

          />

        </label>

        <label>

          <span><LocalizedText message={"Store name"} /></span>

          <input

            type="text"

            value={form.merchant_name ?? ''}

            onChange={e => setForm(prev => ({ ...prev, merchant_name: e.target.value }))}

            placeholder="Store name"

          />

        </label>

      </div>

      <div className={styles.calcPreviewBox}>

        <span><LocalizedText message={"Possible refund (auto-calculated)"} /></span>

        <strong className={styles.gold}>AED {liveRefund.toFixed(2)}</strong>

      </div>

      <div className={styles.editFormActions}>

        <button type="submit" className={styles.primary} disabled={saving}>

          <Check size={16}/>

          <LocalizedText>{saving ? 'Saving…' : 'Save corrections'}</LocalizedText>

        </button>

        <button type="button" className={styles.secondary} onClick={()=>setEditing(false)}>

          <X size={15}/>

          <LocalizedText message={"Cancel"} />

        </button>

      </div>

    </form>}

    {error&&<p role="alert" className={styles.error}><LocalizedText>{error}</LocalizedText></p>}

    {!receipt.is_demo&&receipt.corrections?.length>0&&<details className={styles.provenance}><summary><LocalizedText preserveValues={[true]} message={"Correction history · ⟦0⟧ saved changes"} values={[receipt.corrections.length]} /></summary>{receipt.corrections.map((change,index)=><p key={index}>{new Date(change.at).toLocaleString(formattingLocale(uiLocale))} · {Object.keys(change.fields).join(', ')}</p>)}</details>}

    {(receipt.is_demo || isFirst) && (
      <div className={styles.cardFooter}>
        {receipt.is_demo ? (
          <p className={styles.fine} style={{margin:0}}>
            <LocalizedText message={"Synthetic example. Excluded from real summaries and exports."} />
          </p>
        ) : (
          <div style={{flex:1}} />
        )}
        {isFirst && (
          <button
            type="button"
            className={`${styles.questionBtn} ${showBreakdown?styles.questionBtnActive:''}`}
            onClick={()=>setShowBreakdown(prev=>!prev)}
            aria-expanded={showBreakdown}
            title="Refund estimate breakdown"
            aria-label="Refund estimate breakdown"
          >
            ?
          </button>
        )}
      </div>
    )}

    {isFirst && showBreakdown && (
      <div className={`${styles.assessment} ${busy?styles.processing:''}`} style={{marginTop:'12px'}} role={busy?'status':undefined}>
        {busy&&<Loader2 size={16} className={styles.spin}/>}
        <div>
          <strong style={{display:'block',marginBottom:'4px'}}><LocalizedText>{busy?names[receipt.state]:(isEligible?'Possible refund estimate':statusName[receipt.status]||'Needs review')}</LocalizedText></strong>
          <p style={{margin:0}}><LocalizedText>{formattedReason}</LocalizedText></p>
          {busy&&<small><LocalizedText message={"You can leave and return. The receipt worker picks up saved jobs automatically."} /></small>}
        </div>
      </div>
    )}
  </article>;

}

