// The post-event VCT thank-you notice: school leaders are always thanked first, and it always
// has places for a photo, the feedback form link and the feedback form's QR code.

export const POST_EVENT_LEADERS_LINE =
  'Mrs Tan, Mr Adam, Mr Lim and Mr Chiang - for your guidance, support and encouragement throughout the planning and execution of the programme.';

export const PHOTO_PLACEHOLDER = '[Photo: insert a photo of the programme here]';
export const FEEDBACK_LINK_PLACEHOLDER = '[Feedback form link]';
export const QR_PLACEHOLDER = '[QR code for the feedback form]';

// Adds whatever is missing: the school leaders as the first thank-you, the photo, and the
// feedback request with its link and QR code
export const withPostEventPlaceholders = (text: string, programmeTitle?: string) => {
  let lines = (text || '').replace(/\r/g, '').split('\n');
  const isLeadersLine = (l: string) => /Mrs Tan, Mr Adam, Mr Lim and Mr Chiang|school leaders/i.test(l) && /^\s*[•\-]/.test(l);
  const firstBullet = lines.findIndex(l => /^\s*[•\-]\s+/.test(l));
  if (!lines.some(isLeadersLine)) {
    const at = firstBullet >= 0 ? firstBullet : lines.length;
    lines.splice(at, 0, `• ${POST_EVENT_LEADERS_LINE}`);
  } else if (firstBullet >= 0 && !isLeadersLine(lines[firstBullet])) {
    // Move the school leaders to the top of the list
    const index = lines.findIndex(isLeadersLine);
    const [leaders] = lines.splice(index, 1);
    lines.splice(firstBullet, 0, leaders);
  }
  let out = lines.join('\n').trimEnd();
  if (!/\[Photo/i.test(out)) out += `\n\n${PHOTO_PLACEHOLDER}`;
  if (!/\[Feedback form link\]/i.test(out)) {
    out += `\n\nAs we would like to keep improving ${programmeTitle || 'the programme'}, we would greatly appreciate feedback from colleagues who were involved. Your feedback and suggestions will help us identify areas for improvement for subsequent years.`;
    out += `\n\nPlease click on the following link: ${FEEDBACK_LINK_PLACEHOLDER} or scan the QR code to complete the feedback.`;
  }
  if (!/\[QR code/i.test(out)) out += `\n\n${QR_PLACEHOLDER}`;
  return out;
};
