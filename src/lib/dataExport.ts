import { TUYUKUSA_STORAGE_VERSION } from "./tuyukusaStorage";

/** All localStorage keys managed by the app (export / import / Supabase sync). */
export const EXPORTABLE_STORAGE_KEYS = [
  "tuyukusa-goals",
  "tuyukusa-ai-goals",
  "tuyukusa-schedule",
  "tuyukusa-schedule-templates",
  "tuyukusa-local-tasks",
  "tuyukusa-google-calendar",
  "tuyukusa-home-display",
  "tuyukusa-user-profile",
  "tuyukusa-chat-history",
  "tuyukusa-chat-knowledge",
  "tuyukusa-location",
  "tuyukusa-radio",
  "tuyukusa-health-data",
  "tuyukusa-theme",
  "tuyukusa-font-size",
  "tuyukusa-locale",
  "tuyukusa-timer-end-settings",
  "tuyukusa-bb-favorites",
  "tuyukusa-sound-presets",
  "tuyukusa-sound-playlist",
  "tuyukusa-radio-playback",
  "tuyukusa-notion",
  "tuyukusa-supabase",
] as const;

export type ExportableStorageKey = (typeof EXPORTABLE_STORAGE_KEYS)[number];

export type TuyukusaDataExport = {
  version: number;
  exportedAt: string;
  data: Partial<Record<ExportableStorageKey, unknown>>;
};

export function collectLocalStorageExport(): TuyukusaDataExport {
  const data: Partial<Record<ExportableStorageKey, unknown>> = {};
  if (typeof window === "undefined") {
    return { version: TUYUKUSA_STORAGE_VERSION, exportedAt: new Date().toISOString(), data };
  }

  for (const key of EXPORTABLE_STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try {
      data[key] = JSON.parse(raw) as unknown;
    } catch {
      data[key] = raw;
    }
  }

  return {
    version: TUYUKUSA_STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function importLocalStorageExport(payload: TuyukusaDataExport): { imported: number; errors: string[] } {
  const errors: string[] = [];
  let imported = 0;

  if (typeof window === "undefined") return { imported, errors: ["Browser only"] };

  const entries = payload?.data;
  if (!entries || typeof entries !== "object") {
    return { imported, errors: ["Invalid export format"] };
  }

  for (const [key, value] of Object.entries(entries)) {
    if (!EXPORTABLE_STORAGE_KEYS.includes(key as ExportableStorageKey)) continue;
    try {
      localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
      imported++;
    } catch {
      errors.push(key);
    }
  }

  localStorage.setItem("tuyukusa-storage-version", String(TUYUKUSA_STORAGE_VERSION));
  return { imported, errors };
}

export function downloadDataExport(): void {
  const payload = collectLocalStorageExport();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tuyukusa-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readImportFile(file: File): Promise<TuyukusaDataExport> {
  const text = await file.text();
  const parsed = JSON.parse(text) as TuyukusaDataExport;
  if (!parsed?.data || typeof parsed.data !== "object") {
    throw new Error("Invalid backup file");
  }
  return parsed;
}
