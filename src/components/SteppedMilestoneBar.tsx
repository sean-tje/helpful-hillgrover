import React from 'react';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { Task } from '../types';

interface SteppedMilestoneBarProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
  compact?: boolean;
}

export const SteppedMilestoneBar: React.FC<SteppedMilestoneBarProps> = ({
  tasks,
  onTaskClick,
  compact = false,
}) => {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-xs text-slate-400 italic py-1">
        No milestone tasks defined yet.
      </div>
    );
  }

  // Sort tasks by due date or creation
  const sortedTasks = [...tasks].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const completedCount = sortedTasks.filter(t => t.status === 'Completed').length;
  const percent = Math.round((completedCount / sortedTasks.length) * 100);

  return (
    <div className="space-y-2 py-1">
      {/* Metric summary */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 font-medium">
          Milestone Progress: <strong className="text-slate-900">{completedCount} of {sortedTasks.length}</strong> tasks
        </span>
        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200/60">
          {percent}% Complete
        </span>
      </div>

      {/* Stepped milestone track with circle dots */}
      <div className="relative pt-2 pb-1">
        {/* Continuous background track line */}
        <div className="absolute top-[17px] left-3 right-3 h-0.5 bg-slate-200 z-0" />

        {/* Filled progress line */}
        <div
          className="absolute top-[17px] left-3 h-0.5 bg-emerald-600 z-0 transition-all duration-500"
          style={{
            width: `${sortedTasks.length > 1 ? Math.min(100, Math.max(0, (completedCount / (sortedTasks.length - 1)) * 100)) : (completedCount > 0 ? 100 : 0)}%`,
          }}
        />

        {/* Milestone Node Dots */}
        <div className="relative flex justify-between items-center z-10">
          {sortedTasks.map((task, idx) => {
            const isCompleted = task.status === 'Completed';
            const isInProgress = task.status === 'In Progress';
            const isAwaiting = task.status === 'Awaiting Input';

            return (
              <div
                key={task.id}
                className="group relative flex flex-col items-center cursor-pointer"
                onClick={() => onTaskClick && onTaskClick(task.id)}
              >
                {/* Circle Dot Node */}
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow-xs scale-100 ring-2 ring-emerald-100'
                      : isInProgress
                      ? 'bg-white border-2 border-emerald-600 ring-4 ring-emerald-50'
                      : isAwaiting
                      ? 'bg-white border-2 border-amber-500 ring-4 ring-amber-50'
                      : 'bg-white border-2 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : isInProgress ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  ) : isAwaiting ? (
                    <Clock className="w-2.5 h-2.5 text-amber-600" />
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                  )}
                </div>

                {/* Step tooltip on hover */}
                <div className="absolute bottom-6 hidden group-hover:flex flex-col items-center z-30 pointer-events-none whitespace-nowrap">
                  <div className="bg-slate-900 text-white text-[10px] font-medium py-1 px-2 rounded-md shadow-lg border border-slate-700 max-w-xs">
                    <span className="font-semibold text-emerald-300">Step {idx + 1}: </span>
                    {task.title}
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      Due: {task.dueDate} &bull; Status: {task.status}
                    </div>
                  </div>
                  <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5" />
                </div>

                {/* Subtitle label in non-compact mode */}
                {!compact && (
                  <span className="text-[10px] text-slate-500 font-medium mt-1 truncate max-w-[70px] text-center hidden sm:block">
                    {task.title.split(' ')[0]}...
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
