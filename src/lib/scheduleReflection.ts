export type ReflectScheduleEntry = { time: string; title: string; memo?: string };
export type ReflectHabit = { title: string; time?: string };

export type ScheduleReflection = {
  action: "reflect_schedule";
  schedule: ReflectScheduleEntry[];
  habits?: ReflectHabit[];
};

export type ScheduleUpdateLike = { time: string; label: string; sub: string };

export function normalizeScheduleTime(time: string): string {
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return time;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

export function toScheduleUpdate(entry: ReflectScheduleEntry): ScheduleUpdateLike {
  return {
    time: normalizeScheduleTime(entry.time),
    label: entry.title.trim(),
    sub: entry.memo?.trim() ?? "",
  };
}

function tryParseReflection(raw: string): ScheduleReflection | null {
  try {
    const clean = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
    const obj = JSON.parse(clean) as {
      action?: string;
      schedule?: { time?: string; title?: string; memo?: string }[];
      habits?: { title?: string; time?: string }[];
    };
    if (obj?.action !== "reflect_schedule" || !Array.isArray(obj.schedule)) return null;

    const schedule = obj.schedule
      .filter(e => e?.time && e?.title)
      .map(e => ({
        time: normalizeScheduleTime(String(e.time)),
        title: String(e.title).trim(),
        memo: e.memo ? String(e.memo).trim() : "",
      }));

    if (schedule.length === 0) return null;

    const habits = Array.isArray(obj.habits)
      ? obj.habits
          .filter(h => h?.title)
          .map(h => ({
            title: String(h.title).trim(),
            time: h.time ? normalizeScheduleTime(String(h.time)) : undefined,
          }))
      : undefined;

    return { action: "reflect_schedule", schedule, habits };
  } catch {
    return null;
  }
}

export function parseReflectScheduleFromText(text: string): {
  content: string;
  reflection: ScheduleReflection | null;
} {
  let content = text.trim();

  const prefixIdx = content.lastIndexOf("REFLECT_SCHEDULE:");
  if (prefixIdx >= 0) {
    const jsonPart = content.slice(prefixIdx + "REFLECT_SCHEDULE:".length).trim();
    const parsed = tryParseReflection(jsonPart);
    if (parsed) {
      return { content: content.slice(0, prefixIdx).trim(), reflection: parsed };
    }
  }

  const jsonMatch = content.match(/\{[\s\S]*"action"\s*:\s*"reflect_schedule"[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = tryParseReflection(jsonMatch[0]);
    if (parsed) {
      content = content
        .replace(jsonMatch[0], "")
        .replace(/```json?\s*```?/gi, "")
        .trim();
      return { content, reflection: parsed };
    }
  }

  return { content, reflection: null };
}

export function isReflectIntent(text: string): boolean {
  const t = text.trim();
  return /反映して|反映する|スケジュールに反映|このスケジュールを反映|apply.*schedule/i.test(t);
}

export function reflectionToScheduleUpdates(reflection: ScheduleReflection): ScheduleUpdateLike[] {
  return reflection.schedule.map(toScheduleUpdate);
}
