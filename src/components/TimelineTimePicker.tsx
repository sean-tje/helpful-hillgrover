import React, { useRef, useState } from 'react';
import { Info } from 'lucide-react';

// A day timeline for picking a programme's start and end time, like Google Calendar:
// drag on an empty part to create the block, drag the block to move it, or drag either
// edge to resize. Times snap to 5 minutes; the inputs below allow exact entry.

const DAY_START = 6 * 60; // 6.00 am
const DAY_END = 23 * 60; // 11.00 pm
const SNAP = 5;
const MIN_LENGTH = 15;

// Fixed points in the school day, marked on the track
const SCHOOL_MARKERS = [
  { minutes: 7 * 60 + 25, label: 'Assembly' },
  { minutes: 12 * 60 + 40, label: 'Early dismissal' },
  { minutes: 17 * 60, label: 'Dismissal' },
];

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

// 450 -> "7.30 am"
export const formatTimelineTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = String(minutes % 60).padStart(2, '0');
  return `${h % 12 || 12}.${m} ${h < 12 ? 'am' : 'pm'}`;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type DragMode = 'create' | 'move' | 'start' | 'end';

// "07:30" <-> minutes, and "7:30 AM" for the bar
export const timeToMinutes = (time: string) => toMinutes(time);
export const minutesToTime = (minutes: number) => toTime(minutes);
const clockLabel = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  return `${h % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
const hourLabel = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  return `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`;
};

interface TimelineTimePickerProps {
  startTime: string; // "HH:MM"
  endTime: string;
  onChange: (startTime: string, endTime: string) => void;
  showInputs?: boolean; // the Start and End boxes below the bar (the planner shows its own)
}

export const TimelineTimePicker: React.FC<TimelineTimePickerProps> = ({ startTime, endTime, onChange, showInputs = true }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: DragMode; anchor: number; offset: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const start = clamp(toMinutes(startTime), DAY_START, DAY_END - MIN_LENGTH);
  const end = clamp(toMinutes(endTime), start + MIN_LENGTH, DAY_END);
  const percent = (minutes: number) => ((minutes - DAY_START) / (DAY_END - DAY_START)) * 100;

  const minutesAt = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    const raw = DAY_START + ((clientX - rect.left) / rect.width) * (DAY_END - DAY_START);
    return clamp(Math.round(raw / SNAP) * SNAP, DAY_START, DAY_END);
  };

  const emit = (s: number, e: number) => onChange(toTime(s), toTime(e));

  const beginDrag = (mode: DragMode) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const at = minutesAt(e.clientX);
    drag.current = { mode, anchor: at, offset: at - start };
    trackRef.current!.setPointerCapture(e.pointerId);
    setIsDragging(true);
    if (mode === 'create') emit(clamp(at, DAY_START, DAY_END - MIN_LENGTH), clamp(at + MIN_LENGTH, DAY_START + MIN_LENGTH, DAY_END));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const at = minutesAt(e.clientX);
    const { mode, anchor, offset } = drag.current;
    if (mode === 'create') {
      const s = Math.min(anchor, at);
      const t = Math.max(anchor, at);
      emit(s, Math.max(t, s + MIN_LENGTH));
    } else if (mode === 'move') {
      const length = end - start;
      const s = clamp(at - offset, DAY_START, DAY_END - length);
      emit(s, s + length);
    } else if (mode === 'start') {
      emit(Math.min(at, end - MIN_LENGTH), end);
    } else {
      emit(start, Math.max(at, start + MIN_LENGTH));
    }
  };

  const endDrag = () => {
    drag.current = null;
    setIsDragging(false);
  };

  // Arrow keys on a handle move it by 5 minutes (15 with Shift)
  const nudge = (which: 'start' | 'end') => (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 15 : SNAP;
    const delta = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -step : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? step : 0;
    if (!delta) return;
    e.preventDefault();
    if (which === 'start') emit(clamp(start + delta, DAY_START, end - MIN_LENGTH), end);
    else emit(start, clamp(end + delta, start + MIN_LENGTH, DAY_END));
  };

  const hours: number[] = [];
  for (let m = DAY_START; m <= DAY_END; m += 60) hours.push(m);
  const labelled = (m: number) => (m / 60) % 4 === 0; // 8 am, 12 pm, 4 pm, 8 pm

  const handle = (which: 'start' | 'end', minutes: number) => (
    <div
      role="slider"
      tabIndex={0}
      aria-label={which === 'start' ? 'Start time' : 'End time'}
      aria-valuemin={DAY_START}
      aria-valuemax={DAY_END}
      aria-valuenow={minutes}
      aria-valuetext={clockLabel(minutes)}
      onPointerDown={beginDrag(which)}
      onKeyDown={nudge(which)}
      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-[3px] border-emerald-600 shadow-md cursor-ew-resize focus:outline-none focus:ring-4 focus:ring-emerald-600/25 z-10"
      style={{ left: `${percent(minutes)}%` }}
    />
  );

  return (
    <div className="space-y-2 select-none">
      <div className="rounded-2xl bg-emerald-50/70 px-5 sm:px-6 pt-4 pb-3">
        <div
          ref={trackRef}
          onPointerDown={beginDrag('create')}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={`relative h-10 touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
          title="Drag the bar or its ends to set the time"
        >
          {/* Rail */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3 rounded-full bg-slate-200" />

          {/* School day markers */}
          {SCHOOL_MARKERS.map(marker => (
            <div
              key={marker.label}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-lime-400 ring-2 ring-white"
              style={{ left: `${percent(marker.minutes)}%` }}
              title={`${marker.label}, ${formatTimelineTime(marker.minutes)}`}
            />
          ))}

          {/* The programme */}
          <div
            onPointerDown={beginDrag('move')}
            className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-full bg-emerald-600 text-white shadow-sm flex items-center justify-center overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{ left: `${percent(start)}%`, width: `${percent(end) - percent(start)}%` }}
          >
            <span className="text-[14px] font-semibold px-4 truncate pointer-events-none">
              {clockLabel(start)} – {clockLabel(end)}
            </span>
          </div>
          {handle('start', start)}
          {handle('end', end)}
        </div>

        {/* Hour grid */}
        <div className="relative h-8 mt-1" aria-hidden="true">
          {hours.map(m => (
            <div key={m} className="absolute top-0 -translate-x-1/2 flex flex-col items-center" style={{ left: `${percent(m)}%` }}>
              <span className={`w-px ${labelled(m) ? 'h-2.5 bg-slate-400' : 'h-1.5 bg-slate-300'}`} />
              {labelled(m) && <span className="mt-1 text-[13px] text-slate-600 whitespace-nowrap">{hourLabel(m)}</span>}
            </div>
          ))}
        </div>
      </div>

      {showInputs && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
          <label className="flex items-center gap-1.5">
            <span className="font-semibold">Start</span>
            <input
              type="time"
              step={300}
              value={toTime(start)}
              onChange={e => e.target.value && emit(clamp(toMinutes(e.target.value), DAY_START, end - MIN_LENGTH), end)}
              className="px-2 py-1 border border-slate-300 rounded-lg bg-white"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="font-semibold">End</span>
            <input
              type="time"
              step={300}
              value={toTime(end)}
              onChange={e => e.target.value && emit(start, clamp(toMinutes(e.target.value), start + MIN_LENGTH, DAY_END))}
              className="px-2 py-1 border border-slate-300 rounded-lg bg-white"
            />
          </label>
        </div>
      )}
      <p className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-[13px] text-slate-600">
        <Info className="w-4 h-4 text-slate-500 shrink-0" />
        Assembly 7.25 am, early dismissal 12.40 pm, dismissal 5.00 pm
      </p>
    </div>
  );
};
