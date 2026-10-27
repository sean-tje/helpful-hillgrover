import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check, Sparkles, Plane } from 'lucide-react';
import { formatSingaporeDate, formatSingaporeDateLong } from '../utils';

interface FlightDateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChange: (startDate: string, endDate: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export const FlightDateRangePicker: React.FC<FlightDateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current viewing month/year from startDate or today
  const initialDate = startDate ? new Date(startDate) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-11

  // Hover state for flight-style range preview
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [isPickingEnd, setIsPickingEnd] = useState(false);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsPickingEnd(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Navigate months
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Helper to format ISO YYYY-MM-DD
  const formatIso = (year: number, month: number, day: number): string => {
    const y = year.toString();
    const m = (month + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Compute calendar days for viewMonth
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  // Convert so Monday is 0, Sunday is 6
  const startPadding = (firstDayOfWeek + 6) % 7;

  // Day click handler (flight-style logic)
  const handleDayClick = (dayStr: string) => {
    if (!isPickingEnd) {
      // First click: select start date, begin picking end
      onChange(dayStr, dayStr);
      setIsPickingEnd(true);
    } else {
      // Second click: select end date
      if (dayStr < startDate) {
        // If clicked date is before start date, restart selection with this as new start
        onChange(dayStr, dayStr);
        setIsPickingEnd(true);
      } else {
        onChange(startDate, dayStr);
        setIsPickingEnd(false);
        setIsOpen(false);
      }
    }
  };

  // Quick preset handlers
  const handleApplyPreset = (daysDuration: number) => {
    const base = new Date();
    const startStr = formatIso(base.getFullYear(), base.getMonth(), base.getDate());
    const end = new Date(base);
    end.setDate(end.getDate() + (daysDuration - 1));
    const endStr = formatIso(end.getFullYear(), end.getMonth(), end.getDate());
    onChange(startStr, endStr);
    setIsPickingEnd(false);
    setIsOpen(false);
  };

  // Calculate day difference
  const calculateDurationDays = (): number => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const diffTime = Math.abs(end - start);
    return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const durationDays = calculateDurationDays();
  const durationLabel = durationDays === 1 
    ? '1-Day Event' 
    : `${durationDays} Days (${durationDays - 1} ${durationDays - 1 === 1 ? 'Night' : 'Nights'})`;

  // Determine effective range for highlighting
  const effectiveEnd = isPickingEnd && hoveredDate && hoveredDate >= startDate ? hoveredDate : endDate;

  return (
    <div className="relative" ref={containerRef}>
      {/* Flight Style Selector Trigger */}
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && startDate) {
            const d = new Date(startDate);
            setViewYear(d.getFullYear());
            setViewMonth(d.getMonth());
          }
        }}
        className={`w-full p-2.5 bg-white border rounded-xl cursor-pointer transition shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
          isOpen ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-400'
        }`}
      >
        <div className="flex items-center gap-2 flex-1">
          {/* Depart / Start */}
          <div className="flex-1 min-w-0 bg-slate-50 hover:bg-emerald-50/50 p-2 rounded-lg border border-slate-200 transition">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Start Date (Depart)
            </span>
            <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5 truncate">
              <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{formatSingaporeDate(startDate)}</span>
              <span className="text-[11px] font-normal text-slate-500 hidden md:inline">
                ({formatSingaporeDateLong(startDate).split(' ').slice(1).join(' ')})
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center shrink-0 text-slate-400 px-1">
            <Plane className="w-4 h-4 text-emerald-600 rotate-90 sm:rotate-0" />
          </div>

          {/* Return / End */}
          <div className="flex-1 min-w-0 bg-slate-50 hover:bg-emerald-50/50 p-2 rounded-lg border border-slate-200 transition">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              End Date (Return)
            </span>
            <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5 truncate">
              <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{formatSingaporeDate(endDate)}</span>
              <span className="text-[11px] font-normal text-slate-500 hidden md:inline">
                ({formatSingaporeDateLong(endDate).split(' ').slice(1).join(' ')})
              </span>
            </div>
          </div>
        </div>

        {/* Duration Badge & Select prompt */}
        <div className="shrink-0 flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-bold border border-emerald-200 whitespace-nowrap">
            {durationLabel}
          </span>
          <span className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5">
            {isOpen ? 'Close' : 'Select Dates'}
          </span>
        </div>
      </div>

      {/* Flight Style Interactive Calendar Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 sm:right-auto sm:w-[380px] mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
          {/* Quick Presets Header */}
          <div className="pb-3 mb-3 border-b border-slate-100 flex items-center justify-between gap-1.5 overflow-x-auto text-[11px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              Presets:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleApplyPreset(1)}
                className="px-2 py-1 rounded-md bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 font-semibold transition"
              >
                1 Day (Today)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(2)}
                className="px-2 py-1 rounded-md bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 font-semibold transition"
              >
                2 Days
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(3)}
                className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold transition"
              >
                3-Day Camp
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(5)}
                className="px-2 py-1 rounded-md bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 font-semibold transition"
              >
                1 Week
              </button>
            </div>
          </div>

          {/* Month & Year Navigation Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-bold text-sm text-slate-900">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Status Instruction */}
          <div className="text-[11px] text-center mb-2 font-medium">
            {isPickingEnd ? (
              <span className="text-emerald-700 font-semibold animate-pulse">
                Click a date to select End Date (Return)
              </span>
            ) : (
              <span className="text-slate-500">
                Click any date to select Start Date (Depart)
              </span>
            )}
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
            {WEEKDAY_NAMES.map((w, i) => (
              <div key={i} className="py-1">
                {w}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-xs">
            {/* Blank padding days for previous month */}
            {Array.from({ length: startPadding }).map((_, i) => (
              <div key={`pad-${i}`} className="h-8" />
            ))}

            {/* Days in current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = formatIso(viewYear, viewMonth, dayNum);

              const isStart = dateStr === startDate;
              const isEnd = dateStr === effectiveEnd;
              const isInRange = dateStr >= startDate && dateStr <= (effectiveEnd || startDate);
              const isToday = dateStr === formatIso(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

              let cellStyle = 'bg-transparent text-slate-700 hover:bg-slate-100';

              if (isStart && isEnd) {
                cellStyle = 'bg-emerald-600 text-white font-bold rounded-lg shadow-2xs';
              } else if (isStart) {
                cellStyle = 'bg-emerald-600 text-white font-bold rounded-l-lg';
              } else if (isEnd) {
                cellStyle = 'bg-emerald-600 text-white font-bold rounded-r-lg';
              } else if (isInRange) {
                cellStyle = 'bg-emerald-50 text-emerald-950 font-semibold';
              }

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleDayClick(dateStr)}
                  onMouseEnter={() => {
                    if (isPickingEnd) {
                      setHoveredDate(dateStr);
                    }
                  }}
                  className={`h-8 flex items-center justify-center relative transition text-xs ${cellStyle}`}
                >
                  <span>{dayNum}</span>
                  {isToday && !isStart && !isEnd && (
                    <span className="w-1 h-1 bg-emerald-600 rounded-full absolute bottom-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Bar */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="text-[11px] text-slate-600 font-medium">
              <span className="font-bold text-slate-800">{formatSingaporeDate(startDate)}</span>
              {startDate !== endDate && (
                <>
                  <span className="mx-1 text-slate-400">&rarr;</span>
                  <span className="font-bold text-slate-800">{formatSingaporeDate(endDate)}</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsPickingEnd(false);
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
