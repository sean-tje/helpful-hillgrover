// Student brief rules shared by the planner, the programme page and the Word export.
// The brief goes out as Annex A, so its first line is always "Annex A".

export const FOUR_AS = [
  ['Attendance', 'Be present and punctual for school, lessons, CCA and school events.'],
  ['Appearance', 'Be a well-groomed student and uphold the image of the school.'],
  ['Activeness', 'Be respectful and demonstrate a positive attitude towards learning.'],
  ['Assignments', 'Be timely with all assignments and not procrastinate.'],
] as const;

export const FOUR_AS_REMINDERS = [
  'Reminders:',
  '4As of Student Conduct',
  ...FOUR_AS.map(([name, text]) => `• ${name}: ${text}`),
].join('\n');

export const BRIEF_ANNEX_LABEL = 'Annex A';

// Puts "Annex A" on the first line (once) and drops lines the school no longer uses
export const withAnnexA = (text: string) => {
  const body = (text || '')
    .replace(/\s*\(Assemble by Council sub-teams\)/gi, '')
    .replace(/^\s*Annex A\s*\n+/i, '')
    .trim();
  return body ? `${BRIEF_ANNEX_LABEL}\n${body}` : BRIEF_ANNEX_LABEL;
};
