
import {useI18n} from '@/i18n/LocaleProvider';
import {formattingLocale} from '@/i18n/messages.mjs';

import {LocalizedText} from '@/i18n/Localized';
import {reservationBudget} from '@/lib/reservationBudget';

function BookingValue({group,simulation=false}){
  const {locale:uiLocale}=useI18n();

  return <div className="reservation-budget-value"><h3><LocalizedText>{simulation?'Simulated booking value':'Confirmed booking value'}</LocalizedText></h3><div className="budget-amount" style={{color:simulation?'var(--color-accent-gold)':'#34d399'}}>{group.totals.length?group.totals.map(item=><div key={item.currency}>{item.currency} {Number(item.amount).toLocaleString(formattingLocale(uiLocale, 'en-GB'),{minimumFractionDigits:2,maximumFractionDigits:6})}</div>):'Amount unavailable'}</div><p className="budget-note">{group.count} <LocalizedText>{simulation?'sandbox confirmation':'confirmed reservation'}</LocalizedText><LocalizedText>{group.count===1?'':'s'}</LocalizedText><LocalizedText>{simulation?' · Simulation only; no real payment.':'.'}</LocalizedText></p><ul className="reservation-budget-lines">{group.items.map(item=><li key={item.event_id||item.booking_id}><span><LocalizedText>{item.kind==='hotel'?'Hotel · full stay':'Flight booking'}</LocalizedText></span><strong><LocalizedText>{item.total_amount!==null?`${item.currency} ${Number(item.total_amount).toLocaleString(formattingLocale(uiLocale, 'en-GB'),{minimumFractionDigits:2,maximumFractionDigits:6})}`:'Amount unavailable'}</LocalizedText></strong></li>)}</ul>{group.items.some(item=>item.amount_source==='accepted_prebook')&&<p className="budget-note"><LocalizedText message={"Uses the price accepted at prebook when the booking response omits a total."} /></p>}{group.missing>0&&<p className="budget-note"><LocalizedText message={"⟦0⟧ reservation amount⟦1⟧ unavailable and excluded from the total."} values={[group.missing,group.missing===1?' is':'s are']} /></p>}</div>;
}
export default function ReservationBudgetCard({trip}){
  const budget=reservationBudget(trip.reservations||[],trip.id);
  return <div className="budget-summary-card">{budget.live.count>0&&<BookingValue group={budget.live}/>} {budget.sandbox.count>0&&<BookingValue group={budget.sandbox} simulation/>}{!budget.live.count&&!budget.sandbox.count&&<><h3><LocalizedText message={"Booked amount"} /></h3><div className="budget-amount"><LocalizedText message={"No confirmed bookings"} /></div><p className="budget-note"><LocalizedText message={"Booked prices appear here after the provider confirms. Selecting a room or prebooking alone does not count."} /></p></>}{budget.unverified>0&&<p className="budget-note"><LocalizedText message={"⟦0⟧ confirmation⟦1⟧ provider-environment verification."} values={[budget.unverified,budget.unverified===1?' needs':'s need']} /></p>}</div>;
}
