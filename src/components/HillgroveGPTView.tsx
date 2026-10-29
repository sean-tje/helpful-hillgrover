import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOptionalData } from '../context/DataContext';
import { Document } from '../types';
import {
  Sparkles,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Download,
  FolderPlus,
  Sliders,
  FileText,
  Globe,
  ChevronRight,
  Loader2,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';

export type OutputMode = 'official' | 'council' | 'website' | 'editing';

interface HillgroveGPTQualityCheck {
  factualClaimsSupported: boolean;
  channelVoiceClear: boolean;
  specificMomentsIncluded: boolean;
  meaningPrecedesValues: boolean;
  lengthMatchesMode: boolean;
  equalDignityPreserved: boolean;
  privacyProtected: boolean;
  noEmOrEnDashes: boolean;
  purposefulEmojisAndTags: boolean;
  closingAddsMeaningOrAction: boolean;
  wordCount: number;
  emojiCount: number;
  identityAnchorsUsed: string[];
}

interface HillgroveGPTResponse {
  isQuestionIntake: boolean;
  channel: string;
  caption: string;
  hashtags: string;
  suggestedVisualOrderOrAltText: string;
  checksNeeded: string[];
  intakeQuestions?: string[];
  qualityCheck: HillgroveGPTQualityCheck;
}

interface HillgroveGPTViewProps {
  initialProgrammeId?: string | null;
  onNavigateToProgramme?: (programmeId: string) => void;
}

const MODES: { id: OutputMode; label: string; sub: string; icon: React.ElementType }[] = [
  { id: 'official', label: 'Official School Social', sub: '100 to 150 words, 0 to 3 emojis', icon: Globe },
  { id: 'council', label: 'Student Council Social', sub: '100 to 150 words, 3 to 8 emojis', icon: Share2 },
  { id: 'website', label: 'Website Write-up', sub: '180 to 300 words, no hashtags', icon: FileText },
  { id: 'editing', label: 'Polish My Draft', sub: 'Keeps the facts, flags gaps', icon: Sliders },
];

const inputClass =
  'w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300';

export const HillgroveGPTView: React.FC<HillgroveGPTViewProps> = ({
  initialProgrammeId,
  onNavigateToProgramme,
}) => {
  const { currentUser, isChair } = useAuth();
  // Signed-out guests have no committee data: no programme loader or repository
  const data = useOptionalData();
  const isGuest = !data;
  const programmes = data?.programmes ?? [];

  // Mode and inputs
  const [selectedMode, setSelectedMode] = useState<OutputMode>('official');
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string>(initialProgrammeId || '');
  const [rawPrompt, setRawPrompt] = useState<string>('');

  const [answers, setAnswers] = useState({
    eventName: '',
    eventDate: '',
    eventPurpose: '',
    moments: '',
    learning: '',
    namesAndPrivacy: '',
    cta: '',
  });
  const setAnswer = (key: keyof typeof answers, value: string) => setAnswers(prev => ({ ...prev, [key]: value }));

  // Generation state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HillgroveGPTResponse | null>(null);
  const [editableCaption, setEditableCaption] = useState<string>('');
  const [editableHashtags, setEditableHashtags] = useState<string>('');

  // The post opens in a pop-up over the fields once drafted
  const [showPost, setShowPost] = useState(false);
  const [savedToRepo, setSavedToRepo] = useState<boolean>(false);
  const [isExportingWord, setIsExportingWord] = useState<boolean>(false);

  // Load programme data when selected
  const handleSelectProgramme = (id: string) => {
    setSelectedProgrammeId(id);
    if (!id) return;
    const prg = programmes.find(p => p.id === id);
    if (prg) {
      setAnswers(prev => ({
        ...prev,
        eventName: prg.title,
        eventDate: `${prg.startDate} to ${prg.endDate}`,
        eventPurpose: prg.objectives || prg.description,
        moments: `${prg.venue ? `Conducted at ${prg.venue}. ` : ''}Active participation in leadership drills and cohort collaboration.`,
        learning: 'Cultivated adaptability, teamwork, and care for peers.',
      }));
      setRawPrompt(`Generate copy for our school programme: ${prg.title} (${prg.type}) held at ${prg.venue} from ${prg.startDate} to ${prg.endDate}.`);
    }
  };

  // Opened from a programme: start from its details
  useEffect(() => {
    if (initialProgrammeId) handleSelectProgramme(initialProgrammeId);
  }, [initialProgrammeId]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setSavedToRepo(false);
    setError(null);

    const selectedPrg = programmes.find(p => p.id === selectedProgrammeId);

    try {
      const response = await fetch('/api/gemini/hillgrove-gpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: selectedMode,
          prompt: rawPrompt,
          answers,
          // Always draft, marking anything unconfirmed as [please confirm]
          isUrgent: true,
          programmeContext: selectedPrg ? {
            title: selectedPrg.title,
            startDate: selectedPrg.startDate,
            endDate: selectedPrg.endDate,
            venue: selectedPrg.venue,
            objectives: selectedPrg.objectives,
            description: selectedPrg.description,
          } : undefined,
        }),
      });
      if (!response.ok) throw new Error('Could not draft the post. Please try again.');

      const draft: HillgroveGPTResponse = await response.json();
      setResult(draft);
      setEditableCaption(draft.caption || '');
      setEditableHashtags(draft.hashtags || '');
      setShowPost(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Close the pop-up with Escape, and stop the page behind it from scrolling
  useEffect(() => {
    if (!showPost) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShowPost(false);
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [showPost]);

  // Punctuation sanitizer (eliminate em/en dashes)
  const handleSanitizePunctuation = () => {
    setEditableCaption(
      editableCaption
        .replace(/\s*[—–]\s*/g, ', ')
        .replace(/[—–]/g, ', ')
        .replace(/,\s*,+/g, ',')
        .replace(/,\s*\./g, '.')
    );
  };

  const handleSaveToRepository = () => {
    if (!editableCaption) return;
    const title = answers.eventName || (result ? result.channel : 'Hillgrove Social Media Post');
    const newDoc: Document = {
      id: `doc_social_${Date.now()}`,
      title: `Publicity: ${title}`,
      filePath: `/repository/publicity_${Date.now()}.docx`,
      fileType: 'docx',
      category: 'Publicity & Social',
      year: 2026,
      programmeType: 'General',
      programmeId: selectedProgrammeId || undefined,
      status: isChair ? 'Approved' : 'Current',
      ownerId: currentUser.id,
      tags: ['publicity', 'social-media', selectedMode, 'hillgrove-gpt'],
      templateFlag: false,
      uploadedBy: currentUser.name,
      uploadedAt: new Date().toISOString(),
      indexingStatus: 'Searchable',
      fileSize: '45 KB',
      excerpt: editableCaption.slice(0, 280) + '...',
    };
    data?.addDocument(newDoc);
    setSavedToRepo(true);
    setTimeout(() => setSavedToRepo(false), 4000);
  };

  const handleExportWord = async () => {
    if (!editableCaption) return;
    setIsExportingWord(true);
    try {
      const docTitle = answers.eventName ? `Hillgrove Social Copy - ${answers.eventName}` : `HillgroveGPT - ${result?.channel || 'Social Post'}`;
      const fullDocText = `CHANNEL: ${result?.channel || 'Official School Social'}\n\nCAPTION:\n${editableCaption}\n\nHASHTAGS:\n${editableHashtags}\n\nSUGGESTED VISUAL ORDER / ALT TEXT:\n${result?.suggestedVisualOrderOrAltText || 'None'}\n\nCHECKS NEEDED & SAFEGUARDING:\n${result?.checksNeeded?.join('\n') || 'All checks passed. Dignity and privacy preserved.'}`;

      const res = await fetch('/api/export-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: docTitle,
          content: fullDocText,
        }),
      });
      if (!res.ok) throw new Error('Could not create the Word document.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExportingWord(false);
    }
  };

  const hasEmOrEnDashes = /[—–]/.test(editableCaption);
  const wordCount = editableCaption.trim().split(/\s+/).filter(Boolean).length;
  const emojiMatches = editableCaption.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu);
  const emojiCount = emojiMatches ? emojiMatches.length : 0;
  const wordTarget = selectedMode === 'website' ? [180, 300] : [100, 150];
  const accountName = selectedMode === 'council' ? 'hillgrove_studentcouncil' : 'hillgrovesec';
  const canDraft = (rawPrompt.trim() || answers.eventName.trim()).length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Hillgrove Official Communication Suite</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Social Media Writer</h1>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Show what Hillgrovians did, why it mattered and how they grew. Fill in the details and draft it with AI. The post opens over this page: edit it there, then download the Word document.
        </p>
      </div>

      {/* Post details */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Post details</h2>
          {!isGuest && (
            <select
              value={selectedProgrammeId}
              onChange={e => handleSelectProgramme(e.target.value)}
              aria-label="Load details from a programme"
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 max-w-[220px]"
            >
              <option value="">Load from a programme</option>
              {programmes.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {MODES.map(({ id, label, sub, icon: Icon }) => {
            const isSelected = selectedMode === id;
            return (
              <button
                key={id}
                onClick={() => setSelectedMode(id)}
                className={`p-3 rounded-xl border text-left transition ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`} />
                  {label}
                </span>
                <span className="block text-[11px] text-slate-500 mt-1">{sub}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {([
            ['eventName', 'Event name', 'e.g. Secondary 1 Orientation Camp'],
            ['eventDate', 'Event date', 'e.g. 8 January 2027'],
            ['moments', 'Two to four specific moments', 'e.g. Tent pitching, obstacle course, campfire cheer'],
            ['learning', 'What students learned or showed', 'e.g. Supported one another through the course'],
            ['namesAndPrivacy', 'Names and photo clearance', 'e.g. Group photos only, no student names'],
            ['cta', 'Call to action or hashtag', 'e.g. #UnitedWeSoar'],
          ] as const).map(([key, label, placeholder]) => (
            <label key={key} className="space-y-1">
              <span className="block font-semibold text-slate-700">{label}</span>
              <input
                value={answers[key]}
                onChange={e => setAnswer(key, e.target.value)}
                placeholder={placeholder}
                className={inputClass}
              />
            </label>
          ))}

        </div>
      </div>

      {/* Notes & drafting */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        <div className="md:col-span-10 space-y-2">
          <label htmlFor="social-notes" className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            Event notes or your draft
          </label>
          <textarea
            id="social-notes"
            value={rawPrompt}
            onChange={e => setRawPrompt(e.target.value)}
            rows={3}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            placeholder="e.g. 60 prefects received their badges from the Principal at the Investiture on 24 July. Highlights: the pledge and the procession. Focus on leadership and service."
          />
        </div>

        <div className="md:col-span-2 flex flex-col gap-2 md:pt-6">
          <button
            onClick={() => handleGenerate()}
            disabled={isLoading || !canDraft}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isLoading ? 'Drafting...' : 'Draft with AI'}</span>
          </button>
        </div>
      </div>

      {error && !showPost && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* The drafted post, in a pop-up over the fields */}
      {showPost && result && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Drafted post"
        >
          <div className="max-w-[640px] mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
            <div className="sticky top-2 z-10 bg-white rounded-xl border border-slate-200 shadow-md px-3 py-2 flex items-center justify-between gap-2">
              <button
                onClick={() => setShowPost(false)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Go back</span>
              </button>
              <div className="flex items-center gap-2">
                {!isGuest && (
                  <button
                    onClick={handleSaveToRepository}
                    disabled={savedToRepo}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    {savedToRepo ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <FolderPlus className="w-4 h-4 text-emerald-600" />}
                    <span>{savedToRepo ? 'Saved to Repo!' : 'Save to Repo'}</span>
                  </button>
                )}
                <button
                  onClick={handleExportWord}
                  disabled={isExportingWord}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                >
                  {isExportingWord ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>{isExportingWord ? 'Creating Word file...' : 'Download Word (.docx)'}</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="bg-slate-100 rounded-2xl p-3 sm:p-5 space-y-3">
              {/* Checks before publishing */}
              {result.checksNeeded && result.checksNeeded.length > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Check before publishing</span>
                  </div>
                  <ul className="space-y-1 text-xs text-amber-900 pl-4 list-disc">
                    {result.checksNeeded.map((chk, i) => (
                      <li key={i}>{chk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {hasEmOrEnDashes && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2 text-xs text-rose-800">
                  <span>Dashes (— or –) found. Hillgrove style does not use them.</span>
                  <button
                    onClick={handleSanitizePunctuation}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[11px] shrink-0"
                  >
                    Remove dashes
                  </button>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
                <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-200" />
                <span>
                  Highlighted text can be edited. {wordCount} words (target {wordTarget[0]} to {wordTarget[1]}), {emojiCount} emojis.
                </span>
              </div>

              {/* Post mock-up: a social post, or a web page for the website write-up */}
              <div className="bg-white border border-slate-300 rounded-2xl shadow-lg overflow-hidden mx-auto w-full max-w-md">
                {selectedMode === 'website' ? (
                  <div className="p-5 space-y-3">
                    <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">hillgrovesec.moe.edu.sg</div>
                    <div className="text-base font-bold text-slate-900">{answers.eventName || result.channel}</div>
                    <AutoTextarea value={editableCaption} onChange={setEditableCaption} ariaLabel="Write-up" />
                  </div>
                ) : (
                  <>
                    <div className="p-3 border-b border-slate-100 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-linear-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-[10px]">
                        HSS
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 leading-none">{accountName}</div>
                        <div className="text-[10px] text-slate-500">Hillgrove Secondary School</div>
                      </div>
                    </div>

                    <div className="aspect-4/3 bg-linear-to-br from-slate-800 to-emerald-950 flex flex-col items-center justify-center p-6 text-center text-white space-y-2">
                      <Sparkles className="w-7 h-7 text-amber-300" />
                      <div className="text-xs font-bold text-emerald-200">{answers.eventName || 'Hillgrove Secondary School'}</div>
                      <div className="text-[11px] text-slate-300 max-w-xs italic line-clamp-4">
                        {result.suggestedVisualOrderOrAltText || 'Photo: students taking part in the programme.'}
                      </div>
                    </div>

                    <div className="p-3 space-y-2 text-xs">
                      <div className="font-bold text-slate-900">{accountName}</div>
                      <AutoTextarea value={editableCaption} onChange={setEditableCaption} ariaLabel="Caption" />
                      <AutoTextarea
                        value={editableHashtags}
                        onChange={v => setEditableHashtags(v.replace(/\n/g, ' '))}
                        ariaLabel="Hashtags"
                        className="text-blue-600 font-medium"
                      />
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Just now • Singapore</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {selectedProgrammeId && onNavigateToProgramme && (
              <button
                onClick={() => onNavigateToProgramme(selectedProgrammeId)}
                className="mx-auto px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
              >
                <span>Return to Programme</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Editable text drawn inside the mock-up, highlighted like the PG letter's fields
const editableFieldClass =
  'bg-amber-50 hover:bg-amber-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-sm transition-colors';

const AutoTextarea: React.FC<{
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}> = ({ value, onChange, ariaLabel, className = 'text-slate-800' }) => {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label={ariaLabel}
      className={`${editableFieldClass} block w-full resize-none overflow-hidden px-1 py-0.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${className}`}
    />
  );
};
