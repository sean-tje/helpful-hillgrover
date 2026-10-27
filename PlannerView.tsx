import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Document, DocumentCategory } from '../types';
import {
  Sparkles,
  FileText,
  Download,
  CheckCircle2,
  ArrowRight,
  Edit3,
  Copy,
  Check,
  FolderPlus,
  Clock,
  Bus,
  MapPin,
  Utensils,
  Megaphone,
  HeartHandshake,
  ShieldCheck,
  HelpCircle,
  FileCheck,
  CheckSquare,
  Share2
} from 'lucide-react';
import { Task } from '../types';
import { formatSingaporeDateRange } from '../utils';

interface PlannerViewProps {
  onOpenProgramme: (id: string) => void;
}

interface ArtifactDefinition {
  key: string;
  title: string;
  leadTime: string;
  leadTimeBadgeColor: string;
  category: DocumentCategory;
  description: string;
  icon: any;
}

const ARTIFACT_DEFINITIONS: ArtifactDefinition[] = [
  {
    key: 'allStaffPreEventAnnouncement',
    title: 'All-Staff VCT Announcement (Pre-Event)',
    leadTime: '2 Weeks Lead Time',
    leadTimeBadgeColor: 'bg-cyan-100 text-cyan-900 font-bold',
    category: 'SOPs',
    description: '2 weeks lead time strictly enforced for all-staff notification on Virtual Contact Time (VCT) for early dismissal, student excuses, and duty rosters.',
    icon: Megaphone,
  },
  {
    key: 'parentsGatewayDraft',
    title: 'Parents\' Gateway (PG) Draft Letter',
    leadTime: '1 Month Lead Time',
    leadTimeBadgeColor: 'bg-rose-100 text-rose-800 font-bold',
    category: 'Parents Gateway Letters',
    description: '1 month lead time strictly enforced for parent acknowledgement and medical declarations via MOE PG portal.',
    icon: FileText,
  },
  {
    key: 'aorDraft',
    title: 'Approval of Requirements (AOR)',
    leadTime: '4-6 Weeks Lead Time',
    leadTimeBadgeColor: 'bg-purple-100 text-purple-800',
    category: 'Approved Templates',
    description: 'Formal financial and budget authorization submitted to Administration Manager and Vice-Principal.',
    icon: FileCheck,
  },
  {
    key: 'ramsDraft',
    title: 'RAMS Safety & Risk Assessment Matrix',
    leadTime: '1 Month Lead Time',
    leadTimeBadgeColor: 'bg-amber-100 text-amber-800 font-bold',
    category: 'RAMS',
    description: '1 month lead time for OM/VP safety review covering lightning, heat disorders, allergies, and emergency transport.',
    icon: ShieldCheck,
  },
  {
    key: 'studentBriefAndEmceeScript',
    title: 'Student Information Brief & Emcees\' Scripts',
    leadTime: '1-2 Weeks Lead Time',
    leadTimeBadgeColor: 'bg-indigo-100 text-indigo-800',
    category: 'SOPs',
    description: 'Student leader briefing slides, attire instructions, and formal emcee bilingual/formal script.',
    icon: FileText,
  },
  {
    key: 'busBookingDraft',
    title: 'Bus Booking Request',
    leadTime: '2 Weeks Lead Time',
    leadTimeBadgeColor: 'bg-teal-100 text-teal-800 font-bold',
    category: 'SOPs',
    description: '2 weeks lead time submitted to General Office with exact pickup bay, headcount, and return departure timing.',
    icon: Bus,
  },
  {
    key: 'venueBookingDraft',
    title: 'Venue Booking & School Facilities',
    leadTime: 'All the Time',
    leadTimeBadgeColor: 'bg-emerald-100 text-emerald-800 font-bold',
    category: 'SOPs',
    description: 'Compulsory for every single event in school (Hall, ISH, Classrooms, AV system, and Estates setup).',
    icon: MapPin,
  },
  {
    key: 'foodAndLogisticsDraft',
    title: 'Food & Refreshments Logistics',
    leadTime: '1-2 Weeks Lead Time',
    leadTimeBadgeColor: 'bg-orange-100 text-orange-800',
    category: 'SOPs',
    description: 'Halal/vegetarian packed meals, bento counts, tea breaks, dietary requirements, and disposal bags.',
    icon: Utensils,
  },
  {
    key: 'celebratorySocialMediaPost',
    title: 'Celebratory Social Media Post Draft',
    leadTime: 'Publicity & Social',
    leadTimeBadgeColor: 'bg-purple-100 text-purple-800 font-bold',
    category: 'SOPs',
    description: 'Instagram and Facebook celebratory post with photo carousel suggestions, student leader quotes, and school hashtags.',
    icon: Share2,
  },
  {
    key: 'allStaffPostEventGratitude',
    title: 'All-Staff VCT Gratitude Celebratory Post',
    leadTime: 'Post-Event Milestone',
    leadTimeBadgeColor: 'bg-pink-100 text-pink-800',
    category: 'SOPs',
    description: 'Appreciation notice recognizing Form Teachers, Operations staff, and student committee leaders on VCT.',
    icon: HeartHandshake,
  },
  {
    key: 'reflectionAndHandoverPrompts',
    title: 'Student Leadership VMV Reflections & Handover',
    leadTime: 'Post-Event Milestone',
    leadTimeBadgeColor: 'bg-cyan-100 text-cyan-800',
    category: 'VMV',
    description: 'Guided reflection: What worked well? What broke? What can we do next year?',
    icon: HelpCircle,
  },
];

export const PlannerView: React.FC<PlannerViewProps> = ({ onOpenProgramme }) => {
  const { currentUser, isChair } = useAuth();
  const { programmes, addDocument, approveProposedTasks } = useData();
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string>(programmes[0]?.id || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<string>('all');

  // Content map for all 10 artifacts
  const [artifactContents, setArtifactContents] = useState<Record<string, string>>({});
  const [hasGenerated, setHasGenerated] = useState<boolean>(false);
  const [hasInjectedTasks, setHasInjectedTasks] = useState<boolean>(false);

  // Status flags for feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [isExportingKey, setIsExportingKey] = useState<string | null>(null);

  const selectedProgramme = programmes.find(p => p.id === selectedProgrammeId);

  const handleInjectTenPointTasks = async () => {
    if (!selectedProgramme) return;
    
    // Calculate lead times relative to selectedProgramme.startDate
    const calculateOffsetDate = (daysOffset: number) => {
      try {
        const d = new Date(selectedProgramme.startDate);
        d.setDate(d.getDate() + daysOffset);
        return d.toISOString().split('T')[0];
      } catch {
        return selectedProgramme.startDate;
      }
    };

    const leadTimeTasks: Task[] = [
      {
        id: `tsk_gen_${Date.now()}_aor`,
        programmeId: selectedProgramme.id,
        title: `Approval of Requirements (AOR) Submission - ${selectedProgramme.title}`,
        notes: 'Submit official AOR document for administrative and budget clearance (4-6 weeks lead time).',
        ownerId: selectedProgramme.firstIcId,
        assignedTo: selectedProgramme.firstIcId,
        previousOwnerIds: [],
        dueDate: calculateOffsetDate(-35),
        status: 'Not Started',
        source: 'ai_suggested',
        createdAt: new Date().toISOString(),
        handovers: [],
      },
      {
        id: `tsk_gen_${Date.now()}_rams`,
        programmeId: selectedProgramme.id,
        title: `RAMS Safety Matrix Preparation & Endorsement - ${selectedProgramme.title}`,
        notes: 'Prepare Risk Assessment & Management System structure covering hazard controls and emergency evacuation. Requires teacher review (1 month lead time).',
        ownerId: selectedProgramme.firstIcId,
        assignedTo: selectedProgramme.firstIcId,
        previousOwnerIds: [],
        dueDate: calculateOffsetDate(-30),
        status: 'Not Started',
        source: 'ai_suggested',
        createdAt: new Date().toISOString(),
        handovers: [],
      },
      {
        id: `tsk_gen_${Date.now()}_pg`,
        programmeId: selectedProgramme.id,
        title: `Parents Gateway (PG) Draft Letter Finalization - ${selectedProgramme.title}`,
        notes: 'Finalize PG circular text and schedule broadcast on school portal (1 month lead time).',
        ownerId: selectedProgramme.firstIcId,
        assignedTo: selectedProgramme.firstIcId,
        previousOwnerIds: [],
        dueDate: calculateOffsetDate(-30),
        status: 'Not Started',
        source: 'ai_suggested',
        createdAt: new Date().toISOString(),
        handovers: [],
      },
      {
        id: `tsk_gen_${Date.now()}_venue`,
        programmeId: selectedProgramme.id,
        title: `Venue Booking via EduPage / General Office - ${selectedProgramme.title}`,
        notes: `Book required facilities (${selectedProgramme.venue}) and submit AV/air-con logistical requisition.`,
        ownerId: selectedProgramme.secondIcId || selectedProgramme.firstIcId,
        assignedTo: selectedProgramme.secondIcId || selectedProgramme.firstIcId,
        previousOwnerIds: [],
        dueDate: calculateOffsetDate(-21),
        status: 'Not Started',
        source: 'ai_suggested',
        createdAt: new Date().toISOString(),
        handovers: [],
      },
      {
        id: `tsk_gen_${Date.now()}_vct`,
        programmeId: selectedProgramme.id,
        title: `All-Staff VCT Notice Broadcast (Pre-Event) - ${selectedProgramme.title}`,
        notes: 'Draft and schedule all-staff information announcement on Virtual Contact Time (2 weeks lead time).',
        ownerId: selectedProgramme.firstIcId,
        assignedTo: selectedProgramme.firstIcId,
        previousOwnerIds: [],
        dueDate: calculateOffsetDate(-14),
        status: 'Not Started',
        source: 'ai_suggested',
        createdAt: new Date().toISOString(),
        handovers: [],
      },
      {
        id: `tsk_gen_${Date.now()}_bus`,
        programmeId: selectedProgramme.id,
        title: `Bus Booking FormSG Submission - ${selectedProgramme.title}`,
        notes: 'Submit official transport requisition on FormSG at least 2 weeks in advance for 40/45-seater coach booking.',
        ownerId: selectedProgramme.secondIcId || selectedProgramme.firstIcId,
        assignedTo: selectedProgramme.secondIcId || selectedProgramme.firstIcId,
        previousOwnerIds: [],
        dueDate: calculateOffsetDate(-14),
        status: 'Not Started',
        source: 'ai_suggested',
        createdAt: new Date().toISOString(),
        handovers: [],
      },
      {
        id: `tsk_gen_${Date.now()}_food`,
        programmeId: selectedProgramme.id,
        title: `Food, Drinks & Refreshment Logistics - ${selectedProgramme.title}`,
        notes: 'Procure bento/catering meals and ensure halal/vegetarian dietary requirements are accounted for.',
        ownerId: selectedProgramme.thirdIcId || selectedProgramme.secondIcId || selectedProgramme.firstIcId,
        assignedTo: selectedProgramme.thirdIcId || selectedProgramme.secondIcId || selectedProgramme.firstIcId,
        previousOwnerIds: [],
        dueDate: calculateOffsetDate(-10),
        status: 'Not Started',
        source: 'ai_suggested',
        createdAt: new Date().toISOString(),
        handovers: [],
      },
      {
        id: `tsk_gen_${Date.now()}_brief`,
        programmeId: selectedProgramme.id,
        title: `Student Information Brief & Emcees' Script Vetting - ${selectedProgramme.title}`,
        notes: 'Conduct rehearsal with student emcees and distribute cohort briefing slides / attire guidelines.',
        ownerId: selectedProgramme.secondIcId || selectedProgramme.firstIcId,
        assignedTo: selectedProgramme.secondIcId || selectedProgramme.firstIcId,
        previousOwnerIds: [],
        dueDate: calculateOffsetDate(-7),
        status: 'Not Started',
        source: 'ai_suggested',
        createdAt: new Date().toISOString(),
        handovers: [],
      },
      {
        id: `tsk_gen_${Date.now()}_gratitude`,
        programmeId: selectedProgramme.id,
        title: `All-Staff VCT Gratitude & Celebratory Post - ${selectedProgramme.title}`,
        notes: 'Post congratulatory photo collage and express appreciation to teaching & non-teaching staff on VCT.',
        ownerId: selectedProgramme.firstIcId,
        assignedTo: selectedProgramme.firstIcId,
        previousOwnerIds: [],
        dueDate: calculateOffsetDate(1),
        status: 'Not Started',
        source: 'ai_suggested',
        createdAt: new Date().toISOString(),
        handovers: [],
      },
      {
        id: `tsk_gen_${Date.now()}_reflection`,
        programmeId: selectedProgramme.id,
        title: `AAR & VMV Reflection Filing - ${selectedProgramme.title}`,
        notes: 'Conduct post-event debrief and file AAR: What worked well, what broke, and recommendations for next year.',
        ownerId: selectedProgramme.firstIcId,
        assignedTo: selectedProgramme.firstIcId,
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

  const handleGeneratePack = async () => {
    if (!selectedProgramme) return;
    setIsGenerating(true);

    try {
      const res = await fetch('/api/gemini/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programme: selectedProgramme,
          conditionalAnswers: selectedProgramme.conditionalAnswers,
        }),
      });
      const data = await res.json();
      
      const newContents: Record<string, string> = {
        allStaffPreEventAnnouncement: data.allStaffPreEventBlast || data.allStaffPreEventAnnouncement || data.allStaffNotification || '',
        parentsGatewayDraft: data.parentsGatewayConsentForm || data.parentsGatewayDraft || '',
        aorDraft: data.aorDraft || '',
        ramsDraft: data.ramsDocument || data.ramsDraft || '',
        studentBriefAndEmceeScript: data.studentInstructionBrief || data.studentBriefAndEmceeScript || '',
        busBookingDraft: data.busBookingDraft || '',
        venueBookingDraft: data.venueBookingDraft || '',
        foodAndLogisticsDraft: data.foodAndLogisticsDraft || '',
        celebratorySocialMediaPost: data.celebratorySocialMediaPost || '',
        allStaffPostEventGratitude: data.allStaffPartnerGratitudeBlast || data.allStaffPostEventGratitude || '',
        reflectionAndHandoverPrompts: data.studentVmvReflectionQuestions || data.reflectionAndHandoverPrompts || '',
      };

      setArtifactContents(newContents);
      setHasGenerated(true);
    } catch (err) {
      console.error('Planner error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContentChange = (key: string, val: string) => {
    setArtifactContents(prev => ({ ...prev, [key]: val }));
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveToRepository = (title: string, content: string, category: DocumentCategory, key: string) => {
    if (!selectedProgramme) return;

    const newDoc: Document = {
      id: `doc_gen_${Date.now()}_${key}`,
      title: `${selectedProgramme.title} - ${title}`,
      filePath: `/repository/${selectedProgramme.title.replace(/\s+/g, '_')}_${key}.docx`,
      fileType: 'docx',
      category: category,
      year: new Date().getFullYear(),
      programmeType: selectedProgramme.type,
      programmeId: selectedProgramme.id,
      status: isChair ? 'Approved' : 'Current',
      ownerId: currentUser.id,
      tags: [selectedProgramme.type.toLowerCase(), category.toLowerCase(), 'planning-pack', '2027'],
      templateFlag: isChair && category === 'Approved Templates',
      uploadedBy: currentUser.name,
      uploadedAt: new Date().toISOString(),
      indexingStatus: 'Searchable',
      fileSize: `${Math.max(120, Math.round(content.length / 10))} KB`,
      excerpt: content.slice(0, 300) + '...',
    };

    addDocument(newDoc);
    setSavedKey(key);
    setTimeout(() => setSavedKey(null), 3000);
  };

  const handleExportWord = async (title: string, content: string, key: string) => {
    setIsExportingKey(key);
    try {
      const response = await fetch('/api/export-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${selectedProgramme?.title || 'Hillgrove'} - ${title}`,
          content,
        }),
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(selectedProgramme?.title || 'Hillgrove').replace(/\s+/g, '_')}_${title.replace(/\s+/g, '_')}.docx`;
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

  const visibleArtifacts = activeTabKey === 'all'
    ? ARTIFACT_DEFINITIONS
    : ARTIFACT_DEFINITIONS.filter(a => a.key === activeTabKey);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-emerald-600" />
          <span>Hillgrove 10-Point Planning Pack</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Automated generation, in-app editing, and Word export for all 10 mandatory Hillgrove programme planning requirements.
        </p>
      </div>


      {/* Programme Selector Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Target Programme:</label>
            <select
              value={selectedProgrammeId}
              onChange={e => {
                setSelectedProgrammeId(e.target.value);
                setHasGenerated(false);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
            >
              {programmes.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.type} &bull; {p.status})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGeneratePack}
            disabled={isGenerating || !selectedProgramme}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 transition shadow-2xs disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating 10 Artifacts...' : 'Generate 10 Planning Artifacts'}</span>
          </button>
        </div>

        {selectedProgramme && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              🗓️ Event Dates: <strong>{formatSingaporeDateRange(selectedProgramme.startDate, selectedProgramme.endDate)}</strong> &bull; Venue: <strong>{selectedProgramme.venue}</strong> &bull; Cohort: <strong>{selectedProgramme.targetCohort}</strong>
            </div>
            <button
              onClick={() => onOpenProgramme(selectedProgramme.id)}
              className="text-emerald-600 font-semibold hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Go to Programme View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Artifact Jump Tabs */}
      {hasGenerated && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-xs font-medium">
          <button
            onClick={() => setActiveTabKey('all')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
              activeTabKey === 'all'
                ? 'bg-emerald-700 text-white font-bold'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            All 10 Artifacts
          </button>
          {ARTIFACT_DEFINITIONS.map(a => (
            <button
              key={a.key}
              onClick={() => setActiveTabKey(a.key)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition flex items-center gap-1.5 ${
                activeTabKey === a.key
                  ? 'bg-emerald-700 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{a.title.split('(')[0]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Artifact Editor Cards */}
      {hasGenerated ? (
        <div className="space-y-6">
          {/* 1-Click Task Injection Banner */}
          <div className="bg-emerald-50 border-2 border-emerald-500/40 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div>
              <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-700" />
                <span>1-Click Task Injection: Populate Action Items</span>
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                Automatically convert these 10 statutory milestones into assigned action items with calculated lead-time deadlines (e.g. 1 month, 2 weeks before).
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

          {visibleArtifacts.map(art => {
            const Icon = art.icon;
            const content = artifactContents[art.key] || '';

            return (
              <div
                key={art.key}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
              >
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Icon className="w-4 h-4 text-emerald-600 shrink-0" />
                      <h3 className="font-bold text-sm text-slate-900">{art.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded ${art.leadTimeBadgeColor}`}>
                        {art.leadTime}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{art.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopy(content, art.key)}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      {copiedKey === art.key ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === art.key ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      onClick={() => handleSaveToRepository(art.title, content, art.category, art.key)}
                      className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      {savedKey === art.key ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <FolderPlus className="w-3.5 h-3.5" />}
                      <span>{savedKey === art.key ? 'Saved to Repository' : 'Save to Repository'}</span>
                    </button>

                    <button
                      onClick={() => handleExportWord(art.title, content, art.key)}
                      disabled={isExportingKey === art.key}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isExportingKey === art.key ? 'Exporting...' : 'Export .docx'}</span>
                    </button>
                  </div>
                </div>

                {/* In-app Textarea */}
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>In-app live editable text:</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Live In-Place</span>
                    </span>
                  </div>
                  <textarea
                    value={content}
                    onChange={e => handleContentChange(art.key, e.target.value)}
                    rows={8}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs text-slate-800 leading-relaxed focus:bg-white focus:ring-2 focus:ring-emerald-500 transition resize-y"
                    placeholder={`Content for ${art.title}...`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400 text-xs space-y-2">
          <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="font-semibold text-slate-700 text-sm">No artifacts generated yet</p>
          <p>
            Click <strong>"Generate 10 Planning Artifacts"</strong> above to auto-generate Hillgrove VCT announcements, PG Draft, AOR, RAMS, Emcee scripts, bus/venue/food bookings, and VMV reflections.
          </p>
        </div>
      )}
    </div>
  );
};
