import {apiRequest} from './api.js';
export async function deleteOwnedTrip(id,token) {
  try {await apiRequest(`/api/v1/trips/${encodeURIComponent(id)}`,{token,method:'DELETE'});}
  catch(error){if(error.status!==404)throw error;}
}
export function withoutTrip(items,id){return (items || []).filter(trip=>String(trip.id)!==String(id));}

export function restoreTrip(items,trip,index) {
  if(!trip || (items || []).some(item=>String(item.id)===String(trip.id)))return items || [];
  const restored=[...(items || [])];
  restored.splice(Math.min(Math.max(index,0),restored.length),0,trip);
  return restored;
}

/** Hide immediately; restore only this trip if the server rejects the operation. */
export async function optimisticDeleteTrip({id,token,read,publish,hiddenIds,request=deleteOwnedTrip}) {
  const items=read() || [];
  const index=items.findIndex(trip=>String(trip.id)===String(id));
  const trip=items[index];
  hiddenIds.add(String(id));
  publish(withoutTrip(items,id));
  try {await request(id,token);}
  catch(error){
    hiddenIds.delete(String(id));
    publish(restoreTrip(read(),trip,index).filter(item=>!hiddenIds.has(String(item.id))));
    throw error;
  }
}
