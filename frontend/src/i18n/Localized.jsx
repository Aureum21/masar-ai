'use client';
import {Children,createElement} from 'react';
import {useI18n} from './LocaleProvider';

/** Translates presentation only; values, handlers, IDs, routes and stored data pass through. */
export function Localized({element,attributes=[],textChildren=false,...props}) {
  const {t}=useI18n();
  const translated={...props};
  for(const attribute of attributes)if(typeof props[attribute]==='string')translated[attribute]=t(props[attribute]);
  if(textChildren)translated.children=Children.map(props.children,child=>typeof child==='string'?t(child):child);
  if(typeof element==='string'&&['input','select','textarea'].includes(element)){
    translated.onInvalid=event=>{
      props.onInvalid?.(event);
      const input=event.currentTarget;
      if(input.validity.customError)return;
      const key=input.validity.valueMissing?'Please fill out this field.':input.validity.typeMismatch&&input.type==='email'?'Please enter a valid email address.':input.validity.tooShort?'Please enter a longer value.':'Please check the entered value.';
      input.setCustomValidity(t(key));
      input.dataset.masarInvalid=key;
    };
    translated.onInput=event=>{event.currentTarget.setCustomValidity('');delete event.currentTarget.dataset.masarInvalid;props.onInput?.(event);};
  }
  return createElement(element,translated);
}
/** @param {{message?: string, values?: unknown[], preserveValues?: boolean[], children?: import('react').ReactNode}} props */
export function LocalizedText({message,values,preserveValues,children}) {
  const {t}=useI18n();
  if(message!==undefined)return t(message,values,preserveValues);
  return Children.map(children,child=>typeof child==='string'?t(child):child);
}
export function LocalizedDate({value,options}) {
  const {formatDate}=useI18n();
  const date=value instanceof Date?value:new Date(value);
  return Number.isNaN(date.getTime())?'—':formatDate(date,options);
}
export function LocalizedNumber({value,options}) {
  const {formatNumber}=useI18n();
  return Number.isFinite(Number(value))?formatNumber(Number(value),options):'—';
}
