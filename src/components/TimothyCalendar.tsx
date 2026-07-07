import React, { useState, useMemo } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, MessageSquare, Clock, Star, MapPin } from 'lucide-react';
import { MemoryEntry } from '../types';

interface TimothyCalendarProps {
  entries: MemoryEntry[];
}

export const TimothyCalendar: React.FC<TimothyCalendarProps> = ({ entries }) => {
  // Reference date: July 2026
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 6, 7)); // 0-indexed month, so 6 is July
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(2026, 6, 21)); // Highlight July 21st by default if it has an event

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Month names
  const monthNames = [
    '1月 (January)',
    '2月 (February)',
    '3月 (March)',
    '4月 (April)',
    '5月 (May)',
    '6月 (June)',
    '7月 (July)',
    '8月 (August)',
    '9月 (September)',
    '10月 (October)',
    '11月 (November)',
    '12月 (December)',
  ];

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  // Handle month changes
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 6, 7)); // Jump back to July 2026 (the reference system time)
    setSelectedDate(new Date(2026, 6, 7));
  };

  // Helper to format Date to YYYY-MM-DD
  const formatDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Get calendar events grouped by YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map: Record<string, MemoryEntry[]> = {};
    entries.forEach((entry) => {
      // We only map events or items marked with 'テモテのカレンダー'
      if (entry.category === 'event' || entry.tags.includes('テモテのカレンダー')) {
        const dateStr = entry.occurred_at ? entry.occurred_at.split('T')[0] : entry.created_at.split('T')[0];
        if (!map[dateStr]) {
          map[dateStr] = [];
        }
        map[dateStr].push(entry);
      }
    });
    return map;
  }, [entries]);

  // Generate calendar days
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevTotalDays = new Date(year, month, 0).getDate();

    const cells = [];

    // Trailing days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevTotalDays - i);
      cells.push({
        date: d,
        day: prevTotalDays - i,
        isCurrentMonth: false,
        key: `prev-${prevTotalDays - i}`,
      });
    }

    // Days in current month
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      cells.push({
        date: d,
        day: i,
        isCurrentMonth: true,
        key: `curr-${i}`,
      });
    }

    // Leading days of next month to complete standard 6 rows (42 cells)
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({
        date: d,
        day: i,
        isCurrentMonth: false,
        key: `next-${i}`,
      });
    }

    return cells;
  }, [year, month]);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = formatDateString(selectedDate);
    return eventsByDate[dateStr] || [];
  }, [selectedDate, eventsByDate]);

  return (
    <div id="timothy-monthly-calendar" className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4.5 space-y-4">
      {/* Calendar Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-700 font-mono">
            {year}年 {monthNames[month]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-md hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
            title="前月"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="px-2 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold border border-indigo-200/50 transition-colors cursor-pointer"
          >
            今日 (7/7)
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-md hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
            title="翌月"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDays.map((wd, idx) => (
          <span
            key={idx}
            className={`text-[10px] font-bold py-1 ${
              idx === 0 ? 'text-rose-500' : idx === 6 ? 'text-sky-500' : 'text-slate-400'
            }`}
          >
            {wd}
          </span>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarCells.map((cell) => {
          const dateStr = formatDateString(cell.date);
          const dayEvents = eventsByDate[dateStr] || [];
          const hasEvents = dayEvents.length > 0;
          
          const isSelected = selectedDate && formatDateString(selectedDate) === dateStr;
          const isToday = dateStr === '2026-07-07'; // Match system mock date
          
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => setSelectedDate(cell.date)}
              className={`min-h-[38px] rounded-lg p-1 flex flex-col justify-between relative transition-all duration-150 border cursor-pointer ${
                cell.isCurrentMonth
                  ? 'bg-white text-slate-800 border-slate-100'
                  : 'bg-slate-100/50 text-slate-400 border-transparent'
              } ${
                isSelected
                  ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/20 shadow-xs scale-98'
                  : 'hover:bg-indigo-50/30 hover:border-slate-300'
              } ${
                isToday && !isSelected
                  ? 'border-teal-500 bg-teal-50/20 ring-1 ring-teal-500/10'
                  : ''
              }`}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-bold font-mono ${
                  isToday ? 'text-teal-600 underline decoration-2 underline-offset-2' : ''
                }`}>
                  {cell.day}
                </span>
                
                {/* Event count or small indicator */}
                {hasEvents && (
                  <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
                )}
              </div>

              {/* Little visual cues for events */}
              <div className="w-full flex items-center justify-start mt-0.5 overflow-hidden">
                {hasEvents && (
                  <div className="text-[7.5px] font-bold text-indigo-700 bg-indigo-100/70 px-1 rounded truncate max-w-full">
                    {dayEvents[0].summary}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day Agenda */}
      {selectedDate && (
        <div className="bg-white rounded-xl p-3 border border-indigo-100 shadow-3xs space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold text-indigo-800 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-indigo-500" />
              <span>
                {selectedDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })} の予定
              </span>
            </h4>
            <span className="text-[9px] font-semibold text-slate-400 font-mono">
              {selectedDateEvents.length}件のイベント
            </span>
          </div>

          {selectedDateEvents.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedDateEvents.map((evt) => (
                <div key={evt.id} className="bg-slate-50 p-2 rounded-lg border border-slate-100 hover:border-indigo-100 transition-colors text-[11px] space-y-1">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                      {evt.summary}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono bg-white px-1 py-0.2 rounded border">
                      {evt.occurred_at ? new Date(evt.occurred_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '時刻未指定'}
                    </span>
                  </div>
                  {evt.raw_input && (
                    <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed bg-white/50 p-1.5 rounded">
                      {evt.raw_input}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-[9px] text-slate-400">
                    <span className="flex items-center gap-0.5 text-indigo-600 font-semibold">
                      <Star className="h-2.5 w-2.5 fill-amber-300 text-amber-500" />
                      重要度: {evt.importance}
                    </span>
                    {evt.entities?.people?.length > 0 && (
                      <span className="truncate">👤 {evt.entities.people.join(', ')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 italic text-center py-2">
              この日に登録されているテモテの予定はありません。
            </p>
          )}
        </div>
      )}
    </div>
  );
};
