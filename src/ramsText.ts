import type { RamsFields, RamsRow } from './types';

// The school's RAMS form, shared by the browser (editor, plain text) and the server (Word file)
export const RAMS_SCHOOL_NAME = 'Hillgrove Secondary School';

// The School Safety Handbook's scales (Chapter 2, Tables 1 and 2)
export const SEVERITY_LABELS = ['', 'Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'];
export const LIKELIHOOD_LABELS = ['', 'Unlikely', 'Seldom', 'Occasional', 'Likely', 'Very likely'];

export const clampScore = (value: unknown, fallback = 1) => {
  const n = Math.round(Number(value));
  return n >= 1 && n <= 5 ? n : fallback;
};

export const riskBand = (level: number) => (level >= 15 ? 'High' : level >= 4 ? 'Medium' : 'Low');

// As the handbook sets out (Chapter 2, para 14c): when the initial risk is Medium or High,
// the initial scores go in brackets, followed by the scores after the risk controls, e.g.
// "(5) 5", "(4) 2", "(20) 10". A Low initial risk (1 to 3) is a single score.
export const initialRisk = (row: RamsRow) => row.severity * row.likelihood;
export const showsReduction = (row: RamsRow) => initialRisk(row) >= 4;
export const likelihoodAfterControls = (row: RamsRow) =>
  showsReduction(row) ? Math.min(row.likelihoodAfter || row.likelihood, row.likelihood) : row.likelihood;
export const riskAfterControls = (row: RamsRow) => row.severity * likelihoodAfterControls(row);

const bracketed = (initial: number, after: number, reduced: boolean) => (reduced ? `(${initial}) ${after}` : `${initial}`);

export const formatSeverity = (row: RamsRow) => bracketed(row.severity, row.severity, showsReduction(row));
export const formatLikelihood = (row: RamsRow) => bracketed(row.likelihood, likelihoodAfterControls(row), showsReduction(row));
export const formatRiskLevel = (row: RamsRow) => bracketed(initialRisk(row), riskAfterControls(row), showsReduction(row));

export const RAMS_SCORE_NOTE =
  'Numbers in brackets are the initial scores, before the risk controls; the number after each is the score once the risk controls are in place. Risk Level = Severity x Likelihood (Low 1 to 3, Medium 4 to 14, High 15 to 25).';
export const RAMS_SCALE_NOTE =
  'Severity: 1 Insignificant, 2 Minor, 3 Moderate, 4 Major, 5 Catastrophic. Likelihood: 1 Unlikely, 2 Seldom, 3 Occasional, 4 Likely, 5 Very likely.';

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
        `   Severity: ${formatSeverity(row)} | Likelihood: ${formatLikelihood(row)} | Risk Level: ${formatRiskLevel(row)}`,
        `   Risk Control: ${row.riskControl.replace(/\n/g, '; ')}`,
        `   Action Officer: ${row.actionOfficer}`,
        ...(row.remarks ? [`   Remarks: ${row.remarks}`] : []),
      ].join('\n')
    ),
    '',
    RAMS_SCORE_NOTE,
    `Nearest Hospital: ${f.nearestHospital}`,
    `Emergency Number: ${f.emergencyNumber}`,
    ...(f.remarks ? [`Remarks: ${f.remarks}`] : []),
  ].join('\n');
