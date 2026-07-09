import { loadAiModuleSelection } from "../ai/loader";
import { normalizeChatKnowledge } from "../chatKnowledge";
import { normalizeLocalTasks, getTodayLocalTasks } from "../localTasks";
import { getEffectiveLocation, loadUserTraits } from "../traits";
import type { BriefingClientContext, BriefingScheduleItem, BriefingTaskItem } from "./context";
import { getDayKey } from "./storage";

type ScheduleItemLike = { time: string; label: string; sub?: string };
type ScheduleStateLike = { dayKey: string; items?: ScheduleItemLike[] };

function loadJson<T>(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function loadTodaySchedule(): BriefingScheduleItem[] {
  const data = loadJson<ScheduleStateLike>("tuyukusa-schedule") as ScheduleStateLike | null;
  if (!data || typeof data !== "object") return [];
  const dayKey = getDayKey();
  if (data.dayKey !== dayKey || !Array.isArray(data.items)) return [];
  return data.items
    .filter(i => i && typeof i.label === "string" && typeof i.time === "string")
    .map(i => ({ time: i.time, label: i.label, sub: i.sub }));
}

function loadTodayTasks(): BriefingTaskItem[] {
  const storage = normalizeLocalTasks(loadJson("tuyukusa-local-tasks"));
  const dayKey = getDayKey();
  return getTodayLocalTasks(storage.tasks, dayKey).map(t => ({
    text: t.text,
    time: t.time,
    category: t.category,
  }));
}

export function buildClientBriefingContext(displayName?: string): BriefingClientContext {
  const traits = loadUserTraits();
  const knowledge = normalizeChatKnowledge(loadJson("tuyukusa-chat-knowledge"));

  return {
    displayName,
    location: getEffectiveLocation(traits),
    traits: traits.constitution ? { constitution: traits.constitution } : undefined,
    lifestyle: knowledge.lifestyle,
    todayTasks: loadTodayTasks(),
    todaySchedule: loadTodaySchedule(),
  };
}

export function getClientModuleId(): string {
  return loadAiModuleSelection().selectedModuleId;
}
