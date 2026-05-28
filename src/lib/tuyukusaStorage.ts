export const TUYUKUSA_STORAGE_VERSION = 2;
export const TUYUKUSA_STORAGE_VERSION_KEY = "tuyukusa-storage-version";

export const TUYUKUSA_STORAGE_KEYS = [
  "tuyukusa-goals",
  "tuyukusa-ai-goals",
  "tuyukusa-schedule",
  "tuyukusa-home-display",
] as const;

let migrationRan = false;

function clearTuyukusaAppStorage(): void {
  for (const key of TUYUKUSA_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith("tuyukusa-") && key !== TUYUKUSA_STORAGE_VERSION_KEY) {
      localStorage.removeItem(key);
    }
  }
}

function parseJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isGoalListLike(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if ("items" in value) return Array.isArray((value as { items: unknown }).items);
  if ("text" in value) return typeof (value as { text: unknown }).text === "string";
  return false;
}

function isGoalsStorageValid(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;

  for (const key of ["daily", "weekly", "monthly"] as const) {
    if (!(key in d)) continue;
    if (!isGoalListLike(d[key])) return false;
  }

  if ("deadlineGoals" in d && d.deadlineGoals !== undefined && !Array.isArray(d.deadlineGoals)) {
    return false;
  }

  return "daily" in d || "weekly" in d || "monthly" in d || "deadlineGoals" in d;
}

function isScheduleStorageValid(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (typeof d.dayKey !== "string") return false;
  if ("customItems" in d && d.customItems !== undefined && !Array.isArray(d.customItems)) return false;
  if ("alerts" in d && d.alerts !== undefined && !Array.isArray(d.alerts)) return false;
  return true;
}

function isHomeDisplayStorageValid(data: unknown): boolean {
  return !!data && typeof data === "object";
}

function isAiSuggestionsStorageValid(data: unknown): boolean {
  return data === null || (!!data && typeof data === "object");
}

function isStoredDataValid(): boolean {
  const validators: Record<(typeof TUYUKUSA_STORAGE_KEYS)[number], (data: unknown) => boolean> = {
    "tuyukusa-goals": isGoalsStorageValid,
    "tuyukusa-ai-goals": isAiSuggestionsStorageValid,
    "tuyukusa-schedule": isScheduleStorageValid,
    "tuyukusa-home-display": isHomeDisplayStorageValid,
  };

  for (const key of TUYUKUSA_STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;

    const parsed = parseJson(raw);
    if (parsed === null || !validators[key](parsed)) {
      return false;
    }
  }

  return true;
}

export function runTuyukusaStorageMigration(): void {
  if (typeof window === "undefined") return;
  if (migrationRan) return;
  migrationRan = true;

  try {
    const storedVersion = localStorage.getItem(TUYUKUSA_STORAGE_VERSION_KEY);
    const currentVersion = storedVersion ? Number.parseInt(storedVersion, 10) : 0;
    const versionMismatch =
      !Number.isFinite(currentVersion) || currentVersion !== TUYUKUSA_STORAGE_VERSION;

    if (versionMismatch || !isStoredDataValid()) {
      clearTuyukusaAppStorage();
      localStorage.setItem(TUYUKUSA_STORAGE_VERSION_KEY, String(TUYUKUSA_STORAGE_VERSION));
    }
  } catch {
    clearTuyukusaAppStorage();
    try {
      localStorage.setItem(TUYUKUSA_STORAGE_VERSION_KEY, String(TUYUKUSA_STORAGE_VERSION));
    } catch {
      /* ignore */
    }
  }
}
