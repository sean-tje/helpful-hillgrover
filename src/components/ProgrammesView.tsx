import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ProgrammeType, ProgrammeStatus } from '../types';
import { Plus, FolderKanban, CheckCircle2, FileText, ArrowRight, ShieldAlert } from 'lucide-react';
import { CreateProgrammeModal } from './CreateProgrammeModal';
import { formatSingaporeDateRange } from '../utils';

interface ProgrammesViewProps {
  onOpenProgramme: (programmeId: string) => void;
}

export const ProgrammesView: React.FC<ProgrammesViewProps> = ({ onOpenProgramme }) => {
  const { currentUser } = useAuth();
  const { programmes, tasks, documents } = useData();

  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredProgrammes = programmes.filter(p => {
    if (typeFilter !== 'All' && p.type !== typeFilter) return false;
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-emerald-600" />
            <span>Programmes Workspace</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Central source of truth for Student Leadership events, required documents, and task execution.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow-2xs flex items-center justify-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Programme</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div>
            <span className="font-semibold text-slate-700 mr-2">Type:</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All Types</option>
              <option value="Camp">Camp</option>
              <option value="Investiture">Investiture</option>
              <option value="Exchange">Exchange</option>
              <option value="Learning Journey">Learning Journey</option>
              <option value="Training">Training</option>
              <option value="School Event">School Event</option>
            </select>
          </div>

          <div>
            <span className="font-semibold text-slate-700 mr-2">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Planning">Planning</option>
              <option value="Ready">Ready</option>
              <option value="Completed">Completed</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredProgrammes.length} of {programmes.length} programme(s)
        </div>
      </div>

      {/* Programmes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProgrammes.map(p => {
          const prgTasks = tasks.filter(t => t.programmeId === p.id);
          const completedTasks = prgTasks.filter(t => t.status === 'Completed').length;

          const prgDocs = documents.filter(d => d.programmeId === p.id);
          const requiredDocCount = 4; // Standard required documents count
          const completedDocCount = prgDocs.filter(d => d.status === 'Approved' || d.status === 'Current').length;

          return (
            <div
              key={p.id}
              onClick={() => onOpenProgramme(p.id)}
              className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md hover:border-emerald-500 transition cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-base text-slate-900 group-hover:text-emerald-700 leading-snug">
                    {p.title}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap ${
                    p.status === 'Archived' ? 'bg-slate-100 text-slate-600' :
                    p.status === 'Planning' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {p.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {p.description}
                </p>

                <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span>🗓️ {formatSingaporeDateRange(p.startDate, p.endDate, 'long')}</span>
                    <span className="font-semibold text-slate-700">{p.type}</span>
                  </div>
                  <div>📍 {p.venue}</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Source Base: {p.sourceProgrammeId ? 'Duplicated from Precedent' : 'New Standard'}
                  </div>
                </div>
              </div>

              {/* Concrete Counts Display - No Percentage Bar */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-700 font-medium">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{completedTasks} of {prgTasks.length} tasks complete</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-700 font-medium">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>{completedDocCount} of {requiredDocCount} required docs complete</span>
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end text-xs text-emerald-600 font-semibold group-hover:underline">
                  <span>Open Programme Workspace &rarr;</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CreateProgrammeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(newId) => onOpenProgramme(newId)}
      />
    </div>
  );
};
