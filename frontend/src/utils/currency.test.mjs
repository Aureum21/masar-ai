import test from 'node:test';
import assert from 'node:assert/strict';
import {convertCurrency,formatCurrency,FX_REFERENCE} from './currency.mjs';
test('illustrative conversions reject unsupported and invalid amounts',()=>{
  assert.equal(convertCurrency(221.16,'USD'),60.16);
  assert.equal(convertCurrency(0,'EUR'),0);
  for(const amount of [-1,NaN,Infinity])assert.equal(convertCurrency(amount,'AED'),null);
  assert.equal(convertCurrency(100,'XXX'),null);
  assert.equal(formatCurrency(100,'XXX'),'Unavailable');
  assert.match(FX_REFERENCE.label,/not live/);
});
