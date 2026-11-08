export function locationLabel(value, fallback='') {
  if(typeof value==='string')return value.trim()||fallback;
  if(!value||typeof value!=='object'||Array.isArray(value))return fallback;
  for(const key of ['name','label','formatted_address','address','city']) {
    if(typeof value[key]==='string'&&value[key].trim())return value[key].trim();
  }
  const lat=value.lat??value.latitude, lng=value.lng??value.longitude;
  if(lat!==null&&lat!==undefined&&lat!==''&&lng!==null&&lng!==undefined&&lng!==''&&Number.isFinite(Number(lat))&&Number.isFinite(Number(lng))&&Math.abs(Number(lat))<=90&&Math.abs(Number(lng))<=180) {
    return `${Number(lat).toFixed(4)}°, ${Number(lng).toFixed(4)}°`;
  }
  return fallback;
}
