/** Account sync stores first-party trip choices and provider IDs only. */
const FIELDS=['start_date','end_date','origin','travellers','party_type','budget_tier','preferred_pace','interests','accessibility_needs','traveller_support','dietary_restrictions','flight_requirement','stay_requirement','flight_selection','stay_selection','challenges_enabled','custom_notes'];
export function planningDraft(draft) {
  return {version:1,id:draft.id||null,selections:draft.selections.map(({id,priority})=>({id,priority})),brief:Object.fromEntries(FIELDS.filter(key=>draft.brief[key]!==undefined).map(key=>[key,draft.brief[key]]))};
}
export function hasLocalChoices(draft){return Boolean(draft.id||draft.selections.length||Object.keys(draft.brief).length);}
export function accountConflict(draft,account){
  return Boolean(account?.draft&&hasLocalChoices(draft)&&(draft.id!==account.draft.id||draft.cloudRevision!==account.revision));
}
export function localAccountDraft(account){
  return {...account.draft,cloudRevision:account.revision,cloudUpdatedAt:account.updated_at,updatedAt:account.updated_at,savedAt:account.updated_at,unreadable:false};
}
