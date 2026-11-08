export const SUPPORT_OPTIONS = [
  ['step_free','Step-free routes'],['wheelchair_room','Wheelchair-accessible room'],
  ['short_walks','Short walking distances'],['frequent_rests','Frequent rests'],
  ['low_sensory','Low-sensory places'],['captions','Captions'],['screen_reader','Screen-reader instructions']
];
export function validSupport(value, travellers=50) {
  if(!Array.isArray(value)||value.length>50)return false;
  const seen=new Set(),codes=new Set(SUPPORT_OPTIONS.map(([code])=>code));
  return value.every(item=>{
    if(!item||typeof item!=='object'||Object.keys(item).some(key=>!['traveller','needs','essential','max_walk_m','rest_every_minutes','rest_minutes'].includes(key)))return false;
    if(!Number.isInteger(item.traveller)||item.traveller<1||item.traveller>travellers||seen.has(item.traveller))return false;
    seen.add(item.traveller);
    if(!['needs','essential'].every(key=>Array.isArray(item[key])&&item[key].length<=7&&item[key].every(code=>codes.has(code))))return false;
    if(!item.essential.every(code=>item.needs.includes(code)))return false;
    return [['max_walk_m',10,20000],['rest_every_minutes',10,240],['rest_minutes',5,120]].every(([key,min,max])=>item[key]==null||(Number.isInteger(item[key])&&item[key]>=min&&item[key]<=max));
  });
}
