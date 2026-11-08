// Keep the authored poses/contact physics intact while cutting idle dwell.
// Entries pair wall-clock seconds with original choreography seconds.
export const JOURNEY_DURATION=10.5;
export const CHOREOGRAPHY_DURATION=19;
export const JOURNEY_KEYS=[[0,0],[2.1,3],[3.8,5.5],[4.8,7.5],[5.5,10],[7.7,13],[9.3,16],[10.5,19]];
function map(value,input,output){
  value=Math.max(0,Math.min(JOURNEY_KEYS.at(-1)[input],value));
  for(let i=1;i<JOURNEY_KEYS.length;i++){
    const a=JOURNEY_KEYS[i-1],b=JOURNEY_KEYS[i];
    if(value<=b[input])return a[output]+(b[output]-a[output])*(value-a[input])/(b[input]-a[input]);
  }
  return JOURNEY_KEYS.at(-1)[output];
}
export const choreographyTime=seconds=>map(seconds,0,1);
export const playbackTime=seconds=>map(seconds,1,0);
