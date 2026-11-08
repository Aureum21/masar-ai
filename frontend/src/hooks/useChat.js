'use client';
import {useI18n} from '@/i18n/LocaleProvider';

import { API_BASE } from '@/lib/api';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';



/**
 * useChat — SSE streaming hook for the Masar AI chat endpoint.
 * 
 * Manages the full conversation state and streams real-time updates
 * from POST /api/v1/chat using Server-Sent Events.
 */
export function useChat(initialThreadId) {
  const {locale}=useI18n();

  const [threadId, setThreadId] = useState(() => initialThreadId || crypto.randomUUID());
  const [messages, setMessages] = useState([]);
  const [statusUpdates, setStatusUpdates] = useState([]);
  const [workerResults, setWorkerResults] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [savedTripId, setSavedTripId] = useState(null);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const { token, userEmail } = useAuth();
  
  // Expose setMessages so page.js can hydrate history on load
  const setMessagesExternal = useCallback((msgs) => setMessages(msgs), []);

  const sendMessage = useCallback(async (message, planningContext={}) => {
    if (!message.trim() || isStreaming) return;
    const userId = userEmail || 'guest_user';

    // --- MOCK TESTING COMMANDS FOR UI TESTING WITHOUT LLM CALLS ---
    if (message.trim().startsWith('/test-')) {
      const cmd = message.trim();
      setMessages(prev => [...prev, { role: 'user', content: `Testing UI: ${cmd}` }]);
      setStatusUpdates([]);
      setWorkerResults([]);
      setIsStreaming(true);
      setError(null);
      
      if (cmd === '/test-loop' || cmd === '/test-forever') {
        setStatusUpdates(["Orchestrator: Analyzing travel preferences & routing to agents..."]);
        const loopPhases = [
          "Event Agent: Searching Dubai & Abu Dhabi VIP calendars...",
          "Accommodation Agent: Finding luxury 5-star suites & locking direct rates...",
          "Flight Agent: Scanning premium Emirates & Etihad flight routes...",
          "Logistics Agent: Mapping private transit & luxury chauffeur lines...",
          "Orchestrator: Synthesizing customized luxury itinerary..."
        ];
        let pIdx = 0;
        const interval = setInterval(() => {
          setStatusUpdates(prev => [...prev, loopPhases[pIdx % loopPhases.length]]);
          pIdx++;
        }, 3000);
        // Save interval so user can stop with clearChat or new message
        return;
      }

      if (cmd === '/test-loader' || cmd === '/test-orchestrate' || cmd === '/test-loading') {
        // Stage 1: Orchestrator
        setStatusUpdates(["Orchestrator: Analyzing travel preferences & routing to agents..."]);
        
        // Stage 2: Event Agent
        setTimeout(() => {
          setStatusUpdates(prev => [...prev, "Event Agent: Searching Dubai & Abu Dhabi VIP calendars..."]);
        }, 2200);

        // Stage 3: Hotel Agent
        setTimeout(() => {
          setStatusUpdates(prev => [...prev, "Accommodation Agent: Finding luxury 5-star suites & locking direct rates..."]);
        }, 4500);

        // Stage 4: Flight Agent
        setTimeout(() => {
          setStatusUpdates(prev => [...prev, "Flight Agent: Searching premier Emirates & Etihad flight options..."]);
        }, 6800);

        // Stage 5: Logistics Agent
        setTimeout(() => {
          setStatusUpdates(prev => [...prev, "Logistics Agent: Mapping transit lines & private chauffeur routes..."]);
        }, 9000);

        // Final completion with results
        setTimeout(() => {
          setWorkerResults([
            {
              type: 'accommodation_result',
              content: {
                hotels: [
                  {
                    name: "Armani Hotel Dubai — Burj Khalifa",
                    location: "Downtown Dubai, UAE",
                    price: 1450,
                    currency: "AED",
                    rating: 4.9,
                    roomType: "Luxury Suite",
                    lat: 25.1972,
                    lng: 55.2744,
                    imageUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80"
                  }
                ],
                conversational_message: "Here are some luxury options."
              }
            },
            {
              type: 'event_result',
              content: {
                events: [
                  {
                    name: "THE PENTHOUSE PRESENTS: NICK MORGAN",
                    date: "August 22, 2026",
                    venue: "The Penthouse | FIVE Palm Jumeirah",
                    link: "https://ticketmaster.ae",
                    imageUrl: "https://images.unsplash.com/photo-1540039155732-6761b54f2226?w=600&q=80"
                  }
                ],
                conversational_message: "Here are some events."
              }
            }
          ]);
          setMessages(prev => [
            ...prev,
            {
              role: 'ai',
              content: "I have curated your luxury Dubai itinerary tailored to your preferences! Here are the selected 5-star accommodations and VIP events."
            }
          ]);
          setIsStreaming(false);
        }, 11500);
        return;
      }

      setTimeout(() => {
        if (cmd === '/test-events') {
          const mockEvents = [
            {
              name: "THE PENTHOUSE PRESENTS: NICK MORGAN",
              date: "August 22, 2026",
              venue: "The Penthouse | FIVE Palm Jumeirah",
              description: "Experience high-energy house beats with international sensation Nick Morgan atop Dubai's iconic rooftop. Featuring immersive 360-degree panoramic skyline views across Dubai Marina and the Arabian Gulf, curated signature cocktails, and live support from resident DJs from 10 PM until late.",
              link: "https://ticketmaster.ae/penthouse",
              imageUrl: "https://images.unsplash.com/photo-1540039155732-6761b54f2226?w=600&q=80"
            },
            {
              name: "The Legends of Trance: ATB",
              date: "August 25, 2026",
              venue: "Coca-Cola Arena, Dubai",
              description: "Trance pioneer ATB takes the stage for a spectacular one-night arena show with world-class visual effects, lasers, and classic anthems.",
              link: "https://ticketmaster.ae/atb",
              imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80"
            }
          ];
          setWorkerResults(prev => [...prev, { type: 'event_result', content: { events: mockEvents } }]);
          setMessages(prev => [...prev, { 
            role: 'ai', 
            content: 'Here are the top upcoming events in Dubai:\n\n**THE PENTHOUSE PRESENTS: NICK MORGAN**\nExperience high-energy house beats with international sensation Nick Morgan atop Dubai\'s iconic rooftop with signature cocktails and panoramic views.\n\n**The Legends of Trance: ATB**\nTrance pioneer ATB takes the stage for a spectacular one-night arena show with world-class visual effects.\n\nHover over any event title above to preview details or grab tickets!',
            events: mockEvents
          }]);
        } else if (cmd === '/test-hotels') {
          const mockHotels = [
            {
              name: "Emirates Palace Mandarin Oriental, Abu Dhabi",
              location: "West Corniche Road, Abu Dhabi, UAE",
              price: "4,624.89",
              currency: "AED",
              rating: 4.9,
              roomType: "Deluxe City View Room",
              lat: 24.4617,
              lng: 54.3173,
              imageUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80",
              offerId: "mock_offer_emirates_123"
            },
            {
              name: "The St. Regis Saadiyat Island Resort, Abu Dhabi",
              location: "Saadiyat Island, Abu Dhabi, UAE",
              price: "3,164.67",
              currency: "AED",
              rating: 4.8,
              roomType: "Ocean View Superior Suite",
              lat: 24.5369,
              lng: 54.4331,
              imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
              offerId: "mock_offer_stregis_456"
            }
          ];
          setWorkerResults(prev => [...prev, { type: 'accommodation_result', content: { hotels: mockHotels } }]);
          setMessages(prev => [...prev, { 
            role: 'ai', 
            content: 'Here are some luxurious resort-style hotels in Abu Dhabi for your stay:\n\n**Emirates Palace Mandarin Oriental, Abu Dhabi**\nIconic beachfront palace offering private marina access, award-winning culinary experiences, and majestic Arabian hospitality.\n\n**The St. Regis Saadiyat Island Resort, Abu Dhabi**\nRefined Mediterranean-style resort overlooking pristine turquoise waters with a championship golf course.\n\nHover over any hotel name above to preview room rates and reserve!',
            hotels: mockHotels
          }]);
        } else if (cmd === '/test-prebook') {
          setMessages(prev => [...prev, { 
            role: 'ai', 
            content: 'Your prebooking for **One&Only One Za\'abeel** has been successfully held. Complete your reservation details below to finalize your stay:',
            prebookId: 'mock_prebook_abc123',
            prebookDetails: {
              hotelName: "One&Only One Za'abeel",
              price: "1,423.24 AED",
              location: "Za'abeel 1, Dubai, UAE"
            }
          }]);
        } else if (cmd === '/test-routes') {
          setWorkerResults(prev => [...prev, { type: 'logistics_result', content: {
            routes: [
              {
                origin: "Dubai Mall",
                destination: "Dubai Frame",
                duration: "45 mins",
                distance: "10.5 km",
                fare: "7.50 AED",
                steps: [
                  "Walk to Dubai Mall Metro Station (10 mins)",
                  "Take the Red Line Metro towards Centrepoint (15 mins)",
                  "Walk to Dubai Frame (20 mins)"
                ]
              }
            ]
          }}]);
          setMessages(prev => [...prev, { role: 'ai', content: 'Here is the transit route from Dubai Mall to Dubai Frame using the Dubai Metro.' }]);
        } else if (cmd === '/test-rooms') {
          const mockRooms = [
            {
              name: "Deluxe King Sea View Suite",
              board: "Breakfast Included",
              price: "1,850",
              currency: "AED",
              offerId: "mock_offer_deluxe_101",
              imageUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
              images: [
                "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80"
              ]
            },
            {
              name: "Executive Twin Bedroom with Balcony",
              board: "Room Only",
              price: "1,220",
              currency: "AED",
              offerId: "mock_offer_twin_202",
              imageUrl: "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=800&q=80",
              images: [
                "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1540518614846-7ede433c4ef4?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1507038772120-7ffe76f79d79?auto=format&fit=crop&w=800&q=80"
              ]
            }
          ];
          setWorkerResults(prev => [...prev, { type: 'accommodation_result', content: { rooms: mockRooms } }]);
          setMessages(prev => [...prev, { 
            role: 'ai', 
            content: 'Here are the available rooms for **Emirates Palace Mandarin Oriental** with live rates and full photo galleries. Use the arrows or swipe to explore all room angles!',
            rooms: mockRooms
          }]);
        }
        setIsStreaming(false);
      }, 1000);
      return;
    }
    // --- END MOCK TESTING COMMANDS ---

    // Add user message immediately
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setStatusUpdates([]);
    setWorkerResults([]);
    setIsStreaming(true);
    setError(null);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    const currentTurnWorkerResults = [];

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/api/v1/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          trip_brief:planningContext.trip_brief,brief_id:planningContext.brief_id,brief_revision:planningContext.brief_revision,
          message,
          locale,
          thread_id: threadId
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const payload = JSON.parse(line.slice(6));

            if (payload.status_update) {
              setStatusUpdates(prev => [...prev, payload.status_update]);
            }

            if (payload.worker_result) {
              const [resultType, resultContent] = payload.worker_result;
              currentTurnWorkerResults.push({ type: resultType, content: resultContent });
              setWorkerResults(prev => [...prev, { type: resultType, content: resultContent }]);
            }

            if (payload.final) {
              const eventsList = payload.events 
                || currentTurnWorkerResults.find(r => r.type === 'event_result')?.content?.events
                || null;

              const accommodationResult = currentTurnWorkerResults.find(r => r.type === 'accommodation_result')?.content;

              const hotelsList = payload.hotels || accommodationResult?.hotels || null;
              const roomsList = payload.rooms || accommodationResult?.rooms || null;
              
              const finalPrebookId = payload.prebook_id || accommodationResult?.prebook_id || null;
              const finalPrebookDetails = payload.prebook_details || accommodationResult?.prebook_details || null;

              // Add the final AI response as a message
              if (payload.response) {
                setMessages(prev => [...prev, { 
                  role: 'ai', 
                  content: payload.response,
                  prebookId: finalPrebookId,
                  prebookDetails: finalPrebookDetails,
                  events: eventsList,
                  hotels: hotelsList,
                  rooms: roomsList,
                  animate: true
                }]);
              }
              if (payload.saved_trip_id) {
                setSavedTripId(payload.saved_trip_id);
              }
              setStatusUpdates([]);
            }

            if (payload.error) {
              setError(payload.error);
            }
          } catch (parseError) {
            // Skip malformed JSON lines
            console.warn('Failed to parse SSE line:', line);
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        setMessages(prev => [...prev, {
          role: 'ai',
          content: 'Sorry, I encountered an error processing your request. Please try again.'
        }]);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [isStreaming,threadId,token,userEmail,locale]);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    setStatusUpdates([]);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setStatusUpdates([]);
    setWorkerResults([]);
    setError(null);
    setThreadId(`thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    // Optionally remove thread_id from URL without reloading
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/chat');
    }
  }, []);

  // Dispatch refresh event when streaming ends so Sidebar updates
  useEffect(() => {
    if (!isStreaming && messages.length > 0) {
      window.dispatchEvent(new Event('refresh_conversations'));
    }
  }, [isStreaming, messages.length]);

  return {
    messages,
    setMessages: setMessagesExternal,
    statusUpdates,
    workerResults,
    isStreaming,
    savedTripId,
    setSavedTripId,
    sendMessage,
    cancelStream,
    clearChat,
    threadId,
    error
  };
}
