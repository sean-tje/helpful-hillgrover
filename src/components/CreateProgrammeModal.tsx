import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ProgrammeType, ConditionalAnswers, Programme, Task, Document } from '../types';
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
  Share2,
  HelpCircle,
  Clock,
  Calendar,
  MapPin,
  Users,
  HeartHandshake
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

import { formatSingaporeDate, formatSingaporeDateLong } from '../utils';
import { FlightDateRangePicker } from './FlightDateRangePicker';

const getTodayIsoDate = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TIME_OPTIONS = [
  { value: '06:30', label: '06:30 (6:30 AM)' },
  { value: '07:00', label: '07:00 (7:00 AM - Reporting)' },
  { value: '07:15', label: '07:15 (7:15 AM)' },
  { value: '07:25', label: '07:25 (7:25 AM - Morning Assembly)' },
  { value: '07:30', label: '07:30 (7:30 AM)' },
  { value: '07:45', label: '07:45 (7:45 AM)' },
  { value: '08:00', label: '08:00 (8:00 AM)' },
  { value: '08:30', label: '08:30 (8:30 AM)' },
  { value: '09:00', label: '09:00 (9:00 AM)' },
  { value: '09:30', label: '09:30 (9:30 AM)' },
  { value: '10:00', label: '10:00 (10:00 AM)' },
  { value: '10:30', label: '10:30 (10:30 AM)' },
  { value: '11:00', label: '11:00 (11:00 AM)' },
  { value: '11:30', label: '11:30 (11:30 AM)' },
  { value: '12:00', label: '12:00 (12:00 PM)' },
  { value: '12:40', label: '12:40 (12:40 PM - Early Dismissal)' },
  { value: '13:00', label: '13:00 (1:00 PM)' },
  { value: '13:30', label: '13:30 (1:30 PM)' },
  { value: '14:00', label: '14:00 (2:00 PM)' },
  { value: '14:30', label: '14:30 (2:30 PM)' },
  { value: '15:00', label: '15:00 (3:00 PM)' },
  { value: '15:30', label: '15:30 (3:30 PM)' },
  { value: '16:00', label: '16:00 (4:00 PM)' },
  { value: '16:30', label: '16:30 (4:30 PM)' },
  { value: '17:00', label: '17:00 (5:00 PM - General Dismissal)' },
  { value: '17:30', label: '17:30 (5:30 PM)' },
  { value: '18:00', label: '18:00 (6:00 PM)' },
  { value: '18:30', label: '18:30 (6:30 PM - Camp Dinner)' },
  { value: '19:00', label: '19:00 (7:00 PM)' },
  { value: '19:30', label: '19:30 (7:30 PM - Night Activity)' },
  { value: '20:00', label: '20:00 (8:00 PM)' },
  { value: '20:30', label: '20:30 (8:30 PM)' },
  { value: '21:00', label: '21:00 (9:00 PM)' },
  { value: '21:30', label: '21:30 (9:30 PM)' },
  { value: '22:00', label: '22:00 (10:00 PM - Camp Lights Out)' },
  { value: '22:30', label: '22:30 (10:30 PM)' },
];

interface DeliverableDefinition {
  key: DeliverableKey;
  label: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ElementType;
  wordFilename: string;
}

const DELIVERABLES: DeliverableDefinition[] = [
  {
    key: 'studentInstructionBrief',
    label: '1. Student Instruction Brief & Packing List',
    icon: FileText,
    wordFilename: 'Student_Instruction_Brief_and_Packing_List',
  },
  {
    key: 'parentsGatewayConsentForm',
    label: "2. Parents' Gateway Consent Form Draft",
    badge: '1 Month Lead Time • Word Doc',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    icon: FileText,
    wordFilename: 'Parents_Gateway_Consent_Form',
  },
  {
    key: 'allStaffPreEventBlast',
    label: '3. Informative All-Staff Email Blast (Pre-Event)',
    badge: 'Staff Broadcast (VCT)',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    icon: Megaphone,
    wordFilename: 'All_Staff_Pre_Event_Announcement',
  },
  {
    key: 'allStaffPartnerGratitudeBlast',
    label: '4. All-Staff Email Blast: Partner Gratitude & Writer Appreciation',
    badge: 'Gratitude & Appreciation',
    badgeColor: 'bg-pink-100 text-pink-800 border-pink-200',
    icon: HeartHandshake,
    wordFilename: 'All_Staff_Partner_Gratitude_and_Writer_Appreciation',
  },
  {
    key: 'celebratorySocialMediaPost',
    label: '5. Celebratory Social Media Post Draft',
    badge: 'Publicity & Social',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Share2,
    wordFilename: 'Celebratory_Social_Media_Post_Draft',
  },
  {
    key: 'studentVmvReflectionQuestions',
    label: '6. Student Reflections (Hillgrove VMV)',
    badge: 'Vision • Mission • Values',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: HelpCircle,
    wordFilename: 'Student_Reflection_Questions_VMV',
  },
  {
    key: 'ramsDocument',
    label: '7. Risk Assessment Management System (RAMS)',
    badge: '1 Month Lead Time • Word Doc',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: ShieldCheck,
    wordFilename: 'RAMS_Safety_Risk_Assessment',
  },
];

export const CreateProgrammeModal: React.FC<CreateProgrammeModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { currentUser, allowlistedUsers } = useAuth();
  const { addProgramme, addDocument } = useData();

  // 3-Step workflow: 1. Programme Details -> 2. 7 Generated Deliverables -> 3. Milestone Review
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Combined Form State
  const [title, setTitle] = useState('');
  const [programmeType, setProgrammeType] = useState<ProgrammeType>('Camp');
  const [startDate, setStartDate] = useState(getTodayIsoDate);
  const [endDate, setEndDate] = useState(getTodayIsoDate);
  const [startTime, setStartTime] = useState('07:30');
  const [endTime, setEndTime] = useState('17:00');
  const [venue, setVenue] = useState('');
  const [firstIcId, setFirstIcId] = useState<string>(currentUser.id);
  const [secondIcId, setSecondIcId] = useState<string>('');
  const [supportingTeacherIds, setSupportingTeacherIds] = useState<string[]>(['usr_eric']);
  const [participantCount, setParticipantCount] = useState<number>(60);
  const [teacherNotes, setTeacherNotes] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');

  // Quick logistical checkboxes
  const [conditionalAnswers, setConditionalAnswers] = useState<ConditionalAnswers>({
    isTransportRequired: true,
    isOffSite: true,
    isOutsideNormalHours: true,
    involvesPhysicalActivities: true,
    involvesParentsOrGuardians: true,
    areMealsRequired: true,
    areExternalVendorsInvolved: true,
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

  const [activeDeliverableKey, setActiveDeliverableKey] = useState<DeliverableKey>('studentInstructionBrief');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isExportingKey, setIsExportingKey] = useState<string | null>(null);

  // Proposed Tasks State
  const [proposedTasks, setProposedTasks] = useState<Array<Partial<Task> & { approved: boolean; rejected: boolean }>>([]);

  if (!isOpen) return null;

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
            firstIcId,
            firstIcName: allowlistedUsers.find(u => u.id === firstIcId)?.name,
            secondIcId: secondIcId || undefined,
            supportingTeacherIds,
            participantCount,
          },
          conditionalAnswers,
          teacherNotes: [additionalDetails, teacherNotes].filter(Boolean).join('\n\n'),
        }),
      });

      const data = await res.json();

      setGeneratedDeliverables({
        studentInstructionBrief: data.studentInstructionBrief || data.studentInfoBriefAndScript || '',
        parentsGatewayConsentForm: data.parentsGatewayConsentForm || data.parentsGatewayDraft || '',
        allStaffPreEventBlast: data.allStaffPreEventBlast || data.allStaffAnnouncementVCT || '',
        allStaffPartnerGratitudeBlast: data.allStaffPartnerGratitudeBlast || data.allStaffGratitudePostVCT || '',
        celebratorySocialMediaPost: data.celebratorySocialMediaPost || '',
        studentVmvReflectionQuestions: data.studentVmvReflectionQuestions || data.studentVmvReflection || '',
        ramsDocument: data.ramsDocument || data.ramsDraft || '',
      });

      const tasks = (data.proposedTasks || []).map((pt: any, idx: number) => ({
        id: `tsk_prop_${Date.now()}_${idx}`,
        programmeId: '',
        title: pt.title,
        notes: pt.notes || pt.leadTimeLabel || '',
        ownerId: firstIcId,
        previousOwnerIds: [],
        dueDate: pt.dueDate || startDate,
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

  // Export any deliverable as Word document (.docx)
  const handleExportWord = async (key: DeliverableKey, titleLabel: string) => {
    const content = generatedDeliverables[key];
    if (!content) return;

    setIsExportingKey(key);
    try {
      const response = await fetch('/api/export-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${title || 'Hillgrove'} - ${titleLabel}`,
          content,
        }),
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(title || 'Hillgrove').replace(/\s+/g, '_')}_${key}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Word export failed:', err);
    } finally {
      setIsExportingKey(null);
    }
  };

  // Copy to clipboard
  const handleCopy = (key: DeliverableKey) => {
    const text = generatedDeliverables[key];
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
      status: 'Planning',
      term: 'Term 3',
      firstIcId,
      secondIcId: secondIcId || undefined,
      supportingTeacherIds,
      conditionalAnswers,
      createdBy: currentUser.id,
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

    DELIVERABLES.forEach(deliv => {
      const content = generatedDeliverables[deliv.key];
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

  const activeDeliverable = DELIVERABLES.find(d => d.key === activeDeliverableKey) || DELIVERABLES[0];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-4">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Hillgrove Programme Planner</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mt-0.5">
              {step === 1 ? 'New Programme: Details & Staffing' : step === 2 ? 'Step 2: 7 Generated Deliverables' : 'Step 3: Milestone Review'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl font-bold p-1 leading-none"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* 3-Step Indicator */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-600 flex items-center gap-2 sm:gap-3 overflow-x-auto">
          <span className={`flex items-center gap-1.5 shrink-0 ${step === 1 ? 'font-bold text-emerald-700' : 'text-slate-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-emerald-700 text-white font-bold' : 'bg-slate-200 text-slate-700'}`}>1</span>
            <span>1. Programme Details</span>
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className={`flex items-center gap-1.5 shrink-0 ${step === 2 ? 'font-bold text-emerald-700' : 'text-slate-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-emerald-700 text-white font-bold' : 'bg-slate-200 text-slate-700'}`}>2</span>
            <span>2. 7 Generated Deliverables</span>
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className={`flex items-center gap-1.5 shrink-0 ${step === 3 ? 'font-bold text-emerald-700' : 'text-slate-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? 'bg-emerald-700 text-white font-bold' : 'bg-slate-200 text-slate-700'}`}>3</span>
            <span>3. Milestone Review</span>
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: Combined Basic Details, Dates, Time, Venue, and Staff-in-charge */}
          {step === 1 && (
            <div className="space-y-6">
              {/* 1. Working Title */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Working Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. 2027 Annual Student Leadership Camp (Cohort Leaders)"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                />
              </div>

              {/* 2. Programme Type & Estimated Attendance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Programme Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={programmeType}
                    onChange={e => setProgrammeType(e.target.value as ProgrammeType)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="Camp">Camp (Outdoor / Leadership Camp)</option>
                    <option value="Investiture">Investiture</option>
                    <option value="Exchange">Exchange (Peer Cross-Learning)</option>
                    <option value="Training">Training (Workshops & Mentoring)</option>
                    <option value="School Event">School Event (Assembly / Community Action)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Estimated Student Participants
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={participantCount}
                    onChange={e => setParticipantCount(parseInt(e.target.value) || 60)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 3. Dates & Times */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Programme Dates (Flight-Style Selection) <span className="text-rose-500">*</span>
                  </label>
                  <FlightDateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(newStart, newEnd) => {
                      setStartDate(newStart);
                      setEndDate(newEnd);
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Start Time</span>
                    </label>
                    <select
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                    >
                      {TIME_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>End Time</span>
                    </label>
                    <select
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                    >
                      {TIME_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Venue */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Venue
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={venue}
                    onChange={e => setVenue(e.target.value)}
                    placeholder="e.g. Hillgrove Secondary School"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* 5. Staff-in-charge (First IC, Second IC, Supporting Teachers) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-700" />
                    <span>Staff-in-Charge Assignment</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">Equal editing &amp; administrative rights</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      1st Teacher IC <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={firstIcId}
                      onChange={e => setFirstIcId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    >
                      {allowlistedUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      2nd Teacher IC
                    </label>
                    <select
                      value={secondIcId}
                      onChange={e => setSecondIcId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    >
                      <option value="">Not Applicable</option>
                      {allowlistedUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Supporting Teachers
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allowlistedUsers
                      .filter(u => u.id !== firstIcId && (!secondIcId || u.id !== secondIcId))
                      .map(u => {
                        const isSelected = supportingTeacherIds.includes(u.id);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSupportingTeacherIds(prev => prev.filter(id => id !== u.id));
                              } else {
                                setSupportingTeacherIds(prev => [...prev, u.id]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                              isSelected
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-400 font-semibold shadow-2xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {u.name}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* 6. Additional Programme Details & Requirements Box */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Additional Programme Details &amp; Requirements
                </label>
                <textarea
                  rows={4}
                  value={additionalDetails}
                  onChange={e => setAdditionalDetails(e.target.value)}
                  placeholder={`Attire: (e.g. Full School Uniform / PE Attire / CCA T-shirt / Half-Uniform with school pants)
Special items needed: (e.g. Water bottle, stationery, poncho, insect repellent, personal medication)
Key details of programme: (e.g. Experiential leadership trail, team challenge stations, cohort debrief)
Key learning objectives: (e.g. Foster resilience, collaborative problem-solving, and autonomous learning)`}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-400 placeholder:text-xs leading-relaxed bg-white font-normal"
                />
              </div>

              {/* 7. Logistical Checkpoints (Comes last after additional programme details) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Logistical Checkpoints (Auto-triggers RAMS &amp; FormSG lead-times)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <label className="flex items-center space-x-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={conditionalAnswers.isOffSite}
                      onChange={e => setConditionalAnswers(prev => ({ ...prev, isOffSite: e.target.checked }))}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Off-Site Venue</span>
                  </label>

                  <label className="flex items-center space-x-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={conditionalAnswers.isTransportRequired}
                      onChange={e => setConditionalAnswers(prev => ({ ...prev, isTransportRequired: e.target.checked }))}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Bus Booking Required</span>
                  </label>

                  <label className="flex items-center space-x-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={conditionalAnswers.areMealsRequired}
                      onChange={e => setConditionalAnswers(prev => ({ ...prev, areMealsRequired: e.target.checked }))}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Catering (Halal) Required</span>
                  </label>

                  <label className="flex items-center space-x-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={conditionalAnswers.areExternalVendorsInvolved}
                      onChange={e => setConditionalAnswers(prev => ({ ...prev, areExternalVendorsInvolved: e.target.checked }))}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>External Partners Involved</span>
                  </label>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-600 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleGenerateDeliverables}
                  disabled={!title.trim() || isGenerating}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-sm font-semibold flex items-center space-x-2 shadow-md disabled:opacity-50 transition"
                >
                  <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>{isGenerating ? 'Generating 7 Deliverables...' : 'Generate 7 Planning Deliverables'}</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Review, Edit & Export the 7 Generated Deliverables */}
          {step === 2 && (
            <div className="space-y-6">
              {isGenerating ? (
                <div className="py-16 text-center text-slate-500 text-sm space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
                  <div className="font-bold text-slate-800 text-base">Generating Hillgrove 7-Point Planning Deliverables...</div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Drafting student instruction brief with packing list, Parents' Gateway circular, staff email blasts, celebratory social media copy, VMV reflections, and RAMS safety matrix.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Deliverables Navigation Selector */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 p-1.5 bg-slate-100 rounded-xl text-xs">
                    {DELIVERABLES.map((deliv, idx) => {
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

                    {/* Live In-App Editor */}
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
      </div>
    </div>
  );
};
