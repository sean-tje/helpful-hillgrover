import React, { useLayoutEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { RamsFields, RamsRow } from '../types';
import { RAMS_SCHOOL_NAME, SEVERITY_LABELS, LIKELIHOOD_LABELS, formatRiskLevel, riskBand } from '../ramsText';

// The RAMS laid out like the school's RAMS form, with every field editable in place.
// Used by the RAMS Writer, the planner's deliverable 1 and the programme page.

const fieldClass =
  'bg-amber-50 hover:bg-amber-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-sm text-slate-900 placeholder:text-rose-400 transition-colors';

const AutoText: React.FC<{ value: string; onChange: (v: string) => void; label: string; placeholder?: string; className?: string }> = ({
  value, onChange, label, placeholder = '', className = '',
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
      onChange={e => onChange(e.target.value)}
      aria-label={label}
      placeholder={placeholder}
      className={`${fieldClass} block w-full resize-none overflow-hidden px-1 py-0.5 leading-snug ${className}`}
    />
  );
};

const Score: React.FC<{ value: number; onChange: (v: number) => void; label: string; labels: string[]; max?: number }> = ({
  value, onChange, label, labels, max = 5,
}) => (
  <select
    value={value}
    onChange={e => onChange(Number(e.target.value))}
    aria-label={label}
    title={labels[value]}
    className={`${fieldClass} w-full px-0.5 py-0.5 text-center`}
  >
    {Array.from({ length: max }, (_, i) => i + 1).map(n => (
      <option key={n} value={n}>{n}</option>
    ))}
  </select>
);

const bandClass = (level: number) => {
  const band = riskBand(level);
  return band === 'High' ? 'bg-rose-100 text-rose-900' : band === 'Medium' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900';
};

const emptyRow = (): RamsRow => ({
  activity: '', hazard: '', possibleAccident: '', severity: 3, likelihood: 2, likelihoodAfter: 1,
  riskControl: '', actionOfficer: '', remarks: '',
});

interface RamsEditorProps {
  fields: RamsFields;
  onChange: (fields: RamsFields) => void;
}

export const RamsEditor: React.FC<RamsEditorProps> = ({ fields, onChange }) => {
  const set = <K extends keyof RamsFields>(key: K, value: RamsFields[K]) => onChange({ ...fields, [key]: value });
  const setRow = (index: number, changes: Partial<RamsRow>) =>
    set('rows', fields.rows.map((row, i) => {
      if (i !== index) return row;
      const next = { ...row, ...changes };
      // The likelihood after the risk controls can't be higher than before them
      if (next.likelihoodAfter > next.likelihood) next.likelihoodAfter = next.likelihood;
      return next;
    }));

  const header = (labelText: string, key: keyof RamsFields) => (
    <>
      <th className="border border-slate-700 bg-slate-200 px-1.5 py-1 text-left font-bold align-top whitespace-nowrap">{labelText}</th>
      <td className="border border-slate-700 px-1 py-0.5 align-top">
        <AutoText value={String(fields[key] ?? '')} onChange={v => set(key, v as any)} label={labelText.replace(':', '')} />
      </td>
    </>
  );

  return (
    <>
      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
        <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-200" />
        <span>Highlighted text can be edited. Numbers in brackets are after the risk controls.</span>
      </div>

      <div className="bg-white border border-slate-300 shadow-lg rounded-sm p-3 sm:p-5 space-y-4 overflow-x-auto text-[12px]" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* RAMS FORM header */}
        <table className="w-full min-w-[860px] border-collapse">
          <tbody>
            <tr><th colSpan={8} className="border border-slate-700 bg-slate-200 py-1 font-bold">RAMS FORM</th></tr>
            <tr>
              <th className="border border-slate-700 bg-slate-200 px-1.5 py-1 text-left font-bold whitespace-nowrap">School Name:</th>
              <td className="border border-slate-700 px-1.5 py-1">{RAMS_SCHOOL_NAME}</td>
              {header('RAMS Team Leader:', 'teamLeader')}
              {header('Vetted By:', 'vettedBy')}
              {header('Approved By:', 'approvedBy')}
            </tr>
            <tr>
              {header('Location:', 'location')}
              {header('Member(s):', 'members')}
              {header('Designation:', 'vettedDesignation')}
              {header('Designation:', 'approvedDesignation')}
            </tr>
            <tr>
              {header('Activity/ Process:', 'activity')}
              {header('Date of Activity:', 'activityDate')}
              {header('Date:', 'vettedDate')}
              {header('Date:', 'approvedDate')}
            </tr>
            <tr>
              {header('No. of Students:', 'numberOfStudents')}
              {header('No. of Teachers:', 'numberOfTeachers')}
              <th className="border border-slate-700 bg-slate-200 px-1.5 py-1 text-left font-bold">Signature:</th>
              <td className="border border-slate-700" />
              <th className="border border-slate-700 bg-slate-200 px-1.5 py-1 text-left font-bold">Signature:</th>
              <td className="border border-slate-700" />
            </tr>
            <tr>
              {header('Last Review Date:', 'lastReviewDate')}
              {header('Next Review Date:', 'nextReviewDate')}
              <td colSpan={4} className="border border-slate-700" />
            </tr>
          </tbody>
        </table>

        {/* Hazard table */}
        <table className="w-full min-w-[1080px] border-collapse">
          <thead>
            <tr className="bg-slate-200">
              <th colSpan={4} className="border border-slate-700 px-1 py-1">
                Hazard Identification
                <div className="font-normal text-[10px]">(Refer to ‘W’ Checklist in Chapter 2 of the School Safety Handbook)</div>
              </th>
              <th colSpan={3} className="border border-slate-700 px-1 py-1">Risk Evaluation</th>
              <th colSpan={3} className="border border-slate-700 px-1 py-1">Implementation</th>
            </tr>
            <tr className="bg-slate-200 text-[11px]">
              <th className="border border-slate-700 px-1 py-1 w-8">No.</th>
              <th className="border border-slate-700 px-1 py-1 w-36">Description of Activities/ Work Processes</th>
              <th className="border border-slate-700 px-1 py-1 w-36">Hazard</th>
              <th className="border border-slate-700 px-1 py-1 w-36">Possible Accident / Ill Health</th>
              <th className="border border-slate-700 px-1 py-1 w-16">Severity</th>
              <th className="border border-slate-700 px-1 py-1 w-24">Likelihood<div className="font-normal">(after)</div></th>
              <th className="border border-slate-700 px-1 py-1 w-16">Risk Level</th>
              <th className="border border-slate-700 px-1 py-1">Risk Control</th>
              <th className="border border-slate-700 px-1 py-1 w-32">Action Officer, Designation (Follow-up date)</th>
              <th className="border border-slate-700 px-1 py-1 w-28">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {fields.rows.map((row, i) => {
              const after = row.severity * (row.likelihoodAfter || row.likelihood);
              return (
                <tr key={i} className="align-top group">
                  <td className="border border-slate-700 px-1 py-1 text-center">
                    <div>{i + 1}</div>
                    <button
                      onClick={() => set('rows', fields.rows.filter((_, j) => j !== i))}
                      className="mt-1 text-slate-300 hover:text-rose-600"
                      title="Remove this row"
                      aria-label={`Remove row ${i + 1}`}
                    >
                      <X className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </td>
                  <td className="border border-slate-700 p-0.5"><AutoText value={row.activity} onChange={v => setRow(i, { activity: v })} label={`Row ${i + 1} activity`} placeholder="Activity" /></td>
                  <td className="border border-slate-700 p-0.5"><AutoText value={row.hazard} onChange={v => setRow(i, { hazard: v })} label={`Row ${i + 1} hazard`} placeholder="Hazard" /></td>
                  <td className="border border-slate-700 p-0.5"><AutoText value={row.possibleAccident} onChange={v => setRow(i, { possibleAccident: v })} label={`Row ${i + 1} possible accident`} placeholder="Possible accident" /></td>
                  <td className="border border-slate-700 p-0.5">
                    <Score value={row.severity} onChange={v => setRow(i, { severity: v })} label={`Row ${i + 1} severity`} labels={SEVERITY_LABELS} />
                  </td>
                  <td className="border border-slate-700 p-0.5">
                    <div className="flex items-center gap-0.5">
                      <Score value={row.likelihood} onChange={v => setRow(i, { likelihood: v })} label={`Row ${i + 1} likelihood`} labels={LIKELIHOOD_LABELS} />
                      <span className="text-slate-500">(</span>
                      <Score value={row.likelihoodAfter} onChange={v => setRow(i, { likelihoodAfter: v })} label={`Row ${i + 1} likelihood after risk controls`} labels={LIKELIHOOD_LABELS} max={row.likelihood} />
                      <span className="text-slate-500">)</span>
                    </div>
                  </td>
                  <td className={`border border-slate-700 px-1 py-1 text-center font-semibold ${bandClass(after)}`} title={`${riskBand(after)} risk after the risk controls`}>
                    {formatRiskLevel(row)}
                  </td>
                  <td className="border border-slate-700 p-0.5"><AutoText value={row.riskControl} onChange={v => setRow(i, { riskControl: v })} label={`Row ${i + 1} risk control`} placeholder="One measure per line" /></td>
                  <td className="border border-slate-700 p-0.5"><AutoText value={row.actionOfficer} onChange={v => setRow(i, { actionOfficer: v })} label={`Row ${i + 1} action officer`} /></td>
                  <td className="border border-slate-700 p-0.5"><AutoText value={row.remarks} onChange={v => setRow(i, { remarks: v })} label={`Row ${i + 1} remarks`} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button
          onClick={() => set('rows', [...fields.rows, { ...emptyRow(), actionOfficer: fields.rows[0]?.actionOfficer || '' }])}
          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add row
        </button>

        <p className="text-[11px] text-slate-600">
          Risk Level = Severity x Likelihood. Severity: 1 Negligible, 2 Minor, 3 Moderate, 4 Major, 5 Catastrophic.
          Likelihood: 1 Rare, 2 Remote, 3 Occasional, 4 Frequent, 5 Almost certain. Numbers in brackets are after the risk controls.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="sm:col-span-2 space-y-1">
            <span className="block font-bold">Nearest Hospital:</span>
            <AutoText value={fields.nearestHospital} onChange={v => set('nearestHospital', v)} label="Nearest hospital" placeholder="Name, address and phone number of the nearest hospital" />
          </label>
          <label className="space-y-1">
            <span className="block font-bold">Emergency Number:</span>
            <AutoText value={fields.emergencyNumber} onChange={v => set('emergencyNumber', v)} label="Emergency number" />
          </label>
          <label className="sm:col-span-3 space-y-1">
            <span className="block font-bold">Remarks:</span>
            <AutoText value={fields.remarks} onChange={v => set('remarks', v)} label="Remarks" placeholder="Optional, e.g. remarks from HOD / PE & CCA" />
          </label>
        </div>
      </div>
    </>
  );
};
