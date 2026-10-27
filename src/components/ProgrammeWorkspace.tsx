import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Programme, Task, Document, GeneratedDocument } from '../types';
import { formatSingaporeDateRange, formatSingaporeDate, formatSingaporeDateLong } from '../utils';
import {
  FolderKanban,
  FileText,
  CheckSquare,
  Archive,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Send,
  Download,
  Plus,
  Clock,
  Copy,
  Check,
  FolderPlus,
  Bus,
  MapPin,
  Utensils,
  Megaphone,
  HeartHandshake,
  ShieldCheck,
  Edit3,
  Share2
} from 'lucide-react';
import { BusBookingModal } from './BusBookingModal';
import { ArchiveValidationModal } from './ArchiveValidationModal';

interface ProgrammeWorkspaceProps {
  programmeId: string;
  onBack: () => void;
  onNavigateToTab?: (tab: string) => void;
  onOpenHillgroveGPT?: (programmeId: string) => void;
  onOpenConsentForm?: (programmeId: string) => void;
}

export const ProgrammeWorkspace: React.FC<ProgrammeWorkspaceProps> = ({
  programmeId,
  onBack,
  onOpenHillgroveGPT,
  onOpenConsentForm,
}) => {
  const { currentUser, allowlistedUsers, isChair, canEditProgramme } = useAuth();
  const { programmes, tasks, documents, updateProgramme, updateTaskStatus, handoverTask, addDocument, archiveProgramme, approveProposedTasks } = useData();

  const programme = programmes.find(p => p.id === programmeId);

  const [activeTab, setActiveTab] = useState<'Overview' | 'Planner' | 'Documents' | 'Tasks'>('Overview');

  // Bus booking modal state
  const [showBusBooking, setShowBusBooking] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // Handover modal state
  const [selectedTaskForHandover, setSelectedTaskForHandover] = useState<Task | null>(null);
  const [handoverToUserId, setHandoverToUserId] = useState<string>('');
  const [handoverNote, setHandoverNote] = useState<string>('');

  // AI Planner generation state
  const [isGeneratingPack, setIsGeneratingPack] = useState(false);
  const [generatedPack, setGeneratedPack] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [isExportingKey, setIsExportingKey] = useState<string | null>(null);
  const [hasInjectedTasks, setHasInjectedTasks] = useState(false);

  const cleanContentText = (text: string) => (text || '').replace(/\*/g, '');

  const handleCopyArtifact = (text: string, key: string) => {
    navigator.clipboard.writeText(cleanContentText(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveArtifactToRepo = (title: string, content: string, category: any, key: string) => {
    if (!programme) return;
    const sanitized = cleanContentText(content);
    const newDoc: Document = {
      id: `doc_gen_${Date.now()}_${key}`,
      title: `${programme.title} - ${title}`,
      filePath: `/repository/${programme.title.replace(/\s+/g, '_')}_${key}.docx`,
      fileType: 'docx',
      category: category,
      year: 2027,
      programmeType: programme.type,
      programmeId: programme.id,
      status: isChair ? 'Approved' : 'Current',
      ownerId: currentUser.id,
      tags: [programme.type.toLowerCase(), category.toLowerCase(), 'planning-pack', '2027'],
      templateFlag: isChair && category === 'Approved Templates',
      uploadedBy: currentUser.name,
      uploadedAt: new Date().toISOString(),
      indexingStatus: 'Searchable',
      fileSize: `${Math.max(120, Math.round(sanitized.length / 10))} KB`,
      excerpt: sanitized.slice(0, 300) + '...',
    };
    addDocument(newDoc);
    setSavedKey(key);
    setTimeout(() => setSavedKey(null), 3000);
  };

  const handleExportWordArtifact = async (title: string, content: string, key: string) => {
    setIsExportingKey(key);
    try {
      const sanitized = cleanContentText(content);
      const isLetter = key === 'parentsGatewayConsentForm' || key.toLowerCase().includes('parents');
      const response = await fetch('/api/export-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${programme?.title || 'Hillgrove'} - ${title}`,
          content: sanitized,
          isLetter,
        }),
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(programme?.title || 'Hillgrove').replace(/\s+/g, '_')}_${title.replace(/\s+/g, '_')}.docx`;
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

  if (!programme) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <p className="text-slate-500 text-sm">Programme not found.</p>
        <button onClick={onBack} className="mt-4 text-emerald-600 font-semibold underline text-sm">
          Return to Programmes
        </button>
      </div>
    );
  }

  const isEditable = canEditProgramme(programme.firstIcId, programme.secondIcId) && programme.status !== 'Archived';
  const firstIc = allowlistedUsers.find(u => u.id === programme.firstIcId);
  const secondIc = allowlistedUsers.find(u => u.id === programme.secondIcId);

  const prgTasks = tasks.filter(t => t.programmeId === programme.id);
  const completedTasksCount = prgTasks.filter(t => t.status === 'Completed').length;

  const prgDocs = documents.filter(d => d.programmeId === programme.id || d.tags.includes(programme.type.toLowerCase()));
  const approvedDocsCount = prgDocs.filter(d => d.status === 'Approved' || d.status === 'Current').length;

  const handleGenerateFullPack = async () => {
    setIsGeneratingPack(true);
    try {
      const res = await fetch('/api/gemini/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programme,
          conditionalAnswers: programme.conditionalAnswers,
        }),
      });
      const data = await res.json();
      setGeneratedPack(data);
    } catch (err) {
      console.error('Generation error:', err);
    } finally {
      setIsGeneratingPack(false);
    }
  };

  const handleHandoverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForHandover || !handoverToUserId) return;
    const toUser = allowlistedUsers.find(u => u.id === handoverToUserId);
    handoverTask(selectedTaskForHandover.id, handoverToUserId, handoverNote, currentUser.id, toUser?.name || 'Teacher');
    setSelectedTaskForHandover(null);
    setHandoverNote('');
  };

  const handleInjectTenPointTasks = async () => {
    if (!programme) return;
    
    // Calculate lead times relative to programme.startDate
    const calculateOffsetDate = (daysOffset: number) => {
      try {
        const d = new Date(programme.startDate);
        d.setDate(d.getDate() + daysOffset);
        return d.toISOString().split('T')[0];
      } catch {
        return programme.startDate;
      }
    };

    const leadTimeTasks: Task[] = [
      {
        id: `tsk_gen_${Date.now()}_aor`,
        programmeId: programme.id,
        title: `Approval of Requirements (AOR) Submission - ${programme.title}`,
        notes: 'Submit official AOR document for administrative and budget clearance (4-6 weeks lead time).',
        ownerId: programme.firstIcId,
        assignedTo: programme.firstIcId,
        previousOwnerIds: [],
        dueDate: calculateOffsetDate(-35),
        status: 'Not Started',
        source: 'ai_suggested',
        createdAt: new Date().toISOString(),
        handovers: [],
      },
      {
        id: `tsk_gen_${Date.now()}_rams`,
        programmeId: programme.id,
        title: `RAMS Safety Matrix Preparation & Endorsement - ${programme.title}`,
        notes: 'Prepare Risk Assessment & Management System structure covering hazard controls and emergency evacuation. Requires teacher review (1 month lead time).',
        ownerId: programme.firstIcId,
        assignedTo: programme.firstIcId,
        previousOwnerIds: [],
        dueDate: calculateOffsetDate(-30),
        status: 'Not Started',
        source: 'ai_suggested',
        createdAt: new Date().toISOString(),
        handovers: [],
      },
      {
        id: `tsk_gen_${Date.now()}_pg`,
        programmeId: programme.id,
        title: `Parents Gateway (PG) Draft Letter Finalization - ${programme.title}`,
        notes: 'Finalize PG circular text and schedule broadcast on school portal (1 month lead time).',
        ownerId: programme.firstIcId,
        assignedTo: programme.firstIcId,
        previousOwnerIds: [],
        dueDate: calculateOffsetDate(-30),
        status: 'Not Started',
        source: 'ai_suggested',
        createdAt: new Date().toISOString(),
        handovers: [],
      },
      {
        id: `tsk_gen_${Date.now()}_venue`,
        programmeId: programme.id,
        title: `Venue Booking via EduPage / General Office - ${programme.title}`,
        notes: `Book required facilities (${programme.venue}) and submit AV/air-con logistical requisition.`,
        ownerId: programme.secondIcId || programme.firstIcId,
        assignedTo: programme.secondIcId || programme.firstIcId,
        previousOwnerIds: [],
        dueDate: calculateOffsetDate(-21),
        status: 'Not Started',
        source: 'ai_suggested',
        createdAt: new Date().toISOString(),
        handovers: [],
      },
      {
        id: `tsk_gen_${Date.now()}_vct`,
        programmeId: programme.id,
        title: `All-Staff VCT Notice Broadcast (Pre-Event) - ${programme.title}`,
        notes: 'Draft and schedule all-staff information announcement on Virtual Contact Time (2 weeks lead time).',
        ownerId: programme.firstIcId,
        assignedTo: programme.firstIcId,
        previousOwnerIds: [],
        dueDate: calculateOffsetDate(-14),
        status: 'Not Started',
        source: 'ai_suggested',
        createdAt: new Date().toISOString(),
        handovers: [],
      },
      {
        id: `tsk_gen_${Date.now()}_bus`,
        programmeId: programme.id,
        title: `Bus Booking FormSG Submission - ${programme.title}`,
        notes: 'Submit official transport requisition on FormSG at least 2 weeks in advance for 40/45-seater coach booking.',
        ownerId: programme.secondIcId || programme.firstIcId,
        assignedTo: programme.secondIcId || programme.firstIcId,
        previousOwnerIds: [],
        dueDate: calculateOffsetDate(-14),
        status: 'Not Started',
        source: 'ai_suggested',
        createdAt: new Date().toISOString(),
        handovers: [],
      },
      {
        id: `tsk_gen_${Date.now()}_food`,
        programmeId: programme.id,
        title: `Food, Drinks & Refreshment Logistics - ${programme.title}`,
        notes: 'Procure bento/catering meals and ensure halal/vegetarian dietary requirements are accounted for.',
        ownerId: programme.thirdIcId || programme.secondIcId || programme.firstIcId,
        assignedTo: programme.thirdIcId || programme.secondIcId || programme.firstIcId,
        previousOwnerIds: [],
        dueDate: calculateOffsetDate(-10),
        status: 'Not Started',
        source: 'ai_suggested',
        createdAt: new Date().toISOString(),
        handovers: [],
      },
      {
        id: `tsk_gen_${Date.now()}_brief`,
        programmeId: programme.id,
        title: `Student Information Brief & Emcees' Script Vetting - ${programme.title}`,
        notes: 'Conduct rehearsal with student emcees and distribute cohort briefing slides / attire guidelines.',
        ownerId: programme.secondIcId || programme.firstIcId,
        assignedTo: programme.secondIcId || programme.firstIcId,
        previousOwnerIds: [],
        dueDate: calculateOffsetDate(-7),
        status: 'Not Started',
        source: 'ai_suggested',
        createdAt: new Date().toISOString(),
        handovers: [],
      },
      {
        id: `tsk_gen_${Date.now()}_gratitude`,
        programmeId: programme.id,
        title: `All-Staff VCT Gratitude & Celebratory Post - ${programme.title}`,
        notes: 'Post congratulatory photo collage and express appreciation to teaching & non-teaching staff on VCT.',
        ownerId: programme.firstIcId,
        assignedTo: programme.firstIcId,
        previousOwnerIds: [],
        dueDate: calculateOffsetDate(1),
        status: 'Not Started',
        source: 'ai_suggested',
        createdAt: new Date().toISOString(),
        handovers: [],
      },
      {
        id: `tsk_gen_${Date.now()}_reflection`,
        programmeId: programme.id,
        title: `AAR & VMV Reflection Filing - ${programme.title}`,
        notes: 'Conduct post-event debrief and file AAR: What worked well, what broke, and recommendations for next year.',
        ownerId: programme.firstIcId,
        assignedTo: programme.firstIcId,
        previousOwnerIds: [],
        dueDate: calculateOffsetDate(5),
        status: 'Not Started',
        source: 'ai_suggested',
        createdAt: new Date().toISOString(),
        handovers: [],
      },
    ];

    await approveProposedTasks(leadTimeTasks, currentUser.id);
    setHasInjectedTasks(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back Button & Header */}
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Programmes</span>
        </button>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded ${
                programme.status === 'Archived' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {programme.status}
              </span>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
                {programme.term || 'Term 1'}
              </span>
              {programme.isAllHands && (
                <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2.5 py-1 rounded">
                  All-Hands On Deck
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-slate-900">{programme.title}</h1>
            <p className="text-xs text-slate-600">
              🗓️ {formatSingaporeDateRange(programme.startDate, programme.endDate)} &bull; 📍 {programme.venue}
            </p>

            <div className="text-xs text-slate-500 pt-1 flex flex-wrap gap-4">
              <span>First IC: <strong className="text-slate-800">{firstIc?.name || 'Unassigned'}</strong></span>
              {secondIc && <span>Second IC: <strong className="text-slate-800">{secondIc.name}</strong></span>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onOpenConsentForm && (
              <button
                onClick={() => onOpenConsentForm(programme.id)}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3.5 py-2 rounded-xl text-xs font-semibold transition border border-emerald-300 flex items-center gap-1.5 shadow-2xs"
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Consent Form Generator</span>
              </button>
            )}

            {onOpenHillgroveGPT && (
              <button
                onClick={() => onOpenHillgroveGPT(programme.id)}
                className="bg-purple-50 hover:bg-purple-100 text-purple-800 px-3.5 py-2 rounded-xl text-xs font-semibold transition border border-purple-300 flex items-center gap-1.5 shadow-2xs"
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>HillgroveGPT Social</span>
              </button>
            )}

            {programme.conditionalAnswers?.isTransportRequired && (
              <button
                onClick={() => setShowBusBooking(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold transition border border-slate-300 flex items-center gap-1.5"
              >
                <span>🚌</span>
                <span>Bus Booking Form</span>
              </button>
            )}

            {isChair && programme.status !== 'Archived' && (
              <button
                onClick={() => setShowArchiveModal(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 rounded-xl text-xs font-semibold transition border border-slate-300 flex items-center gap-1.5"
              >
                <Archive className="w-4 h-4 text-slate-600" />
                <span>Archive Readiness Check</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex space-x-4">
        {(['Overview', 'Planner', 'Documents', 'Tasks'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              activeTab === tab
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-base text-slate-900">Programme Objectives</h3>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                <p className="text-slate-700 leading-relaxed">{programme.objectives || 'Develop confident student leaders grounded in Hillgrove values.'}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-base text-slate-900">Honest Progress Counts</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-slate-900">
                  <div className="text-2xl font-bold text-emerald-700">{completedTasksCount} / {prgTasks.length}</div>
                  <div className="text-xs font-semibold text-emerald-900 mt-1">Tasks Completed</div>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-slate-900">
                  <div className="text-2xl font-bold text-blue-700">{approvedDocsCount} / 4</div>
                  <div className="text-xs font-semibold text-blue-900 mt-1">Required Documents Approved</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <h3 className="font-bold text-sm text-slate-900">Conditional Logistics Summary</h3>
              <div className="space-y-2 divide-y divide-slate-100">
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span>🚌</span>
                    <span>School Bus Transport:</span>
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${programme.conditionalAnswers?.isTransportRequired ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                    {programme.conditionalAnswers?.isTransportRequired ? 'Required' : 'No'}
                  </span>
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span>📍</span>
                    <span>Off-Site Venue:</span>
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${programme.conditionalAnswers?.isOffSite ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                    {programme.conditionalAnswers?.isOffSite ? 'Yes (External)' : 'On Campus'}
                  </span>
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span>🏃</span>
                    <span>Physical Activities:</span>
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${programme.conditionalAnswers?.involvesPhysicalActivities ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'}`}>
                    {programme.conditionalAnswers?.involvesPhysicalActivities ? 'Yes (RAMS Alert)' : 'Low Intensity'}
                  </span>
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span>✉️</span>
                    <span>Parents Gateway Notice:</span>
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${programme.conditionalAnswers?.involvesParentsOrGuardians ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                    {programme.conditionalAnswers?.involvesParentsOrGuardians ? 'Required' : 'Internal Only'}
                  </span>
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <span>🛡️</span>
                    <span>Safety / RAMS Filing:</span>
                  </span>
                  <span className="font-bold px-2 py-0.5 rounded text-[11px] bg-emerald-100 text-emerald-800">
                    Standard MOE SOP
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Planner' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span>Hillgrove 10-Point Planning Pack</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generates all 10 mandatory Hillgrove planning artifacts with statutory lead times, in-place live editing, and Word export.
              </p>
            </div>

            <button
              onClick={handleGenerateFullPack}
              disabled={isGeneratingPack}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs disabled:opacity-50 shrink-0"
            >
              <Sparkles className={`w-4 h-4 ${isGeneratingPack ? 'animate-spin' : ''}`} />
              <span>{isGeneratingPack ? 'Generating 10 Artifacts...' : 'Generate 10 Planning Artifacts'}</span>
            </button>
          </div>

          {generatedPack ? (
            <div className="space-y-6 text-xs">
              {/* 1-Click Task Injection Banner */}
              <div className="bg-emerald-50 border-2 border-emerald-500/40 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-700" />
                    <span>1-Click Task Injection: Populate Action Items</span>
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Automatically convert these 10 planning milestones into assigned action items with calculated lead-time deadlines (e.g. 1 month, 2 weeks before).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleInjectTenPointTasks}
                  disabled={hasInjectedTasks}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 shadow-xs ${
                    hasInjectedTasks
                      ? 'bg-emerald-200 text-emerald-900 cursor-not-allowed border border-emerald-300'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{hasInjectedTasks ? '10 Tasks Injected into Action Items!' : 'Inject 10 Tasks into Action Items'}</span>
                </button>
              </div>

              {[
                {
                  key: 'studentInstructionBrief',
                  title: '1. Student Instruction Brief & Packing List',
                  lead: '',
                  leadColor: '',
                  cat: 'Student Instructions',
                  icon: FileText,
                  content: generatedPack.studentInstructionBrief || generatedPack.studentBriefAndEmceeScript || generatedPack.studentInfoBriefAndScript || ''
                },
                {
                  key: 'parentsGatewayConsentForm',
                  title: "2. Parents' Gateway (PG) Consent Form Draft",
                  lead: '1 Month Lead Time • Word Doc',
                  leadColor: 'bg-rose-100 text-rose-800 font-bold',
                  cat: 'Parents Gateway Letters',
                  icon: FileText,
                  content: generatedPack.parentsGatewayConsentForm || generatedPack.parentsGatewayDraft || ''
                },
                {
                  key: 'allStaffPreEventBlast',
                  title: '3. Informative All-Staff Email Blast (Pre-Event)',
                  lead: '2 Weeks Lead Time (VCT)',
                  leadColor: 'bg-cyan-100 text-cyan-900 font-bold',
                  cat: 'SOPs',
                  icon: Megaphone,
                  content: generatedPack.allStaffPreEventBlast || generatedPack.allStaffPreEventAnnouncement || generatedPack.allStaffAnnouncementVCT || ''
                },
                {
                  key: 'allStaffPartnerGratitudeBlast',
                  title: '4. All-Staff Email Blast: Partner Gratitude & Writer Appreciation',
                  lead: 'Post-Event Milestone',
                  leadColor: 'bg-pink-100 text-pink-800 font-bold',
                  cat: 'SOPs',
                  icon: HeartHandshake,
                  content: generatedPack.allStaffPartnerGratitudeBlast || generatedPack.allStaffPostEventGratitude || generatedPack.allStaffGratitudePostVCT || ''
                },
                {
                  key: 'celebratorySocialMediaPost',
                  title: '5. Celebratory Social Media Post Draft',
                  lead: 'Publicity & Social',
                  leadColor: 'bg-purple-100 text-purple-800 font-bold',
                  cat: 'SOPs',
                  icon: Share2,
                  content: generatedPack.celebratorySocialMediaPost || ''
                },
                {
                  key: 'studentVmvReflectionQuestions',
                  title: '6. Student Reflection Questions (Hillgrove VMV)',
                  lead: 'Vision • Mission • Values',
                  leadColor: 'bg-emerald-100 text-emerald-800 font-bold',
                  cat: 'VMV',
                  icon: CheckCircle2,
                  content: generatedPack.studentVmvReflectionQuestions || generatedPack.reflectionAndHandoverPrompts || generatedPack.studentVmvReflection || ''
                },
                {
                  key: 'ramsDocument',
                  title: '7. Risk Assessment Management System (RAMS)',
                  lead: '1 Month Lead Time • Word Doc',
                  leadColor: 'bg-amber-100 text-amber-800 font-bold',
                  cat: 'RAMS',
                  icon: ShieldCheck,
                  content: generatedPack.ramsDocument || generatedPack.ramsDraft || ''
                },
                {
                  key: 'aorDraft',
                  title: '8. Approval of Requirements (AOR)',
                  lead: '4-6 Weeks Lead Time',
                  leadColor: 'bg-purple-100 text-purple-800',
                  cat: 'Approved Templates',
                  icon: FileText,
                  content: generatedPack.aorDraft || generatedPack.aorApproval || ''
                },
                {
                  key: 'busBookingDraft',
                  title: '9. Bus Transport Procurement & Booking Request',
                  lead: '2 Weeks Lead Time',
                  leadColor: 'bg-teal-100 text-teal-800 font-bold',
                  cat: 'SOPs',
                  icon: Bus,
                  content: generatedPack.busBookingDraft || generatedPack.busBooking || ''
                },
                {
                  key: 'venueBookingDraft',
                  title: '10. Venue Booking & School Facilities Reservation',
                  lead: 'All the Time',
                  leadColor: 'bg-emerald-100 text-emerald-800 font-bold',
                  cat: 'SOPs',
                  icon: MapPin,
                  content: generatedPack.venueBookingDraft || generatedPack.venueBooking || ''
                },
              ].map(art => {
                const Icon = art.icon;
                return (
                  <div key={art.key} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <Icon className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold text-slate-900 text-sm">{art.title}</span>
                        {art.lead ? (
                          <span className={`text-[10px] px-2 py-0.5 rounded ${art.leadColor}`}>
                            {art.lead}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center space-x-2">
                        {art.key === 'parentsGatewayConsentForm' && onOpenConsentForm && (
                          <button
                            type="button"
                            onClick={() => onOpenConsentForm(programme.id)}
                            className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded text-xs font-semibold flex items-center gap-1 shadow-2xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Open in Consent Form Generator</span>
                          </button>
                        )}

                        {art.key === 'celebratorySocialMediaPost' && onOpenHillgroveGPT && (
                          <button
                            type="button"
                            onClick={() => onOpenHillgroveGPT(programme.id)}
                            className="px-2.5 py-1 bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700 rounded text-xs font-semibold flex items-center gap-1 shadow-2xs"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                            <span>Refine in HillgroveGPT</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCopyArtifact(art.content, art.key)}
                          className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold flex items-center gap-1"
                        >
                          {copiedKey === art.key ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === art.key ? 'Copied' : 'Copy'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSaveArtifactToRepo(art.title, art.content, art.cat, art.key)}
                          className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded text-xs font-semibold flex items-center gap-1"
                        >
                          {savedKey === art.key ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <FolderPlus className="w-3.5 h-3.5" />}
                          <span>{savedKey === art.key ? 'Saved' : 'Save to Repo'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExportWordArtifact(art.title, art.content, art.key)}
                          disabled={isExportingKey === art.key}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{isExportingKey === art.key ? 'Exporting...' : 'Word'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-4">
                      <textarea
                        rows={7}
                        value={art.content}
                        onChange={e => {
                          setGeneratedPack({ ...generatedPack, [art.key]: e.target.value });
                        }}
                        className="w-full p-3 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 resize-y"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Click <strong>"Generate 10 Planning Artifacts"</strong> to populate VCT announcements, PG Draft, AOR, RAMS, student briefs, bus/venue/food bookings, and post-event reflections.
            </div>
          )}
        </div>
      )}

      {activeTab === 'Tasks' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">Programme Tasks</h3>
            <span className="text-xs text-slate-500 font-medium">{prgTasks.length} task(s) total</span>
          </div>

          <div className="space-y-3">
            {prgTasks.map(t => {
              const isCompleted = t.status === 'Completed';
              return (
                <div
                  key={t.id}
                  className={`p-4 rounded-xl border transition flex items-center justify-between gap-4 text-xs ${
                    isCompleted ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className={`font-bold text-sm ${isCompleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {t.title}
                      </div>
                      {isCompleted && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Done
                        </span>
                      )}
                    </div>
                    <div className="text-slate-600">{t.notes}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-1">
                      <span>Due: <strong>{formatSingaporeDateLong(t.dueDate)}</strong></span>
                      <span>Status: <strong className={isCompleted ? 'text-emerald-700' : 'text-slate-800'}>{t.status}</strong></span>
                      {isCompleted && t.completedAt && (
                        <span className="text-slate-400">Completed on {formatSingaporeDate(t.completedAt)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {isCompleted ? (
                      <button
                        type="button"
                        onClick={() => updateTaskStatus(t.id, 'In Progress', currentUser.id)}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Click to reopen / mark as incomplete"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Completed ✓</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => updateTaskStatus(t.id, 'Completed', currentUser.id)}
                        className="bg-emerald-600 text-white px-3.5 py-1.5 rounded-lg font-semibold hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        title="Mark task completed"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Done</span>
                      </button>
                    )}

                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => setSelectedTaskForHandover(t)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Request Input</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Handover Modal */}
      {selectedTaskForHandover && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">Task Handover Request</h3>
            <p className="text-xs text-slate-600">
              Transfer task ownership while preserving handover history.
            </p>

            <form onSubmit={handleHandoverSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Transfer Ownership To:</label>
                <select
                  value={handoverToUserId}
                  onChange={e => setHandoverToUserId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  required
                >
                  <option value="">Select teacher...</option>
                  {allowlistedUsers.filter(u => u.id !== currentUser.id).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Handover Note / Context:</label>
                <textarea
                  value={handoverNote}
                  onChange={e => setHandoverNote(e.target.value)}
                  placeholder="e.g. My part is complete - request input. Please confirm bus booking timing."
                  className="w-full p-2 border border-slate-300 rounded-lg h-20"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForHandover(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700"
                >
                  Confirm Handover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bus Booking Modal */}
      <BusBookingModal
        isOpen={showBusBooking}
        onClose={() => setShowBusBooking(false)}
        programmeTitle={programme.title}
        startDate={programme.startDate}
        startTime={programme.startTime}
        endTime={programme.endTime}
        venue={programme.venue}
      />

      {/* Archive Validation Modal */}
      <ArchiveValidationModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        programmeId={programme.id}
      />
    </div>
  );
};
