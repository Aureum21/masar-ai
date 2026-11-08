/** Localization boundary for imperative game DOM only. Never observes React-owned UI. */
let state={locale:'en',dictionary:{}};
const originals=new WeakMap(),attributeOriginals=new WeakMap();
const known=new Set(['en','ar','hi']);
let patterns=[];
let folded=new Map();
const normalize=value=>value.replace(/\s+/g,' ').trim();
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function setState(next){
  if(!next||!known.has(next.locale)||!next.dictionary||typeof next.dictionary!=='object')return;
  state=next;
  folded=new Map(Object.keys(state.dictionary).map(key=>[key.toLowerCase(),key]));
  patterns=Object.keys(state.dictionary).filter(k=>k.includes('⟦')&&k.replace(/⟦\d+⟧/g,'').trim().length>=4).map(key=>({
    key,regex:new RegExp('^'+key.split(/⟦\d+⟧/).map(escape).join('(.*?)')+'$'),ids:[...key.matchAll(/⟦(\d+)⟧/g)].map(m=>m[1]),
  }));
}
export function translateExperienceText(value){
  if(typeof value!=='string'||state.locale==='en')return value;
  const key=normalize(value);let result;
  if(Object.hasOwn(state.dictionary,key))result=state.dictionary[key];
  else if(folded.has(key.toLowerCase()))result=state.dictionary[folded.get(key.toLowerCase())];
  else for(const item of patterns){const m=item.regex.exec(key);if(m){const slots={};item.ids.forEach((id,i)=>{slots[id]=m[i+1];});result=state.dictionary[item.key].replace(/⟦(\d+)⟧/g,(_,id)=>slots[id]||'');break;}}
  if(typeof result!=='string')return value;
  return (value.match(/^\s*/)?.[0]||'')+result+(value.match(/\s*$/)?.[0]||'');
}
export function attachExperienceLocale(root){
  if(!root||root.closest('[data-masar-locale-root]'))return()=>{};
  root.setAttribute('data-masar-locale-root','');
  const ignored=node=>node.parentElement?.closest('script,style,textarea,code,pre,[translate="no"],[data-masar-locale-ignore]');
  function text(node){
    if(ignored(node)||!node.nodeValue?.trim())return;
    let record=originals.get(node);
    if(!record||node.nodeValue!==record.last)record={source:node.nodeValue,last:node.nodeValue};
    const next=translateExperienceText(record.source);record.last=next;originals.set(node,record);
    if(node.nodeValue!==next)node.nodeValue=next;
  }
  function attrs(element){
    if(!element.getAttribute||element.closest('[translate="no"]'))return;
    let records=attributeOriginals.get(element);if(!records){records={};attributeOriginals.set(element,records);}
    for(const name of ['aria-label','title','placeholder'])if(element.hasAttribute(name)){
      const current=element.getAttribute(name);let record=records[name];
      if(!record||current!==record.last)record={source:current,last:current};
      const next=translateExperienceText(record.source);record.last=next;records[name]=record;
      if(next!==current)element.setAttribute(name,next);
    }
  }
  function update(node=root){
    if(node.nodeType===Node.TEXT_NODE){text(node);return;}
    attrs(node);
    const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let child;while((child=walker.nextNode()))text(child);
    node.querySelectorAll?.('[aria-label],[title],[placeholder]').forEach(attrs);
  }
  function apply(next){setState(next);root.lang=state.locale;root.dir=state.locale==='ar'?'rtl':'ltr';update();}
  const local=event=>apply(event.detail);
  const message=event=>{if(event.origin===location.origin&&event.source===parent&&event.data?.type==='MASAR_LOCALE')apply(event.data);};
  window.addEventListener('masar:locale',local);window.addEventListener('message',message);
  try{const initial=window.__MASAR_I18N__||(window.parent!==window?window.parent.__MASAR_I18N__:null);if(initial)apply(initial);}catch{/* Cross-origin parents cannot supply a locale. */}
  if(state.locale==='en'&&!window.__MASAR_I18N__){
    const locale=document.cookie.match(/(?:^|;\s*)masar_locale=(en|ar|hi)(?:;|$)/)?.[1]||'en';
    if(locale!=='en')fetch('/api/i18n?locale='+locale).then(r=>r.ok?r.json():null).then(dictionary=>{if(dictionary)apply({locale,dictionary});}).catch(()=>{});
  }
  const observer=new MutationObserver(records=>{for(const record of records){if(record.type==='characterData')text(record.target);else if(record.type==='attributes')attrs(record.target);else for(const node of record.addedNodes)update(node);}});
  observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','placeholder']});
  return()=>{observer.disconnect();window.removeEventListener('masar:locale',local);window.removeEventListener('message',message);root.removeAttribute('data-masar-locale-root');};
}

// Initialize before game views paint their first canvas textures.
if(typeof window!=='undefined'){
  try{const initial=window.__MASAR_I18N__||(window.parent!==window?window.parent.__MASAR_I18N__:null);if(initial)setState(initial);}catch{/* Standalone/cross-origin documents start in English until their local dictionary loads. */}
}
