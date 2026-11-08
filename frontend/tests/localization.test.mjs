import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {LOCALES,LOCALE_INFO,validLocale,createTranslator,dateFormatter,numberFormatter,localizedSearch} from '../src/i18n/messages.mjs';
import {i18nTestRequire,renderLocalizedMarkup} from './helpers/renderLocalized.mjs';

const dict=Object.fromEntries(LOCALES.map(locale=>[locale,JSON.parse(readFileSync(new URL(`../src/i18n/locales/${locale}.json`,import.meta.url),'utf8'))]));
const slots=value=>[...value.matchAll(/⟦(\d+)⟧/g)].map(m=>m[1]).sort();
test('Arabic and Hindi catalogs cover every English message and preserve interpolation slots',()=>{
  const keys=Object.keys(dict.en).sort();
  for(const locale of ['ar','hi']){
    assert.deepEqual(Object.keys(dict[locale]).sort(),keys);
    for(const key of keys){assert.equal(typeof dict[locale][key],'string',`${locale}: ${key}`);assert.ok(dict[locale][key].trim(),`${locale}: ${key}`);assert.deepEqual(slots(dict[locale][key]),slots(key),`${locale} changed placeholders: ${key}`);}
  }
});
test('locale validation and direction reject unsupported or injected choices',()=>{
  assert.equal(validLocale('ar'),'ar');assert.equal(validLocale('hi'),'hi');
  for(const value of ['AR','../ar','<script>','fr',null])assert.equal(validLocale(value),'en');
  assert.equal(LOCALE_INFO.ar.dir,'rtl');assert.equal(LOCALE_INFO.hi.dir,'ltr');
});
test('rendered labels and accessibility text change, input values and references do not',()=>{
  const {Localized,LocalizedText}=i18nTestRequire('@/i18n/Localized');
  for(const locale of ['ar','hi']){
    const markup=renderLocalizedMarkup(React.createElement(React.Fragment,null,
      React.createElement(Localized,{element:'input',attributes:['placeholder','aria-label'],placeholder:'Email Address','aria-label':'Email Address',value:'someone@example.com',readOnly:true}),
      React.createElement(LocalizedText,{message:'Welcome Back'}),
      React.createElement('bdi',{dir:'auto'},'Guest A-123')),
    locale);
    assert.ok(markup.includes(dict[locale]['Welcome Back']));assert.ok(markup.includes(dict[locale]['Email Address']));
    assert.ok(markup.includes('someone@example.com'));assert.ok(markup.includes('Guest A-123'));
  }
});
test('Arabic mixed-direction interpolation preserves names, URL tokens and literal HTML as text',()=>{
  const t=createTranslator('ar',{'Hello ⟦0⟧':'مرحبًا ⟦0⟧'});
  const value=t('Hello ⟦0⟧',['<img src=x onerror=alert(1)>']);
  assert.equal(value,'مرحبًا \u2068<img src=x onerror=alert(1)>\u2069');
  assert.equal(t('__proto__'), '__proto__');assert.equal(t('constructor',[]),'constructor');
});
test('known templates translate dynamic status text without changing references',()=>{
  const t=createTranslator('hi',{'Receipt ⟦0⟧ saved.':'रसीद ⟦0⟧ सहेज दी गई।'});
  assert.equal(t('Receipt REF-007 saved.'),'रसीद REF-007 सहेज दी गई।');
  assert.equal(t('Unknown provider response'),'Unknown provider response');
});
test('localized dates retain the requested timezone and numbers retain exact value',()=>{
  const instant=new Date('2026-10-29T22:30:00Z');
  assert.ok(dateFormatter('hi',{day:'numeric',month:'long',year:'numeric'}).format(instant).includes('30'));
  assert.ok(dateFormatter('ar',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(instant).includes('٢٩'));
  assert.ok(numberFormatter('ar',{minimumFractionDigits:2,maximumFractionDigits:2}).format(1234.5).includes('١'));
  assert.equal(numberFormatter('hi',{minimumFractionDigits:2,maximumFractionDigits:2}).format(1234.5),'1,234.50');
});
test('localized search matches Arabic and Hindi without rewriting canonical place records',()=>{
  const record={id:'burj-khalifa',title:'Burj Khalifa'};
  assert.equal(localizedSearch([record.title],'بُرج',createTranslator('ar',{'Burj Khalifa':'برج خليفة'})),true);
  assert.equal(localizedSearch([record.title],'बुर्ज',createTranslator('hi',{'Burj Khalifa':'बुर्ज ख़लीफ़ा'})),true);
  assert.equal(localizedSearch([record.title],'Burj',createTranslator('ar',{'Burj Khalifa':'برج خليفة'})),true);
  assert.deepEqual(record,{id:'burj-khalifa',title:'Burj Khalifa'});
});
test('protected personal names and English plural fragments are handled separately',()=>{
  const t=createTranslator('ar',{'Welcome, ⟦0⟧':'مرحبًا، ⟦0⟧','Ready':'جاهز','⟦0⟧ stamp⟦1⟧':'الأختام: ⟦0⟧⟦1⟧'});
  assert.equal(t('Welcome, ⟦0⟧',['Ready'],[true]),'مرحبًا، \u2068Ready\u2069');
  assert.ok(!t('⟦0⟧ stamp⟦1⟧',[3,'s']).includes('s'));
});
test('technical placeholders and URLs are never translated into invalid values',()=>{
  const t=createTranslator('ar',{'you@example.com':'unwanted translation','https://example.com':'unwanted translation'});
  assert.equal(t('you@example.com'),'you@example.com');assert.equal(t('https://example.com'),'https://example.com');
  const amounts=createTranslator('hi',{'AED':'wrong currency','PDF':'wrong format','Total ⟦0⟧':'कुल ⟦0⟧'});
  assert.equal(amounts('AED'),'AED');assert.equal(amounts('PDF'),'PDF');assert.equal(amounts('Total ⟦0⟧',['AED']),'कुल AED');
});

test('draft translations cannot change displayed currencies or monetary amounts',()=>{
  const source='From AED 1,450 / night';
  for(const draft of ['من IQD 1,450 لليلة','من AED 999 لليلة','من AED 14.50 لليلة','من AED -1450 لليلة']){
    assert.equal(createTranslator('ar',{[source]:draft})(source),source);
  }
  assert.equal(createTranslator('ar',{[source]:'من AED ١٬٤٥٠ لليلة'})(source),'من AED ١٬٤٥٠ لليلة');
  // Every rejected draft is kept in English, including in standalone experiences.
  const pending=JSON.parse(readFileSync(new URL('../src/i18n/draft-review.json',import.meta.url),'utf8'));
  for(const locale of ['ar','hi'])for(const key of pending[locale])assert.equal(dict[locale][key],key);
});
