import React, { useLayoutEffect, useRef } from 'react';
import { PgLetterFields } from '../types';
import { Bus, Plus, X } from 'lucide-react';

const ATTIRE_OPTIONS = [
  'School PE T-shirt and school shorts/skirt',
  'School polo shirt and school shorts/skirt',
  'Full School Uniform',
];

const MAX_OBJECTIVES = 6;

const todayLong = () => new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' });

export const emptyPgLetterFields = (): PgLetterFields => ({
  year: String(new Date().getFullYear()),
  referenceNumber: '',
  letterDate: todayLong(),
  subject: '',
  eventName: '',
  eventDate: '',
  reportingTime: '',
  reportingVenue: '',
  dismissalTime: '',
  dismissalVenue: '',
  attire: ATTIRE_OPTIONS[0],
  transportation: '',
  objectives: [],
  contactTeachers: '',
});

// Editable fields drawn inside the letter: they look like the letter's text, with a light
// highlight so teachers can see what they can change. Empty fields show the template's
// <<placeholder>> in red, as in the Word template.
const fieldClass =
  'bg-amber-50 hover:bg-amber-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-sm text-slate-900 placeholder:text-rose-500 transition-colors';

const InlineField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  maxLength?: number;
  inputMode?: 'numeric' | 'text';
  ariaLabel?: string;
}> = ({ value, onChange, placeholder, className = '', maxLength, inputMode, ariaLabel }) => (
  <input
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    maxLength={maxLength}
    inputMode={inputMode}
    aria-label={ariaLabel || placeholder}
    size={Math.max(value ? value.length + 1 : placeholder.length, 2)}
    className={`${fieldClass} px-0.5 max-w-full ${className}`}
  />
);

const BlockField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  ariaLabel?: string;
}> = ({ value, onChange, placeholder, className = '', ariaLabel }) => {
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
      placeholder={placeholder}
      aria-label={ariaLabel || placeholder}
      className={`${fieldClass} block w-full resize-none overflow-hidden px-1 leading-relaxed ${className}`}
    />
  );
};

interface PgLetterEditorProps {
  fields: PgLetterFields;
  onChange: (fields: PgLetterFields) => void;
  includeTransport: boolean;
  onIncludeTransportChange: (include: boolean) => void;
  actions?: React.ReactNode; // shown at the top right of the letter, e.g. a download button
}

// The school's PG letter template, laid out as on paper, with every field editable in place.
// Used by the PG Letter Writer and by the PG letter in a programme's deliverables.
export const PgLetterEditor: React.FC<PgLetterEditorProps> = ({
  fields,
  onChange,
  includeTransport,
  onIncludeTransportChange: setIncludeTransport,
  actions,
}) => {
  const setField = <K extends keyof PgLetterFields>(key: K, value: PgLetterFields[K]) =>
    onChange({ ...fields, [key]: value });

  const updateObjective = (index: number, value: string) =>
    setField('objectives', fields.objectives.map((o, i) => (i === index ? value : o)));

  const referenceIsValid = /^\d{3}$/.test(fields.referenceNumber);

  return (
    <>
      {/* The letter itself is the editor */}
      <div className={`mx-auto w-full max-w-[820px] flex flex-wrap items-center gap-2 text-[11px] text-slate-500 ${actions ? 'justify-between' : 'justify-center'}`}>
        <span className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-200 shrink-0" />
          <span>Highlighted text can be edited. Red text marks a field still to be filled in.</span>
        </span>
        {actions}
      </div>

      <div
        className="bg-white rounded-sm border border-slate-300 shadow-lg mx-auto w-full max-w-[820px] px-6 py-8 sm:px-14 sm:py-12 text-slate-900 text-[14px] leading-relaxed space-y-5"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        <img src="/pg_letter_logo.png" alt="Hillgrove Secondary School" className="h-16 object-contain" />

        <div>
          <p className="flex flex-wrap items-baseline">
            <span>HGV</span>
            <InlineField value={fields.year} onChange={v => setField('year', v.replace(/\D/g, '').slice(0, 4))} placeholder="<<year>>" inputMode="numeric" ariaLabel="Year" />
            <span>/</span>
            <InlineField
              value={fields.referenceNumber}
              onChange={v => setField('referenceNumber', v.replace(/\D/g, '').slice(0, 3))}
              placeholder="<<reference number>>"
              inputMode="numeric"
              ariaLabel="Reference number (3 digits)"
            />
          </p>
          {!referenceIsValid && (
            <p className="text-[11px] text-rose-600 mt-1">Enter the 3-digit reference number, e.g. 067.</p>
          )}
        </div>

        <p>
          <InlineField value={fields.letterDate} onChange={v => setField('letterDate', v)} placeholder="<<date>>" ariaLabel="Letter date" />
        </p>

        <p>Dear Parents/ Guardians,</p>

        <p className="flex flex-wrap items-baseline font-bold underline">
          <span className="mr-1">RE:</span>
          <span className="flex-1 min-w-[12rem]">
            <BlockField value={fields.subject} onChange={v => setField('subject', v)} placeholder="<<subject>>" className="font-bold underline" ariaLabel="Subject" />
          </span>
        </p>

        <p>We are happy to inform you that your child/ward will be involved in the programme below.</p>

        <table className="w-full border-collapse border border-slate-800">
          <tbody>
            <tr>
              <td className="border border-slate-800 px-2 py-1.5 align-top w-32">Event</td>
              <td className="border border-slate-800 px-2 py-1.5 align-top">
                <BlockField value={fields.eventName} onChange={v => setField('eventName', v)} placeholder="<<Event Name>>" ariaLabel="Event name" />
              </td>
            </tr>
            <tr>
              <td className="border border-slate-800 px-2 py-1.5 align-top">Date</td>
              <td className="border border-slate-800 px-2 py-1.5 align-top">
                <BlockField value={fields.eventDate} onChange={v => setField('eventDate', v)} placeholder="<<date>>" ariaLabel="Event date" />
              </td>
            </tr>
            <tr>
              <td className="border border-slate-800 px-2 py-1.5 align-top">Reporting</td>
              <td className="border border-slate-800 px-2 py-1.5 align-top space-y-0.5">
                <div className="flex flex-wrap items-baseline gap-x-1">
                  <span>Reporting Time:</span>
                  <InlineField value={fields.reportingTime} onChange={v => setField('reportingTime', v)} placeholder="<<reporting time>>" ariaLabel="Reporting time" />
                </div>
                <div className="flex items-baseline gap-x-1">
                  <span className="shrink-0">Venue:</span>
                  <BlockField value={fields.reportingVenue} onChange={v => setField('reportingVenue', v)} placeholder="<<reporting venue>>" ariaLabel="Reporting venue" />
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-slate-800 px-2 py-1.5 align-top">Dismissal</td>
              <td className="border border-slate-800 px-2 py-1.5 align-top space-y-0.5">
                <div className="flex flex-wrap items-baseline gap-x-1">
                  <span>Dismissal Time:</span>
                  <InlineField value={fields.dismissalTime} onChange={v => setField('dismissalTime', v)} placeholder="<<dismissal time>>" ariaLabel="Dismissal time" />
                </div>
                <div className="flex items-baseline gap-x-1">
                  <span className="shrink-0">Venue:</span>
                  <BlockField value={fields.dismissalVenue} onChange={v => setField('dismissalVenue', v)} placeholder="<<dismissal venue>>" ariaLabel="Dismissal venue" />
                </div>
              </td>
            </tr>
            <tr>
              <td className="border border-slate-800 px-2 py-1.5 align-top">Attire</td>
              <td className="border border-slate-800 px-2 py-1.5 align-top">
                <BlockField value={fields.attire} onChange={v => setField('attire', v)} placeholder="<<attire>>" ariaLabel="Attire" />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {ATTIRE_OPTIONS.filter(option => option !== fields.attire).map(option => (
                    <button
                      key={option}
                      onClick={() => setField('attire', option)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </td>
            </tr>
            {includeTransport && (
              <tr>
                <td className="border border-slate-800 px-2 py-1.5 align-top">
                  <div className="flex items-start justify-between gap-1">
                    <span>Transportation</span>
                    <button
                      onClick={() => setIncludeTransport(false)}
                      className="text-slate-400 hover:text-rose-600"
                      title="Remove the Transportation row"
                      aria-label="Remove the Transportation row"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
                <td className="border border-slate-800 px-2 py-1.5 align-top">
                  <BlockField
                    value={fields.transportation}
                    onChange={v => setField('transportation', v)}
                    placeholder="<<transportation details>>"
                    ariaLabel="Transportation details"
                  />
                </td>
              </tr>
            )}
            <tr>
              <td className="border border-slate-800 px-2 py-1.5 align-top">Objectives</td>
              <td className="border border-slate-800 px-2 py-1.5 align-top space-y-3">
                {fields.objectives.map((objective, index) => (
                  <div key={index} className="flex items-start gap-1 group">
                    <BlockField
                      value={objective}
                      onChange={v => updateObjective(index, v)}
                      placeholder={`<<objective ${index + 1}>>`}
                      ariaLabel={`Objective ${index + 1}`}
                    />
                    <button
                      onClick={() => setField('objectives', fields.objectives.filter((_, i) => i !== index))}
                      className="mt-1 text-slate-300 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                      title="Remove objective"
                      aria-label={`Remove objective ${index + 1}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {fields.objectives.length < MAX_OBJECTIVES && (
                  <button
                    onClick={() => setField('objectives', [...fields.objectives, ''])}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add objective
                  </button>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {!includeTransport && (
          <button
            onClick={() => setIncludeTransport(true)}
            className="-mt-3 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
          >
            <Bus className="w-3.5 h-3.5" /> Add Transportation row
          </button>
        )}

        <p>
          For further information or clarification, please do not hesitate to contact the school{' '}
          {fields.contactTeachers && <span>or </span>}
          <InlineField
            value={fields.contactTeachers}
            onChange={v => setField('contactTeachers', v)}
            placeholder="+ teacher's name (optional)"
            className={fields.contactTeachers ? '' : 'placeholder:text-slate-400 italic'}
            ariaLabel="Teachers parents may contact (optional)"
          />{' '}
          at 6560 3726 or via email to <span className="text-blue-700 underline">hillgrove_ss@moe.edu.sg</span>.
        </p>
        <p>Thank you very much for your continued support to the school!</p>
        <p>In partnership with you</p>
        <p>Mrs Helen Tan-Lee<br />Principal</p>
        <p className="text-center font-bold italic">This is a computer-generated email. No signature is required.</p>

        <div className="border-t border-slate-200 pt-3 flex items-end justify-between gap-4 text-[9px] italic text-slate-500">
          <span>Hillgrove believes in the Potential of our students, builds their Character and helps them Succeed.</span>
          <span className="text-right not-italic shrink-0 border-l border-slate-400 pl-2 leading-tight">
            10 Bukit Batok Street 52<br />Singapore 659250<br />Tel: 6560-3726<br />www.hillgrovesec.moe.edu.sg
          </span>
        </div>
      </div>
    </>
  );
};
