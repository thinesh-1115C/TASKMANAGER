import { OAUTH_CLIENT_ID, WORKSPACE_SCOPES } from '../firebase';
import { GoogleCalendarEvent, GoogleDriveFile, GoogleTaskItem } from '../types';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string; expires_in?: number }) => void;
            error_callback?: (err: any) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

const TOKEN_KEY = 'tm_google_workspace_token';
const TOKEN_EXPIRY_KEY = 'tm_google_workspace_token_exp';

export function getStoredWorkspaceToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  const exp = sessionStorage.getItem(TOKEN_EXPIRY_KEY) || localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!token) return null;
  if (exp && Date.now() > parseInt(exp, 10)) {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return token;
}

export function saveStoredWorkspaceToken(token: string, expiresInSeconds: number = 3600) {
  sessionStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_KEY, token);
  const expiry = Date.now() + (expiresInSeconds - 60) * 1000;
  sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
}

export function clearWorkspaceToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

/**
 * Request OAuth Access Token using Google Identity Services (GSI)
 */
export async function requestWorkspaceToken(promptUser: boolean = true): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services library is not loaded yet. Please try again in a moment.'));
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: OAUTH_CLIENT_ID,
        scope: WORKSPACE_SCOPES.join(' '),
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          if (response.access_token) {
            saveStoredWorkspaceToken(response.access_token, response.expires_in || 3600);
            resolve(response.access_token);
          } else {
            reject(new Error('No access token returned.'));
          }
        },
        error_callback: (err) => {
          reject(new Error(err?.message || 'OAuth authorization failed'));
        },
      });

      client.requestAccessToken({ prompt: promptUser ? 'consent' : '' });
    } catch (err: any) {
      reject(err);
    }
  });
}

// ----------------------------------------------------------------------
// Google Tasks API
// ----------------------------------------------------------------------

export async function getGoogleTaskLists(token: string) {
  const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch Google Task lists: ${res.statusText}`);
  }
  const data = await res.json();
  return data.items || [];
}

export async function getGoogleTasks(token: string, taskListId: string = '@default'): Promise<GoogleTaskItem[]> {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?maxResults=100`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch Google Tasks: ${res.statusText}`);
  }
  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    notes: item.notes,
    status: item.status,
    due: item.due,
    updated: item.updated,
  }));
}

export async function createGoogleTask(
  token: string,
  task: { title: string; notes?: string; due?: string },
  taskListId: string = '@default'
): Promise<GoogleTaskItem> {
  const body: any = {
    title: task.title,
    notes: task.notes || '',
  };
  if (task.due) {
    // Google tasks expects RFC 3339 timestamp formatted date
    const dateObj = new Date(task.due);
    if (!isNaN(dateObj.getTime())) {
      body.due = dateObj.toISOString();
    }
  }

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create Google Task: ${errorText || res.statusText}`);
  }
  return await res.json();
}

export async function updateGoogleTaskStatus(
  token: string,
  taskId: string,
  status: 'completed' | 'needsAction',
  taskListId: string = '@default'
) {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: status,
      completed: status === 'completed' ? new Date().toISOString() : null,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update Google Task: ${res.statusText}`);
  }
  return await res.json();
}

export async function deleteGoogleTask(token: string, taskId: string, taskListId: string = '@default') {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete Google Task: ${res.statusText}`);
  }
  return true;
}

// ----------------------------------------------------------------------
// Google Calendar API
// ----------------------------------------------------------------------

export async function getCalendarEvents(token: string, timeMin?: string, timeMax?: string): Promise<GoogleCalendarEvent[]> {
  const now = new Date();
  const defaultMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const defaultMax = new Date(now.getFullYear(), now.getMonth() + 2, 1).toISOString();
  
  const min = timeMin || defaultMin;
  const max = timeMax || defaultMax;

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    min
  )}&timeMax=${encodeURIComponent(max)}&singleEvents=true&orderBy=startTime&maxResults=100`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Calendar events: ${res.statusText}`);
  }

  const data = await res.json();
  return (data.items || []).map((event: any) => ({
    id: event.id,
    summary: event.summary || '(Untitled Event)',
    description: event.description,
    start: event.start || {},
    end: event.end || {},
    htmlLink: event.htmlLink,
  }));
}

export async function createCalendarEvent(
  token: string,
  details: {
    summary: string;
    description?: string;
    date: string; // YYYY-MM-DD
    time?: string; // HH:mm
  }
): Promise<{ id: string; htmlLink: string }> {
  let start: any = {};
  let end: any = {};

  if (details.time) {
    const startIso = `${details.date}T${details.time}:00`;
    const startDate = new Date(startIso);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration
    start = { dateTime: startDate.toISOString() };
    end = { dateTime: endDate.toISOString() };
  } else {
    start = { date: details.date };
    end = { date: details.date };
  }

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: details.summary,
      description: details.description || '',
      start,
      end,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create Calendar event: ${errorText || res.statusText}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    htmlLink: data.htmlLink,
  };
}

export async function deleteCalendarEvent(token: string, eventId: string) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete Calendar event: ${res.statusText}`);
  }
  return true;
}

// ----------------------------------------------------------------------
// Google Drive API
// ----------------------------------------------------------------------

export async function searchDriveFiles(token: string, query?: string): Promise<GoogleDriveFile[]> {
  let q = 'trashed = false';
  if (query && query.trim()) {
    const sanitized = query.trim().replace(/'/g, "\\'");
    q += ` and name contains '${sanitized}'`;
  }

  const fields = 'files(id, name, mimeType, webViewLink, thumbnailLink, iconLink, modifiedTime)';
  const url = `https://www.googleapis.com/drive/v3/files?pageSize=40&q=${encodeURIComponent(
    q
  )}&fields=${encodeURIComponent(fields)}&orderBy=modifiedTime desc`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to search Drive files: ${res.statusText}`);
  }

  const data = await res.json();
  return data.files || [];
}

// ----------------------------------------------------------------------
// Google Docs API
// ----------------------------------------------------------------------

export async function createGoogleDocument(
  token: string,
  title: string,
  initialContent?: string
): Promise<{ documentId: string; title: string; url: string }> {
  // Step 1: Create empty document
  const res = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create Google Doc: ${errorText || res.statusText}`);
  }

  const docData = await res.json();
  const documentId = docData.documentId;
  const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;

  // Step 2: Insert initial task content if provided
  if (initialContent && initialContent.trim()) {
    try {
      await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: `${initialContent.trim()}\n\n---\nLinked Task Notes generated from Task Manager\n`,
              },
            },
          ],
        }),
      });
    } catch (e) {
      console.warn('Could not insert initial content into doc:', e);
    }
  }

  return {
    documentId,
    title: docData.title || title,
    url: docUrl,
  };
}
