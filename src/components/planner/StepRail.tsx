import React from 'react';
import { Check } from 'lucide-react';

// A slim milestone rail: current step filled green, completed steps ticked, upcoming outlined
const STEPS = ['Details', 'Deliverables', 'Milestone Review'];

export const StepRail: React.FC<{ step: 1 | 2 | 3 }> = ({ step }) => (
  <ol className="flex items-center gap-3 text-[15px]" aria-label="Progress">
    {STEPS.map((label, i) => {
      const n = i + 1;
      const state = n < step ? 'done' : n === step ? 'current' : 'upcoming';
      return (
        <li key={label} className="flex items-center gap-3" aria-current={state === 'current' ? 'step' : undefined}>
          {i > 0 && <span className={`w-6 sm:w-16 lg:w-24 h-px ${n <= step ? 'bg-emerald-600' : 'bg-slate-300'}`} aria-hidden="true" />}
          <span className={`relative flex items-center gap-2 pb-2 ${state === 'current' ? 'text-emerald-700 font-semibold' : state === 'done' ? 'text-slate-700' : 'text-slate-500'}`}>
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 ${
                state === 'current' ? 'bg-emerald-700 text-white'
                : state === 'done' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600'
                : 'bg-white text-slate-500 ring-1 ring-slate-300'
              }`}
            >
              {state === 'done' ? <Check className="w-4 h-4" /> : n}
            </span>
            <span className={`whitespace-nowrap ${state === 'current' ? '' : 'hidden sm:inline'}`}>{label}</span>
            {state === 'current' && <span className="absolute left-0 right-0 -bottom-0.5 h-0.5 rounded-full bg-emerald-600" aria-hidden="true" />}
          </span>
        </li>
      );
    })}
  </ol>
);
