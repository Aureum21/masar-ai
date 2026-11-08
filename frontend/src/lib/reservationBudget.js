/** Sum confirmed provider booking values; holds, quotes and sandbox stay separate. */
function units(value){
  if(typeof value!=='string'&&typeof value!=='number')return null;
  const match=String(value).match(/^(\d+)(?:\.(\d{1,6}))?$/);
  return match?BigInt(match[1])*1000000n+BigInt((match[2]||'').padEnd(6,'0')):null;
}
function amount(value){
  const whole=value/1000000n, fraction=String(value%1000000n).padStart(6,'0').replace(/0+$/,'').padEnd(2,'0');
  return `${whole}.${fraction}`;
}
export function reservationBudget(records=[],tripId){
  const groups={live:{count:0,items:[],totals:[],missing:0},sandbox:{count:0,items:[],totals:[],missing:0},unverified:0};
  const sums={live:new Map(),sandbox:new Map()},seen=new Set();
  for(const item of records){
    if(item.source!=='provider'||item.status!=='CONFIRMED'||!item.booking_id||!['hotel','flight'].includes(item.kind)||String(item.trip_id)!==String(tripId))continue;
    const key=`${item.environment}:${item.kind}:${item.booking_id}`;
    if(seen.has(key))continue;seen.add(key);
    if(!['live','sandbox'].includes(item.environment)){groups.unverified++;continue;}
    const group=groups[item.environment];group.count++;
    const value=units(item.total_amount),currency=typeof item.currency==='string'?item.currency.toUpperCase():'';
    const valid=value!==null&&/^[A-Z]{3}$/.test(currency);
    group.items.push({...item,total_amount:valid?amount(value):null,currency:valid?currency:null});
    if(valid)sums[item.environment].set(currency,(sums[item.environment].get(currency)||0n)+value);
    else group.missing++;
  }
  for(const env of ['live','sandbox'])groups[env].totals=[...sums[env]].map(([currency,value])=>({currency,amount:amount(value)}));
  return groups;
}
