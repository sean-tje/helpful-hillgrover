import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Document, DocumentCategory, DocumentStatus } from '../types';
import {
  BookOpen,
  Search,
  Upload,
  Download,
  FileText,
  Tag,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  Plus,
  Trash2,
  FileUp,
  Edit3,
  Save,
  Copy,
  Check,
  CheckSquare
} from 'lucide-react';

export const AVAILABLE_REPOSITORY_TAGS = [
  'RAMS',
  'Parents Gateway',
  'AOR Approval',
  'VCT Announcement',
  'Student Brief',
  'Emcees Script',
  'Bus Booking',
  'Venue Booking',
  'Food & Logistics',
  'VMV Reflection',
  'Sec 1 Orientation',
  'Sec 2 Camp',
  'Investiture',
  'Safety & Medical',
  'Approved Template',
];

export const RepositoryView: React.FC = () => {
  const { currentUser, isChair } = useAuth();
  const { documents, programmes, addDocument, updateDocument } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [eventFilter, setEventFilter] = useState<string>('All');

  // AI RAG state
  const [isSearching, setIsSearching] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<any[]>([]);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentCategory>('RAMS');
  const [docProgrammeId, setDocProgrammeId] = useState<string>('');
  const [docYear, setDocYear] = useState(2026);
  const [uploadSelectedTags, setUploadSelectedTags] = useState<string[]>(['RAMS', 'Safety & Medical']);
  const [docTemplateFlag, setDocTemplateFlag] = useState(false);
  const [docContent, setDocContent] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadTab, setUploadTab] = useState<'file' | 'text'>('file');

  // In-App Document Editor Modal state
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<DocumentCategory>('RAMS');
  const [editProgrammeId, setEditProgrammeId] = useState<string>('');
  const [editStatus, setEditStatus] = useState<DocumentStatus>('Current');
  const [editSelectedTags, setEditSelectedTags] = useState<string[]>([]);
  const [editExcerpt, setEditExcerpt] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const toggleUploadTag = (tag: string) => {
    if (uploadSelectedTags.includes(tag)) {
      setUploadSelectedTags(uploadSelectedTags.filter(t => t !== tag));
    } else {
      setUploadSelectedTags([...uploadSelectedTags, tag]);
    }
  };

  const toggleEditTag = (tag: string) => {
    if (editSelectedTags.includes(tag)) {
      setEditSelectedTags(editSelectedTags.filter(t => t !== tag));
    } else {
      setEditSelectedTags([...editSelectedTags, tag]);
    }
  };

  const filteredDocs = documents.filter(d => {
    if (categoryFilter !== 'All' && d.category !== categoryFilter) return false;
    if (statusFilter !== 'All' && d.status !== statusFilter) return false;
    if (eventFilter !== 'All') {
      if (d.programmeId) {
        if (d.programmeId !== eventFilter) return false;
      } else {
        const prg = programmes.find(p => p.id === eventFilter);
        if (!prg || !d.title.toLowerCase().includes(prg.title.toLowerCase().split(' ')[0])) {
          return false;
        }
      }
    }
    if (searchQuery.trim() && !aiAnswer) {
      const q = searchQuery.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        d.tags.some(t => t.toLowerCase().includes(q)) ||
        d.category.toLowerCase().includes(q) ||
        d.excerpt.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setAiAnswer(null);
    setCitations([]);

    try {
      const res = await fetch('/api/gemini/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          categoryFilter,
          statusFilter,
        }),
      });
      const data = await res.json();
      setAiAnswer(data.answer);
      setCitations(data.citations || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileProcess = (file: File) => {
    setUploadedFile(file);
    if (!docTitle.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setDocTitle(cleanName);
    }
    if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setDocContent(event.target.result as string);
        }
      };
      reader.readAsText(file);
    } else {
      if (!docContent.trim()) {
        setDocContent(`Hillgrove Precedent Document: ${file.name} (${(file.size / 1024).toFixed(1)} KB). Standard operating guidelines and safety protocols.`);
      }
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;

    let detectedFileType: Document['fileType'] = 'docx';
    let sizeStr = `${Math.max(120, Math.round((docContent.length || 500) / 10))} KB`;

    if (uploadedFile) {
      const ext = uploadedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') detectedFileType = 'pdf';
      else if (ext === 'pptx' || ext === 'ppt') detectedFileType = 'pptx';
      else if (ext === 'xlsx' || ext === 'xls') detectedFileType = 'xlsx';
      else detectedFileType = 'docx';

      if (uploadedFile.size > 1024 * 1024) {
        sizeStr = `${(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB`;
      } else {
        sizeStr = `${Math.round(uploadedFile.size / 1024)} KB`;
      }
    }

    const selectedProg = programmes.find(p => p.id === docProgrammeId);

    const newDoc: Document = {
      id: `doc_${Date.now()}`,
      title: docTitle,
      filePath: `/repository/${(uploadedFile ? uploadedFile.name : docTitle.replace(/\s+/g, '_') + '.' + detectedFileType)}`,
      fileType: detectedFileType,
      category: docCategory,
      year: docYear,
      programmeType: selectedProg ? selectedProg.type : 'General',
      programmeId: docProgrammeId || undefined,
      status: docTemplateFlag ? 'Approved' : 'Current',
      ownerId: currentUser.id,
      tags: uploadSelectedTags.length > 0 ? uploadSelectedTags : ['general', 'precedent'],
      templateFlag: docTemplateFlag,
      uploadedBy: currentUser.name,
      uploadedAt: new Date().toISOString(),
      indexingStatus: 'Searchable',
      fileSize: sizeStr,
      excerpt: docContent.trim() || `Uploaded Hillgrove precedent document: ${docTitle}. Standard operating guidelines and safety protocols.`,
    };

    addDocument(newDoc);
    setShowUploadModal(false);
    setDocTitle('');
    setDocContent('');
    setUploadedFile(null);
    setUploadSelectedTags(['RAMS', 'Safety & Medical']);
  };

  const handleOpenEditor = (docItem: Document) => {
    setEditingDoc(docItem);
    setEditTitle(docItem.title);
    setEditCategory(docItem.category);
    setEditProgrammeId(docItem.programmeId || '');
    setEditStatus(docItem.status);
    setEditSelectedTags(docItem.tags || []);
    setEditExcerpt(docItem.excerpt);
    setCopied(false);
    setSavedSuccess(false);
  };

  const handleSaveEditor = async () => {
    if (!editingDoc) return;

    await updateDocument(
      editingDoc.id,
      {
        title: editTitle,
        category: editCategory,
        programmeId: editProgrammeId || undefined,
        status: editStatus,
        tags: editSelectedTags,
        excerpt: editExcerpt,
      },
      currentUser.id
    );

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleCopyDoc = () => {
    if (!editExcerpt) return;
    navigator.clipboard.writeText(editExcerpt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportDocx = async (title: string, text: string) => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: text || 'Hillgrove Secondary School Document Precedent',
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const getFileBadge = (type: string) => {
    switch (type) {
      case 'pdf':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.5 rounded">PDF</span>;
      case 'xlsx':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">XLSX</span>;
      case 'pptx':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">PPTX</span>;
      default:
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded">DOCX</span>;
    }
  };

  const getProgrammeTitle = (doc: Document) => {
    if (doc.programmeId) {
      const p = programmes.find(prg => prg.id === doc.programmeId);
      if (p) return p.title;
    }
    for (const prg of programmes) {
      const firstWord = prg.title.split(' ')[0].toLowerCase();
      if (firstWord.length > 3 && doc.title.toLowerCase().includes(firstWord)) {
        return prg.title;
      }
    }
    return 'All Programmes / General SOP';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-700" />
            <span>Precedent Repository & Institutional Memory</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Curated Hillgrove precedent documents, SOPs, and approved school templates with list view and structured tag checkboxes.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow-2xs flex items-center justify-center space-x-2"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder='Search repository documents or ask a question (e.g. "What did we include in previous camp RAMS?")'
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 text-slate-900"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition"
          >
            {isSearching ? 'Searching...' : 'Search Index'}
          </button>
        </form>

        {/* AI Answer & Grounded Citations */}
        {aiAnswer && (
          <div className="p-5 bg-emerald-50/50 rounded-xl border border-emerald-200 text-slate-900 space-y-3">
            <div className="font-bold text-sm text-emerald-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Grounded Repository Answer</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-800">{aiAnswer}</p>

            {citations.length > 0 && (
              <div className="pt-2">
                <div className="text-xs font-bold text-slate-700 mb-2">Citations & Sources:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {citations.map((c, i) => (
                    <div key={i} className="p-3 bg-white rounded-lg border border-slate-200 text-xs shadow-2xs space-y-1">
                      <div className="font-bold text-slate-900">{c.title} ({c.status})</div>
                      <p className="text-slate-600 italic">"{c.excerpt}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Bar with Event Names, Categories, and Status */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Event Names Filter */}
          <div>
            <span className="font-semibold text-slate-700 mr-1.5">Event Name:</span>
            <select
              value={eventFilter}
              onChange={e => setEventFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium max-w-[200px]"
            >
              <option value="All">All Events & Programmes</option>
              {programmes.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <span className="font-semibold text-slate-700 mr-1.5">Category:</span>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium"
            >
              <option value="All">All Categories</option>
              <option value="Approved Templates">Approved Templates</option>
              <option value="RAMS">RAMS</option>
              <option value="Parents Gateway Letters">Parents Gateway Letters</option>
              <option value="SOPs">SOPs</option>
              <option value="VMV">VMV</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <span className="font-semibold text-slate-700 mr-1.5">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Current">Current</option>
              <option value="Historical">Historical</option>
              <option value="Superseded">Superseded</option>
            </select>
          </div>
        </div>

        <div className="text-slate-500 font-medium">
          Showing <strong>{filteredDocs.length}</strong> document(s)
        </div>
      </div>

      {/* DOCUMENT LIST VIEW WITH HEADERS: EVENT NAMES, CATEGORIES, TAGS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-3 px-6 py-3.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
          <div className="col-span-12 md:col-span-4">Event Names / Document Title</div>
          <div className="col-span-12 md:col-span-3">Event Name</div>
          <div className="col-span-6 md:col-span-2">Categories</div>
          <div className="col-span-6 md:col-span-2">Tags</div>
          <div className="col-span-12 md:col-span-1 text-right">Actions</div>
        </div>

        {/* List Rows */}
        {filteredDocs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs space-y-2">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700 text-sm">No documents found</p>
            <p>Try clearing filters or search queries.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {filteredDocs.map(doc => {
              const eventName = getProgrammeTitle(doc);
              return (
                <div
                  key={doc.id}
                  className="grid grid-cols-12 gap-3 px-6 py-4 items-center hover:bg-slate-50/80 transition"
                >
                  {/* Col 1: Document Title & File Details */}
                  <div className="col-span-12 md:col-span-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-slate-900 text-sm truncate">{doc.title}</span>
                      {getFileBadge(doc.fileType)}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">
                      {doc.excerpt}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {doc.fileSize} &bull; Year: {doc.year}
                    </div>
                  </div>

                  {/* Col 2: Event Name */}
                  <div className="col-span-12 md:col-span-3">
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <span className="text-emerald-700">📌</span>
                      <span className="truncate">{eventName}</span>
                    </div>
                  </div>

                  {/* Col 3: Category & Status */}
                  <div className="col-span-6 md:col-span-2 space-y-1">
                    <span className="inline-block font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {doc.category}
                    </span>
                    <div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        doc.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                        doc.status === 'Superseded' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                  </div>

                  {/* Col 4: Tags (Checkbox-derived structured tags) */}
                  <div className="col-span-6 md:col-span-2">
                    <div className="flex flex-wrap gap-1">
                      {doc.tags && doc.tags.length > 0 ? (
                        doc.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-[10px] px-1.5 py-0.5 rounded font-medium truncate max-w-[120px]"
                          >
                            #{tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No tags</span>
                      )}
                      {doc.tags && doc.tags.length > 3 && (
                        <span className="text-[10px] text-slate-400">+{doc.tags.length - 3}</span>
                      )}
                    </div>
                  </div>

                  {/* Col 5: Actions */}
                  <div className="col-span-12 md:col-span-1 flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleOpenEditor(doc)}
                      className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                      title="View & Edit in App"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleExportDocx(doc.title, doc.excerpt)}
                      className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                      title="Export as Word (.docx)"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* In-App Document Editor Modal with Checkbox Tagging */}
      {editingDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base">In-App Document Editor</h3>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  Live Cloud Sync
                </span>
              </div>
              <button onClick={() => setEditingDoc(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Title:</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Associated Event Name:</label>
                  <select
                    value={editProgrammeId}
                    onChange={e => setEditProgrammeId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="">All Programmes / General SOP</option>
                    {programmes.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category:</label>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value as DocumentCategory)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="RAMS">RAMS</option>
                    <option value="Parents Gateway Letters">Parents Gateway Letters</option>
                    <option value="Approved Templates">Approved Templates</option>
                    <option value="SOPs">SOPs</option>
                    <option value="VMV">VMV</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status:</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as DocumentStatus)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="Current">Current</option>
                    <option value="Approved">Approved</option>
                    <option value="Historical">Historical</option>
                    <option value="Superseded">Superseded</option>
                  </select>
                </div>
              </div>

              {/* Tagging with Checkboxes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Select Event Tags (Checkboxes):</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
                  {AVAILABLE_REPOSITORY_TAGS.map(tag => {
                    const isChecked = editSelectedTags.includes(tag);
                    return (
                      <label
                        key={tag}
                        onClick={() => toggleEditTag(tag)}
                        className={`flex items-center space-x-2 p-1.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                          isChecked
                            ? 'bg-emerald-100/70 border-emerald-400 text-emerald-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                        />
                        <span className="truncate">{tag}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Document Excerpt / Content:</label>
                  <button
                    type="button"
                    onClick={handleCopyDoc}
                    className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-semibold"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={editExcerpt}
                  onChange={e => setEditExcerpt(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 leading-relaxed focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleExportDocx(editTitle, editExcerpt)}
                disabled={isExporting}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Exporting...' : 'Export to Word (.docx)'}</span>
              </button>

              <div className="flex items-center space-x-2">
                {savedSuccess && (
                  <span className="text-emerald-600 font-semibold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditor}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal with Checkbox Tagging and Event Selector */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Upload Precedent Document / SOP</h3>
                <p className="text-xs text-slate-500 mt-0.5">Upload Word, PDF, or Excel files, or paste SOP text.</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              {/* Upload mode tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setUploadTab('file')}
                  className={`flex-1 py-1.5 font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5 ${
                    uploadTab === 'file' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Attach File (DOCX, PDF, XLSX)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadTab('text')}
                  className={`flex-1 py-1.5 font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5 ${
                    uploadTab === 'text' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Paste Text Directly</span>
                </button>
              </div>

              {uploadTab === 'file' ? (
                <div>
                  {uploadedFile ? (
                    <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                          <div className="font-bold text-slate-900 text-xs truncate">{uploadedFile.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {(uploadedFile.size / 1024).toFixed(1)} KB &bull; {uploadedFile.name.split('.').pop()?.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFile(null);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleFileProcess(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
                        isDragging
                          ? 'border-emerald-500 bg-emerald-50/50'
                          : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50/50'
                      }`}
                      onClick={() => {
                        document.getElementById('repo-file-input')?.click();
                      }}
                    >
                      <input
                        id="repo-file-input"
                        type="file"
                        className="hidden"
                        accept=".docx,.doc,.pdf,.xlsx,.xls,.pptx,.txt,.md"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileProcess(e.target.files[0]);
                          }
                        }}
                      />
                      <FileUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="font-semibold text-slate-800 text-xs">
                        Drag and drop your file here, or <span className="text-emerald-600 underline">browse</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Supports Word (.docx), PDF (.pdf), Excel (.xlsx), and Text files up to 25MB
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Title:</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  placeholder="e.g. 2026 Leadership Camp Safety SOP"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium"
                  required
                />
              </div>

              {/* Associated Event / Programme */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Associated Event Name:</label>
                <select
                  value={docProgrammeId}
                  onChange={e => setDocProgrammeId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-slate-50"
                >
                  <option value="">All Programmes / General SOP</option>
                  {programmes.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category:</label>
                  <select
                    value={docCategory}
                    onChange={e => setDocCategory(e.target.value as DocumentCategory)}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  >
                    <option value="RAMS">RAMS</option>
                    <option value="Parents Gateway Letters">Parents Gateway Letters</option>
                    <option value="Approved Templates">Approved Templates</option>
                    <option value="SOPs">SOPs</option>
                    <option value="VMV">VMV</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Academic Year:</label>
                  <input
                    type="number"
                    value={docYear}
                    onChange={e => setDocYear(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Tagging with Checkboxes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Select Event Tags (Checkboxes):</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
                  {AVAILABLE_REPOSITORY_TAGS.map(tag => {
                    const isChecked = uploadSelectedTags.includes(tag);
                    return (
                      <label
                        key={tag}
                        onClick={() => toggleUploadTag(tag)}
                        className={`flex items-center space-x-2 p-1.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                          isChecked
                            ? 'bg-emerald-100/70 border-emerald-400 text-emerald-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                        />
                        <span className="truncate">{tag}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Document Notes / Searchable Summary:
                </label>
                <textarea
                  value={docContent}
                  onChange={e => setDocContent(e.target.value)}
                  placeholder="Key safety controls, RAMS notes, or excerpt for the AI assistant..."
                  rows={3}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-[11px]"
                />
              </div>

              {isChair && (
                <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={docTemplateFlag}
                    onChange={e => setDocTemplateFlag(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Mark as Official Approved School Template</span>
                </label>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadedFile(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition shadow-2xs"
                >
                  Save & Index to Repository
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
