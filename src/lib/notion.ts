export type NotionTaskType = "today" | "deadline" | "habit";

export type NotionTaskStatus = "pending" | "done";

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
  databaseId: string;
  connected: boolean;
  lastSyncAt?: number;
  setupComplete?: boolean;
};

export const INITIAL_NOTION_SETTINGS: NotionSettings = {
  apiKey: "",
  databaseId: "",
  connected: false,
};

export const NOTION_SYNC_INTERVAL_MS = 5 * 60 * 1000;

export const DEFAULT_NOTION_DATABASE_ID = "1da992784dd14ca8bf72d93b2c7b850e";

export const NOTION_TASK_CATEGORIES = ["仕事", "健康", "生活", "その他"] as const;

export function normalizeNotionSettings(data: unknown): NotionSettings {
  if (!data || typeof data !== "object") return { ...INITIAL_NOTION_SETTINGS };
  const d = data as Partial<NotionSettings>;
  return {
    apiKey: typeof d.apiKey === "string" ? d.apiKey : "",
    databaseId: typeof d.databaseId === "string" ? d.databaseId : "",
    connected: d.connected === true,
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

export function isTaskDueToday(task: NotionTask, dayKey: string): boolean {
  if (task.type === "today") return true;
  if (!task.deadline) return task.type === "habit";
  return task.deadline.startsWith(dayKey);
}

export function getActiveNotionDailyTasks(tasks: NotionTask[], dayKey: string): NotionTask[] {
  return tasks.filter(t => t.status !== "done" && (t.type === "today" || isTaskDueToday(t, dayKey)));
}

export function getActiveNotionDeadlineTasks(tasks: NotionTask[]): NotionTask[] {
  return tasks.filter(t => t.status !== "done" && (t.type === "deadline" || t.type === "habit"));
}

export function getNotionScheduleTasks(tasks: NotionTask[], dayKey: string): NotionTask[] {
  return tasks.filter(
    t => t.status !== "done" && t.time && t.deadline?.startsWith(dayKey)
  );
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
