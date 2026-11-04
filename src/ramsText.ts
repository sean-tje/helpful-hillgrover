import type { RamsFields, RamsRow } from './types';

// The school's RAMS form, shared by the browser (editor, plain text) and the server (Word file)
export const RAMS_SCHOOL_NAME = 'Hillgrove Secondary School';

export const SEVERITY_LABELS = ['', 'Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'];
export const LIKELIHOOD_LABELS = ['', 'Rare', 'Remote', 'Occasional', 'Frequent', 'Almost certain'];

export const clampScore = (value: unknown, fallback = 1) => {
  const n = Math.round(Number(value));
  return n >= 1 && n <= 5 ? n : fallback;
};

export const riskBand = (level: number) => (level >= 15 ? 'High' : level >= 4 ? 'Medium' : 'Low');

// "3 (2)": before the risk controls, and in brackets after them
export const formatLikelihood = (row: RamsRow) =>
  row.likelihoodAfter && row.likelihoodAfter !== row.likelihood ? `${row.likelihood} (${row.likelihoodAfter})` : `${row.likelihood}`;

export const formatRiskLevel = (row: RamsRow) => {
  const before = row.severity * row.likelihood;
  const after = row.severity * (row.likelihoodAfter || row.likelihood);
  return after !== before ? `${before} (${after})` : `${before}`;
};

// Plain-text version of the RAMS, for search, excerpts and copying
export const buildRamsText = (f: RamsFields) =>
  [
    'RAMS FORM',
    `School Name: ${RAMS_SCHOOL_NAME}`,
    `Location: ${f.location}`,
    `Activity/ Process: ${f.activity}`,
    `Date of Activity: ${f.activityDate}`,
    `No. of Students: ${f.numberOfStudents}   No. of Teachers: ${f.numberOfTeachers}`,
    `RAMS Team Leader: ${f.teamLeader}   Member(s): ${f.members}`,
    `Vetted By: ${f.vettedBy} (${f.vettedDesignation}) ${f.vettedDate}`,
    `Approved By: ${f.approvedBy} (${f.approvedDesignation}) ${f.approvedDate}`,
    `Last Review Date: ${f.lastReviewDate}   Next Review Date: ${f.nextReviewDate}`,
    '',
    ...f.rows.map((row, i) =>
      [
        `${i + 1}. ${row.activity}`,
        `   Hazard: ${row.hazard}`,
        `   Possible Accident / Ill Health: ${row.possibleAccident}`,
        `   Severity: ${row.severity} | Likelihood: ${formatLikelihood(row)} | Risk Level: ${formatRiskLevel(row)}`,
        `   Risk Control: ${row.riskControl.replace(/\n/g, '; ')}`,
        `   Action Officer: ${row.actionOfficer}`,
        ...(row.remarks ? [`   Remarks: ${row.remarks}`] : []),
      ].join('\n')
    ),
    '',
    'Numbers in brackets show the likelihood and risk level after the risk controls.',
    `Nearest Hospital: ${f.nearestHospital}`,
    `Emergency Number: ${f.emergencyNumber}`,
    ...(f.remarks ? [`Remarks: ${f.remarks}`] : []),
  ].join('\n');
