import React, { useState, useEffect } from 'react';
import { Task, TaskPriority, TaskStatus, TaskList, DriveAttachment, DocAttachment } from '../types';
import { createCalendarEvent, createGoogleTask, createGoogleDocument } from '../services/googleWorkspace';
import { suggestCategoryWithGemini, CategorySuggestionResponse } from '../services/geminiService';
import DrivePickerModal from './DrivePickerModal';
import {
  X,
  Calendar,
  Clock,
  Tag,
  AlertCircle,
  HardDrive,
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  CheckSquare,
  Sparkles,
  Loader2,
  Check,
} from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<Task> & { title: string }) => Promise<void>;
  initialTask?: Task | null;
  lists: TaskList[];
  workspaceToken: string | null;
  onRequestWorkspaceToken: () => Promise<string | null>;
}

export default function TaskModal({
  isOpen,
  onClose,
  onSave,
  initialTask,
  lists,
  workspaceToken,
  onRequestWorkspaceToken,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState('Work');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Gemini AI Suggestion state
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<CategorySuggestionResponse | null>(null);
  const [autoSuggestOnSave, setAutoSuggestOnSave] = useState(true);
  const [isCategoryManuallySet, setIsCategoryManuallySet] = useState(false);

  // Workspace integration options
  const [syncWithGoogleTasks, setSyncWithGoogleTasks] = useState(false);
  const [syncWithCalendar, setSyncWithCalendar] = useState(false);
  const [attachedDocs, setAttachedDocs] = useState<DocAttachment[]>([]);
  const [attachedDriveFiles, setAttachedDriveFiles] = useState<DriveAttachment[]>([]);

  // Existing Workspace sync links
  const [googleCalendarEventId, setGoogleCalendarEventId] = useState<string | undefined>();
  const [calendarEventUrl, setCalendarEventUrl] = useState<string | undefined>();
  const [googleTaskId, setGoogleTaskId] = useState<string | undefined>();

  // Modals & loading states
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [creatingDoc, setCreatingDoc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || '');
      setDescription(initialTask.description || '');
      setStatus(initialTask.status || 'todo');
      setPriority(initialTask.priority || 'medium');
      setCategory(initialTask.category || 'Work');
      setDueDate(initialTask.dueDate || '');
      setDueTime(initialTask.dueTime || '');
      setTags(initialTask.tags || []);
      setAttachedDocs(initialTask.attachedDocs || []);
      setAttachedDriveFiles(initialTask.attachedDriveFiles || []);
      setGoogleCalendarEventId(initialTask.googleCalendarEventId);
      setCalendarEventUrl(initialTask.calendarEventUrl);
      setGoogleTaskId(initialTask.googleTaskId);
      setSyncWithGoogleTasks(Boolean(initialTask.googleTaskId));
      setSyncWithCalendar(Boolean(initialTask.googleCalendarEventId));
      setIsCategoryManuallySet(true);
      setAutoSuggestOnSave(false);
      setAiSuggestion(null);
    } else {
      setTitle('');
      setDescription('');
      setStatus('todo');
      setPriority('medium');
      setCategory(lists[0]?.name || 'Work');
      setDueDate(new Date().toISOString().split('T')[0]);
      setDueTime('');
      setTags([]);
      setAttachedDocs([]);
      setAttachedDriveFiles([]);
      setGoogleCalendarEventId(undefined);
      setCalendarEventUrl(undefined);
      setGoogleTaskId(undefined);
      setSyncWithGoogleTasks(false);
      setSyncWithCalendar(false);
      setIsCategoryManuallySet(false);
      setAutoSuggestOnSave(true);
      setAiSuggestion(null);
    }
    setError(null);
  }, [initialTask, isOpen, lists]);

  if (!isOpen) return null;

  const handleSuggestWithGemini = async (silent = false) => {
    if (!title.trim()) {
      if (!silent) setError('Please enter a task title first so Gemini can analyze it.');
      return;
    }

    setIsSuggestingCategory(true);
    if (!silent) setError(null);

    try {
      const existingCatNames = lists.map((l) => l.name);
      const result = await suggestCategoryWithGemini(title, description, existingCatNames);
      setAiSuggestion(result);

      if (result.category) {
        setCategory(result.category);
        setIsCategoryManuallySet(true);
      }

      if (result.tags && result.tags.length > 0) {
        setTags((prev) => Array.from(new Set([...prev, ...result.tags])));
      }
    } catch (err: any) {
      console.warn('Gemini category suggestion notice:', err);
      if (!silent) {
        setError(err.message || 'Gemini suggestion is currently unavailable.');
      }
    } finally {
      setIsSuggestingCategory(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const clean = tagInput.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleAddQuickTag = (tagToAdd: string) => {
    if (!tags.includes(tagToAdd)) {
      setTags([...tags, tagToAdd]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleCreateGoogleDoc = async () => {
    if (!title.trim()) {
      setError('Please provide a task title first to name the Google Doc.');
      return;
    }

    let token = workspaceToken;
    if (!token) {
      token = await onRequestWorkspaceToken();
      if (!token) return;
    }

    setCreatingDoc(true);
    setError(null);
    try {
      const docTitle = `[Task] ${title.trim()}`;
      const docInfo = await createGoogleDocument(token, docTitle, description);
      setAttachedDocs((prev) => [...prev, { id: docInfo.documentId, title: docInfo.title, url: docInfo.url }]);
    } catch (err: any) {
      setError(err.message || 'Failed to create Google Doc.');
    } finally {
      setCreatingDoc(false);
    }
  };

  const handleOpenDrivePicker = async () => {
    let token = workspaceToken;
    if (!token) {
      token = await onRequestWorkspaceToken();
      if (!token) return;
    }
    setIsDrivePickerOpen(true);
  };

  const handleRemoveDoc = (id: string) => {
    setAttachedDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const handleRemoveDriveFile = (id: string) => {
    setAttachedDriveFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let finalCategory = category;
      let finalTags = [...tags];

      // Auto-analyze with Gemini on save if enabled and category wasn't manually overridden or user wants it
      if (autoSuggestOnSave && title.trim() && (!isCategoryManuallySet || !aiSuggestion)) {
        try {
          const existingCatNames = lists.map((l) => l.name);
          const aiResult = await suggestCategoryWithGemini(title, description, existingCatNames);
          if (aiResult.category) {
            finalCategory = aiResult.category;
          }
          if (aiResult.tags && aiResult.tags.length > 0) {
            finalTags = Array.from(new Set([...finalTags, ...aiResult.tags]));
          }
        } catch (aiErr) {
          console.warn('Gemini categorization on save notice:', aiErr);
        }
      }

      let finalCalendarEventId = googleCalendarEventId;
      let finalCalendarUrl = calendarEventUrl;
      let finalGoogleTaskId = googleTaskId;

      // Handle Google Calendar sync
      if (syncWithCalendar && !finalCalendarEventId && dueDate) {
        let token = workspaceToken;
        if (!token) {
          token = await onRequestWorkspaceToken();
        }
        if (token) {
          try {
            const calResult = await createCalendarEvent(token, {
              summary: title.trim(),
              description: description.trim(),
              date: dueDate,
              time: dueTime || undefined,
            });
            finalCalendarEventId = calResult.id;
            finalCalendarUrl = calResult.htmlLink;
          } catch (calErr: any) {
            console.warn('Calendar sync warning:', calErr);
          }
        }
      }

      // Handle Google Tasks sync
      if (syncWithGoogleTasks && !finalGoogleTaskId) {
        let token = workspaceToken;
        if (!token) {
          token = await onRequestWorkspaceToken();
        }
        if (token) {
          try {
            const gTaskResult = await createGoogleTask(token, {
              title: title.trim(),
              notes: description.trim(),
              due: dueDate ? `${dueDate}T${dueTime || '12:00'}:00Z` : undefined,
            });
            finalGoogleTaskId = gTaskResult.id;
          } catch (gTaskErr: any) {
            console.warn('Google Tasks sync warning:', gTaskErr);
          }
        }
      }

      await onSave({
        id: initialTask?.id,
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        category: finalCategory,
        dueDate: dueDate || undefined,
        dueTime: dueTime || undefined,
        tags: finalTags,
        attachedDocs,
        attachedDriveFiles,
        googleCalendarEventId: finalCalendarEventId,
        calendarEventUrl: finalCalendarUrl,
        googleTaskId: finalGoogleTaskId,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save task.');
    } finally {
      setSaving(false);
    }
  };

  const priorityOptions: { key: TaskPriority; label: string; color: string }[] = [
    { key: 'urgent', label: 'Urgent', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    { key: 'high', label: 'High', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { key: 'medium', label: 'Medium', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { key: 'low', label: 'Low', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg">
              {initialTask ? 'Edit Task' : 'Create New Task'}
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Task Title *
                </label>
                <button
                  type="button"
                  onClick={() => handleSuggestWithGemini(false)}
                  disabled={!title.trim() || isSuggestingCategory}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:pointer-events-none rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                  title="Use Gemini API to analyze title and description and suggest the best category tag"
                >
                  {isSuggestingCategory ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                  <span>{isSuggestingCategory ? 'Analyzing with Gemini...' : 'AI Suggest Category'}</span>
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 text-base font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400 text-slate-800"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Description & Notes
              </label>
              <textarea
                rows={3}
                placeholder="Add context, specifications, or checklist items..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400 text-slate-700"
              />
            </div>

            {/* Gemini Recommendation Banner (when available) */}
            {aiSuggestion && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 border border-indigo-200 text-xs space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Gemini AI Suggestion</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" /> Auto-Applied
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  Best Category: <strong className="text-indigo-950 font-bold">{aiSuggestion.category}</strong>
                  {aiSuggestion.tags && aiSuggestion.tags.length > 0 && (
                    <> • Suggested Tags: <span className="font-semibold text-indigo-800">{aiSuggestion.tags.map((t) => `#${t}`).join(' ')}</span></>
                  )}
                </p>
                {aiSuggestion.reasoning && (
                  <p className="text-[11px] text-slate-500 italic">
                    "{aiSuggestion.reasoning}"
                  </p>
                )}
              </div>
            )}

            {/* Priority & Status & Category */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Priority
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {priorityOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setPriority(opt.key)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border text-center transition-all ${
                        priority === opt.key
                          ? `${opt.color} ring-2 ring-slate-700 font-semibold shadow-xs`
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 text-slate-800 font-medium"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Category / List
                  </label>
                  {aiSuggestion?.category === category && (
                    <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> AI
                    </span>
                  )}
                </div>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setIsCategoryManuallySet(true);
                  }}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 text-slate-800 font-medium"
                >
                  {lists.map((list) => (
                    <option key={list.id} value={list.name}>
                      {list.name}
                    </option>
                  ))}
                  {!lists.some((l) => l.name === category) && (
                    <option value={category}>{category}</option>
                  )}
                </select>
              </div>
            </div>

            {/* Due Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Due Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Due Time (Optional)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Tags
                </label>
                {aiSuggestion?.tags && (
                  <span className="text-[10px] text-slate-400">
                    Click suggested tags to add
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-slate-400 hover:text-slate-600 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Quick-add unadded AI suggested tags */}
              {aiSuggestion?.tags && aiSuggestion.tags.filter((t) => !tags.includes(t)).length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mb-2.5 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100">
                  <span className="text-[11px] font-semibold text-indigo-700 flex items-center gap-1 mr-1">
                    <Sparkles className="w-3 h-3" /> Add AI Tag:
                  </span>
                  {aiSuggestion.tags
                    .filter((t) => !tags.includes(t))
                    .map((sTag) => (
                      <button
                        key={sTag}
                        type="button"
                        onClick={() => handleAddQuickTag(sTag)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5" /> #{sTag}
                      </button>
                    ))}
                </div>
              )}

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Add a tag and press Enter (e.g. client, urgent, v1)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 text-slate-800"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* GOOGLE WORKSPACE INTEGRATIONS SECTION */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-bold text-slate-800">Google Workspace Integrations</h4>
                </div>
                <span className="text-xs text-slate-500">Sync with Tasks, Calendar, Drive & Docs</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {/* Google Calendar Checkbox */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={syncWithCalendar}
                    onChange={(e) => setSyncWithCalendar(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs font-semibold text-slate-800">Google Calendar</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {googleCalendarEventId
                        ? 'Event scheduled on calendar'
                        : 'Schedule deadline directly on Calendar'}
                    </p>
                    {calendarEventUrl && (
                      <a
                        href={calendarEventUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-1 font-medium"
                      >
                        View in Google Calendar <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </label>

                {/* Google Tasks Checkbox */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={syncWithGoogleTasks}
                    onChange={(e) => setSyncWithGoogleTasks(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-xs font-semibold text-slate-800">Google Tasks</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {googleTaskId ? 'Synced with Google Tasks' : 'Synchronize with your Google Tasks list'}
                    </p>
                  </div>
                </label>
              </div>

              {/* Google Docs & Google Drive Action Buttons */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCreateGoogleDoc}
                    disabled={creatingDoc}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {creatingDoc ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    Create Google Doc for Task
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenDrivePicker}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-amber-600" />
                    Attach Google Drive Files
                  </button>
                </div>

                {/* Attached Docs */}
                {attachedDocs.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Linked Google Docs:
                    </span>
                    {attachedDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-blue-50/50 border border-blue-100 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="font-medium text-slate-800 truncate">{doc.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Open Google Doc"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(doc.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Attached Drive Files */}
                {attachedDriveFiles.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Attached Drive Files:
                    </span>
                    {attachedDriveFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 border border-amber-100 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <HardDrive className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="font-medium text-slate-800 truncate">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-700 hover:text-amber-900 p-1"
                            title="Open in Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveDriveFile(file.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              {/* Auto-suggest toggle on save */}
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSuggestOnSave}
                  onChange={(e) => setAutoSuggestOnSave(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <span className="inline-flex items-center gap-1 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Auto-suggest category & tags on save
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {initialTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Drive Picker Modal */}
      <DrivePickerModal
        isOpen={isDrivePickerOpen}
        onClose={() => setIsDrivePickerOpen(false)}
        token={workspaceToken}
        onSelectFiles={(files) => {
          setAttachedDriveFiles(files);
        }}
        alreadySelected={attachedDriveFiles}
      />
    </>
  );
}
