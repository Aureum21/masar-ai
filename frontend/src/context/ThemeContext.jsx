'use client';
import {createContext,useContext,useEffect,useSyncExternalStore} from 'react';
import {useHydrated} from '@/hooks/useHydrated';
const ThemeContext=createContext({theme:'dark',toggleTheme:()=>{},isDark:true,mounted:false});
const event='masar:theme-change';
const snapshot=()=>{try{return localStorage.getItem('masar_theme')==='light'?'light':'dark';}catch{return 'dark';}};
function subscribe(listener) {
  window.addEventListener('storage',listener);window.addEventListener(event,listener);
  return ()=>{window.removeEventListener('storage',listener);window.removeEventListener(event,listener);};
}
export function ThemeProvider({children}) {
  const theme=useSyncExternalStore(subscribe,snapshot,()=> 'dark');
  const mounted=useHydrated();
  useEffect(()=>{
    document.documentElement.setAttribute('data-theme',theme);
    document.documentElement.classList.toggle('theme-light',theme==='light');
  },[theme]);
  function toggleTheme() {
    localStorage.setItem('masar_theme',theme==='dark'?'light':'dark');window.dispatchEvent(new Event(event));
  }
  return <ThemeContext.Provider value={{theme,toggleTheme,isDark:theme==='dark',mounted}}>{children}</ThemeContext.Provider>;
}
export const useTheme=()=>useContext(ThemeContext);
