import { useState } from 'react';
import { Task, GoogleCalendarEvent } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ExternalLink, Plus } from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  calendarEvents: GoogleCalendarEvent[];
  onSelectDate: (dateStr: string) => void;
  onEditTask: (task: Task) => void;
}

export default function CalendarView({
  tasks,
  calendarEvents,
  onSelectDate,
  onEditTask,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Map tasks and events by date "YYYY-MM-DD"
  const tasksByDate = new Map<string, Task[]>();
  tasks.forEach((task) => {
    if (task.dueDate) {
      const existing = tasksByDate.get(task.dueDate) || [];
      existing.push(task);
      tasksByDate.set(task.dueDate, existing);
    }
  });

  const eventsByDate = new Map<string, GoogleCalendarEvent[]>();
  calendarEvents.forEach((ev) => {
    let dateStr = '';
    if (ev.start.date) {
      dateStr = ev.start.date;
    } else if (ev.start.dateTime) {
      dateStr = ev.start.dateTime.split('T')[0];
    }
    if (dateStr) {
      const existing = eventsByDate.get(dateStr) || [];
      existing.push(ev);
      eventsByDate.set(dateStr, existing);
    }
  });

  const daysArray: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    daysArray.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    daysArray.push(day);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* Calendar Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {monthNames[month]} {year}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Today
          </button>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 hover:bg-slate-100 text-slate-600 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 hover:bg-slate-100 text-slate-600 transition-colors border-l border-slate-200"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-bold text-slate-500 py-2.5">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-[1px]">
        {daysArray.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="bg-slate-50/40 min-h-[110px]" />;
          }

          const monthPad = String(month + 1).padStart(2, '0');
          const dayPad = String(day).padStart(2, '0');
          const dateStr = `${year}-${monthPad}-${dayPad}`;

          const isToday = dateStr === todayStr;
          const dayTasks = tasksByDate.get(dateStr) || [];
          const dayEvents = eventsByDate.get(dateStr) || [];

          return (
            <div
              key={dateStr}
              className={`bg-white min-h-[120px] p-2 flex flex-col justify-between group transition-colors hover:bg-slate-50/70`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-700'
                  }`}
                >
                  {day}
                </span>

                <button
                  type="button"
                  onClick={() => onSelectDate(dateStr)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition-opacity"
                  title="Add task on this day"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Items for this date */}
              <div className="space-y-1 overflow-y-auto max-h-[85px] flex-1">
                {/* Google Calendar Events */}
                {dayEvents.map((ev) => (
                  <a
                    key={ev.id}
                    href={ev.htmlLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 truncate hover:bg-indigo-100"
                    title={`Google Calendar Event: ${ev.summary}`}
                  >
                    📅 {ev.summary}
                  </a>
                ))}

                {/* Tasks */}
                {dayTasks.map((t) => {
                  const isDone = t.status === 'completed';
                  return (
                    <div
                      key={t.id}
                      onClick={() => onEditTask(t)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate cursor-pointer transition-colors ${
                        isDone
                          ? 'line-through text-slate-400 bg-slate-100'
                          : t.priority === 'urgent'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : t.priority === 'high'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                      title={t.title}
                    >
                      • {t.title}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
