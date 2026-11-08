import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { eligibleForPrint, refundTotal, receiptPrintHtml } from './receiptPrint.mjs';
const samples=JSON.parse(readFileSync(new URL('../../data/sampleReceipts.json',import.meta.url))).map(row=>({...row,state:'ready',is_demo:false}));
test('print selects only potentially eligible AED receipts',()=>{
  const eligible=eligibleForPrint([...samples,{status:'unrecognized',currency:'AED',estimated_refund:null}]);
  assert.equal(eligible.length,3);
  assert.equal(refundTotal(eligible),'221.16');
  const html=receiptPrintHtml(samples,Object.fromEntries(samples.map(r=>[r.id,'blob:sample'])));
  assert.equal((html.match(/<article class="receipt-page">/g)||[]).length,3);
  assert.ok(!html.includes('Atlantis'));
  assert.ok(!html.includes('Zara'));
  assert.ok(html.lastIndexOf('<section class="summary">')>html.lastIndexOf('</article>'));
  assert.match(html,/221\.16 AED/);
});
test('receipt text is escaped in the print document',()=>{
  const html=receiptPrintHtml([{...samples[0],merchant_name:'<script>alert(1)</script>'}],{[samples[0].id]:'blob:safe'});
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('demo, queued and unknown currency receipts never enter a real export',()=>{
  const row=samples[0];
  for(const change of [{is_demo:true},{state:'queued'},{currency:null},{currency:'USD'},{estimated_refund:null}])assert.equal(eligibleForPrint([{...row,...change}]).length,0);
});
