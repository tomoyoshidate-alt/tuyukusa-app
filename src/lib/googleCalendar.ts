export type CalendarEvent = {
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
};

export type CalendarDayMode = "default" | "work" | "holiday";

export type GoogleCalendarSettings = {
  icalUrl: string;
  connected: boolean;
  lastSyncDayKey?: string;
  lastSyncAt?: number;
};

export const INITIAL_GOOGLE_CALENDAR: GoogleCalendarSettings = {
  icalUrl: "",
  connected: false,
};

export const CALENDAR_SYNC_INTERVAL_MS = 60 * 60 * 1000;

function extractIcsField(block: string, field: string): string {
  const re = new RegExp(`^${field}[^:]*:(.*)$`, "m");
  const match = block.match(re);
  return match?.[1]?.trim().replace(/\\n/g, " ").replace(/\\,/g, ",") ?? "";
}

function parseIcsDate(raw: string): { iso: string; allDay: boolean } {
  const value = raw.trim();
  if (/^\d{8}$/.test(value)) {
    const y = value.slice(0, 4);
    const mo = value.slice(4, 6);
    const d = value.slice(6, 8);
    return { iso: `${y}-${mo}-${d}`, allDay: true };
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (m) {
    return {
      iso: `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`,
      allDay: false,
    };
  }
  return { iso: value, allDay: false };
}

export function parseIcsEvents(ics: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const blocks = ics.split("BEGIN:VEVENT");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i]?.split("END:VEVENT")[0] ?? "";
    const summary = extractIcsField(block, "SUMMARY");
    const dtstartRaw = extractIcsField(block, "DTSTART");
    const dtendRaw = extractIcsField(block, "DTEND");
    if (!summary || !dtstartRaw) continue;
    const start = parseIcsDate(dtstartRaw);
    const end = dtendRaw ? parseIcsDate(dtendRaw) : start;
    events.push({
      summary,
      start: start.iso,
      end: end.iso,
      allDay: start.allDay,
    });
  }
  return events;
}

export function filterEventsForDay(events: CalendarEvent[], dayKey: string): CalendarEvent[] {
  return events.filter(event => {
    if (event.allDay) return event.start.startsWith(dayKey);
    return event.start.startsWith(dayKey) || event.end.startsWith(dayKey);
  });
}

export function detectCalendarDayMode(events: CalendarEvent[]): CalendarDayMode {
  for (const event of events) {
    const text = event.summary.toLowerCase();
    if (/休日|休み|有給|祝|off\b|holiday|vacation|年休|代休|プライベート|private/.test(text)) {
      return "holiday";
    }
  }
  for (const event of events) {
    const text = event.summary.toLowerCase();
    if (/仕事|勤務|work|office|出社|会議|meeting|シフト|勤/.test(text)) return "work";
  }
  return "default";
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = ((h * 60 + m + minutes) % 1440 + 1440) % 1440;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function findLatestWorkEndMinutes(events: CalendarEvent[], dayKey: string): number | null {
  let latest: number | null = null;
  for (const event of events) {
    if (event.allDay) continue;
    if (!event.end.startsWith(dayKey) && !event.start.startsWith(dayKey)) continue;
    const endPart = event.end.includes("T") ? event.end.split("T")[1] : null;
    if (!endPart) continue;
    const [h, m] = endPart.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) continue;
    const mins = h * 60 + m;
    if (latest === null || mins > latest) latest = mins;
  }
  return latest;
}

type ScheduleItemLike = { id: string; time: string; label: string; sub: string };

export function applyCalendarAdjustments<T extends ScheduleItemLike>(
  items: T[],
  events: CalendarEvent[],
  dayMode: CalendarDayMode,
  dayKey: string
): T[] {
  if (dayMode === "holiday") {
    return items.map(item => {
      if (item.label === "起床" || item.id === "wake") {
        return {
          ...item,
          time: addMinutesToTime(item.time, 90),
          sub: item.sub ? `${item.sub}（休日：ゆっくり起きる）` : "休日：ゆっくり起きる",
        };
      }
      if (item.label === "就寝" || item.id === "sleep") {
        return {
          ...item,
          time: addMinutesToTime(item.time, 30),
          sub: item.sub ? `${item.sub}（休日）` : "休日",
        };
      }
      return item;
    });
  }

  if (dayMode === "work") {
    const workEnd = findLatestWorkEndMinutes(events, dayKey);
    return items.map(item => {
      if ((item.label === "夕食" || item.id === "meal2") && workEnd !== null) {
        const dinnerMin = Math.max(workEnd + 30, parseTimeToMinutes(item.time));
        const hours = Math.floor(dinnerMin / 60);
        const mins = dinnerMin % 60;
        const time = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
        return {
          ...item,
          time,
          sub: item.sub ? `${item.sub}（仕事終了後）` : "仕事終了後",
        };
      }
      if (item.label === "起床" || item.id === "wake") {
        return {
          ...item,
          sub: item.sub ? `${item.sub}（仕事の日）` : "仕事の日",
        };
      }
      return item;
    });
  }

  return items;
}

export function normalizeGoogleCalendarSettings(data: unknown): GoogleCalendarSettings {
  if (!data || typeof data !== "object") return INITIAL_GOOGLE_CALENDAR;
  const d = data as Partial<GoogleCalendarSettings & { email?: string }>;
  let icalUrl = typeof d.icalUrl === "string" ? d.icalUrl.trim() : "";
  if (!icalUrl && typeof d.email === "string" && d.email.trim()) {
    icalUrl = buildGoogleCalendarIcsUrl(d.email.trim());
  }
  return {
    icalUrl,
    connected: !!d.connected && !!icalUrl,
    lastSyncDayKey: typeof d.lastSyncDayKey === "string" ? d.lastSyncDayKey : undefined,
    lastSyncAt: typeof d.lastSyncAt === "number" ? d.lastSyncAt : undefined,
  };
}

export function isValidIcalFeedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    return (
      parsed.hostname.includes("calendar.google.com") ||
      parsed.pathname.includes(".ics") ||
      parsed.search.includes("ical")
    );
  } catch {
    return false;
  }
}

export function buildGoogleCalendarIcsUrl(email: string): string {
  const calendarId = encodeURIComponent(email.trim());
  return `https://calendar.google.com/calendar/ical/${calendarId}/public/basic.ics`;
}
