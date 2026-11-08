/** Keep the actual bundled landmark photo available if a private URL expires. */
export function placeImageSources(place) {
  return [...new Set([place?.images?.[0],place?.imageFallbacks?.[0],...(place?.imageAlternates||[])].filter(src=>typeof src==='string'&&src.length))];
}
export function availablePlaceImage(place,failed=[]) {
  return placeImageSources(place).find(src=>!failed.includes(src))||null;
}

/** Refresh metadata without letting empty media erase a working landmark photo. */
export function mergeResolvedPlaces(...groups) {
  const places=new Map();
  for(const place of groups.flat()) {
    const before=places.get(place.id);
    places.set(place.id,{
      ...before,...place,
      images:place.images?.length?place.images:before?.images||[],
      imageFallbacks:place.imageFallbacks?.length?place.imageFallbacks:before?.imageFallbacks||[],
      imageAlternates:[...new Set([...placeImageSources(before),...(place.imageAlternates||[])])]
    });
  }
  return [...places.values()];
}
