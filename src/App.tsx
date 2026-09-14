import { useState, useEffect, useMemo } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, createGoogleAuthProvider } from './firebase';
import {
  subscribeTasks,
  subscribeTaskLists,
  saveTask,
  updateTaskStatus,
  removeTask,
  createCustomList,
} from './services/taskService';
import {
  getStoredWorkspaceToken,
  saveStoredWorkspaceToken,
  clearWorkspaceToken,
  requestWorkspaceToken,
  getCalendarEvents,
  createGoogleTask,
} from './services/googleWorkspace';
import { Task, TaskList, TaskFilter, ActiveTab, TaskStatus, GoogleCalendarEvent, GoogleTaskItem } from './types';
import { suggestCategoryWithGemini } from './services/geminiService';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import TaskCard from './components/TaskCard';
import KanbanView from './components/KanbanView';
import CalendarView from './components/CalendarView';
import WorkspaceHubView from './components/WorkspaceHubView';
import DashboardView from './components/DashboardView';
import TaskModal from './components/TaskModal';
import { Plus, CheckSquare, Sparkles, Filter, AlertCircle, RefreshCw } from 'lucide-react';

const dayMs = 86400000;
const now = Date.now();

const INITIAL_LOCAL_TASKS: Task[] = [
  {
    id: 'demo-1',
    userId: 'guest',
    title: 'Review Q4 Project Deliverables & Roadmap',
    description: 'Review milestones with team and prepare presentation deck for stakeholders.',
    status: 'in_progress',
    priority: 'high',
    category: 'Work',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '14:30',
    tags: ['roadmap', 'q4', 'leadership'],
    createdAt: new Date(now - 7 * dayMs).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    userId: 'guest',
    title: 'Synchronize Google Tasks with Sprint Backlog',
    description: 'Verify all sprint items have corresponding entries in Google Workspace.',
    status: 'todo',
    priority: 'urgent',
    category: 'Work',
    dueDate: new Date(now + dayMs).toISOString().split('T')[0],
    tags: ['google-tasks', 'sprint'],
    createdAt: new Date(now - 3 * dayMs).toISOString(),
    updatedAt: new Date(now - 3 * dayMs).toISOString(),
  },
  {
    id: 'demo-3',
    userId: 'guest',
    title: 'Research UI Typography and Design System',
    description: 'Explore modern typography pairs and refine spacing system.',
    status: 'completed',
    priority: 'medium',
    category: 'Projects',
    dueDate: new Date(now - dayMs).toISOString().split('T')[0],
    tags: ['design', 'ui'],
    createdAt: new Date(now - 5 * dayMs).toISOString(),
    updatedAt: new Date(now - dayMs).toISOString(),
  },
  {
    id: 'demo-4',
    userId: 'guest',
    title: 'Complete Weekly Workout & Mobility Routine',
    description: 'Morning core exercise and recovery session.',
    status: 'completed',
    priority: 'low',
    category: 'Personal',
    dueDate: new Date(now - 3 * dayMs).toISOString().split('T')[0],
    tags: ['fitness', 'health'],
    createdAt: new Date(now - 6 * dayMs).toISOString(),
    updatedAt: new Date(now - 3 * dayMs).toISOString(),
  },
  {
    id: 'demo-5',
    userId: 'guest',
    title: 'Read Gemini Multi-Modal API Architecture Docs',
    description: 'Review streaming response patterns and structured JSON schema output.',
    status: 'completed',
    priority: 'high',
    category: 'Learning',
    dueDate: new Date(now - 8 * dayMs).toISOString().split('T')[0],
    tags: ['ai', 'gemini', 'api'],
    createdAt: new Date(now - 12 * dayMs).toISOString(),
    updatedAt: new Date(now - 8 * dayMs).toISOString(),
  },
  {
    id: 'demo-6',
    userId: 'guest',
    title: 'Deploy Production Release 2.4 to Staging',
    description: 'Run integration smoke tests and deploy via CI/CD pipeline.',
    status: 'completed',
    priority: 'urgent',
    category: 'Work',
    dueDate: new Date(now - 14 * dayMs).toISOString().split('T')[0],
    tags: ['release', 'devops'],
    createdAt: new Date(now - 18 * dayMs).toISOString(),
    updatedAt: new Date(now - 14 * dayMs).toISOString(),
  },
  {
    id: 'demo-7',
    userId: 'guest',
    title: 'Design Dark Mode Color Theme Tokens',
    description: 'Audit WCAG AA color contrast across neutral color palettes.',
    status: 'completed',
    priority: 'medium',
    category: 'Projects',
    dueDate: new Date(now - 20 * dayMs).toISOString().split('T')[0],
    tags: ['design-tokens', 'accessibility'],
    createdAt: new Date(now - 24 * dayMs).toISOString(),
    updatedAt: new Date(now - 20 * dayMs).toISOString(),
  },
];

const INITIAL_LOCAL_LISTS: TaskList[] = [
  { id: 'l-1', userId: 'guest', name: 'Work', color: '#3b82f6', createdAt: new Date().toISOString() },
  { id: 'l-2', userId: 'guest', name: 'Personal', color: '#10b981', createdAt: new Date().toISOString() },
  { id: 'l-3', userId: 'guest', name: 'Projects', color: '#8b5cf6', createdAt: new Date().toISOString() },
  { id: 'l-4', userId: 'guest', name: 'Learning', color: '#f59e0b', createdAt: new Date().toISOString() },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [workspaceToken, setWorkspaceToken] = useState<string | null>(getStoredWorkspaceToken());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lists, setLists] = useState<TaskList[]>(INITIAL_LOCAL_LISTS);
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);

  // Navigation & Filtering State
  const [activeTab, setActiveTab] = useState<ActiveTab>('tasks');
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Active Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

  // 1. Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        // Fallback to local guest tasks
        const saved = localStorage.getItem('tm_local_tasks');
        if (saved) {
          try {
            setTasks(JSON.parse(saved));
          } catch {
            setTasks(INITIAL_LOCAL_TASKS);
          }
        } else {
          setTasks(INITIAL_LOCAL_TASKS);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore synchronization when user is signed in
  useEffect(() => {
    if (!user) return;

    const unsubTasks = subscribeTasks(
      user.uid,
      (fetchedTasks) => {
        setTasks(fetchedTasks);
      },
      (err) => {
        console.warn('Firestore subscription warning:', err);
      }
    );

    const unsubLists = subscribeTaskLists(user.uid, (fetchedLists) => {
      if (fetchedLists.length > 0) {
        setLists(fetchedLists);
      }
    });

    return () => {
      unsubTasks();
      unsubLists();
    };
  }, [user]);

  // 3. Save local guest tasks if not signed in
  useEffect(() => {
    if (!user && tasks.length > 0) {
      localStorage.setItem('tm_local_tasks', JSON.stringify(tasks));
    }
  }, [tasks, user]);

  // 4. Fetch Google Calendar events when workspaceToken is ready
  useEffect(() => {
    if (!workspaceToken) return;
    getCalendarEvents(workspaceToken)
      .then((events) => setCalendarEvents(events))
      .catch((err) => console.warn('Could not fetch Google Calendar events:', err));
  }, [workspaceToken]);

  // Handlers for Google Sign-in & Workspace Auth
  const handleSignIn = async () => {
    setAuthError(null);
    try {
      const provider = createGoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // Try to extract OAuth access token
      const credential: any = (result as any)._tokenResponse || {};
      const oauthAccessToken = credential?.oauthAccessToken;
      if (oauthAccessToken) {
        saveStoredWorkspaceToken(oauthAccessToken);
        setWorkspaceToken(oauthAccessToken);
      } else {
        // Check if existing token exists or prompt via GSI
        const currentToken = getStoredWorkspaceToken();
        if (currentToken) {
          setWorkspaceToken(currentToken);
        }
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setAuthError(err.message || 'Google sign-in failed');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    clearWorkspaceToken();
    setWorkspaceToken(null);
    setUser(null);
  };

  const handleRequestWorkspaceToken = async (): Promise<string | null> => {
    setAuthError(null);
    try {
      const token = await requestWorkspaceToken(true);
      setWorkspaceToken(token);
      return token;
    } catch (err: any) {
      console.error('Failed to request Google Workspace token:', err);
      setAuthError(err.message || 'Failed to authorize Google Workspace.');
      return null;
    }
  };

  // Task Operations
  const handleSaveTask = async (taskData: Partial<Task> & { title: string }) => {
    if (user) {
      await saveTask(user.uid, taskData);
    } else {
      // Local mode
      if (taskData.id) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskData.id
              ? ({
                  ...t,
                  ...taskData,
                  updatedAt: new Date().toISOString(),
                } as Task)
              : t
          )
        );
      } else {
        const newTask: Task = {
          id: `local-${Date.now()}`,
          userId: 'guest',
          title: taskData.title,
          description: taskData.description || '',
          status: taskData.status || 'todo',
          priority: taskData.priority || 'medium',
          category: taskData.category || 'Work',
          dueDate: taskData.dueDate,
          dueTime: taskData.dueTime,
          tags: taskData.tags || [],
          attachedDocs: taskData.attachedDocs || [],
          attachedDriveFiles: taskData.attachedDriveFiles || [],
          googleCalendarEventId: taskData.googleCalendarEventId,
          calendarEventUrl: taskData.calendarEventUrl,
          googleTaskId: taskData.googleTaskId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setTasks((prev) => [newTask, ...prev]);
      }
    }
  };

  const handleToggleStatus = async (taskId: string, newStatus: TaskStatus) => {
    if (user) {
      await updateTaskStatus(user.uid, taskId, newStatus);
    } else {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: newStatus, updatedAt: new Date().toISOString() }
            : t
        )
      );
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (user) {
      await removeTask(user.uid, taskId);
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
  };

  const handleCreateList = async (name: string) => {
    if (user) {
      await createCustomList(user.uid, name);
    } else {
      const newList: TaskList = {
        id: `list-${Date.now()}`,
        userId: 'guest',
        name,
        color: '#3b82f6',
        createdAt: new Date().toISOString(),
      };
      setLists((prev) => [...prev, newList]);
    }
  };

  const handleImportGoogleTask = async (gTask: GoogleTaskItem) => {
    let suggestedCat = 'Work';
    let suggestedTags: string[] = [];
    try {
      const existingCatNames = lists.map((l) => l.name);
      const aiRes = await suggestCategoryWithGemini(gTask.title, gTask.notes || '', existingCatNames);
      if (aiRes.category) suggestedCat = aiRes.category;
      if (aiRes.tags) suggestedTags = aiRes.tags;
    } catch (e) {
      console.warn('Gemini categorization for imported task notice:', e);
    }

    const taskData: Partial<Task> & { title: string } = {
      title: gTask.title,
      description: gTask.notes || 'Imported from Google Tasks',
      status: gTask.status === 'completed' ? 'completed' : 'todo',
      priority: 'medium',
      category: suggestedCat,
      tags: suggestedTags,
      googleTaskId: gTask.id,
      dueDate: gTask.due ? gTask.due.split('T')[0] : undefined,
    };
    await handleSaveTask(taskData);
  };

  // Filter & Search computation
  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return tasks.filter((task) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = task.description?.toLowerCase().includes(q);
        const matchesTag = task.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesTag) return false;
      }

      // 2. Category Filter
      if (selectedCategory && task.category !== selectedCategory) {
        return false;
      }

      // 3. View Filter
      if (activeFilter === 'today') {
        return task.dueDate === todayStr;
      }
      if (activeFilter === 'upcoming') {
        return task.dueDate && task.dueDate > todayStr && task.status !== 'completed';
      }
      if (activeFilter === 'urgent') {
        return task.priority === 'urgent' && task.status !== 'completed';
      }
      if (activeFilter === 'completed') {
        return task.status === 'completed';
      }

      return true;
    });
  }, [tasks, searchQuery, selectedCategory, activeFilter]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenNewTaskModal={() => {
          setEditingTask(null);
          setIsModalOpen(true);
        }}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        isWorkspaceConnected={Boolean(workspaceToken)}
      />

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          tasks={tasks}
          lists={lists}
          activeFilter={activeFilter}
          onSelectFilter={setActiveFilter}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onCreateList={handleCreateList}
          workspaceToken={workspaceToken}
          onRequestToken={handleRequestWorkspaceToken}
          onOpenWorkspaceHub={() => setActiveTab('workspace_hub')}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          focusedTaskId={focusedTaskId}
          onSelectFocusedTask={setFocusedTaskId}
          onToggleStatus={handleToggleStatus}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Auth Notification or Alert */}
            {authError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{authError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthError(null)}
                  className="font-bold underline ml-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* TAB 1: Task List View */}
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                {/* View Header */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 capitalize">
                      {selectedCategory ? `${selectedCategory} Tasks` : `${activeFilter} Tasks`}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'} found
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTask(null);
                        setIsModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add Task
                    </button>
                  </div>
                </div>

                {/* Task Cards */}
                {filteredTasks.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <CheckSquare className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">No tasks found</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {searchQuery
                        ? 'No tasks matched your search query.'
                        : 'There are no tasks in this view yet. Click below to add your first task.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTask(null);
                        setIsModalOpen(true);
                      }}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Create Task
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggleStatus={handleToggleStatus}
                        onEdit={(t) => {
                          setEditingTask(t);
                          setIsModalOpen(true);
                        }}
                        onDelete={handleDeleteTask}
                        isFocused={focusedTaskId === task.id}
                        onFocus={(t) => setFocusedTaskId(t.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Kanban Board View */}
            {activeTab === 'kanban' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Task Board</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Visual workflow across To Do, In Progress, and Completed states
                    </p>
                  </div>
                </div>

                <KanbanView
                  tasks={filteredTasks}
                  onToggleStatus={handleToggleStatus}
                  onEdit={(t) => {
                    setEditingTask(t);
                    setIsModalOpen(true);
                  }}
                  onDelete={handleDeleteTask}
                  focusedTaskId={focusedTaskId}
                  onFocusTask={(t) => setFocusedTaskId(t.id)}
                  onAddNewWithStatus={(status) => {
                    setEditingTask({
                      id: '',
                      userId: user?.uid || 'guest',
                      title: '',
                      status,
                      priority: 'medium',
                      category: selectedCategory || 'Work',
                      tags: [],
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    });
                    setIsModalOpen(true);
                  }}
                />
              </div>
            )}

            {/* TAB 3: Calendar View */}
            {activeTab === 'calendar' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Schedule & Calendar</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Monthly overview mapping task deadlines with Google Calendar events
                    </p>
                  </div>
                </div>

                <CalendarView
                  tasks={tasks}
                  calendarEvents={calendarEvents}
                  onSelectDate={(dateStr) => {
                    setEditingTask({
                      id: '',
                      userId: user?.uid || 'guest',
                      title: '',
                      status: 'todo',
                      priority: 'medium',
                      category: selectedCategory || 'Work',
                      dueDate: dateStr,
                      tags: [],
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    });
                    setIsModalOpen(true);
                  }}
                  onEditTask={(t) => {
                    setEditingTask(t);
                    setIsModalOpen(true);
                  }}
                />
              </div>
            )}

            {/* TAB 4: Dashboard View */}
            {activeTab === 'dashboard' && (
              <DashboardView
                tasks={tasks}
                lists={lists}
                onSelectCategory={(cat) => {
                  setSelectedCategory(cat);
                  setActiveTab('tasks');
                }}
                onNavigateToTasks={() => setActiveTab('tasks')}
              />
            )}

            {/* TAB 5: Google Workspace Hub */}
            {activeTab === 'workspace_hub' && (
              <WorkspaceHubView
                token={workspaceToken}
                onRequestToken={handleRequestWorkspaceToken}
                onImportGoogleTask={handleImportGoogleTask}
              />
            )}
          </div>
        </main>
      </div>

      {/* Task Creation / Edit Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        initialTask={editingTask}
        lists={lists}
        workspaceToken={workspaceToken}
        onRequestWorkspaceToken={handleRequestWorkspaceToken}
      />
    </div>
  );
}
