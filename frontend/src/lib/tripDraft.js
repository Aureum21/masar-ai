/** Local-first trip brief. No tokens, bookings or reward claims are stored here. */
export const DRAFT_VERSION = 1;
export const MAX_PLACES = 30;
export const REQUIREMENTS = ['unknown', 'needed', 'already_arranged', 'not_needed'];
import {validSupport} from './supportNeeds.js';
export {SUPPORT_OPTIONS} from './supportNeeds.js';
export const emptyDraft = () => ({version:1,id:null,selections:[],brief:{},updatedAt:null,savedAt:null});
export const draftKey = owner => `masar:trip-draft:v1:user:${owner}`;

export function parseDraft(raw) {
  if (!raw) return emptyDraft();
  try {
    const value = JSON.parse(raw);
    if (value?.version !== DRAFT_VERSION || !Array.isArray(value.selections) || !value.brief || typeof value.brief !== 'object' || Array.isArray(value.brief)) throw Error();
    for(const field of ['interests','accessibility_needs','dietary_restrictions']) {
      if(value.brief[field]!==undefined&&(!Array.isArray(value.brief[field])||!value.brief[field].every(item=>typeof item==='string')))throw Error();
    }
    if(value.brief.traveller_support!==undefined && !validSupport(value.brief.traveller_support)) throw Error();
    const ids = new Set();
    const selections = value.selections.filter(item => {
      if (!item || typeof item.id !== 'string' || !['must_visit','optional'].includes(item.priority) || ids.has(item.id)) return false;
      ids.add(item.id); return true;
    }).slice(0,MAX_PLACES);
    return {...emptyDraft(),...value,selections};
  } catch { return {...emptyDraft(),unreadable:true}; }
}

export function togglePlace(draft,id) {
  const exists = draft.selections.some(item => item.id === id);
  if (!exists && draft.selections.length >= MAX_PLACES) throw new Error(`Your shortlist can hold up to ${MAX_PLACES} places.`);
  return {...draft,savedAt:null,selections:exists ? draft.selections.filter(item=>item.id!==id) : [...draft.selections,{id,priority:'must_visit'}]};
}

/** Add without toggling an already saved destination or changing its priority. */
export function addPlace(draft,id,priority='optional') {
  if (draft.selections.some(item=>item.id===id)) return draft;
  if (draft.selections.length >= MAX_PLACES) throw new Error(`Your shortlist can hold up to ${MAX_PLACES} places.`);
  return {...draft,savedAt:null,selections:[...draft.selections,{id,priority}]};
}

export function setPriority(draft,id,priority) {
  if (!['must_visit','optional'].includes(priority)) throw new Error('Choose a valid priority.');
  return {...draft,savedAt:null,selections:draft.selections.map(item=>item.id===id?{...item,priority}:item)};
}

export function profileBrief(preferences={}) {
  preferences = preferences && typeof preferences === 'object' && !Array.isArray(preferences) ? preferences : {};
  const pace = preferences.preferred_pace || 'Balanced';
  const list=value=>Array.isArray(value)?value.filter(item=>typeof item==='string'):typeof value==='string'?[value]:[];
  return {
    start_date:'',end_date:'',origin:'',travellers:1,party_type:preferences.party_type||'Solo',
    budget_tier:preferences.budget_tier||'Standard',preferred_pace:pace,
    interests:list(preferences.interests||preferences.vibes),
    accessibility_needs:list(preferences.accessibility_needs),
    traveller_support:preferences.personal_support&&validSupport([{...preferences.personal_support,traveller:1}],1)?[structuredClone({...preferences.personal_support,traveller:1})]:[],
    dietary_restrictions:list(preferences.dietary_restrictions||preferences.dietary),
    flight_requirement:'unknown',stay_requirement:'unknown',flight_selection:'user',stay_selection:'user',challenges_enabled:true,custom_notes:preferences.custom_notes||''
  };
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value||'')) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0,10)===value;
}

export const planningToday = () => new Date().toISOString().slice(0,10);

export function validateBrief(brief, today=planningToday()) {
  const errors={};
  if (!validDate(brief.start_date)) errors.start_date='Choose your arrival date.';
  if (!validDate(brief.end_date)) errors.end_date='Choose your departure date.';
  if (!errors.start_date && brief.start_date<today) errors.start_date='Arrival is in the past. Choose today or a future date.';
  if (!errors.start_date && !errors.end_date && brief.end_date<brief.start_date) errors.end_date='Departure must be on or after arrival.';
  if (!Number.isInteger(Number(brief.travellers)) || Number(brief.travellers)<1 || Number(brief.travellers)>50) errors.travellers='Choose between 1 and 50 travellers.';
  if (!REQUIREMENTS.includes(brief.flight_requirement)) errors.flight_requirement='Choose a flight preference.';
  if (!REQUIREMENTS.includes(brief.stay_requirement)) errors.stay_requirement='Choose an accommodation preference.';
  if (brief.stay_requirement==='needed' && brief.start_date===brief.end_date) errors.end_date='Choose at least one overnight stay for accommodation.';
  if (brief.flight_requirement==='needed' && !String(brief.origin||'').trim()) errors.origin='Where will you be travelling from?';
  const support=brief.traveller_support===undefined?[]:brief.traveller_support;
  if (!validSupport(support,Number(brief.travellers))) errors.traveller_support='Review support needs for each traveller.';
  return errors;
}

export function planningPrompt(draft,places) {
  const brief=draft.brief;
  if (Object.keys(validateBrief(brief)).length) throw new Error('Complete your trip dates and travel details first.');
  const selected=draft.selections.map(item=>({...item,place:places.find(p=>p.id===item.id)})).filter(item=>item.place);
  if (selected.length!==draft.selections.length) throw new Error('Review an unavailable place in your shortlist first.');
  const line=priority=>selected.filter(item=>item.priority===priority).map(({place})=>place.provider ? `${place.id} (resolve this provider reference before planning)` : `${place.title} (${place.id}; ${place.neighborhood})`).join('; ')||'Let MASAR suggest places';
  const support=(brief.traveller_support||[]).map(item=>`Traveller ${item.traveller}: ${item.needs.join(', ')}; essential: ${item.essential.join(', ')||'none'}; walking limit: ${item.max_walk_m??'not specified'} m; rests every ${item.rest_every_minutes??'not specified'} minutes for ${item.rest_minutes??'not specified'} minutes`).join('; ');
  return `[MASAR_TRIP_BRIEF]\nPlease plan my UAE trip using this brief. Ask for any essential missing information before researching. Do not make bookings or payments.\nDates: ${brief.start_date} to ${brief.end_date} (Asia/Dubai).\nTravellers: ${brief.travellers}; party: ${brief.party_type}.\nStarting from: ${brief.origin||'Ask if needed'}.\nFlights: ${brief.flight_requirement}. Accommodation: ${brief.stay_requirement}. Search flights or hotels only when needed; unknown means clarify first.\nBudget: ${brief.budget_tier}. Pace: ${brief.preferred_pace}.\nInterests: ${(brief.interests||[]).join(', ')||'Ask me'}.\nAccessibility: ${(brief.accessibility_needs||[]).join(', ')||'Not specified'}. Per-traveller support: ${support||'Not specified'}. Never treat unknown accessibility or an accessible hotel listing as confirmation of a specific room or service. Arrange rests and realistic walking distances. Request flight assistance from the airline. Dietary preferences: ${(brief.dietary_restrictions||[]).join(', ')||'Not specified'}.\nMust visit: ${line('must_visit')}.\nIf time allows: ${line('optional')}.\nOptional discovery challenges: ${brief.challenges_enabled?'Suggest only supported experiences when suitable':'Do not include challenges'}. Landmark capture is supported only at Burj Khalifa, Museum of the Future and Sheikh Zayed Grand Mosque. Boxing/bowling require a verified matching facility in a mall; sunset requires a suitable accessible beach and actual sunset window. Never invent eligibility, awards or confirmed availability.\nAdditional wishes: ${brief.custom_notes||'None'}.\nKeep selected ticket products distinct from the landmark. Verify dates, opening times, prices and travel gaps. Save the completed itinerary to My Trips.`;
}
