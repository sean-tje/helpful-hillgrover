// Formatting for the all-staff VCT notice, as the school lays it out: the first line is the
// title (bold, underlined), key dates and times are bold blue, and annexes are bold red.
// Used by the on-screen editor and the Word export so both look the same.

export interface VctRun {
  text: string;
  bold?: boolean;
  underline?: boolean;
  color?: 'blue' | 'red';
}

export const VCT_BLUE = '0000FF';
export const VCT_RED = 'FF0000';
export const VCT_ATTENTION = 'All to note';

const MONTH = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const DAY = '(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day';
const DATE = `\\d{1,2}(?:\\s*(?:-|to|and|&)\\s*\\d{1,2})?\\s+${MONTH}(?:\\s+\\d{4})?(?:\\s*\\(${DAY}(?:\\s*(?:-|to|and|&)\\s*${DAY})?\\))?`;
const NUM_DATE = '\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}';
const TIME = '\\d{1,2}(?:[.:]\\d{2})?\\s*(?:am|pm)\\b|\\b\\d{1,2}:\\d{2}\\b|\\b\\d{4}\\s*hrs?\\b';
const TIME_RANGE = `(?:${TIME})(?:\\s*(?:-|to)\\s*(?:${TIME}))?`;
const ANNEX = '\\bAnnex(?:es)?\\s+[A-Z](?:\\s*(?:,|and|&)\\s*[A-Z])*\\b';
const TOKEN = new RegExp(`(${ANNEX})|(${DATE}|${NUM_DATE})|(${TIME_RANGE})`, 'g');

const formatLine = (line: string): VctRun[] => {
  const runs: VctRun[] = [];
  let last = 0;
  for (const match of line.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) runs.push({ text: line.slice(last, index) });
    runs.push({ text: match[0], bold: true, color: match[1] ? 'red' : 'blue' });
    last = index + match[0].length;
  }
  if (last < line.length) runs.push({ text: line.slice(last) });
  return runs;
};

// One array of runs per line; an empty array is a blank line
export const formatVctDetails = (text: string): VctRun[][] => {
  const lines = (text || '').replace(/\r/g, '').split('\n');
  const first = lines.findIndex(l => l.trim());
  return lines.map((line, i) =>
    i === first ? [{ text: line.trim(), bold: true, underline: true }] : line ? formatLine(line) : []
  );
};
