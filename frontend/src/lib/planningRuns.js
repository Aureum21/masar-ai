export const RUN_STATES = {
  queued: {title:'Your journey is in the queue.',label:'Request saved'},
  running: {title:'Connecting the dots.',label:'Research in progress'},
  awaiting_choice: {title:'Your choice shapes the journey.',label:'Waiting for your choice'},
  completed: {title:'Your next chapter, ready.',label:'Draft saved'},
  failed: {title:'Let’s give this another look.',label:'Research paused'},
  interrupted: {title:'Pick up where you left off.',label:'Request interrupted'},
  cancelled: {title:'Room to change your mind.',label:'Request cancelled'},
};
export const isActiveRun = run => ['queued','running'].includes(run?.status);
export function resultPath(run) {
  return run?.status==='completed'&&Number.isInteger(run.trip_id)&&run.trip_id>0?`/trips/${run.trip_id}`:null;
}
export function workerLabel(key) {
  return {event_result:'Places & experiences',logistics_result:'Routes & travel time',flight_result:'Flight options',accommodation_result:'Places to stay'}[key]||'Research';
}

export function researchStatus(result) {
  const content=result?.content||{};
  return {hasOptions:['flights','hotels','rooms','routes','events'].some(key=>Array.isArray(content[key])&&content[key].length>0)};
}
