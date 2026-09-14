import React, { useState, useEffect } from 'react';
import { GoogleCalendarEvent, GoogleDriveFile, GoogleTaskItem } from '../types';
import {
  getGoogleTasks,
  getCalendarEvents,
  searchDriveFiles,
  createGoogleDocument,
  createCalendarEvent,
  createGoogleTask,
  updateGoogleTaskStatus,
} from '../services/googleWorkspace';
import {
  CheckSquare,
  Calendar as CalendarIcon,
  HardDrive,
  FileText,
  RefreshCw,
  ExternalLink,
  Plus,
  Search,
  CheckCircle2,
  Circle,
  Loader2,
  Lock,
  Sparkles,
} from 'lucide-react';

interface WorkspaceHubViewProps {
  token: string | null;
  onRequestToken: () => Promise<string | null>;
  onImportGoogleTask: (gTask: GoogleTaskItem) => void;
}

export default function WorkspaceHubView({
  token,
  onRequestToken,
  onImportGoogleTask,
}: WorkspaceHubViewProps) {
  const [activeSection, setActiveSection] = useState<'tasks' | 'calendar' | 'drive' | 'docs'>('tasks');

  // Data states
  const [googleTasks, setGoogleTasks] = useState<GoogleTaskItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [driveSearch, setDriveSearch] = useState('');

  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick inputs
  const [newGTaskTitle, setNewGTaskTitle] = useState('');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [createdDocUrl, setCreatedDocUrl] = useState<string | null>(null);
  const [newCalSummary, setNewCalSummary] = useState('');
  const [newCalDate, setNewCalDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (token) {
      loadSectionData(activeSection);
    }
  }, [token, activeSection]);

  const loadSectionData = async (section: 'tasks' | 'calendar' | 'drive' | 'docs') => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      if (section === 'tasks') {
        const tasks = await getGoogleTasks(token);
        setGoogleTasks(tasks);
      } else if (section === 'calendar') {
        const events = await getCalendarEvents(token);
        setCalendarEvents(events);
      } else if (section === 'drive') {
        const files = await searchDriveFiles(token, driveSearch);
        setDriveFiles(files);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data from Google Workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuickGTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newGTaskTitle.trim()) return;
    setLoading(true);
    try {
      const created = await createGoogleTask(token, { title: newGTaskTitle.trim() });
      setGoogleTasks([created, ...googleTasks]);
      setNewGTaskTitle('');
    } catch (err: any) {
      setError(err.message || 'Failed to create Google Task');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGTask = async (gTask: GoogleTaskItem) => {
    if (!token) return;
    const newStatus = gTask.status === 'completed' ? 'needsAction' : 'completed';
    // Optimistic
    setGoogleTasks(googleTasks.map((t) => (t.id === gTask.id ? { ...t, status: newStatus } : t)));
    try {
      await updateGoogleTaskStatus(token, gTask.id, newStatus);
    } catch (err: any) {
      // Revert on error
      setGoogleTasks(googleTasks.map((t) => (t.id === gTask.id ? { ...t, status: gTask.status } : t)));
      setError(err.message);
    }
  };

  const handleCreateQuickDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newDocTitle.trim()) return;
    setLoading(true);
    try {
      const doc = await createGoogleDocument(token, newDocTitle.trim(), 'Project & Task documentation');
      setCreatedDocUrl(doc.url);
      setNewDocTitle('');
    } catch (err: any) {
      setError(err.message || 'Failed to create Google Document');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuickCalEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newCalSummary.trim() || !newCalDate) return;
    setLoading(true);
    try {
      await createCalendarEvent(token, { summary: newCalSummary.trim(), date: newCalDate });
      setNewCalSummary('');
      await loadSectionData('calendar');
    } catch (err: any) {
      setError(err.message || 'Failed to create Calendar event');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-xl mx-auto shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Connect Google Workspace</h3>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Link your Google account to synchronize Google Tasks, schedule deadlines directly on Google
          Calendar, browse Google Drive files, and create linked Google Docs.
        </p>
        <button
          type="button"
          onClick={() => onRequestToken()}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
        >
          <Lock className="w-4 h-4" /> Authorize Workspace Access
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" /> Google Workspace Hub
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronized with Google Tasks, Calendar, Drive, and Docs
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadSectionData(activeSection)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 gap-2">
        <button
          type="button"
          onClick={() => setActiveSection('tasks')}
          className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-colors ${
            activeSection === 'tasks'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckSquare className="w-4 h-4" /> Google Tasks ({googleTasks.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('calendar')}
          className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-colors ${
            activeSection === 'calendar'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarIcon className="w-4 h-4" /> Google Calendar ({calendarEvents.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('drive')}
          className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-colors ${
            activeSection === 'drive'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HardDrive className="w-4 h-4" /> Google Drive ({driveFiles.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('docs')}
          className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-colors ${
            activeSection === 'docs'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" /> Google Docs
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
          {error}
        </div>
      )}

      {/* Section Content */}
      <div className="p-6">
        {/* GOOGLE TASKS SECTION */}
        {activeSection === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Your Google Tasks List</h3>
                <p className="text-xs text-slate-500">
                  Import tasks from your Google account directly into this applet or check them off.
                </p>
              </div>
            </div>

            {/* Quick add Google Task */}
            <form onSubmit={handleCreateQuickGTask} className="flex gap-2">
              <input
                type="text"
                placeholder="Add a new task to Google Tasks..."
                value={newGTaskTitle}
                onChange={(e) => setNewGTaskTitle(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={loading || !newGTaskTitle.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Task
              </button>
            </form>

            {/* Tasks list */}
            <div className="space-y-2 max-h-[450px] overflow-y-auto">
              {googleTasks.length === 0 && !loading ? (
                <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                  No tasks found in your primary Google Tasks list.
                </div>
              ) : (
                googleTasks.map((t) => {
                  const isDone = t.status === 'completed';
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-emerald-200 bg-white hover:bg-emerald-50/20 transition-all text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <button
                          type="button"
                          onClick={() => handleToggleGTask(t)}
                          className={isDone ? 'text-emerald-600' : 'text-slate-300 hover:text-emerald-600'}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 fill-emerald-50" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <span className={`font-semibold ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {t.title}
                          </span>
                          {t.notes && <p className="text-[11px] text-slate-500 truncate">{t.notes}</p>}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onImportGoogleTask(t)}
                        className="shrink-0 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                      >
                        Import to App
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* GOOGLE CALENDAR SECTION */}
        {activeSection === 'calendar' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Primary Google Calendar</h3>
              <p className="text-xs text-slate-500">Upcoming events synced from your calendar.</p>
            </div>

            {/* Quick add event */}
            <form onSubmit={handleCreateQuickCalEvent} className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Event summary..."
                value={newCalSummary}
                onChange={(e) => setNewCalSummary(e.target.value)}
                className="flex-1 min-w-[200px] px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500"
              />
              <input
                type="date"
                value={newCalDate}
                onChange={(e) => setNewCalDate(e.target.value)}
                className="px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={loading || !newCalSummary.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Schedule Event
              </button>
            </form>

            {/* Events list */}
            <div className="space-y-2 max-h-[450px] overflow-y-auto">
              {calendarEvents.length === 0 && !loading ? (
                <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                  No upcoming calendar events found.
                </div>
              ) : (
                calendarEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/20 transition-all text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">{ev.summary}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {ev.start?.dateTime
                          ? new Date(ev.start.dateTime).toLocaleString()
                          : ev.start?.date}
                      </p>
                    </div>

                    {ev.htmlLink && (
                      <a
                        href={ev.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* GOOGLE DRIVE SECTION */}
        {activeSection === 'drive' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Google Drive Files</h3>
              <p className="text-xs text-slate-500">Browse and search recent files in your Google Drive.</p>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search files by name..."
                  value={driveSearch}
                  onChange={(e) => setDriveSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadSectionData('drive')}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500"
                />
              </div>
              <button
                type="button"
                onClick={() => loadSectionData('drive')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Search
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[450px] overflow-y-auto">
              {driveFiles.map((f) => (
                <div
                  key={f.id}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/20 transition-all flex items-start justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">{f.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                      {f.mimeType}
                    </span>
                  </div>

                  <a
                    href={f.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:text-amber-800 p-1"
                    title="Open in Drive"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GOOGLE DOCS SECTION */}
        {activeSection === 'docs' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Google Docs Generator</h3>
              <p className="text-xs text-slate-500">
                Quickly create a new Google Doc for task specifications, project briefs, or meeting notes.
              </p>
            </div>

            <form onSubmit={handleCreateQuickDoc} className="flex gap-2">
              <input
                type="text"
                placeholder="Document title (e.g. Q4 Task Roadmap)..."
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={loading || !newDocTitle.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Create Doc
              </button>
            </form>

            {createdDocUrl && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Google Doc successfully created!</span>
                </div>
                <a
                  href={createdDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold inline-flex items-center gap-1 transition-colors"
                >
                  Open Document <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
