'use client';
import {createContext, useContext} from 'react';

const Context = createContext({reduced: false, mode: 'full', setMode: () => {}});

export function AccessibilityProvider({children}){
  return <Context.Provider value={{mode: 'full', reduced: false, setMode: () => {}}}>{children}</Context.Provider>;
}

export const useAccessibility = () => useContext(Context);

export function MotionControls(){
  return null;
}
