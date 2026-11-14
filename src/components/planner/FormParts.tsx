import React from 'react';
import { ChevronDown, UserRound } from 'lucide-react';
import { User } from '../../types';

// Shared pieces for the Create programme page: sections with a label on the left, fields
// with sentence-case labels, and inputs in one consistent style.

export const inputClass =
  'w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-[15px] text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 transition disabled:bg-slate-50 disabled:text-slate-600 disabled:hover:border-slate-300';

export const checkboxClass = 'w-5 h-5 rounded-md accent-emerald-700 cursor-pointer shrink-0';

// MOE 21st Century Competencies, offered as quick picks for the learning objectives
export const COMPETENCIES = [
  'Critical, adaptive and inventive thinking',
  'Communication, collaboration and information skills',
  'Civic literacy, global awareness and cross-cultural skills',
  'Self-awareness',
  'Self-management',
  'Social awareness',
  'Relationship management',
  'Responsible decision-making',
];

export const FormSection: React.FC<{ icon: React.ElementType; title: string; first?: boolean; children: React.ReactNode }> = ({
  icon: Icon, title, first, children,
}) => (
  <section className={`grid grid-cols-1 lg:grid-cols-[13rem_1fr] gap-x-8 gap-y-5 py-8 ${first ? '' : 'border-t border-slate-100'}`}>
    <div className="flex items-center lg:items-start gap-3">
      <span className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
        <Icon className="w-[22px] h-[22px] text-emerald-700" strokeWidth={1.75} />
      </span>
      <h2 className="text-[20px] font-bold text-slate-900 tracking-tight lg:pt-2">{title}</h2>
    </div>
    <div className="space-y-5 min-w-0">{children}</div>
  </section>
);

export const Field: React.FC<{
  label: string;
  required?: boolean;
  htmlFor?: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ label, required, htmlFor, aside, className = '', children }) => (
  <div className={className}>
    <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1.5 mb-1.5 min-h-[1.5rem]">
      <label htmlFor={htmlFor} className="text-[14px] font-semibold text-slate-800">
        {label}
        {required && <span className="text-rose-500 ml-0.5" aria-hidden="true">*</span>}
      </label>
      {aside}
    </div>
    {children}
  </div>
);

// A one-line input with a subtle character count inside
export const CountedInput: React.FC<{ id: string; value: string; onChange: (v: string) => void; max: number; placeholder: string }> = ({
  id, value, onChange, max, placeholder,
}) => (
  <div className="relative">
    <input
      id={id}
      value={value}
      maxLength={max}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${inputClass} pr-20`}
    />
    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] tabular-nums text-slate-400 pointer-events-none">
      {value.length} / {max}
    </span>
  </div>
);

// A committee member picker (with "None" for the 2IC and 3IC)
export const StaffSelect: React.FC<{
  id: string;
  value: string;
  onChange: (id: string) => void;
  options: User[];
  currentUserId: string;
  allowNone?: boolean;
  disabled?: boolean;
}> = ({ id, value, onChange, options, currentUserId, allowNone, disabled }) => (
  <div className="relative">
    <UserRound className="w-[18px] h-[18px] text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      className={`${inputClass} appearance-none pl-10 pr-10`}
    >
      {allowNone && <option value="">None</option>}
      {options.map(u => (
        <option key={u.id} value={u.id}>{u.name}{u.id === currentUserId ? ' (you)' : ''}</option>
      ))}
    </select>
    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
  </div>
);
