
import {Localized,LocalizedText} from '@/i18n/Localized';
const palettes = {
  heritage: ['#F59E0B', '#1E1810'], 
  discovery: ['#38BDF8', '#101C26'], 
  creative: ['#E879F9', '#201228'],
  adventure: ['#FBBF24', '#221A0E'], 
  nature: ['#34D399', '#0E2218'], 
  connection: ['#FB923C', '#241610'],
};

export default function StampArt({ stamp = {}, size = 112, locked = false }) {
  const category = stamp.category || 'discovery';
  const [ink, paper] = locked ? ['#64748B', '#12141A'] : palettes[category] || palettes.discovery;
  const boxing=stamp.challenge_key==='boxing'||/boxing|beat 600/i.test(stamp.title||'');
  const bowling=stamp.challenge_key==='bowling'||/bowling|strike/i.test(stamp.title||'');
  const maritime = /maritime|boat|pearl|dhow|sea/.test(`${stamp.design} ${stamp.title}`.toLowerCase());
  return (
    <Localized element={"svg"} attributes={["aria-label"]} width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`${locked ? 'Locked ' : ''}${stamp.title || category} stamp`} style={{ flexShrink: 0, maxWidth: '100%' }}>
      <path d="M60 4 68 9 78 7 84 15 95 16 98 27 108 32 107 44 115 52 110 62 114 73 105 80 103 92 92 96 86 106 74 105 65 114 55 109 44 113 36 104 24 102 21 91 11 85 12 73 5 64 10 54 6 43 15 35 17 23 28 20 35 10 47 11Z" fill={paper} stroke={ink} strokeWidth="1.7" />
      <circle cx="60" cy="59" r="43" fill="none" stroke={ink} strokeWidth="1.2" />
      <circle cx="60" cy="59" r="38" fill="none" stroke={ink} strokeWidth=".6" strokeDasharray="1 3" />
      <g fill="none" stroke={ink} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {boxing ? <><path d="M37 31h46v20H37Z M40 51v33m40-33v33 M34 85h52v6H34Z M60 51v7"/><path d="M60 57c-10 0-13 10-10 18 2 6 5 8 10 8s8-2 10-8c3-8 0-18-10-18Z" fill={ink} fillOpacity=".13"/><path d="M51 67q9 5 18 0 M51 75q9 5 18 0" strokeWidth=".8"/><text x="60" y="44" fill={ink} stroke="none" fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="monospace">600+</text></> : bowling ? <><path d="M71 31q-6 0-5 7l2 7q-12 14-10 30l4 9h20l4-9q2-16-10-30l2-7q1-7-7-7Z M66 47h11m-12 5h14"/><circle cx="45" cy="71" r="16" fill={paper}/><circle cx="43" cy="64" r="2"/><circle cx="48" cy="68" r="2"/><circle cx="41" cy="70" r="2"/></> : stamp.design === 'arch' ? <><path d="M31 82V52q29-47 58 0v30 M42 82V54q18-30 36 0v28 M27 83h66 M31 57h10m-10 12h10m38-12h10m-10 12h10" /><path d="M50 80V62q10-17 20 0v18" /></> : stamp.design === 'sun' ? <><circle cx="60" cy="54" r="17" /><path d="M60 28v-5m0 57v-5M34 54h-5m62 0h-5M42 36l-4-4m44 44-4-4m0-36 4-4M38 76l4-4M30 86q15-6 30 0t30 0" /></> : maritime ? <><path d="M30 65h61l-13 12H44Z M59 32v33 M56 35 36 59h20Z M63 38l20 21H63Z M31 83q7-6 14 0t14 0 14 0 14 0" /><circle cx="85" cy="34" r="4" /></> : category === 'heritage' ? <><path d="M33 77V49h54v28 M40 49V35h12v14 M68 49V35h12v14 M39 34v-5m7 5v-5m7 5v-5m14 5v-5m7 5v-5m7 5v-5 M54 77V64q6-10 12 0v13 M29 78h62 M40 56v5m40-5v5" /></> : category === 'nature' ? <><path d="M61 83V50 M61 58Q40 41 36 49q9 17 25 9 M61 51q9-24 25-15-5 19-25 15 M61 70Q34 57 33 68q9 14 28 2 M61 64q15-21 28-10-5 16-28 10 M44 86h33" /></> : category === 'creative' ? <><path d="m60 29 9 21 23 10-23 9-9 23-10-23-22-9 22-10Z M43 42l17 9 17-9-8 18 8 17-17-8-17 8 8-17Z" /><circle cx="60" cy="60" r="5" /></> : category === 'adventure' ? <><path d="m26 79 24-39 15 23 10-15 21 31Z M41 54l9 7 8-8 M64 79l11-16 11 16" /><circle cx="79" cy="34" r="6" /></> : category === 'connection' ? <><path d="M30 52h24v14q-12 17-24 0Z M66 52h24v14q-12 17-24 0Z M34 77h16m20 0h16 M42 37q-5 5 0 10m36-10q-5 5 0 10 M54 55q12 0 4 10 M90 55q12 0 4 10" /></> : <><path d="m60 31 8 21 21 8-21 8-8 21-8-21-21-8 21-8Z m0 15-7 21 14-14Z" /><circle cx="60" cy="60" r="28" strokeWidth=".8" /></>}
      </g>
      {stamp.variant === 'curves' && <path d="M22 91q18-14 38-1t38-1" fill="none" stroke={ink} strokeWidth="1.2" />}
      {stamp.variant === 'patterns' && <path d="m26 89 8-5 8 5 8-5 8 5 8-5 8 5 8-5 8 5" fill="none" stroke={ink} strokeWidth="1.2" />}
      <text x="60" y="23" fill={ink} textAnchor="middle" fontSize="5.5" fontFamily="'Plus Jakarta Sans', -apple-system, sans-serif" fontWeight="800" letterSpacing="2.2"><LocalizedText message={"MASAR PASSPORT"} /></text>
      <text x="60" y="98" fill={ink} textAnchor="middle" fontSize="5.7" fontFamily="'Plus Jakarta Sans', -apple-system, sans-serif" fontWeight="800" letterSpacing="1.5"><LocalizedText>{stamp.is_demo ? 'DEMO EDITION' : boxing?'BOXING':bowling?'BOWLING':category.toUpperCase()}</LocalizedText></text>
      {locked && <g transform="translate(87 84)"><circle r="14" fill="#0A0B0E" stroke={ink} strokeWidth="1.5" /><path d="M-5-1v-3a5 5 0 0 1 10 0v3m-11 0h12v10h-12Z" fill="none" stroke={ink} strokeWidth="1.5" /></g>}
    </Localized>
  );
}
