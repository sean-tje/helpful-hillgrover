import React, { useState } from 'react';
import { MapPin } from 'lucide-react';

// Common Hillgrove venues, suggested as the teacher types. Any other venue can still be typed.
export const SCHOOL_VENUES = [
  'Hall',
  'Artscapade',
  'Foyer',
  'General Office',
  'Synergy',
  'Canteen',
  'Parade Square',
  'D2M',
  'AVA Room',
  'Block G',
  'Gym',
  'ISH1 (Basketball Court)',
  'ISH2',
  'Comp Lab 1',
  'Comp Lab 2',
  'Comp Lab 3',
  'Comp Lab 4',
];

interface VenueInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const VenueInput: React.FC<VenueInputProps> = ({ value, onChange, placeholder = 'Start typing, e.g. Hall' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const query = value.trim().toLowerCase();
  const suggestions = query
    ? SCHOOL_VENUES.filter(v => v.toLowerCase().includes(query) && v.toLowerCase() !== query)
        // venues starting with what was typed come first
        .sort((a, b) => Number(!a.toLowerCase().startsWith(query)) - Number(!b.toLowerCase().startsWith(query)))
    : [];
  const showList = isOpen && suggestions.length > 0;

  const choose = (venue: string) => {
    onChange(venue);
    setIsOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!showList) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(i => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(i => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(suggestions[highlighted]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlighted(0);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-label="Venue"
        aria-expanded={showList}
        aria-autocomplete="list"
        aria-controls="venue-suggestions"
        className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
      />
      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />

      {showList && (
        <ul
          id="venue-suggestions"
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-sm"
        >
          {suggestions.map((venue, i) => (
            <li
              key={venue}
              role="option"
              aria-selected={i === highlighted}
              // mousedown so the choice lands before the input loses focus
              onMouseDown={e => {
                e.preventDefault();
                choose(venue);
              }}
              onMouseEnter={() => setHighlighted(i)}
              className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${i === highlighted ? 'bg-emerald-50 text-emerald-900' : 'text-slate-700'}`}
            >
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {venue}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
