import 'server-only';
const dictionaries={en:()=>import('./locales/en.json').then(m=>m.default),ar:()=>import('./locales/ar.json').then(m=>m.default),hi:()=>import('./locales/hi.json').then(m=>m.default)};
export function loadDictionary(locale){return (dictionaries[locale]||dictionaries.en)();}
