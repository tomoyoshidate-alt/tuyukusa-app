export type LocalTaskStatus = "pending" | "done";

export type LocalTask = {
  id: string;
  text: string;
  category: string;
  dayKey: string;
  status: LocalTaskStatus;
  time?: string;
  createdAt: number;
};

export type LocalTasksStorage = {
  tasks: LocalTask[];
};

export const LOCAL_TASK_CATEGORIES = ["仕事", "健康", "生活", "その他"] as const;

export const INITIAL_LOCAL_TASKS: LocalTasksStorage = { tasks: [] };

export function normalizeLocalTasks(data: unknown): LocalTasksStorage {
  if (!data || typeof data !== "object") return { ...INITIAL_LOCAL_TASKS };
  const d = data as Partial<LocalTasksStorage>;
  if (!Array.isArray(d.tasks)) return { ...INITIAL_LOCAL_TASKS };
  const tasks = d.tasks
    .filter(t => t && typeof t === "object" && typeof t.text === "string")
    .map(t => ({
      id: typeof t.id === "string" ? t.id : `task-${Date.now()}`,
      text: String(t.text).trim(),
      category: typeof t.category === "string" ? t.category : "その他",
      dayKey: typeof t.dayKey === "string" ? t.dayKey : "",
      status: (t.status === "done" ? "done" : "pending") as LocalTaskStatus,
      time: typeof t.time === "string" ? t.time : undefined,
      createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
    }));
  return { tasks };
}

export function getTodayLocalTasks(tasks: LocalTask[], dayKey: string): LocalTask[] {
  return tasks.filter(t => t.dayKey === dayKey && t.status === "pending");
}

export function newLocalTask(text: string, dayKey: string, category = "生活"): LocalTask {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: text.trim(),
    category,
    dayKey,
    status: "pending",
    createdAt: Date.now(),
  };
}
