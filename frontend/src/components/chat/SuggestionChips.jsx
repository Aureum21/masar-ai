'use client';

export default function SuggestionChips({ onSelect }) {
  const suggestions = [
    'Find hotels near Burj Khalifa',
    'Plan a weekend in Abu Dhabi',
    'Find events in Dubai'
  ];

  return (
    <div className="suggestion-chips">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          className="suggestion-chip"
          onClick={() => onSelect(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
