export const DURATION=14.5;
export const STAGES=[
 {at:0,icon:'⌖',title:'Find your landmark',copy:'Arrive and take a moment to look around.'},
 {at:2,icon:'◇',title:'Discover three details',copy:'Follow the highlights. Capture each discovery.'},
 {at:9,icon:'?',title:'A little local knowledge',copy:'Answer a question about what you discovered.'},
 {at:11.7,icon:'↑',title:'Share your discoveries',copy:'Prepare your photos and quiz result for review.'}
];
export const LANDMARKS=[
 {id:'burj',name:'Burj Khalifa',city:'DUBAI',chapter:'01',subtitle:'A skyline icon, seen differently.',color:'#a7cedd',
  details:[{title:'Three-wing footprint',copy:'Look for the tower’s three wings at its base.',target:[0,1.4,0]},{title:'Spiralling setbacks',copy:'Follow the tiers as they step inward around the tower.',target:[.2,5.2,0]},{title:'Slender spire',copy:'Trace the silhouette to its needle-like finish.',target:[0,9.45,0]}],
  question:'Which shape underlies the tower’s floor plan?',answers:['A Y shape','A square','A circle'],correct:0,explanation:'Three wings form its distinctive Y-shaped plan.',source:'https://www.burjkhalifa.ae/the-tower/architecture-design/'},
 {id:'future',name:'Museum of the Future',city:'DUBAI',chapter:'02',subtitle:'Read the architecture of tomorrow.',color:'#b8c6da',
  details:[{title:'Calligraphic facade',copy:'Notice the Arabic lettering across the silver exterior.',target:[2.4,3.25,.9]},{title:'The open centre',copy:'Find the void framed by the curved building.',target:[-.65,2.52,0]},{title:'The green mound',copy:'Look at the planted hill beneath the building.',target:[1,.65,1.2]}],
  question:'What does the building’s open centre represent?',answers:['The ocean','The unknown future','A desert oasis'],correct:1,explanation:'The void represents the unknown future.',source:'https://museumofthefuture.ae/en/the-building'},
 {id:'mosque',name:'Sheikh Zayed Grand Mosque',city:'ABU DHABI',chapter:'03',subtitle:'Find the detail in a place of reflection.',color:'#ebd9ae',
  details:[{title:'White domes',copy:'Observe the curved domes and their golden finials.',target:[0,3.3,-.4]},{title:'Palm-inspired columns',copy:'Look for golden capitals inspired by date palms.',target:[-2.3,1.8,1.65]},{title:'Reflective pools',copy:'Notice how the surrounding water reflects the architecture.',target:[2.6,.13,2.5]}],
  question:'What inspired the exterior column design?',answers:['Sailing boats','Desert dunes','Date palms'],correct:2,explanation:'The columns draw inspiration from date palms.',source:'https://www.szgmc.gov.ae/en/islamic-architecture/The%20Columns'}
];
export const CAPTURE_TIMES=[3.5,5.7,7.9];
export function journeyAt(t){
 t=Math.max(0,Math.min(DURATION,t));
 const stage=Math.max(0,STAGES.findLastIndex(s=>t>=s.at));
 return {stage,detail:t<2?-1:Math.min(2,Math.floor((t-2)/2.2)),count:CAPTURE_TIMES.filter(at=>t>=at).length,quiz:t>=9,answered:t>=10.6,complete:t>=13.2,upload:Math.max(0,Math.min(1,(t-11.7)/1.5)),stageProgress:Math.max(0,Math.min(1,(t-STAGES[stage].at)/((STAGES[stage+1]?.at??13.2)-STAGES[stage].at)))};
}
