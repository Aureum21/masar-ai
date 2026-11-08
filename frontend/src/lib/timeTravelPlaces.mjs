import archive from '../../../data/heritage_archive.v1.json' with {type:'json'};

const normalize=value=>typeof value==='string'?value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim():'';
const aliases={
  al_hisn:['Al Hisn','Sharjah Fort','Al Hisn Fort'],
  qasr_al_hosn:['Qasr Al Hosn','Qasr Al Hosn Fort'],
  al_fahidi:['Al Fahidi Fort','Dubai Museum'],
  dhayah_fort:['Dhayah Fort'],
  fujairah_fort:['Fujairah Fort'],
  al_jahili:['Al Jahili','Al Jahili Fort'],
  al_badiyah:['Al Badiyah Mosque','Al Bidya Mosque','Al Bidiyah Mosque'],
  jazirat_al_hamra:['Jazirat Al Hamra','Al Jazirah Al Hamra','Jazirat Al Hamra Ghost Village'],
  bait_al_naboodah:['Bait Al Naboodah'],
  ajman_fort:['Ajman Fort','Ajman Museum'],
  uaq_fort:['Umm Al Quwain Fort','Umm Al Quwain Museum','Umm Al Quwain Fort Museum','UAQ Fort Museum'],
};
const ids={'ajman-museum':'ajman_fort','uaq-fort-museum':'uaq_fort','al-jazirah-al-hamra':'jazirat_al_hamra','sharjah-fort':'al_hisn','al-jahili-fort':'al_jahili','al-bidya-mosque':'al_badiyah'};
for(const id of Object.keys(archive)) {
  ids[id]=id;
  // al-fahidi in Explore means the whole neighbourhood, not the supported fort.
  if(id!=='al_fahidi')ids[id.replaceAll('_','-')]=id;
}
const names=new Map();
for(const [id,item] of Object.entries(archive)) {
  for(const name of [item.landmark_name,item.arabic_name,...(aliases[id]||[])])names.set(normalize(name),id);
}

export function timeTravelPlace(activity={}) {
  if(!activity||typeof activity!=='object')return null;
  const identity=[activity.time_travel?.landmark_id,activity.place_id,activity.placeId,activity.landmark_id,activity.selection_id,activity.id]
    .find(value=>typeof value==='string'&&Object.hasOwn(ids,value));
  const title=normalize(activity.title||activity.name).replace(/^(visit|explore|tour|discover) /,'');
  const id=identity?ids[identity]:names.get(title);
  return id&&Object.hasOwn(archive,id)?{id,name:archive[id].landmark_name}:null;
}
