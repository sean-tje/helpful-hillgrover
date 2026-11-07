// The student brief (Annex A), on the school's form: a table of the programme's details,
// the items to bring and the 4As reminders. Shared by the server (drafting and the Word
// file) and the editor.
import type { StudentBriefFields, StudentBriefReminder } from './types';

// The 4As in short wording for students. Assignments is only for academic programmes.
export const FOUR_AS: StudentBriefReminder[] = [
  { name: 'Attendance', text: 'Be present and punctual.' },
  { name: 'Appearance', text: 'Be a well-groomed student and uphold the image of the school.' },
  { name: 'Activeness', text: 'Be respectful and demonstrate a positive attitude.' },
  { name: 'Assignments', text: 'Be timely with all assignments.' },
];

const ACADEMIC_PATTERN = /academic|lesson|subject|revision|exam|assignment|homework|study|studies|curriculum|tuition|enrichment|olympiad|competition/i;

// Programmes whose name or details are about schoolwork (Learning Journeys do not count)
export const isAcademicProgramme = (type?: string, ...texts: (string | undefined)[]) =>
  type !== 'Learning Journey' && texts.some(t => ACADEMIC_PATTERN.test(t || ''));

export const remindersFor = (academic: boolean) =>
  FOUR_AS.filter(r => academic || r.name !== 'Assignments').map(r => ({ ...r }));

export const BRIEF_ANNEX_LABEL = 'Annex A';
export const BRIEF_HEADING = 'STUDENT INFORMATION BRIEF';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// "2026-06-27" -> "27 June 2026 (Saturday)"
export const formatDateWithDay = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} (${DAYS[d.getDay()]})`;
};

export const formatDateRangeWithDay = (start?: string, end?: string) =>
  !start ? '' : !end || end === start ? formatDateWithDay(start) : `${formatDateWithDay(start)} to ${formatDateWithDay(end)}`;

// "07:30" -> "7.30am"
export const formatClock = (value?: string) => {
  const m = String(value || '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return value || '';
  const h = Number(m[1]);
  return `${h % 12 || 12}.${m[2]}${h < 12 ? 'am' : 'pm'}`;
};

// The brief is filled in from the programme's own details, so it matches the PG letter
export const buildBriefFields = (input: {
  title?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  venue?: string;
  reportingVenue?: string;
  dismissalVenue?: string;
  attire?: string;
  items?: string[];
  academic?: boolean; // adds the Assignments reminder
}): StudentBriefFields => ({
  title: input.title || '',
  date: formatDateRangeWithDay(input.startDate, input.endDate),
  reportingVenue: input.reportingVenue || input.venue || 'Hillgrove Secondary School',
  reportingTime: formatClock(input.startTime),
  dismissalVenue: input.dismissalVenue || input.reportingVenue || input.venue || 'Hillgrove Secondary School',
  dismissalTime: formatClock(input.endTime),
  attire: input.attire || 'School PE T-shirt and school shorts/skirt',
  items: input.items || [],
  reminders: remindersFor(!!input.academic),
});

const MAX_TEXT = 500;
const clean = (value: unknown) => String(value ?? '').replace(/\*/g, '').replace(/[—–]/g, ', ').trim().slice(0, MAX_TEXT);

export const normaliseBriefFields = (input: any): StudentBriefFields => ({
  title: clean(input?.title),
  date: clean(input?.date),
  reportingVenue: clean(input?.reportingVenue),
  reportingTime: clean(input?.reportingTime),
  dismissalVenue: clean(input?.dismissalVenue),
  dismissalTime: clean(input?.dismissalTime),
  attire: clean(input?.attire),
  items: (Array.isArray(input?.items) ? input.items : []).map(clean).filter(Boolean).slice(0, 40),
  reminders: (Array.isArray(input?.reminders) ? input.reminders : [])
    .map((r: any) => ({ name: clean(r?.name), text: clean(r?.text) }))
    .filter((r: StudentBriefReminder) => r.name || r.text)
    .slice(0, 10),
});

// Plain-text version, for copying and for the programme's saved deliverables
export const buildBriefText = (f: StudentBriefFields) => [
  BRIEF_ANNEX_LABEL,
  '',
  BRIEF_HEADING,
  '',
  `Title of activity: ${f.title}`,
  `Date: ${f.date}`,
  `Reporting Venue: ${f.reportingVenue}`,
  `Reporting Time: ${f.reportingTime}`,
  `Dismissal Venue: ${f.dismissalVenue}`,
  `Dismissal Time: ${f.dismissalTime}`,
  `Attire: ${f.attire}`,
  ...(f.items.length ? ['Items to bring:', ...f.items.map(item => `• ${item}`)] : []),
  'Reminders:',
  ...f.reminders.map(r => `${r.name}: ${r.text}`),
].join('\n');

// Older briefs saved as text: puts "Annex A" on the first line (once)
export const withAnnexA = (text: string) => {
  const body = (text || '')
    .replace(/\s*\(Assemble by Council sub-teams\)/gi, '')
    .replace(/^\s*Annex A\s*\n+/i, '')
    .trim();
  return body ? `${BRIEF_ANNEX_LABEL}\n${body}` : BRIEF_ANNEX_LABEL;
};
