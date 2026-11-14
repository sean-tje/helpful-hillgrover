import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ProgrammeType, VenueSetting, ConditionalAnswers, Programme, Task, Document, PgLetterFields, RamsFields, StudentBriefFields } from '../types';
import { PgLetterEditor } from './PgLetterEditor';
import { RamsEditor } from './RamsEditor';
import { VctEditor } from './VctEditor';
import { ProgrammeSettingsPicker, useProgrammeSettings } from './ProgrammeSettingsPicker';
import { StepRail } from './planner/StepRail';
import { EventTypeSelect } from './planner/EventTypeSelect';
import { StaffChips } from './planner/StaffChips';
import { COMPETENCIES, CountedInput, Field, FormSection, StaffSelect, checkboxClass, inputClass } from './planner/FormParts';
import { PROGRAMME_TYPE_OPTIONS } from '../programmeSettings';
import { StudentBriefEditor } from './StudentBriefEditor';
import { buildBriefText } from '../briefText';
import { downloadDeliverableWord } from '../deliverableExport';
import { buildRamsText } from '../ramsText';
import { buildPgLetterText } from '../pgLetterText';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  FileText,
  Download,
  Copy,
  Check,
  Megaphone,
  ShieldCheck,
  Clock,
  Users,
  Plus,
  X,
  Flag,
  CalendarDays,
  Package,
  ChevronDown,
  GraduationCap,
  Mail,
  MessageSquareText,
  Image as ImageIcon,
} from 'lucide-react';

interface CreateProgrammeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (programmeId: string) => void;
}

export type DeliverableKey =
  | 'studentInstructionBrief'
  | 'parentsGatewayConsentForm'
  | 'allStaffPreEventBlast'
  | 'allStaffPartnerGratitudeBlast'
  | 'celebratorySocialMediaPost'
  | 'studentVmvReflectionQuestions'
  | 'ramsDocument';

import { formatSingaporeDate, formatSingaporeDateLong, toIsoDate } from '../utils';
import { TimelineTimePicker, minutesToTime, timeToMinutes } from './TimelineTimePicker';
import { VenueInput } from './VenueInput';

// Every packing list carries these two (they also go in the PG letter, and the RAMS relies on them)
const WATER_BOTTLE = 'Filled water bottle';
const MEDICATION = 'Personal medication (if prescribed or necessary)';

interface PackingOption {
  item: string;
  defaultOn: boolean;
  locked?: boolean; // always on
}

// What each programme type sets up automatically: logistics to pre-tick and packing items
// to add. Teachers can still change any of it.
const PROGRAMME_TYPE_RULES: Partial<Record<ProgrammeType, {
  preChecks: Partial<ConditionalAnswers>;
  packingItems: string[];
  note: string;
}>> = {
  Camp: {
    preChecks: { areMealsRequired: true },
    packingItems: ['Toiletries', 'Change of clothing', 'Mosquito repellent'],
    note: 'Camp: Catering is ticked and camp items are added to the packing list.',
  },
  Exchange: {
    preChecks: { isOffSite: true, isTransportRequired: true },
    packingItems: [],
    note: 'Exchange with another school: External venue and Bus Booking are ticked.',
  },
  'Learning Journey': {
    preChecks: { isOffSite: true, isTransportRequired: true },
    packingItems: [],
    note: 'Learning Journey: External venue and Bus Booking are ticked.',
  },
  VIA: {
    preChecks: { isOffSite: true },
    packingItems: [],
    note: 'VIA / Community Service: External venue is ticked.',
  },
  Training: {
    preChecks: { isOffSite: false, isTransportRequired: false },
    packingItems: [],
    note: 'Training, Workshops & Meetings are held in school.',
  },
};

// Programme types that always run in school
const IN_SCHOOL_TYPES: ProgrammeType[] = ['Training'];

const ATTIRE_OPTIONS = [
  'School PE T-shirt and school shorts/skirt',
  'School polo shirt and school shorts/skirt',
  'Full School Uniform',
  'Half-Uniform',
  'CCA T-shirt',
];

// An overnight camp packs for sleeping over instead of the day-camp list
const OVERNIGHT_CAMP_PACKING_LIST = [
  'Clothes to sleep in',
  'Fork and spoon',
  'Laundry bag / plastic bags',
  'Sleeping bag',
  'Bath towel',
  'Shower slippers',
  'Toothbrush & toothpaste',
  'Shampoo and body soap',
  'Any other toiletries needed',
  'Change of clothing',
  'Mosquito repellent',
];

// The packing list choices: the standard items (umbrella and snacks only for an external
// venue; PLD and snacks start unticked), then the items for the programme type
// Umbrella/raincoat for an external venue; sunscreen and cap whenever any of it is outdoors
const packingOptionsFor = (type: ProgrammeType, isOvernight: boolean, isExternal: boolean, setting: VenueSetting): PackingOption[] => {
  const outdoors = setting !== 'Indoors';
  const standard: PackingOption[] = [
    { item: WATER_BOTTLE, defaultOn: true, locked: true },
    ...(isExternal ? [{ item: 'Umbrella / raincoat', defaultOn: true }] : []),
    ...(outdoors ? [{ item: 'Sunscreen', defaultOn: true }, { item: 'Cap', defaultOn: true }] : []),
    { item: 'Writing materials', defaultOn: true },
    { item: 'PLD (iPad)', defaultOn: false },
    ...(isExternal ? [{ item: 'Snacks', defaultOn: false }] : []),
    { item: MEDICATION, defaultOn: true, locked: true },
  ];
  const extras = [
    ...(isOvernight ? OVERNIGHT_CAMP_PACKING_LIST : PROGRAMME_TYPE_RULES[type]?.packingItems ?? []),
    ...(type === 'Learning Journey' && outdoors ? ['Mosquito repellent'] : []),
  ];
  return [...standard, ...extras.filter(item => !standard.some(o => o.item === item)).map(item => ({ item, defaultOn: true }))];
};

// The planner's response, mapped to the 7 deliverables (older field names as fallbacks)
export const deliverablesFromPlannerResponse = (data: any): Record<DeliverableKey, string> => ({
  studentInstructionBrief: data.studentInstructionBrief || data.studentInfoBriefAndScript || '',
  parentsGatewayConsentForm: data.parentsGatewayConsentForm || data.parentsGatewayDraft || '',
  allStaffPreEventBlast: data.allStaffPreEventBlast || data.allStaffAnnouncementVCT || '',
  allStaffPartnerGratitudeBlast: data.allStaffPartnerGratitudeBlast || data.allStaffGratitudePostVCT || '',
  celebratorySocialMediaPost: data.celebratorySocialMediaPost || '',
  studentVmvReflectionQuestions: data.studentVmvReflectionQuestions || data.studentVmvReflection || '',
  ramsDocument: data.ramsDocument || data.ramsDraft || '',
});

const getTodayIsoDate = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};


interface DeliverableDefinition {
  key: DeliverableKey;
  label: string;
  shortLabel: string; // in the Create programme footer
  badge?: string;
  badgeColor?: string;
  icon: React.ElementType;
  wordFilename: string;
}

// 1 to 4 are needed before the event, 5 to 7 after it
export const DELIVERABLES: DeliverableDefinition[] = [
  {
    key: 'parentsGatewayConsentForm',
    label: '1. PG Consent Form',
    shortLabel: 'PG Consent Letter',
    badge: '1 Month Lead Time • Word Doc',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: Mail,
    wordFilename: 'Parents_Gateway_Consent_Form',
  },
  {
    key: 'ramsDocument',
    label: '2. RAMS',
    shortLabel: 'RAMS',
    badge: '1 Month Lead Time • Word Doc',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: ShieldCheck,
    wordFilename: 'RAMS_Safety_Risk_Assessment',
  },
  {
    key: 'allStaffPreEventBlast',
    label: '3. VCT All-Staff Info Blast (Pre-Event)',
    shortLabel: 'VCT (Pre-Event)',
    badge: 'Staff Broadcast (VCT)',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    icon: Megaphone,
    wordFilename: 'All_Staff_Pre_Event_Announcement',
  },
  {
    key: 'studentInstructionBrief',
    label: '4. Student Instruction Brief',
    shortLabel: 'Student Brief',
    icon: FileText,
    wordFilename: 'Student_Instruction_Brief_and_Packing_List',
  },
  {
    key: 'allStaffPartnerGratitudeBlast',
    label: '5. VCT All-Staff Info Blast (Post-Event)',
    shortLabel: 'VCT (Post-Event)',
    badge: 'Gratitude & Appreciation',
    badgeColor: 'bg-pink-100 text-pink-800 border-pink-200',
    icon: Megaphone,
    wordFilename: 'All_Staff_Partner_Gratitude_and_Writer_Appreciation',
  },
  {
    key: 'studentVmvReflectionQuestions',
    label: '6. Student Reflection Questions',
    shortLabel: 'Reflection Questions',
    badge: 'Vision • Mission • Values',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: MessageSquareText,
    wordFilename: 'Student_Reflection_Questions_VMV',
  },
  {
    key: 'celebratorySocialMediaPost',
    label: '7. Social Media Post',
    shortLabel: 'Social Media Post',
    badge: 'Publicity & Social',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: ImageIcon,
    wordFilename: 'Celebratory_Social_Media_Post_Draft',
  },
];

export const CreateProgrammeModal: React.FC<CreateProgrammeModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { currentUser, allowlistedUsers, isCommitteeLead } = useAuth();
  const { addProgramme, addDocument } = useData();

  // 3-Step workflow: 1. Programme Details -> 2. 7 Generated Deliverables -> 3. Milestone Review
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Combined Form State
  const [title, setTitle] = useState('');
  const [programmeType, setProgrammeType] = useState<ProgrammeType>(PROGRAMME_TYPE_OPTIONS[0].value);
  const [startDate, setStartDate] = useState(getTodayIsoDate);
  const [endDate, setEndDate] = useState(getTodayIsoDate);
  const [startTime, setStartTime] = useState('07:30');
  const [endTime, setEndTime] = useState('17:00');
  const [venue, setVenue] = useState('');
  const [reportingVenue, setReportingVenue] = useState('');
  const [dismissalVenue, setDismissalVenue] = useState('');
  const [firstIcId, setFirstIcId] = useState<string>(currentUser.id);
  const [secondIcId, setSecondIcId] = useState<string>('');
  const [thirdIcId, setThirdIcId] = useState<string>('');
  const [supportingTeacherIds, setSupportingTeacherIds] = useState<string[]>([]);
  const [supportingTeacherNames, setSupportingTeacherNames] = useState<string[]>([]);
  const [competenciesOpen, setCompetenciesOpen] = useState(false);
  const [packingOpen, setPackingOpen] = useState(true);
  const [addingPackingItem, setAddingPackingItem] = useState(false);
  // The page sits below the app's top bar
  const [headerHeight, setHeaderHeight] = useState(64);
  useLayoutEffect(() => {
    if (!isOpen) return;
    const header = document.querySelector('header');
    if (header) setHeaderHeight(header.getBoundingClientRect().height);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);
  const [participantCount, setParticipantCount] = useState<number>(60);
  const [teacherNotes, setTeacherNotes] = useState('');
  // Ticks the teacher changed, by item; anything not here uses its default
  const [packingTicks, setPackingTicks] = useState<Record<string, boolean>>({});
  const [customPackingItems, setCustomPackingItems] = useState<string[]>([]);
  const [includePackingList, setIncludePackingList] = useState(true);
  const [isOvernight, setIsOvernight] = useState(false);
  // The deliverables the teacher wants generated (all 7 to start with)
  const [selectedDeliverables, setSelectedDeliverables] = useState<DeliverableKey[]>(() => DELIVERABLES.map(d => d.key));
  const [vctNoticeBy, setVctNoticeBy] = useState('');
  const [newPackingItem, setNewPackingItem] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [attire, setAttire] = useState(ATTIRE_OPTIONS[0]);
  const [keyDetails, setKeyDetails] = useState('');
  const [learningObjectives, setLearningObjectives] = useState('');
  // Indoors / outdoors / both and physically strenuous: pre-ticked from the type and details
  const settings = useProgrammeSettings(programmeType, title, venue, keyDetails, additionalDetails, teacherNotes);

  // Members run their own programmes; only the committee OIC/2IC can set someone else as IC
  useEffect(() => {
    if (!isCommitteeLead) {
      setFirstIcId(currentUser.id);
      setSecondIcId('');
      setThirdIcId('');
    }
  }, [currentUser.id, isCommitteeLead]);

  // Quick logistical checkboxes
  const [conditionalAnswers, setConditionalAnswers] = useState<ConditionalAnswers>({
    isTransportRequired: false,
    isOffSite: false,
    isOutsideNormalHours: true,
    involvesPhysicalActivities: true,
    involvesParentsOrGuardians: true,
    areMealsRequired: true,
    areExternalVendorsInvolved: false,
    isRehearsalRequired: false,
    areVisitorsEnteringSchool: false,
    areEquipmentOrPurchasesRequired: true,
  });

  // Generator & Deliverables State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDeliverables, setGeneratedDeliverables] = useState<Record<DeliverableKey, string>>({
    studentInstructionBrief: '',
    parentsGatewayConsentForm: '',
    allStaffPreEventBlast: '',
    allStaffPartnerGratitudeBlast: '',
    celebratorySocialMediaPost: '',
    studentVmvReflectionQuestions: '',
    ramsDocument: '',
  });

  // The PG deliverable comes from the PG letter writer as template fields
  const [pgLetterFields, setPgLetterFields] = useState<PgLetterFields | null>(null);
  // The RAMS deliverable comes from the RAMS writer as RAMS form fields
  const [ramsFields, setRamsFields] = useState<RamsFields | null>(null);
  const [pgIncludeTransport, setPgIncludeTransport] = useState(false);
  // The student brief comes as the school's brief form fields
  const [briefFields, setBriefFields] = useState<StudentBriefFields | null>(null);

  const [activeDeliverableKey, setActiveDeliverableKey] = useState<DeliverableKey>('parentsGatewayConsentForm');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isExportingKey, setIsExportingKey] = useState<string | null>(null);

  // Proposed Tasks State
  const [proposedTasks, setProposedTasks] = useState<Array<Partial<Task> & { approved: boolean; rejected: boolean }>>([]);

  if (!isOpen) return null;

  // External programmes need to say where students report and are dismissed
  const isExternal = conditionalAnswers.isOffSite && !IN_SCHOOL_TYPES.includes(programmeType);
  const missingVenues = isExternal && (!reportingVenue.trim() || !dismissalVenue.trim());
  const externalVenues = isExternal
    ? { reportingVenue: reportingVenue.trim(), dismissalVenue: dismissalVenue.trim() }
    : {};

  const answersWithSettings: ConditionalAnswers = {
    ...conditionalAnswers,
    venueSetting: settings.setting,
    isStrenuous: settings.strenuous,
    involvesPhysicalActivities: settings.strenuous,
  };

  const packingOptions = [
    ...packingOptionsFor(programmeType, isOvernight, isExternal, settings.setting),
    ...customPackingItems.map(item => ({ item, defaultOn: true })),
  ];
  const isPackingTicked = (option: PackingOption) => option.locked || (packingTicks[option.item] ?? option.defaultOn);
  const packingList = packingOptions.filter(isPackingTicked).map(o => o.item);

  // Official names for the documents: the ICs first, then the supporting teachers
  const userById = (id: string) => allowlistedUsers.find(u => u.id === id);
  const officialName = (id: string) => userById(id)?.fullName || userById(id)?.name || '';
  const icIds = [firstIcId, secondIcId, thirdIcId].filter(Boolean);
  const icNames = icIds.map(officialName).filter(Boolean).join(' / ');
  const teacherNames = [
    ...icIds.map(officialName),
    ...supportingTeacherIds.filter(id => !icIds.includes(id)).map(officialName),
    ...supportingTeacherNames,
  ].filter(Boolean).join(' / ');
  // Parents Gateway shows the teachers-in-charge with their schools.gov.sg emails
  const contactTeachers = [firstIcId, secondIcId].filter(Boolean)
    .map(id => (userById(id)?.pgEmail ? `${officialName(id)} (${userById(id)!.pgEmail})` : officialName(id)))
    .filter(Boolean)
    .join(' or ');
  const shownDeliverables = DELIVERABLES.filter(d => selectedDeliverables.includes(d.key));
  const toggleDeliverable = (key: DeliverableKey, on: boolean) =>
    setSelectedDeliverables(prev => DELIVERABLES.map(d => d.key).filter(k => (k === key ? on : prev.includes(k))));

  // Choosing a type pre-ticks its logistics (the packing list follows the type)
  const handleProgrammeTypeChange = (type: ProgrammeType) => {
    setProgrammeType(type);
    setConditionalAnswers(prev => ({ ...prev, ...(PROGRAMME_TYPE_RULES[type]?.preChecks ?? {}) }));
  };

  const handleOvernightChange = (overnight: boolean) => setIsOvernight(overnight);

  const addPackingItem = () => {
    const item = newPackingItem.trim();
    const existing = packingOptions.find(o => o.item.toLowerCase() === item.toLowerCase());
    if (existing) setPackingTicks(prev => ({ ...prev, [existing.item]: true }));
    else if (item) setCustomPackingItems(prev => [...prev, item]);
    setNewPackingItem('');
  };

  const pgLetterForExport = (): PgLetterFields | null =>
    pgLetterFields && {
      ...pgLetterFields,
      transportation: pgIncludeTransport ? pgLetterFields.transportation : '',
      objectives: pgLetterFields.objectives.map(o => o.trim()).filter(Boolean),
    };

  const deliverableText = (key: DeliverableKey) => {
    const pgLetter = key === 'parentsGatewayConsentForm' ? pgLetterForExport() : null;
    if (pgLetter) return buildPgLetterText(pgLetter);
    if (key === 'ramsDocument' && ramsFields) return buildRamsText(ramsFields);
    if (key === 'studentInstructionBrief' && briefFields) return buildBriefText(briefFields);
    return generatedDeliverables[key];
  };

  // Handle generation of the 7 deliverables
  const handleGenerateDeliverables = async () => {
    if (!title.trim()) return;
    setIsGenerating(true);
    setStep(2);

    try {
      const res = await fetch('/api/gemini/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programme: {
            title,
            type: programmeType,
            startDate,
            endDate,
            startTime,
            endTime,
            venue: venue.trim() || 'Hillgrove Secondary School',
            ...externalVenues,
            firstIcId,
            firstIcName: allowlistedUsers.find(u => u.id === firstIcId)?.name,
            secondIcId: secondIcId || undefined,
            thirdIcId: thirdIcId || undefined,
            supportingTeacherIds,
            supportingTeacherNames,
            participantCount,
          },
          conditionalAnswers: answersWithSettings,
          packingList: includePackingList ? packingList : [],
          includePackingList,
          deliverables: selectedDeliverables,
          // Labelled lines the planner reads (attire, activities, objectives), then free text
          teacherNotes: [
            `Attire: ${attire}`,
            isExternal && `Reporting venue: ${reportingVenue.trim()}. Dismissal venue: ${dismissalVenue.trim()}`,
            isOvernight && 'Overnight stay: yes',
            keyDetails.trim() && `Key details of programme: ${keyDetails.trim()}`,
            learningObjectives.trim() && `Key learning objectives: ${learningObjectives.trim()}`,
            additionalDetails.trim(),
            teacherNotes,
          ].filter(Boolean).join('\n'),
          teacherNames,
          contactTeachers,
        }),
      });

      const data = await res.json();

      // Keep only the deliverables the teacher asked for
      const drafts = deliverablesFromPlannerResponse(data);
      setGeneratedDeliverables(Object.fromEntries(
        DELIVERABLES.map(d => [d.key, selectedDeliverables.includes(d.key) ? drafts[d.key] : ''])
      ) as Record<DeliverableKey, string>);
      setActiveDeliverableKey(selectedDeliverables[0]);
      setVctNoticeBy(prev => prev || icNames);

      setPgLetterFields(selectedDeliverables.includes('parentsGatewayConsentForm') ? data.pgLetterFields || null : null);
      setRamsFields(selectedDeliverables.includes('ramsDocument') ? data.ramsFields || null : null);
      setBriefFields(selectedDeliverables.includes('studentInstructionBrief') ? data.briefFields || null : null);
      setPgIncludeTransport(!!data.pgLetterFields?.transportation);

      const tasks = (data.proposedTasks || []).map((pt: any, idx: number) => ({
        id: `tsk_prop_${Date.now()}_${idx}`,
        programmeId: '',
        title: pt.title,
        notes: pt.notes || pt.leadTimeLabel || '',
        ownerId: firstIcId,
        previousOwnerIds: [],
        dueDate: toIsoDate(pt.dueDate) || startDate,
        status: 'Not Started' as const,
        source: 'ai_proposed_approved' as const,
        approved: true,
        rejected: false,
        createdAt: new Date().toISOString(),
        handovers: [],
      }));

      setProposedTasks(tasks);
    } catch (err) {
      console.error('Planner deliverables generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Export any deliverable as Word document (.docx), each in its school layout
  const handleExportWord = async (key: DeliverableKey, titleLabel: string) => {
    const content = deliverableText(key);
    if (!content) return;
    setIsExportingKey(key);
    try {
      await downloadDeliverableWord({
        key,
        programmeTitle: title,
        label: titleLabel,
        text: content,
        pgLetter: key === 'parentsGatewayConsentForm' ? pgLetterForExport() : null,
        rams: key === 'ramsDocument' ? ramsFields : null,
        brief: key === 'studentInstructionBrief' ? briefFields : null,
        vctNoticeBy,
      });
    } catch (err) {
      console.error('Word export failed:', err);
    } finally {
      setIsExportingKey(null);
    }
  };

  // Copy to clipboard
  const handleCopy = (key: DeliverableKey) => {
    const text = deliverableText(key);
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Final Submit & Creation
  const handleFinalSubmit = async () => {
    const newProgrammeId = `prg_${Date.now()}`;

    const newProgramme: Programme = {
      id: newProgrammeId,
      title,
      type: programmeType,
      description: `Hillgrove ${programmeType} programme: ${title}.`,
      objectives: `Execute safe, purpose-driven ${programmeType} fostering autonomous learners and caring student leaders.`,
      startDate,
      endDate,
      startTime,
      endTime,
      venue: venue.trim() || 'Hillgrove Secondary School',
      ...externalVenues,
      status: 'Planning',
      term: 'Term 3',
      firstIcId,
      secondIcId: secondIcId || undefined,
      thirdIcId: thirdIcId || undefined,
      supportingTeacherIds,
      ...(supportingTeacherNames.length ? { supportingTeacherNames } : {}),
      conditionalAnswers: answersWithSettings,
      createdBy: currentUser.id,
      // Keep the chosen deliverables with the programme so they can be reopened later
      deliverables: Object.fromEntries(shownDeliverables.map(d => [d.key, deliverableText(d.key)])),
      ...(pgLetterFields ? { pgLetterFields, pgIncludeTransport } : {}),
      ...(ramsFields ? { ramsFields } : {}),
      ...(briefFields ? { briefFields } : {}),
      ...(selectedDeliverables.some(k => k === 'allStaffPreEventBlast' || k === 'allStaffPartnerGratitudeBlast') ? { vctNoticeBy } : {}),
      createdAt: new Date().toISOString(),
    };

    // Prepare approved tasks
    const activeTasks: Task[] = proposedTasks
      .filter(t => t.approved && !t.rejected)
      .map(t => ({
        id: t.id || `tsk_${Math.random()}`,
        programmeId: newProgrammeId,
        title: t.title || 'Programme Milestone Task',
        notes: t.notes,
        ownerId: t.ownerId || firstIcId,
        previousOwnerIds: [],
        dueDate: t.dueDate || startDate,
        status: 'Not Started',
        source: 'ai_proposed_approved',
        approvedBy: currentUser.id,
        createdAt: new Date().toISOString(),
        handovers: [],
      }));

    // Save programme and tasks
    await addProgramme(newProgramme, activeTasks);

    // Automatically archive all 7 generated deliverables as official documents in the repository
    const deliverableCategoryMap: Record<DeliverableKey, any> = {
      studentInstructionBrief: 'Student Instructions',
      parentsGatewayConsentForm: 'Parents Gateway Letters',
      allStaffPreEventBlast: 'SOPs',
      allStaffPartnerGratitudeBlast: 'SOPs',
      celebratorySocialMediaPost: 'SOPs',
      studentVmvReflectionQuestions: 'VMV',
      ramsDocument: 'RAMS',
    };

    shownDeliverables.forEach(deliv => {
      const content = deliverableText(deliv.key);
      if (content && content.trim()) {
        const docRecord: Document = {
          id: `doc_${Date.now()}_${deliv.key}`,
          programmeId: newProgrammeId,
          title: `${title} - ${deliv.label}`,
          filePath: `/repository/${title.replace(/\s+/g, '_')}_${deliv.key}.docx`,
          fileType: 'docx',
          category: deliverableCategoryMap[deliv.key] || 'Programme Proposals',
          year: new Date().getFullYear(),
          programmeType: programmeType,
          status: 'Approved',
          ownerId: currentUser.id,
          tags: [programmeType.toLowerCase(), 'ai-generated', deliv.key],
          templateFlag: false,
          uploadedBy: currentUser.name,
          uploadedAt: new Date().toISOString(),
          indexingStatus: 'Searchable',
          fileSize: `${Math.max(10, Math.round(content.length / 100))} KB`,
          excerpt: content.slice(0, 300) + '...',
        };
        addDocument(docRecord).catch(err => console.warn('Failed to archive document:', err));
      }
    });

    onCreated(newProgrammeId);
    onClose();
  };

  const activeDeliverable = DELIVERABLES.find(d => d.key === activeDeliverableKey) || shownDeliverables[0] || DELIVERABLES[0];
  const deliverableCount = `${shownDeliverables.length} ${shownDeliverables.length === 1 ? 'Deliverable' : 'Deliverables'}`;

  // Required on this page before the drafts can be generated
  const missingFields = [
    !title.trim() && 'a working title',
    !learningObjectives.trim() && 'key learning objectives',
    !keyDetails.trim() && 'key activities',
    missingVenues && 'the reporting and dismissal venues',
    selectedDeliverables.length === 0 && 'at least one draft',
  ].filter(Boolean) as string[];
  const canGenerate = missingFields.length === 0 && !isGenerating;
  const draftsLabel = `${shownDeliverables.length} ${shownDeliverables.length === 1 ? 'draft' : 'drafts'}`;
  const committeeOptions = (exclude: string[]) => allowlistedUsers.filter(u => !exclude.includes(u.id));
  const lockedPacking = packingOptions.filter(o => o.locked);
  const suggestedPacking = packingOptions.filter(o => !o.locked);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 overflow-y-auto bg-slate-50" style={{ top: headerHeight }}>
      <div className={`max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 sm:pt-8 ${step === 1 ? 'pb-36' : 'pb-12'}`}>
        <button type="button" onClick={onClose} className="mb-2 -ml-2 inline-flex items-center gap-1.5 h-8 px-2 rounded-lg text-[14px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100">
          <ArrowLeft className="w-4 h-4" /> Cancel
        </button>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
          <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-slate-900">Create programme</h1>
          <StepRail step={step} />
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-12px_rgba(15,23,42,0.08)] px-5 sm:px-8 lg:px-10">
          {/* STEP 1: Details */}
          {step === 1 && (
            <>
              {/* Programme */}
              <FormSection icon={Flag} title="Programme" first>
                <Field label="Working title" required htmlFor="cp-title">
                  <input
                    id="cp-title"
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. 2027 Annual Student Leadership Camp"
                    className={inputClass}
                  />
                </Field>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-x-5 gap-y-5">
                  <Field label="Event type" required htmlFor="cp-type" className="md:col-span-4">
                    <EventTypeSelect id="cp-type" value={programmeType} onChange={handleProgrammeTypeChange} />
                  </Field>
                  <Field label="Estimated participants" required htmlFor="cp-count" className="md:col-span-3">
                    <input
                      id="cp-count"
                      type="number"
                      min={1}
                      value={participantCount}
                      onChange={e => setParticipantCount(parseInt(e.target.value) || 60)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Attire" required htmlFor="cp-attire" className="md:col-span-5">
                    <div className="relative">
                      <select id="cp-attire" value={attire} onChange={e => setAttire(e.target.value)} className={`${inputClass} appearance-none pr-10`}>
                        {ATTIRE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </Field>
                </div>
                <Field
                  label="Key learning objectives"
                  required
                  htmlFor="cp-objectives"
                  aside={
                    <button
                      type="button"
                      onClick={() => setCompetenciesOpen(o => !o)}
                      aria-expanded={competenciesOpen}
                      className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-emerald-50 text-[13px] font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      <GraduationCap className="w-4 h-4" />
                      MOE 21st Century Competencies
                    </button>
                  }
                >
                  <CountedInput id="cp-objectives" value={learningObjectives} onChange={setLearningObjectives} max={200} placeholder="e.g. Critical thinking, collaboration skills, cross-cultural literacy" />
                  {competenciesOpen && (
                    <div className="mt-2.5 flex flex-wrap gap-2" aria-label="Add a 21st Century Competency">
                      {COMPETENCIES.map(c => {
                        const added = learningObjectives.toLowerCase().includes(c.toLowerCase());
                        return (
                          <button
                            key={c}
                            type="button"
                            disabled={added}
                            onClick={() => setLearningObjectives(prev => [prev.trim().replace(/[,.]$/, ''), c].filter(Boolean).join(', ').slice(0, 200))}
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full border border-emerald-200 bg-white text-[13px] text-emerald-900 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-default"
                          >
                            {added ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} {c}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Field>
                <Field label="Key activities" required htmlFor="cp-activities">
                  <CountedInput id="cp-activities" value={keyDetails} onChange={setKeyDetails} max={300} placeholder="e.g. Ice-breakers, bonding, debate, quiz, campfire" />
                </Field>
              </FormSection>

              {/* When & where */}
              <FormSection icon={CalendarDays} title="When & where">
                <div className="flex flex-wrap items-end gap-x-4 gap-y-4">
                  <Field label="Start date" required htmlFor="cp-start-date" className="w-[10.5rem]">
                    <input
                      id="cp-start-date"
                      type="date"
                      value={startDate}
                      onChange={e => {
                        const value = e.target.value;
                        if (!value) return;
                        setStartDate(value);
                        const newEnd = endDate < value ? value : endDate;
                        setEndDate(newEnd);
                        if (programmeType === 'Camp') handleOvernightChange(newEnd > value);
                      }}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="End date" required htmlFor="cp-end-date" className="w-[10.5rem]">
                    <input
                      id="cp-end-date"
                      type="date"
                      min={startDate}
                      value={endDate}
                      onChange={e => {
                        const value = e.target.value;
                        if (!value) return;
                        const newEnd = value < startDate ? startDate : value;
                        setEndDate(newEnd);
                        if (programmeType === 'Camp') handleOvernightChange(newEnd > startDate);
                      }}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Start time" required htmlFor="cp-start-time" className="w-[8.5rem]">
                    <input
                      id="cp-start-time"
                      type="time"
                      step={300}
                      value={startTime}
                      onChange={e => {
                        const value = e.target.value;
                        if (!value) return;
                        setStartTime(value);
                        if (value >= endTime) setEndTime(minutesToTime(Math.min(timeToMinutes(value) + 60, 23 * 60)));
                      }}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="End time" required htmlFor="cp-end-time" className="w-[8.5rem]">
                    <input
                      id="cp-end-time"
                      type="time"
                      step={300}
                      min={startTime}
                      value={endTime}
                      onChange={e => e.target.value && e.target.value > startTime && setEndTime(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Venue" required className="flex-1 min-w-[12rem]">
                    <VenueInput value={venue} onChange={setVenue} />
                  </Field>
                  {!IN_SCHOOL_TYPES.includes(programmeType) && (
                    <label className="flex items-center gap-2.5 h-11 text-[15px] text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={conditionalAnswers.isOffSite}
                        onChange={e => {
                          const isOffSite = e.target.checked;
                          setConditionalAnswers(prev => ({ ...prev, isOffSite, isTransportRequired: isOffSite ? prev.isTransportRequired : false }));
                        }}
                        className={checkboxClass}
                      />
                      External venue
                    </label>
                  )}
                </div>

                <TimelineTimePicker
                  startTime={startTime}
                  endTime={endTime}
                  showInputs={false}
                  onChange={(newStart, newEnd) => {
                    setStartTime(newStart);
                    setEndTime(newEnd);
                  }}
                />

                {IN_SCHOOL_TYPES.includes(programmeType) && (
                  <p className="text-[13px] text-slate-500">Training, workshops and meetings are held in school.</p>
                )}
                {isExternal && (
                  <div className="rounded-2xl bg-slate-50 p-4 sm:p-5 space-y-4">
                    <label className="flex items-center gap-2.5 text-[15px] text-slate-800 cursor-pointer w-fit">
                      <input
                        type="checkbox"
                        checked={conditionalAnswers.isTransportRequired}
                        onChange={e => setConditionalAnswers(prev => ({ ...prev, isTransportRequired: e.target.checked }))}
                        className={checkboxClass}
                      />
                      Bus booking required
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {([
                        ['Reporting venue', reportingVenue, setReportingVenue],
                        ['Dismissal venue', dismissalVenue, setDismissalVenue],
                      ] as const).map(([label, value, setValue]) => (
                        <Field key={label} label={label} required>
                          <VenueInput value={value} onChange={setValue} placeholder="e.g. Foyer" ariaLabel={label} />
                        </Field>
                      ))}
                    </div>
                    {missingVenues && <p className="text-[13px] text-rose-600">Enter where students report and are dismissed.</p>}
                  </div>
                )}
              </FormSection>

              {/* Staffing */}
              <FormSection icon={Users} title="Staffing">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Field label="Teacher-in-charge (TIC)" required htmlFor="cp-tic">
                    <StaffSelect
                      id="cp-tic"
                      value={firstIcId}
                      disabled={!isCommitteeLead}
                      onChange={id => {
                        setFirstIcId(id);
                        if (secondIcId === id) setSecondIcId('');
                        if (thirdIcId === id) setThirdIcId('');
                      }}
                      options={allowlistedUsers}
                      currentUserId={currentUser.id}
                    />
                  </Field>
                  <Field label="2IC" htmlFor="cp-2ic">
                    <StaffSelect
                      id="cp-2ic"
                      value={secondIcId}
                      disabled={!isCommitteeLead}
                      onChange={id => { setSecondIcId(id); if (thirdIcId === id) setThirdIcId(''); }}
                      options={committeeOptions([firstIcId])}
                      currentUserId={currentUser.id}
                      allowNone
                    />
                  </Field>
                  <Field label="3IC" htmlFor="cp-3ic">
                    <StaffSelect
                      id="cp-3ic"
                      value={thirdIcId}
                      disabled={!isCommitteeLead}
                      onChange={setThirdIcId}
                      options={committeeOptions([firstIcId, secondIcId])}
                      currentUserId={currentUser.id}
                      allowNone
                    />
                  </Field>
                </div>
                {!isCommitteeLead && (
                  <p className="-mt-2 text-[13px] text-slate-500">You are the teacher-in-charge. The committee OIC or 2IC can assign other ICs.</p>
                )}
                <Field label="Supporting teachers">
                  <StaffChips
                    users={committeeOptions(icIds)}
                    selectedIds={supportingTeacherIds.filter(id => !icIds.includes(id))}
                    names={supportingTeacherNames}
                    onChange={(ids, names) => { setSupportingTeacherIds(ids); setSupportingTeacherNames(names); }}
                  />
                </Field>
              </FormSection>

              {/* Logistics */}
              <FormSection icon={Package} title="Logistics">
                <div className="flex flex-wrap gap-x-10 gap-y-3 text-[15px] text-slate-800">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={isOvernight} onChange={e => handleOvernightChange(e.target.checked)} className={checkboxClass} />
                    Overnight programme
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={conditionalAnswers.areMealsRequired}
                      onChange={e => setConditionalAnswers(prev => ({ ...prev, areMealsRequired: e.target.checked }))}
                      className={checkboxClass}
                    />
                    Catering (Halal) required
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={includePackingList} onChange={e => setIncludePackingList(e.target.checked)} className={checkboxClass} />
                    Include packing list
                  </label>
                </div>

                {includePackingList && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70">
                    <button
                      type="button"
                      onClick={() => setPackingOpen(o => !o)}
                      aria-expanded={packingOpen}
                      className="w-full flex items-center justify-between px-5 py-3.5 text-left"
                    >
                      <span className="text-[16px] font-semibold text-slate-900">
                        Packing list <span className="ml-1.5 text-[14px] font-normal text-slate-500">{packingList.length} items</span>
                      </span>
                      <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${packingOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {packingOpen && (
                      <div className="px-5 pb-4 space-y-3">
                        {PROGRAMME_TYPE_RULES[programmeType] && (
                          <p className="text-[13px] text-slate-500">{PROGRAMME_TYPE_RULES[programmeType]!.note}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <span className="inline-flex items-center h-7 px-3 rounded-full bg-emerald-100/70 text-[13px] font-semibold text-emerald-800">Included by default</span>
                          <span className="text-[15px] text-slate-800">{lockedPacking.map(o => o.item).join('  ·  ')}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center h-7 px-3 mr-1 rounded-full bg-emerald-100/70 text-[13px] font-semibold text-emerald-800">Suggested items</span>
                          {suggestedPacking.map(option => {
                            const on = isPackingTicked(option);
                            const isCustom = customPackingItems.includes(option.item);
                            return (
                              <span key={option.item} className="inline-flex items-center">
                                <button
                                  type="button"
                                  aria-pressed={on}
                                  onClick={() => setPackingTicks(prev => ({ ...prev, [option.item]: !on }))}
                                  className={`inline-flex items-center gap-2 h-9 pl-2.5 ${isCustom ? 'pr-1.5' : 'pr-3.5'} rounded-full border text-[14px] transition ${
                                    on ? 'bg-white border-emerald-600 text-slate-900' : 'bg-white border-slate-300 text-slate-500 hover:border-slate-400'
                                  }`}
                                >
                                  <span className={`w-5 h-5 rounded-md flex items-center justify-center ${on ? 'bg-emerald-700 text-white' : 'border-2 border-slate-300'}`}>
                                    {on && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                                  </span>
                                  {option.item}
                                  {isCustom && (
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      aria-label={`Remove ${option.item}`}
                                      onClick={e => { e.stopPropagation(); setCustomPackingItems(prev => prev.filter(i => i !== option.item)); }}
                                      onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); setCustomPackingItems(prev => prev.filter(i => i !== option.item)); } }}
                                      className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </span>
                                  )}
                                </button>
                              </span>
                            );
                          })}
                          {addingPackingItem ? (
                            <input
                              autoFocus
                              value={newPackingItem}
                              aria-label="Add a packing list item"
                              onChange={e => setNewPackingItem(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { e.preventDefault(); addPackingItem(); }
                                else if (e.key === 'Escape') { setNewPackingItem(''); setAddingPackingItem(false); }
                              }}
                              onBlur={() => { addPackingItem(); setAddingPackingItem(false); }}
                              placeholder="Item name"
                              className="h-9 w-40 px-3 rounded-full border border-emerald-600 bg-white text-[14px] focus:outline-none focus:ring-4 focus:ring-emerald-600/10"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAddingPackingItem(true)}
                              className="inline-flex items-center gap-1 h-9 px-3.5 rounded-full border border-emerald-600 text-[14px] font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                              <Plus className="w-4 h-4" /> Add item
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <span className="block text-[14px] font-semibold text-slate-800">For the RAMS</span>
                  <ProgrammeSettingsPicker
                    setting={settings.setting}
                    strenuous={settings.strenuous}
                    settingReason={settings.settingReason}
                    strenuousReason={settings.strenuousReason}
                    onSettingChange={settings.setSetting}
                    onStrenuousChange={settings.setStrenuous}
                  />
                </div>

                <Field label="Anything else (optional)" htmlFor="cp-notes">
                  <textarea
                    id="cp-notes"
                    rows={2}
                    value={additionalDetails}
                    onChange={e => setAdditionalDetails(e.target.value)}
                    placeholder="e.g. Rain plan in the Hall. Two students with nut allergies."
                    className={`${inputClass} h-auto py-2.5 resize-y`}
                  />
                </Field>
              </FormSection>
            </>
          )}

          {step !== 1 && (
            <div className="py-6 sm:py-8 space-y-6">
          {/* STEP 2: Review, Edit & Export the 7 Generated Deliverables */}
          {step === 2 && (
            <div className="space-y-6">
              {isGenerating ? (
                <div className="py-16 text-center text-slate-500 text-sm space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
                  <div className="font-bold text-slate-800 text-base">Generating {deliverableCount}...</div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Drafting {shownDeliverables.map(d => d.label.replace(/^\d+\.\s*/, '')).join(', ')}.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Deliverables Navigation Selector */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 p-1.5 bg-slate-100 rounded-xl text-xs">
                    {shownDeliverables.map(deliv => {
                      const idx = DELIVERABLES.indexOf(deliv);
                      const isActive = activeDeliverableKey === deliv.key;
                      const Icon = deliv.icon;
                      return (
                        <button
                          key={deliv.key}
                          type="button"
                          onClick={() => setActiveDeliverableKey(deliv.key)}
                          className={`p-2 rounded-lg text-left transition flex flex-col justify-between ${
                            isActive
                              ? 'bg-white text-emerald-950 font-bold shadow-2xs border border-emerald-300 ring-1 ring-emerald-200'
                              : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                            <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                          </div>
                          <span className="line-clamp-2 leading-tight text-[11px]">
                            {deliv.label.replace(/^\d+\.\s*/, '')}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Deliverable Workspace */}
                  <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-slate-900">
                            {activeDeliverable.label}
                          </h3>
                          {activeDeliverable.badge && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${activeDeliverable.badgeColor}`}>
                              {activeDeliverable.badge}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons: Download Word, Copy, Character Count */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(activeDeliverableKey)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          {copiedKey === activeDeliverableKey ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Copy Text</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExportWord(activeDeliverableKey, activeDeliverable.label)}
                          disabled={isExportingKey === activeDeliverableKey}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>
                            {isExportingKey === activeDeliverableKey ? 'Exporting Word...' : 'Download Word (.docx)'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Live In-App Editor (the PG letter is edited inside the letter template) */}
                    {activeDeliverableKey === 'parentsGatewayConsentForm' && pgLetterFields ? (
                      <div className="bg-slate-100 rounded-xl p-3 sm:p-5 space-y-4">
                        <PgLetterEditor
                          fields={pgLetterFields}
                          onChange={setPgLetterFields}
                          includeTransport={pgIncludeTransport}
                          onIncludeTransportChange={setPgIncludeTransport}
                        />
                      </div>
                    ) : activeDeliverableKey === 'ramsDocument' && ramsFields ? (
                      <div className="bg-slate-100 rounded-xl p-3 sm:p-5 space-y-4">
                        <RamsEditor fields={ramsFields} onChange={setRamsFields} />
                      </div>
                    ) : activeDeliverableKey === 'studentInstructionBrief' && briefFields ? (
                      <div className="bg-slate-100 rounded-xl p-3 sm:p-5 space-y-4">
                        <StudentBriefEditor fields={briefFields} onChange={setBriefFields} />
                      </div>
                    ) : activeDeliverableKey === 'allStaffPreEventBlast' || activeDeliverableKey === 'allStaffPartnerGratitudeBlast' ? (
                      <div className="bg-slate-100 rounded-xl p-3 sm:p-5 space-y-4">
                        <VctEditor
                          details={generatedDeliverables[activeDeliverableKey]}
                          onDetailsChange={val => setGeneratedDeliverables(prev => ({ ...prev, [activeDeliverableKey]: val }))}
                          noticeBy={vctNoticeBy}
                          onNoticeByChange={setVctNoticeBy}
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1.5">
                          <span>Editable In-App Text Preview:</span>
                          <span>{generatedDeliverables[activeDeliverableKey]?.length || 0} characters</span>
                        </div>
                        <textarea
                          rows={12}
                          value={generatedDeliverables[activeDeliverableKey]}
                          onChange={e => {
                            const val = e.target.value;
                            setGeneratedDeliverables(prev => ({
                              ...prev,
                              [activeDeliverableKey]: val,
                            }));
                          }}
                          className="w-full p-3.5 border border-slate-200 rounded-xl text-xs font-mono leading-relaxed bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                        />
                      </div>
                    )}
                  </div>

                  {/* Navigation Bar for Step 2 */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-slate-600 text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Details</span>
                    </button>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={handleGenerateDeliverables}
                        disabled={isGenerating}
                        className="text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Regenerate Deliverables</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md flex items-center gap-2 transition"
                      >
                        <span>Proceed to Step 3: Milestone Review</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Milestone Review (Calculated lead-time milestone tasks) */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Calculated Lead-Time Milestone Tasks ({proposedTasks.filter(t => t.approved && !t.rejected).length} Approved)</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Pre-calculated statutory deadlines and operational lead-times configured for {title || 'your programme'}.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {proposedTasks.map((task, idx) => {
                    const isIncluded = task.approved && !task.rejected;
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition flex items-start justify-between gap-3 ${
                          isIncluded
                            ? 'bg-white border-emerald-300 shadow-2xs'
                            : 'bg-slate-100 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 text-sm">{task.title}</div>
                          {task.notes && <div className="text-xs text-slate-500 leading-normal">{task.notes}</div>}
                          <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5 pt-0.5">
                            <Clock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Due: {formatSingaporeDateLong(task.dueDate || startDate)}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setProposedTasks(prev =>
                              prev.map((t, i) =>
                                i === idx ? { ...t, approved: !t.approved, rejected: t.approved } : t
                              )
                            );
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition ${
                            isIncluded
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isIncluded ? 'Included' : 'Excluded'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Navigation & Submit Bar for Step 3 */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-slate-600 text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Deliverables</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md flex items-center gap-2 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Create Programme &amp; Activate Plan</span>
                </button>
              </div>
            </div>
          )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer: the drafts to create (tap one to leave it out) and the main action */}
      {step === 1 && (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.12)]">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <span className="w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-700" />
              </span>
              <div>
                <div className="text-[15px] sm:text-[17px] font-bold text-emerald-800 whitespace-nowrap">{draftsLabel} will be created</div>
                {missingFields.length > 0 && (
                  <div className="text-[12px] text-slate-500 max-w-[11rem] sm:max-w-[15rem] truncate" title={`Add ${missingFields.join(', ')}`}>
                    Add {missingFields.join(', ')}
                  </div>
                )}
              </div>
            </div>
            <span className="hidden xl:block w-px h-10 bg-slate-200" aria-hidden="true" />
            <div className="hidden xl:flex flex-1 items-center justify-center 2xl:justify-between gap-1 min-w-0 2xl:pr-3" role="group" aria-label="Drafts to create">
              {DELIVERABLES.map(d => {
                const on = selectedDeliverables.includes(d.key);
                const Icon = d.icon;
                return (
                  <button
                    key={d.key}
                    type="button"
                    aria-pressed={on}
                    title={on ? `${d.shortLabel}: click to leave it out` : `${d.shortLabel}: click to include it`}
                    onClick={() => toggleDeliverable(d.key, !on)}
                    className={`flex items-center gap-1.5 p-2 2xl:px-1.5 rounded-lg text-left text-[13px] leading-tight transition hover:bg-slate-50 ${on ? 'text-slate-800' : 'text-slate-400'}`}
                  >
                    <Icon className={`w-[22px] h-[22px] shrink-0 ${on ? 'text-emerald-700' : 'text-slate-300'}`} strokeWidth={1.75} />
                    <span className={`hidden 2xl:block w-[4.75rem] ${on ? '' : 'line-through'}`}>{d.shortLabel}</span>
                    <span className="sr-only 2xl:hidden">{d.shortLabel}</span>
                  </button>
                );
              })}
            </div>
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleGenerateDeliverables}
                disabled={!canGenerate}
                className="h-12 px-4 sm:px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[16px] font-semibold flex items-center gap-2.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Sparkles className="w-5 h-5 hidden sm:block" />
                {isGenerating ? 'Generating...' : <><span className="sm:hidden">Generate</span><span className="hidden sm:inline">Generate {draftsLabel}</span></>}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
