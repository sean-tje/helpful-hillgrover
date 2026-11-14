// Programme types, and the venue setting (indoors / outdoors / both) and physical strain each
// one starts with. Words in the programme's name, venue or activities can move these up
// (never down), and the teacher has the final say. Shared by the planner, the RAMS Writer
// and the server, which uses the same rules when a setting is not given.
import type { ProgrammeType, VenueSetting } from './types';

// In order of how often they are used
// hint: examples shown after the name in the event type list
export const PROGRAMME_TYPE_OPTIONS: { value: ProgrammeType; label: string; hint?: string }[] = [
  { value: 'Training', label: 'Training, Workshops & Meetings' },
  { value: 'School Event', label: 'School Event' },
  { value: 'Learning Journey', label: 'Learning Journey' },
  { value: 'Camp', label: 'Camp' },
  { value: 'Investiture', label: 'Investiture' },
  { value: 'Exchange', label: 'Exchange with another school (Local)' },
  { value: 'VIA', label: 'VIA / Community Service' },
  { value: 'Sports', label: 'Sports', hint: 'e.g. Bubble Soccer, Laser Tag, NSG' },
  { value: 'Performance', label: 'Performance', hint: 'stage: dance, SYF' },
  { value: 'Parades', label: 'Parades & Drills', hint: 'Fancy drills display, NDP' },
];

export const programmeTypeOptionText = (o: { label: string; hint?: string }) => (o.hint ? `${o.label} (${o.hint})` : o.label);

export const programmeTypeLabel = (type?: string) =>
  PROGRAMME_TYPE_OPTIONS.find(o => o.value === type)?.label || type || '';

const TYPE_DEFAULTS: Record<ProgrammeType, { setting: VenueSetting; strenuous: boolean }> = {
  Training: { setting: 'Indoors', strenuous: false },
  'School Event': { setting: 'Indoors', strenuous: false },
  'Learning Journey': { setting: 'Indoors', strenuous: false },
  Camp: { setting: 'Both', strenuous: true },
  Investiture: { setting: 'Indoors', strenuous: false },
  Exchange: { setting: 'Indoors', strenuous: false },
  VIA: { setting: 'Indoors', strenuous: false },
  Sports: { setting: 'Outdoors', strenuous: true },
  Performance: { setting: 'Indoors', strenuous: true },
  Parades: { setting: 'Outdoors', strenuous: true },
};

// Outdoor places with indoor parts too (galleries, visitor centres): at least "Both"
const OUTDOOR_PLACES = /\b(fort canning|fort siloso|little guilin|sentosa|pulau ubin|ubin|parks?|gardens?|nature reserve|reserve|botanic|zoo|bird paradise|island|east coast|west coast|labrador|macritchie|bukit timah hill|southern ridges|coney)\b/i;
// Activities that happen outside: "Outdoors"
const OUTDOOR_ACTIVITIES = /\b(beach(es)?|coast(al)?|kayak(ing)?|canoe(ing)?|sailing|dragon ?boat|tree[- ]planting|litter[- ]?picking|clean[- ]?ups?|hik(e|es|ing)|trek(s|king)?|trails?|campsite|parade square|amazing race|orienteering|outdoors?)\b/i;
// Physically strenuous activities
const STRENUOUS = /\b(sports?|sports day|games day|nsg|national school games|laser tag|bubble soccer|football|soccer|basketball|netball|floorball|kayak(ing)?|canoe(ing)?|dragon ?boat|hik(e|es|ing)|trek(s|king)?|trails?|litter[- ]?picking|clean[- ]?ups?|tree[- ]planting|march(es|ing)?|parades?|drills?|dance|dancing|running|fun run|races?|cycling|climbing|high elements?|obstacle|swim(ming)?|amazing race|nerf|paintball|orienteering|fitness)\b/i;
// Nature areas, where wildlife and insects are a hazard
export const NATURE_AREAS = /\b(fort canning|fort siloso|little guilin|sentosa|pulau ubin|ubin|parks?|gardens?|nature|reserve|botanic|zoo|island|beach(es)?|coast(al)?|hik(e|es|ing)|trek(s|king)?|trails?|campsite|macritchie|bukit timah hill|southern ridges|coney|forest|mangrove)\b/i;

const RANK: Record<VenueSetting, number> = { Indoors: 0, Both: 1, Outdoors: 2 };

export interface SuggestedSettings {
  setting: VenueSetting;
  strenuous: boolean;
  settingReason: string;
  strenuousReason: string;
}

export const suggestSettings = (type: string | undefined, ...texts: (string | undefined)[]): SuggestedSettings => {
  const defaults = TYPE_DEFAULTS[type as ProgrammeType] || TYPE_DEFAULTS['School Event'];
  const text = texts.filter(Boolean).join(' ');

  let setting = defaults.setting;
  let settingReason = 'Set from the programme type.';
  const activity = text.match(OUTDOOR_ACTIVITIES)?.[0];
  const place = text.match(OUTDOOR_PLACES)?.[0];
  if (activity && RANK.Outdoors > RANK[setting]) {
    setting = 'Outdoors';
    settingReason = `Outdoors because the details mention "${activity}".`;
  } else if (place && RANK.Both > RANK[setting]) {
    setting = 'Both';
    settingReason = `Both because the details mention "${place}".`;
  }

  let strenuous = defaults.strenuous;
  let strenuousReason = 'Set from the programme type.';
  const strain = text.match(STRENUOUS)?.[0];
  if (!strenuous && strain) {
    strenuous = true;
    strenuousReason = `Strenuous because the details mention "${strain}".`;
  }
  return { setting, strenuous, settingReason, strenuousReason };
};

export const isVenueSetting = (value: unknown): value is VenueSetting =>
  value === 'Indoors' || value === 'Outdoors' || value === 'Both';
