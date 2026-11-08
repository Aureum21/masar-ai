'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';


import React, { useState, useEffect } from 'react';
import { User, Calendar, MapPin, ExternalLink, Star, CreditCard } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import BookingCheckoutCard from './BookingCheckoutCard';
import FlightSearchForm from '../cards/FlightSearchForm';
import {briefMessageSummary} from '@/lib/briefMessage';
import VoiceReplyButton from './VoiceReplyButton';

export default function MessageBubble(props) {
  if (!props.content || props.content.startsWith('[INTERNAL_SYSTEM]')) return null;
  return <MessageContent {...props} content={props.role === 'user' ? briefMessageSummary(props.content) || props.content : props.content} />;
}

function MessageContent({
  role, 
  content, 
  prebookId, 
  prebookDetails, 
  events = [], 
  hotels = [], 
  rooms = [],
  onSelectPrompt,
  animate = false 
}) {
  const isAi = role === 'ai';


  // Helper to extract text from React children
  const extractText = (node) => {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (node.props && node.props.children) return extractText(node.props.children);
    return '';
  };

  // Helper to match an event by name
  const findMatchingEvent = (node) => {
    if (!events || !Array.isArray(events) || events.length === 0) return null;
    let text = extractText(node).trim().toLowerCase();
    if (!text || text.length < 2) return null;

    // Strip leading numbering, bullets, punctuation
    const normalizedText = text.replace(/^[\d.)\-*•\s]+/, '').replace(/[:\-–—\s]+$/, '').trim();

    return events.find(e => {
      if (!e || !e.name) return false;
      const eventName = e.name.trim().toLowerCase();
      const normalizedEvent = eventName.replace(/^[\d.)\-*•\s]+/, '').replace(/[:\-–—\s]+$/, '').trim();
      return (
        normalizedText === normalizedEvent ||
        normalizedText.includes(normalizedEvent) ||
        normalizedEvent.includes(normalizedText)
      );
    });
  };

  // Helper to match a hotel by name
  const findMatchingHotel = (node) => {
    if (!hotels || !Array.isArray(hotels) || hotels.length === 0) return null;
    let text = extractText(node).trim().toLowerCase();
    if (!text || text.length < 2) return null;

    const normalizedText = text.replace(/^[\d.)\-*•\s]+/, '').replace(/[:\-–—\s]+$/, '').trim();

    return hotels.find(h => {
      if (!h || !h.name) return false;
      const hotelName = h.name.trim().toLowerCase();
      const normalizedHotel = hotelName.replace(/^[\d.)\-*•\s]+/, '').replace(/[:\-–—\s]+$/, '').trim();
      return (
        normalizedText === normalizedHotel ||
        normalizedText.includes(normalizedHotel) ||
        normalizedHotel.includes(normalizedText)
      );
    });
  };

  const findMatchingRoom = (node) => {
    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) return null;
    let text = extractText(node).trim().toLowerCase();
    if (!text || text.length < 2) return null;

    const normalizedText = text.replace(/^[\d.)\-*•\s]+/, '').replace(/[:\-–—\s]+$/, '').trim();

    return rooms.find(r => {
      if (!r || !r.name) return false;
      const roomName = r.name.trim().toLowerCase();
      const normalizedRoom = roomName.replace(/^[\d.)\-*•\s]+/, '').replace(/[:\-–—\s]+$/, '').trim();
      return (
        normalizedText === normalizedRoom ||
        normalizedText.includes(normalizedRoom) ||
        normalizedRoom.includes(normalizedText)
      );
    });
  };

function EventHoverItem({ event, children }) {
  const [placement, setPlacement] = useState('bottom');
  const containerRef = React.useRef(null);

  const defaultImg = "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80";
  const imageSrc = event.imageUrl || defaultImg;

  const handleMouseEnter = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.top < 340) {
        setPlacement('bottom');
      } else {
        setPlacement('top');
      }
    }
  };

  return (
    <span 
      ref={containerRef}
      className="event-hover-container"
      onMouseEnter={handleMouseEnter}
    >
      <span className="event-hover-text">{children}</span>
      <span 
        className={`event-hover-popup ${placement === 'bottom' ? 'popup-bottom' : 'popup-top'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="event-hover-card">
          <span className="event-hover-img-wrap">
            <Localized element={"img"} attributes={["alt"]}
              src={imageSrc} 
              alt={event.name}
              className="event-hover-img"
              onError={(e) => { e.currentTarget.src = defaultImg; }}
            />
            <span className="event-hover-badge"><LocalizedText message={"EVENT"} /></span>
          </span>
          <span className="event-hover-details">
            <span className="event-hover-title">{event.name}</span>
            <span className="event-hover-meta">
              <span className="event-hover-meta-item">
                <Calendar size={12} color="#F59E0B" />
                <span><LocalizedText>{event.date || 'Upcoming'}</LocalizedText></span>
              </span>
              <span className="event-hover-meta-item">
                <MapPin size={12} color="#94A3B8" />
                <span><LocalizedText>{event.venue || 'UAE Venue'}</LocalizedText></span>
              </span>
            </span>
            {event.link && (
              <a 
                href={event.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="event-hover-ticket-btn"
                onClick={(e) => e.stopPropagation()}
              >
                <span><LocalizedText message={"Get Tickets"} /></span>
                <ExternalLink size={12} />
              </a>
            )}
          </span>
        </span>
      </span>
    </span>
  );
}


function RoomHoverItem({ room, children, onSelectPrompt }) {
  const [placement, setPlacement] = useState('bottom');
  const containerRef = React.useRef(null);

  const handleMouseEnter = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.top < 340) {
        setPlacement('bottom');
      } else {
        setPlacement('top');
      }
    }
  };

  return (
    <span 
      ref={containerRef}
      className="event-hover-container"
      onMouseEnter={handleMouseEnter}
    >
      <span className="event-hover-text">{children}</span>
      <span 
        className={`event-hover-popup ${placement === 'bottom' ? 'popup-bottom' : 'popup-top'}`}
        onClick={(e) => e.stopPropagation()}
        style={{ width: '280px' }}
      >
        <span className="event-hover-card">
          <span className="event-hover-img-wrap">
            <Localized element={"img"} attributes={["alt"]}
              src={room.imageUrl || "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80"} 
              alt={room.name}
              className="event-hover-img"
              onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80"; }}
            />
            <span className="event-hover-badge" style={{ color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.4)' }}><LocalizedText message={"ROOM"} /></span>
          </span>
          <span className="event-hover-details">
            <span className="event-hover-title">{room.name}</span>
            <span className="event-hover-meta">
              {room.board && (
                <span className="event-hover-meta-item" style={{ color: '#CBD5E1' }}>
                  <span>{room.board}</span>
                </span>
              )}
            </span>
            <span className="hotel-hover-price-row">
              {room.price && (
                <span className="hotel-hover-price-badge">
                  {room.price} <LocalizedText>{room.currency || 'AED'}</LocalizedText> <span><LocalizedText message={"/ total"} /></span>
                </span>
              )}
            </span>
            <button
              type="button"
              className="hotel-hover-book-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectPrompt) {
                  onSelectPrompt(`Prebook the ${room.name} using offer ID \`${room.offerId || ''}\``);
                }
              }}
            >
              <span><LocalizedText message={"Instant Pre-Book"} /></span>
              <CreditCard size={12} />
            </button>
          </span>
        </span>
      </span>
    </span>
  );
}

function HotelHoverItem({ hotel, onSelectPrompt, children }) {
  const [placement, setPlacement] = useState('bottom');
  const containerRef = React.useRef(null);

  const defaultImg = "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80";
  const imageSrc = hotel.imageUrl || defaultImg;

  const handleMouseEnter = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.top < 340) {
        setPlacement('bottom');
      } else {
        setPlacement('top');
      }
    }
  };

  return (
    <span 
      ref={containerRef}
      className="event-hover-container"
      onMouseEnter={handleMouseEnter}
    >
      <span className="event-hover-text">{children}</span>
      <span 
        className={`event-hover-popup ${placement === 'bottom' ? 'popup-bottom' : 'popup-top'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="event-hover-card">
          <span className="event-hover-img-wrap">
            <Localized element={"img"} attributes={["alt"]}
              src={imageSrc} 
              alt={hotel.name}
              className="event-hover-img"
              onError={(e) => { e.currentTarget.src = defaultImg; }}
            />
            <span className="event-hover-badge" style={{ color: '#F59E0B', borderColor: 'rgba(245, 158, 11, 0.4)' }}><LocalizedText message={"HOTEL"} /></span>
          </span>
          <span className="event-hover-details">
            <span className="event-hover-title">{hotel.name}</span>
            <span className="event-hover-meta">
              <span className="event-hover-meta-item">
                <MapPin size={12} color="var(--color-accent-hover)" />
                <span><LocalizedText>{hotel.location || 'United Arab Emirates'}</LocalizedText></span>
              </span>
              {hotel.roomType && (
                <span className="event-hover-meta-item" style={{ color: '#CBD5E1' }}>
                  <span>{hotel.roomType}</span>
                </span>
              )}
            </span>
            <span className="hotel-hover-price-row">
              {hotel.price && (
                <span className="hotel-hover-price-badge">
                  {hotel.price} <LocalizedText>{hotel.currency || 'AED'}</LocalizedText> <span><LocalizedText message={"/ night"} /></span>
                </span>
              )}
              <span className="hotel-hover-rating">
                <Star size={11} fill="#FBBF24" color="#FBBF24" />
                <span>{hotel.rating || 4.8}</span>
              </span>
            </span>
            <span style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                type="button"
                className="hotel-hover-book-btn"
                style={{ flex: 1, padding: '8px', justifyContent: 'center' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectPrompt) {
                    onSelectPrompt(`Show me the available rooms for ${hotel.name} using ID \`${hotel.hotelId}\``);
                  }
                }}
              >
                <span><LocalizedText message={"Browse Rooms"} /></span>
              </button>
              <button
                type="button"
                className="hotel-hover-book-btn"
                style={{ flex: 1, padding: '8px', justifyContent: 'center', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectPrompt) {
                    onSelectPrompt(`Tell me about the facilities and reviews for ${hotel.name} using ID \`${hotel.hotelId}\``);
                  }
                }}
              >
                <span><LocalizedText message={"About Hotel"} /></span>
              </button>
            </span>
          </span>
        </span>
      </span>
    </span>
  );
}

  // Pre-process: Strip markdown images so they don't clutter the chat 
  let cleanContent = content.replace(/!\[.*?\]\(.*?\)/g, '');
  
  // Pre-process: Strip those extra `#` from lists if they slipped through
  cleanContent = cleanContent.replace(/####\s*/g, '');

  // Pre-process: Strip 'using offer ID...' from user prompts so it stays hidden
  cleanContent = cleanContent.replace(/\s*using offer ID\s+[`'"]?[a-zA-Z0-9_=\-+~]+[`'"]?/ig, '');

  // Pre-process: Strip raw Offer IDs and Coordinates
  cleanContent = cleanContent.replace(/-\s*\*?\*?Offer ID:\*?\*?\s*[a-zA-Z0-9_=\-+~]+(?=\n|$)/ig, '');
  cleanContent = cleanContent.replace(/Offer ID:.*?(?=\n|$)/ig, '');
  cleanContent = cleanContent.replace(/-\s*\*?\*?Coordinates:\*?\*?\s*[0-9.,\s-]+(?=\n|$)/ig, '');
  cleanContent = cleanContent.replace(/Coordinates:.*?(?=\n|$)/ig, '');

  // Pre-process: Clean up raw bullet point metadata lists if dumped by LLM
  cleanContent = cleanContent.replace(/^[*\-•]\s*\*?\*?Date:\*?\*?\s*[^\n]+(?=\n|$)/gmi, '');
  cleanContent = cleanContent.replace(/^[*\-•]\s*\*?\*?Venue:\*?\*?\s*[^\n]+(?=\n|$)/gmi, '');
  cleanContent = cleanContent.replace(/^[*\-•]\s*\*?\*?Link:\*?\*?\s*[^\n]+(?=\n|$)/gmi, '');
  cleanContent = cleanContent.replace(/^[*\-•]\s*\*?\*?Image:\*?\*?\s*[^\n]+(?=\n|$)/gmi, '');
  cleanContent = cleanContent.replace(/^[*\-•]\s*\*?\*?Price:\*?\*?\s*[^\n]+(?=\n|$)/gmi, '');
  cleanContent = cleanContent.replace(/^[*\-•]\s*\*?\*?Room Type:\*?\*?\s*[^\n]+(?=\n|$)/gmi, '');
  cleanContent = cleanContent.replace(/^[*\-•]\s*\*?\*?Location:\*?\*?\s*[^\n]+(?=\n|$)/gmi, '');
  cleanContent = cleanContent.replace(/^[*\-•]\s*\*?\*?Description:\*?\*?\s*/gmi, '');
  cleanContent = cleanContent.replace(/\*?\*?Description:\*?\*?\s*/gi, '');

  // Pre-process: Strip raw orphan Image lines
  cleanContent = cleanContent.replace(/-\s*\*?\*?Image:\*?\*?\s*(https?:\/\/[^\s\n]+)?(?=\n|$)/ig, '');
  cleanContent = cleanContent.replace(/\*?\*?Image:\*?\*?\s*(https?:\/\/[^\s\n]+)?(?=\n|$)/ig, '');

  // Pre-process: Automatically ensure event titles are wrapped in **bold** for hover matching
  if (events && Array.isArray(events) && events.length > 0) {
    events.forEach(evt => {
      if (evt && evt.name && evt.name.trim().length > 2) {
        const cleanEvtName = evt.name.trim();
        const escaped = cleanEvtName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<!\\*\\*)(?:\\d+\\.\\s*)?(${escaped})(?!\\*\\*)`, 'gi');
        cleanContent = cleanContent.replace(regex, '**$1**');
      }
    });
  }

  // Pre-process: Automatically ensure hotel titles are wrapped in **bold** for hover matching
  if (hotels && Array.isArray(hotels) && hotels.length > 0) {
    hotels.forEach(h => {
      if (h && h.name && h.name.trim().length > 2) {
        const cleanHName = h.name.trim();
        const escaped = cleanHName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<!\\*\\*)(?:\\d+\\.\\s*)?(${escaped})(?!\\*\\*)`, 'gi');
        cleanContent = cleanContent.replace(regex, '**$1**');
      }
    });
  }

  // Pre-process: Automatically ensure room titles are wrapped in **bold** for hover matching
  if (rooms && Array.isArray(rooms) && rooms.length > 0) {
    rooms.forEach(r => {
      if (r && r.name && r.name.trim().length > 2) {
        const cleanRName = r.name.trim();
        const escaped = cleanRName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<!\\*\\*)(?:\\d+\\.\\s*)?(${escaped})(?!\\*\\*)`, 'gi');
        cleanContent = cleanContent.replace(regex, '**$1**');
      }
    });
  }

  // Pre-process: Fix markdown quirk where `---` without a blank line above turns text into huge <h2>
  cleanContent = cleanContent.replace(/([^\n])\n---/g, '$1\n\n---');

  // Pre-process: Clean up excessive blank lines
  cleanContent = cleanContent.replace(/\n{3,}/g, '\n\n');

  let initialOrigin = '';
  let initialDestination = '';
  
  // Extract parameters like [FLIGHT_SEARCH_FORM:origin=Italy:destination=UAE]
  const flightFormRegex = /\[FLIGHT_SEARCH_FORM(?:[^\w]*origin=([^:\]]*))?(?:[^\w]*destination=([^\]]*))?\]/i;
  const flightFormMatch = cleanContent.match(flightFormRegex);
  const hasFlightForm = !!flightFormMatch;

  if (hasFlightForm) {
    if (flightFormMatch[1]) initialOrigin = flightFormMatch[1].trim();
    if (flightFormMatch[2]) initialDestination = flightFormMatch[2].trim();
    cleanContent = cleanContent.replace(flightFormRegex, '');
  }

  const [displayedContent, setDisplayedContent] = useState(!animate ? cleanContent : '');

  useEffect(() => {
    if (!animate) return;

    const totalLen = cleanContent.length;
    if (totalLen === 0) return;

    // Adaptive speed: Aim for smooth completion within ~1.0 to 1.3 seconds total
    const totalTicks = 70; // ~70 frames at 16ms (~60fps)
    const chunkSize = Math.max(1, Math.ceil(totalLen / totalTicks));
    const intervalMs = 16;

    let currentIndex = 0;
    const timer = setInterval(() => {
      currentIndex += chunkSize;
      if (currentIndex >= totalLen) {
        setDisplayedContent(cleanContent);
        clearInterval(timer);
      } else {
        setDisplayedContent(cleanContent.substring(0, currentIndex));
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [cleanContent, animate]);

  // Helper to render event or hotel hover item
  const renderRichHover = (children) => {
    const eventMatch = findMatchingEvent(children);
    if (eventMatch) return <EventHoverItem event={eventMatch}>{children}</EventHoverItem>;
    
    const hotelMatch = findMatchingHotel(children);
    if (hotelMatch) return <HotelHoverItem hotel={hotelMatch} onSelectPrompt={onSelectPrompt}>{children}</HotelHoverItem>;
    
    const roomMatch = findMatchingRoom(children);
    if (roomMatch) return <RoomHoverItem room={roomMatch} onSelectPrompt={onSelectPrompt}>{children}</RoomHoverItem>;

    return null;
  };



  return (
    <div className={`message-row ${isAi ? '' : 'message-row-user'}`}>
      <div className={`message-avatar-circle ${isAi ? 'avatar-ai' : 'avatar-user'}`}>
        {isAi ? (
          <Localized element={"img"} attributes={["alt"]}
            src="/MasarAiLogo.png" 
            alt="Masar AI" 
            style={{ 
              width: '38px', 
              height: '38px', 
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 8px rgba(245, 158, 11, 0.4))'
            }} 
          />
        ) : (
          <User size={16} />
        )}
      </div>
      <div className="message-body-wrap">
        <div className={`message-bubble-dark ${isAi ? 'bubble-ai' : 'bubble-user'}`}>
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({node, children, ...props}) => {
                const hover = renderRichHover(children);
                if (hover) return <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)' }} {...props}>{hover}</h1>;
                return <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)' }} {...props}>{children}</h1>;
              },
              h2: ({node, children, ...props}) => {
                const hover = renderRichHover(children);
                if (hover) return <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-2)' }} {...props}>{hover}</h2>;
                return <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-2)' }} {...props}>{children}</h2>;
              },
              h3: ({node, children, ...props}) => {
                const hover = renderRichHover(children);
                if (hover) return <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-2)' }} {...props}>{hover}</h3>;
                return <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-2)' }} {...props}>{children}</h3>;
              },
              strong: ({node, children, ...props}) => {
                const hover = renderRichHover(children);
                if (hover) return hover;
                return <strong {...props}>{children}</strong>;
              },
              p: ({node, ...props}) => <p style={{ marginBottom: 'var(--space-2)' }} {...props} />,
              ul: ({node, ...props}) => <ul style={{ paddingInlineStart: 'var(--space-5)', marginBottom: 'var(--space-2)' }} {...props} />,
              ol: ({node, ...props}) => <ol style={{ paddingInlineStart: 'var(--space-5)', marginBottom: 'var(--space-2)' }} {...props} />,
              li: ({node, ...props}) => <li style={{ marginBottom: 'var(--space-1)' }} {...props} />,
              a: ({node, ...props}) => <a style={{ color: 'var(--color-accent-hover)', textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer" {...props} />
            }}
          >
            {animate ? displayedContent : cleanContent}
          </ReactMarkdown>
          
          {prebookId && (
            <BookingCheckoutCard prebookId={prebookId} details={prebookDetails} />
          )}

          {hasFlightForm && (
            <FlightSearchForm 
              initialOrigin={initialOrigin}
              initialDestination={initialDestination}
              onSearch={(data) => {
                if (onSelectPrompt) {
                  onSelectPrompt(`Search flights from ${data.origin} to ${data.destination} on ${data.date} for ${data.passengers} passenger(s) in ${data.cabin} class.`);
                }
            }} />
          )}
        </div>
        {isAi && (!animate || displayedContent===cleanContent) && <VoiceReplyButton text={cleanContent} />}
      </div>
    </div>
  );
}

