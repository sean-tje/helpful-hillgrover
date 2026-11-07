import React, { useLayoutEffect, useRef } from 'react';
import { VCT_ATTENTION, formatVctDetails } from '../vctFormat';

// The all-staff VCT notice in the school's table: S/N (left blank), Notice by, VCT Details,
// For attention by. The details are edited as text; the preview shows how they will look.

const fieldClass =
  'bg-amber-50 hover:bg-amber-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-sm text-slate-900 transition-colors';

const AutoText: React.FC<{ value: string; onChange: (v: string) => void; label: string; placeholder?: string }> = ({ value, onChange, label, placeholder }) => {
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
      onChange={e => onChange(e.target.value)}
      aria-label={label}
      placeholder={placeholder}
      className={`${fieldClass} block w-full resize-none overflow-hidden px-1 py-0.5 leading-snug`}
    />
  );
};

export const VctDetailsPreview: React.FC<{ text: string }> = ({ text }) => (
  <div className="leading-snug">
    {formatVctDetails(text).map((line, i) => {
      const runs = line.runs.map((run, j) => (
        <span
          key={j}
          className={`${run.bold ? 'font-bold' : ''} ${run.underline ? 'underline' : ''} ${run.color === 'blue' ? 'text-blue-700' : run.color === 'red' ? 'text-red-600' : ''} ${run.placeholder && !line.placeholder ? 'bg-slate-200 text-slate-600 rounded-sm px-0.5' : ''}`}
        >
          {run.text}
        </span>
      ));
      if (line.placeholder) {
        return (
          <div key={i} className="my-1.5 mx-auto max-w-[80%] border-2 border-dashed border-slate-400 bg-slate-50 text-slate-500 text-center py-4 rounded-sm">
            {runs}
          </div>
        );
      }
      if (line.bullet) {
        return (
          <div key={i} className="flex gap-2 pl-6">
            <span>•</span>
            <span>{runs}</span>
          </div>
        );
      }
      return <div key={i} className="min-h-[1em]">{runs}</div>;
    })}
  </div>
);

interface VctEditorProps {
  details: string;
  onDetailsChange: (value: string) => void;
  noticeBy: string;
  onNoticeByChange: (value: string) => void;
}

export const VctEditor: React.FC<VctEditorProps> = ({ details, onDetailsChange, noticeBy, onNoticeByChange }) => (
  <>
    <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 text-center">
      <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-200 shrink-0" />
      <span>Highlighted text can be edited. The first line is the title. Dates and times turn bold blue, annexes bold red, and [square brackets] are things to fill in.</span>
    </div>
    <div className="bg-white border border-slate-300 shadow-lg rounded-sm p-3 sm:p-5 space-y-4 text-[12px]" style={{ fontFamily: 'Arial, sans-serif' }}>
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[7%]" />
          <col className="w-[17%]" />
          <col />
          <col className="w-[15%]" />
        </colgroup>
        <thead>
          <tr className="bg-slate-200">
            {['S/N', 'Notice by', 'VCT Details', 'For attention by'].map(h => (
              <th key={h} className="border border-slate-700 px-1 py-1 font-bold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="align-top">
            <td className="border border-slate-700" />
            <td className="border border-slate-700 p-0.5">
              <AutoText value={noticeBy} onChange={onNoticeByChange} label="Notice by" placeholder="Teacher planning" />
            </td>
            <td className="border border-slate-700 p-1.5">
              <VctDetailsPreview text={details} />
            </td>
            <td className="border border-slate-700 px-1.5 py-1">{VCT_ATTENTION}</td>
          </tr>
        </tbody>
      </table>
      <label className="block space-y-1">
        <span className="block font-bold">Edit the VCT details:</span>
        <AutoText value={details} onChange={onDetailsChange} label="VCT details" />
      </label>
    </div>
  </>
);
