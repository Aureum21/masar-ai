/** An explicit, one-use handoff; personal wishes never enter the URL. */
export function createHandoff(owner,prompt,summary={},context={}) {
  if(!owner)throw new Error('Sign in before continuing.');
  const id=crypto.randomUUID();
  sessionStorage.setItem(`masar:planning-handoff:${id}`,JSON.stringify({owner:String(owner),prompt,summary,context,expiresAt:Date.now()+30*60*1000}));
  return id;
}
export function handoffSnapshot(id) {
  try {return sessionStorage.getItem(`masar:planning-handoff:${id}`)||'';}catch{return '';}
}
export function consumeHandoffPacket(owner,id) {
  const key=`masar:planning-handoff:${id}`;
  let raw;
  try {raw=sessionStorage.getItem(key);}catch{return null;}
  if(!raw)return null;
  let value;
  try {value=JSON.parse(raw);}catch{sessionStorage.removeItem(key);return null;}
  if(value.owner!==String(owner))return null;
  sessionStorage.removeItem(key);
  return value.expiresAt>Date.now()&&typeof value.prompt==='string'?value:null;
}

export function consumeHandoff(owner,id){return consumeHandoffPacket(owner,id)?.prompt||null;}
