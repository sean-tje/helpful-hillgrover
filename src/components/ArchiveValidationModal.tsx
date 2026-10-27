import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Archive, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface ArchiveValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  programmeId: string;
}

export const ArchiveValidationModal: React.FC<ArchiveValidationModalProps> = ({
  isOpen,
  onClose,
  programmeId,
}) => {
  const { currentUser } = useAuth();
  const { programmes, tasks, documents, archiveProgramme } = useData();

  const [validationResult, setValidationResult] = useState<{ success?: boolean; errors?: string[] } | null>(null);

  if (!isOpen) return null;

  const programme = programmes.find(p => p.id === programmeId);
  if (!programme) return null;

  const handleRunValidation = () => {
    const result = archiveProgramme(programmeId, currentUser.id);
    setValidationResult(result);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2 text-slate-900">
            <Archive className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-base">Programme Archive Readiness Check</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg font-bold">
            &times;
          </button>
        </div>

        <p className="text-xs text-slate-600">
          Archived programmes become read-only institutional memory. All tasks and required documents must be complete before archiving.
        </p>

        {validationResult === null ? (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <p className="font-bold text-slate-800">Archival Readiness Criteria (Chair Sign-Off):</p>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              <li>All assigned programme action items are marked <strong>"Completed"</strong></li>
              <li>After-Action Review (AAR) reflection is <strong>filled & saved</strong> (What worked well / What broke / Next year)</li>
            </ul>
          </div>
        ) : validationResult.success ? (
          <div className="p-4 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 text-xs flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Archive Validation Passed!</div>
              <p className="mt-0.5">Programme successfully archived as read-only institutional precedent.</p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-rose-50 text-rose-900 rounded-xl border border-rose-200 text-xs space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-rose-800">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Archive Blocked - Incomplete Items Found:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-rose-700">
              {validationResult.errors?.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
          >
            Close
          </button>
          {!validationResult?.success && (
            <button
              onClick={handleRunValidation}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition"
            >
              Run Pre-Archive Validation
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
