import {loadDictionary} from '@/i18n/loadDictionary';
import {LOCALES} from '@/i18n/messages.mjs';

/** Same-origin static UI copy for standalone vanilla-JS experiences. No translation service. */
export async function GET(request){
  const locale=new URL(request.url).searchParams.get('locale')||'en';
  if(!LOCALES.includes(locale))return Response.json({error:'Unsupported locale'},{status:400});
  return Response.json(await loadDictionary(locale),{headers:{'Cache-Control':'public, max-age=0, must-revalidate'}});
}
