import React, { useRef, useState } from 'react';
import { Plus, UserRound, X } from 'lucide-react';
import { User } from '../../types';

// Supporting teachers: any number of committee members, or other staff typed in by name
interface StaffChipsProps {
  users: User[]; // committee members who can still be picked
  selectedIds: string[];
  names: string[]; // staff outside the committee
  onChange: (ids: string[], names: string[]) => void;
}

export const StaffChips: React.FC<StaffChipsProps> = ({ users, selectedIds, names, onChange }) => {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const byId = (id: string) => users.find(u => u.id === id);
  const available = users.filter(u => !selectedIds.includes(u.id));
  const matches = available.filter(u => `${u.name} ${u.fullName || ''}`.toLowerCase().includes(query.trim().toLowerCase()));

  const startAdding = () => {
    setAdding(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  const addUser = (id: string) => {
    onChange([...selectedIds, id], names);
    setQuery('');
    inputRef.current?.focus();
  };
  const addTyped = () => {
    const name = query.trim();
    if (!name) return;
    const member = available.find(u => u.name.toLowerCase() === name.toLowerCase() || u.fullName?.toLowerCase() === name.toLowerCase());
    if (member) addUser(member.id);
    else if (!names.some(n => n.toLowerCase() === name.toLowerCase())) onChange(selectedIds, [...names, name]);
    setQuery('');
  };

  const chip = (key: string, label: string, onRemove: () => void) => (
    <span key={key} className="inline-flex items-center gap-1.5 h-8 pl-3 pr-1.5 rounded-full bg-slate-100 text-[14px] text-slate-800">
      {label}
      <button type="button" onClick={onRemove} className="w-5 h-5 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-800" aria-label={`Remove ${label}`}>
        <X className="w-3.5 h-3.5" />
      </button>
    </span>
  );

  return (
    <div className="relative">
      <div
        className="min-h-11 flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 bg-white focus-within:border-emerald-600 focus-within:ring-4 focus-within:ring-emerald-600/10"
        onClick={e => e.target === e.currentTarget && startAdding()}
      >
        <UserRound className="w-[18px] h-[18px] text-slate-500 shrink-0" aria-hidden="true" />
        {selectedIds.map(id => chip(id, byId(id)?.name || id, () => onChange(selectedIds.filter(x => x !== id), names)))}
        {names.map(n => chip(`name-${n}`, n, () => onChange(selectedIds, names.filter(x => x !== n))))}
        {adding ? (
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); addTyped(); }
              else if (e.key === 'Escape') { setAdding(false); setQuery(''); }
              else if (e.key === 'Backspace' && !query && (names.length || selectedIds.length)) {
                if (names.length) onChange(selectedIds, names.slice(0, -1));
                else onChange(selectedIds.slice(0, -1), names);
              }
            }}
            onBlur={() => setTimeout(() => { addTyped(); setAdding(false); }, 150)}
            placeholder="Type a name"
            aria-label="Add a supporting teacher"
            className="flex-1 min-w-[9rem] h-8 text-[14px] bg-transparent focus:outline-none placeholder:text-slate-400"
          />
        ) : (
          <button type="button" onClick={startAdding} className="inline-flex items-center gap-1 h-8 px-2 rounded-full text-[14px] font-semibold text-emerald-700 hover:bg-emerald-50">
            <Plus className="w-4 h-4" /> Add teachers
          </button>
        )}
      </div>
      {adding && (matches.length > 0 || query.trim()) && (
        <ul className="absolute z-20 mt-1.5 w-72 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 text-[14px]">
          {matches.map(u => (
            <li key={u.id}>
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => addUser(u.id)} className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50">
                <span className="text-slate-900">{u.name}</span>
                {u.fullName && <span className="text-slate-500"> · {u.fullName}</span>}
              </button>
            </li>
          ))}
          {query.trim() && !matches.some(u => u.name.toLowerCase() === query.trim().toLowerCase()) && (
            <li>
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={addTyped} className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-emerald-800">
                Add "{query.trim()}" (not in the committee)
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};
