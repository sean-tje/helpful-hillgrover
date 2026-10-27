export const getTeacherInitial = (name: string): string => {
  if (!name) return '?';
  // Strip common Singapore/MOE school salutations: Mr, Ms, Mrs, Mdm, Dr
  const clean = name.replace(/^(Mr|Ms|Mrs|Mdm|Dr)\.?\s+/i, '').trim();
  return clean.charAt(0).toUpperCase() || name.charAt(0).toUpperCase();
};

export const getTermByDate = (dateStr: string): 'Term 1' | 'Term 2' | 'Term 3' | 'Term 4' => {
  if (!dateStr) return 'Term 1';
  const parts = dateStr.split('-');
  if (parts.length < 3) return 'Term 1';
  const month = parseInt(parts[1], 10);
  if (month === 12 || month <= 3) return 'Term 1';
  if (month >= 4 && month <= 5) return 'Term 2';
  if (month >= 6 && month <= 9) return 'Term 3';
  return 'Term 4';
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Calculates MOE Singapore School Term and Week for 2026-2027 school calendar
 */
export const getSingaporeTermWeek = (dateStr: string): string => {
  if (!dateStr) return '';
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Dec 2026 Year-End Vacation & Sec 1 Orientation Prep
  if (year === 2026 && month === 12) {
    return 'Dec Vac';
  }

  // Target date normalized at noon UTC to prevent daylight/timezone drift
  const targetTime = Date.UTC(year, month - 1, day, 12, 0, 0);

  // Term 1 2027: Mon Jan 4, 2027 to Fri Mar 12, 2027
  const t1Start = Date.UTC(2027, 0, 4, 12, 0, 0);
  const t1End = Date.UTC(2027, 2, 12, 12, 0, 0);
  if (targetTime >= t1Start && targetTime <= t1End) {
    const week = Math.floor((targetTime - t1Start) / (7 * 86400000)) + 1;
    return `T1W${Math.min(Math.max(week, 1), 10)}`;
  }

  // March School Holidays: Sat Mar 13 to Sun Mar 21, 2027
  const marchHolsEnd = Date.UTC(2027, 2, 21, 12, 0, 0);
  if (targetTime > t1End && targetTime <= marchHolsEnd) {
    return 'March Hols';
  }

  // Term 2 2027: Mon Mar 22 to Fri May 28, 2027
  const t2Start = Date.UTC(2027, 2, 22, 12, 0, 0);
  const t2End = Date.UTC(2027, 4, 28, 12, 0, 0);
  if (targetTime >= t2Start && targetTime <= t2End) {
    const week = Math.floor((targetTime - t2Start) / (7 * 86400000)) + 1;
    return `T2W${Math.min(Math.max(week, 1), 10)}`;
  }

  // June School Holidays: Sat May 29 to Sun Jun 27, 2027
  const juneHolsEnd = Date.UTC(2027, 5, 27, 12, 0, 0);
  if (targetTime > t2End && targetTime <= juneHolsEnd) {
    return 'June Hols';
  }

  // Term 3 2027: Mon Jun 28 to Fri Sep 3, 2027
  const t3Start = Date.UTC(2027, 5, 28, 12, 0, 0);
  const t3End = Date.UTC(2027, 8, 3, 12, 0, 0);
  if (targetTime >= t3Start && targetTime <= t3End) {
    const week = Math.floor((targetTime - t3Start) / (7 * 86400000)) + 1;
    return `T3W${Math.min(Math.max(week, 1), 10)}`;
  }

  // September School Holidays: Sat Sep 4 to Sun Sep 12, 2027
  const septHolsEnd = Date.UTC(2027, 8, 12, 12, 0, 0);
  if (targetTime > t3End && targetTime <= septHolsEnd) {
    return 'Sept Hols';
  }

  // Term 4 2027: Mon Sep 13 to Fri Nov 19, 2027
  const t4Start = Date.UTC(2027, 8, 13, 12, 0, 0);
  const t4End = Date.UTC(2027, 10, 19, 12, 0, 0);
  if (targetTime >= t4Start && targetTime <= t4End) {
    const week = Math.floor((targetTime - t4Start) / (7 * 86400000)) + 1;
    return `T4W${Math.min(Math.max(week, 1), 10)}`;
  }

  return 'Year-End Vac';
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Formats YYYY-MM-DD or Date to standard Singapore numeric format: "28/08/2026"
 */
export const formatSingaporeDate = (dateStr: string | Date): string => {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  
  if (typeof dateStr === 'string' && dateStr.includes('-')) {
    const [yearStr, monthStr, dayStr] = dateStr.split('T')[0].split('-');
    if (yearStr && monthStr && dayStr) {
      return `${dayStr.padStart(2, '0')}/${monthStr.padStart(2, '0')}/${yearStr}`;
    }
  }

  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return String(dateStr);
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

/**
 * Formats YYYY-MM-DD or Date to standard Singapore written format: "28 August 2026"
 */
export const formatSingaporeDateLong = (dateStr: string | Date): string => {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && dateStr.includes('-')) {
    const [yearStr, monthStr, dayStr] = dateStr.split('T')[0].split('-');
    if (yearStr && monthStr && dayStr) {
      const monthIdx = parseInt(monthStr, 10) - 1;
      const dayNum = parseInt(dayStr, 10);
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${dayNum} ${MONTH_NAMES[monthIdx]} ${yearStr}`;
      }
    }
  }

  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return String(dateStr);
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

/**
 * Formats a start and end date range cleanly into Singapore standard:
 * e.g. "28 August 2026 to 30 August 2026" or "28/08/2026 to 30/08/2026"
 */
export const formatSingaporeDateRange = (startDateStr: string, endDateStr?: string, style: 'long' | 'numeric' = 'long'): string => {
  if (!startDateStr) return '';
  const fmt = style === 'long' ? formatSingaporeDateLong : formatSingaporeDate;
  if (!endDateStr || startDateStr === endDateStr) {
    return fmt(startDateStr);
  }
  return `${fmt(startDateStr)} to ${fmt(endDateStr)}`;
};
