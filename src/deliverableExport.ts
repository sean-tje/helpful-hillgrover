import type { PgLetterFields, RamsFields, StudentBriefFields } from './types';

// Downloads a deliverable as a Word file. The PG letter, RAMS, student brief and VCT notice
// (pre- and post-event) each have their own school layout; the rest use the plain export.
export const downloadDeliverableWord = async (opts: {
  key: string;
  programmeTitle: string;
  label: string;
  text: string;
  pgLetter?: PgLetterFields | null;
  rams?: RamsFields | null;
  brief?: StudentBriefFields | null;
  vctNoticeBy?: string;
}) => {
  const { key, programmeTitle, label, text } = opts;
  const post = (url: string, body: unknown) =>
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  const response =
    key === 'parentsGatewayConsentForm' && opts.pgLetter ? await post('/api/pg-letter/docx', { fields: opts.pgLetter })
    : key === 'ramsDocument' && opts.rams ? await post('/api/rams/docx', { fields: opts.rams })
    : key === 'studentInstructionBrief' ? await post('/api/brief/docx', { title: programmeTitle, text, fields: opts.brief || undefined })
    : key === 'allStaffPreEventBlast' || key === 'allStaffPartnerGratitudeBlast' ? await post('/api/vct/docx', { title: programmeTitle, details: text, noticeBy: opts.vctNoticeBy || '' })
    : await post('/api/export-word', { title: `${programmeTitle || 'Hillgrove'} - ${label}`, content: text });
  if (!response.ok) throw new Error('Could not create the Word document.');

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(programmeTitle || 'Hillgrove').replace(/[^A-Za-z0-9]+/g, '_')}_${key}.docx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
};
