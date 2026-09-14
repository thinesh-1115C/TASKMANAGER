import React, { useState } from 'react';
import { Task, TaskFilter, TaskList, ActiveTab, TaskStatus } from '../types';
import PomodoroTimer from './PomodoroTimer';
import {
  Inbox,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FolderKanban,
  Plus,
  CheckSquare,
  HardDrive,
  FileText,
  CalendarDays,
  Sparkles,
  ChevronRight,
  BarChart3,
} from 'lucide-react';

interface SidebarProps {
  tasks: Task[];
  lists: TaskList[];
  activeFilter: TaskFilter;
  onSelectFilter: (filter: TaskFilter) => void;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  onCreateList: (name: string) => void;
  workspaceToken: string | null;
  onRequestToken: () => void;
  onOpenWorkspaceHub: () => void;
  activeTab?: ActiveTab;
  onSelectTab?: (tab: ActiveTab) => void;
  focusedTaskId?: string | null;
  onSelectFocusedTask?: (taskId: string | null) => void;
  onToggleStatus?: (taskId: string, newStatus: TaskStatus) => void;
}

export default function Sidebar({
  tasks,
  lists,
  activeFilter,
  onSelectFilter,
  selectedCategory,
  onSelectCategory,
  onCreateList,
  workspaceToken,
  onRequestToken,
  onOpenWorkspaceHub,
  activeTab,
  onSelectTab,
  focusedTaskId,
  onSelectFocusedTask,
  onToggleStatus,
}: SidebarProps) {
  const [newListName, setNewListName] = useState('');
  const [showAddList, setShowAddList] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const totalCount = tasks.length;
  const todayCount = tasks.filter((t) => t.dueDate === todayStr && t.status !== 'completed').length;
  const upcomingCount = tasks.filter(
    (t) => t.dueDate && t.dueDate > todayStr && t.status !== 'completed'
  ).length;
  const urgentCount = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  const handleAddListSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListName.trim()) {
      onCreateList(newListName.trim());
      setNewListName('');
      setShowAddList(false);
    }
  };

  const navFilters: { filter: TaskFilter; label: string; icon: any; count: number; color?: string }[] = [
    { filter: 'all', label: 'All Tasks', icon: Inbox, count: totalCount },
    { filter: 'today', label: 'Today', icon: Calendar, count: todayCount, color: 'text-blue-600' },
    { filter: 'upcoming', label: 'Upcoming', icon: Clock, count: upcomingCount },
    { filter: 'urgent', label: 'Urgent', icon: AlertTriangle, count: urgentCount, color: 'text-rose-600' },
    { filter: 'completed', label: 'Completed', icon: CheckCircle2, count: completedCount, color: 'text-emerald-600' },
  ];

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col h-[calc(100vh-64px)] overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Main View Filters */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3">
            Views
          </span>
          {navFilters.map((item) => {
            const Icon = item.icon;
            const isActive = activeFilter === item.filter && selectedCategory === null && activeTab === 'tasks';
            return (
              <button
                key={item.filter}
                type="button"
                onClick={() => {
                  onSelectCategory(null);
                  onSelectFilter(item.filter);
                  if (onSelectTab && activeTab !== 'tasks') {
                    onSelectTab('tasks');
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${item.color || 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}

          {onSelectTab && (
            <button
              type="button"
              onClick={() => onSelectTab('dashboard')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>Dashboard</span>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-1.5 py-0.5 rounded-md">
                30d
              </span>
            </button>
          )}
        </div>

        {/* Categories / Lists */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-3 mb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Lists
            </span>
            <button
              type="button"
              onClick={() => setShowAddList(!showAddList)}
              className="text-slate-400 hover:text-blue-600 p-0.5 rounded transition-colors"
              title="New Category"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {showAddList && (
            <form onSubmit={handleAddListSubmit} className="px-2 mb-2">
              <input
                type="text"
                autoFocus
                placeholder="List name..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500"
              />
            </form>
          )}

          {lists.map((list) => {
            const isSelected = selectedCategory === list.name;
            const count = tasks.filter((t) => t.category === list.name).length;
            return (
              <button
                key={list.id}
                type="button"
                onClick={() => {
                  onSelectCategory(list.name);
                  if (onSelectTab && activeTab !== 'tasks') {
                    onSelectTab('tasks');
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isSelected && activeTab === 'tasks'
                    ? 'bg-blue-50 text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: list.color || '#3b82f6' }}
                  />
                  <span className="truncate">{list.name}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Pomodoro Focus Timer */}
        <PomodoroTimer
          tasks={tasks}
          focusedTaskId={focusedTaskId || null}
          onSelectFocusedTask={onSelectFocusedTask || (() => {})}
          onToggleStatus={onToggleStatus || (() => {})}
        />

        {/* Google Workspace Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-bold text-slate-800">Workspace</span>
            </div>
            {workspaceToken ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
            ) : (
              <span className="text-[10px] text-amber-600 font-semibold">Not Linked</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> Tasks
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-blue-600" /> Calendar
            </div>
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-amber-600" /> Drive
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" /> Docs
            </div>
          </div>

          <button
            type="button"
            onClick={workspaceToken ? onOpenWorkspaceHub : onRequestToken}
            className="w-full py-1.5 px-2.5 text-xs font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-xl transition-colors flex items-center justify-center gap-1 shadow-2xs"
          >
            {workspaceToken ? 'Open Workspace Hub' : 'Connect Workspace'}
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </aside>
  );
}
