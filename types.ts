export interface ITag {
  name: string;
  color: string;
}

export interface IActivity {
  id: string;
  title: string; // name in user code
  tag: string;
  estimatedMinutes: number;
  date: string; // YYYY-MM-DD
  day: string; // e.g., 'Segunda'
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  elapsedSeconds: number;
  isRunning: boolean;
  lastTick?: number; // timestamp for timer calculation
  completed: boolean; // isCompleted
  completedAt?: string; // ISO string
}

export interface IDailyStats {
  date: string;
  totalMinutes: number;
}

export interface IUser {
  id: string;
  name: string;
}