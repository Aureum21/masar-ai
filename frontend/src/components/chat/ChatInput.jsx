'use client';
import {useI18n} from '@/i18n/LocaleProvider';
import {Localized,LocalizedText} from '@/i18n/Localized';
import {speechLanguage, voiceLabels} from '@/lib/voiceSupport.mjs';


import { useState, useRef, useEffect } from 'react';
import { Plus, Mic, ArrowUp, Square } from 'lucide-react';

export default function ChatInput({ onSend, onStop, isStreaming, disabled, value, onChange }) {
  const {t,locale}=useI18n();
  const labels=voiceLabels[locale] || voiceLabels.en;
  const [listening,setListening]=useState(false);
  const [voiceStatus,setVoiceStatus]=useState('');
  const recognitionRef=useRef(null);
  const [internalInput, setInternalInput] = useState('');
  
  const isControlled = value !== undefined;
  const input = isControlled ? value : internalInput;
  const setInput = isControlled ? onChange : setInternalInput;

  const textareaRef = useRef(null);

  useEffect(() => () => {
    const recognition=recognitionRef.current;
    if(recognition){
      recognition.onresult=null;
      recognition.onerror=null;
      recognition.onend=null;
      recognition.abort();
      recognitionRef.current=null;
    }
  },[locale]);

  const toggleVoice=()=>{
    if(recognitionRef.current){recognitionRef.current.stop();return;}
    const Recognition=window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!Recognition){setVoiceStatus(labels.unsupported);return;}
    const recognition=new Recognition();
    const existing=input.trim();
    recognition.lang=speechLanguage(locale);
    recognition.continuous=false;
    recognition.interimResults=true;
    recognition.onresult=(event)=>{
      let transcript='';
      for(let i=0;i<event.results.length;i++)transcript+=event.results[i][0]?.transcript || '';
      setInput([existing,transcript.trim()].filter(Boolean).join(' '));
      setVoiceStatus(labels.review);
    };
    recognition.onerror=(event)=>{
      setVoiceStatus(event.error==='not-allowed' || event.error==='service-not-allowed' ? labels.denied : labels.failed);
      setListening(false);
    };
    recognition.onend=()=>{recognitionRef.current=null;setListening(false);setVoiceStatus(current=>current===labels.listening?'':current);};
    recognitionRef.current=recognition;
    try{recognition.start();setListening(true);setVoiceStatus(labels.listening);}
    catch{recognitionRef.current=null;setListening(false);setVoiceStatus(labels.failed);}
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isStreaming && onStop) {
      onStop();
      return;
    }
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
      setVoiceStatus('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-input-bar-container">
      <form onSubmit={handleSubmit} className="chat-input-box">
        {/* ── Attachment Button (+) ── */}
        <Localized element={"button"} attributes={["title"]}
          type="button" 
          className="chat-input-action-btn"
          title="Add attachment or itinerary link"
          onClick={() => alert(t("Upload flight tickets, screenshots, or link destination..."))}
        >
          <Plus size={18} />
        </Localized>

        {/* ── Input Textarea ── */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? "Masar AI is generating..." : "Ask anything..."}
          rows={1}
          className="chat-textarea"
          disabled={disabled && !isStreaming}
        />

        {/* ── Voice / Mic Button ── */}
        <button
          type="button"
          className={`chat-input-action-btn ${listening?'chat-voice-listening':''}`}
          title={listening?labels.stop:labels.start}
          aria-label={listening?labels.stop:labels.start}
          aria-pressed={listening}
          onClick={toggleVoice}
          disabled={disabled || isStreaming}
        >
          <Mic size={17} />
        </button>

        {/* ── Circular Send or Stop Button ── */}
        {isStreaming ? (
          <Localized element={"button"} attributes={["title"]}
            type="button" 
            onClick={onStop}
            className="chat-send-submit-btn chat-stop-btn"
            title="Stop generating"
            style={{
              background: '#EF4444',
              color: '#FFFFFF',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.45)',
              cursor: 'pointer'
            }}
          >
            <Square size={13} fill="currentColor" />
          </Localized>
        ) : (
          <Localized element={"button"} attributes={["title"]}
            type="submit" 
            disabled={!input.trim() || disabled} 
            className="chat-send-submit-btn"
            title="Send message"
          >
            <ArrowUp size={18} />
          </Localized>
        )}
      </form>

      {voiceStatus && <div className="chat-voice-status" role="status">{voiceStatus}</div>}
      {/* ── Subtitle Disclaimer ── */}
      <div className="chat-disclaimer"><LocalizedText message={"Masar AI can make mistakes. Check important info."} /></div>
    </div>
  );
}
