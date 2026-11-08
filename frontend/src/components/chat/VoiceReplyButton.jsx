'use client';
import {useEffect,useRef,useState} from 'react';
import {Volume2,Square} from 'lucide-react';
import {useI18n} from '@/i18n/LocaleProvider';
import {speechLanguage,speechText,voiceLabels} from '@/lib/voiceSupport.mjs';

export default function VoiceReplyButton({text}) {
  const {locale}=useI18n();
  const [speaking,setSpeaking]=useState(false);
  const [message,setMessage]=useState('');
  const utteranceRef=useRef(null);
  const labels=voiceLabels[locale] || voiceLabels.en;

  useEffect(()=>()=>{
    if(utteranceRef.current && typeof window!=='undefined' && window.speechSynthesis){
      window.speechSynthesis.cancel();
      utteranceRef.current=null;
    }
  },[locale]);

  const toggle=()=>{
    const synth=window.speechSynthesis;
    if(!synth || !window.SpeechSynthesisUtterance){setMessage(labels.outputUnavailable);return;}
    if(speaking){synth.cancel();setSpeaking(false);utteranceRef.current=null;return;}
    const spoken=speechText(text);
    if(!spoken)return;
    synth.cancel();
    const utterance=new window.SpeechSynthesisUtterance(spoken);
    utterance.lang=speechLanguage(locale);
    const voices=synth.getVoices();
    const voice=voices.find(item=>item.lang.toLowerCase()===utterance.lang.toLowerCase()) || voices.find(item=>item.lang.toLowerCase().startsWith(locale.toLowerCase()));
    if(voice)utterance.voice=voice;
    utterance.onend=()=>{if(utteranceRef.current===utterance){setSpeaking(false);utteranceRef.current=null;}};
    utterance.onerror=utterance.onend;
    utteranceRef.current=utterance;
    setMessage('');
    setSpeaking(true);
    synth.speak(utterance);
  };

  return <>
    <button type="button" className="chat-voice-reply-btn" onClick={toggle} title={speaking?labels.stopReply:labels.listen} aria-label={speaking?labels.stopReply:labels.listen} aria-pressed={speaking}>
      {speaking?<Square size={13}/>:<Volume2 size={15}/>}
      <span>{speaking?labels.stopReply:labels.listen}</span>
    </button>
    {message && <span className="chat-voice-status" role="status">{message}</span>}
  </>;
}
