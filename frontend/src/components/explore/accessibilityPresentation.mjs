export const ACCESS_FIELDS={
  step_free_entrance:{label:'Step-free entrance',short:'Step-free entry',icon:'access'},
  accessible_toilets:{label:'Accessible toilets',short:'Accessible toilets',icon:'toilet'},
  lift:{label:'Lift availability',short:'Lift access',icon:'lift'},
  surface:{label:'Paths & surfaces',short:'Route information',icon:'route'},
  walking_distance_m:{label:'Walking distance',short:'Walking distance',icon:'route'},
  quiet_times:{label:'Quieter visiting times',short:'Quiet visiting times',icon:'quiet'},
  assistance_contact:{label:'Access assistance',short:'Assistance contact',icon:'help'},
  rest_seating:{label:'Places to rest',short:'Rest seating',icon:'rest'},
  low_sensory:{label:'Low-sensory arrangements',short:'Sensory support',icon:'quiet'},
  captions:{label:'Captions',short:'Captions',icon:'captions'},
};
const DEFAULT_FIELDS=['step_free_entrance','accessible_toilets','lift','surface','walking_distance_m','quiet_times','assistance_contact'];

export function accessPresentation(evidence){
  const reported=[];
  for(const [key,fact] of Object.entries(evidence?.facts||{})){
    if(!ACCESS_FIELDS[key]||!fact||!['reported','confirmed'].includes(fact.status)||fact.value==null)continue;
    try{
      const url=new URL(fact.source_url);
      if(!['http:','https:'].includes(url.protocol)||url.username||url.password)continue;
      reported.push({key,...ACCESS_FIELDS[key],...fact});
    }catch{/* Unsourced values remain unconfirmed. */}
  }
  // Explicit barriers stay visible even when the card only has room for two chips.
  reported.sort((a,b)=>Number(b.value===false)-Number(a.value===false));
  const known=new Set(reported.map(f=>f.key));
  return {reported,unknown:DEFAULT_FIELDS.filter(key=>!known.has(key)).map(key=>({key,...ACCESS_FIELDS[key]}))};
}
