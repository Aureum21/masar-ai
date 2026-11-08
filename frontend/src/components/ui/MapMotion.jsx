'use client';
import {useEffect} from 'react';
import {useMap} from 'react-leaflet';
import {useAccessibility} from '@/context/AccessibilityContext';
export default function MapMotion(){
  const map=useMap(),{reduced}=useAccessibility();
  useEffect(()=>{
    if(reduced)map.stop();
  },[map,reduced]);
  return null;
}
