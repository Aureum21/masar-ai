/** Present the user's brief, not the instructions used to transport it. */
export function briefMessageSummary(content) {
  if(typeof content!=='string'||!(content.startsWith('[MASAR_TRIP_BRIEF]\n')||content.startsWith('Please plan my UAE trip using this brief. Ask for any essential missing information before researching. Do not make bookings or payments.')))return null;
  const line=name=>content.split('\n').find(value=>value.startsWith(`${name}: `))?.slice(name.length+2)||'';
  const clean=value=>value.replace(/\s*\([^)]*\)/g,'').replace(/\.$/,'');
  return ['Plan my UAE trip around this brief.',clean(line('Dates')),line('Travellers')&&`Travellers: ${line('Travellers')}`,`Must visit: ${clean(line('Must visit'))}`,`If time allows: ${clean(line('If time allows'))}`,'Use my trip preferences and clarify anything else you need.'].filter(Boolean).join('\n\n');
}
