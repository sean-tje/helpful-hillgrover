import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Sparkles, Check, RefreshCw } from 'lucide-react';

interface YearEndInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const YearEndInsightsModal: React.FC<YearEndInsightsModalProps> = ({ isOpen, onClose }) => {
  const { yearEndInsights, generateYearEndInsights } = useData();
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    await generateYearEndInsights();
    setIsGenerating(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2 text-slate-900">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-base">Chair Year-End AI Strategic Insights</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg font-bold">
            &times;
          </button>
        </div>

        <p className="text-xs text-slate-600">
          Synthesizes workflow patterns across all completed programmes for Chair review. Suggestions do NOT automatically alter templates or rules.
        </p>

        {isGenerating ? (
          <div className="py-12 text-center text-slate-500 text-xs space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500" />
            <p>Analyzing year-end committee logs and task completion windows...</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {yearEndInsights.map(insight => (
              <div key={insight.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-900 text-sm flex items-center justify-between">
                  <span>{insight.category}</span>
                  <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded font-bold">
                    {insight.status}
                  </span>
                </div>
                <p className="text-slate-800 font-semibold">{insight.statement}</p>
                <p className="text-slate-500 italic text-[11px]">Evidence: {insight.evidence}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Regenerate Insights</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition"
          >
            Close & Review Later
          </button>
        </div>
      </div>
    </div>
  );
};
