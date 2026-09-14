import React, { useState } from 'react';
import { Task, TaskPriority, TaskStatus } from '../types';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  MoreVertical,
  ExternalLink,
  FileText,
  HardDrive,
  CalendarCheck,
  CheckSquare,
  Trash2,
  Edit2,
  Tag,
  Timer,
} from 'lucide-react';

interface TaskCardProps {
  key?: string;
  task: Task;
  onToggleStatus: (taskId: string, newStatus: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  isFocused?: boolean;
  onFocus?: (task: Task) => void;
}

export default function TaskCard({
  task,
  onToggleStatus,
  onEdit,
  onDelete,
  isFocused,
  onFocus,
}: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const isCompleted = task.status === 'completed';

  const priorityStyles: Record<TaskPriority, { bg: string; text: string; label: string }> = {
    urgent: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', label: 'Urgent' },
    high: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'High' },
    medium: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'Medium' },
    low: { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600', label: 'Low' },
  };

  const getDueBadge = () => {
    if (!task.dueDate) return null;
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = !isCompleted && task.dueDate < today;
    const isToday = task.dueDate === today;

    let badgeClass = 'text-slate-500 bg-slate-100 border-slate-200';
    if (isOverdue) badgeClass = 'text-rose-700 bg-rose-50 border-rose-200 font-semibold';
    else if (isToday) badgeClass = 'text-amber-700 bg-amber-50 border-amber-200 font-semibold';

    return (
      <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs border ${badgeClass}`}>
        <Calendar className="w-3 h-3" />
        <span>
          {isToday ? 'Today' : isOverdue ? `Overdue: ${task.dueDate}` : task.dueDate}
          {task.dueTime ? ` at ${task.dueTime}` : ''}
        </span>
      </div>
    );
  };

  return (
    <div
      className={`group relative bg-white rounded-2xl border transition-all duration-200 p-4 shadow-xs hover:shadow-md ${
        isCompleted
          ? 'border-slate-200 bg-slate-50/70 opacity-80'
          : isFocused
          ? 'border-rose-300 ring-2 ring-rose-100 bg-rose-50/20 shadow-xs'
          : task.priority === 'urgent'
          ? 'border-rose-200 hover:border-rose-300'
          : 'border-slate-200 hover:border-blue-200'
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Completion Checkbox */}
        <button
          type="button"
          onClick={() => onToggleStatus(task.id, isCompleted ? 'todo' : 'completed')}
          className={`mt-0.5 shrink-0 transition-transform active:scale-90 ${
            isCompleted ? 'text-emerald-600' : 'text-slate-300 hover:text-blue-600'
          }`}
          title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 fill-emerald-50" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>

        {/* Content Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              onClick={() => onEdit(task)}
              className={`font-semibold text-sm leading-snug cursor-pointer hover:text-blue-600 transition-colors ${
                isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
              }`}
            >
              {task.title}
            </h4>

            {/* Action buttons */}
            <div className="flex items-center gap-0.5">
              {onFocus && !isCompleted && (
                <button
                  type="button"
                  onClick={() => onFocus(task)}
                  className={`p-1 rounded-md transition-colors ${
                    isFocused
                      ? 'text-rose-600 bg-rose-100/80 hover:bg-rose-200 opacity-100'
                      : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                  }`}
                  title={isFocused ? 'Currently linked to Pomodoro timer' : 'Start 25m Pomodoro Focus on this task'}
                >
                  <Timer className="w-4 h-4" />
                </button>
              )}

              {/* Menu button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showMenu && (
                  <div
                    onMouseLeave={() => setShowMenu(false)}
                    className="absolute right-0 top-6 w-36 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-20 text-xs"
                  >
                    {onFocus && !isCompleted && (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onFocus(task);
                        }}
                        className="w-full px-3 py-1.5 text-left text-rose-700 hover:bg-rose-50 flex items-center gap-2 font-medium"
                      >
                        <Timer className="w-3.5 h-3.5 text-rose-600" /> Focus (25m)
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onEdit(task);
                      }}
                      className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit Task
                    </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onToggleStatus(
                        task.id,
                        task.status === 'in_progress' ? 'todo' : 'in_progress'
                      );
                    }}
                    className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    {task.status === 'in_progress' ? 'Mark To Do' : 'In Progress'}
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(task.id);
                    }}
                    className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Badges: Category, Priority, Due Date */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {isFocused && !isCompleted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                <Timer className="w-3 h-3 text-rose-600" />
                Focused
              </span>
            )}

            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {task.category}
            </span>

            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                priorityStyles[task.priority].bg
              } ${priorityStyles[task.priority].text}`}
            >
              {priorityStyles[task.priority].label}
            </span>

            {getDueBadge()}

            {task.tags?.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 text-[11px] text-slate-500 font-medium"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
          </div>

          {/* GOOGLE WORKSPACE BADGES */}
          {(task.googleCalendarEventId ||
            task.googleTaskId ||
            (task.attachedDocs && task.attachedDocs.length > 0) ||
            (task.attachedDriveFiles && task.attachedDriveFiles.length > 0)) && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-slate-100">
              {/* Google Calendar Link */}
              {task.googleCalendarEventId && (
                <a
                  href={task.calendarEventUrl || 'https://calendar.google.com'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                  title="View on Google Calendar"
                >
                  <CalendarCheck className="w-3 h-3 text-blue-600" />
                  <span>Google Calendar</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              )}

              {/* Google Tasks Synced */}
              {task.googleTaskId && (
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200"
                  title="Synchronized with Google Tasks"
                >
                  <CheckSquare className="w-3 h-3 text-emerald-600" />
                  <span>Google Tasks</span>
                </span>
              )}

              {/* Attached Docs */}
              {task.attachedDocs?.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors max-w-[200px] truncate"
                  title={`Open Google Doc: ${doc.title}`}
                >
                  <FileText className="w-3 h-3 text-indigo-600 shrink-0" />
                  <span className="truncate">{doc.title}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                </a>
              ))}

              {/* Attached Drive Files */}
              {task.attachedDriveFiles?.map((file) => (
                <a
                  key={file.id}
                  href={file.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors max-w-[180px] truncate"
                  title={`Open Drive File: ${file.name}`}
                >
                  <HardDrive className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="truncate">{file.name}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
