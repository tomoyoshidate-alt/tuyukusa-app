export function getDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export type DailyBriefingRecord = {
  dayKey: string;
  moduleId: string;
  text: string;
  generatedAt: string;
};

export const BRIEFING_STORAGE_KEY = "tuyukusa-daily-briefing";

export function normalizeDailyBriefing(data: unknown): DailyBriefingRecord | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Partial<DailyBriefingRecord>;
  if (typeof d.dayKey !== "string" || typeof d.text !== "string" || typeof d.moduleId !== "string") {
    return null;
  }
  return {
    dayKey: d.dayKey,
    moduleId: d.moduleId,
    text: d.text.trim(),
    generatedAt: typeof d.generatedAt === "string" ? d.generatedAt : new Date().toISOString(),
  };
}

export function loadDailyBriefing(): DailyBriefingRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BRIEFING_STORAGE_KEY);
    if (!raw) return null;
    return normalizeDailyBriefing(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveDailyBriefing(record: DailyBriefingRecord): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BRIEFING_STORAGE_KEY, JSON.stringify(record));
}

export function isBriefingValidForToday(
  record: DailyBriefingRecord | null,
  moduleId: string,
  dayKey = getDayKey()
): boolean {
  return !!record && record.dayKey === dayKey && record.moduleId === moduleId && record.text.length > 0;
}
