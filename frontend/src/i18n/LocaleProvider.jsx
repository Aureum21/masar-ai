'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {LOCALES,LOCALE_INFO,validLocale,createTranslator,dateFormatter,numberFormatter} from './messages.mjs';

const Context=createContext(null);
const load={en:()=>import('./locales/en.json').then(m=>m.default),ar:()=>import('./locales/ar.json').then(m=>m.default),hi:()=>import('./locales/hi.json').then(m=>m.default)};

export function LocaleProvider({initialLocale='en',initialDictionary,children}) {
  const [state,setState]=useState({locale:validLocale(initialLocale),dictionary:initialDictionary});
  const [pending,setPending]=useState(false);
  const [error,setError]=useState(false);
  const revision=useRef(0);
  const changeLocale=useCallback(async(next,persist=true)=>{
    if(!LOCALES.includes(next))return;
    const current=++revision.current;
    setPending(true);setError(false);
    try {
      const dictionary=await load[next]();
      if(current!==revision.current)return;
      if(persist){
        document.cookie=`masar_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
        try{localStorage.setItem('masar_locale',next);}catch{/* Cookie still persists the public preference. */}
      }
      document.documentElement.lang=next;
      document.documentElement.dir=LOCALE_INFO[next].dir;
      setState({locale:next,dictionary});
    }catch{if(current===revision.current)setError(true);}
    finally{if(current===revision.current)setPending(false);}
  },[]);
  useEffect(()=>{
    const listener=event=>{if(event.key==='masar_locale'&&LOCALES.includes(event.newValue))changeLocale(event.newValue,false);};
    window.addEventListener('storage',listener);
    return()=>{revision.current+=1;window.removeEventListener('storage',listener);};
  },[changeLocale]);
  useEffect(()=>{
    // Bridge only the public UI dictionary to same-origin standalone game frames.
    const payload={locale:state.locale,dictionary:state.dictionary};
    window.__MASAR_I18N__=payload;
    document.title=createTranslator(state.locale,state.dictionary)('Masar AI — Your UAE Travel Companion');
    const translate=createTranslator(state.locale,state.dictionary);
    document.querySelectorAll('[data-masar-invalid]').forEach(input=>{
      if(input.validity?.customError)input.setCustomValidity(translate(input.dataset.masarInvalid));
    });
    window.dispatchEvent(new CustomEvent('masar:locale',{detail:payload}));
    const send=frame=>{
      if(!(frame instanceof HTMLIFrameElement))return;
      try{const url=new URL(frame.src,location.href);if(url.origin===location.origin&&url.pathname.startsWith('/masar-experiences/'))frame.contentWindow?.postMessage({type:'MASAR_LOCALE',...payload},location.origin);}catch{/* Invalid/external frames do not participate. */}
    };
    document.querySelectorAll('iframe').forEach(send);
    const loaded=event=>send(event.target);
    document.addEventListener('load',loaded,true);
    return()=>document.removeEventListener('load',loaded,true);
  },[state]);
  const value=useMemo(()=>({locale:state.locale,dir:LOCALE_INFO[state.locale].dir,
    t:createTranslator(state.locale,state.dictionary),changeLocale,pending,error,
    formatNumber:(value,options)=>numberFormatter(state.locale,options).format(value),
    formatDate:(value,options)=>dateFormatter(state.locale,options).format(value instanceof Date?value:new Date(value)),
  }),[state,changeLocale,pending,error]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useI18n(){const value=useContext(Context);if(!value)throw new Error('LocaleProvider is required');return value;}
