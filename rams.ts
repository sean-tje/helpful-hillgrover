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
import { RAMS_SCALE_NOTE, RAMS_SCHOOL_NAME, RAMS_SCORE_NOTE, clampScore, formatLikelihood, formatRiskLevel, formatSeverity } from './src/ramsText';

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

// Hazards the RAMS must cover, depending on where the programme is and what it involves.
// The measures follow the School Safety Handbook (Chapters 2, 5 and 6) and the school's RAMS.
export interface RequiredRamsOptions {
  external: boolean; // at a venue outside school
  usesBus: boolean; // chartered bus
  setting: 'Indoors' | 'Outdoors' | 'Both';
  strenuous: boolean;
  overlapsMidday: boolean; // runs between 11am and 4pm (or over more than one day)
  natureArea: boolean; // parks, nature areas, beaches, campsites
  outdoorLearningJourney: boolean; // needs a venue recce
  staffThroughout: boolean; // higher-risk programmes such as camps, where staff stay throughout
  actionOfficer: string;
}

export const requiredRamsRows = (o: RequiredRamsOptions): RamsRow[] => {
  const outdoors = o.setting !== 'Indoors';
  const lines = (...items: (string | false)[]) => items.filter(Boolean).join('\n');
  const rows: Partial<RamsRow>[] = [];

  rows.push({
    activity: 'Teacher supervision',
    hazard: lines('Inadequate supervision ratio', o.external && 'Students separated from the group or lost'),
    possibleAccident: lines('Injuries or illness', 'Students not accounted for'),
    severity: 3, likelihood: 3, likelihoodAfter: 2,
    riskControl: lines(
      'Teacher-student ratio of 1:20 is met at all times.',
      'Accompanying teachers are briefed on the safety procedures and their roles before the programme.',
      o.staffThroughout && 'Teachers are present with students throughout the activities.',
      'Teachers take attendance before and after the programme, and at every assembly point.',
      o.external && 'Students stay with their groups and are briefed on what to do if they are lost, with the teachers\' contact numbers.',
    ),
  });

  if (o.outdoorLearningJourney) {
    rows.push({
      activity: 'Recce of venue',
      hazard: lines('Unfamiliar site hazards (uneven ground, steep steps, slopes)', 'No shelter identified for wet weather'),
      possibleAccident: lines('Slips, trips and falls', 'Delay in taking shelter'),
      severity: 3, likelihood: 3, likelihoodAfter: 2,
      riskControl: lines(
        'Teacher-in-charge recces the venue before the trip to identify hazards, shelters and the assembly point.',
        'Hazards, shelters and the assembly point are covered in the safety briefing for teachers and students.',
        'A wet weather plan with sheltered alternatives is prepared.',
      ),
    });
  }

  if (o.usesBus) {
    rows.push(
      {
        activity: 'Boarding and alighting the bus',
        hazard: 'Students rushing or missing a step when boarding or alighting',
        possibleAccident: 'Falls, sprains, cuts and bruises',
        severity: 2, likelihood: 3, likelihoodAfter: 1,
        riskControl: lines(
          'A teacher stands at the bus door to manage the boarding flow.',
          'Students board and alight one at a time, only at the agreed points.',
          'Teachers take a headcount before the bus departs.',
        ),
      },
      {
        activity: 'Transport to and from the venue by chartered bus',
        hazard: lines('Traffic accident', 'Bus or seat belts in poor condition'),
        possibleAccident: 'Traffic accident resulting in injuries or death',
        severity: 5, likelihood: 2, likelihoodAfter: 1,
        riskControl: lines(
          'Bus company to provide a driver with a valid driving licence and a bus in good condition.',
          'Teachers check that the seat belts are in working order.',
          'Teachers remind all students to wear their seat belts and check that they do.',
          'Students stay seated throughout the journey.',
        ),
      },
    );
  }

  if (o.external) {
    rows.push({
      activity: o.usesBus ? 'Movement between the bus and the venue' : 'Movement to and from the venue',
      hazard: lines('Crossing roads', 'Moving traffic near the drop-off point'),
      possibleAccident: 'Students struck by a vehicle, resulting in injuries or death',
      severity: 5, likelihood: 2, likelihoodAfter: 1,
      riskControl: lines(
        'Teachers check the traffic and manage students crossing roads at designated crossings.',
        o.usesBus && 'Students do not cross directly in front of or behind the bus.',
        'Students walk in their groups on footpaths.',
      ),
    });
  }

  if (outdoors) {
    rows.push(
      {
        activity: 'Outdoor activities in wet weather',
        hazard: lines('Heavy rain', 'Wet and slippery surfaces'),
        possibleAccident: lines('Slips and falls', 'Sprains, cuts and grazes'),
        severity: 3, likelihood: 3, likelihoodAfter: 2,
        riskControl: lines(
          'Students bring a raincoat or poncho.',
          'Teachers remind students to walk slowly and not run on wet surfaces.',
          'Sheltered areas are identified for the wet weather plan.',
        ),
      },
      {
        activity: 'Outdoor activities in thundery weather',
        hazard: 'Lightning',
        possibleAccident: 'Lightning strike, resulting in serious injuries or death',
        severity: 5, likelihood: 3, likelihoodAfter: 1,
        riskControl: lines(
          'Teacher-in-charge monitors lightning alerts on the NEA myENV app.',
          'Outdoor activities stop when there is a lightning alert, or when lightning or thunder is seen or heard, and everyone takes shelter in a building or the bus.',
          'Do not shelter under trees, huts or tents, and do not hold umbrellas during lightning.',
          'Activities resume only when the lightning alert is lifted.',
        ),
      },
      {
        activity: 'Time in the sun',
        hazard: 'High temperature and UV levels',
        possibleAccident: lines('Sunburn', 'Heat exhaustion'),
        severity: 3, likelihood: 3, likelihoodAfter: 2,
        riskControl: lines(
          'Students apply sunscreen and wear a cap.',
          'Students bring a filled water bottle and are allowed to drink freely before, during and after the activity.',
          'Students rest under shade where available.',
          'Students who appear unwell are excused from the activity and attended to.',
        ),
      },
      {
        activity: 'Outdoor activities during haze',
        hazard: 'Poor air quality (haze)',
        possibleAccident: lines('Breathing difficulties', 'Asthma attack'),
        severity: 3, likelihood: 2, likelihoodAfter: 1,
        riskControl: lines(
          'Teacher-in-charge checks the PSI and follows MOE\'s haze SOP.',
          'Outdoor activities are reduced or moved indoors when the air quality is unhealthy.',
          'Teachers closely monitor students with asthma or breathing conditions.',
        ),
      },
    );
    if (o.strenuous && o.overlapsMidday) {
      rows.push({
        activity: 'Strenuous outdoor activities between 11am and 4pm',
        hazard: 'High heat stress and UV levels',
        possibleAccident: lines('Heat exhaustion', 'Heat stroke'),
        severity: 5, likelihood: 3, likelihoodAfter: 1,
        riskControl: lines(
          'Activities are kept short, with frequent rest breaks.',
          'Water breaks and rest are in shaded areas.',
          'The intensity of activities is reduced in hot weather.',
          'Students wear sunscreen, loose light-coloured clothing and head gear.',
          'Active cooling (shelter, wet towels) is available.',
          'Teachers check NEA\'s Heat Stress Advisory on the myENV app.',
        ),
      });
    }
    if (o.natureArea) {
      rows.push({
        activity: 'Wildlife and insects',
        hazard: lines('Wild animals (e.g. monkeys, otters, snakes)', 'Insect bites and stings'),
        possibleAccident: lines('Bites and scratches', 'Stings and allergic reactions'),
        severity: 3, likelihood: 2, likelihoodAfter: 1,
        riskControl: lines(
          'Students are briefed not to approach or feed wild animals, and to tell a teacher of any sightings.',
          'Students use insect repellent.',
          'Students tell a teacher immediately if they are stung or bitten.',
        ),
      });
    }
  } else if (o.external) {
    rows.push({
      activity: 'Walking between the bus and the venue',
      hazard: lines('Heavy rain or lightning', 'Wet and slippery floors'),
      possibleAccident: lines('Slips and falls', 'Lightning strike'),
      severity: 4, likelihood: 2, likelihoodAfter: 1,
      riskControl: lines(
        'Teacher-in-charge monitors lightning alerts on the NEA myENV app.',
        'Everyone takes shelter in the nearest building in heavy rain or lightning.',
        'Teachers remind students to walk slowly and not run on wet floors.',
      ),
    });
  }

  if (o.strenuous) {
    rows.push(
      {
        activity: 'Checking students before the activity',
        hazard: lines('Inadequate rest or no meal before the activity', 'Inappropriate attire or footwear'),
        possibleAccident: lines('Fatigue and fainting', 'Slips and ankle sprains'),
        severity: 3, likelihood: 2, likelihoodAfter: 1,
        riskControl: lines(
          'Students are reminded to rest well the night before and to eat before the activity.',
          'Teachers check that students are in proper attire and footwear.',
          'Students who are unwell do not take part.',
        ),
      },
      {
        activity: 'Physical activities',
        hazard: lines('Inadequate hydration', 'Overexertion'),
        possibleAccident: lines('Heat exhaustion', 'Heat injuries'),
        severity: 4, likelihood: 3, likelihoodAfter: 1,
        riskControl: lines(
          'Students bring a filled water bottle, and teachers remind them to drink regularly (but not beyond thirst).',
          'Regular rest breaks are given.',
          'Warm-up and cool-down exercises are done before and after the activity.',
          'Students showing signs of heat illness stop immediately and are attended to.',
        ),
      },
      {
        activity: 'Conduct of activities',
        hazard: 'Collisions with other participants or equipment',
        possibleAccident: 'Sprains, cuts, bruises and fractures',
        severity: 3, likelihood: 3, likelihoodAfter: 2,
        riskControl: lines(
          'Students are briefed on the safety rules before the activity commences.',
          'Teachers supervise the activity and stop any unsafe play.',
          'The activity area is checked for hazards before the activity starts.',
        ),
      },
    );
  }

  rows.push(
    {
      activity: 'Medical',
      hazard: 'Allergic reaction (anaphylactic shock)',
      possibleAccident: 'Severe allergic reaction needing emergency treatment',
      severity: 5, likelihood: 2, likelihoodAfter: 1,
      riskControl: 'Teachers remind relevant students to bring their EpiPen.',
    },
    {
      activity: 'Medical',
      hazard: 'Asthma',
      possibleAccident: 'Asthma attack',
      severity: 4, likelihood: 2, likelihoodAfter: 1,
      riskControl: 'Teachers remind relevant students to bring their inhaler.',
    },
    {
      activity: 'Medical',
      hazard: lines('Pre-existing medical conditions', 'Falling ill during the activity'),
      possibleAccident: 'Feeling unwell or injured during the programme',
      severity: 3, likelihood: 2, likelihoodAfter: 1,
      riskControl: lines(
        'Teachers bring students\' particulars, medical conditions and parents\' contacts (via SC Mobile).',
        'Teachers familiarise themselves with the students\' medical conditions.',
        'Teachers remind relevant students to bring their own medication.',
        'Students tell a teacher if they feel unwell.',
        'Teacher to bring a First Aid Kit.',
      ),
    },
  );
  return rows.map(r => row({ ...r, actionOfficer: o.actionOfficer }));
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
          cell(formatSeverity(r), { width: widths[4], center: true }),
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
        note(RAMS_SCORE_NOTE),
        note(RAMS_SCALE_NOTE),
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
