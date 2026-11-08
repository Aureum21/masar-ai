import {getActivityImage,getActivityCategory} from './destinationImages.js';
const normalize=value=>typeof value==='string'?value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim():'';
function choices(trip){
  let data=trip?.itinerary_data;
  if(typeof data==='string'){try{data=JSON.parse(data);}catch{data=null;}}
  return data?.travel_choices||{};
}
function validImage(value){
  if(typeof value!=='string')return null;
  try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?value:null;}catch{return null;}
}
export function isSelectedHotelActivity(activity,trip){
  const hotel=choices(trip).hotel;
  if(!hotel)return false;
  const id=activity?.hotelId||activity?.hotel_id;
  if(id)return String(id)===String(hotel.hotelId);
  const title=normalize(activity?.title),name=normalize(hotel.name);
  if(name&&title.includes(name))return true;
  return /^(hotel check in|hotel check out|check in|check out|check in at (your|the) hotel|check into (your|the) hotel|overnight at (your|the) hotel)$/.test(title);
}
export function getTripActivityImage(activity,trip,dayIndex=0,activityIndex=0){
  if(!isSelectedHotelActivity(activity,trip))return getActivityImage(activity,dayIndex,activityIndex);
  const {hotel,room}=choices(trip);
  return validImage(hotel?.imageUrl)||validImage(hotel?.image_url)||
    (String(room?.hotelId)===String(hotel?.hotelId)?validImage(room?.imageUrl):null)||'/hotel-image-placeholder.svg';
}
export function getTripActivityCategory(activity,trip){
  return isSelectedHotelActivity(activity,trip)?{label:'Your selected hotel',icon:'🏨'}:getActivityCategory(activity);
}
