import React, { useEffect, useRef, useState } from 'react';
import { Award, CalendarDays, Check, ChevronDown, Footprints, Handshake, Leaf, MapPin, Music, Tent, Trophy, UsersRound } from 'lucide-react';
import { ProgrammeType } from '../../types';
import { PROGRAMME_TYPE_OPTIONS } from '../../programmeSettings';

export const PROGRAMME_TYPE_ICONS: Record<ProgrammeType, React.ElementType> = {
  Training: UsersRound,
  'School Event': CalendarDays,
  'Learning Journey': MapPin,
  Camp: Tent,
  Investiture: Award,
  Exchange: Handshake,
  VIA: Leaf,
  Sports: Trophy,
  Performance: Music,
  Parades: Footprints,
};

// The event type list with an icon for each type; works with the keyboard like a select
export const EventTypeSelect: React.FC<{ value: ProgrammeType; onChange: (type: ProgrammeType) => void; id?: string }> = ({ value, onChange, id }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selected = PROGRAMME_TYPE_OPTIONS.find(o => o.value === value) || PROGRAMME_TYPE_OPTIONS[0];
  const SelectedIcon = PROGRAMME_TYPE_ICONS[selected.value];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const openList = () => {
    setActive(Math.max(0, PROGRAMME_TYPE_OPTIONS.findIndex(o => o.value === value)));
    setOpen(true);
  };
  const choose = (i: number) => {
    onChange(PROGRAMME_TYPE_OPTIONS[i].value);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, PROGRAMME_TYPE_OPTIONS.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape' || e.key === 'Tab') setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`w-full h-11 px-3.5 flex items-center gap-2.5 rounded-xl border bg-white text-[15px] text-slate-900 text-left transition ${
          open ? 'border-emerald-600 ring-4 ring-emerald-600/10' : 'border-slate-300 hover:border-slate-400'
        } focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10`}
      >
        <SelectedIcon className="w-[18px] h-[18px] text-emerald-700 shrink-0" />
        <span className="flex-1 truncate">{selected.label}</span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label="Event type"
          className="absolute z-30 mt-1.5 w-full min-w-[19rem] max-h-[22rem] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"
        >
          {PROGRAMME_TYPE_OPTIONS.map((o, i) => {
            const Icon = PROGRAMME_TYPE_ICONS[o.value];
            const isSelected = o.value === value;
            return (
              <li
                key={o.value}
                role="option"
                data-index={i}
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={e => e.preventDefault()}
                onClick={() => choose(i)}
                className={`flex items-center gap-3 px-2.5 py-2 rounded-lg cursor-pointer text-[14px] ${
                  isSelected ? 'bg-emerald-50 text-emerald-900 font-medium' : i === active ? 'bg-slate-50 text-slate-900' : 'text-slate-700'
                }`}
              >
                <Icon className="w-[18px] h-[18px] text-emerald-700 shrink-0" />
                <span className="flex-1">
                  {o.label}
                  {o.hint && <span className="text-slate-500 font-normal"> ({o.hint})</span>}
                </span>
                {isSelected && <Check className="w-4 h-4 text-emerald-700" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
