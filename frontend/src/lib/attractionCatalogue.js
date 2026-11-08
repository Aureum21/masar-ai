import venueFacts from '../../../data/accessibility.v1.json' with {type:'json'};

const ACCESS_ALIASES={'sheikh-zayed-mosque':'sheikh-zayed-grand-mosque','burj-khalifa-sky':'burj-khalifa','old-dubai-heritage':'al-fahidi'};

/** Apply the reviewed venue facts even before the API loads or from an older cache. */
function withAccessibility(place){
 const identity=ACCESS_ALIASES[place.id]||place.id;
 const facts=venueFacts[identity];
 return facts?{...place,accessibility:{scope:'venue',facts,confirmation_required:true}}:place;
}

/** Merge canonical editorial metadata without dropping existing authentic images. */
export function mergeCatalogue(existing,items){
 const aliases={'sheikh-zayed-mosque':'sheikh-zayed-grand-mosque'};
 const map=new Map(existing.map(place=>[aliases[place.id]||place.id,place]));
 for(const place of items){const before=map.get(place.id);map.set(place.id,{...before,...place,images:place.images?.length?place.images:before?.images||[]});}
 return [...map.values()].map(withAccessibility);
}
export function cataloguePage(places,page=1,size=12){
 const count=Math.max(1,Math.ceil(places.length/size)),current=Math.max(1,Math.min(page,count));
 return {page:current,count,items:places.slice((current-1)*size,current*size)};
}
