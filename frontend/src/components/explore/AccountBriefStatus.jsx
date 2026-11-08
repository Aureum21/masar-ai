'use client';
import {LocalizedText} from '@/i18n/Localized';

import {Cloud,CloudOff,RefreshCw} from 'lucide-react';
import {accountConflict,hasLocalChoices} from '@/lib/cloudBrief';
export default function AccountBriefStatus({cloud,draft,onRestore,onReplace}) {
  if(cloud.loading)return <div className="account-brief-status"><Cloud size={17}/><p><LocalizedText message={"Checking your saved account brief…"} /></p></div>;
  if(!cloud.available)return <div className="account-brief-status"><CloudOff size={17}/><p><LocalizedText message={"Your changes are saved on this device. Account sync will be available after the reviewed database update."} />{cloud.error&&<small>{cloud.error}</small>}</p></div>;
  const conflict=accountConflict(draft,cloud.account);
  const restore=cloud.account?.draft&&!hasLocalChoices(draft);
  return <div className={`account-brief-status ${conflict?'needs-review':''}`} role="status"><Cloud size={18}/><div><strong><LocalizedText>{conflict?'Two versions, one choice.':restore?'Your account brief is ready to restore.':'Your brief, connected.'}</LocalizedText></strong><p><LocalizedText>{conflict?'The account has a different version. Your device changes are safe; choose which version to use.':restore?'Bring your saved places and preferences to this device.':'Changes save on this device as you edit. Use Save to account to make them available on another device.'}</LocalizedText></p>{cloud.error&&<small>{cloud.error}</small>}{(conflict||restore)&&<div className="account-brief-actions"><button type="button" className="journey-btn subtle small" disabled={cloud.saving} onClick={onRestore}><RefreshCw size={13}/><LocalizedText message={" Use account version"} /></button>{conflict&&<button type="button" className="journey-btn subtle small" disabled={cloud.saving} onClick={onReplace}><LocalizedText message={"Replace account with this version"} /></button>}</div>}</div></div>;
}
