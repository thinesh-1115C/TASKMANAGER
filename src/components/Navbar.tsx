import { useState } from 'react';
import { ActiveTab } from '../types';
import { User } from 'firebase/auth';
import {
  CheckCircle,
  List,
  Kanban,
  Calendar,
  Sparkles,
  BarChart3,
  Plus,
  Search,
  LogIn,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenNewTaskModal: () => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isWorkspaceConnected: boolean;
}

export default function Navbar({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  onOpenNewTaskModal,
  user,
  onSignIn,
  onSignOut,
  isWorkspaceConnected,
}: NavbarProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const tabs: { id: ActiveTab; label: string; icon: any }[] = [
    { id: 'tasks', label: 'Tasks', icon: List },
    { id: 'kanban', label: 'Board', icon: Kanban },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'workspace_hub', label: 'Workspace Hub', icon: Sparkles },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-2xs">
      {/* Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
          <CheckCircle className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div>
          <h1 className="font-bold text-slate-900 text-base leading-tight tracking-tight">
            Task Manager
          </h1>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isWorkspaceConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span className="text-[10px] text-slate-400 font-medium">
              {isWorkspaceConnected ? 'Workspace Connected' : 'Local Storage'}
            </span>
          </div>
        </div>
      </div>

      {/* Center View Selector Tabs */}
      <nav className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right Controls: Search, New Task, Auth */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden lg:block w-48 xl:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all text-slate-800"
          />
        </div>

        {/* New Task Button */}
        <button
          type="button"
          onClick={onOpenNewTaskModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Task</span>
        </button>

        {/* User Auth Profile / Login */}
        {user ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}
            </button>

            {showProfileMenu && (
              <div
                onMouseLeave={() => setShowProfileMenu(false)}
                className="absolute right-0 top-11 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 text-xs"
              >
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="font-semibold text-slate-800 truncate">
                    {user.displayName || 'Google User'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onSignOut();
                  }}
                  className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors"
          >
            <LogIn className="w-3.5 h-3.5 text-blue-600" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
