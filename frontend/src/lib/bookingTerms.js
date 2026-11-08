/** Translate provider terms without exposing raw schema or assuming free cancellation. */
export function bookingTerms(value) {
  if(typeof value==='string'){
    const text=value.trim();
    if(!text)return ['Cancellation details need confirmation with the provider.'];
    if(/^[{[]/.test(text)){try{return bookingTerms(JSON.parse(text));}catch{return ['Cancellation details need confirmation with the provider.'];}}
    return [text];
  }
  if(!value||typeof value!=='object'||Array.isArray(value))return ['Cancellation details need confirmation with the provider.'];
  const lines=[];
  const tag=String(value.refundableTag||'').toUpperCase();
  if(tag==='NRFN'||value.refundable===false)lines.push('Non-refundable rate.');
  else if(tag==='RFN'||value.refundable===true)lines.push('Refundable, subject to provider cancellation conditions.');
  for(const policy of Array.isArray(value.cancelPolicyInfos)?value.cancelPolicyInfos:[]){
    if(!policy||typeof policy!=='object')continue;
    const when=typeof policy.cancelTime==='string'?policy.cancelTime.replace('T',' '):'';
    const amount=Number(policy.amount);
    if(policy.amount===null||policy.amount===undefined||policy.amount===''||!Number.isFinite(amount)||amount<0)continue;
    const percent=['percent','percentage'].includes(String(policy.type).toLowerCase());
    const currency=typeof policy.currency==='string'?policy.currency:'';
    if(!percent&&!currency)continue;
    const fee=percent?`${amount}%`:`${amount.toLocaleString('en-GB')} ${currency}`;
    const zone=when&&typeof policy.timezone==='string'?` (${policy.timezone})`:'';
    lines.push(`${when?`From ${when}${zone}: `:''}cancellation fee ${fee}.`);
  }
  for(const remark of [...(Array.isArray(value.hotelRemarks)?value.hotelRemarks:[]),...(Array.isArray(value.summary)?value.summary:[])]){
    const text=typeof remark==='string'?remark:remark?.message||remark?.description;
    if(typeof text==='string'&&text.trim())lines.push(text.trim());
  }
  return [...new Set(lines)].slice(0,12).length?[...new Set(lines)].slice(0,12):['Cancellation details need confirmation with the provider.'];
}
