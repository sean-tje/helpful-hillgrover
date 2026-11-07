// Formatting for the all-staff VCT notices (pre-event and post-event), as the school lays
// them out: the first line is the title (bold, underlined), key dates and times are bold
// blue, annexes are bold red, links are blue and underlined, lines starting with "•" are
// bullet points, and [square brackets] mark something to fill in (a photo, a link, a QR code).
// Used by the on-screen editor and the Word export so both look the same.

export interface VctRun {
  text: string;
  bold?: boolean;
  underline?: boolean;
  color?: 'blue' | 'red';
  placeholder?: boolean;
}

export interface VctLine {
  runs: VctRun[]; // empty for a blank line
  bullet?: boolean;
  placeholder?: boolean; // the whole line is a placeholder, e.g. [Photo]
}

export const VCT_BLUE = '0000FF';
export const VCT_LINK = '0563C1';
export const VCT_RED = 'FF0000';
export const VCT_ATTENTION = 'All to note';

const MONTH = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const DAY = '(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day';
const DATE = `\\d{1,2}(?:\\s*(?:-|to|and|&)\\s*\\d{1,2})?\\s+${MONTH}(?:\\s+\\d{4})?(?:\\s*\\(${DAY}(?:\\s*(?:-|to|and|&)\\s*${DAY})?\\))?`;
const NUM_DATE = '\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}';
const TIME = '\\d{1,2}(?:[.:]\\d{2})?\\s*(?:am|pm)\\b|\\b\\d{1,2}:\\d{2}\\b|\\b\\d{4}\\s*hrs?\\b';
const TIME_RANGE = `(?:${TIME})(?:\\s*(?:-|to)\\s*(?:${TIME}))?`;
const ANNEX = '\\bAnnex(?:es)?\\s+[A-Z](?:\\s*(?:,|and|&)\\s*[A-Z])*\\b';
const URL = 'https?:\\/\\/[^\\s)]+[^\\s).,]';
const PLACEHOLDER = '\\[[^\\]\\n]+\\]';
const TOKEN = new RegExp(`(${PLACEHOLDER})|(${URL})|(${ANNEX})|(${DATE}|${NUM_DATE})|(${TIME_RANGE})`, 'g');

const formatRuns = (line: string): VctRun[] => {
  const runs: VctRun[] = [];
  let last = 0;
  for (const match of line.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) runs.push({ text: line.slice(last, index) });
    if (match[1]) runs.push({ text: match[0], bold: true, placeholder: true });
    else if (match[2]) runs.push({ text: match[0], underline: true, color: 'blue' });
    else runs.push({ text: match[0], bold: true, color: match[3] ? 'red' : 'blue' });
    last = index + match[0].length;
  }
  if (last < line.length) runs.push({ text: line.slice(last) });
  return runs;
};

export const formatVctDetails = (text: string): VctLine[] => {
  const lines = (text || '').replace(/\r/g, '').split('\n');
  const first = lines.findIndex(l => l.trim());
  return lines.map((line, i): VctLine => {
    const trimmed = line.trim();
    if (!trimmed) return { runs: [] };
    if (i === first) return { runs: [{ text: trimmed, bold: true, underline: true }] };
    if (new RegExp(`^${PLACEHOLDER}$`).test(trimmed)) {
      return { runs: [{ text: trimmed, bold: true, placeholder: true }], placeholder: true };
    }
    const bullet = /^[•\-]\s+/.test(trimmed);
    return { runs: formatRuns(bullet ? trimmed.replace(/^[•\-]\s+/, '') : line), bullet };
  });
};
