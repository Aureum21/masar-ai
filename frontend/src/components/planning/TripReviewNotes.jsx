
import {LocalizedText} from '@/i18n/Localized';
export default function TripReviewNotes({review}) {
  if(!review)return null;
  const omissions=review.omitted_optional||[];
  const warnings=review.warnings||[];
  return <details className="trip-review-notes"><summary><LocalizedText>{review.required_stops_checked===false?'Itinerary edited · review your schedule':review.required_stop_count?'Your must-visit selections were included':'Travel-date checks complete'}</LocalizedText><LocalizedText>{omissions.length?` · ${omissions.length} flexible ${omissions.length===1?'stop':'stops'} left out`:''}</LocalizedText><span><LocalizedText message={"View planning notes"} /></span></summary><div>{omissions.length>0&&<><h3><LocalizedText message={"Flexible stops left out"} /></h3><ul>{omissions.map(item=><li key={item.selection_id}><strong><LocalizedText>{item.name||'Selected place'}</LocalizedText></strong> — {item.reason}</li>)}</ul></>}{warnings.length>0&&<><h3><LocalizedText message={"Before you travel"} /></h3><ul>{warnings.map(item=><li key={item.code}><LocalizedText>{item.message}</LocalizedText></li>)}</ul></>}</div></details>;
}
