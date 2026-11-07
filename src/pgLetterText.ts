import type { PgLetterFields } from './types';

// Every PG letter reminds parents of these (the RAMS relies on students bringing them)
const SAFETY_ITEMS: [RegExp, string][] = [
  [/water bottle/i, 'filled water bottle'],
  [/medication|medicine/i, 'personal medication (if prescribed or necessary)'],
];

export const withSafetyItems = (items: string) => {
  const missing = SAFETY_ITEMS.filter(([pattern]) => !pattern.test(items)).map(([, item]) => item);
  const text = [items.replace(/[.\s]+$/, ''), missing.join(', ')].filter(Boolean).join(', ');
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}.` : '';
};

// Plain-text version of the PG letter, for pasting into Parents Gateway
export const buildPgLetterText = (f: PgLetterFields) =>
  [
    `HGV${f.year}/${f.referenceNumber}`,
    '',
    f.letterDate,
    '',
    'Dear Parents/ Guardians,',
    '',
    `RE: ${f.subject}`,
    '',
    'We are happy to inform you that your child/ward will be involved in the programme below.',
    '',
    `Event: ${f.eventName}`,
    `Date: ${f.eventDate}`,
    `Reporting Time: ${f.reportingTime}, Venue: ${f.reportingVenue}`,
    `Dismissal Time: ${f.dismissalTime}, Venue: ${f.dismissalVenue}`,
    `Attire: ${f.attire}`,
    `Items to Bring: ${withSafetyItems(f.itemsToBring || '')}`,
    ...(f.transportation ? [`Transportation: ${f.transportation}`] : []),
    'Objectives:',
    ...f.objectives.filter(Boolean).map(o => `- ${o}`),
    '',
    `For further information or clarification, please do not hesitate to contact the school${f.contactTeachers ? ` or ${f.contactTeachers}` : ''} at 6560 3726 or via email to hillgrove_ss@moe.edu.sg.`,
    '',
    'Thank you very much for your continued support to the school!',
    '',
    'In partnership with you',
    '',
    'Mrs Helen Tan-Lee',
    'Principal',
    '',
    'This is a computer-generated email. No signature is required.',
  ].join('\n');
