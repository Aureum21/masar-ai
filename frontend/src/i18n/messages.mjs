import reviewedCopy from './reviewed.json' with {type:'json'};
export const LOCALES = Object.freeze(['en', 'ar', 'hi']);
export const LOCALE_INFO = Object.freeze({
  en: {name: 'English', intl: 'en-AE', dir: 'ltr'},
  ar: {name: 'العربية', intl: 'ar-AE-u-nu-arab', dir: 'rtl'},
  hi: {name: 'हिन्दी', intl: 'hi-IN', dir: 'ltr'},
});
export function validLocale(value) { return LOCALES.includes(value) ? value : 'en'; }
export const messageKey = value => value.replace(/\s+/g, ' ').trim();
const marker = /⟦(\d+)⟧/g;
const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Cache only immutable dictionary indexes, never user text or request-specific values.
const dictionaryIndexes=new WeakMap();
const currencyCodes=new Set(typeof Intl.supportedValuesOf==='function'?Intl.supportedValuesOf('currency'):['AED','USD','EUR','GBP','INR','SAR','QAR','KWD','OMR','BHD','JPY','CNY']);
const fileCodes=new Set(['PNG','JPG','JPEG','WebP','WEBP','GLB','glTF','GLTF','MP4','WebM','PDF']);
const asciiDigits=value=>value.replace(/[٠-٩०-९]/g,char=>String(char.charCodeAt(0)-(char>='०'?0x966:0x660)));
const reviewedFolded=new Map(Object.entries(reviewedCopy).map(([key,value])=>[key.toLowerCase(),value]));
function currencyTokens(source){return source.match(/\b[A-Z]{3}\b/g)?.filter(code=>currencyCodes.has(code)&&(!['ALL','TOP','TRY','MAD'].includes(code)||new RegExp('(?:\\b'+code+'\\s*\\d|\\d\\s*'+code+'\\b)').test(source)))||[];}
export function preservesFacts(source,target,reviewed=false){
  const sourceCodes=currencyTokens(source);
  if(JSON.stringify([...sourceCodes].sort())!==JSON.stringify(currencyTokens(target).sort()))return false;
  if((source.match(/[$€£₹]/g)||[]).join('')!==(target.match(/[$€£₹]/g)||[]).join(''))return false;
  if(reviewed&&!sourceCodes.length)return true; // Reviewed count words may replace digits naturally.
  const numbers=value=>asciiDigits(value.replace(/⟦\d+⟧/g,'')).replace(/٬/g,',').replace(/٫/g,'.').match(/[-−]?\d+(?:[.,]\d+)*/g)?.map(n=>String(Number(n.replace(/,/g,'').replace('−','-')))).sort()||[];
  return JSON.stringify(numbers(source))===JSON.stringify(numbers(target));
}

export function createTranslator(locale, dictionary) {
  locale = validLocale(locale);
  let indexes=dictionaryIndexes.get(dictionary);
  if(!indexes){
  const patterns = Object.keys(dictionary).filter(key => key.includes('⟦') && key.replace(marker, '').trim().length >= 4)
    .sort((a,b)=>b.replace(marker,'').length-a.replace(marker,'').length)
    .map(key => ({key, regex: new RegExp('^' + key.split(/⟦\d+⟧/).map(escapeRegExp).join('([\\s\\S]*?)') + '$'),
      indexes: [...key.matchAll(/⟦(\d+)⟧/g)].map(m=>m[1])}));
  indexes={patterns,folded:new Map(Object.keys(dictionary).map(key=>[key.toLocaleLowerCase('en'),key]))};
  dictionaryIndexes.set(dictionary,indexes);
  }
  const {patterns,folded}=indexes;
  const cache = new Map();
  const own = key => {
    const approved=reviewedCopy[key]||reviewedFolded.get(key.toLowerCase());
    const reviewed=approved?.[locale==='ar'?0:1]===dictionary[key];
    return Object.hasOwn(dictionary,key)&&preservesFacts(key,dictionary[key],reviewed) ? dictionary[key] : key;
  };
  const interpolate = (message, values, preserve={}) => message.replace(marker, (_, index) => {
    let value = values[index] ?? '';
    if(locale!=='en'&&!preserve[index]&&value==='s')value='';
    if (typeof value === 'boolean') value = '';
    else if (typeof value === 'number' && locale !== 'en') value=numberFormatter(locale,{maximumFractionDigits:20}).format(value);
    else if (typeof value === 'string' && !preserve[index] && !currencyCodes.has(value) && !fileCodes.has(value) && locale !== 'en' && Object.hasOwn(dictionary,messageKey(value))) value=dictionary[messageKey(value)];
    // Keep references, names and amounts intact and isolate mixed-direction values.
    return locale === 'ar' ? '\u2068' + String(value) + '\u2069' : String(value);
  });
  return (value, values, preserveValues) => {
    if (typeof value !== 'string') return value;
    if(currencyCodes.has(value.trim())||fileCodes.has(value.trim()))return value;
    // Technical examples and identifiers are never translated into invalid values.
    if (/^\S+@\S+\.[A-Za-z]{2,}$/.test(value.trim()) || /^(https?:\/\/|masarai:\/\/)/.test(value.trim())) return value;
    const key = messageKey(value);
    const prefix = value.match(/^\s*/)?.[0] || '';
    const suffix = value.match(/\s*$/)?.[0] || '';
    if (values) return prefix + interpolate(own(key), values, preserveValues) + suffix;
    if (locale === 'en' || !key) return value;
    if (Object.hasOwn(dictionary, key)) return prefix + own(key) + suffix;
    const foldedKey=folded.get(key.toLocaleLowerCase('en'));
    if(foldedKey)return prefix+own(foldedKey)+suffix;
    if (cache.has(value)) return cache.get(value);
    for (const pattern of patterns) {
      const match = pattern.regex.exec(key);
      if (!match) continue;
      const slots = {};
      pattern.indexes.forEach((index,i)=>{slots[index]=match[i+1];});
      const result=prefix + interpolate(own(pattern.key), slots, Object.fromEntries(pattern.indexes.map(index=>[index,true]))) + suffix;
      if(cache.size>=1000)cache.clear();
      cache.set(value,result);
      return result;
    }
    return value;
  };
}

export function numberFormatter(locale, options={}) {
  return new Intl.NumberFormat(LOCALE_INFO[validLocale(locale)].intl, options);
}
export function dateFormatter(locale, options={}) {
  return new Intl.DateTimeFormat(LOCALE_INFO[validLocale(locale)].intl, {timeZone:'Asia/Dubai', ...options});
}
export function formattingLocale(locale, original) {
  return validLocale(locale)==='en' ? original || 'en-AE' : LOCALE_INFO[validLocale(locale)].intl;
}
export function normalizeSearch(value){
  return String(value??'').normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').toLowerCase().replace(/\s+/g,' ').trim();
}
export function localizedSearch(values,query,translate){
  const needle=normalizeSearch(query);
  return !needle||values.filter(value=>typeof value==='string').some(value=>normalizeSearch(value).includes(needle)||normalizeSearch(translate(value)).includes(needle));
}
