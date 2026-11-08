'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Luggage,Map,MessageSquare,UserRound,Gift} from 'lucide-react';
import './journey.css';

export default function MobileNavigation() {
  const path=usePathname();
  const items=[['/explore','Explore',Map],['/trips','My Trips',Luggage],
    ['/rewards','Rewards',Gift],['/chat','Ask MASAR',MessageSquare],['/profile/account','Account',UserRound]];
  return <Localized element={"nav"} attributes={["aria-label"]} className="journey-mobile-nav" aria-label="Main navigation">
    {items.map(([href,label,Icon])=><Link key={href} href={href}
      aria-current={path===href||path.startsWith(href+'/')?'page':undefined}>
      <Icon size={19}/><span><LocalizedText>{label}</LocalizedText></span></Link>)}
  </Localized>;
}
