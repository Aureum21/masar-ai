import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bookingTerms} from '../src/lib/bookingTerms.js';
import {getTripActivityImage,getTripActivityCategory} from '../src/utils/tripActivityImages.js';
test('provider cancellation JSON becomes readable text',()=>{
  const terms={cancelPolicyInfos:[],hotelRemarks:[],refundableTag:'NRFN'};
  assert.deepEqual(bookingTerms(terms),['Non-refundable rate.']);
  assert.deepEqual(bookingTerms(JSON.stringify(terms)),['Non-refundable rate.']);
  assert.doesNotMatch(bookingTerms(terms).join(' '),/refundableTag|cancelPolicyInfos|[{}]/);
});
test('refundability does not invent free cancellation and actual fees remain visible',()=>{
  const lines=bookingTerms({refundableTag:'RFN',cancelPolicyInfos:[{cancelTime:'2027-01-01 12:00:00',amount:250,currency:'AED',type:'amount',timezone:'GMT'}],hotelRemarks:['Bring photo identification.']});
  assert.match(lines.join(' '),/subject to/);assert.match(lines.join(' '),/250 AED/);assert.match(lines.join(' '),/GMT/);assert.doesNotMatch(lines.join(' '),/free/i);
  assert.match(bookingTerms({}).join(' '),/need confirmation/);
});
const hotel={hotelId:'h1',name:'Millennium Place Marina',imageUrl:'https://hotel-cdn.example/millennium.jpg'};
const trip={itinerary_data:{travel_choices:{hotel,room:{hotelId:'h1',imageUrl:'https://hotel-cdn.example/room.jpg'}}}};
test('selected hotel image overrides unrelated model image in check-in and route cards',()=>{
  const activity={title:'Check-in at Millennium Place Marina',image_url:'https://unrelated.example/mosque.jpg'};
  assert.equal(getTripActivityImage(activity,trip),hotel.imageUrl);
  assert.equal(getTripActivityCategory(activity,trip).label,'Your selected hotel');
});
test('missing hotel imagery uses a neutral placeholder, never a random landmark',()=>{
  const noImage={itinerary_data:{travel_choices:{hotel:{...hotel,imageUrl:null}}}};
  assert.equal(getTripActivityImage({title:'Check-in at Millennium Place Marina'},noImage),'/hotel-image-placeholder.svg');
  assert.equal(getTripActivityImage({hotelId:'h1',title:'Hotel arrival'},trip),hotel.imageUrl);
});
test('other attractions and different hotels retain their own images',()=>{
  const other={title:'Another hotel',hotelId:'h2',image_url:'https://other.example/hotel.jpg'};
  assert.equal(getTripActivityImage(other,trip),other.image_url);
  const attraction={title:'Sheikh Zayed Grand Mosque',image_url:'https://attraction.example/mosque.jpg'};
  assert.equal(getTripActivityImage(attraction,trip),attraction.image_url);
});
