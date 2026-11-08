'use client';
import {Localized,LocalizedText} from '@/i18n/Localized';


import { useState } from 'react';
import { Calendar, MapPin, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

export default function EventCard({ event }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!event) return null;

  const defaultImg = "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80"; // Dubai skyline default
  const imageSrc = event.imageUrl || defaultImg;
  const isLongDescription = event.description && event.description.length > 90;

  const cardContent = (
    <>
      <div className="mindtrip-card-media" style={{ height: '180px' }}>
        <Localized element={"img"} attributes={["alt"]}
          src={imageSrc} 
          alt={event.name || "UAE Event"} 
          onError={(e) => { e.currentTarget.src = defaultImg; }}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div className="mindtrip-badge-top-left"><LocalizedText message={"EVENT"} /></div>
        
        {event.link && (
          <div style={{ position: 'absolute', right: '12px', top: '12px', background: 'rgba(0,0,0,0.5)', padding: '6px', borderRadius: '50%', backdropFilter: 'blur(4px)' }}>
            <ExternalLink size={14} color="#FFF" />
          </div>
        )}
      </div>

      <div className="mindtrip-card-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 className="mindtrip-card-title" style={{ 
          fontSize: '16px', 
          lineHeight: '1.4', 
          marginBottom: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {event.name}
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {event.description && (
            <div>
              <p style={{
                fontSize: '13px',
                color: '#CBD5E1',
                margin: '0 0 4px 0',
                display: '-webkit-box',
                WebkitLineClamp: isExpanded ? 'unset' : 2,
                WebkitBoxOrient: 'vertical',
                overflow: isExpanded ? 'visible' : 'hidden',
                lineHeight: '1.5'
              }}>
                <LocalizedText>{event.description}</LocalizedText>
              </p>
              {isLongDescription && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '2px 0',
                    color: '#F59E0B',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#FBBF24'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#F59E0B'}
                >
                  {isExpanded ? (
                    <>
                      <span><LocalizedText message={"Read less"} /></span>
                      <ChevronUp size={13} />
                    </>
                  ) : (
                    <>
                      <span><LocalizedText message={"Read more"} /></span>
                      <ChevronDown size={13} />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#F59E0B' }}>
            <Calendar size={14} />
            <span style={{ fontWeight: 600 }}><LocalizedText>{event.date || 'Upcoming'}</LocalizedText></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#94A3B8' }}>
            <MapPin size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ 
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: '1.4'
            }}><LocalizedText>{event.venue || 'UAE Venue'}</LocalizedText></span>
          </div>
        </div>
      </div>
    </>
  );

  const cardStyle = { 
    textDecoration: 'none', 
    height: '100%', 
    display: 'flex', 
    flexDirection: 'column',
    cursor: event.link ? 'pointer' : 'default'
  };

  if (event.link) {
    return (
      <a href={event.link} target="_blank" rel="noopener noreferrer" className="mindtrip-card hover-glow" style={cardStyle}>
        {cardContent}
      </a>
    );
  }

  return (
    <div className="mindtrip-card hover-glow" style={cardStyle}>
      {cardContent}
    </div>
  );
}

