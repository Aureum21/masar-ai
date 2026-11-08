export const DURATION=12.8,CAPTURE_TIME=7.15;
export const STAGES=[
 {at:0,icon:'⌖',title:'Find your viewpoint',copy:'Walk to the waterfront and find an open view.'},
 {at:2.4,icon:'☀',title:'Catch the golden light',copy:'Watch the sky warm and the water catch the light.'},
 {at:4.8,icon:'▣',title:'Capture your sunset',copy:'Frame the sunset and take your photo.'},
 {at:8.7,icon:'↑',title:'Share the moment',copy:'Prepare the photo, capture time and location for review.'}
];
const ease=(a,b,t)=>{const n=Math.max(0,Math.min(1,(t-a)/(b-a)));return n*n*(3-2*n);};
export function sunsetAt(time){const t=Math.max(0,Math.min(DURATION,time)),stage=Math.max(0,STAGES.findLastIndex(s=>t>=s.at));return {stage,walk:ease(0,2.3,t),golden:ease(1.5,5.8,t),reach:ease(4.2,4.7,t),lift:ease(4.75,5.7,t),support:ease(5.0,5.65,t),review:ease(7.65,8.5,t),captured:t>=CAPTURE_TIME,complete:t>=11.1,upload:ease(8.9,10.8,t),checks:[t>=8.0,t>=8.3,t>=8.6],stageProgress:Math.max(0,Math.min(1,(t-STAGES[stage].at)/((STAGES[stage+1]?.at??11.1)-STAGES[stage].at))),sampleTime:t<5.8?'18:12':'18:24'};}
