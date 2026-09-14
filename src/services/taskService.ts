import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Task, TaskList, TaskStatus } from '../types';

export const DEFAULT_LISTS: Omit<TaskList, 'id' | 'userId' | 'createdAt'>[] = [
  { name: 'Work', color: '#3b82f6', icon: 'Briefcase' },
  { name: 'Personal', color: '#10b981', icon: 'User' },
  { name: 'Projects', color: '#8b5cf6', icon: 'FolderKanban' },
  { name: 'Learning', color: '#f59e0b', icon: 'GraduationCap' },
];

export function subscribeTasks(
  userId: string,
  onUpdate: (tasks: Task[]) => void,
  onError?: (error: Error) => void
) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const tasksRef = collection(db, 'users', userId, 'tasks');
  const q = query(tasksRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const tasks: Task[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        tasks.push({
          id: docSnap.id,
          userId: data.userId || userId,
          title: data.title || '',
          description: data.description || '',
          status: data.status || 'todo',
          priority: data.priority || 'medium',
          category: data.category || 'Work',
          dueDate: data.dueDate || '',
          dueTime: data.dueTime || '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          googleTaskId: data.googleTaskId,
          googleTaskListId: data.googleTaskListId,
          googleCalendarEventId: data.googleCalendarEventId,
          calendarEventUrl: data.calendarEventUrl,
          attachedDocs: data.attachedDocs || [],
          attachedDriveFiles: data.attachedDriveFiles || [],
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
        });
      });
      onUpdate(tasks);
    },
    (err) => {
      console.error('Firestore tasks subscription error:', err);
      if (onError) onError(err);
    }
  );
}

export function subscribeTaskLists(
  userId: string,
  onUpdate: (lists: TaskList[]) => void
) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const listsRef = collection(db, 'users', userId, 'lists');
  return onSnapshot(listsRef, (snapshot) => {
    if (snapshot.empty) {
      // Seed default lists for the user
      DEFAULT_LISTS.forEach(async (list) => {
        const newDoc = doc(listsRef);
        await setDoc(newDoc, {
          ...list,
          userId,
          createdAt: new Date().toISOString(),
        });
      });
      return;
    }

    const lists: TaskList[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      lists.push({
        id: docSnap.id,
        userId: data.userId || userId,
        name: data.name,
        color: data.color || '#3b82f6',
        icon: data.icon,
        createdAt: data.createdAt || new Date().toISOString(),
      });
    });
    onUpdate(lists);
  });
}

export async function saveTask(userId: string, task: Partial<Task> & { title: string }): Promise<string> {
  const tasksRef = collection(db, 'users', userId, 'tasks');
  const taskId = task.id || doc(tasksRef).id;
  const taskDoc = doc(tasksRef, taskId);

  const cleanData: any = {
    userId,
    title: task.title,
    description: task.description || '',
    status: task.status || 'todo',
    priority: task.priority || 'medium',
    category: task.category || 'Work',
    dueDate: task.dueDate || '',
    dueTime: task.dueTime || '',
    tags: task.tags || [],
    googleTaskId: task.googleTaskId || null,
    googleTaskListId: task.googleTaskListId || null,
    googleCalendarEventId: task.googleCalendarEventId || null,
    calendarEventUrl: task.calendarEventUrl || null,
    attachedDocs: task.attachedDocs || [],
    attachedDriveFiles: task.attachedDriveFiles || [],
    updatedAt: serverTimestamp(),
  };

  if (!task.id) {
    cleanData.createdAt = serverTimestamp();
    await setDoc(taskDoc, cleanData);
  } else {
    await updateDoc(taskDoc, cleanData);
  }

  return taskId;
}

export async function updateTaskStatus(userId: string, taskId: string, status: TaskStatus) {
  const taskDoc = doc(db, 'users', userId, 'tasks', taskId);
  await updateDoc(taskDoc, {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function removeTask(userId: string, taskId: string) {
  const taskDoc = doc(db, 'users', userId, 'tasks', taskId);
  await deleteDoc(taskDoc);
}

export async function createCustomList(userId: string, name: string, color: string = '#3b82f6') {
  const listsRef = collection(db, 'users', userId, 'lists');
  const newDoc = doc(listsRef);
  await setDoc(newDoc, {
    userId,
    name,
    color,
    createdAt: new Date().toISOString(),
  });
  return newDoc.id;
}
