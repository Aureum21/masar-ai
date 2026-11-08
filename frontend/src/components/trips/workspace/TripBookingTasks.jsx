'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';

import SupportChecklist from './SupportChecklist';
import {useEffect,useState} from 'react';
import {Plane,Hotel,ShieldCheck,ArrowRight} from 'lucide-react';
import {apiRequest} from '@/lib/api';
import {bookingTerms} from '@/lib/bookingTerms';
import {useAuth} from '@/context/AuthContext';
import './trip-booking-tasks.css';

const emptyPerson=()=>({firstName:'',lastName:'',birthday:'',gender:'M',nationality:'',documentNumber:'',documentIssueCountry:'',documentExpiry:''});
const labelStatus={HELD:'Prebook received · review price',CONFIRMED:'Provider confirmed',PROCESSING:'Processing · do not submit again',UNKNOWN:'Confirmation needs checking · do not retry',FAILED:'Provider rejected this attempt',PENDING:'Awaiting provider confirmation'};

export default function TripBookingTasks({trip,onBooked}) {
  const {token}=useAuth();
  const choices=trip.itinerary_data?.travel_choices;
  if(!choices?.room&&!choices?.flight)return null;
  return <Localized element={"section"} attributes={["aria-label"]} className="trip-booking-tasks" aria-label="Day one booking tasks"><div className="trip-booking-heading"><span className="journey-eyebrow"><LocalizedText message={"DAY 1 / YOUR TRAVEL ESSENTIALS"} /></span><h3><LocalizedText message={"Turn your choices into reservations."} /></h3><p><LocalizedText message={"Prebook to check the latest price and terms. Book only when you are ready."} /></p></div><SupportChecklist trip={trip} token={token}/>{choices.flight&&<BookingTask key={`flight:${trip.id}`} kind="flight" trip={trip} selected={choices.flight} token={token} onBooked={onBooked}/>} {choices.room&&<BookingTask key={`hotel:${trip.id}`} kind="hotel" trip={trip} selected={choices.room} hotel={choices.hotel} token={token} onBooked={onBooked}/>}</Localized>;
}

function BookingTask({kind,trip,selected,hotel,token,onBooked}) {
  const flight=kind==='flight';const Icon=flight?Plane:Hotel;
  const [operations,setOperations]=useState([]);
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [open,setOpen]=useState(false);
  const [accepted,setAccepted]=useState(false);
  const [simulation,setSimulation]=useState(false);
  const [contact,setContact]=useState({firstName:'',lastName:'',email:'',phoneCountryCode:'',phoneNumber:''});
  const count=trip.itinerary_data?.travel_party_size||1;
  const [people,setPeople]=useState(()=>Array.from({length:count},emptyPerson));
  useEffect(()=>{
    if(!token)return;
    const abort=new AbortController();
    apiRequest(`/api/v1/trip-bookings/${trip.id}`,{token,signal:abort.signal,cache:'no-store'}).then(data=>{setOperations(data.operations||[]);setSimulation(data.simulation===true);if(data.travellers&&data.travellers!==count)setPeople(Array.from({length:data.travellers},emptyPerson));}).catch(e=>{if(!abort.signal.aborted)setError(e.message);});
    return()=>abort.abort();
  },[token,trip.id,count]);
  const hold=operations.find(x=>x.kind===kind+'_hold');
  const booking=operations.find(x=>x.kind===kind);
  const locked=booking&&['CONFIRMED','PROCESSING','UNKNOWN','PENDING','FAILED'].includes(booking.status);
  const canBook=hold?.status==='HELD'&&!locked&&(simulation||hold.payment_methods?.includes('ACC_CREDIT_CARD'));
  const title=flight?selected.airline:hotel?.name||'Your selected hotel';
  async function submit(event){
    event.preventDefault();if(busy)return;setBusy(true);setError('');
    try {
      const bookingStep=canBook;
      const payload=bookingStep?{kind,prebook_id:hold.prebook_id,...(simulation?{confirm_simulation:accepted}:{confirm_payment:accepted}),...(!flight?{contact,guest_names:people.map(p=>({firstName:p.firstName,lastName:p.lastName}))}:{})}:{kind,...(flight?{contact,passengers:people.map(p=>({...p,documentType:'passport',passengerType:0}))}:{})};
      const result=await apiRequest(`/api/v1/trip-bookings/${trip.id}/${bookingStep?'book':'prebook'}`,{token,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(bookingStep){
        const confirmation=result.confirmation;
        setOperations(previous=>[...previous.filter(x=>x.kind!==kind),{kind,...confirmation}]);
        if(confirmation?.status==='CONFIRMED')onBooked?.();
      }else{setOperations(previous=>[...previous.filter(x=>x.kind!==kind+'_hold'),result]);setAccepted(false);if(!flight)setOpen(true);}
    }catch(e){setError(e.message);apiRequest(`/api/v1/trip-bookings/${trip.id}`,{token,cache:'no-store'}).then(data=>{setOperations(data.operations||[]);setSimulation(data.simulation===true);if(data.travellers&&data.travellers!==count)setPeople(Array.from({length:data.travellers},emptyPerson));}).catch(()=>{});}
    finally{setBusy(false);}
  }
  const field=(key,label,type='text',extra={})=><label><span><LocalizedText>{label}</LocalizedText></span><input required type={type} value={contact[key]} onChange={e=>setContact({...contact,[key]:e.target.value})} {...extra}/></label>;
  const personField=(index,key,label,type='text',extra={})=><label><span><LocalizedText>{label}</LocalizedText></span><input required type={type} value={people[index][key]} onChange={e=>setPeople(previous=>previous.map((p,i)=>i===index?{...p,[key]:['nationality','documentIssueCountry'].includes(key)?e.target.value.toUpperCase():e.target.value}:p))} {...extra}/></label>;
  const status=booking||hold;
  return <article className="trip-booking-task"><div className="trip-booking-title"><span><Icon size={20}/></span><div><small><LocalizedText>{flight?'FLIGHT RESERVATION':'HOTEL RESERVATION'}</LocalizedText></small><h4><LocalizedText>{title}</LocalizedText></h4>{!flight&&<p>{selected.name}</p>}{trip.itinerary_data?.start_date&&<p>{trip.itinerary_data.start_date} → {trip.itinerary_data.end_date}</p>}{selected.environment==='sandbox'&&<p><LocalizedText message={"Provider test offer · sandbox"} /></p>}</div><div className="trip-booking-quote">{flight?selected.total_amount:selected.price} {selected.currency}<small><LocalizedText message={"Planning quote"} /></small></div></div>
    {simulation&&<p className="trip-booking-status"><LocalizedText message={"Developer sandbox · booking simulation · no card required"} /></p>}
    {status&&<p className="trip-booking-status" role="status"><LocalizedText>{status.status==='CONFIRMED'&&status.environment==='sandbox'?'Simulation confirmed by provider':labelStatus[status.status]||status.status}</LocalizedText><LocalizedText>{status.environment==='sandbox'?' · SANDBOX':''}</LocalizedText>{booking?.provider_reference?` · ${booking.provider_reference}`:''}</p>}
    {hold?.status==='HELD'&&<div className="trip-booking-current"><strong><LocalizedText message={"Current prebook price: ⟦0⟧  ⟦1⟧"} values={[hold.amount,hold.currency]} /></strong><ul className="trip-booking-terms">{bookingTerms(hold.terms).map((line,index)=><li key={index}>{line}</li>)}</ul>{!canBook&&!locked&&<p><LocalizedText message={"This offer requires a provider payment method that is not connected yet."} /></p>}</div>}
    {error&&<p className="trip-booking-error" role="alert"><LocalizedText>{error}</LocalizedText></p>}
    {!locked&&(!hold||hold.status==='HELD')&&<form onSubmit={submit}>
      {(!flight||!hold)&&<>{!open&&!hold&&<button type={flight?'button':'submit'} className="journey-btn subtle" disabled={busy} onClick={()=>{if(flight)setOpen(true);}}><LocalizedText>{busy?'Checking price…':flight?'Prebook flight · enter traveller details':'Prebook room · check current price'}</LocalizedText> <ArrowRight size={14}/></button>}
      {(open||(!flight&&canBook))&&<div className="trip-booking-form"><div className="trip-booking-inputs">{field('firstName','Contact first name')}{field('lastName','Contact last name')}{field('email','Email','email')}{field('phoneCountryCode','Calling code','tel',{placeholder:'971',pattern:'[+]?[0-9]{1,4}'})}{field('phoneNumber','Phone number','tel')}</div>{people.map((p,index)=><fieldset key={index}><legend><LocalizedText>{flight?'Traveller':'Guest'}</LocalizedText> {index+1}</legend><div className="trip-booking-inputs">{personField(index,'firstName','First name')}{personField(index,'lastName','Last name')}{flight&&<>{personField(index,'birthday','Date of birth','date')}<label><span><LocalizedText message={"Gender on document"} /></span><select value={p.gender} onChange={e=>setPeople(previous=>previous.map((person,i)=>i===index?{...person,gender:e.target.value}:person))}><Localized element="option" attributes={[]} textChildren value="M">Male</Localized><Localized element="option" attributes={[]} textChildren value="F">Female</Localized></select></label>{personField(index,'nationality','Nationality code','text',{placeholder:'AE',minLength:2,maxLength:2})}{personField(index,'documentNumber','Passport number')}{personField(index,'documentIssueCountry','Passport issuing country','text',{placeholder:'AE',minLength:2,maxLength:2})}{personField(index,'documentExpiry','Passport expiry','date')}</>}</div></fieldset>)}</div>}</>}
      {canBook&&<label className="trip-booking-consent"><input type="checkbox" required checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><span><LocalizedText>{simulation?'I confirm this sandbox booking simulation. No card is required and no real payment will be taken.':'I accept the current price and provider terms and authorize charging the provider account’s saved card:'}</LocalizedText> <strong>{hold.amount} {hold.currency}</strong></span></label>}
      {(canBook||(flight&&open&&!hold))&&<button type="submit" className="journey-btn gold" disabled={busy||(canBook&&!accepted)}><LocalizedText>{busy?'Waiting for provider…':canBook?(simulation?'Simulate booking':'Book and confirm payment'):'Prebook flight · review price'}</LocalizedText> <ShieldCheck size={15}/></button>}
    </form>}
    {['UNKNOWN','PROCESSING'].includes(status?.status)&&<p className="trip-booking-help"><LocalizedText message={"Check the existing provider attempt before retrying. No automatic second booking will be sent."} /></p>}
  </article>;
}
