import React, { useMemo, useState } from 'react';
import { Sun, Building2, Activity } from 'lucide-react';
import { VenueSetting } from '../types';
import { suggestSettings } from '../programmeSettings';

// Indoors / Outdoors / Both, and physically strenuous or not. Both start from the programme
// type and the words in its details; once the teacher picks one, it stays as they set it.
export const useProgrammeSettings = (type: string, ...texts: string[]) => {
  const key = texts.join('\n');
  const suggestion = useMemo(() => suggestSettings(type, ...texts), [type, key]); // eslint-disable-line react-hooks/exhaustive-deps
  const [settingChoice, setSettingChoice] = useState<VenueSetting | null>(null);
  const [strenuousChoice, setStrenuousChoice] = useState<boolean | null>(null);
  return {
    setting: settingChoice ?? suggestion.setting,
    strenuous: strenuousChoice ?? suggestion.strenuous,
    settingReason: settingChoice ? '' : suggestion.settingReason,
    strenuousReason: strenuousChoice === null ? suggestion.strenuousReason : '',
    setSetting: setSettingChoice,
    setStrenuous: setStrenuousChoice,
  };
};

const SETTINGS: { value: VenueSetting; icon: React.ElementType; hint: string }[] = [
  { value: 'Indoors', icon: Building2, hint: 'All indoors' },
  { value: 'Outdoors', icon: Sun, hint: 'All or mostly outdoors' },
  { value: 'Both', icon: Sun, hint: 'Indoor and outdoor parts' },
];

const segment = (active: boolean) =>
  `flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition border ${
    active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
  }`;

interface ProgrammeSettingsPickerProps {
  setting: VenueSetting;
  strenuous: boolean;
  settingReason?: string;
  strenuousReason?: string;
  onSettingChange: (setting: VenueSetting) => void;
  onStrenuousChange: (strenuous: boolean) => void;
}

export const ProgrammeSettingsPicker: React.FC<ProgrammeSettingsPickerProps> = ({
  setting, strenuous, settingReason, strenuousReason, onSettingChange, onStrenuousChange,
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
    <div className="space-y-1.5">
      <span className="block font-semibold text-slate-700">Indoors or outdoors</span>
      <div role="radiogroup" aria-label="Indoors or outdoors" className="inline-flex rounded-lg overflow-hidden [&>button+button]:-ml-px">
        {SETTINGS.map(({ value, icon: Icon, hint }, i) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={setting === value}
            title={hint}
            onClick={() => onSettingChange(value)}
            className={`${segment(setting === value)} ${i === 0 ? 'rounded-l-lg' : ''} ${i === SETTINGS.length - 1 ? 'rounded-r-lg' : ''}`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{value}</span>
          </button>
        ))}
      </div>
      {settingReason && <p className="text-[11px] text-slate-500">{settingReason}</p>}
    </div>
    <div className="space-y-1.5">
      <span className="block font-semibold text-slate-700">Physically strenuous</span>
      <div role="radiogroup" aria-label="Physically strenuous" className="inline-flex rounded-lg overflow-hidden [&>button+button]:-ml-px">
        {[true, false].map((value, i) => (
          <button
            key={String(value)}
            type="button"
            role="radio"
            aria-checked={strenuous === value}
            onClick={() => onStrenuousChange(value)}
            className={`${segment(strenuous === value)} ${i === 0 ? 'rounded-l-lg' : 'rounded-r-lg'}`}
          >
            {value && <Activity className="w-3.5 h-3.5" />}
            <span>{value ? 'Yes' : 'No'}</span>
          </button>
        ))}
      </div>
      {strenuousReason && <p className="text-[11px] text-slate-500">{strenuousReason}</p>}
    </div>
  </div>
);
