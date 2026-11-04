// RAMS on the MOE School Safety Handbook RAMS form, as Hillgrove fills it in: a header block,
// then one row per hazard with Severity x Likelihood = Risk Level (likelihood and risk level
// after the risk controls in brackets), then the nearest hospital and emergency number.
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import type { RamsFields, RamsRow } from './src/types';
import { RAMS_SCHOOL_NAME, clampScore, formatLikelihood, formatRiskLevel } from './src/ramsText';

const MAX_TEXT = 1500;
const MAX_ROWS = 30;

const clean = (value: unknown) =>
  String(value ?? '').replace(/\*/g, '').replace(/[—–]/g, ', ').trim().slice(0, MAX_TEXT);

const row = (r: Partial<RamsRow>): RamsRow => {
  const likelihood = clampScore(r.likelihood, 2);
  return {
    activity: clean(r.activity),
    hazard: clean(r.hazard),
    possibleAccident: clean(r.possibleAccident),
    severity: clampScore(r.severity, 3),
    likelihood,
    likelihoodAfter: Math.min(clampScore(r.likelihoodAfter, likelihood), likelihood),
    riskControl: clean(r.riskControl),
    actionOfficer: clean(r.actionOfficer),
    remarks: clean(r.remarks),
  };
};

export const normaliseRamsFields = (input: any): RamsFields => ({
  location: clean(input?.location),
  activity: clean(input?.activity),
  activityDate: clean(input?.activityDate),
  numberOfStudents: clean(input?.numberOfStudents),
  numberOfTeachers: clean(input?.numberOfTeachers),
  teamLeader: clean(input?.teamLeader),
  members: clean(input?.members),
  vettedBy: clean(input?.vettedBy),
  vettedDesignation: clean(input?.vettedDesignation),
  vettedDate: clean(input?.vettedDate),
  approvedBy: clean(input?.approvedBy),
  approvedDesignation: clean(input?.approvedDesignation),
  approvedDate: clean(input?.approvedDate),
  lastReviewDate: clean(input?.lastReviewDate),
  nextReviewDate: clean(input?.nextReviewDate),
  rows: (Array.isArray(input?.rows) ? input.rows : []).slice(0, MAX_ROWS).map(row).filter((r: RamsRow) => r.hazard || r.activity),
  nearestHospital: clean(input?.nearestHospital),
  emergencyNumber: clean(input?.emergencyNumber) || '995',
  remarks: clean(input?.remarks),
});

// Hazards every RAMS must cover, with the school's own risk controls kept word for word
export const requiredRamsRows = (opts: {
  involvesTravel: boolean;
  usesBus: boolean;
  strenuous: boolean;
  actionOfficer: string;
}): RamsRow[] => {
  const officer = opts.actionOfficer;
  const rows: Partial<RamsRow>[] = [];
  if (opts.involvesTravel) {
    rows.push({
      activity: 'Adult supervision',
      hazard: 'Inadequate supervision ratio\nInexperienced adult supervisors',
      possibleAccident: 'Injuries or illness\nParticipants not accounted for',
      severity: 3, likelihood: 3, likelihoodAfter: 2,
      riskControl: 'Roles of adult supervisors are clearly defined.\nBrief students on safety rules and procedures if they are lost.\nTeachers mark attendance before and after the activity.',
      actionOfficer: officer,
    });
  }
  if (opts.usesBus) {
    rows.push({
      activity: 'Transport to and from the venue by bus',
      hazard: 'Vehicular accidents due to driver issues\nPoor condition of vehicle',
      possibleAccident: 'Traffic accident resulting in injuries or death',
      severity: 5, likelihood: 2, likelihoodAfter: 1,
      riskControl: 'Hire certified drivers.\nAll students to wear seat belts, with teachers checking.\nConduct visual checks on the condition of the vehicle.',
      actionOfficer: officer,
    });
  }
  if (opts.involvesTravel) {
    rows.push({
      activity: 'Movement to and from the bus bay and venue',
      hazard: 'Unsafe crossing of roads',
      possibleAccident: 'Students struck by a vehicle, resulting in injuries or death',
      severity: 5, likelihood: 2, likelihoodAfter: 1,
      riskControl: 'Brief students on looking both ways before crossing the road.',
      actionOfficer: officer,
    });
    rows.push({
      activity: 'Weather',
      hazard: 'Inclement weather\nWet and slippery floors',
      possibleAccident: 'Slips and falls\nSprains, cuts and grazes',
      severity: 3, likelihood: 3, likelihoodAfter: 2,
      riskControl: 'Bring umbrella and raincoat.\nTeacher to remind students to walk slowly and avoid running in rain.',
      actionOfficer: officer,
    });
  }
  if (opts.strenuous) {
    rows.push({
      activity: 'Hydration of participants',
      hazard: 'Dehydration',
      possibleAccident: 'Heat exhaustion\nHeat stroke',
      severity: 3, likelihood: 3, likelihoodAfter: 2,
      riskControl: 'Teacher will remind students to drink water regularly.',
      actionOfficer: officer,
    });
  }
  rows.push(
    {
      activity: 'Medical',
      hazard: 'Allergic reaction (anaphylactic shock)',
      possibleAccident: 'Severe allergic reaction needing emergency treatment',
      severity: 5, likelihood: 2, likelihoodAfter: 1,
      riskControl: 'Teachers remind relevant students to bring EpiPen.',
      actionOfficer: officer,
    },
    {
      activity: 'Medical',
      hazard: 'Asthma',
      possibleAccident: 'Asthma attack',
      severity: 4, likelihood: 2, likelihoodAfter: 1,
      riskControl: 'Teachers remind relevant students to bring inhaler.',
      actionOfficer: officer,
    },
    {
      activity: 'Medical',
      hazard: 'Pre-existing medical conditions\nFalling ill during the activity',
      possibleAccident: 'Injuries or illness',
      severity: 3, likelihood: 2, likelihoodAfter: 1,
      riskControl: 'Teachers remind relevant students to bring own medication.\nTeacher to bring First Aid Kit.',
      actionOfficer: officer,
    },
  );
  return rows.map(row);
};

// --- Word file in the school's layout ---

const FONT = 'Arial';
const SIZE = 18; // 9 pt, as on the school's forms
const HEADER_FILL = 'D9D9D9';
const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const borders = { top: border, bottom: border, left: border, right: border };

const lines = (text: string, bold = false) =>
  (text || '').split('\n').map(
    line => new Paragraph({ children: [new TextRun({ text: line, font: FONT, size: SIZE, bold })] })
  );

const cell = (text: string, opts: { bold?: boolean; fill?: string; span?: number; width?: number; center?: boolean } = {}) =>
  new TableCell({
    borders,
    columnSpan: opts.span,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    verticalAlign: VerticalAlign.TOP,
    shading: opts.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: opts.fill } : undefined,
    children: opts.center
      ? (text || '').split('\n').map(line => new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: line, font: FONT, size: SIZE, bold: opts.bold })] }))
      : lines(text, opts.bold),
  });

const label = (text: string) => cell(text, { bold: true, fill: HEADER_FILL });

export const renderRamsDocx = async (fields: RamsFields): Promise<Buffer> => {
  const f = normaliseRamsFields(fields);

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [cell('RAMS FORM', { bold: true, fill: HEADER_FILL, span: 8, center: true })] }),
      new TableRow({ children: [label('School Name:'), cell(RAMS_SCHOOL_NAME), label('RAMS Team Leader:'), cell(f.teamLeader), label('Vetted By:'), cell(f.vettedBy), label('Approved By:'), cell(f.approvedBy)] }),
      new TableRow({ children: [label('Location:'), cell(f.location), label('Member(s):'), cell(f.members), label('Designation:'), cell(f.vettedDesignation), label('Designation:'), cell(f.approvedDesignation)] }),
      new TableRow({ children: [label('Activity/ Process:'), cell(f.activity), label('Date of Activity:'), cell(f.activityDate), label('Date:'), cell(f.vettedDate), label('Date:'), cell(f.approvedDate)] }),
      new TableRow({ children: [label('No. of Students:'), cell(f.numberOfStudents), label('No. of Teachers:'), cell(f.numberOfTeachers), label('Signature:'), cell(''), label('Signature:'), cell('')] }),
      new TableRow({ children: [label('Last Review Date:'), cell(f.lastReviewDate), label('Next Review Date:'), cell(f.nextReviewDate, { span: 5 })] }),
    ],
  });

  // Column widths in twentieths of a point, landscape A4 (about 15,400 usable)
  const widths = [600, 1700, 1800, 1800, 1050, 1150, 1000, 3400, 1600, 1300];
  const hazardTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cell('Hazard Identification\n(Refer to ‘W’ Checklist in Chapter 2 of the School Safety Handbook)', { bold: true, fill: HEADER_FILL, span: 4, center: true }),
          cell('Risk Evaluation', { bold: true, fill: HEADER_FILL, span: 3, center: true }),
          cell('Implementation', { bold: true, fill: HEADER_FILL, span: 3, center: true }),
        ],
      }),
      new TableRow({
        tableHeader: true,
        children: [
          'No.', 'Description of Activities/ Work Processes', 'Hazard', 'Possible Accident / Ill Health',
          'Severity', 'Likelihood', 'Risk Level', 'Risk Control', 'Action Officer, Designation\n(Follow-up date)', 'Remarks',
        ].map((text, i) => cell(text, { bold: true, fill: HEADER_FILL, width: widths[i], center: true })),
      }),
      ...f.rows.map((r, i) => new TableRow({
        cantSplit: true,
        children: [
          cell(String(i + 1), { width: widths[0], center: true }),
          cell(r.activity, { width: widths[1] }),
          cell(r.hazard, { width: widths[2] }),
          cell(r.possibleAccident, { width: widths[3] }),
          cell(String(r.severity), { width: widths[4], center: true }),
          cell(formatLikelihood(r), { width: widths[5], center: true }),
          cell(formatRiskLevel(r), { width: widths[6], center: true }),
          cell(r.riskControl, { width: widths[7] }),
          cell(r.actionOfficer, { width: widths[8] }),
          cell(r.remarks, { width: widths[9] }),
        ],
      })),
    ],
  });

  const note = (text: string, bold = false) =>
    new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text, font: FONT, size: SIZE, bold })] });

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { orientation: PageOrientation.LANDSCAPE },
          margin: { top: 720, bottom: 720, left: 720, right: 720 },
        },
      },
      children: [
        headerTable,
        new Paragraph({ children: [] }),
        hazardTable,
        note('Numbers in brackets show the likelihood and risk level after the risk controls are in place. Risk Level = Severity x Likelihood.'),
        note('Severity: 1 Negligible, 2 Minor, 3 Moderate, 4 Major, 5 Catastrophic. Likelihood: 1 Rare, 2 Remote, 3 Occasional, 4 Frequent, 5 Almost certain.'),
        new Paragraph({ children: [] }),
        note('Nearest Hospital:', true),
        ...lines(f.nearestHospital || '[to be confirmed]'),
        note(`Emergency Number: ${f.emergencyNumber}`, true),
        ...(f.remarks ? [note('Remarks:', true), ...lines(f.remarks)] : []),
      ],
    }],
  });
  return Packer.toBuffer(doc);
};
