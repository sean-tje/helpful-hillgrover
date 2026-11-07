import React, { useLayoutEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { StudentBriefFields } from '../types';
import { BRIEF_ANNEX_LABEL, BRIEF_HEADING, FOUR_AS } from '../briefText';

// The student brief (Annex A) laid out like the school's form, with every value editable in
// place. Used by the planner and the programme page.

const ATTIRE_OPTIONS = [
  'School PE T-shirt and school shorts/skirt',
  'School polo shirt and school shorts/skirt',
  'Full School Uniform',
];

const fieldClass =
  'bg-amber-50 hover:bg-amber-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-sm text-slate-900 placeholder:text-rose-500 transition-colors';

const Field: React.FC<{ value: string; onChange: (v: string) => void; label: string; placeholder?: string; className?: string }> = ({
  value, onChange, label, placeholder, className = '',
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={e => onChange(e.target.value.replace(/\n/g, ' '))}
      aria-label={label}
      placeholder={placeholder ?? `<<${label.toLowerCase()}>>`}
      className={`${fieldClass} block w-full resize-none overflow-hidden px-1 leading-snug ${className}`}
    />
  );
};

interface StudentBriefEditorProps {
  fields: StudentBriefFields;
  onChange: (fields: StudentBriefFields) => void;
}

export const StudentBriefEditor: React.FC<StudentBriefEditorProps> = ({ fields, onChange }) => {
  const set = <K extends keyof StudentBriefFields>(key: K, value: StudentBriefFields[K]) => onChange({ ...fields, [key]: value });
  const setItem = (i: number, v: string) => set('items', fields.items.map((item, j) => (j === i ? v : item)));
  const setReminder = (i: number, key: 'name' | 'text', v: string) =>
    set('reminders', fields.reminders.map((r, j) => (j === i ? { ...r, [key]: v } : r)));
  const missingAs = FOUR_AS.filter(a => !fields.reminders.some(r => r.name.toLowerCase() === a.name.toLowerCase()));

  const row = (label: string, children: React.ReactNode) => (
    <tr>
      <td className="border border-slate-800 px-2 py-1 align-top w-[27%]">{label}</td>
      <td className="border border-slate-800 px-1.5 py-1 align-top">{children}</td>
    </tr>
  );

  const removeButton = (onClick: () => void, label: string) => (
    <button onClick={onClick} className="mt-0.5 text-slate-300 hover:text-rose-600 shrink-0" title={label} aria-label={label}>
      <X className="w-3.5 h-3.5" />
    </button>
  );

  return (
    <>
      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
        <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-200" />
        <span>Highlighted text can be edited. Red text marks a field still to be filled in.</span>
      </div>

      <div
        className="bg-white rounded-sm border border-slate-300 shadow-lg mx-auto w-full max-w-[820px] px-5 py-8 sm:px-14 sm:py-10 text-slate-900 text-[14px] leading-snug space-y-5"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        <img src="/pg_letter_logo.png" alt="Hillgrove Secondary School" className="h-16 object-contain" />
        <p className="text-right font-bold underline">{BRIEF_ANNEX_LABEL}</p>
        <p className="text-center font-bold">{BRIEF_HEADING}</p>

        <table className="w-full border-collapse border border-slate-800">
          <tbody>
            {row('Title of activity:', <Field value={fields.title} onChange={v => set('title', v)} label="Title of activity" />)}
            {row('Date:', <Field value={fields.date} onChange={v => set('date', v)} label="Date" placeholder="e.g. 27 June 2026 (Saturday)" />)}
            {row('Reporting Venue:', <Field value={fields.reportingVenue} onChange={v => set('reportingVenue', v)} label="Reporting venue" />)}
            {row('Reporting Time:', <Field value={fields.reportingTime} onChange={v => set('reportingTime', v)} label="Reporting time" placeholder="e.g. 7.30am" />)}
            {row('Dismissal Venue:', <Field value={fields.dismissalVenue} onChange={v => set('dismissalVenue', v)} label="Dismissal venue" />)}
            {row('Dismissal Time:', <Field value={fields.dismissalTime} onChange={v => set('dismissalTime', v)} label="Dismissal time" placeholder="e.g. 12.40pm" />)}
            {row('Attire:', (
              <>
                <Field value={fields.attire} onChange={v => set('attire', v)} label="Attire" />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {ATTIRE_OPTIONS.filter(option => option !== fields.attire).map(option => (
                    <button
                      key={option}
                      onClick={() => set('attire', option)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </>
            ))}
            {fields.items.length > 0 && row('Items to bring:', (
              <ul className="space-y-0.5">
                {fields.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="pl-3 pr-1">•</span>
                    <Field value={item} onChange={v => setItem(i, v)} label={`Item ${i + 1}`} placeholder="Item" />
                    {removeButton(() => set('items', fields.items.filter((_, j) => j !== i)), `Remove ${item || 'item'}`)}
                  </li>
                ))}
              </ul>
            ))}
            {row('Reminders', (
              <div className="space-y-1">
                {fields.reminders.map((r, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <div className="w-28 shrink-0">
                      <Field value={r.name} onChange={v => setReminder(i, 'name', v)} label={`Reminder ${i + 1} name`} placeholder="e.g. Attendance" className="font-bold" />
                    </div>
                    <span className="pt-px">:</span>
                    <Field value={r.text} onChange={v => setReminder(i, 'text', v)} label={`Reminder ${i + 1}`} placeholder="Reminder" />
                    {removeButton(() => set('reminders', fields.reminders.filter((_, j) => j !== i)), `Remove ${r.name || 'reminder'}`)}
                  </div>
                ))}
              </div>
            ))}
          </tbody>
        </table>

        <div className="flex flex-wrap gap-3 text-[11px]">
          <button
            onClick={() => set('items', [...fields.items, ''])}
            className="font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> {fields.items.length ? 'Add item to bring' : 'Add the Items to bring row'}
          </button>
          {missingAs.map(a => (
            <button
              key={a.name}
              onClick={() => set('reminders', [...fields.reminders, { ...a }])}
              className="font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add {a.name}{a.name === 'Assignments' ? ' (academic programmes)' : ''}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};
