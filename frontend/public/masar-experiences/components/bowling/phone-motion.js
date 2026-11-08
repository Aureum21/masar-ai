// Pocket reach, supported lift, steady capture, then a relaxed review position.
const ease=(a,b,t)=>{const n=Math.max(0,Math.min(1,(t-a)/(b-a)));return n*n*(3-2*n);};
export function phoneMotion(t){
 const reach=ease(7.5,7.95,t),lift=ease(8.05,8.95,t),support=ease(8.3,8.85,t),lower=ease(9.85,10.7,t);
 const ready=[.60,1.02,.015],review=[.46,.65,.12],pocket=[.25,.17,.25];
 const position=ready.map((n,i)=>pocket[i]+(n+(review[i]-n)*lower-pocket[i])*lift);
 return {reach,lift,support,lower,position,visible:t>=7.95,shutter:ease(9.28,9.36,t)*(1-ease(9.36,9.48,t))};
}
