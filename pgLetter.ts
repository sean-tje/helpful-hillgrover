// Fills the school's Parents Gateway letter template (templates/pg-letter-template.docx,
// built from templates/PG_Template.docx by scripts/build-pg-template.py).
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import type { PgLetterFields } from './src/types';

const TEMPLATE_PATH = path.join(process.cwd(), 'templates', 'pg-letter-template.docx');
const MAX_FIELD_LENGTH = 600;
const MAX_OBJECTIVES = 6;

const TEXT_FIELDS = [
  'year', 'referenceNumber', 'letterDate', 'subject', 'eventName', 'eventDate', 'reportingTime',
  'reportingVenue', 'dismissalTime', 'dismissalVenue', 'attire', 'transportation', 'contactTeachers',
] as const;

// Applies the school's house style: no asterisks, no em or en dashes
export const cleanLetterText = (value: unknown) =>
  String(value ?? '')
    .replace(/\*/g, '')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_FIELD_LENGTH);

export const normaliseLetterFields = (input: any): PgLetterFields => {
  const fields = {} as PgLetterFields;
  for (const key of TEXT_FIELDS) fields[key] = cleanLetterText(input?.[key]);
  fields.objectives = (Array.isArray(input?.objectives) ? input.objectives : [])
    .map(cleanLetterText)
    .filter(Boolean)
    .slice(0, MAX_OBJECTIVES);
  return fields;
};

export const renderPgLetterDocx = (fields: PgLetterFields): Buffer => {
  const zip = new PizZip(fs.readFileSync(TEMPLATE_PATH));
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => '' });
  doc.render({
    ...fields,
    hasTransport: fields.transportation.length > 0,
    contactClause: fields.contactTeachers ? ` or ${fields.contactTeachers}` : '',
  });
  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer;
};
