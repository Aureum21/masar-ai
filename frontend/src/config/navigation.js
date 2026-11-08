import {featureFlags} from './featureFlags.js';
export const APP_HOME=featureFlags.exploreFirst?'/explore':'/chat';
/** Restrict login redirects to local application routes. */
export function safeAppRedirect(value) {
  if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return APP_HOME;
  try {
    const url=new URL(value,'https://masar.local');
    if(url.origin!=='https://masar.local'||!/^\/(explore|trips|challenges|rewards|chat|plan|profile|preferences|onboarding)(\/|$)/.test(url.pathname))return APP_HOME;
    return url.pathname+url.search+url.hash;
  }catch{return APP_HOME;}
}
