import { IActivity, ITag, IUser } from '../types';

const ACTIVITIES_KEY = 'fluxo_sem_activities';
const TAGS_KEY = 'fluxo_sem_tags';
const GOAL_KEY = 'fluxo_sem_daily_goal';
const USERS_KEY = 'fluxo_sem_users';
const CURRENT_USER_ID_KEY = 'fluxo_sem_current_user_id';

const DEFAULT_TAGS: ITag[] = [
  { name: 'Trabalho', color: '#63b3ed' },
  { name: 'Estudo', color: '#9f7aea' },
  { name: 'Pessoal', color: '#48bb78' },
  { name: 'Urgente', color: '#f56565' }
];

const DEFAULT_USER: IUser = { id: 'default', name: 'Principal' };

// --- User Management ---

export const getUsers = (): IUser[] => {
  const data = localStorage.getItem(USERS_KEY);
  if (!data) {
    // If no users exist, create the default one
    const initialUsers = [DEFAULT_USER];
    localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
    return initialUsers;
  }
  return JSON.parse(data);
};

export const saveUsers = (users: IUser[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getCurrentUserId = (): string => {
  return localStorage.getItem(CURRENT_USER_ID_KEY) || DEFAULT_USER.id;
};

export const setCurrentUserId = (id: string) => {
  localStorage.setItem(CURRENT_USER_ID_KEY, id);
};

// --- Helper to generate keys based on user ---
// If it's the default user, use legacy keys to preserve existing data.
// Otherwise, append user ID.
const getKey = (baseKey: string, userId: string) => {
  if (userId === DEFAULT_USER.id) return baseKey;
  return `${baseKey}_${userId}`;
};

// --- Data Methods ---

export const getActivities = (userId: string): IActivity[] => {
  const data = localStorage.getItem(getKey(ACTIVITIES_KEY, userId));
  return data ? JSON.parse(data) : [];
};

export const saveActivities = (userId: string, activities: IActivity[]) => {
  localStorage.setItem(getKey(ACTIVITIES_KEY, userId), JSON.stringify(activities));
};

export const getTags = (userId: string): ITag[] => {
  const data = localStorage.getItem(getKey(TAGS_KEY, userId));
  return data ? JSON.parse(data) : DEFAULT_TAGS;
};

export const saveTags = (userId: string, tags: ITag[]) => {
  localStorage.setItem(getKey(TAGS_KEY, userId), JSON.stringify(tags));
};

export const getDailyGoal = (userId: string): number => {
  const data = localStorage.getItem(getKey(GOAL_KEY, userId));
  return data ? parseInt(data, 10) : 0;
};

export const saveDailyGoal = (userId: string, goal: number) => {
  localStorage.setItem(getKey(GOAL_KEY, userId), goal.toString());
};