import test from 'node:test';
import assert from 'node:assert/strict';
import {availablePlaceImage,placeImageSources,mergeResolvedPlaces} from '../src/lib/placeImages.js';
import {rememberCatalogue,recalledCatalogue} from '../src/lib/catalogueSnapshot.js';

test('expired private landmark URL falls back to that landmark’s bundled photo',()=>{
  const place={images:['https://private.example/landmark?signed=expired'],imageFallbacks:['/attraction-photos/landmark.webp']};
  assert.equal(availablePlaceImage(place),place.images[0]);
  assert.equal(availablePlaceImage(place,[place.images[0]]),place.imageFallbacks[0]);
  assert.equal(availablePlaceImage(place,[...place.images,...place.imageFallbacks]),null);
});
test('a failed bundled primary is not retried indefinitely',()=>{
  const place={images:['/attraction-photos/landmark.webp'],imageFallbacks:['/attraction-photos/landmark.webp']};
  assert.equal(placeImageSources(place).length,1);
  assert.equal(availablePlaceImage(place,place.images),null);
});
test('already loaded catalogue details remain available only to the matching session',()=>{
  const places=[{id:'mall',title:'Actual mall',images:['/attraction-photos/mall.webp']}];
  rememberCatalogue('session-a',places);
  assert.deepEqual(recalledCatalogue('session-a'),places);
  assert.deepEqual(recalledCatalogue('session-b'),[]);
  assert.deepEqual(recalledCatalogue(null),[]);
});

test('catalogue records without photos cannot erase working shortlist photos',()=>{
  const [place]=mergeResolvedPlaces([{id:'museum',title:'Museum',images:['working.jpg']}],[{id:'museum',title:'Refreshed museum',images:[]}]);
  assert.equal(place.title,'Refreshed museum');
  assert.equal(availablePlaceImage(place),'working.jpg');
});
test('a failed refreshed photo retains the previous working photo as a backup',()=>{
  const [place]=mergeResolvedPlaces([{id:'museum',images:['working.jpg']}],[{id:'museum',images:['expired.jpg'],imageFallbacks:['missing.webp']}]);
  assert.equal(availablePlaceImage(place,['expired.jpg','missing.webp']),'working.jpg');
});
