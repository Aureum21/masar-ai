"""Read-only LiteAPI flight search shared by chat and trip planning."""
import os,re,calendar
from datetime import date,datetime,timezone
import requests

def search(origin,destination,departure_date,return_date=None,passengers=1,cabin_class='economy'):
    origin=origin.strip().upper();destination=destination.strip().upper()
    if not re.fullmatch('[A-Z]{3}',origin) or not re.fullmatch('[A-Z]{3}',destination) or origin==destination:
        return {'error':'Choose different origin and destination airport/city IATA codes (for example LHR and DXB).','offers':[]}
    try:
        today=datetime.now(timezone.utc).date();month=today.month+11;year=today.year+(month-1)//12;month=(month-1)%12+1
        latest=date(year,month,min(today.day,calendar.monthrange(year,month)[1]))
        outbound=date.fromisoformat(departure_date);inbound=date.fromisoformat(return_date) if return_date else None
        if outbound<today or outbound>latest or (inbound and (inbound<outbound or inbound>latest)):raise ValueError()
    except (ValueError,TypeError):return {'error':'Flight dates must be valid, in order, and within the provider’s next 11 months.','offers':[]}
    cabin=cabin_class.upper()
    if cabin not in {'ECONOMY','PREMIUM_ECONOMY','BUSINESS','FIRST'} or type(passengers) is not int or not 1<=passengers<=50:
        return {'error':'Choose a supported cabin and valid adult traveller count.','offers':[]}
    key=os.getenv('NUTIEE_API_KEY')
    if not key:return {'error':'Flight search is not configured on the server.','offers':[]}
    legs=[{'origin':origin,'destination':destination,'date':departure_date,'direction':'OUTBOUND'}]
    if return_date:legs.append({'origin':destination,'destination':origin,'date':return_date,'direction':'INBOUND'})
    try:
        response=requests.post('https://api.liteapi.travel/v3.0/flights/rates',headers={'X-API-Key':key,'Accept':'application/json','Content-Type':'application/json'},json={'legs':legs,'adults':passengers,'cabinClass':cabin,'currency':'AED'},timeout=25)
        response.raise_for_status();data=response.json()
        if data.get('error'):
            code=data['error'].get('code') if isinstance(data['error'],dict) else None
            return {'error':'The flight provider could not complete this route/date search'+(f' (code {code}).' if isinstance(code,int) else '.'),'offers':[]}
        batches=data.get('data') or [];batches=batches if isinstance(batches,list) else [batches]
        offers=[]
        for batch in batches:
            for journey in batch.get('journeys',[]):
                segments=journey.get('segments') or [];carrier=(segments[0].get('carrier') or {}) if segments else {}
                slices=[]
                for direction in ['OUTBOUND','INBOUND']:
                    group=[s for s in segments if (s.get('direction') or 'OUTBOUND')==direction]
                    if group:
                        duration=next((d.get('duration',{}).get('iso8601') for d in journey.get('legDurations',[]) if d.get('direction')==direction),None)
                        slices.append({'duration':duration or (journey.get('totalDuration') or {}).get('iso8601'),'segments':[{'origin':s.get('originCode'),'destination':s.get('destinationCode'),'departing_at':s.get('departureTime'),'arriving_at':s.get('arrivalTime'),'airline':(s.get('carrier') or {}).get('marketingName')} for s in group]})
                for offer in journey.get('offers',[])[:5]:
                    price=(offer.get('pricing') or {}).get('display') or {}
                    if not offer.get('offerId'):continue
                    offers.append({'offer_id':offer['offerId'],'total_amount':price.get('total'),'currency':price.get('currency'),'airline':carrier.get('marketingName') or 'Provider airline','airline_logo':carrier.get('marketingLogo'),'slices':slices,'environment':'sandbox' if key.startswith('sand_') else 'unknown','expiration':offer.get('expiration')})
        return {'offers':offers[:10]} if offers else {'offers':[],'error':'No flight offers were returned for these dates and route. Try another date or airport.'}
    except requests.HTTPError as error:
        status=error.response.status_code if error.response is not None else 0
        message={401:'Flight provider credentials were rejected.',403:'Flight access is not enabled for this provider account.',429:'Flight provider rate limit reached. Please wait before retrying.'}.get(status,'Flight provider request failed. Check the route, dates and provider access.')
        return {'error':message,'offers':[]}
    except (requests.RequestException,ValueError,TypeError,AttributeError):return {'error':'Flight search is temporarily unavailable. No offer was confirmed.','offers':[]}
