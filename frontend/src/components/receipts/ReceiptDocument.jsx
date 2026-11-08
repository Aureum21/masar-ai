'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';

import {useState,useRef,useEffect} from 'react';
import {X,LockKeyhole} from 'lucide-react';
import {useAuth} from '@/context/AuthContext';
import {privateImage} from './receiptApi';
import styles from './receiptWorkspace.module.css';

export default function ReceiptDocument({receipt,onClose}){
  const {token}=useAuth();
  const dialog=useRef(null);
  const [image,setImage]=useState(null),[error,setError]=useState('');

  useEffect(()=>{
    const previousFocus=document.activeElement;
    if (dialog.current && !dialog.current.open) {
      dialog.current.showModal();
    }
    const controller=new AbortController();
    let release=()=>{};
    privateImage(token,receipt,controller.signal).then(result=>{
      release=result.release;
      if(controller.signal.aborted)release();
      else setImage(result.url);
    }).catch(err=>{
      if(!controller.signal.aborted)setError(err.message);
    });
    return ()=>{
      controller.abort();
      release();
      previousFocus?.focus?.();
    };
  },[token,receipt]);

  const handleBackdropClick=(e)=>{
    if(e.target===dialog.current)onClose();
  };

  return <dialog ref={dialog} className={styles.photoDialog} aria-labelledby="receipt-photo-title" onCancel={onClose} onClick={handleBackdropClick}>
    <header>
      <div>
        <p className={styles.eyebrow}><LockKeyhole size={12}/> <LocalizedText>{receipt.is_demo?'SYNTHETIC SAMPLE':'YOUR PRIVATE RECEIPT'}</LocalizedText></p>
        <h2 id="receipt-photo-title"><LocalizedText>{receipt.merchant_name||'Original receipt'}</LocalizedText></h2>
      </div>
      <Localized element={"button"} attributes={["aria-label"]} aria-label="Close receipt image" onClick={onClose}>
        <X size={20}/>
      </Localized>
    </header>
    {error ? (
      <p role="alert" className={styles.error}><LocalizedText>{error}</LocalizedText></p>
    ) : image ? (
      <Localized element={"img"} attributes={["alt"]} src={image} alt={receipt.merchant_name||'Original receipt'}/>
    ) : (
      <p role="status" style={{textAlign:'center',padding:'40px 0',color:'#94a3b8'}}><LocalizedText message={"Opening your private image…"} /></p>
    )}
  </dialog>;
}
