export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface DriveAttachment {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink?: string;
}

export interface DocAttachment {
  id: string;
  title: string;
  url: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: string;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  tags: string[];
  
  // Google Workspace sync fields
  googleTaskId?: string;
  googleTaskListId?: string;
  googleCalendarEventId?: string;
  calendarEventUrl?: string;
  attachedDocs?: DocAttachment[];
  attachedDriveFiles?: DriveAttachment[];

  createdAt: string;
  updatedAt: string;
}

export interface TaskList {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon?: string;
  createdAt: string;
}

export interface WorkspaceAuthStatus {
  isConnected: boolean;
  accessToken: string | null;
  tokenExpiresAt?: number;
  userEmail: string | null;
  services: {
    tasks: boolean;
    calendar: boolean;
    drive: boolean;
    docs: boolean;
  };
  error?: string | null;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  updated?: string;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  thumbnailLink?: string;
  iconLink?: string;
  modifiedTime?: string;
}

export type ActiveTab = 'tasks' | 'kanban' | 'calendar' | 'dashboard' | 'workspace_hub';
export type TaskFilter = 'all' | 'today' | 'upcoming' | 'urgent' | 'completed';
