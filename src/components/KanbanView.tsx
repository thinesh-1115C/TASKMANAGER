import { Task, TaskStatus } from '../types';
import TaskCard from './TaskCard';
import { Plus, ListTodo, Clock, CheckCircle } from 'lucide-react';

interface KanbanViewProps {
  tasks: Task[];
  onToggleStatus: (taskId: string, newStatus: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onAddNewWithStatus: (status: TaskStatus) => void;
  focusedTaskId?: string | null;
  onFocusTask?: (task: Task) => void;
}

export default function KanbanView({
  tasks,
  onToggleStatus,
  onEdit,
  onDelete,
  onAddNewWithStatus,
  focusedTaskId,
  onFocusTask,
}: KanbanViewProps) {
  const columns: { status: TaskStatus; title: string; icon: any; color: string; countColor: string }[] = [
    {
      status: 'todo',
      title: 'To Do',
      icon: ListTodo,
      color: 'border-slate-200 bg-slate-100/70',
      countColor: 'bg-slate-200 text-slate-700',
    },
    {
      status: 'in_progress',
      title: 'In Progress',
      icon: Clock,
      color: 'border-amber-200 bg-amber-50/40',
      countColor: 'bg-amber-100 text-amber-800',
    },
    {
      status: 'completed',
      title: 'Completed',
      icon: CheckCircle,
      color: 'border-emerald-200 bg-emerald-50/40',
      countColor: 'bg-emerald-100 text-emerald-800',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status);
        const Icon = col.icon;

        return (
          <div
            key={col.status}
            className={`rounded-2xl border p-4 flex flex-col max-h-[calc(100vh-200px)] min-h-[500px] ${col.color}`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-sm text-slate-800">{col.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${col.countColor}`}>
                  {colTasks.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onAddNewWithStatus(col.status)}
                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors"
                title={`Add task to ${col.title}`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Task list container */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {colTasks.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-300 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">No tasks in this column</p>
                  <button
                    type="button"
                    onClick={() => onAddNewWithStatus(col.status)}
                    className="mt-2 text-xs text-blue-600 font-semibold hover:underline"
                  >
                    + Add a task
                  </button>
                </div>
              ) : (
                colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleStatus={onToggleStatus}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isFocused={focusedTaskId === task.id}
                    onFocus={onFocusTask}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
