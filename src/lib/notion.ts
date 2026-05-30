export type NotionTaskType = "today" | "deadline" | "habit";

export type NotionTaskStatus = "pending" | "done";

export type NotionScheduleEventType = "meeting" | "deadline" | "other";

export type NotionTask = {
  id: string;
  text: string;
  type: NotionTaskType;
  category: string;
  deadline?: string;
  time?: string;
  status: NotionTaskStatus;
  notionUrl?: string;
};

export type NotionScheduleEvent = {
  id: string;
  title: string;
  eventType: NotionScheduleEventType;
  date?: string;
  time?: string;
  status: NotionTaskStatus;
  notionUrl?: string;
};

export type NotionMemo = {
  id: string;
  title: string;
  status: NotionTaskStatus;
  updatedAt?: string;
  notionUrl?: string;
};

export type NotionSyncData = {
  tasks: NotionTask[];
  scheduleEvents: NotionScheduleEvent[];
  memos: NotionMemo[];
  syncedAt: number;
};

export type ParsedVoiceTask = {
  text: string;
  type: NotionTaskType;
  category: string;
  deadline: string | null;
  time: string | null;
  summary: string;
};

export type NotionSettings = {
  apiKey: string;
  taskDatabaseId: string;
  scheduleDatabaseId: string;
  communicationDatabaseId: string;
  connected: boolean;
  enabled: boolean;
  lastSyncAt?: number;
  setupComplete?: boolean;
};

export const NOTION_DATABASE_IDS = {
  tasks: "f91272a96b4147e79f6b1b8a997a83de",
  schedule: "33149e56c49a414dafc6c73df2610848",
  communication: "ee8fae0401ef4ba2910602529db07ec9",
} as const;

export const INITIAL_NOTION_SETTINGS: NotionSettings = {
  apiKey: "",
  taskDatabaseId: NOTION_DATABASE_IDS.tasks,
  scheduleDatabaseId: NOTION_DATABASE_IDS.schedule,
  communicationDatabaseId: NOTION_DATABASE_IDS.communication,
  connected: false,
  enabled: false,
};

export const NOTION_SYNC_INTERVAL_MS = 5 * 60 * 1000;

/** @deprecated legacy single-database id */
export const DEFAULT_NOTION_DATABASE_ID = NOTION_DATABASE_IDS.tasks;

export const NOTION_TASK_CATEGORIES = ["仕事", "健康", "生活", "その他"] as const;

export function normalizeNotionSettings(data: unknown): NotionSettings {
  if (!data || typeof data !== "object") return { ...INITIAL_NOTION_SETTINGS };
  const d = data as Partial<NotionSettings> & { databaseId?: string };
  return {
    apiKey: typeof d.apiKey === "string" ? d.apiKey : "",
    taskDatabaseId:
      typeof d.taskDatabaseId === "string"
        ? d.taskDatabaseId
        : typeof d.databaseId === "string" && d.databaseId
          ? d.databaseId
          : NOTION_DATABASE_IDS.tasks,
    scheduleDatabaseId:
      typeof d.scheduleDatabaseId === "string" ? d.scheduleDatabaseId : NOTION_DATABASE_IDS.schedule,
    communicationDatabaseId:
      typeof d.communicationDatabaseId === "string"
        ? d.communicationDatabaseId
        : NOTION_DATABASE_IDS.communication,
    connected: d.connected === true,
    enabled: d.enabled === true,
    lastSyncAt: typeof d.lastSyncAt === "number" ? d.lastSyncAt : undefined,
    setupComplete: d.setupComplete === true,
  };
}

export function formatNotionId(id: string): string {
  const clean = id.replace(/-/g, "");
  if (clean.length !== 32) return id;
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
}

export function stripNotionId(id: string): string {
  return id.replace(/-/g, "");
}

export function mapNotionTypeLabel(type: NotionTaskType): string {
  switch (type) {
    case "today":
      return "今日";
    case "deadline":
      return "期限付き";
    case "habit":
      return "習慣";
  }
}

export function parseNotionTypeLabel(label: string | undefined): NotionTaskType {
  if (label === "習慣" || label === "habit") return "habit";
  if (label === "期限付き" || label === "deadline") return "deadline";
  return "today";
}

export function parseScheduleEventType(label: string | undefined): NotionScheduleEventType {
  if (!label) return "other";
  const lower = label.toLowerCase();
  if (/mtg|meeting|会議|ミーティング/.test(lower)) return "meeting";
  if (/締切|deadline|期限|due/.test(lower)) return "deadline";
  return "other";
}

export function isTaskDueToday(task: NotionTask, dayKey: string): boolean {
  if (task.type === "today") return true;
  if (!task.deadline) return task.type === "habit";
  return task.deadline.startsWith(dayKey);
}

export function getTodayNotionTasks(tasks: NotionTask[], dayKey: string): NotionTask[] {
  return tasks.filter(t => t.status !== "done" && isTaskDueToday(t, dayKey));
}

export function getActiveNotionDailyTasks(tasks: NotionTask[], dayKey: string): NotionTask[] {
  return getTodayNotionTasks(tasks, dayKey);
}

export function getActiveNotionDeadlineTasks(tasks: NotionTask[]): NotionTask[] {
  return tasks.filter(t => t.status !== "done" && (t.type === "deadline" || t.type === "habit"));
}

export function getNotionScheduleTasks(tasks: NotionTask[], dayKey: string): NotionTask[] {
  return tasks.filter(t => t.status !== "done" && t.time && t.deadline?.startsWith(dayKey));
}

export function getTodayNotionScheduleEvents(events: NotionScheduleEvent[], dayKey: string): NotionScheduleEvent[] {
  return events.filter(e => e.status !== "done" && e.date?.startsWith(dayKey));
}

export function formatSyncTime(ts?: number): string {
  if (!ts) return "未同期";
  return new Date(ts).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function scheduleEventLabel(type: NotionScheduleEventType): string {
  switch (type) {
    case "meeting":
      return "MTG";
    case "deadline":
      return "締切";
    default:
      return "予定";
  }
}
