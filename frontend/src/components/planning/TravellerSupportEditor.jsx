'use client';
import {useState} from 'react';
import {SUPPORT_OPTIONS,validSupport} from '@/lib/supportNeeds';
import {LocalizedText} from '@/i18n/Localized';
import {User,ArrowRight} from 'lucide-react';
import './accessibility.css';

export default function TravellerSupportEditor({value=[],travellers=1,onChange,error,personal=false}) {
  const count=Number.isInteger(Number(travellers))?Math.min(50,Math.max(1,Number(travellers))):1;
  const [selectedTraveller,setSelectedTraveller]=useState(1);
  const activeNumber=Math.min(count,Math.max(1,selectedTraveller));

  // Keep editable out-of-range limits visible while someone types a new number.
  const malformed=!Array.isArray(value)||!value.every(item=>item&&validSupport([{...item,max_walk_m:null,rest_every_minutes:null,rest_minutes:null}]));
  const rows=malformed?[]:value;
  const outside=rows.filter(item=>item.traveller>count);

  function edit(number,patch){
    const current=rows.find(item=>item.traveller===number)||{traveller:number,needs:[],essential:[]};
    onChange([...rows.filter(item=>item.traveller!==number),{...current,...patch}].sort((a,b)=>a.traveller-b.traveller));
  }

  const getNeedsCount=num=>{
    const item=rows.find(r=>r.traveller===num);
    const needsCount=item?.needs?.length||0;
    const hasLimits=Boolean(item?.max_walk_m||item?.rest_every_minutes||item?.rest_minutes);
    return needsCount+(hasLimits?1:0);
  };

  const currentItem=rows.find(row=>row.traveller===activeNumber)||{traveller:activeNumber,needs:[],essential:[]};

  return <section className="support-editor" aria-label="Traveller support" tabIndex={-1} data-support-error={Boolean(error)} aria-describedby={error?'support-error':undefined}>
    <div className="support-editor-header">
      <h2><LocalizedText>Travel support</LocalizedText></h2>
      <p><LocalizedText>Choose the support that helps you travel. No diagnosis is needed. Mark a need essential when the trip must accommodate it.</LocalizedText></p>
    </div>

    {malformed&&<p role="alert">Saved support settings need review. Choose your support again before saving.</p>}
    {outside.length>0&&<div role="alert"><p>Support is still assigned to travellers outside the new party size. Restore the party size or remove those assignments.</p><button type="button" onClick={()=>onChange(rows.filter(item=>item.traveller<=count))}>Remove assignments for travellers {outside.map(item=>item.traveller).join(', ')}</button></div>}

    {!personal&&count>1&&(
      <div className="support-traveller-tabs" role="tablist" aria-label="Select traveller to configure support">
        {Array.from({length:count},(_,index)=>index+1).map(number=>{
          const isSelected=number===activeNumber;
          const countNum=getNeedsCount(number);
          return (
            <button
              type="button"
              key={number}
              role="tab"
              aria-selected={isSelected}
              onClick={()=>setSelectedTraveller(number)}
              className={`support-traveller-tab ${isSelected?'is-active':''} ${countNum>0?'has-needs':''}`}
            >
              <User size={13}/>
              <span><LocalizedText message={"Traveller ⟦0⟧"} values={[number]} /></span>
              {countNum>0&&<span className="support-needs-badge" aria-label={`${countNum} support settings configured`}>{countNum}</span>}
            </button>
          );
        })}
      </div>
    )}

    <fieldset key={activeNumber}>
      <legend>
        {personal ? 'My support defaults' : (
          <span className="support-legend-content">
            <span>{`Traveller ${activeNumber}`}</span>
            {count>1&&<span className="support-legend-badge">{`Traveller ${activeNumber} of ${count}`}</span>}
          </span>
        )}
      </legend>
      <div className="support-choices">
        {SUPPORT_OPTIONS.map(([code,label])=>(
          <div key={code}>
            <label>
              <input
                type="checkbox"
                checked={currentItem.needs.includes(code)}
                onChange={event=>edit(activeNumber,{
                  needs:event.target.checked?[...currentItem.needs,code]:currentItem.needs.filter(need=>need!==code),
                  essential:currentItem.essential.filter(need=>need!==code)
                })}
              />
              <LocalizedText>{label}</LocalizedText>
            </label>
            <label className="support-essential">
              <input
                type="checkbox"
                disabled={!currentItem.needs.includes(code)}
                checked={currentItem.essential.includes(code)}
                aria-label={`${label} essential for traveller ${activeNumber}`}
                onChange={event=>edit(activeNumber,{
                  essential:event.target.checked?[...currentItem.essential,code]:currentItem.essential.filter(need=>need!==code)
                })}
              />
              <LocalizedText>Essential</LocalizedText>
            </label>
          </div>
        ))}
      </div>
      <div className="support-limits">
        {[
          ['max_walk_m','Maximum walking distance per stop (metres)',10,20000],
          ['rest_every_minutes','Rest at least every (minutes)',10,240],
          ['rest_minutes','Length of each rest (minutes)',5,120]
        ].map(([key,label,min,max])=>(
          <label key={key}>
            <LocalizedText>{label}</LocalizedText>
            <input
              type="number"
              min={min}
              max={max}
              step="1"
              value={currentItem[key]??''}
              placeholder="Not specified"
              onChange={event=>edit(activeNumber,{[key]:Number.isFinite(event.target.valueAsNumber)?event.target.valueAsNumber:null})}
            />
          </label>
        ))}
      </div>
      <div className="support-card-actions">
        <button
          type="button"
          className="support-clear-btn"
          onClick={()=>onChange(rows.filter(row=>row.traveller!==activeNumber))}
        >
          <LocalizedText>Clear support for this traveller</LocalizedText>
        </button>
        {!personal&&count>1&&activeNumber<count&&(
          <button
            type="button"
            className="support-next-traveller-btn"
            onClick={()=>setSelectedTraveller(activeNumber+1)}
          >
            <span><LocalizedText message={"Configure Traveller ⟦0⟧"} values={[activeNumber+1]} /></span> <ArrowRight size={13}/>
          </button>
        )}
      </div>
    </fieldset>

    {error&&<p id="support-error" role="alert">{error}</p>}
  </section>;
}
