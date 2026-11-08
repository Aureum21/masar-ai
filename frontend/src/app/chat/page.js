'use client';

import { API_BASE } from '@/lib/api';
import { useRef, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import MobileNavigation from '@/components/layout/MobileNavigation';
import MobileContextPanel from '@/components/layout/MobileContextPanel';
import './chat-mobile.css';
import TopFilterBar from '@/components/layout/TopFilterBar';
import ContextPanel from '@/components/layout/ContextPanel';
import ChatInput from '@/components/chat/ChatInput';
import MessageBubble from '@/components/chat/MessageBubble';
import StatusIndicator from '@/components/chat/StatusIndicator';
import HeroIllustration from '@/components/chat/HeroIllustration';
import TripBriefHandoff from '@/components/chat/TripBriefHandoff';
import TripDetailModal from '@/components/cards/TripDetailModal';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// In-memory cache for thread messages so tab switching never flashes blank
const threadMessagesCache = new Map();

function ChatWorkspace() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const threadIdParam = searchParams.get('thread_id');
  
  const {
    messages,
    setMessages,
    statusUpdates,
    workerResults,
    isStreaming,
    savedTripId,
    setSavedTripId,
    sendMessage,
    cancelStream,
    clearChat,
    threadId
  } = useChat(threadIdParam);

  const [selectedTripModal, setSelectedTripModal] = useState(null);
  const [activeModalDay, setActiveModalDay] = useState(0);
  const [chatInput, setChatInput] = useState('');

  const initialPromptTriggered = useRef(false);
  const messagesEndRef = useRef(null);

  // Sync cache with active messages whenever messages update
  useEffect(() => {
    const activeId = threadIdParam || threadId;
    if (activeId && messages && messages.length > 0) {
      threadMessagesCache.set(activeId, messages);
    }
  }, [messages, threadIdParam, threadId]);

  // Fetch messages if thread_id is provided in URL, hydrating instantly from cache first
  useEffect(() => {
    if (!threadIdParam || !token) return;

    // 1. Instant Cache Hydration: 0ms delay, no disappearing or flashing
    if (threadMessagesCache.has(threadIdParam)) {
      setMessages(threadMessagesCache.get(threadIdParam));
      initialPromptTriggered.current = true;
    }

    // 2. Background Revalidation
    const controller = new AbortController();
    fetch(`${API_BASE}/api/v1/conversations/${threadIdParam}/messages`, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: controller.signal
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch messages');
      })
      .then(data => {
        if (data && data.length > 0 && !controller.signal.aborted) {
          const formatted = data.map(m => ({
            role: m.role,
            content: m.content
          }));
          threadMessagesCache.set(threadIdParam, formatted);
          setMessages(formatted);
          initialPromptTriggered.current = true;
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') console.error("Could not load history", err);
      });

    return () => controller.abort();
  }, [threadIdParam, token, setMessages]);

  // Auto-trigger prompt passed from landing page or trips page
  useEffect(() => {
    if (!token || initialPromptTriggered.current) return;
    
    const prompt = searchParams.get('prompt');
    const customizeId = searchParams.get('customize_trip_id');
    const tripTitle = searchParams.get('trip_title');

    if (customizeId && tripTitle) {
      initialPromptTriggered.current = true;
      sendMessage(`[INTERNAL_SYSTEM] The user clicked 'Customize in Chat' for trip titled "${tripTitle}" (ID: ${customizeId}). Please ask the user how they would like to customize it.`);
    } else if (prompt) {
      initialPromptTriggered.current = true;
      sendMessage(prompt);
    }
  }, [searchParams, sendMessage, token]);

  // Fetch trip if saved
  useEffect(() => {
    if (savedTripId && token) {
      fetch(`${API_BASE}/api/v1/trips/${savedTripId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setSelectedTripModal(data);
          setSavedTripId(null);
        })
        .catch(err => console.error("Failed to fetch saved trip:", err));
    }
  }, [savedTripId, token, setSavedTripId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, statusUpdates]);

  const handleSend = (message, planningContext) => {
    sendMessage(message, planningContext);
  };

  const isWelcomeState = messages.length === 0 && !isStreaming;

  return (
    <div className="app-container chat-workspace">
      {/* ── 1. Left Navigation Sidebar ── */}
      <Sidebar onNewChat={clearChat} />

      {/* ── 2. Content Stage (Top Filter + Split Workspace) ── */}
      <div className="content-stage chat-workspace-main">
        {/* Top Context Filters Bar */}
        <TopFilterBar 
          onFilterClick={(id) => handleSend(`Filter search for ${id} in the UAE`)}
          onCreateTrip={() => handleSend("Create a personalized multi-day trip for UAE")}
        />

        {/* Split Canvas Workspace */}
        <main className="split-workspace">
          {/* Left Column: Chat Assistant */}
          <section className="chat-column">
            <div className="chat-thread">
              {isWelcomeState ? (
                searchParams.get('draft') ? <TripBriefHandoff key={searchParams.get('draft')} id={searchParams.get('draft')} onSend={handleSend} busy={isStreaming}/> : <HeroIllustration onSelectSuggestion={handleSend} />
              ) : (
                <div className="chat-thread-inner">
                  {messages.map((msg, i) => (
                    <MessageBubble 
                      key={i} 
                      role={msg.role} 
                      content={msg.content} 
                      prebookId={msg.prebookId}
                      prebookDetails={msg.prebookDetails}
                      events={msg.events}
                      hotels={msg.hotels}
                      rooms={msg.rooms}
                      onSelectPrompt={handleSend}
                      animate={msg.animate}
                    />
                  ))}

                  {/* Live agent status update */}
                  {isStreaming && (
                    <StatusIndicator 
                      text={statusUpdates.length > 0 ? statusUpdates[statusUpdates.length - 1] : "Analyzing your request..."} 
                    />
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Docked Input Bar */}
            <ChatInput 
              onSend={handleSend} 
              onStop={cancelStream}
              isStreaming={isStreaming}
              disabled={isStreaming} 
              value={chatInput} 
              onChange={setChatInput} 
            />
          </section>

          {/* Right Column: Discovery & Live Generative Canvas */}
          <MobileContextPanel><ContextPanel
            workerResults={workerResults} 
            isStreaming={isStreaming}
            statusUpdates={statusUpdates}
            onSelectPrompt={handleSend}
          /></MobileContextPanel>
        </main>
      </div>

      <MobileNavigation/>
      <TripDetailModal 
        selectedTripModal={selectedTripModal}
        setSelectedTripModal={setSelectedTripModal}
        activeModalDay={activeModalDay}
        setActiveModalDay={setActiveModalDay}
        getActivityIcon={(title = '') => {
          const t = title.toLowerCase();
          if (t.includes('hotel') || t.includes('check') || t.includes('resort') || t.includes('stay')) return require('lucide-react').Building2;
          if (t.includes('lunch') || t.includes('dinner') || t.includes('breakfast') || t.includes('tea') || t.includes('cafe') || t.includes('dine') || t.includes('cuisine')) return require('lucide-react').Utensils;
          if (t.includes('mall') || t.includes('shop') || t.includes('souk')) return require('lucide-react').ShoppingBag;
          if (t.includes('safari') || t.includes('desert') || t.includes('beach') || t.includes('park') || t.includes('dune')) return require('lucide-react').SunMedium;
          if (t.includes('museum') || t.includes('mosque') || t.includes('palace') || t.includes('heritage') || t.includes('frame') || t.includes('khalifa') || t.includes('dome')) return require('lucide-react').Landmark;
          return require('lucide-react').Camera;
        }}
        onCustomize={(trip) => {
          setSelectedTripModal(null);
          sendMessage(`[INTERNAL_SYSTEM] The user clicked 'Customize in Chat' for trip titled "${trip.title}" (ID: ${trip.id}). Please ask the user how they would like to customize it.`);
        }}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="app-container" style={{ backgroundColor: '#0A0B0E' }} />}>
        <ChatWorkspace />
      </Suspense>
    </ProtectedRoute>
  );
}
