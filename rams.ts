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

// Rows for common programme activities, used when the AI is not available (or adds nothing),
// so every activity the teacher names still gets a real hazard and risk controls.
interface ActivityRule {
  match: RegExp;
  row: Omit<RamsRow, 'activity' | 'actionOfficer' | 'remarks'>;
}

const NEAR_WATER = /\b(water sampl\w*|stream|river|pond|lake|reservoir|quarry|little guilin|canal|mangrove|beach|sea|coast\w*|shore)\b/i;

const ACTIVITY_RULES: ActivityRule[] = [
  {
    match: /water sampl|stream study|river study|water quality|sampling/i,
    row: {
      hazard: 'Working at the edge of a water body\nSlippery or unstable banks',
      possibleAccident: 'Slips and falls into the water\nDrowning',
      severity: 5, likelihood: 2, likelihoodAfter: 1,
      riskControl: 'Students collect samples only from the designated spot, behind the marked line, using long-handled samplers.\nNo one enters the water.\nA teacher is stationed at the water\'s edge throughout.\nStudents wash or sanitise their hands after handling water samples.',
    },
  },
  {
    match: /kayak|canoe|dragon ?boat|sailing|raft|boat/i,
    row: {
      hazard: 'Capsizing\nCold water and strong currents',
      possibleAccident: 'Drowning\nHypothermia',
      severity: 5, likelihood: 2, likelihoodAfter: 1,
      riskControl: 'Activity conducted by certified instructors from an approved vendor.\nAll participants wear buoyancy aids at all times.\nSafety boat on standby.\nStudents\' swimming ability noted before the activity.',
    },
  },
  {
    match: /swim/i,
    row: {
      hazard: 'Deep water\nWeak swimmers',
      possibleAccident: 'Drowning',
      severity: 5, likelihood: 2, likelihoodAfter: 1,
      riskControl: 'Instructor to student ratio of 1:10.\nLifeguard on duty throughout.\nWeak swimmers stay in the shallow area.',
    },
  },
  {
    match: /climb|high element|rock wall|abseil|rope course|ropes course/i,
    row: {
      hazard: 'Working at height\nEquipment failure',
      possibleAccident: 'Falls from height, resulting in serious injuries',
      severity: 5, likelihood: 2, likelihoodAfter: 1,
      riskControl: 'Activity conducted by certified instructors.\nHarnesses and helmets checked before use and worn at all times.\nStudents briefed on safety procedures before the activity.',
    },
  },
  {
    match: /hik|trek|trail|nature walk|walking tour|heritage walk|learning journey walk/i,
    row: {
      hazard: 'Uneven and steep paths\nTree roots and loose gravel',
      possibleAccident: 'Slips, trips and falls\nSprains and grazes',
      severity: 3, likelihood: 3, likelihoodAfter: 2,
      riskControl: 'Students keep to marked paths and walk, not run.\nStudents wear covered shoes with a good grip.\nTeachers lead and sweep the group, with regular headcounts.',
    },
  },
  {
    match: /sketch|observation|field ?work|investigation|data collection|survey|photograph/i,
    row: {
      hazard: 'Standing or sitting at viewpoints near slopes or edges\nProlonged time outdoors',
      possibleAccident: 'Slips and falls\nFatigue',
      severity: 3, likelihood: 2, likelihoodAfter: 1,
      riskControl: 'Teachers identify safe spots for observation away from edges and slopes.\nStudents stay within the area set by the teachers.\nShort breaks in the shade are given.',
    },
  },
  {
    match: /briefing|talk|lecture|assembly|presentation|sharing|seminar|workshop|debate|quiz|discussion|dialogue/i,
    row: {
      hazard: 'Crowding when the group gathers\nStudents not hearing instructions',
      possibleAccident: 'Minor injuries from jostling\nStudents missing safety information',
      severity: 2, likelihood: 2, likelihoodAfter: 1,
      riskControl: 'Students gather in a shaded, spacious area.\nTeachers use a loudhailer or microphone where needed.\nTeachers check that all students have heard the safety instructions.',
    },
  },
  {
    match: /laser tag|nerf|paintball|archery tag/i,
    row: {
      hazard: 'Projectiles hitting the face or eyes\nRunning in the play area',
      possibleAccident: 'Eye injuries\nCollisions and sprains',
      severity: 4, likelihood: 2, likelihoodAfter: 1,
      riskControl: 'Safety masks or goggles worn at all times during play.\nShooting at close range or at the head is not allowed.\nGame rules and boundaries briefed before play.',
    },
  },
  {
    match: /bubble soccer|football|soccer|basketball|netball|floorball|frisbee|sports? day|games day|relay|race|tug of war/i,
    row: {
      hazard: 'Physical contact and collisions\nSlippery or uneven playing surface',
      possibleAccident: 'Sprains, fractures and concussion',
      severity: 3, likelihood: 3, likelihoodAfter: 2,
      riskControl: 'Warm-up before play.\nRules on safe play briefed and enforced by teachers.\nPlaying area checked and kept dry.',
    },
  },
  {
    match: /ice[- ]?breaker|bonding|station games|team games|games|amazing race|challenge/i,
    row: {
      hazard: 'Running and collisions during games\nOver-excitement',
      possibleAccident: 'Bruises, sprains and grazes',
      severity: 2, likelihood: 3, likelihoodAfter: 2,
      riskControl: 'Game rules and boundaries briefed before each game.\nTeachers supervise each station.\nGames are chosen to avoid rough physical contact.',
    },
  },
  {
    match: /campfire|cooking|bbq|barbecue|stove/i,
    row: {
      hazard: 'Open flames and hot surfaces',
      possibleAccident: 'Burns',
      severity: 3, likelihood: 2, likelihoodAfter: 1,
      riskControl: 'Fire is lit and managed only by teachers or instructors.\nStudents keep a safe distance from the fire.\nFire extinguisher or water bucket on standby.',
    },
  },
  {
    match: /night walk|night activity|night games/i,
    row: {
      hazard: 'Poor visibility in the dark\nUneven ground',
      possibleAccident: 'Trips and falls\nStudents separated from the group',
      severity: 3, likelihood: 3, likelihoodAfter: 2,
      riskControl: 'Route recced in daylight.\nStudents move in buddy pairs with torches.\nTeachers lead and sweep the group, with headcounts.',
    },
  },
  {
    match: /dance|drill|march|parade|rehears/i,
    row: {
      hazard: 'Repetitive movements and long rehearsals\nSlippery floor',
      possibleAccident: 'Muscle strains and sprains\nFatigue',
      severity: 3, likelihood: 3, likelihoodAfter: 2,
      riskControl: 'Warm-up and cool-down before and after each session.\nRegular breaks during rehearsals.\nFloor checked and kept dry.',
    },
  },
  {
    match: /bowling/i,
    row: {
      hazard: 'Heavy bowling balls\nSlippery lanes',
      possibleAccident: 'Crushed fingers and toes\nSlips and falls',
      severity: 2, likelihood: 2, likelihoodAfter: 1,
      riskControl: 'Students use balls of a suitable weight and wear the bowling shoes provided.\nStudents do not step onto the lanes.',
    },
  },
];

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const activityRamsRows = (opts: { activities: string; venue: string; outdoors: boolean; actionOfficer: string }): RamsRow[] => {
  const items = (opts.activities || '').split(/[,;\n]|\band\b/i).map(t => t.trim()).filter(Boolean).slice(0, 10);
  const used = new Set<ActivityRule>();
  const rows: RamsRow[] = [];
  for (const item of items) {
    const rule = ACTIVITY_RULES.find(r => r.match.test(item));
    if (rule && used.has(rule)) continue;
    if (rule) used.add(rule);
    const base = rule?.row || {
      hazard: 'Unfamiliar activity or equipment\nStudents not following instructions',
      possibleAccident: 'Minor injuries such as cuts, bruises or sprains',
      severity: 2, likelihood: 2, likelihoodAfter: 1,
      riskControl: 'Teacher-in-charge briefs students on the activity and its safety rules beforehand.\nTeachers supervise throughout and stop the activity if it becomes unsafe.',
    };
    rows.push(row({ ...base, activity: titleCase(item), actionOfficer: opts.actionOfficer }));
  }
  // An outdoor venue next to water needs a water row even if no activity mentions it
  const waterRule = ACTIVITY_RULES[0];
  if (opts.outdoors && NEAR_WATER.test(opts.venue) && !used.has(waterRule) && !used.has(ACTIVITY_RULES[1])) {
    rows.push(row({
      activity: 'Movement near the water at the venue',
      hazard: 'Unfenced edges of a water body\nSlippery ground near the water',
      possibleAccident: 'Slips and falls into the water\nDrowning',
      severity: 5, likelihood: 2, likelihoodAfter: 1,
      riskControl: 'Students keep to the paths and stay away from the water\'s edge.\nTeachers are stationed where paths run close to the water.\nNo one enters the water.',
      actionOfficer: opts.actionOfficer,
    }));
  }
  return rows;
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
