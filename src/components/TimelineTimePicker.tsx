import React, { useRef, useState } from 'react';

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

interface TimelineTimePickerProps {
  startTime: string; // "HH:MM"
  endTime: string;
  onChange: (startTime: string, endTime: string) => void;
}

export const TimelineTimePicker: React.FC<TimelineTimePickerProps> = ({ startTime, endTime, onChange }) => {
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

  const hours: number[] = [];
  for (let m = DAY_START; m <= DAY_END; m += 60) hours.push(m);

  return (
    <div className="space-y-2 select-none">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-slate-900">
          {formatTimelineTime(start)} to {formatTimelineTime(end)}
        </span>
        <span className="text-[11px] text-slate-500 hidden sm:inline">Drag on the timeline to set the time</span>
      </div>

      <div
        ref={trackRef}
        onPointerDown={beginDrag('create')}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`relative h-16 rounded-xl border border-slate-300 bg-slate-50 touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
      >
        {/* Hour grid */}
        {hours.map(m => (
          <div key={m} className="absolute top-0 bottom-0 border-l border-slate-200" style={{ left: `${percent(m)}%` }}>
            {(m / 60) % 2 === 0 && (
              <span className={`absolute bottom-0.5 left-1 text-[9px] text-slate-400 whitespace-nowrap ${(m / 60) % 4 === 2 ? 'hidden sm:inline' : ''}`}>
                {formatTimelineTime(m).replace('.00', '')}
              </span>
            )}
          </div>
        ))}

        {/* School day markers */}
        {SCHOOL_MARKERS.map(marker => (
          <div
            key={marker.label}
            className="absolute top-0 h-3 border-l-2 border-amber-400"
            style={{ left: `${percent(marker.minutes)}%` }}
            title={`${marker.label}, ${formatTimelineTime(marker.minutes)}`}
          />
        ))}

        {/* Selected block */}
        <div
          onPointerDown={beginDrag('move')}
          className={`absolute top-3 bottom-4 rounded-lg bg-emerald-600 text-white shadow-md flex items-center justify-center overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ left: `${percent(start)}%`, width: `${percent(end) - percent(start)}%` }}
        >
          <span className="text-[10px] font-semibold px-3 truncate pointer-events-none">
            {formatTimelineTime(start)} to {formatTimelineTime(end)}
          </span>
          <div
            onPointerDown={beginDrag('start')}
            className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize bg-emerald-800/40 hover:bg-emerald-900/60"
            aria-hidden="true"
          />
          <div
            onPointerDown={beginDrag('end')}
            className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize bg-emerald-800/40 hover:bg-emerald-900/60"
            aria-hidden="true"
          />
        </div>
      </div>

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
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="inline-block w-0.5 h-3 bg-amber-400" />
          Assembly 7.25 am, early dismissal 12.40 pm, dismissal 5.00 pm
        </span>
      </div>
    </div>
  );
};
