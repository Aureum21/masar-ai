/** Provider content stays in React memory. Only provider IDs enter the saved brief. */
export function discoveryPayload({region,category,query,start,end}) {
  return {region,category,query:query.trim(),start_date:category==='events'&&start?start:null,end_date:category==='events'&&end?end:null};
}
export function mergeDiscoveryItems(previous,incoming=[]) {
  return [...new Map([...previous,...incoming].map(place=>[place.id,place])).values()];
}
