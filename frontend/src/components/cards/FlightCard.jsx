
import {useI18n} from '@/i18n/LocaleProvider';
import {formattingLocale} from '@/i18n/messages.mjs';

import {Localized,LocalizedText} from '@/i18n/Localized';
import React, { useState } from 'react';
import { PlaneTakeoff, Clock, ArrowRight } from 'lucide-react';
import './FlightCard.css';

export default function FlightCard({ flight, readOnly = false, onSelect, disabled=false }) {
  const {locale:uiLocale}=useI18n();

  const { offer_id, airline, airline_logo, total_amount, currency, slices } = flight;
  
  return (
    <div className="flight-card premium-hover">
      <div className="flight-card-header">
        <div className="flight-airline">
          {airline_logo ? (
            <Localized element={"img"} attributes={["alt"]}
              src={airline_logo} 
              alt={airline} 
              className="airline-logo-img" 
              onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
            />
          ) : (
            <PlaneTakeoff size={18} color="var(--color-accent)" />
          )}
          <span className="airline-name">{airline}{flight.environment==='sandbox'&&<small><LocalizedText message={" · Provider test offer"} /></small>}</span>
        </div>
        <div className="flight-price">
          {total_amount} {currency}
        </div>
      </div>
      
      <div className="flight-card-body">
        {(slices||[]).map((slice, idx) => (
          <div key={idx} className="flight-slice">
            <div className="slice-duration">
              <Clock size={14} />
              <span>{slice.duration?.replace('PT', '').replace('H', 'h ').replace('M', 'm') || slice.duration}</span>
            </div>
            
            <div className="segments-container">
              {(slice.segments||[]).map((seg, sIdx) => {
                const depTime = new Date(seg.departing_at).toLocaleTimeString(formattingLocale(uiLocale, []), { hour: '2-digit', minute: '2-digit' });
                const arrTime = new Date(seg.arriving_at).toLocaleTimeString(formattingLocale(uiLocale, []), { hour: '2-digit', minute: '2-digit' });
                const depDate = new Date(seg.departing_at).toLocaleDateString(formattingLocale(uiLocale, []), { month: 'short', day: 'numeric' });
                
                return (
                  <div key={sIdx} className="flight-segment">
                    <div className="segment-row">
                      <div className="segment-col">
                        <span className="segment-time">{depTime}</span>
                        <span className="segment-code">{seg.origin}</span>
                        <span className="segment-date">{depDate}</span>
                      </div>
                      <div className="segment-arrow">
                        <ArrowRight size={16} />
                      </div>
                      <div className="segment-col">
                        <span className="segment-time">{arrTime}</span>
                        <span className="segment-code">{seg.destination}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flight-card-footer">
        <span className="offer-id"><LocalizedText message={"ID: ⟦0⟧..."} values={[String(offer_id||'').substring(0, 15)]} /></span>
        {onSelect?<button type="button" className="flight-book-btn" disabled={disabled} onClick={()=>onSelect(flight)}><LocalizedText message={"Choose this flight"} /></button>:readOnly?<span><LocalizedText message={"Suggested flight · review before booking"} /></span>:<button className="flight-book-btn"><LocalizedText message={"Book Flight"} /></button>}
      </div>
    </div>
  );
}
