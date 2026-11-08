import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as messages from '../../src/i18n/messages.mjs';

const require=createRequire(import.meta.url);
const cache=new Map();
const dictionaries=Object.fromEntries(messages.LOCALES.map(locale=>[locale,JSON.parse(readFileSync(new URL(`../../src/i18n/locales/${locale}.json`,import.meta.url),'utf8'))]));
function load(name){
  if(cache.has(name))return cache.get(name);
  const file=new URL(`../../src/i18n/${name}.jsx`,import.meta.url);
  const source=readFileSync(file,'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const testModule={exports:{}};cache.set(name,testModule.exports);
  const localRequire=id=>{
    if(id==='./messages.mjs')return messages;
    if(id==='./LocaleProvider')return load('LocaleProvider');
    if(id.startsWith('./locales/'))return dictionaries[id.split('/').at(-1).split('.')[0]];
    return require(id);
  };
  vm.runInNewContext(compiled,{module:testModule,exports:testModule.exports,require:localRequire,Intl,Date,console});
  cache.set(name,testModule.exports);return testModule.exports;
}
export function i18nTestRequire(id){
  if(id==='@/i18n/Localized')return load('Localized');
  if(id==='@/i18n/LocaleProvider')return load('LocaleProvider');
  if(id==='@/i18n/messages.mjs')return messages;
  throw new Error('Unexpected localization module: '+id);
}
export function renderLocalizedMarkup(element,locale='en'){
  return renderToStaticMarkup(React.createElement(load('LocaleProvider').LocaleProvider,
    {initialLocale:locale,initialDictionary:dictionaries[locale]},element));
}
