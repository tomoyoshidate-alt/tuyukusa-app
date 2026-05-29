export const TUYUKUSA_STORAGE_VERSION = 2;
export const TUYUKUSA_STORAGE_VERSION_KEY = "tuyukusa-storage-version";

export const TUYUKUSA_STORAGE_KEYS = [
  "tuyukusa-goals",
  "tuyukusa-ai-goals",
  "tuyukusa-schedule",
  "tuyukusa-schedule-templates",
  "tuyukusa-google-calendar",
  "tuyukusa-home-display",
  "tuyukusa-user-profile",
  "tuyukusa-chat-history",
  "tuyukusa-chat-knowledge",
  "tuyukusa-location",
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
  if ("items" in d && d.items !== undefined && !Array.isArray(d.items)) return false;
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

function isUserProfileStorageValid(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if ("name" in d && d.name !== undefined && typeof d.name !== "string") return false;
  if ("nickname" in d && d.nickname !== undefined && typeof d.nickname !== "string") return false;
  if ("nameConfigured" in d && d.nameConfigured !== undefined && typeof d.nameConfigured !== "boolean") return false;
  return true;
}

function isScheduleTemplatesStorageValid(data: unknown): boolean {
  return !!data && typeof data === "object";
}

function isGoogleCalendarStorageValid(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if ("email" in d && d.email !== undefined && typeof d.email !== "string") return false;
  if ("connected" in d && d.connected !== undefined && typeof d.connected !== "boolean") return false;
  if ("lastSyncDayKey" in d && d.lastSyncDayKey !== undefined && typeof d.lastSyncDayKey !== "string") return false;
  return true;
}

function isChatHistoryStorageValid(data: unknown): boolean {
  return Array.isArray(data);
}

function isChatKnowledgeStorageValid(data: unknown): boolean {
  return !!data && typeof data === "object";
}

function isLocationStorageValid(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if ("regionId" in d && d.regionId !== undefined && typeof d.regionId !== "string") return false;
  return true;
}

function isStoredDataValid(): boolean {
  const validators: Record<(typeof TUYUKUSA_STORAGE_KEYS)[number], (data: unknown) => boolean> = {
    "tuyukusa-goals": isGoalsStorageValid,
    "tuyukusa-ai-goals": isAiSuggestionsStorageValid,
    "tuyukusa-schedule": isScheduleStorageValid,
    "tuyukusa-schedule-templates": isScheduleTemplatesStorageValid,
    "tuyukusa-google-calendar": isGoogleCalendarStorageValid,
    "tuyukusa-home-display": isHomeDisplayStorageValid,
    "tuyukusa-user-profile": isUserProfileStorageValid,
    "tuyukusa-chat-history": isChatHistoryStorageValid,
    "tuyukusa-chat-knowledge": isChatKnowledgeStorageValid,
    "tuyukusa-location": isLocationStorageValid,
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
