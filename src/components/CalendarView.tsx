import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Programme, Task } from '../types';
import { formatSingaporeDate, formatSingaporeDateRange } from '../utils';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  FolderKanban,
  MapPin,
  ShieldCheck,
  UserCheck,
  Users,
  AlertTriangle,
  FileText,
  Bus,
  Megaphone,
  Sparkles,
  Info,
  CalendarDays,
  Plus
} from 'lucide-react';
import { CreateProgrammeModal } from './CreateProgrammeModal';

interface CalendarViewProps {
  onOpenProgramme: (id: string) => void;
}

interface StatutoryDeadline {
  programmeId: string;
  programmeTitle: string;
  dateStr: string;
  type: 'pg_rams' | 'vct' | 'bus' | 'aor';
  label: string;
  leadTime: string;
  isAllHands: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onOpenProgramme }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { currentUser, allowlistedUsers } = useAuth();
  const { programmes, tasks } = useData();

  // Selected Year and Month (0-indexed: 0 = Jan, 11 = Dec)
  // Default to January 2027 where the academic term starts
  const [currentYear, setCurrentYear] = useState<number>(2027);
  const [currentMonth, setCurrentMonth] = useState<number>(0); // Jan 2027

  // Filter lens: 'all' (Master 13 Programmes) vs 'my' (My Involvements)
  const [filterLens, setFilterLens] = useState<'all' | 'my'>('my');

  // View format: 'grid' (Month Calendar) vs 'agenda' (Chronological Timeline)
  const [viewFormat, setViewFormat] = useState<'grid' | 'agenda'>('grid');

  // Selected date for day inspection drawer
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Month Names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to add/subtract days
  const addDays = (dateStr: string, days: number): string => {
    try {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
  };

  // Quick jump options for 2026/2027 Hillgrove Student Leadership Calendar
  const quickJumpList = [
    { label: 'Dec 2026 (Sec 1 Prep)', year: 2026, month: 11, term: 'Vacation' },
    { label: 'Jan 2027 (Sec 1 Orientation)', year: 2027, month: 0, term: 'Term 1' },
    { label: 'Feb 2027 (Sec 2 Recruitment)', year: 2027, month: 1, term: 'Term 1' },
    { label: 'Mar 2027 (Training & Campaign)', year: 2027, month: 2, term: 'Term 1/2' },
    { label: 'Apr 2027 (Investiture)', year: 2027, month: 3, term: 'Term 2' },
    { label: 'May 2027 (Dialogue)', year: 2027, month: 4, term: 'Term 2' },
    { label: 'Jun 2027 (Leaders Camp 3D2N)', year: 2027, month: 5, term: 'Vacation' },
    { label: 'Sep 2027 (Teachers\' Day)', year: 2027, month: 8, term: 'Term 3' },
    { label: 'Oct 2027 (Handover Dinner)', year: 2027, month: 9, term: 'Term 4' },
    { label: 'Nov 2027 (Year-End Review)', year: 2027, month: 10, term: 'Term 4' },
  ];

  // Filter programmes based on user lens
  const filteredProgrammes = useMemo(() => {
    if (filterLens === 'all') return programmes;
    return programmes.filter(p => 
      p.firstIcId === currentUser.id ||
      p.secondIcId === currentUser.id ||
      p.thirdIcId === currentUser.id ||
      p.isAllHands ||
      (p.supportingTeacherIds && p.supportingTeacherIds.includes(currentUser.id))
    );
  }, [programmes, filterLens, currentUser.id]);

  // Compute all Statutory Deadlines for the filtered programmes
  const statutoryDeadlines = useMemo<StatutoryDeadline[]>(() => {
    const list: StatutoryDeadline[] = [];
    filteredProgrammes.forEach(p => {
      // 1 Month Lead Time (30 days before): PG & RAMS
      list.push({
        programmeId: p.id,
        programmeTitle: p.title,
        dateStr: addDays(p.startDate, -30),
        type: 'pg_rams',
        label: 'PG & RAMS Due (1 Month)',
        leadTime: '1 Month Lead Time',
        isAllHands: !!p.isAllHands,
      });

      // 2 Weeks Lead Time (14 days before): VCT Announcement (as instructed: VCT needs 2 weeks leadtime)
      list.push({
        programmeId: p.id,
        programmeTitle: p.title,
        dateStr: addDays(p.startDate, -14),
        type: 'vct',
        label: 'All-Staff VCT Notice Due (2 Weeks)',
        leadTime: '2 Weeks Lead Time',
        isAllHands: !!p.isAllHands,
      });

      // 2 Weeks Lead Time (14 days before): Bus Booking (if Camp, offsite, or transport flagged)
      if (p.id.includes('camp') || p.venue.toLowerCase().includes('campsite') || p.conditionalAnswers?.requiresTransport) {
        list.push({
          programmeId: p.id,
          programmeTitle: p.title,
          dateStr: addDays(p.startDate, -14),
          type: 'bus',
          label: 'Bus Booking FormSG Due (2 Weeks)',
          leadTime: '2 Weeks Lead Time',
          isAllHands: !!p.isAllHands,
        });
      }

      // 4-6 Weeks Lead Time (35 days before): AOR Submission
      list.push({
        programmeId: p.id,
        programmeTitle: p.title,
        dateStr: addDays(p.startDate, -35),
        type: 'aor',
        label: 'AOR Submission Due (5 Weeks)',
        leadTime: '4-6 Weeks Lead Time',
        isAllHands: !!p.isAllHands,
      });
    });
    return list;
  }, [filteredProgrammes]);

  // Calendar Grid Calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Days in current month
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // Day of week for first day (0 = Sun, 1 = Mon ... 6 = Sat)
    // Convert to Monday-first (0 = Mon, 6 = Sun)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: {
      date: Date;
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      programmes: Programme[];
      deadlines: StatutoryDeadline[];
      tasks: Task[];
    }[] = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(currentYear, currentMonth - 1, dayNum);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: d,
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: false,
        programmes: [],
        deadlines: [],
        tasks: [],
      });
    }

    const todayStr = '2027-01-04'; // Baseline reference or actual date

    // Current month days
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const d = new Date(currentYear, currentMonth, dayNum);
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

      // Find programmes running on this date (start <= date <= end)
      const dayProgrammes = filteredProgrammes.filter(p => {
        return dateStr >= p.startDate && dateStr <= p.endDate;
      });

      // Find statutory lead time deadlines on this date
      const dayDeadlines = statutoryDeadlines.filter(dl => dl.dateStr === dateStr);

      // Find tasks due on this date
      const dayTasks = tasks.filter(t => {
        if (t.dueDate !== dateStr) return false;
        if (filterLens === 'my' && t.assignedTo !== currentUser.id && t.ownerId !== currentUser.id) return false;
        return true;
      });

      days.push({
        date: d,
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        programmes: dayProgrammes,
        deadlines: dayDeadlines,
        tasks: dayTasks,
      });
    }

    // Next month padding days to complete the 7-column grid (up to 35 or 42 cells)
    const remainingCells = 42 - days.length;
    if (remainingCells < 7) {
      for (let i = 1; i <= remainingCells; i++) {
        const d = new Date(currentYear, currentMonth + 1, i);
        const dateStr = d.toISOString().split('T')[0];
        days.push({
          date: d,
          dateStr,
          dayNumber: i,
          isCurrentMonth: false,
          isToday: false,
          programmes: [],
          deadlines: [],
          tasks: [],
        });
      }
    } else {
      const extra = (35 - days.length);
      for (let i = 1; i <= extra; i++) {
        const d = new Date(currentYear, currentMonth + 1, i);
        const dateStr = d.toISOString().split('T')[0];
        days.push({
          date: d,
          dateStr,
          dayNumber: i,
          isCurrentMonth: false,
          isToday: false,
          programmes: [],
          deadlines: [],
          tasks: [],
        });
      }
    }

    return days;
  }, [currentYear, currentMonth, filteredProgrammes, statutoryDeadlines, tasks, filterLens, currentUser.id]);

  // Handle month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Term Context descriptor
  const getTermDescription = (year: number, month: number) => {
    if (year === 2026 && month === 11) {
      return { term: 'Year-End School Vacation', detail: 'Secondary 1 Orientation Induction Preparation' };
    }
    if (month >= 0 && month <= 2) {
      return { term: 'Term 1 (2027)', detail: 'Sec 1 Orientation, Sec 2 Council Recruitment & March Hols Training' };
    }
    if (month >= 3 && month <= 4) {
      return { term: 'Term 2 (2027)', detail: 'Student Leaders Investiture & Hillgrove Dialogue' };
    }
    if (month === 5) {
      return { term: 'June Vacation (2027)', detail: '3D2N Student Leaders Camp (Off-Site Campsite)' };
    }
    if (month >= 6 && month <= 7) {
      return { term: 'Term 3 (2027)', detail: 'Teachers\' Day Celebrations Planning & Rehearsals' };
    }
    if (month >= 8 && month <= 9) {
      return { term: 'Term 3 / 4 (2027)', detail: 'Teachers\' Day Concert & Student Leaders Handover Dinner' };
    }
    return { term: 'Term 4 / Year-End (2027)', detail: 'Year-End Student Leadership Committee Review & Planning' };
  };

  const currentTermInfo = getTermDescription(currentYear, currentMonth);

  // Selected Day Details for Drawer
  const selectedDayData = useMemo(() => {
    if (!selectedDateStr) return null;
    return calendarDays.find(d => d.dateStr === selectedDateStr);
  }, [selectedDateStr, calendarDays]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header & Context */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Overview Calendar
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Hillgrove Student Leadership Committee &bull; Synchronized 2026/2027 Events & Statutory Milestones
              </p>
            </div>
          </div>
        </div>

        {/* View Mode & Filter Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Programme</span>
          </button>

          {/* Filter Lens Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilterLens('my')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                filterLens === 'my'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>My Involvements ({filteredProgrammes.length})</span>
            </button>

            <button
              onClick={() => setFilterLens('all')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                filterLens === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5 text-slate-600" />
              <span>All 13 Programmes ({programmes.length})</span>
            </button>
          </div>

          {/* View Format Toggle (Grid vs Agenda) */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewFormat('grid')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewFormat === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month Grid
            </button>
            <button
              onClick={() => setViewFormat('agenda')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewFormat === 'agenda'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Agenda Timeline
            </button>
          </div>
        </div>
      </div>

      {/* Month Navigation & Quick Jump Ribbon */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {monthNames[currentMonth]} {currentYear}
            </h2>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Current Term Banner */}
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 rounded-xl text-xs">
            <span className="font-bold text-emerald-900 uppercase tracking-wider text-[11px]">
              {currentTermInfo.term}
            </span>
            <span className="text-emerald-700 text-xs hidden sm:inline">&bull; {currentTermInfo.detail}</span>
          </div>
        </div>

        {/* Quick Month Jump Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 font-semibold shrink-0 pr-1 text-[11px]">Quick Jump:</span>
          {quickJumpList.map((item, idx) => {
            const isSelected = currentYear === item.year && currentMonth === item.month;
            return (
              <button
                key={idx}
                onClick={() => {
                  setCurrentYear(item.year);
                  setCurrentMonth(item.month);
                }}
                className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition ${
                  isSelected
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual Legend */}
      <div className="flex flex-wrap items-center gap-4 bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-2xs text-xs text-slate-600">
        <span className="font-semibold text-slate-700">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
          <span>Official Event</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-purple-600"></span>
          <span>* All-Hands Event</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          <span>1 Month Lead Time (PG & RAMS)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-cyan-600"></span>
          <span>2 Weeks Lead Time (VCT & Bus)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
          <span>Action Item Deadline</span>
        </div>
      </div>

      {/* VIEW FORMAT 1: INTERACTIVE MONTH GRID */}
      {viewFormat === 'grid' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Day Headers (Mon - Sun) */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-bold text-slate-700 py-2.5 uppercase tracking-wider">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span className="text-slate-400">Sat</span>
            <span className="text-slate-400">Sun</span>
          </div>

          {/* 7-Column Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 min-h-[640px]">
            {calendarDays.map((day, idx) => {
              const hasItems = day.programmes.length > 0 || day.deadlines.length > 0 || day.tasks.length > 0;
              const isSelected = selectedDateStr === day.dateStr;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDateStr(day.dateStr)}
                  className={`p-1.5 sm:p-2 transition min-h-[110px] flex flex-col justify-between cursor-pointer group ${
                    day.isCurrentMonth ? 'bg-white' : 'bg-slate-50/60 text-slate-400'
                  } ${day.isToday ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-50/20' : ''} ${
                    isSelected ? 'bg-slate-100/70 ring-1 ring-slate-400' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Date Number & Today marker */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold rounded-md px-1.5 py-0.5 ${
                        day.isToday
                          ? 'bg-emerald-600 text-white font-bold'
                          : day.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {day.dayNumber}
                    </span>

                    {hasItems && (
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-700">
                        {day.programmes.length + day.deadlines.length + day.tasks.length} item(s)
                      </span>
                    )}
                  </div>

                  {/* Cell Content (Programmes, Statutory Deadlines, Tasks) */}
                  <div className="space-y-1 my-1 overflow-hidden">
                    {/* 1. Official Programmes */}
                    {day.programmes.map(p => (
                      <div
                        key={p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenProgramme(p.id);
                        }}
                        className={`text-[10px] sm:text-[11px] font-bold p-1 rounded-md truncate transition flex items-center gap-1 shadow-2xs ${
                          p.isAllHands
                            ? 'bg-purple-100 text-purple-900 border border-purple-300 hover:bg-purple-200'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                        }`}
                        title={`${p.title} (${p.venue})`}
                      >
                        {p.isAllHands ? (
                          <span className="text-purple-700 shrink-0 font-bold">*</span>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></span>
                        )}
                        <span className="truncate">{p.title}</span>
                      </div>
                    ))}

                    {/* 2. Statutory Deadlines (PG, RAMS, VCT, Bus, AOR) */}
                    {day.deadlines.map((dl, dIdx) => (
                      <div
                        key={dIdx}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenProgramme(dl.programmeId);
                        }}
                        className={`text-[9px] sm:text-[10px] font-medium p-0.5 sm:p-1 rounded truncate border flex items-center gap-1 ${
                          dl.type === 'pg_rams'
                            ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                            : dl.type === 'vct'
                            ? 'bg-cyan-50 text-cyan-900 border-cyan-300 hover:bg-cyan-100'
                            : dl.type === 'bus'
                            ? 'bg-teal-50 text-teal-900 border-teal-300 hover:bg-teal-100'
                            : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
                        }`}
                        title={`${dl.label} for ${dl.programmeTitle}`}
                      >
                        {dl.type === 'pg_rams' && <Clock className="w-2.5 h-2.5 text-amber-700 shrink-0" />}
                        {dl.type === 'vct' && <Megaphone className="w-2.5 h-2.5 text-cyan-700 shrink-0" />}
                        {dl.type === 'bus' && <Bus className="w-2.5 h-2.5 text-teal-700 shrink-0" />}
                        {dl.type === 'aor' && <FileText className="w-2.5 h-2.5 text-slate-700 shrink-0" />}
                        <span className="truncate">
                          {dl.type === 'pg_rams' ? 'RAMS/PG 1mo' : dl.type === 'vct' ? 'VCT Notice 2wk' : dl.type === 'bus' ? 'Bus 2wk' : 'AOR'}
                        </span>
                      </div>
                    ))}

                    {/* 3. Action Items */}
                    {day.tasks.slice(0, 2).map(t => (
                      <div
                        key={t.id}
                        className={`text-[9px] sm:text-[10px] p-0.5 rounded truncate flex items-center gap-1 ${
                          t.status === 'Completed'
                            ? 'line-through text-slate-400 bg-slate-50'
                            : 'bg-blue-50 text-blue-900 border border-blue-200'
                        }`}
                        title={`Task: ${t.title}`}
                      >
                        <CheckCircle2 className={`w-2.5 h-2.5 shrink-0 ${t.status === 'Completed' ? 'text-emerald-500' : 'text-blue-600'}`} />
                        <span className="truncate">{t.title}</span>
                      </div>
                    ))}
                    {day.tasks.length > 2 && (
                      <div className="text-[9px] text-slate-500 pl-1 font-semibold">
                        +{day.tasks.length - 2} more task(s)
                      </div>
                    )}
                  </div>

                  <div className="text-[9px] text-slate-400 text-right">
                    {/* Empty placeholder to keep bottom alignment */}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW FORMAT 2: AGENDA / CHRONOLOGICAL TIMELINE */}
      {viewFormat === 'agenda' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
              <span>Full Committee Timeline (Chronological Agenda)</span>
            </h2>
            <span className="text-xs text-slate-500">{filteredProgrammes.length} programmes active</span>
          </div>

          <div className="space-y-4">
            {filteredProgrammes.map(p => {
              const pTasks = tasks.filter(t => t.programmeId === p.id);
              const pDeadlines = statutoryDeadlines.filter(dl => dl.programmeId === p.id);

              return (
                <div
                  key={p.id}
                  className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                          {p.term || 'Term 1'}
                        </span>
                        {p.isAllHands && (
                          <span className="bg-purple-100 text-purple-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-300">
                            * All-Hands Event
                          </span>
                        )}
                        <h3
                          onClick={() => onOpenProgramme(p.id)}
                          className="font-bold text-base text-slate-900 hover:text-emerald-700 cursor-pointer transition"
                        >
                          {p.title}
                        </h3>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                          {formatSingaporeDateRange(p.startDate, p.endDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {p.venue}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenProgramme(p.id)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition self-start sm:self-center"
                    >
                      Open Programme Workspace
                    </button>
                  </div>

                  {/* Statutory Milestone Deadlines */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                    <div className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Statutory Pre-Event Lead Times & Deadlines:</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                      {pDeadlines.map((dl, dlIdx) => (
                        <div
                          key={dlIdx}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between"
                        >
                          <span className="font-bold text-slate-800 text-[11px]">{dl.label}</span>
                          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                            <span>Due: <strong>{dl.dateStr}</strong></span>
                            <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded font-semibold text-slate-700">
                              {dl.leadTime}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Programme Tasks */}
                  {pTasks.length > 0 && (
                    <div className="text-xs space-y-1.5 pt-1">
                      <div className="font-semibold text-slate-600 text-[11px]">Action Items ({pTasks.length}):</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {pTasks.map(t => (
                          <div
                            key={t.id}
                            className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <span className={`font-medium ${t.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {t.title}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              Due: {t.dueDate}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DAY INSPECTION MODAL / DRAWER (When a day is clicked) */}
      {selectedDayData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900">
                <CalendarIcon className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base">
                  Schedule Details: {formatSingaporeDate(selectedDayData.dateStr)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDateStr(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {selectedDayData.programmes.length === 0 &&
              selectedDayData.deadlines.length === 0 &&
              selectedDayData.tasks.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                <Info className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <p>No programmes or task deadlines scheduled on this date.</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* 1. Official Events on this Day */}
                {selectedDayData.programmes.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <FolderKanban className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Events Occurring Today:</span>
                    </div>
                    {selectedDayData.programmes.map(p => (
                      <div
                        key={p.id}
                        className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-950 text-sm">{p.title}</span>
                          <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded">
                            {p.term}
                          </span>
                        </div>
                        <div className="text-slate-600">Venue: {p.venue}</div>
                        <div className="text-slate-600">
                          Duration: {formatSingaporeDateRange(p.startDate, p.endDate)}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedDateStr(null);
                            onOpenProgramme(p.id);
                          }}
                          className="mt-2 px-3 py-1 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition"
                        >
                          Open Programme Workspace &rarr;
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Statutory Milestones Due Today */}
                {selectedDayData.deadlines.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Statutory Pre-Event Deadlines Due:</span>
                    </div>
                    {selectedDayData.deadlines.map((dl, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-950">{dl.label}</span>
                          <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded">
                            {dl.leadTime}
                          </span>
                        </div>
                        <div className="text-slate-600">
                          Programme: <strong>{dl.programmeTitle}</strong>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedDateStr(null);
                            onOpenProgramme(dl.programmeId);
                          }}
                          className="mt-1.5 px-3 py-1 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition"
                        >
                          View Planning Pack &rarr;
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Tasks Due Today */}
                {selectedDayData.tasks.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Action Items Due Today:</span>
                    </div>
                    {selectedDayData.tasks.map(t => (
                      <div
                        key={t.id}
                        className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <div className={`font-semibold ${t.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {t.title}
                          </div>
                          {t.notes && <div className="text-slate-500 text-[11px] mt-0.5">{t.notes}</div>}
                        </div>
                        <span className="text-[10px] font-bold bg-slate-200 px-2 py-0.5 rounded text-slate-700">
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedDateStr(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Programme Modal (available to any teacher) */}
      <CreateProgrammeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(newId) => onOpenProgramme(newId)}
      />
    </div>
  );
};
