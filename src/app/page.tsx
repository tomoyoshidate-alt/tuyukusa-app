'use client'

import { useState, useEffect, useRef, type CSSProperties, type ReactNode, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import dynamic from "next/dynamic";
import { runTuyukusaStorageMigration } from "@/src/lib/tuyukusaStorage";
import {
  applyCalendarAdjustments,
  CALENDAR_SYNC_INTERVAL_MS,
  INITIAL_GOOGLE_CALENDAR,
  isValidIcalFeedUrl,
  normalizeGoogleCalendarSettings,
  type GoogleCalendarSettings,
} from "@/src/lib/googleCalendar";
import {
  getTodayNotionScheduleEvents,
  getTodayNotionTasks,
  INITIAL_NOTION_SETTINGS,
  normalizeNotionSettings,
  NOTION_SYNC_INTERVAL_MS,
  scheduleEventLabel,
  type NotionScheduleEvent,
  type NotionSettings,
  type NotionTask,
  type ParsedVoiceTask,
} from "@/src/lib/notion";
import {
  buildHealthContext,
  formatHealthSummary,
  INITIAL_HEALTH_DATA,
  mergeHealthImport,
  normalizeHealthData,
  parseHealthFromSearchParams,
  type HealthData,
} from "@/src/lib/healthData";
import AddToHomeScreen from "@/src/components/AddToHomeScreen";
import { AppSidebar } from "@/src/components/AppSidebar";
import { PwaInstallSection } from "@/src/components/PwaInstallSection";
import { PwaInstallGuideModal } from "@/src/components/PwaInstallGuideModal";
import { useDesktopLayout } from "@/src/hooks/useDesktopLayout";
import { usePwaInstall } from "@/src/hooks/usePwaInstall";
import BinauralGlobalAlarm from "@/src/components/BinauralGlobalAlarm";
import HealthKitBridge from "@/src/components/HealthKitBridge";
import LanguageSettingsPanel from "@/src/components/LanguageSettingsPanel";
import RadioMiniPlayer from "@/src/components/RadioMiniPlayer";
import ScreenSettingsTab from "@/src/components/ScreenSettingsTab";
import TsuyukusaRadio from "@/src/components/TsuyukusaRadio";
import VoiceTaskConfirmModal from "@/src/components/VoiceTaskConfirmModal";
import { HomeAiChatTeaser } from "@/src/components/HomeAiChatTeaser";
import { UpdateNotificationScreen } from "@/src/components/UpdateNotificationScreen";
import { AiDailyInsightSection } from "@/src/components/AiDailyInsightSection";
import { ScheduleReflectionModal } from "@/src/components/ScheduleReflectionModal";
import { LocalTodayTasksSection } from "@/src/components/LocalTodayTasksSection";
import { DataManagementPanel } from "@/src/components/DataManagementPanel";
import { SupabaseSyncPanel } from "@/src/components/SupabaseSyncPanel";
import { ExternalIntegrationsPanel } from "@/src/components/ExternalIntegrationsPanel";
import { OnboardingScreen } from "@/src/components/OnboardingScreen";
import { OnboardingIntegrationsScreen, type IntegrationFinishOptions } from "@/src/components/OnboardingIntegrationsScreen";
import { AiChatPanel } from "@/src/components/AiChatPanel";
import type { OnboardingFlowData } from "@/src/lib/onboarding";
import {
  clearOnboardingProgress,
  getPendingQuestions,
  isOnboardingResetIntent,
  loadOnboardingProgress,
  saveOnboardingProgress,
  buildProgressFromFlowData,
} from "@/src/lib/onboardingProgress";
import {
  APP_VERSION,
  fetchChangelog,
  isAppUpdateAvailable,
  readStoredAppVersion,
  writeStoredAppVersion,
} from "@/src/lib/appVersion";
import {
  getTodayLocalTasks,
  INITIAL_LOCAL_TASKS,
  newLocalTask,
  normalizeLocalTasks,
  type LocalTasksStorage,
} from "@/src/lib/localTasks";
import {
  INITIAL_SUPABASE_SETTINGS,
  normalizeSupabaseSettings,
  type SupabaseSettings,
} from "@/src/lib/supabaseSync";
import {
  isReflectIntent,
  reflectionToScheduleUpdates,
  type ScheduleReflection,
} from "@/src/lib/scheduleReflection";
import { registerTodayScheduleAlarms } from "@/src/lib/scheduleAlarms";
import {
  themeAppShellStyle,
  themeCardStyle,
  themeFieldLabelStyle,
  themeHeaderStyle,
  themeHomeActionBtnStyle,
  themeInputStyle,
  themeNavStyle,
} from "@/src/lib/themeStyles";
import type { AppLocale } from "@/src/lib/i18n/detectLocale";
import {
  DEFAULT_HOME_DISPLAY,
  isSectionVisible,
  normalizeHomeDisplay,
  type HomeDisplaySettings,
  type HomeSectionId,
} from "@/src/lib/homeDisplay";
import {
  INITIAL_RADIO_SETTINGS,
  normalizeRadioSettings,
  type RadioSettings,
} from "@/src/lib/radioFavorites";
import { pickTimeGreeting } from "@/src/lib/timeGreeting";
import {
  buildUserKnowledgeContext,
  INITIAL_CHAT_KNOWLEDGE,
  normalizeChatKnowledge,
  normalizeStoredChatMessages,
  updateChatKnowledgeFromFlow,
  updateChatKnowledgeFromUserMessage,
  type ChatKnowledge,
  type StoredChatMessage,
} from "@/src/lib/chatKnowledge";
import {
  getRegionById,
  INITIAL_LOCATION_SETTINGS,
  normalizeLocationSettings,
  REGION_OPTIONS,
  type LocationSettings,
} from "@/src/lib/regions";
import { isMacSafari, isPwaInstallIntent } from "@/src/lib/pwaInstall";

const DailyWeatherChart = dynamic(() => import("@/src/components/DailyWeatherChart"), {
  ssr: false,
  loading: () => (
    <div style={{ background: "white", borderRadius: 14, padding: 16, height: 140, border: "1px solid rgba(60,40,20,0.1)", fontSize: 11, color: "#9a8b7a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      グラフを読み込み中...
    </div>
  ),
});

const BinauralBeatsPanel = dynamic(() => import("@/src/components/BinauralBeatsPanel"), {
  ssr: false,
});

const SoundSystemPanel = dynamic(() => import("@/src/components/sound/SoundSystemPanel"), {
  ssr: false,
});

function useLocalStorage<T>(
  key: string,
  initialValue: T,
  parse?: (raw: unknown) => T
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    runTuyukusaStorageMigration();
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        setValue(parse ? parse(parsed) : (parsed as T));
      }
    } catch {
      setValue(initialValue);
    }
    setHydrated(true);
  }, [key]);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  }, [key, value, hydrated]);
  return [value, setValue, hydrated];
}

type GoalCategory = "睡眠" | "食事" | "運動" | "塩清療法" | "その他";
type GoalItem = { id: string; text: string; category: GoalCategory; achieved: boolean };
type GoalList = { items: GoalItem[]; periodKey: string };
type PeriodGoal = { text: string; category: GoalCategory; achieved: boolean; periodKey: string };
type DeadlineGoalType = "習慣" | "期限目標";
type DeadlineGoal = {
  id: string;
  text: string;
  category: GoalCategory;
  deadline: string;
  goalType: DeadlineGoalType;
  achieved: boolean;
  achievedDayKey?: string;
};
type GoalsData = { daily: GoalList; weekly: GoalList; monthly: GoalList; deadlineGoals: DeadlineGoal[] };
type GoalPeriod = "daily" | "weekly" | "monthly";
type ScheduleItem = { id: string; time: string; label: string; sub: string };
type ScheduleUpdate = { time: string; label: string; sub: string };
type ScheduleAlert = { time: string; message: string; type: string };
type ScheduleState = { dayKey: string; items: ScheduleItem[]; alerts: ScheduleAlert[] };
type ScheduleEditDraft = { mode: "edit" | "add"; item: ScheduleItem };
type ChatReply = {
  content: string;
  scheduleUpdate?: ScheduleUpdate | null;
  scheduleSuggestions?: ScheduleUpdate[];
  scheduleReflection?: ScheduleReflection | null;
};
type ScheduleSuggestion = ScheduleUpdate & { id: string };
const GOAL_CATEGORIES: GoalCategory[] = ["睡眠", "食事", "運動", "塩清療法", "その他"];
const DEADLINE_GOAL_TYPES: DeadlineGoalType[] = ["習慣", "期限目標"];
function getDayKey(d = new Date()) { return d.toISOString().slice(0, 10); }
function getWeekKey(d = new Date()) {
  const x = new Date(d); const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return x.toISOString().slice(0, 10);
}
function getMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function emptyGoalList(k: string): GoalList {
  return { items: [], periodKey: k };
}
function newGoalItem(text: string, category: GoalCategory): GoalItem {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, text, category, achieved: false };
}
function migrateGoalList(data: unknown, key: string): GoalList {
  if (!data || typeof data !== "object") return emptyGoalList(key);
  if ("items" in data && Array.isArray((data as GoalList).items)) {
    const gl = data as GoalList;
    const items = gl.items.filter(
      (item): item is GoalItem =>
        !!item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.text === "string"
    );
    return gl.periodKey === key ? { items, periodKey: gl.periodKey ?? key } : emptyGoalList(key);
  }
  if ("text" in data) {
    const pg = data as PeriodGoal;
    if (pg.periodKey !== key) return emptyGoalList(key);
    const items = pg.text?.trim()
      ? [newGoalItem(pg.text, pg.category ?? "その他")].map(i => ({ ...i, achieved: !!pg.achieved }))
      : [];
    return { items, periodKey: key };
  }
  return emptyGoalList(key);
}
const INITIAL_GOALS: GoalsData = {
  daily: emptyGoalList(getDayKey()),
  weekly: emptyGoalList(getWeekKey()),
  monthly: emptyGoalList(getMonthKey()),
  deadlineGoals: [],
};
function normalizeGoals(data: unknown): GoalsData {
  if (!data || typeof data !== "object") {
    return {
      daily: emptyGoalList(getDayKey()),
      weekly: emptyGoalList(getWeekKey()),
      monthly: emptyGoalList(getMonthKey()),
      deadlineGoals: [],
    };
  }
  const d = data as Partial<GoalsData>;
  return {
    daily: migrateGoalList(d.daily, getDayKey()),
    weekly: migrateGoalList(d.weekly, getWeekKey()),
    monthly: migrateGoalList(d.monthly, getMonthKey()),
    deadlineGoals: Array.isArray(d.deadlineGoals)
      ? d.deadlineGoals.map(g => normalizeDeadlineGoal(g))
      : [],
  };
}
function normalizeDeadlineGoal(g: unknown): DeadlineGoal {
  const raw = g && typeof g === "object" ? (g as Partial<DeadlineGoal>) : {};
  const goalType: DeadlineGoalType = raw.goalType === "習慣" ? "習慣" : "期限目標";
  const today = getDayKey();
  const base = {
    id: raw.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    text: raw.text ?? "",
    category: (raw.category ?? "その他") as GoalCategory,
    deadline: raw.deadline ? sanitizeDeadlineValue(String(raw.deadline)) : defaultDeadlineDate(),
    goalType,
  };
  if (goalType === "習慣") {
    const achievedToday = raw.achievedDayKey === today;
    return { ...base, achieved: achievedToday, achievedDayKey: achievedToday ? today : undefined };
  }
  return { ...base, achieved: !!raw.achieved, achievedDayKey: undefined };
}
function isDeadlineGoalChecked(g: DeadlineGoal): boolean {
  if (g.goalType === "習慣") return g.achievedDayKey === getDayKey();
  return g.achieved;
}
function calcListRate(list: GoalList | null | undefined) {
  const items = list?.items ?? [];
  if (!items.length) return 0;
  return Math.round((items.filter(i => i.achieved).length / items.length) * 100);
}
function calcDeadlineRate(gs: DeadlineGoal[] | null | undefined) {
  const goals = gs ?? [];
  if (!goals.length) return 0;
  return Math.round((goals.filter(isDeadlineGoalChecked).length / goals.length) * 100);
}
function calcOverallRate(data: GoalsData) {
  const all = [
    ...(data.daily?.items ?? []),
    ...(data.weekly?.items ?? []),
    ...(data.monthly?.items ?? []),
    ...(data.deadlineGoals ?? []).map(g => ({ achieved: isDeadlineGoalChecked(g) })),
  ];
  if (!all.length) return 0;
  return Math.round((all.filter(g => g.achieved).length / all.length) * 100);
}
function newDeadlineGoal(goalType: DeadlineGoalType = "期限目標"): DeadlineGoal {
  const d = new Date(); d.setDate(d.getDate() + 7);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    text: "",
    category: "その他",
    deadline: d.toISOString().slice(0, 10),
    goalType,
    achieved: false,
  };
}
function goalTypeBadgeStyle(goalType: DeadlineGoalType): CSSProperties {
  return goalType === "習慣"
    ? { fontSize: 9, color: "#4a6741", background: "#e8f0e4", borderRadius: 8, padding: "1px 6px", marginRight: 4 }
    : { fontSize: 9, color: "#8b5a2b", background: "#fdf0e4", borderRadius: 8, padding: "1px 6px", marginRight: 4 };
}
function sortByTime(items: ScheduleItem[]) {
  return [...items].sort((a, b) => a.time.localeCompare(b.time));
}

function newScheduleItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeScheduleItem(data: unknown): ScheduleItem | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Partial<ScheduleItem>;
  if (typeof d.time !== "string" || typeof d.label !== "string") return null;
  return {
    id: typeof d.id === "string" && d.id ? d.id : newScheduleItemId(),
    time: normalizeScheduleTime(d.time),
    label: d.label.trim(),
    sub: typeof d.sub === "string" ? d.sub.trim() : "",
  };
}

function scheduleAlertFromItem(item: ScheduleItem): ScheduleAlert {
  return {
    time: item.time,
    message: `${item.label}の時間です。${item.sub || ""}`,
    type: item.id.startsWith("custom-") || item.id.startsWith("item-") ? "custom" : item.id,
  };
}

function syncScheduleAlerts(items: ScheduleItem[]): ScheduleAlert[] {
  return sortByTime(items).map(scheduleAlertFromItem);
}

function mergeLegacyScheduleItems(customItems: ScheduleItem[]): ScheduleItem[] {
  const customByTime = new Map(customItems.map(i => [i.time, i]));
  const baseIds = new Set(BASE_SCHEDULE_ITEMS.map(i => i.id));
  const merged = BASE_SCHEDULE_ITEMS.map(base => {
    const override = customByTime.get(base.time);
    return override ? { ...base, ...override, id: base.id } : { ...base };
  });
  const extras = customItems.filter(i => !baseIds.has(i.id) && !BASE_SCHEDULE_ITEMS.some(b => b.time === i.time));
  return sortByTime([...merged, ...extras]);
}
function parseAiGoalReply(reply: string): { text: string; category: GoalCategory } {
  const catMatch = reply.match(/【(.+?)】/);
  const category = GOAL_CATEGORIES.includes(catMatch?.[1] as GoalCategory)
    ? (catMatch![1] as GoalCategory)
    : "その他";
  const text = reply.replace(/【.+?】/, "").trim().split("\n")[0].slice(0, 60);
  return { text, category };
}

function daysUntilDeadline(deadline: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${deadline}T00:00:00`);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function isDeadlineActive(deadline: string): boolean {
  return daysUntilDeadline(deadline) >= 0;
}

function formatDeadlineJa(deadline: string): string {
  const d = new Date(`${deadline}T00:00:00`);
  return `${d.getMonth() + 1}月${d.getDate()}日まで`;
}

function daysRemainingColor(days: number): string {
  if (days <= 3) return "#c44a4a";
  if (days <= 7) return "#c17f4a";
  return "#4a6741";
}

function filterActiveDeadlineGoals(goals: DeadlineGoal[] | null | undefined): DeadlineGoal[] {
  return (goals ?? [])
    .filter(g => g?.deadline && isDeadlineActive(g.deadline))
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
}

function defaultDeadlineDate(daysFromNow = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function stripDeadlineSuffix(text: string): string {
  return text.replace(/までに$/u, "").trim();
}

function formatDeadlineShort(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function parseDeadlineText(text: string): string | null {
  const cleaned = stripDeadlineSuffix(text);
  if (!cleaned) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    const year = new Date().getFullYear();
    const d = new Date(year, month - 1, day);
    if (d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    return d.toISOString().slice(0, 10);
  }

  const jaMatch = cleaned.match(/^(\d{1,2})月(\d{1,2})日$/);
  if (jaMatch) {
    const month = Number(jaMatch[1]);
    const day = Number(jaMatch[2]);
    const year = new Date().getFullYear();
    const d = new Date(year, month - 1, day);
    if (d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    return d.toISOString().slice(0, 10);
  }

  return null;
}

function sanitizeDeadlineValue(value: string): string {
  const parsed = parseDeadlineText(value);
  if (parsed) return parsed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return defaultDeadlineDate();
}

function DeadlineTextInput({
  value,
  onChange,
  style,
  autoFocus,
  onBlur,
}: {
  value: string;
  onChange: (isoDate: string) => void;
  style?: CSSProperties;
  autoFocus?: boolean;
  onBlur?: () => void;
}) {
  const [text, setText] = useState(() => formatDeadlineShort(value));

  useEffect(() => {
    setText(formatDeadlineShort(value));
  }, [value]);

  const commitText = (raw: string) => {
    const cleaned = stripDeadlineSuffix(raw);
    const parsed = parseDeadlineText(cleaned);
    if (parsed) {
      onChange(parsed);
      setText(formatDeadlineShort(parsed));
      return;
    }
    setText(cleaned);
  };

  return (
    <input
      type="text"
      placeholder="例：6/30"
      value={text}
      autoFocus={autoFocus}
      onChange={e => setText(stripDeadlineSuffix(e.target.value))}
      onCompositionEnd={e => commitText(e.currentTarget.value)}
      onBlur={() => {
        const parsed = parseDeadlineText(text);
        if (parsed) {
          onChange(parsed);
          setText(formatDeadlineShort(parsed));
        } else {
          setText(formatDeadlineShort(value));
        }
        onBlur?.();
      }}
      style={style}
    />
  );
}

function parseAiDeadlineReply(reply: string): { text: string; category: GoalCategory; deadline: string; goalType: DeadlineGoalType } {
  const parsed = parseAiGoalReply(reply);
  const dateMatch = reply.match(/(\d{4}-\d{2}-\d{2})/);
  const deadline = dateMatch?.[1] ?? defaultDeadlineDate();
  const lines = reply.replace(/【.+?】/, "").trim().split("\n").filter(Boolean);
  const text = (lines.find(l => !/^\d{4}-\d{2}-\d{2}$/.test(l.trim())) ?? parsed.text).slice(0, 60);
  const goalType: DeadlineGoalType = /毎日|習慣|日々|継続/.test(reply) ? "習慣" : "期限目標";
  return { text, category: parsed.category, deadline, goalType };
}

function normalizeScheduleTime(time: string): string {
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return time;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function parseTimeFromAdvice(text: string): string | null {
  if (/就寝前|寝る前|眠る前/.test(text)) return "22:00";
  if (/起床|起きたら/.test(text) && !/\d{1,2}\s*時/.test(text)) return "06:00";
  if (/朝食|朝の食事/.test(text) && !/\d{1,2}\s*時/.test(text)) return "09:00";
  if (/夕食|晩ごはん|晩御飯/.test(text) && !/\d{1,2}\s*時/.test(text)) return "16:00";

  const hm = text.match(/(\d{1,2})\s*[時:：]\s*(\d{1,2})?/);
  if (hm) {
    return `${hm[1].padStart(2, "0")}:${(hm[2] ?? "00").padStart(2, "0")}`;
  }

  const after = text.match(/(\d{1,2})\s*時以降/);
  if (after) return `${after[1].padStart(2, "0")}:00`;

  return null;
}

function parseLabelFromAdvice(text: string): string {
  if (/塩湯|塩清|自然塩/.test(text)) return "塩湯";
  if (/食事|糖質|カロリー|間食/.test(text)) return "食事";
  if (/就寝|睡眠|寝る/.test(text)) return "就寝";
  if (/入浴|風呂/.test(text)) return "入浴";
  if (/運動|ランニング|散歩|ストレッチ/.test(text)) return "運動";
  if (/起床/.test(text)) return "起床";
  return "AI提案";
}

function extractScheduleSuggestionsFromText(text: string): ScheduleUpdate[] {
  const segments = text.split(/[\n。！？]/).map(s => s.trim()).filter(s => s.length >= 4);
  const results: ScheduleUpdate[] = [];
  const seen = new Set<string>();

  for (const seg of segments) {
    if (!/(\d{1,2}\s*時|就寝前|寝る前|塩湯|食事|糖質|入浴|起床|運動|ランニング|散歩)/.test(seg)) continue;
    const time = parseTimeFromAdvice(seg);
    if (!time) continue;
    const label = parseLabelFromAdvice(seg);
    const key = `${time}-${label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      time,
      label,
      sub: seg.length > 36 ? `${seg.slice(0, 36)}…` : seg,
    });
  }

  return results;
}

function buildScheduleSuggestions(
  content: string,
  fromApi?: ScheduleUpdate[],
  legacy?: ScheduleUpdate | null
): ScheduleSuggestion[] {
  const merged = [
    ...(fromApi ?? []),
    ...(legacy ? [legacy] : []),
    ...extractScheduleSuggestionsFromText(content),
  ];
  const seen = new Set<string>();
  const unique: ScheduleSuggestion[] = [];

  merged.forEach((item, idx) => {
    if (!item.time || !item.label) return;
    const time = normalizeScheduleTime(item.time);
    const key = `${time}-${item.label}`;
    if (seen.has(key)) return;
    seen.add(key);
    unique.push({
      time,
      label: item.label,
      sub: item.sub ?? "",
      id: `sched-${Date.now()}-${idx}`,
    });
  });

  return unique;
}

function createAiChatMessage(content: string, reply: ChatReply): Message {
  if (reply.scheduleReflection) {
    return {
      type: "ai",
      text: content,
      scheduleReflection: reply.scheduleReflection,
      showSchedule: true,
    };
  }
  const suggestions = buildScheduleSuggestions(content, reply.scheduleSuggestions, reply.scheduleUpdate);
  return {
    type: "ai",
    text: content,
    scheduleSuggestions: suggestions.length ? suggestions : undefined,
  };
}

type Message = {
  type: string;
  text: string;
  choices?: string[];
  step?: string;
  showSchedule?: boolean;
  multi?: boolean;
  scheduleSuggestions?: ScheduleSuggestion[];
  scheduleReflection?: ScheduleReflection;
  reflected?: boolean;
  addedScheduleIds?: string[];
};

type Tab = "home" | "chat" | "history" | "sound" | "display" | "settings";
type MoodKey = "anger" | "anxiety" | "sadness" | "fog" | "manic";
type CountOption = number | "5回以上";
type HealthFieldId =
  | "bloodPressure"
  | "menstrual"
  | "allergy"
  | "alcohol"
  | "kampo"
  | "phoneTime"
  | "weightTemp";
type MenstrualKey = "pain" | "clot" | "pms" | "binge" | "irritability" | "anxiety";
type AllergyKey = "runnyNose" | "stuffyNose" | "itchyEyes";

type HealthForm = {
  sleepBed: string;
  sleepWake: string;
  dinnerTime: string;
  awakenings: CountOption;
  nightToilet: CountOption;
  morningCondition: number;
  bowelType: string;
  bowelCount: CountOption;
  mood: Record<MoodKey, number>;
  symptoms: string[];
  otherSymptom: string;
  diary: string;
  bloodPressure: { systolic: string; diastolic: string };
  menstrual: Record<MenstrualKey, number>;
  allergy: Record<AllergyKey, number>;
  alcohol: { type: string; amount: string };
  kampoTaken: string[];
  phoneTimeMinutes: string;
  weight: string;
  temperature: string;
};

const MOCK_SCHEDULE = {
  diagnosis: "水滞",
  wakeTime: "06:00",
  sleepTime: "22:30",
  bathTime: "20:45",
  mealTime1: "09:00",
  mealTime2: "16:00",
  saltMorning: "朝：自然塩3gをお湯に溶かして",
  saltEvening: "就寝前：自然塩3gを白湯で",
  advice: "朝のむくみと頭痛は水滞のサインです。今日は18時以降の糖質を控え、就寝前に塩湯をしっかり飲みましょう。",
  alerts: [
    { time: "06:00", message: "起床の時間です。朝の塩湯3gをどうぞ", type: "wake" },
    { time: "09:00", message: "朝食の時間です。糖質・お米中心で", type: "meal" },
    { time: "16:00", message: "夕食の時間です。塩・タンパク質・海産物中心で", type: "meal" },
    { time: "20:45", message: "入浴の時間です。38〜39度・30分以内で", type: "bath" },
    { time: "22:00", message: "就寝前の塩湯3gを飲んで22:30までに就寝を", type: "sleep" },
  ]
};

const BOWEL_OPTIONS = ["固い", "普通", "柔らかい", "水様", "兎糞"];
const SYMPTOM_OPTIONS = ["頭痛", "疲労", "むくみ", "鼻水", "咳", "その他"];
const MOOD_ITEMS: { key: MoodKey; label: string }[] = [
  { key: "anger", label: "怒り" },
  { key: "anxiety", label: "不安" },
  { key: "sadness", label: "悲しみ" },
  { key: "fog", label: "頭のモヤモヤ" },
  { key: "manic", label: "躁状態" },
];
const COUNT_OPTIONS: CountOption[] = [0, 1, 2, 3, 4, 5, "5回以上"];

const HEALTH_FIELD_OPTIONS: { id: HealthFieldId; icon: string; label: string; description: string }[] = [
  { id: "bloodPressure", icon: "", label: "血圧", description: "収縮期・拡張期" },
  { id: "menstrual", icon: "", label: "生理関連", description: "生理痛・塊・PMS・過食・イライラ・不安" },
  { id: "allergy", icon: "", label: "アレルギー", description: "鼻水・鼻づまり・目のかゆみ（各5段階）" },
  { id: "alcohol", icon: "", label: "飲酒", description: "種類・量" },
  { id: "kampo", icon: "", label: "漢方・薬の内服", description: "内服チェック" },
  { id: "phoneTime", icon: "", label: "携帯使用時間", description: "1日の使用時間（分）" },
  { id: "weightTemp", icon: "", label: "体重・体温", description: "kg・℃" },
];

const MENSTRUAL_ITEMS: { key: MenstrualKey; label: string }[] = [
  { key: "pain", label: "生理痛" },
  { key: "clot", label: "塊" },
  { key: "pms", label: "PMS" },
  { key: "binge", label: "過食" },
  { key: "irritability", label: "イライラ" },
  { key: "anxiety", label: "不安" },
];

const ALLERGY_ITEMS: { key: AllergyKey; label: string }[] = [
  { key: "runnyNose", label: "鼻水" },
  { key: "stuffyNose", label: "鼻づまり" },
  { key: "itchyEyes", label: "目のかゆみ" },
];

const KAMPO_OPTIONS = ["漢方（朝）", "漢方（昼）", "漢方（夕）", "市販薬", "処方薬"];

const INITIAL_HEALTH: HealthForm = {
  sleepBed: "22:30",
  sleepWake: "06:00",
  dinnerTime: "16:00",
  awakenings: 0,
  nightToilet: 0,
  morningCondition: 5,
  bowelType: "",
  bowelCount: 0,
  mood: { anger: 1, anxiety: 1, sadness: 1, fog: 1, manic: 1 },
  symptoms: [],
  otherSymptom: "",
  diary: "",
  bloodPressure: { systolic: "", diastolic: "" },
  menstrual: { pain: 1, clot: 1, pms: 1, binge: 1, irritability: 1, anxiety: 1 },
  allergy: { runnyNose: 1, stuffyNose: 1, itchyEyes: 1 },
  alcohol: { type: "", amount: "" },
  kampoTaken: [],
  phoneTimeMinutes: "",
  weight: "",
  temperature: "",
};

const cardStyle = themeCardStyle;
const homeActionBtnStyle = themeHomeActionBtnStyle;
const fieldLabelStyle = themeFieldLabelStyle;
const inputStyle = themeInputStyle;

type ApiMessage = { role: "user" | "assistant"; content: string };

function toApiMessages(msgs: Message[]): ApiMessage[] {
  return msgs.map(m => ({
    role: m.type === "user" ? "user" : "assistant",
    content: m.text,
  }));
}

type HourlyWeather = {
  hour: number;
  temperature: number;
  humidity: number;
  weatherCode: number;
};

const DEFAULT_USER_NAME = "つゆくさ太郎";

const USER_MANUAL_STEP_KEYS = [
  { icon: "", titleKey: "manual.display.title", bodyKey: "manual.display.body" },
  { icon: "", titleKey: "manual.home.title", bodyKey: "manual.home.body" },
  { icon: "", titleKey: "manual.radio.title", bodyKey: "manual.radio.body" },
  { icon: "", titleKey: "manual.binaural.title", bodyKey: "manual.binaural.body" },
  { icon: "", titleKey: "manual.chat.title", bodyKey: "manual.chat.body" },
  { icon: "", titleKey: "manual.health.title", bodyKey: "manual.health.body" },
  { icon: "", titleKey: "manual.calendar.title", bodyKey: "manual.calendar.body" },
  { icon: "", titleKey: "manual.data.title", bodyKey: "manual.data.body" },
] as const;

type WeatherData = {
  temperature: number;
  humidity: number;
  weatherCode: number;
  precipitation: number;
  moonAge: number;
  moonPhase: string;
  sunrise: string | null;
  sunset: string | null;
  hourly: HourlyWeather[];
};

type UserProfile = {
  name: string;
  nickname: string;
  nameConfigured: boolean;
  onboardingComplete: boolean;
  birthDate?: string;
  gender?: string;
};

const INITIAL_USER_PROFILE: UserProfile = {
  name: DEFAULT_USER_NAME,
  nickname: "",
  nameConfigured: false,
  onboardingComplete: false,
};

function getDisplayName(profile: UserProfile): string {
  return profile.nickname.trim() || profile.name.trim() || DEFAULT_USER_NAME;
}

function markOnboardingCompleteInStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("tuyukusa-user-profile");
    const base = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    localStorage.setItem(
      "tuyukusa-user-profile",
      JSON.stringify({ ...base, onboardingComplete: true }),
    );
  } catch {
    /* ignore */
  }
}

function normalizeUserProfile(data: unknown): UserProfile {
  if (!data || typeof data !== "object") return INITIAL_USER_PROFILE;
  const d = data as Partial<UserProfile>;
  const name = typeof d.name === "string" && d.name.trim() ? d.name.trim() : DEFAULT_USER_NAME;
  const nameConfigured = !!d.nameConfigured;
  const onboardingComplete = d.onboardingComplete === true;
  return {
    name,
    nickname: typeof d.nickname === "string" ? d.nickname.trim() : "",
    nameConfigured,
    onboardingComplete,
    birthDate: typeof d.birthDate === "string" ? d.birthDate.trim() : undefined,
    gender: typeof d.gender === "string" ? d.gender.trim() : undefined,
  };
}

type AiSuggestedGoal = { text: string; category: GoalCategory; periodKey: string };

const INITIAL_AI_SUGGESTIONS: Record<GoalPeriod, AiSuggestedGoal | null> = {
  daily: null,
  weekly: null,
  monthly: null,
};

function toStoredChatMessages(messages: Message[]): StoredChatMessage[] {
  return messages.map(({ type, text, step, showSchedule, choices }) => ({
    type,
    text,
    step,
    showSchedule,
    choices,
  }));
}

function fromStoredChatMessages(stored: StoredChatMessage[]): Message[] {
  return stored.map(m => ({ ...m }));
}

const BASE_SCHEDULE_ITEMS: ScheduleItem[] = [
  { id: "wake", time: "06:00", label: "起床", sub: "朝：自然塩3gをお湯に溶かして" },
  { id: "meal1", time: "09:00", label: "朝食", sub: "糖質・お米中心で気を補う" },
  { id: "meal2", time: "16:00", label: "夕食", sub: "塩・タンパク質・海産物中心" },
  { id: "bath", time: "20:45", label: "入浴", sub: "38〜39度・30分以内" },
  { id: "sleep", time: "22:30", label: "就寝", sub: "就寝前：自然塩3gを白湯で" },
];

type ScheduleTemplates = Record<number, ScheduleItem[]>;

const WEEKDAY_OPTIONS = [
  { key: 1, label: "月" },
  { key: 2, label: "火" },
  { key: 3, label: "水" },
  { key: 4, label: "木" },
  { key: 5, label: "金" },
  { key: 6, label: "土" },
  { key: 0, label: "日" },
] as const;

function cloneScheduleItems(items: ScheduleItem[]): ScheduleItem[] {
  return items.map(i => ({ ...i }));
}

function createDefaultScheduleTemplates(): ScheduleTemplates {
  const templates: ScheduleTemplates = {};
  for (const { key } of WEEKDAY_OPTIONS) {
    templates[key] = cloneScheduleItems(BASE_SCHEDULE_ITEMS);
  }
  return templates;
}

const DEFAULT_SCHEDULE_TEMPLATES = createDefaultScheduleTemplates();

function buildScheduleItemsForDate(templates: ScheduleTemplates, dayKey = getDayKey()): ScheduleItem[] {
  const date = new Date(`${dayKey}T12:00:00`);
  const weekday = date.getDay();
  const dayItems = templates[weekday];
  if (Array.isArray(dayItems) && dayItems.length > 0) {
    return sortByTime(
      dayItems.map(normalizeScheduleItem).filter((i): i is ScheduleItem => i !== null)
    );
  }
  return cloneScheduleItems(BASE_SCHEDULE_ITEMS);
}

function createFreshSchedule(dayKey = getDayKey(), templates: ScheduleTemplates = DEFAULT_SCHEDULE_TEMPLATES): ScheduleState {
  const items = buildScheduleItemsForDate(templates, dayKey);
  return { dayKey, items, alerts: syncScheduleAlerts(items) };
}

function normalizeScheduleTemplates(data: unknown): ScheduleTemplates {
  const fallback = createDefaultScheduleTemplates();
  if (!data || typeof data !== "object") return fallback;
  const d = data as Record<string, unknown>;
  const result: ScheduleTemplates = { ...fallback };
  for (const { key } of WEEKDAY_OPTIONS) {
    const raw = d[String(key)] ?? d[key];
    if (Array.isArray(raw) && raw.length > 0) {
      const items = raw.map(normalizeScheduleItem).filter((i): i is ScheduleItem => i !== null);
      if (items.length) result[key] = items;
    }
  }
  return result;
}

const INITIAL_SCHEDULE: ScheduleState = createFreshSchedule();

function normalizeSchedule(data: unknown, templates: ScheduleTemplates = DEFAULT_SCHEDULE_TEMPLATES): ScheduleState {
  const dayKey = getDayKey();
  const fallback = createFreshSchedule(dayKey, templates);
  if (!data || typeof data !== "object") return fallback;
  const d = data as Partial<ScheduleState & { customItems?: ScheduleItem[] }>;
  if (d.dayKey !== dayKey) return fallback;

  let items: ScheduleItem[];
  if (Array.isArray(d.items) && d.items.length > 0) {
    items = sortByTime(
      d.items.map(normalizeScheduleItem).filter((i): i is ScheduleItem => i !== null)
    );
  } else if (Array.isArray(d.customItems)) {
    const custom = d.customItems
      .map(normalizeScheduleItem)
      .filter((i): i is ScheduleItem => i !== null);
    items = mergeLegacyScheduleItems(custom);
  } else {
    items = fallback.items;
  }

  if (!items.length) items = fallback.items;
  return { dayKey, items, alerts: syncScheduleAlerts(items) };
}

function normalizeAiSuggestions(data: unknown): Record<GoalPeriod, AiSuggestedGoal | null> {
  const defaults = { daily: null, weekly: null, monthly: null } as Record<GoalPeriod, AiSuggestedGoal | null>;
  if (!data || typeof data !== "object") return defaults;
  const d = data as Partial<Record<GoalPeriod, AiSuggestedGoal | null>>;
  return {
    daily: d.daily ?? null,
    weekly: d.weekly ?? null,
    monthly: d.monthly ?? null,
  };
}

function ScheduleEditModal({
  draft,
  onChange,
  onSave,
  onDelete,
  onClose,
}: {
  draft: ScheduleEditDraft;
  onChange: (item: ScheduleItem) => void;
  onSave: () => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const { mode, item } = draft;
  const canSave = item.label.trim().length > 0 && /^\d{1,2}:\d{2}$/.test(item.time);

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26,20,16,0.45)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#f5f0e8",
          borderRadius: "16px 16px 0 0",
          padding: "20px 16px 28px",
          boxShadow: "0 -4px 24px rgba(26,20,16,0.15)",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: "bold", color: "#3d3228", marginBottom: 16 }}>
          {mode === "add" ? "スケジュールを追加" : "スケジュールを編集"}
        </div>
        <div style={fieldLabelStyle}>時間</div>
        <input
          type="time"
          value={item.time}
          onChange={e => onChange({ ...item, time: e.target.value })}
          style={{ ...inputStyle, marginBottom: 12 }}
        />
        <div style={fieldLabelStyle}>内容</div>
        <input
          type="text"
          placeholder="例：朝食"
          value={item.label}
          onChange={e => onChange({ ...item, label: e.target.value })}
          style={{ ...inputStyle, marginBottom: 12 }}
        />
        <div style={fieldLabelStyle}>メモ（任意）</div>
        <input
          type="text"
          placeholder="例：糖質・お米中心で"
          value={item.sub}
          onChange={e => onChange({ ...item, sub: e.target.value })}
          style={{ ...inputStyle, marginBottom: 16 }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          {mode === "edit" && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 10,
                border: "1.5px solid #c44a4a",
                background: "white",
                color: "#c44a4a",
                fontSize: 14,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              削除
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 10,
              border: "1.5px solid rgba(60,40,20,0.12)",
              background: "white",
              color: "#3d3228",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            キャンセル
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={onSave}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 10,
              border: "none",
              background: canSave ? "#1a1410" : "#9a8b7a",
              color: "#f5f0e8",
              fontSize: 14,
              fontWeight: "bold",
              cursor: canSave ? "pointer" : "default",
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function ClientFormattedDate() {
  const [dateStr, setDateStr] = useState("");
  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      })
    );
  }, []);
  return (
    <div style={{ fontSize: 11, opacity: 0.6 }} suppressHydrationWarning>
      {dateStr || "\u00a0"}
    </div>
  );
}

function weatherLabel(code: number): string {
  if (code === 0) return "晴れ";
  if (code <= 3) return "くもり";
  if (code <= 48) return "霧";
  if (code <= 67) return "雨";
  if (code <= 77) return "雪";
  if (code <= 82) return "にわか雨";
  if (code <= 86) return "にわか雪";
  if (code >= 95) return "雷雨";
  return "くもり";
}

function getSeasonLabel(d = new Date()): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if (m === 12 && day >= 15 && day <= 25) return "冬至前後（腎が疲弊しやすい）";
  if (m >= 3 && m <= 5) return "春（肝が活発・イライラ注意）";
  if (m === 6 || (m === 7 && day <= 20)) return "梅雨（湿邪・水滞注意）";
  if (m >= 9 && m <= 11) return "秋（燥邪・乾燥注意）";
  if (m === 12 || m <= 2) return "冬（腎・寒さのケア）";
  return "夏（暑熱・血熱注意）";
}

function buildEnvironmentContext(weather: WeatherData | null): string {
  if (!weather) return `季節: ${getSeasonLabel()}`;
  return [
    `季節: ${getSeasonLabel()}`,
    `気温: ${weather.temperature}℃`,
    `湿度: ${weather.humidity}%`,
    `天気: ${weatherLabel(weather.weatherCode)}`,
    `降水量: ${weather.precipitation}mm`,
    `月齢: ${weather.moonAge.toFixed(1)}日`,
    `月の満ち欠け: ${weather.moonPhase}`,
  ].join("\n");
}

type ChatTimeBand = "morning" | "day" | "evening" | "late";

function getChatTimeBand(hour = new Date().getHours()): ChatTimeBand {
  if (hour >= 5 && hour < 10) return "morning";
  if (hour >= 10 && hour < 17) return "day";
  if (hour >= 17 && hour < 22) return "evening";
  return "late";
}

function buildTemperatureComment(temperature: number | null | undefined): string {
  if (temperature == null || Number.isNaN(temperature)) return "";
  if (temperature >= 28) {
    return `\n\n今日は${temperature}℃と暑いです。熱中症に注意し、こまめな塩・水分補給を意識しましょう。`;
  }
  if (temperature <= 10) {
    return `\n\n今日は${temperature}℃と冷え込んでいます。体を温めるため、入浴と塩湯で足元から温まりましょう。`;
  }
  return "";
}

function buildReturnUserGreeting(name: string): { text: string; choices: string[] } {
  return {
    text: `お久しぶりです、${name}さん\n前回から生活リズムに変化はありましたか？`,
    choices: ["変化あり（教える）", "変化なし", "新機能について教えて"],
  };
}

function buildUpdateAiMessage(changes: string[]): string {
  const list = changes.length ? changes.map(c => `・${c}`).join("\n") : "・機能改善と安定性の向上";
  return `今回のアップデート内容です\n\n${list}\n\n気になる点があれば、何でもお聞きください。`;
}

function buildResumeOnboardingPrompt(): { text: string; choices: string[] } {
  return {
    text: "まだお聞きしていないことがあります。\nよろしければ教えてください。",
    choices: ["続きから答える", "後で"],
  };
}

function buildChatOpeningMessage(weather: WeatherData | null): { text: string; choices: string[] } {
  const band = getChatTimeBand();
  const greetingByBand: Record<ChatTimeBand, string> = {
    morning: "おはようございます。今朝の目覚めはいかがですか？",
    day: "こんにちは。今日の体調はいかがですか？",
    evening: "お疲れさまです。今日はいかがでしたか？",
    late: "夜遅くまでお疲れさまです。眠れそうですか？",
  };

  const weatherLine = weather
    ? `\n（${weatherLabel(weather.weatherCode)}・${weather.temperature}℃）`
    : "";
  const tempComment = buildTemperatureComment(weather?.temperature);

  const text =
    `${greetingByBand[band]}${weatherLine}${tempComment}\n\n` +
    "つゆくさAIです。漢方・養生の知恵をもとに、あなたの生活リズムを整えるお手伝いをします。\n\n" +
    "眠れない・早起きしたい・集中力を上げたいなど、今の悩みや「こうしたい」を自由に教えてください。";

  return {
    text,
    choices: [
      "最近眠れない",
      "22時に寝たい",
      "集中力を上げたい",
      "自由に相談する",
    ],
  };
}

type ChatFlowStep = "intro" | "goal" | "return_home" | "dinner" | "bath" | "wake" | "proposal" | "free";

type ChatFlowData = {
  goal?: string;
  returnHome?: string;
  dinner?: string;
  bedtime?: string;
  bath?: string;
  wake?: string;
  sleepDuration?: string;
};

const CHAT_GOAL_FROM_CHOICE: Record<string, string> = {
  "最近眠れない": "最近眠れない",
  "22時に寝たい": "22時に寝たい",
  "集中力を上げたい": "集中力を上げたい",
  "22時には眠りたい": "22時には眠りたい",
  "早起きしたい": "早起きしたい",
  "食事の時間を整えたい": "食事の時間を整えたい",
};

type FlowQuestionStep = Exclude<ChatFlowStep, "intro" | "goal" | "proposal" | "free">;

const FLOW_STEP_CONFIG: Record<
  FlowQuestionStep,
  { question: string; choices: string[]; field: keyof ChatFlowData; hint: string; next: FlowQuestionStep | "proposal" }
> = {
  return_home: {
    question: "だいたい何時頃に帰宅されますか？",
    choices: ["17:00頃", "18:00頃", "19:00頃", "20:00以降"],
    field: "returnHome",
    hint: "帰宅後はまず足を温め、リラックスできる時間を確保しましょう。",
    next: "dinner",
  },
  dinner: {
    question: "夕食は何時頃にとりたいですか？",
    choices: ["16:00頃", "17:00頃", "18:00頃", "19:00以降"],
    field: "dinner",
    hint: "18時以降の糖質は控えめに。消化に優しい塩・タンパク質・海産物中心の夕食が養生に合います。",
    next: "bath",
  },
  bath: {
    question: "入浴は何時頃が理想ですか？",
    choices: ["19:30頃", "20:00頃", "20:30頃", "21:00頃"],
    field: "bath",
    hint: "38〜39度・30分以内の入浴で血行を促し、就寝90分前が理想です。",
    next: "wake",
  },
  wake: {
    question: "翌朝は何時に起きたいですか？",
    choices: ["6:00", "6:30", "7:00", "7:30"],
    field: "wake",
    hint: "早寝早起きは気を補い、一日のリズムの土台になります。",
    next: "proposal",
  },
};

function parseGoalFromChoice(choice: string): string | null {
  if (choice in CHAT_GOAL_FROM_CHOICE) return CHAT_GOAL_FROM_CHOICE[choice];
  if (choice === "自分で入力する" || choice === "自由に相談する") return null;
  return choice.trim() || null;
}

function buildScheduleProposalPrompt(data: ChatFlowData): string {
  return [
    "【生活リズム相談】以下の情報をもとに、漢方・養生（気血水・陰陽・塩清療法）の観点からアドバイスを交え、最適な1日のスケジュールを提案してください。",
    "",
    `・目標: ${data.goal ?? "未設定"}`,
    `・帰宅時間: ${data.returnHome ?? "未設定"}`,
    `・夕食時間: ${data.dinner ?? "未設定"}`,
    `・入浴時間: ${data.bath ?? "未設定"}`,
    `・起床時間: ${data.wake ?? "未設定"}`,
    "",
    "起床・朝食・塩湯・夕食・入浴・就寝前塩湯・就寝の時刻を含め、",
    "最終的にREFLECT_SCHEDULE形式のJSONで5〜7項目返してください（ユーザーが反映できるように）。",
  ].join("\n");
}

function buildHealthSummary(form: HealthForm): string {
  const parts: string[] = [];
  if (form.morningCondition) parts.push(`朝の体調: ${form.morningCondition}/10`);
  if (form.symptoms?.length) parts.push(`症状: ${form.symptoms.join("、")}`);
  if (form.bowelType) parts.push(`便通: ${form.bowelType}（${form.bowelCount}回）`);
  const moodHigh = MOOD_ITEMS.filter(i => form.mood[i.key] >= 7).map(i => i.label);
  if (moodHigh.length) parts.push(`気分が強い項目: ${moodHigh.join("、")}`);
  return parts.length ? parts.join("\n") : "体調記録なし";
}

async function fetchChatReply(
  messages: Message[],
  environmentContext?: string,
  userKnowledgeContext?: string,
  healthContext?: string,
  locale?: AppLocale
): Promise<ChatReply> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: toApiMessages(messages),
      environmentContext,
      userKnowledgeContext,
      healthContext,
      locale: locale ?? "ja",
    }),
  });
  if (!res.ok) throw new Error("Chat API request failed");
  return (await res.json()) as ChatReply;
}

function CountSelector({
  value,
  onChange,
  label,
}: {
  value: CountOption;
  onChange: (v: CountOption) => void;
  label: string;
}) {
  return (
    <div style={cardStyle}>
      <div style={fieldLabelStyle}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {COUNT_OPTIONS.map(opt => {
          const selected = value === opt;
          return (
            <button
              key={String(opt)}
              type="button"
              onClick={() => onChange(opt)}
              style={{
                minWidth: 40,
                padding: "8px 10px",
                borderRadius: 20,
                border: selected ? "1.5px solid #c17f4a" : "1.5px solid rgba(60,40,20,0.12)",
                background: selected ? "#fdf0e4" : "#ede5d4",
                color: selected ? "#c17f4a" : "#3d3228",
                fontSize: 12,
                fontWeight: selected ? "bold" : "normal",
                cursor: "pointer",
              }}
            >
              {opt === "5回以上" ? opt : `${opt}回`}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LevelSlider({
  label,
  value,
  onChange,
  min,
  max,
  minLabel,
  maxLabel,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "#3d3228" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: "bold", color: "#c17f4a" }}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#c17f4a" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#3d3228", opacity: 0.5, marginTop: 2 }}>
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

function MoodSlider({
  moodKey,
  label,
  value,
  onChange,
}: {
  moodKey: MoodKey;
  label: string;
  value: number;
  onChange: (key: MoodKey, value: number) => void;
}) {
  return (
    <LevelSlider
      label={label}
      value={value}
      onChange={val => onChange(moodKey, val)}
      min={1}
      max={10}
      minLabel="弱い"
      maxLabel="強い"
    />
  );
}

function RateBadge({ rate }: { rate: number }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: "bold", color: rate === 100 ? "#4a6741" : "#c17f4a",
      background: rate === 100 ? "#e8f0e4" : "#fdf0e4",
      borderRadius: 12, padding: "3px 10px",
    }}>
      達成率 {rate}%
    </span>
  );
}

function CategorySelect({
  value,
  onChange,
}: {
  value: GoalCategory;
  onChange: (c: GoalCategory) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
      {GOAL_CATEGORIES.map(cat => (
        <ChipButton key={cat} selected={value === cat} onClick={() => onChange(cat)}>
          {cat}
        </ChipButton>
      ))}
    </div>
  );
}

function GoalTypeSelect({
  value,
  onChange,
}: {
  value: DeadlineGoalType;
  onChange: (t: DeadlineGoalType) => void;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.6, marginBottom: 6 }}>種別</div>
      <div style={{ display: "flex", gap: 6 }}>
        {DEADLINE_GOAL_TYPES.map(type => (
          <ChipButton key={type} selected={value === type} onClick={() => onChange(type)}>
            {type}
          </ChipButton>
        ))}
      </div>
      <div style={{ fontSize: 10, color: "#9a8b7a", marginTop: 6, lineHeight: 1.5 }}>
        {value === "習慣" ? "毎日チェック（翌日リセット）" : "期限までに1回達成"}
      </div>
    </div>
  );
}

function PeriodGoalCard({
  title,
  resetHint,
  goalList,
  rate,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  optional = false,
  showAiButton = false,
  isSuggesting = false,
  onAiSuggest,
  aiSuggestion,
  onAdoptAi,
  hideCategories = false,
}: {
  title: string;
  resetHint: string;
  goalList: GoalList;
  rate: number;
  onAddItem: (text: string, category: GoalCategory) => void;
  onUpdateItem: (id: string, patch: Partial<GoalItem>) => void;
  onRemoveItem: (id: string) => void;
  optional?: boolean;
  showAiButton?: boolean;
  isSuggesting?: boolean;
  onAiSuggest?: () => void;
  aiSuggestion?: AiSuggestedGoal | null;
  onAdoptAi?: () => void;
  hideCategories?: boolean;
}) {
  const [inputText, setInputText] = useState("");
  const [inputCategory, setInputCategory] = useState<GoalCategory>("その他");

  const handleAdd = () => {
    if (!inputText.trim()) return;
    onAddItem(inputText.trim(), hideCategories ? "その他" : inputCategory);
    setInputText("");
  };

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: "bold", color: "#3d3228" }}>
            {title}
            {optional && <span style={{ fontSize: 10, fontWeight: "normal", color: "#9a8b7a", marginLeft: 6 }}>任意</span>}
          </div>
          <div style={{ fontSize: 10, color: "#3d3228", opacity: 0.5, marginTop: 2 }}>{resetHint}</div>
        </div>
        {goalList?.items?.length ? <RateBadge rate={rate} /> : null}
      </div>
      {optional && (
        <div style={{ fontSize: 11, color: "#8b7355", marginBottom: 8, lineHeight: 1.5 }}>
          未入力でもOK。自由に追加するか、AIに提案してもらえます。
        </div>
      )}
      {!hideCategories && (
        <CategorySelect value={inputCategory} onChange={setInputCategory} />
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          type="text"
          placeholder="自分で目標を入力..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
        />
        <button
          type="button"
          onClick={handleAdd}
          style={{
            padding: "0 14px",
            borderRadius: 10,
            border: "none",
            background: "#1a1410",
            color: "#f5f0e8",
            fontSize: 12,
            fontWeight: "bold",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          追加
        </button>
      </div>
      {(goalList?.items ?? []).map(item => (
        <div
          key={item.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            marginBottom: 6,
            background: item.achieved ? "#ede5d4" : "#f5f0e8",
            borderRadius: 8,
            opacity: item.achieved ? 0.75 : 1,
          }}
        >
          <input
            type="checkbox"
            checked={item.achieved}
            onChange={e => onUpdateItem(item.id, { achieved: e.target.checked })}
            style={{ width: 16, height: 16, accentColor: "#c17f4a", flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            {!hideCategories && (
              <span style={{ fontSize: 9, color: "#c17f4a", background: "#fdf0e4", borderRadius: 8, padding: "1px 6px", marginRight: 4 }}>
                {item.category}
              </span>
            )}
            <span style={{ fontSize: 13, color: "#3d3228", textDecoration: item.achieved ? "line-through" : "none" }}>
              {item.text}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onRemoveItem(item.id)}
            style={{ background: "none", border: "none", color: "#9a8b7a", fontSize: 16, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      ))}
      {showAiButton && onAiSuggest && (
        <button
          type="button"
          onClick={onAiSuggest}
          disabled={isSuggesting}
          style={{
            width: "100%",
            padding: "10px",
            marginTop: 4,
            borderRadius: 10,
            border: "1.5px solid #c17f4a",
            background: "#fdf0e4",
            color: "#8b5a2b",
            fontSize: 12,
            fontWeight: "bold",
            cursor: isSuggesting ? "wait" : "pointer",
            opacity: isSuggesting ? 0.7 : 1,
          }}
        >
          {isSuggesting ? "AIが提案中..." : "AIに提案してもらう"}
        </button>
      )}
      {aiSuggestion?.text && onAdoptAi && (
        <div style={{ marginTop: 10, padding: 10, background: "#e8f0e4", borderRadius: 8, fontSize: 12 }}>
          <div style={{ fontSize: 10, color: "#4a6741", marginBottom: 4 }}>AI提案</div>
          {!hideCategories && (
            <span style={{ fontSize: 9, color: "#c17f4a", background: "#fdf0e4", borderRadius: 8, padding: "1px 6px", marginRight: 4 }}>
              {aiSuggestion.category}
            </span>
          )}
          {aiSuggestion.text}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button type="button" onClick={onAdoptAi} style={{ flex: 1, padding: "6px", borderRadius: 6, border: "none", background: "#1a1410", color: "#f5f0e8", fontSize: 11, cursor: "pointer" }}>
              リストに追加
            </button>
            {onAiSuggest && (
              <button type="button" onClick={onAiSuggest} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(60,40,20,0.15)", background: "white", fontSize: 11, cursor: "pointer" }}>
                再提案
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HomeGoalSection({
  title,
  goalList,
  collapsed,
  onToggleCollapse,
  collapsible,
  inputText,
  onInputTextChange,
  onAdd,
  onUpdateItem,
  onRemoveItem,
  onAiSuggest,
  isSuggesting,
  aiSuggestion,
  onAdoptAi,
  hideCategories = false,
  inputCategory = "その他",
  onInputCategoryChange,
}: {
  title: string;
  goalList: GoalList;
  collapsed: boolean;
  onToggleCollapse?: () => void;
  collapsible?: boolean;
  inputText: string;
  onInputTextChange: (v: string) => void;
  onAdd: () => void;
  onUpdateItem: (id: string, patch: Partial<GoalItem>) => void;
  onRemoveItem: (id: string) => void;
  onAiSuggest: () => void;
  isSuggesting: boolean;
  aiSuggestion: AiSuggestedGoal | null;
  onAdoptAi: () => void;
  hideCategories?: boolean;
  inputCategory?: GoalCategory;
  onInputCategoryChange?: (c: GoalCategory) => void;
}) {
  const rate = calcListRate(goalList);
  return (
    <div style={{ margin: "12px 16px 0", background: "white", borderRadius: 12, padding: "14px 16px", border: "1px solid rgba(60,40,20,0.1)" }}>
      <button
        type="button"
        onClick={onToggleCollapse}
        disabled={!collapsible}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "none",
          border: "none",
          padding: 0,
          marginBottom: collapsed ? 0 : 10,
          cursor: collapsible ? "pointer" : "default",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: "bold", color: "#4a6741" }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {goalList?.items?.length ? <RateBadge rate={rate} /> : null}
          {collapsible && <span style={{ fontSize: 11, color: "#9a8b7a" }}>{collapsed ? "▼" : "▲"}</span>}
        </div>
      </button>
      {!collapsed && (
        <>
          {!hideCategories && onInputCategoryChange && (
            <CategorySelect value={inputCategory} onChange={onInputCategoryChange} />
          )}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              type="text"
              placeholder="自分で目標を入力..."
              value={inputText}
              onChange={e => onInputTextChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && onAdd()}
              style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
            />
            <button
              type="button"
              onClick={onAdd}
              style={{ padding: "0 14px", borderRadius: 10, border: "none", background: "#1a1410", color: "#f5f0e8", fontSize: 12, fontWeight: "bold", cursor: "pointer", flexShrink: 0 }}
            >
              追加
            </button>
          </div>
          {(goalList?.items ?? []).map(item => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                marginBottom: 6,
                background: item.achieved ? "#ede5d4" : "#f5f0e8",
                borderRadius: 8,
                opacity: item.achieved ? 0.75 : 1,
              }}
            >
              <input
                type="checkbox"
                checked={item.achieved}
                onChange={e => onUpdateItem(item.id, { achieved: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: "#c17f4a", flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                {!hideCategories && (
                  <span style={{ fontSize: 9, color: "#c17f4a", background: "#fdf0e4", borderRadius: 8, padding: "1px 6px", marginRight: 4 }}>{item.category}</span>
                )}
                <span style={{ fontSize: 13, color: "#3d3228", textDecoration: item.achieved ? "line-through" : "none" }}>{item.text}</span>
              </div>
              <button type="button" onClick={() => onRemoveItem(item.id)} style={{ background: "none", border: "none", color: "#9a8b7a", fontSize: 16, cursor: "pointer", padding: "0 4px" }}>×</button>
            </div>
          ))}
          <button
            type="button"
            onClick={onAiSuggest}
            disabled={isSuggesting}
            style={{
              width: "100%",
              padding: "10px",
              marginTop: 4,
              borderRadius: 8,
              border: "1.5px solid #c17f4a",
              background: "#fdf0e4",
              fontSize: 12,
              fontWeight: "bold",
              color: "#8b5a2b",
              cursor: isSuggesting ? "wait" : "pointer",
              opacity: isSuggesting ? 0.7 : 1,
            }}
          >
            {isSuggesting ? "AIが提案中..." : "AIに提案してもらう"}
          </button>
          {aiSuggestion?.text && (
            <div style={{ marginTop: 10, padding: 10, background: "#e8f0e4", borderRadius: 8, fontSize: 12 }}>
              <div style={{ fontSize: 10, color: "#4a6741", marginBottom: 4 }}>AI提案</div>
              {!hideCategories && (
                <span style={{ fontSize: 9, color: "#c17f4a", background: "#fdf0e4", borderRadius: 8, padding: "1px 6px", marginRight: 4 }}>{aiSuggestion.category}</span>
              )}
              {aiSuggestion.text}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button type="button" onClick={onAdoptAi} style={{ flex: 1, padding: "6px", borderRadius: 6, border: "none", background: "#1a1410", color: "#f5f0e8", fontSize: 11, cursor: "pointer" }}>
                  リストに追加
                </button>
                <button type="button" onClick={onAiSuggest} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(60,40,20,0.15)", background: "white", fontSize: 11, cursor: "pointer" }}>
                  再提案
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function HomeDeadlineGoalsSection({
  goals,
  inputText,
  inputGoalType,
  inputDeadline,
  onInputTextChange,
  onInputGoalTypeChange,
  onInputDeadlineChange,
  onAdd,
  onUpdateGoal,
  onToggleAchieved,
  onRemoveGoal,
  onAiSuggest,
  isSuggesting,
  aiSuggestion,
  onAdoptAi,
}: {
  goals: DeadlineGoal[];
  inputText: string;
  inputGoalType: DeadlineGoalType;
  inputDeadline: string;
  onInputTextChange: (v: string) => void;
  onInputGoalTypeChange: (t: DeadlineGoalType) => void;
  onInputDeadlineChange: (d: string) => void;
  onAdd: () => void;
  onUpdateGoal: (id: string, patch: Partial<DeadlineGoal>) => void;
  onToggleAchieved: (id: string, checked: boolean) => void;
  onRemoveGoal: (id: string) => void;
  onAiSuggest: () => void;
  isSuggesting: boolean;
  aiSuggestion: { text: string; deadline: string; goalType?: DeadlineGoalType } | null;
  onAdoptAi: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null);
  const activeGoals = filterActiveDeadlineGoals(goals);
  const visibleGoals = showAll || activeGoals.length <= 3 ? activeGoals : activeGoals.slice(0, 3);
  const hiddenCount = activeGoals.length - 3;
  const rate = calcDeadlineRate(activeGoals);

  const renderGoalCard = (g: DeadlineGoal) => {
    const days = daysUntilDeadline(g.deadline);
    const remainColor = daysRemainingColor(days);
    const checked = isDeadlineGoalChecked(g);
    const isHabit = g.goalType === "習慣";
    return (
      <div
        key={g.id}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          padding: "10px 12px",
          marginBottom: 6,
          background: checked ? "#ede5d4" : "#f5f0e8",
          borderRadius: 8,
          opacity: checked ? 0.7 : 1,
          border: "1px solid rgba(60,40,20,0.06)",
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onToggleAchieved(g.id, e.target.checked)}
          style={{ width: 16, height: 16, accentColor: "#c17f4a", flexShrink: 0, marginTop: 2 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 4 }}>
            <span style={goalTypeBadgeStyle(g.goalType)}>{g.goalType}</span>
            <span style={{ fontSize: 13, color: checked ? "#9a8b7a" : "#3d3228", textDecoration: checked && !isHabit ? "line-through" : "none" }}>
              {g.text}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {editingDeadlineId === g.id ? (
              <DeadlineTextInput
                value={g.deadline}
                autoFocus
                onChange={deadline => onUpdateGoal(g.id, { deadline })}
                onBlur={() => setEditingDeadlineId(null)}
                style={{ ...inputStyle, width: "auto", fontSize: 11, padding: "4px 8px" }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingDeadlineId(g.id)}
                style={{ background: "none", border: "none", padding: 0, fontSize: 11, color: "#3d3228", cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted" }}
              >
                {formatDeadlineJa(g.deadline)}
              </button>
            )}
            <span style={{ fontSize: 10, fontWeight: "bold", color: remainColor }}>
              {isHabit ? (checked ? "今日達成" : "あと" + days + "日") : `あと${days}日`}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemoveGoal(g.id)}
          style={{ background: "none", border: "none", color: "#9a8b7a", fontSize: 16, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}
        >
          ×
        </button>
      </div>
    );
  };

  return (
    <div style={{ margin: "12px 16px 0", background: "white", borderRadius: 12, padding: "14px 16px", border: "1px solid rgba(60,40,20,0.1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: "bold", color: "#4a6741" }}>期限付き目標</div>
        {activeGoals.length > 0 && <RateBadge rate={rate} />}
      </div>

      <GoalTypeSelect value={inputGoalType} onChange={onInputGoalTypeChange} />
      <input
        type="text"
        placeholder="自分で目標を入力..."
        value={inputText}
        onChange={e => onInputTextChange(e.target.value)}
        onKeyDown={e => e.key === "Enter" && onAdd()}
        style={{ ...inputStyle, marginBottom: 8 }}
      />
      <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.6, marginBottom: 6 }}>期限</div>
      <DeadlineTextInput
        value={inputDeadline}
        onChange={onInputDeadlineChange}
        style={{ ...inputStyle, marginBottom: 10 }}
      />
      <button
        type="button"
        onClick={onAdd}
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: 10,
          borderRadius: 10,
          border: "none",
          background: "#1a1410",
          color: "#f5f0e8",
          fontSize: 12,
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        追加
      </button>

      {visibleGoals.map(renderGoalCard)}

      {activeGoals.length > 3 && (
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          style={{
            width: "100%",
            padding: "8px",
            marginBottom: 6,
            borderRadius: 8,
            border: "1px solid rgba(60,40,20,0.12)",
            background: "#f5f0e8",
            fontSize: 11,
            color: "#8b7355",
            cursor: "pointer",
          }}
        >
          {showAll ? "▲ 折りたたむ" : `他${hiddenCount}件 ▼`}
        </button>
      )}

      {activeGoals.length === 0 && (
        <div style={{ fontSize: 11, color: "#9a8b7a", textAlign: "center", padding: "8px 0", marginBottom: 6 }}>
          期限のある目標がありません
        </div>
      )}

      <button
        type="button"
        onClick={onAiSuggest}
        disabled={isSuggesting}
        style={{
          width: "100%",
          padding: "10px",
          marginTop: 4,
          borderRadius: 8,
          border: "1.5px solid #c17f4a",
          background: "#fdf0e4",
          fontSize: 12,
          fontWeight: "bold",
          color: "#8b5a2b",
          cursor: isSuggesting ? "wait" : "pointer",
          opacity: isSuggesting ? 0.7 : 1,
        }}
      >
        {isSuggesting ? "AIが提案中..." : "AIに提案してもらう"}
      </button>

      {aiSuggestion?.text && (
        <div style={{ marginTop: 10, padding: 10, background: "#e8f0e4", borderRadius: 8, fontSize: 12 }}>
          <div style={{ fontSize: 10, color: "#4a6741", marginBottom: 4 }}>AI提案</div>
          {aiSuggestion.goalType && (
            <span style={goalTypeBadgeStyle(aiSuggestion.goalType)}>{aiSuggestion.goalType}</span>
          )}
          {aiSuggestion.text}
          <div style={{ fontSize: 10, color: "#3d3228", marginTop: 4 }}>
            期限: {formatDeadlineJa(aiSuggestion.deadline)}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button type="button" onClick={onAdoptAi} style={{ flex: 1, padding: "6px", borderRadius: 6, border: "none", background: "#1a1410", color: "#f5f0e8", fontSize: 11, cursor: "pointer" }}>
              リストに追加
            </button>
            <button type="button" onClick={onAiSuggest} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(60,40,20,0.15)", background: "white", fontSize: 11, cursor: "pointer" }}>
              再提案
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DisplayToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ fontSize: 14, color: "#3d3228" }}>{label}</div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 44,
          height: 26,
          borderRadius: 13,
          border: "none",
          background: checked ? "#6b8f62" : "#ddd0bc",
          cursor: "pointer",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: checked ? 21 : 3,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "white",
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          }}
        />
      </button>
    </div>
  );
}

function ChipButton({
  selected,
  onClick,
  children,
  variant = "warm",
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  variant?: "warm" | "dark";
}) {
  const warm = {
    border: selected ? "1.5px solid #c17f4a" : "1.5px solid rgba(60,40,20,0.12)",
    background: selected ? "#fdf0e4" : "#ede5d4",
    color: selected ? "#c17f4a" : "#3d3228",
  };
  const dark = {
    border: selected ? "1.5px solid #1a1410" : "1.5px solid rgba(60,40,20,0.12)",
    background: selected ? "#1a1410" : "#ede5d4",
    color: selected ? "#f5f0e8" : "#3d3228",
  };
  const style = variant === "dark" ? dark : warm;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: selected ? "bold" : "normal",
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function buildNotionDbParams(settings: NotionSettings): URLSearchParams {
  const params = new URLSearchParams();
  if (settings.apiKey.trim()) params.set("apiKey", settings.apiKey.trim());
  if (settings.taskDatabaseId.trim()) params.set("taskDatabaseId", settings.taskDatabaseId.trim());
  if (settings.scheduleDatabaseId.trim()) params.set("scheduleDatabaseId", settings.scheduleDatabaseId.trim());
  if (settings.communicationDatabaseId.trim()) {
    params.set("communicationDatabaseId", settings.communicationDatabaseId.trim());
  }
  return params;
}

function notionDbBody(settings: NotionSettings): Record<string, string | undefined> {
  return {
    apiKey: settings.apiKey.trim() || undefined,
    taskDatabaseId: settings.taskDatabaseId.trim() || undefined,
    scheduleDatabaseId: settings.scheduleDatabaseId.trim() || undefined,
    communicationDatabaseId: settings.communicationDatabaseId.trim() || undefined,
  };
}

export default function TuyukusaApp() {
  const { t, i18n } = useTranslation();
  const isDesktop = useDesktopLayout();
  const { canPromptInstall, promptInstall } = usePwaInstall();
  const [showPwaGuide, setShowPwaGuide] = useState(false);
  const appLocale = (i18n.language?.slice(0, 2) ?? "ja") as AppLocale;
  const [tab, setTab] = useState<Tab>("home");
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [healthForm, setHealthForm] = useState<HealthForm>(INITIAL_HEALTH);
  const [enabledFields, setEnabledFields] = useState<HealthFieldId[]>([]);
  const [goals, setGoals, goalsHydrated] = useLocalStorage<GoalsData>("tuyukusa-goals", INITIAL_GOALS, normalizeGoals);
  const [aiSuggestions, setAiSuggestions, aiSuggestionsHydrated] = useLocalStorage<Record<GoalPeriod, AiSuggestedGoal | null>>(
    "tuyukusa-ai-goals",
    INITIAL_AI_SUGGESTIONS,
    normalizeAiSuggestions
  );
  const [schedule, setSchedule, scheduleHydrated] = useLocalStorage<ScheduleState>(
    "tuyukusa-schedule",
    INITIAL_SCHEDULE,
    data => normalizeSchedule(data, DEFAULT_SCHEDULE_TEMPLATES)
  );
  const [scheduleTemplates, setScheduleTemplates, templatesHydrated] = useLocalStorage<ScheduleTemplates>(
    "tuyukusa-schedule-templates",
    DEFAULT_SCHEDULE_TEMPLATES,
    normalizeScheduleTemplates
  );
  const [homeDisplay, setHomeDisplay, homeDisplayHydrated] = useLocalStorage<HomeDisplaySettings>(
    "tuyukusa-home-display",
    DEFAULT_HOME_DISPLAY,
    normalizeHomeDisplay
  );
  const [userProfile, setUserProfile, userProfileHydrated] = useLocalStorage<UserProfile>(
    "tuyukusa-user-profile",
    INITIAL_USER_PROFILE,
    normalizeUserProfile
  );
  const [googleCalendar, setGoogleCalendar, calendarHydrated] = useLocalStorage<GoogleCalendarSettings>(
    "tuyukusa-google-calendar",
    INITIAL_GOOGLE_CALENDAR,
    normalizeGoogleCalendarSettings
  );
  const [notionSettings, setNotionSettings, notionHydrated] = useLocalStorage<NotionSettings>(
    "tuyukusa-notion",
    INITIAL_NOTION_SETTINGS,
    normalizeNotionSettings
  );
  const [notionTasks, setNotionTasks] = useState<NotionTask[]>([]);
  const [notionScheduleEvents, setNotionScheduleEvents] = useState<NotionScheduleEvent[]>([]);
  const [notionSyncing, setNotionSyncing] = useState(false);
  const [notionMessage, setNotionMessage] = useState("");
  const [showNotionManual, setShowNotionManual] = useState(false);
  const [pendingVoiceTask, setPendingVoiceTask] = useState<ParsedVoiceTask | null>(null);
  const [voiceParsing, setVoiceParsing] = useState(false);
  const [voiceSaving, setVoiceSaving] = useState(false);
  const [chatKnowledge, setChatKnowledge, chatKnowledgeHydrated] = useLocalStorage<ChatKnowledge>(
    "tuyukusa-chat-knowledge",
    INITIAL_CHAT_KNOWLEDGE,
    normalizeChatKnowledge
  );
  const [locationSettings, setLocationSettings, locationHydrated] = useLocalStorage<LocationSettings>(
    "tuyukusa-location",
    INITIAL_LOCATION_SETTINGS,
    normalizeLocationSettings
  );
  const [radioSettings, setRadioSettings, radioHydrated] = useLocalStorage<RadioSettings>(
    "tuyukusa-radio",
    INITIAL_RADIO_SETTINGS,
    normalizeRadioSettings
  );
  const [healthData, setHealthData, healthHydrated] = useLocalStorage<HealthData>(
    "tuyukusa-health-data",
    INITIAL_HEALTH_DATA,
    normalizeHealthData
  );
  const [localTasksStorage, setLocalTasksStorage, localTasksHydrated] = useLocalStorage<LocalTasksStorage>(
    "tuyukusa-local-tasks",
    INITIAL_LOCAL_TASKS,
    normalizeLocalTasks
  );
  const [supabaseSettings, setSupabaseSettings, supabaseHydrated] = useLocalStorage<SupabaseSettings>(
    "tuyukusa-supabase",
    INITIAL_SUPABASE_SETTINGS,
    normalizeSupabaseSettings
  );
  const [healthImportMessage, setHealthImportMessage] = useState("");
  const [calendarMessage, setCalendarMessage] = useState("");
  const [chatFlowStep, setChatFlowStep] = useState<ChatFlowStep>("intro");
  const [chatFlowData, setChatFlowData] = useState<ChatFlowData>({});
  const chatHistoryLoadedRef = useRef(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [suggestingPeriod, setSuggestingPeriod] = useState<GoalPeriod | "deadline" | null>(null);
  const [dailyInput, setDailyInput] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");
  const [deadlineGoalType, setDeadlineGoalType] = useState<DeadlineGoalType>("期限目標");
  const [deadlineDate, setDeadlineDate] = useState(defaultDeadlineDate());
  const [aiDeadlineSuggestion, setAiDeadlineSuggestion] = useState<{
    text: string;
    deadline: string;
    goalType: DeadlineGoalType;
  } | null>(null);
  const [monthlyInput, setMonthlyInput] = useState("");
  const [monthlyCategory, setMonthlyCategory] = useState<GoalCategory>("その他");
  const [saveMessage, setSaveMessage] = useState("");
  const [showBinauralPanel, setShowBinauralPanel] = useState(false);
  const [binauralPanelMode, setBinauralPanelMode] = useState<"beats" | "pomodoro">("beats");
  const [soundPanelMode, setSoundPanelMode] = useState<"mixer" | "pomodoro">("mixer");
  const [scheduleEdit, setScheduleEdit] = useState<ScheduleEditDraft | null>(null);
  const [templateEditDay, setTemplateEditDay] = useState(() => new Date().getDay());
  const [templateScheduleEdit, setTemplateScheduleEdit] = useState<ScheduleEditDraft | null>(null);
  const [pendingReflection, setPendingReflection] = useState<ScheduleReflection | null>(null);
  const [reflectModalOpen, setReflectModalOpen] = useState(false);
  const [reflectingSchedule, setReflectingSchedule] = useState(false);
  const [reflectNotice, setReflectNotice] = useState("");
  const [reflectMessageIndex, setReflectMessageIndex] = useState<number | null>(null);
  const [onboardingPhase, setOnboardingPhase] = useState<"questionnaire" | "integrations">("questionnaire");
  const [pendingOnboarding, setPendingOnboarding] = useState<{
    data: OnboardingFlowData;
    reflection: ScheduleReflection | null;
  } | null>(null);
  const [updateNotification, setUpdateNotification] = useState<{
    oldVersion: string;
    newVersion: string;
    changes: string[];
  } | null>(null);
  const [pendingReturnGreeting, setPendingReturnGreeting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoSuggestRef = useRef(false);
  const scheduleTemplatesRef = useRef(scheduleTemplates);
  scheduleTemplatesRef.current = scheduleTemplates;
  const envContext = buildEnvironmentContext(weather);
  const userKnowledgeContext = buildUserKnowledgeContext(chatKnowledge, userProfile);
  const healthContext = buildHealthContext(healthData);

  const timelineItems = sortByTime(schedule.items ?? []);
  const dayKey = getDayKey();
  const notionTodayTasks = getTodayNotionTasks(notionTasks, dayKey);
  const notionTodayScheduleEvents = getTodayNotionScheduleEvents(notionScheduleEvents, dayKey);
  const notionScheduleItems: ScheduleItem[] =
    notionSettings.enabled && notionSettings.connected
      ? notionTodayScheduleEvents.map(e => ({
          id: `notion-schedule-${e.id}`,
          time: e.time ?? "09:00",
          label: e.title,
          sub: `Notion · ${scheduleEventLabel(e.eventType)}`,
        }))
      : [];
  const mergedTimelineItems = sortByTime([...timelineItems, ...notionScheduleItems]);
  const todayLocalTasks = getTodayLocalTasks(localTasksStorage.tasks, dayKey);
  const scheduleRemainingSec = (() => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    for (const item of mergedTimelineItems) {
      const parts = item.time.split(":").map(Number);
      if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) continue;
      const itemMin = parts[0] * 60 + parts[1];
      if (itemMin > nowMin) return (itemMin - nowMin) * 60;
    }
    return 0;
  })();
  const storageReady =
    goalsHydrated &&
    scheduleHydrated &&
    templatesHydrated &&
    homeDisplayHydrated &&
    aiSuggestionsHydrated &&
    userProfileHydrated &&
    calendarHydrated &&
    notionHydrated &&
    chatKnowledgeHydrated &&
    locationHydrated &&
    radioHydrated &&
    healthHydrated &&
    localTasksHydrated &&
    supabaseHydrated;

  useEffect(() => {
    runTuyukusaStorageMigration();
    try {
      const raw = localStorage.getItem("tuyukusa-chat-history");
      if (raw) {
        const parsed = normalizeStoredChatMessages(JSON.parse(raw));
        setChatMessages(fromStoredChatMessages(parsed));
        if (parsed.length > 0) setChatFlowStep("free");
      }
    } catch {
      /* ignore */
    }
    chatHistoryLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!chatHistoryLoadedRef.current) return;
    try {
      localStorage.setItem("tuyukusa-chat-history", JSON.stringify(toStoredChatMessages(chatMessages)));
    } catch {
      /* ignore */
    }
  }, [chatMessages]);

  useEffect(() => {
    if (!userProfileHydrated || userProfile.onboardingComplete) return;
    const progress = loadOnboardingProgress();
    if (progress?.integrationsPhase) {
      setOnboardingPhase("integrations");
      setPendingOnboarding({ data: progress.flowData, reflection: null });
    }
  }, [userProfileHydrated, userProfile.onboardingComplete]);

  useEffect(() => {
    if (!storageReady || !userProfile.onboardingComplete) return;
    const stored = readStoredAppVersion();
    if (!stored) {
      writeStoredAppVersion(APP_VERSION);
      return;
    }
    if (!isAppUpdateAvailable(stored, APP_VERSION)) return;
    void fetchChangelog().then(changelog => {
      setUpdateNotification({
        oldVersion: stored,
        newVersion: APP_VERSION,
        changes: changelog?.changes ?? [],
      });
    });
  }, [storageReady, userProfile.onboardingComplete]);

  const recordChatKnowledge = (text: string, flowData?: ChatFlowData) => {
    setChatKnowledge(prev => {
      let next = updateChatKnowledgeFromUserMessage(prev, text);
      if (flowData && Object.values(flowData).some(v => v)) {
        next = updateChatKnowledgeFromFlow(next, flowData);
      }
      return next;
    });
  };

  const openBinauralPanel = (mode: "beats" | "pomodoro" = "beats") => {
    setSoundPanelMode(mode === "pomodoro" ? "pomodoro" : "mixer");
    setTab("sound");
  };

  const fetchOnboardingProposal = async (prompt: string): Promise<ChatReply> => {
    return fetchChatReply(
      [{ type: "user", text: prompt }],
      envContext,
      userKnowledgeContext,
      healthContext,
      appLocale
    );
  };

  useEffect(() => {
    if (goalsHydrated) setGoals(prev => normalizeGoals(prev));
  }, [goalsHydrated, setGoals]);

  useEffect(() => {
    if (!scheduleHydrated || !templatesHydrated) return;
    setSchedule(prev => normalizeSchedule(prev, scheduleTemplatesRef.current));
  }, [scheduleHydrated, templatesHydrated, setSchedule]);

  useEffect(() => {
    if (!scheduleHydrated || !templatesHydrated) return;
    const refreshIfNewDay = () => {
      const dayKey = getDayKey();
      setSchedule(prev =>
        prev.dayKey === dayKey ? prev : createFreshSchedule(dayKey, scheduleTemplatesRef.current)
      );
      setGoogleCalendar(prev => {
        if (!prev.connected || !prev.icalUrl || prev.lastSyncDayKey === dayKey) return prev;
        return { ...prev, lastSyncDayKey: undefined };
      });
    };
    refreshIfNewDay();
    const intervalId = setInterval(refreshIfNewDay, 60_000);
    document.addEventListener("visibilitychange", refreshIfNewDay);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshIfNewDay);
    };
  }, [scheduleHydrated, templatesHydrated, setSchedule]);

  useEffect(() => {
    const day = getDayKey();
    const week = getWeekKey();
    const month = getMonthKey();
    setAiSuggestions(prev => {
      let changed = false;
      const next = { ...prev };
      if (prev.daily?.periodKey && prev.daily.periodKey !== day) {
        next.daily = null;
        changed = true;
      }
      if (prev.weekly?.periodKey && prev.weekly.periodKey !== week) {
        next.weekly = null;
        changed = true;
      }
      if (prev.monthly?.periodKey && prev.monthly.periodKey !== month) {
        next.monthly = null;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [setAiSuggestions]);

  const fetchWeather = (lat: number, lon: number) => {
    setWeatherLoading(true);
    fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      .then(res => res.json())
      .then((data: WeatherData) => setWeather({ ...data, hourly: data.hourly ?? [] }))
      .catch(() => setWeather(null))
      .finally(() => setWeatherLoading(false));
  };

  useEffect(() => {
    if (!locationHydrated) return;

    const loadWeather = (lat: number, lon: number) => {
      fetchWeather(lat, lon);
    };

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => loadWeather(pos.coords.latitude, pos.coords.longitude),
        () => {
          const region = getRegionById(locationSettings.regionId);
          loadWeather(region.lat, region.lon);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    } else {
      const region = getRegionById(locationSettings.regionId);
      loadWeather(region.lat, region.lon);
    }
  }, [locationHydrated, locationSettings.regionId]);

  const periodKey = (p: GoalPeriod) =>
    p === "daily" ? getDayKey() : p === "weekly" ? getWeekKey() : getMonthKey();

  const addGoalItem = (period: GoalPeriod, text: string, category: GoalCategory) => {
    setGoals(prev => ({
      ...normalizeGoals(prev),
      [period]: {
        periodKey: periodKey(period),
        items: [...(prev[period]?.items ?? []), newGoalItem(text, category)],
      },
    }));
  };

  const updateGoalItem = (period: GoalPeriod, id: string, patch: Partial<GoalItem>) => {
    setGoals(prev => ({
      ...normalizeGoals(prev),
      [period]: {
        ...(prev[period] ?? emptyGoalList(periodKey(period))),
        periodKey: periodKey(period),
        items: (prev[period]?.items ?? []).map(i => (i.id === id ? { ...i, ...patch } : i)),
      },
    }));
  };

  const removeGoalItem = (period: GoalPeriod, id: string) => {
    setGoals(prev => ({
      ...normalizeGoals(prev),
      [period]: {
        ...(prev[period] ?? emptyGoalList(periodKey(period))),
        periodKey: periodKey(period),
        items: (prev[period]?.items ?? []).filter(i => i.id !== id),
      },
    }));
  };

  const addDeadlineGoalEntry = (
    text: string,
    category: GoalCategory,
    deadline: string,
    goalType: DeadlineGoalType = "期限目標"
  ) => {
    setGoals(prev => ({
      ...normalizeGoals(prev),
      deadlineGoals: [...(prev.deadlineGoals ?? []), {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        text,
        category,
        deadline,
        goalType,
        achieved: false,
        achievedDayKey: undefined,
      }],
    }));
  };

  const suggestDeadlineGoal = async () => {
    setSuggestingPeriod("deadline");
    try {
      const prompt = `期限付き目標を1つ提案してください。以下を踏まえ、20字以内の具体的な行動目標にしてください。
一行目：目標テキスト
二行目：期限日（YYYY-MM-DD形式、今日から7〜30日後）

${buildHealthSummary(healthForm)}`;
      const { content } = await fetchChatReply([{ type: "user", text: prompt }], envContext, userKnowledgeContext, healthContext, appLocale);
      setAiDeadlineSuggestion(parseAiDeadlineReply(content));
    } catch {
      setAiDeadlineSuggestion({
        text: "毎日22時30分までに就寝する",
        deadline: defaultDeadlineDate(14),
        goalType: "習慣",
      });
    } finally {
      setSuggestingPeriod(null);
    }
  };

  const adoptAiDeadlineGoal = () => {
    if (!aiDeadlineSuggestion?.text) return;
    addDeadlineGoalEntry(
      aiDeadlineSuggestion.text,
      "その他",
      aiDeadlineSuggestion.deadline,
      aiDeadlineSuggestion.goalType ?? "期限目標"
    );
    setAiDeadlineSuggestion(null);
  };

  const adoptAiGoal = (period: GoalPeriod) => {
    const s = aiSuggestions[period];
    if (!s?.text) return;
    addGoalItem(period, s.text, s.category);
    setAiSuggestions(prev => ({ ...prev, [period]: null }));
  };

  const isSuggestingDeadline = suggestingPeriod === "deadline";

  const applyScheduleUpdate = (update: ScheduleUpdate) => {
    setSchedule(prev => {
      const dayKey = getDayKey();
      const base = prev.dayKey === dayKey ? prev : createFreshSchedule(dayKey, scheduleTemplates);
      const time = normalizeScheduleTime(update.time);
      const existingIdx = base.items.findIndex(i => i.time === time && i.label === update.label);
      const newItem: ScheduleItem =
        existingIdx >= 0
          ? { ...base.items[existingIdx], sub: update.sub || "" }
          : {
              id: `custom-${Date.now()}`,
              time,
              label: update.label,
              sub: update.sub || "",
            };
      const items =
        existingIdx >= 0
          ? base.items.map((i, idx) => (idx === existingIdx ? newItem : i))
          : sortByTime([...base.items, newItem]);
      return { dayKey, items, alerts: syncScheduleAlerts(items) };
    });
  };

  const upsertScheduleItem = (item: ScheduleItem) => {
    setSchedule(prev => {
      const dayKey = getDayKey();
      const base = prev.dayKey === dayKey ? prev : createFreshSchedule(dayKey, scheduleTemplates);
      const normalized = normalizeScheduleItem(item);
      if (!normalized) return base;
      const exists = base.items.some(i => i.id === normalized.id);
      const items = sortByTime(
        exists
          ? base.items.map(i => (i.id === normalized.id ? normalized : i))
          : [...base.items, normalized]
      );
      return { dayKey, items, alerts: syncScheduleAlerts(items) };
    });
  };

  const removeScheduleItem = (id: string) => {
    setSchedule(prev => {
      const dayKey = getDayKey();
      const base = prev.dayKey === dayKey ? prev : createFreshSchedule(dayKey, scheduleTemplates);
      const items = base.items.filter(i => i.id !== id);
      return { dayKey, items, alerts: syncScheduleAlerts(items) };
    });
  };

  const saveScheduleEdit = () => {
    if (!scheduleEdit) return;
    const { mode, item } = scheduleEdit;
    if (!item.label.trim() || !/^\d{1,2}:\d{2}$/.test(item.time)) return;
    const toSave: ScheduleItem = {
      ...item,
      id: mode === "add" || !item.id ? newScheduleItemId() : item.id,
      time: normalizeScheduleTime(item.time),
      label: item.label.trim(),
      sub: item.sub.trim(),
    };
    upsertScheduleItem(toSave);
    setScheduleEdit(null);
  };

  const deleteScheduleEdit = () => {
    if (!scheduleEdit || scheduleEdit.mode !== "edit" || !scheduleEdit.item.id) return;
    removeScheduleItem(scheduleEdit.item.id);
    setScheduleEdit(null);
  };

  const upsertTemplateItem = (weekday: number, item: ScheduleItem) => {
    setScheduleTemplates(prev => {
      const normalized = normalizeScheduleItem(item);
      if (!normalized) return prev;
      const current = prev[weekday] ?? cloneScheduleItems(BASE_SCHEDULE_ITEMS);
      const exists = current.some(i => i.id === normalized.id);
      const nextItems = sortByTime(
        exists ? current.map(i => (i.id === normalized.id ? normalized : i)) : [...current, normalized]
      );
      return { ...prev, [weekday]: nextItems };
    });
  };

  const removeTemplateItem = (weekday: number, id: string) => {
    setScheduleTemplates(prev => ({
      ...prev,
      [weekday]: (prev[weekday] ?? []).filter(i => i.id !== id),
    }));
  };

  const saveTemplateScheduleEdit = () => {
    if (!templateScheduleEdit) return;
    const { mode, item } = templateScheduleEdit;
    if (!item.label.trim() || !/^\d{1,2}:\d{2}$/.test(item.time)) return;
    const toSave: ScheduleItem = {
      ...item,
      id: mode === "add" || !item.id ? newScheduleItemId() : item.id,
      time: normalizeScheduleTime(item.time),
      label: item.label.trim(),
      sub: item.sub.trim(),
    };
    upsertTemplateItem(templateEditDay, toSave);
    setTemplateScheduleEdit(null);
  };

  const deleteTemplateScheduleEdit = () => {
    if (!templateScheduleEdit || templateScheduleEdit.mode !== "edit" || !templateScheduleEdit.item.id) return;
    removeTemplateItem(templateEditDay, templateScheduleEdit.item.id);
    setTemplateScheduleEdit(null);
  };

  const templateItemsForDay = sortByTime(scheduleTemplates[templateEditDay] ?? []);

  const syncGoogleCalendar = async (icalUrlOverride?: string) => {
    const icalUrl = (icalUrlOverride ?? googleCalendar.icalUrl).trim();
    if (!icalUrl) return false;
    const dayKey = getDayKey();
    try {
      const res = await fetch(
        `/api/google-calendar?icalUrl=${encodeURIComponent(icalUrl)}&day=${dayKey}`
      );
      const data = (await res.json()) as {
        events?: { summary: string; start: string; end: string; allDay: boolean }[];
        dayMode?: "default" | "work" | "holiday";
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "カレンダーの取得に失敗しました");

      setSchedule(prev => {
        if (prev.dayKey !== dayKey) return prev;
        const adjusted = applyCalendarAdjustments(
          prev.items,
          data.events ?? [],
          data.dayMode ?? "default",
          dayKey
        );
        return { dayKey, items: adjusted, alerts: syncScheduleAlerts(adjusted) };
      });
      setGoogleCalendar(prev => ({ ...prev, icalUrl, connected: true, lastSyncDayKey: dayKey, lastSyncAt: Date.now() }));
      return true;
    } catch (err) {
      setCalendarMessage(err instanceof Error ? err.message : "カレンダーの取得に失敗しました");
      return false;
    }
  };

  const connectGoogleCalendar = async () => {
    setCalendarMessage("");
    const icalUrl = googleCalendar.icalUrl.trim();
    if (!icalUrl) {
      setCalendarMessage("iCalフィードURLを入力してください");
      return;
    }
    const ok = await syncGoogleCalendar(icalUrl);
    if (ok) {
      setCalendarMessage("Googleカレンダーに接続しました。予定に合わせてスケジュールを調整しました。");
    }
  };

  const disconnectGoogleCalendar = () => {
    setGoogleCalendar(INITIAL_GOOGLE_CALENDAR);
    setCalendarMessage("");
  };

  const syncNotion = async (): Promise<boolean> => {
    setNotionSyncing(true);
    setNotionMessage("");
    try {
      const params = buildNotionDbParams(notionSettings);
      const res = await fetch(`/api/notion?${params.toString()}`);
      const data = (await res.json()) as {
        tasks?: NotionTask[];
        scheduleEvents?: NotionScheduleEvent[];
        syncedAt?: number;
        databaseIds?: { tasks: string; schedule: string; communication: string };
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Notion同期に失敗しました");
      setNotionTasks(data.tasks ?? []);
      setNotionScheduleEvents(data.scheduleEvents ?? []);
      setNotionSettings(prev => ({
        ...prev,
        connected: true,
        taskDatabaseId: data.databaseIds?.tasks ?? prev.taskDatabaseId,
        scheduleDatabaseId: data.databaseIds?.schedule ?? prev.scheduleDatabaseId,
        communicationDatabaseId: data.databaseIds?.communication ?? prev.communicationDatabaseId,
        lastSyncAt: data.syncedAt ?? Date.now(),
      }));
      return true;
    } catch (err) {
      setNotionMessage(err instanceof Error ? err.message : "Notion同期に失敗しました");
      return false;
    } finally {
      setNotionSyncing(false);
    }
  };

  const setupNotion = async (): Promise<boolean> => {
    setNotionMessage("");
    try {
      const res = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setup",
          ...notionDbBody(notionSettings),
        }),
      });
      const data = (await res.json()) as {
        taskDatabaseId?: string;
        databaseIds?: { tasks: string; schedule: string; communication: string };
        created?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "セットアップに失敗しました");
      setNotionSettings(prev => ({
        ...prev,
        taskDatabaseId: data.databaseIds?.tasks ?? data.taskDatabaseId ?? prev.taskDatabaseId,
        scheduleDatabaseId: data.databaseIds?.schedule ?? prev.scheduleDatabaseId,
        communicationDatabaseId: data.databaseIds?.communication ?? prev.communicationDatabaseId,
        connected: true,
        enabled: true,
        setupComplete: true,
      }));
      setNotionMessage(data.created ? "データベースを作成しました" : "既存のデータベースに接続しました");
      await syncNotion();
      return true;
    } catch (err) {
      setNotionMessage(err instanceof Error ? err.message : "セットアップに失敗しました");
      return false;
    }
  };

  const toggleNotionTask = async (task: NotionTask) => {
    try {
      const res = await fetch("/api/notion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...notionDbBody(notionSettings),
          pageId: task.id,
          status: task.status === "done" ? "pending" : "done",
          target: "tasks",
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "更新に失敗しました");
      await syncNotion();
    } catch (err) {
      setNotionMessage(err instanceof Error ? err.message : "更新に失敗しました");
    }
  };

  const toggleNotionScheduleEvent = async (event: NotionScheduleEvent) => {
    try {
      const res = await fetch("/api/notion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...notionDbBody(notionSettings),
          pageId: event.id,
          status: event.status === "done" ? "pending" : "done",
          target: "schedule",
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "更新に失敗しました");
      await syncNotion();
    } catch (err) {
      setNotionMessage(err instanceof Error ? err.message : "更新に失敗しました");
    }
  };

  const handleVoiceTranscript = async (transcript: string) => {
    setVoiceParsing(true);
    setNotionMessage("");
    try {
      const res = await fetch("/api/notion/parse-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = (await res.json()) as { task?: ParsedVoiceTask; error?: string };
      if (!res.ok || !data.task) throw new Error(data.error ?? "音声の解析に失敗しました");
      setPendingVoiceTask(data.task);
    } catch (err) {
      setNotionMessage(err instanceof Error ? err.message : "音声の解析に失敗しました");
    } finally {
      setVoiceParsing(false);
    }
  };

  const confirmVoiceTask = async () => {
    if (!pendingVoiceTask) return;
    setVoiceSaving(true);
    try {
      const res = await fetch("/api/notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...notionDbBody(notionSettings),
          task: pendingVoiceTask,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "タスク登録に失敗しました");
      setPendingVoiceTask(null);
      setNotionMessage("タスクをNotionに登録しました");
      await syncNotion();
    } catch (err) {
      setNotionMessage(err instanceof Error ? err.message : "タスク登録に失敗しました");
    } finally {
      setVoiceSaving(false);
    }
  };

  const notionAutoConnectRef = useRef(false);

  useEffect(() => {
    if (!notionHydrated || notionAutoConnectRef.current) return;
    if (!notionSettings.enabled || !notionSettings.connected) return;
    notionAutoConnectRef.current = true;
    void syncNotion();
  }, [notionHydrated, notionSettings.enabled, notionSettings.connected]);

  useEffect(() => {
    if (!notionHydrated || !notionSettings.enabled || !notionSettings.connected) return;
    const timer = setInterval(() => {
      void syncNotion();
    }, NOTION_SYNC_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [notionHydrated, notionSettings.enabled, notionSettings.connected, notionSettings.apiKey, notionSettings.taskDatabaseId, notionSettings.scheduleDatabaseId, notionSettings.communicationDatabaseId]);

  useEffect(() => {
    const openTodayTasks = () => {
      setTab("home");
      window.setTimeout(() => {
        document.getElementById("today-tasks")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    };
    window.addEventListener("tuyukusa:open-today-tasks", openTodayTasks);
    return () => window.removeEventListener("tuyukusa:open-today-tasks", openTodayTasks);
  }, []);

  useEffect(() => {
    if (!scheduleHydrated || !calendarHydrated) return;
    if (!googleCalendar.connected || !googleCalendar.icalUrl) return;
    const dayChanged = googleCalendar.lastSyncDayKey !== getDayKey();
    const hourElapsed =
      !googleCalendar.lastSyncAt || Date.now() - googleCalendar.lastSyncAt >= CALENDAR_SYNC_INTERVAL_MS;
    if (dayChanged || hourElapsed) {
      syncGoogleCalendar();
    }
  }, [
    scheduleHydrated,
    calendarHydrated,
    googleCalendar.connected,
    googleCalendar.icalUrl,
    googleCalendar.lastSyncDayKey,
    googleCalendar.lastSyncAt,
  ]);

  useEffect(() => {
    if (!googleCalendar.connected || !googleCalendar.icalUrl) return;
    const timer = setInterval(() => {
      void syncGoogleCalendar();
    }, CALENDAR_SYNC_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [googleCalendar.connected, googleCalendar.icalUrl]);

  useEffect(() => {
    if (!storageReady) return;
    const params = new URLSearchParams(window.location.search);
    const patch = parseHealthFromSearchParams(params);
    if (!patch) return;
    setHealthData(prev => mergeHealthImport(prev, patch));
    setHealthImportMessage("ヘルスケアデータを受信しました");
    window.history.replaceState({}, "", window.location.pathname);
  }, [storageReady, setHealthData]);

  const addSuggestionToSchedule = (messageIndex: number, suggestionId: string) => {
    const msg = chatMessages[messageIndex];
    const suggestion = msg.scheduleSuggestions?.find(s => s.id === suggestionId);
    if (!suggestion || msg.addedScheduleIds?.includes(suggestionId)) return;
    applyScheduleUpdate(suggestion);
    setChatMessages(prev =>
      prev.map((m, idx) =>
        idx === messageIndex
          ? { ...m, addedScheduleIds: [...(m.addedScheduleIds ?? []), suggestionId] }
          : m
      )
    );
  };

  const suggestGoal = async (period: GoalPeriod) => {
    const labels = { daily: "今日", weekly: "今週", monthly: "今月" };
    setSuggestingPeriod(period);
    try {
      const categoryLine =
        period === "daily"
          ? "20字以内の具体的な行動目標を1行だけ返してください。"
          : "20字以内の具体的な行動目標にしてください。カテゴリ（睡眠/食事/運動/塩清療法/その他）も一行目に【カテゴリ】の形式で付けてください。";
      const prompt = `${labels[period]}の目標を1つだけ提案してください。以下を踏まえ、${categoryLine}

${buildHealthSummary(healthForm)}`;
      const { content } = await fetchChatReply([{ type: "user", text: prompt }], envContext, userKnowledgeContext, healthContext, appLocale);
      const parsed = parseAiGoalReply(content);
      setAiSuggestions(prev => ({
        ...prev,
        [period]: { ...parsed, periodKey: periodKey(period) },
      }));
    } catch {
      setAiSuggestions(prev => ({
        ...prev,
        [period]: {
          text: period === "daily" ? "就寝前に塩湯3gを飲む" : "早寝早起きを心がける",
          category: "その他",
          periodKey: periodKey(period),
        },
      }));
    } finally {
      setSuggestingPeriod(null);
    }
  };

  useEffect(() => {
    if (!weather || !goalsHydrated) return;
    if ((goals.daily?.items ?? []).length > 0) return;
    if (aiSuggestions.daily?.periodKey === getDayKey()) return;
    if (autoSuggestRef.current) return;
    autoSuggestRef.current = true;
    suggestGoal("daily");
  }, [weather, goalsHydrated, goals.daily?.items?.length]);

  const isFieldEnabled = (id: HealthFieldId) => enabledFields.includes(id);

  const toggleEnabledField = (id: HealthFieldId) => {
    setEnabledFields(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const toggleKampo = (item: string) => {
    setHealthForm(prev => ({
      ...prev,
      kampoTaken: prev.kampoTaken.includes(item)
        ? prev.kampoTaken.filter(k => k !== item)
        : [...prev.kampoTaken, item],
    }));
  };

  const updateDeadlineGoal = (id: string, patch: Partial<DeadlineGoal>) => {
    setGoals(prev => ({
      ...normalizeGoals(prev),
      deadlineGoals: (prev.deadlineGoals ?? []).map(g => (g.id === id ? normalizeDeadlineGoal({ ...g, ...patch }) : g)),
    }));
  };

  const toggleDeadlineGoalAchieved = (id: string, checked: boolean) => {
    setGoals(prev => ({
      ...normalizeGoals(prev),
      deadlineGoals: (prev.deadlineGoals ?? []).map(g => {
        if (g.id !== id) return g;
        if (g.goalType === "習慣") {
          return checked
            ? { ...g, achieved: true, achievedDayKey: getDayKey() }
            : { ...g, achieved: false, achievedDayKey: undefined };
        }
        return { ...g, achieved: checked, achievedDayKey: undefined };
      }),
    }));
  };

  const addDeadlineGoal = () => {
    setGoals(prev => ({
      ...normalizeGoals(prev),
      deadlineGoals: [...(prev.deadlineGoals ?? []), newDeadlineGoal("期限目標")],
    }));
  };

  const removeDeadlineGoal = (id: string) => {
    setGoals(prev => ({
      ...normalizeGoals(prev),
      deadlineGoals: (prev.deadlineGoals ?? []).filter(g => g.id !== id),
    }));
  };

  useEffect(() => {
    if (tab !== "chat" || !chatHistoryLoadedRef.current) return;

    const opening = buildChatOpeningMessage(weather);

    if (chatMessages.length === 0) {
      const timer = setTimeout(() => {
        setChatMessages([
          { type: "ai", text: opening.text, choices: opening.choices, step: "intro" },
        ]);
        setChatFlowStep("intro");
        setChatFlowData({});
      }, 300);
      return () => clearTimeout(timer);
    }

    if (
      chatMessages.length === 1 &&
      chatFlowStep === "intro" &&
      chatMessages[0]?.step === "intro" &&
      weather
    ) {
      setChatMessages([
        { type: "ai", text: opening.text, choices: opening.choices, step: "intro" },
      ]);
    }
  }, [tab, weather, chatMessages.length, chatFlowStep, chatMessages[0]?.step]);

  const startGoalFlow = (goal: string, userMessages: Message[]) => {
    recordChatKnowledge(goal, { goal });
    const data: ChatFlowData = { goal };
    setChatFlowData(data);
    setChatMessages([
      ...userMessages,
      {
        type: "ai",
        text: `「${goal}」ですね。素晴らしい目標です\n\n${FLOW_STEP_CONFIG.return_home.question}`,
        choices: FLOW_STEP_CONFIG.return_home.choices,
        step: "return_home",
      },
    ]);
    setChatFlowStep("return_home");
  };

  const generateScheduleProposal = async (baseMessages: Message[], data: ChatFlowData) => {
    setIsLoading(true);
    setChatFlowStep("proposal");
    try {
      const prompt = buildScheduleProposalPrompt(data);
      const flowMessages: Message[] = [...baseMessages, { type: "user", text: prompt }];
      const reply = await fetchChatReply(flowMessages, envContext, userKnowledgeContext, healthContext, appLocale);
      setChatMessages(prev => [
        ...prev,
        {
          ...createAiChatMessage(reply.content, reply),
          step: "proposal",
          showSchedule: true,
        },
      ]);
      setChatFlowStep("free");
    } catch {
      setChatMessages(prev => [
        ...prev,
        {
          type: "ai",
          text: "申し訳ございません。スケジュール提案の生成に失敗しました。もう一度お試しください。",
        },
      ]);
      setChatFlowStep("free");
    } finally {
      setIsLoading(false);
    }
  };

  const advanceChatFlow = async (answer: string, fromStep: ChatFlowStep) => {
    const trimmed = answer.trim();
    if (!trimmed) return;

    recordChatKnowledge(trimmed);

    const userMessages: Message[] = [...chatMessages, { type: "user", text: trimmed }];

    if (fromStep === "intro") {
      if (trimmed === "自分で入力する") {
        setChatMessages([
          ...userMessages,
          {
            type: "ai",
            text: "どんな生活を目標にしたいですか？自由にお書きください。\n（例：22時に寝たい、朝6時起きたい）",
            step: "goal",
          },
        ]);
        setChatFlowStep("goal");
        return;
      }
      if (trimmed === "自由に相談する") {
        setChatMessages([
          ...userMessages,
          {
            type: "ai",
            text: "どんなことでもお気軽にどうぞ。悩み・目標・願いをテキストまたは音声でお聞かせください。",
            step: "free",
          },
        ]);
        setChatFlowStep("free");
        return;
      }
      const goal = parseGoalFromChoice(trimmed);
      if (goal) startGoalFlow(goal, userMessages);
      return;
    }

    if (fromStep === "goal") {
      startGoalFlow(trimmed, userMessages);
      return;
    }

    const config = FLOW_STEP_CONFIG[fromStep as FlowQuestionStep];
    if (!config) {
      setChatMessages(userMessages);
      setIsLoading(true);
      try {
        const reply = await fetchChatReply(userMessages, envContext, userKnowledgeContext, healthContext, appLocale);
        setChatMessages(prev => [...prev, createAiChatMessage(reply.content, reply)]);
      } catch {
        setChatMessages(prev => [
          ...prev,
          { type: "ai", text: "申し訳ございません。接続に問題が発生しました。しばらくしてからもう一度お試しください。" },
        ]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const newData = { ...chatFlowData, [config.field]: trimmed };
    setChatFlowData(newData);

    if (config.next === "proposal") {
      setChatMessages([
        ...userMessages,
        {
          type: "ai",
          text: `${config.hint}\n\nいただいた情報をもとに、最適な生活リズムを提案します…`,
        },
      ]);
      recordChatKnowledge(trimmed, newData);
      await generateScheduleProposal(userMessages, newData);
      return;
    }

    const nextConfig = FLOW_STEP_CONFIG[config.next];
    setChatMessages([
      ...userMessages,
      {
        type: "ai",
        text: `承知しました。\n${config.hint}\n\n${nextConfig.question}`,
        choices: nextConfig.choices,
        step: config.next,
      },
    ]);
    setChatFlowStep(config.next);
  };

  const applyAllSuggestionsToSchedule = (messageIndex: number) => {
    const msg = chatMessages[messageIndex];
    if (!msg?.scheduleSuggestions?.length) return;
    for (const sug of msg.scheduleSuggestions) {
      if (!msg.addedScheduleIds?.includes(sug.id)) {
        applyScheduleUpdate(sug);
      }
    }
    setChatMessages(prev =>
      prev.map((m, idx) =>
        idx === messageIndex
          ? { ...m, addedScheduleIds: msg.scheduleSuggestions!.map(s => s.id) }
          : m
      )
    );
  };

  const openReflectionModal = (reflection: ScheduleReflection, messageIndex: number | null) => {
    setPendingReflection(reflection);
    setReflectMessageIndex(messageIndex);
    setReflectModalOpen(true);
  };

  const applyScheduleReflection = async (reflection: ScheduleReflection) => {
    const updates = reflectionToScheduleUpdates(reflection);
    setSchedule(prev => {
      const dayKey = getDayKey();
      const base = prev.dayKey === dayKey ? prev : createFreshSchedule(dayKey, scheduleTemplates);
      let items = [...base.items];
      for (const update of updates) {
        const time = normalizeScheduleTime(update.time);
        const existingIdx = items.findIndex(i => i.time === time);
        const newItem: ScheduleItem =
          existingIdx >= 0
            ? { ...items[existingIdx], label: update.label, sub: update.sub }
            : {
                id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                time,
                label: update.label,
                sub: update.sub,
              };
        items =
          existingIdx >= 0
            ? items.map((i, idx) => (idx === existingIdx ? newItem : i))
            : sortByTime([...items, newItem]);
      }
      return { dayKey, items, alerts: syncScheduleAlerts(items) };
    });

    if (reflection.habits?.length) {
      setGoals(prev => {
        const normalized = normalizeGoals(prev);
        const existing = new Set((normalized.deadlineGoals ?? []).map(g => g.text));
        const newHabits = reflection.habits!
          .filter(h => h.title && !existing.has(h.title))
          .map(h => ({
            id: `habit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            text: h.title,
            category: "その他" as GoalCategory,
            deadline: "",
            goalType: "習慣" as DeadlineGoalType,
            achieved: false,
          }));
        return {
          ...normalized,
          deadlineGoals: [...(normalized.deadlineGoals ?? []), ...newHabits],
        };
      });
    }

    const alarmCount = await registerTodayScheduleAlarms(
      updates.map(u => ({ time: u.time, label: u.label, sub: u.sub }))
    );

    if (notionSettings.connected && notionSettings.enabled) {
      const today = getDayKey();
      try {
        for (const item of reflection.schedule) {
          await fetch("/api/notion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...notionDbBody(notionSettings),
              task: {
                text: item.title,
                type: "today",
                category: "生活",
                deadline: today,
                time: item.time,
              },
            }),
          });
        }
        for (const habit of reflection.habits ?? []) {
          await fetch("/api/notion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...notionDbBody(notionSettings),
              task: {
                text: habit.title,
                type: "habit",
                category: "習慣",
                time: habit.time ?? null,
              },
            }),
          });
        }
        await syncNotion();
      } catch {
        /* Notion sync is optional — fail silently on schedule apply */
      }
    }

    if (reflectMessageIndex !== null) {
      setChatMessages(prev =>
        prev.map((m, idx) => (idx === reflectMessageIndex ? { ...m, reflected: true } : m))
      );
    }

    const alarmNote =
      alarmCount > 0
        ? `${alarmCount}件のリマインダーを設定しました`
        : t("reflectSchedule.alarmNotice");
    setReflectNotice(`スケジュールを反映しました。${alarmNote}`);
    setTimeout(() => setReflectNotice(""), 4000);
  };

  const confirmScheduleReflection = async () => {
    if (!pendingReflection) return;
    setReflectingSchedule(true);
    try {
      await applyScheduleReflection(pendingReflection);
      setReflectModalOpen(false);
      setPendingReflection(null);
    } finally {
      setReflectingSchedule(false);
    }
  };

  const handleQuestionnaireDone = async (
    data: OnboardingFlowData,
    reflection: ScheduleReflection | null
  ) => {
    setPendingOnboarding({ data, reflection });
    saveOnboardingProgress({ ...buildProgressFromFlowData(data), integrationsPhase: true, flowData: data });
    if (reflection) {
      await applyScheduleReflection(reflection);
    }
    setOnboardingPhase("integrations");
  };

  const resetOnboardingFlow = () => {
    clearOnboardingProgress();
    setUserProfile(prev => ({
      ...prev,
      nameConfigured: false,
      onboardingComplete: false,
      birthDate: undefined,
      gender: undefined,
    }));
    setOnboardingPhase("questionnaire");
    setPendingOnboarding(null);
    setChatMessages([]);
    setChatFlowStep("intro");
    setChatFlowData({});
  };

  const dismissUpdateNotification = (mode: "ai" | "home") => {
    if (!updateNotification) return;
    writeStoredAppVersion(APP_VERSION);
    const changes = updateNotification.changes;
    setUpdateNotification(null);
    if (mode === "ai") {
      const name = getDisplayName(userProfile);
      setChatMessages([
        { type: "ai", text: buildReturnUserGreeting(name).text, choices: buildReturnUserGreeting(name).choices, step: "post_update" },
      ]);
      setChatFlowStep("free");
      setTab("chat");
      return;
    }
    setPendingReturnGreeting(true);
    void changes;
  };

  const finishOnboarding = async (
    data: OnboardingFlowData,
    options: IntegrationFinishOptions
  ) => {
    const displayName = data.nickname?.trim() || data.name?.trim() || DEFAULT_USER_NAME;
    setUserProfile(prev => ({
      ...prev,
      name: data.name?.trim() || displayName,
      nickname: data.nickname?.trim() || data.name?.trim() || prev.nickname,
      birthDate: data.birthDate,
      gender: data.gender,
      nameConfigured: true,
      onboardingComplete: true,
    }));
    markOnboardingCompleteInStorage();
    setChatKnowledge(prev => updateChatKnowledgeFromFlow(prev, data));
    clearOnboardingProgress();
    setChatMessages([
      {
        type: "ai",
        text: `${displayName}さん、セットアップが完了しました\n\nどんなライフスタイルにしたいですか？`,
        step: "free",
      },
    ]);
    setChatFlowStep("free");
    setChatFlowData({
      goal: data.goal,
      bedtime: data.bedtime,
      bath: data.bath,
      wake: data.wake,
      sleepDuration: data.sleepDuration,
    });
    setPendingOnboarding(null);
    setOnboardingPhase("questionnaire");
    setTab(options.openTab ?? "home");
  };

  const renderAiChatPanel = (compact: boolean) => (
    <AiChatPanel
      compact={compact}
      messages={chatMessages}
      isLoading={isLoading}
      chatInput={chatInput}
      isComposing={isComposing}
      onChatInputChange={setChatInput}
      onCompositionStart={() => setIsComposing(true)}
      onCompositionEnd={() => setIsComposing(false)}
      onSend={() => void handleSend()}
      onChoice={choice => void handleChoice(choice)}
      onOpenReflection={(reflection, index) => openReflectionModal(reflection, index)}
      onApplyAllSuggestions={index => applyAllSuggestionsToSchedule(index)}
      onAddSuggestion={(msgIndex, sugId) => addSuggestionToSchedule(msgIndex, sugId)}
      messagesEndRef={messagesEndRef}
    />
  );

  const latestAiChatLine =
    [...chatMessages].reverse().find(m => m.type === "ai")?.text ?? "どんなライフスタイルにしたいですか？";

  const openChatFromHome = (initialText?: string) => {
    if (pendingReturnGreeting) {
      setPendingReturnGreeting(false);
      const name = getDisplayName(userProfile);
      setChatMessages([
        { type: "ai", text: buildReturnUserGreeting(name).text, choices: buildReturnUserGreeting(name).choices, step: "post_update" },
      ]);
      setChatFlowStep("free");
    }
    const progress = loadOnboardingProgress();
    const pending = progress ? getPendingQuestions(progress) : [];
    if (pending.length > 0 && chatMessages.length === 0) {
      const resume = buildResumeOnboardingPrompt();
      setChatMessages([{ type: "ai", text: resume.text, choices: resume.choices, step: "resume_onboarding" }]);
      setChatFlowStep("free");
    }
    setTab("chat");
    if (initialText?.trim()) {
      void submitChatText(initialText.trim());
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleChoice = async (choice: string) => {
    if (choice === "続きから答える") {
      setUserProfile(prev => ({ ...prev, onboardingComplete: false }));
      setOnboardingPhase("questionnaire");
      return;
    }
    if (choice === "新機能について教えて") {
      const changelog = await fetchChangelog();
      setChatMessages(prev => [...prev, { type: "user", text: choice }, { type: "ai", text: buildUpdateAiMessage(changelog?.changes ?? []) }]);
      return;
    }
    if (chatFlowStep !== "free" && chatFlowStep !== "proposal") {
      await advanceChatFlow(choice, chatFlowStep);
      return;
    }
    recordChatKnowledge(choice);
    const updatedMessages: Message[] = [...chatMessages, { type: "user", text: choice }];
    setChatMessages(updatedMessages);
    setIsLoading(true);
    try {
      const reply = await fetchChatReply(updatedMessages, envContext, userKnowledgeContext, healthContext, appLocale);
      setChatMessages(prev => [...prev, createAiChatMessage(reply.content, reply)]);
    } catch {
      setChatMessages(prev => [
        ...prev,
        { type: "ai", text: "申し訳ございません。接続に問題が発生しました。しばらくしてからもう一度お試しください。" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const submitChatText = async (rawText: string) => {
    const text = rawText.trim();
    if (!text) return;

    if (isOnboardingResetIntent(text)) {
      resetOnboardingFlow();
      return;
    }

    if (isPwaInstallIntent(text)) {
      setChatMessages(prev => [...prev, { type: "user", text }]);
      if (canPromptInstall) {
        const outcome = await promptInstall();
        const ack =
          outcome === "accepted"
            ? "ショートカットを追加しました。Dockやアプリ一覧から起動できます。"
            : "インストールをキャンセルしました。設定画面からいつでも追加できます。";
        setChatMessages(prev => [...prev, { type: "ai", text: ack }]);
      } else if (isMacSafari()) {
        setShowPwaGuide(true);
        setChatMessages(prev => [...prev, { type: "ai", text: t("pwa.safariShortcutGuide") }]);
      } else {
        setShowPwaGuide(true);
        setChatMessages(prev => [...prev, { type: "ai", text: t("pwa.chromeIntro") }]);
      }
      return;
    }

    if (chatFlowStep !== "free" && chatFlowStep !== "proposal") {
      await advanceChatFlow(text, chatFlowStep);
      return;
    }

    if (isReflectIntent(text)) {
      const lastAiWithReflection = [...chatMessages]
        .reverse()
        .find(m => m.type === "ai" && m.scheduleReflection && !m.reflected);
      if (lastAiWithReflection?.scheduleReflection) {
        const idx = chatMessages.lastIndexOf(lastAiWithReflection);
        setChatMessages(prev => [...prev, { type: "user", text }]);
        openReflectionModal(lastAiWithReflection.scheduleReflection!, idx);
        return;
      }
    }

    recordChatKnowledge(text);

    const updatedMessages: Message[] = [...chatMessages, { type: "user", text }];
    setChatMessages(updatedMessages);
    setIsLoading(true);
    try {
      const reply = await fetchChatReply(updatedMessages, envContext, userKnowledgeContext, healthContext, appLocale);
      const aiMsg = createAiChatMessage(reply.content, reply);
      setChatMessages(prev => [...prev, aiMsg]);
      if (reply.scheduleReflection && isReflectIntent(text)) {
        openReflectionModal(reply.scheduleReflection, updatedMessages.length);
      }
    } catch {
      setChatMessages(prev => [
        ...prev,
        { type: "ai", text: "申し訳ございません。接続に問題が発生しました。しばらくしてからもう一度お試しください。" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput("");
    setIsComposing(false);
    await submitChatText(text);
  };

  const toggleSymptom = (symptom: string) => {
    setHealthForm(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom],
    }));
  };

  const handleHealthSave = () => {
    setSaveMessage("体調チェックを保存しました");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const renderHomeSection = (sectionId: HomeSectionId) => {
    switch (sectionId) {
      case "weather":
        return (
          <div style={{ margin: "16px 16px 0" }}>
            {weatherLoading && (
              <div style={{ background: "var(--t-card-bg)", borderRadius: "var(--t-radius-lg)", padding: 16, height: 140, border: "1px solid var(--t-border)", fontSize: "var(--t-font-size-sm)", color: "var(--t-text-muted)", textAlign: "center", lineHeight: "108px" }}>
                {t("home.weatherLoading")}
              </div>
            )}
            {weather && !weatherLoading && weather.hourly?.length > 0 && (
              <DailyWeatherChart
                hourly={weather.hourly}
                showTemperature={homeDisplay.weatherChart}
                showHumidity={homeDisplay.humidityChart}
                showMoon={homeDisplay.moonPhase}
                moonAge={weather.moonAge}
                moonPhase={weather.moonPhase}
              />
            )}
          </div>
        );
      case "sunTimes":
        if (!weather || weatherLoading || (!weather.sunrise && !weather.sunset)) return null;
        return (
          <div style={{ margin: "12px 16px 0", background: "var(--t-card-bg)", borderRadius: "var(--t-radius-md)", padding: "12px 14px", border: "1px solid var(--t-border)" }}>
            <div style={{ fontSize: "var(--t-font-size-sm)", color: "var(--t-text-muted)", marginBottom: 8, textAlign: "center" }}>
              {getRegionById(locationSettings.regionId).label}
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", fontSize: "var(--t-font-size-base)", color: "var(--t-text)" }}>
              {weather.sunrise && <span>{t("home.sunrise")} <strong>{weather.sunrise}</strong></span>}
              {weather.sunset && <span>{t("home.sunset")} <strong>{weather.sunset}</strong></span>}
            </div>
          </div>
        );
      case "todayTasks":
        return (
          <LocalTodayTasksSection
            tasks={todayLocalTasks}
            onToggle={task => {
              setLocalTasksStorage(prev => ({
                ...prev,
                tasks: prev.tasks.map(t =>
                  t.id === task.id ? { ...t, status: t.status === "done" ? "pending" : "done" } : t
                ),
              }));
            }}
            onAdd={(text, category) => {
              setLocalTasksStorage(prev => ({
                ...prev,
                tasks: [...prev.tasks, newLocalTask(text, dayKey, category)],
              }));
            }}
            onRemove={id => {
              setLocalTasksStorage(prev => ({
                ...prev,
                tasks: prev.tasks.filter(t => t.id !== id),
              }));
            }}
          />
        );
      case "dailyGoal":
        return (
          <>
            <HomeGoalSection
              title={`${t("home.todayGoal")}`}
              goalList={goals.daily}
              collapsed={false}
              collapsible={false}
              inputText={dailyInput}
              onInputTextChange={setDailyInput}
              onAdd={() => {
                if (!dailyInput.trim()) return;
                addGoalItem("daily", dailyInput.trim(), "その他");
                setDailyInput("");
              }}
              onUpdateItem={(id, patch) => updateGoalItem("daily", id, patch)}
              onRemoveItem={id => removeGoalItem("daily", id)}
              onAiSuggest={() => suggestGoal("daily")}
              isSuggesting={suggestingPeriod === "daily"}
              aiSuggestion={aiSuggestions.daily?.periodKey === getDayKey() ? aiSuggestions.daily : null}
              onAdoptAi={() => adoptAiGoal("daily")}
              hideCategories
            />
          </>
        );
      case "deadlineGoal":
        return (
          <>
            <HomeDeadlineGoalsSection
              goals={goals.deadlineGoals ?? []}
              inputText={deadlineInput}
              inputGoalType={deadlineGoalType}
              inputDeadline={deadlineDate}
              onInputTextChange={setDeadlineInput}
              onInputGoalTypeChange={setDeadlineGoalType}
              onInputDeadlineChange={setDeadlineDate}
              onAdd={() => {
                if (!deadlineInput.trim()) return;
                addDeadlineGoalEntry(deadlineInput.trim(), "その他", deadlineDate, deadlineGoalType);
                setDeadlineInput("");
              }}
              onUpdateGoal={updateDeadlineGoal}
              onToggleAchieved={toggleDeadlineGoalAchieved}
              onRemoveGoal={removeDeadlineGoal}
              onAiSuggest={suggestDeadlineGoal}
              isSuggesting={isSuggestingDeadline}
              aiSuggestion={aiDeadlineSuggestion}
              onAdoptAi={adoptAiDeadlineGoal}
            />
          </>
        );
      case "monthlyGoal":
        return (
          <HomeGoalSection
            title="今月の目標"
            goalList={goals.monthly}
            collapsed={false}
            collapsible={false}
            inputText={monthlyInput}
            inputCategory={monthlyCategory}
            onInputTextChange={setMonthlyInput}
            onInputCategoryChange={setMonthlyCategory}
            onAdd={() => {
              if (!monthlyInput.trim()) return;
              addGoalItem("monthly", monthlyInput.trim(), monthlyCategory);
              setMonthlyInput("");
            }}
            onUpdateItem={(id, patch) => updateGoalItem("monthly", id, patch)}
            onRemoveItem={id => removeGoalItem("monthly", id)}
            onAiSuggest={() => suggestGoal("monthly")}
            isSuggesting={suggestingPeriod === "monthly"}
            aiSuggestion={aiSuggestions.monthly?.periodKey === getMonthKey() ? aiSuggestions.monthly : null}
            onAdoptAi={() => adoptAiGoal("monthly")}
          />
        );
      case "diagnosis":
        return (
          <AiDailyInsightSection
            displayName={getDisplayName(userProfile)}
            timeGreeting={pickTimeGreeting()}
            environmentContext={envContext}
            healthContext={healthContext}
            userKnowledgeContext={userKnowledgeContext}
            healthSummary={
              healthData.updatedAt ? `ヘルスケア: ${formatHealthSummary(healthData)}` : undefined
            }
            locale={appLocale}
            onOpenChat={() => setTab("chat")}
          />
        );
      case "schedule":
        return (
          <>
            <div style={{ padding: "20px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "var(--t-font-size-lg)", fontWeight: "bold", color: "var(--t-text)" }}>{t("home.todaySchedule")}</div>
              <button
                type="button"
                onClick={() => setScheduleEdit({ mode: "add", item: { id: "", time: "12:00", label: "", sub: "" } })}
                style={{ background: "var(--t-accent-bg)", border: "1.5px solid var(--t-accent)", borderRadius: 16, padding: "4px 12px", fontSize: "var(--t-font-size-base)", color: "var(--t-text)", cursor: "pointer", fontWeight: "bold" }}
              >
                {t("home.addSchedule")}
              </button>
            </div>
            {mergedTimelineItems.map(item => {
              const isNotionItem = item.id.startsWith("notion-schedule-") || item.id.startsWith("notion-");
              return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (isNotionItem) return;
                  setScheduleEdit({ mode: "edit", item: { ...item } });
                }}
                style={{
                  display: "block", width: "calc(100% - 40px)", margin: "0 20px 8px", background: "white", borderRadius: 12, padding: "12px 14px",
                  border: isNotionItem
                    ? "1.5px solid rgba(126,200,227,0.5)"
                    : item.id.startsWith("custom-") || item.id.startsWith("item-")
                      ? "1.5px solid #c17f4a"
                      : "1px solid rgba(60,40,20,0.1)",
                  cursor: isNotionItem ? "default" : "pointer", textAlign: "left",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 11, color: "#4a6741", fontWeight: "bold", marginBottom: 2 }}>{item.label}</div>
                  {isNotionItem && (
                    <span style={{ fontSize: 9, color: "#7ec8e3", background: "rgba(126,200,227,0.15)", borderRadius: 8, padding: "2px 6px" }}>
                      Notion
                    </span>
                  )}
                  {(item.id.startsWith("custom-") || item.id.startsWith("item-")) && (
                    <span style={{ fontSize: 9, color: "#c17f4a", background: "#fdf0e4", borderRadius: 8, padding: "2px 6px" }}>
                      {item.id.startsWith("custom-") ? "AI追加" : "追加"}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 18, fontWeight: "bold", color: "#1a1410" }}>{item.time}</div>
                {item.sub && <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.7 }}>{item.sub}</div>}
                {!isNotionItem && (
                  <div style={{ fontSize: "var(--t-font-size-sm)", color: "var(--t-text-muted)", marginTop: 6 }}>{t("common.tapToEdit")}</div>
                )}
              </button>
            );
            })}
          </>
        );
      case "radio":
        return (
          <TsuyukusaRadio
            radioSettings={radioSettings}
            onChange={setRadioSettings}
            onOpenBinaural={() => openBinauralPanel("beats")}
            onOpenPomodoro={() => openBinauralPanel("pomodoro")}
          />
        );
      case "binaural":
        return (
          <div style={{ margin: "12px 16px 0", background: "var(--t-card-bg)", borderRadius: "var(--t-radius-md)", padding: "14px", border: "1px solid var(--t-border)" }}>
            <div style={{ fontSize: "var(--t-font-size-base)", fontWeight: "bold", color: "var(--t-primary)", marginBottom: 8 }}>{t("home.soundPlayer")}</div>
            <div style={{ fontSize: "var(--t-font-size-sm)", color: "var(--t-text-muted)", marginBottom: 10, lineHeight: 1.5 }}>
              {t("home.soundPlayerHint")}
            </div>
            <button type="button" onClick={() => openBinauralPanel("beats")} style={homeActionBtnStyle}>
              {t("home.openSound")}
            </button>
          </div>
        );
      case "pomodoro":
        return (
          <div style={{ margin: "12px 16px 0", background: "var(--t-card-bg)", borderRadius: "var(--t-radius-md)", padding: "14px", border: "1px solid var(--t-border)" }}>
            <div style={{ fontSize: "var(--t-font-size-base)", fontWeight: "bold", color: "var(--t-primary)", marginBottom: 8 }}>{t("home.pomodoroTitle")}</div>
            <div style={{ fontSize: "var(--t-font-size-sm)", color: "var(--t-text-muted)", marginBottom: 10, lineHeight: 1.5 }}>
              {t("home.pomodoroHint")}
            </div>
            <button type="button" onClick={() => openBinauralPanel("pomodoro")} style={homeActionBtnStyle}>
              {t("home.openTimer")}
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  if (!storageReady) {
    return (
      <div style={themeAppShellStyle}>
        <div style={themeHeaderStyle}>
          <div style={{ fontSize: "var(--t-font-size-xl)", fontWeight: "bold" }}>{t("common.appName")}</div>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--t-font-size-base)", color: "var(--t-text-muted)" }}>
          {t("common.loading")}
        </div>
      </div>
    );
  }

  const handleDeferOnboardingToHome = (data: OnboardingFlowData) => {
    const progress = loadOnboardingProgress();
    if (progress) saveOnboardingProgress(progress);
    setUserProfile(prev => ({
      ...prev,
      birthDate: data.birthDate ?? prev.birthDate,
      gender: data.gender ?? prev.gender,
      name: data.name?.trim() || data.nickname?.trim() || prev.name,
      nickname: data.nickname?.trim() || prev.nickname,
      onboardingComplete: true,
      nameConfigured: prev.nameConfigured || !!(data.nickname?.trim() || data.name?.trim()),
    }));
    markOnboardingCompleteInStorage();
    if (data.goal || data.bedtime || data.bath || data.wake || data.sleepDuration) {
      setChatKnowledge(prev => updateChatKnowledgeFromFlow(prev, data));
    }
    setTab("home");
  };

  if (!userProfile.onboardingComplete) {
    if (onboardingPhase === "integrations" && pendingOnboarding) {
      return (
        <OnboardingIntegrationsScreen
          supabaseSettings={supabaseSettings}
          onSupabaseChange={patch => setSupabaseSettings(prev => ({ ...prev, ...patch }))}
          notionSettings={notionSettings}
          onNotionChange={patch => setNotionSettings(prev => ({ ...prev, ...patch, enabled: patch.enabled ?? true }))}
          onNotionSetup={setupNotion}
          googleCalendar={googleCalendar}
          onGoogleCalendarChange={patch => setGoogleCalendar(prev => ({ ...prev, ...patch }))}
          onGoogleConnect={connectGoogleCalendar}
          healthData={healthData}
          onFinish={options => void finishOnboarding(pendingOnboarding.data, options)}
        />
      );
    }
    return (
      <OnboardingScreen
        fetchProposal={fetchOnboardingProposal}
        onQuestionnaireDone={(data, reflection) => void handleQuestionnaireDone(data, reflection)}
        onDeferToHome={data => handleDeferOnboardingToHome(data)}
      />
    );
  }

  return (
    <div className="app-shell" style={themeAppShellStyle}>
      {updateNotification && (
        <UpdateNotificationScreen
          oldVersion={updateNotification.oldVersion}
          newVersion={updateNotification.newVersion}
          changes={updateNotification.changes}
          onAskAi={() => dismissUpdateNotification("ai")}
          onGoHome={() => dismissUpdateNotification("home")}
        />
      )}

      {isDesktop && <AppSidebar activeTab={tab} onTabChange={setTab} />}

      <div className="app-main-column">
      {/* ヘッダー */}
      <div className={isDesktop ? "app-header--desktop" : undefined} style={themeHeaderStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: weather || weatherLoading ? 10 : 0 }}>
          <div style={{ fontSize: "var(--t-font-size-xl)", fontWeight: "bold" }}>{t("common.appName")}</div>
          <ClientFormattedDate />
        </div>
        {weatherLoading && (
          <div style={{ fontSize: "var(--t-font-size-sm)", opacity: 0.5 }}>{t("home.weatherHeaderLoading")}</div>
        )}
        {weather && !weatherLoading && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 14px", fontSize: 11, opacity: 0.85 }}>
            <span>{weather.temperature}℃</span>
            <span>{weather.humidity}%</span>
            <span>{weatherLabel(weather.weatherCode)}</span>
            <span>{weather.moonPhase}</span>
          </div>
        )}
      </div>

      {/* コンテンツ */}
      <div className={`app-main-scroll${isDesktop ? " app-content-desktop" : ""}`} style={{ flex: 1, overflowY: "auto", paddingBottom: isDesktop ? 0 : 20 }}>
        
        {/* ホーム */}
        {tab === "home" && (
          <div>
            <AddToHomeScreen />
            <HealthKitBridge healthData={healthData} />
            {healthImportMessage && (
              <div style={{ margin: "8px 16px 0", padding: "10px 12px", background: "#e8f0e4", borderRadius: 10, fontSize: 12, color: "#4a6741", textAlign: "center" }}>
                {healthImportMessage}
              </div>
            )}
            <HomeAiChatTeaser
              latestMessage={latestAiChatLine}
              onOpenChat={() => openChatFromHome()}
              onSubmit={text => openChatFromHome(text)}
            />
            {homeDisplay.sectionOrder
              .filter(sectionId => isSectionVisible(homeDisplay, sectionId))
              .map(sectionId => (
                <div key={sectionId}>{renderHomeSection(sectionId)}</div>
              ))}
          </div>
        )}

        {/* AI相談 */}
        {tab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: isDesktop ? "calc(100vh - 100px)" : "calc(100vh - 120px)" }}>
            <div style={{ margin: "12px 16px 0" }}>
              <button
                type="button"
                onClick={() => openBinauralPanel("beats")}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1.5px solid rgba(60,40,20,0.12)",
                  background: "white",
                  color: "#3d3228",
                  fontSize: 13,
                  fontWeight: "bold",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                バイノーラルビート · リラックス・集中サポート
              </button>
            </div>
            {weather && (
              <div style={{ margin: "12px 16px 0", background: "white", borderRadius: 10, padding: "10px 12px", border: "1px solid rgba(60,40,20,0.1)", fontSize: 11, color: "#3d3228", lineHeight: 1.6 }}>
                <div style={{ fontWeight: "bold", color: "#4a6741", marginBottom: 4 }}>本日の環境（診断に反映）</div>
                <span>{weather.temperature}℃ </span>
                <span>{weather.humidity}% </span>
                <span>{weatherLabel(weather.weatherCode)} </span>
                <span>{weather.moonPhase}</span>
                {weather.moonPhase === "満月" && (
                  <div style={{ color: "#c17f4a", marginTop: 4 }}>満月は水滞が悪化しやすい時期です</div>
                )}
              </div>
            )}
            {renderAiChatPanel(false)}
          </div>
        )}

        {tab === "display" && (
          <ScreenSettingsTab
            userProfile={userProfile}
            onUserProfileChange={setUserProfile}
            defaultUserName={DEFAULT_USER_NAME}
            locationSettings={locationSettings}
            onLocationChange={setLocationSettings}
            homeDisplay={homeDisplay}
            onHomeDisplayChange={setHomeDisplay}
            healthData={healthData}
          />
        )}

        {/* 設定 */}
        {tab === "settings" && (
          <div style={{ padding: isDesktop ? "8px 16px 24px" : 16 }}>
            <PwaInstallSection variant="settings" />
            <div style={{ fontSize: 15, fontWeight: "bold", color: "#3d3228", marginBottom: 4 }}>使い方ガイド</div>
            <div style={{ fontSize: 11, color: "#9a8b7a", marginBottom: 12, lineHeight: 1.5 }}>
              つゆくさ生活リズムアプリの主な機能と設定手順
            </div>
            {USER_MANUAL_STEP_KEYS.map((step, i) => (
              <div key={step.titleKey} style={{ ...cardStyle, marginBottom: 10 }}>
                <div style={{ fontSize: "var(--t-font-size-base)", fontWeight: "bold", color: "var(--t-text)", marginBottom: 6 }}>
                  {i + 1}. {step.icon} {t(step.titleKey)}
                </div>
                <div style={{ fontSize: "var(--t-font-size-base)", color: "var(--t-text)", lineHeight: 1.7, opacity: 0.85, whiteSpace: "pre-line" }}>
                  {t(step.bodyKey)}
                </div>
              </div>
            ))}

            <LanguageSettingsPanel />

            <div style={{ fontSize: 15, fontWeight: "bold", color: "#3d3228", marginBottom: 4, paddingTop: 8, borderTop: "1px solid rgba(60,40,20,0.12)" }}>曜日別スケジュール</div>
            <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.6, marginBottom: 12, lineHeight: 1.5 }}>
              月〜日それぞれの基本スケジュールを設定できます。毎朝、その曜日のテンプレートから今日のスケジュールが自動生成されます。
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {WEEKDAY_OPTIONS.map(day => (
                <ChipButton
                  key={day.key}
                  selected={templateEditDay === day.key}
                  onClick={() => setTemplateEditDay(day.key)}
                >
                  {day.label}
                </ChipButton>
              ))}
            </div>
            <div style={{ ...cardStyle, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: "bold", color: "#3d3228" }}>
                  {WEEKDAY_OPTIONS.find(d => d.key === templateEditDay)?.label}曜日のテンプレート
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setTemplateScheduleEdit({
                      mode: "add",
                      item: { id: "", time: "12:00", label: "", sub: "" },
                    })
                  }
                  style={{
                    background: "#fdf0e4",
                    border: "1.5px solid #c17f4a",
                    borderRadius: 14,
                    padding: "4px 10px",
                    fontSize: 11,
                    color: "#8b5a2b",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  ＋ 追加
                </button>
              </div>
              {templateItemsForDay.length === 0 && (
                <div style={{ fontSize: 12, color: "#9a8b7a", padding: "8px 0" }}>項目がありません</div>
              )}
              {templateItemsForDay.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTemplateScheduleEdit({ mode: "edit", item: { ...item } })}
                  style={{
                    display: "block",
                    width: "100%",
                    background: "#f5f0e8",
                    borderRadius: 10,
                    padding: "10px 12px",
                    marginBottom: 6,
                    border: "1px solid rgba(60,40,20,0.08)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#4a6741", fontWeight: "bold" }}>{item.label}</div>
                  <div style={{ fontSize: 15, fontWeight: "bold", color: "#1a1410" }}>{item.time}</div>
                  {item.sub && <div style={{ fontSize: 10, color: "#3d3228", opacity: 0.7 }}>{item.sub}</div>}
                </button>
              ))}
            </div>

            <DataManagementPanel onImported={() => {}} />

            <SupabaseSyncPanel
              settings={supabaseSettings}
              onChange={patch => setSupabaseSettings(prev => ({ ...prev, ...patch }))}
              onSynced={() => window.location.reload()}
            />

            <ExternalIntegrationsPanel
              cardStyle={cardStyle}
              fieldLabelStyle={fieldLabelStyle}
              inputStyle={inputStyle}
              googleCalendar={{
                connected: googleCalendar.connected,
                icalUrl: googleCalendar.icalUrl,
                syncing: false,
                message: calendarMessage,
                onIcalUrlChange: url =>
                  setGoogleCalendar(prev => ({ ...prev, icalUrl: url, connected: false })),
                onConnect: () => void connectGoogleCalendar(),
                onDisconnect: disconnectGoogleCalendar,
                onSync: () => void syncGoogleCalendar(),
              }}
              notion={{
                settings: notionSettings,
                syncing: notionSyncing,
                message: notionMessage,
                showManual: showNotionManual,
                onShowManual: setShowNotionManual,
                onSettingsChange: patch => setNotionSettings(prev => ({ ...prev, ...patch })),
                onSetup: () => void setupNotion(),
                onSync: () => void syncNotion(),
                onToggleEnabled: enabled =>
                  setNotionSettings(prev => ({ ...prev, enabled, connected: enabled ? prev.connected : false })),
              }}
            />

            <div style={{ fontSize: 15, fontWeight: "bold", color: "#3d3228", marginBottom: 4, paddingTop: 12, borderTop: "1px solid rgba(60,40,20,0.12)", marginTop: 8 }}>目標設定</div>
            <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.6, marginBottom: 8, lineHeight: 1.5 }}>
              すべて任意入力です。未設定の場合、AIが体調・季節・天気から今日の目標を提案します。
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.6 }}>全体の達成率（入力済みのみ）</div>
              <RateBadge rate={calcOverallRate(goals)} />
            </div>

            <PeriodGoalCard
              title="今日の目標"
              resetHint="毎日リセット・未入力OK"
              goalList={goals.daily}
              rate={calcListRate(goals.daily)}
              onAddItem={(text, cat) => addGoalItem("daily", text, cat)}
              onUpdateItem={(id, patch) => updateGoalItem("daily", id, patch)}
              onRemoveItem={id => removeGoalItem("daily", id)}
              optional
              showAiButton
              hideCategories
              isSuggesting={suggestingPeriod === "daily"}
              onAiSuggest={() => suggestGoal("daily")}
              aiSuggestion={aiSuggestions.daily?.periodKey === getDayKey() ? aiSuggestions.daily : null}
              onAdoptAi={() => adoptAiGoal("daily")}
            />
            <PeriodGoalCard
              title="今月の目標"
              resetHint="毎月初めにリセット・未入力OK"
              goalList={goals.monthly}
              rate={calcListRate(goals.monthly)}
              onAddItem={(text, cat) => addGoalItem("monthly", text, cat)}
              onUpdateItem={(id, patch) => updateGoalItem("monthly", id, patch)}
              onRemoveItem={id => removeGoalItem("monthly", id)}
              optional
              showAiButton
              isSuggesting={suggestingPeriod === "monthly"}
              onAiSuggest={() => suggestGoal("monthly")}
              aiSuggestion={aiSuggestions.monthly?.periodKey === getMonthKey() ? aiSuggestions.monthly : null}
              onAdoptAi={() => adoptAiGoal("monthly")}
            />

            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: "bold", color: "#3d3228" }}>期限付き目標</div>
                  <div style={{ fontSize: 10, color: "#3d3228", opacity: 0.5, marginTop: 2 }}>期限までに達成</div>
                </div>
                <RateBadge rate={calcDeadlineRate(goals.deadlineGoals ?? [])} />
              </div>

              {(goals.deadlineGoals ?? []).map(g => {
                const checked = isDeadlineGoalChecked(g);
                return (
                <div key={g.id} style={{ background: "#f5f0e8", borderRadius: 10, padding: 12, marginBottom: 8, border: "1px solid rgba(60,40,20,0.08)" }}>
                  <GoalTypeSelect value={g.goalType} onChange={goalType => updateDeadlineGoal(g.id, { goalType })} />
                  <input
                    type="text"
                    placeholder="目標を入力..."
                    value={g.text}
                    onChange={e => updateDeadlineGoal(g.id, { text: e.target.value })}
                    style={{ ...inputStyle, marginBottom: 8 }}
                  />
                  <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.6, marginBottom: 6 }}>期限</div>
                  <DeadlineTextInput
                    value={g.deadline}
                    onChange={deadline => updateDeadlineGoal(g.id, { deadline })}
                    style={{ ...inputStyle, marginBottom: 8 }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: checked ? "#4a6741" : "#3d3228" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={e => toggleDeadlineGoalAchieved(g.id, e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: "#c17f4a" }}
                      />
                      {g.goalType === "習慣" ? "今日達成した" : "達成した"}
                    </label>
                    <button
                      type="button"
                      onClick={() => removeDeadlineGoal(g.id)}
                      style={{ background: "none", border: "none", color: "#9a8b7a", fontSize: 12, cursor: "pointer" }}
                    >
                      削除
                    </button>
                  </div>
                </div>
              );})}

              <button
                type="button"
                onClick={addDeadlineGoal}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 10,
                  border: "1.5px dashed #c17f4a",
                  background: "#fdf0e4",
                  color: "#8b5a2b",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                ＋ 期限付き目標を追加
              </button>
            </div>

            <div style={{ fontSize: 15, fontWeight: "bold", color: "#3d3228", marginBottom: 4, paddingTop: 8, borderTop: "1px solid rgba(60,40,20,0.12)" }}>体調チェックの表示項目</div>
            <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.6, marginBottom: 12 }}>
              選んだ項目だけが履歴タブの体調チェックに表示されます
            </div>

            {HEALTH_FIELD_OPTIONS.map(field => {
              const enabled = isFieldEnabled(field.id);
              return (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => toggleEnabledField(field.id)}
                  style={{
                    width: "100%",
                    background: enabled ? "#fdf0e4" : "white",
                    borderRadius: 12,
                    padding: "14px 16px",
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    border: enabled ? "1.5px solid #c17f4a" : "1px solid rgba(60,40,20,0.1)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontSize: 22 }}>{field.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: "bold", color: "#3d3228" }}>{field.label}</div>
                    <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.6, marginTop: 2 }}>{field.description}</div>
                  </div>
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: enabled ? "none" : "1.5px solid rgba(60,40,20,0.2)",
                    background: enabled ? "#c17f4a" : "transparent",
                    color: "#f5f0e8",
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {enabled && "·"}
                  </div>
                </button>
              );
            })}

            <div style={{ fontSize: 12, color: "#4a6741", background: "#e8f0e4", borderRadius: 10, padding: "10px 12px", marginBottom: 20, lineHeight: 1.6 }}>
              {enabledFields.length === 0
                ? "追加項目は未選択です。基本項目（睡眠・便通・気分など）は常に表示されます。"
                : `${enabledFields.length}項目を体調チェックに表示中`}
            </div>

            <div style={{ fontSize: 15, fontWeight: "bold", color: "#3d3228", marginBottom: 12, paddingTop: 8, borderTop: "1px solid rgba(60,40,20,0.12)" }}>通知・連携</div>
            {[
              { icon: "", label: "起床アラート", val: MOCK_SCHEDULE.wakeTime },
              { icon: "", label: "食事アラート", val: `${MOCK_SCHEDULE.mealTime1} / ${MOCK_SCHEDULE.mealTime2}` },
              { icon: "", label: "入浴アラート", val: MOCK_SCHEDULE.bathTime },
              { icon: "", label: "就寝アラート", val: MOCK_SCHEDULE.sleepTime },
              { icon: "", label: "Googleカレンダー連携", val: googleCalendar.connected ? "接続済み" : "未連携" },
              { icon: "", label: "PWA（ホーム画面追加）", val: "対応" },
            ].map((item, i) => (
              <div key={i} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12 }}>
                {item.icon ? <div style={{ fontSize: 20 }}>{item.icon}</div> : null}
                <div style={{ flex: 1, fontSize: 14 }}>{item.label}</div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>{item.val}</div>
              </div>
            ))}
          </div>
        )}

        {/* 履歴 */}
        {tab === "history" && (
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: "bold", color: "#3d3228", marginBottom: 4 }}>今日の体調チェック</div>
            <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.6, marginBottom: 16 }}>毎朝の記録が、あなたに合った生活リズムの土台になります</div>

            {enabledFields.length === 0 && (
              <button
                type="button"
                onClick={() => setTab("settings")}
                style={{
                  width: "100%",
                  background: "#fdf0e4",
                  border: "1px dashed #c17f4a",
                  borderRadius: 12,
                  padding: "12px 14px",
                  marginBottom: 12,
                  fontSize: 12,
                  color: "#8b5a2b",
                  cursor: "pointer",
                  lineHeight: 1.6,
                }}
              >
                設定タブで血圧・アレルギーなどの追加項目を選べます
              </button>
            )}

            {saveMessage && (
              <div style={{ background: "#e8f0e4", border: "1px solid #c5d8be", borderRadius: 12, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#4a6741", textAlign: "center" }}>
                {saveMessage}
              </div>
            )}

            {/* 睡眠時間 */}
            <div style={cardStyle}>
              <div style={fieldLabelStyle}>睡眠時間</div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.6, marginBottom: 6 }}>入眠</div>
                  <input
                    type="time"
                    value={healthForm.sleepBed}
                    onChange={e => setHealthForm(prev => ({ ...prev, sleepBed: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 12, color: "#c17f4a", fontSize: 12 }}>→</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.6, marginBottom: 6 }}>起床</div>
                  <input
                    type="time"
                    value={healthForm.sleepWake}
                    onChange={e => setHealthForm(prev => ({ ...prev, sleepWake: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <CountSelector
              label="中途覚醒の回数"
              value={healthForm.awakenings}
              onChange={v => setHealthForm(prev => ({ ...prev, awakenings: v }))}
            />

            <CountSelector
              label="夜間トイレの回数"
              value={healthForm.nightToilet}
              onChange={v => setHealthForm(prev => ({ ...prev, nightToilet: v }))}
            />

            {/* 夕食時間 */}
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ ...fieldLabelStyle, marginBottom: 0 }}>夕食時間</div>
                <span style={{ fontSize: 18, fontWeight: "bold", color: "#1a1410" }}>{healthForm.dinnerTime}</span>
              </div>
              <input
                type="time"
                value={healthForm.dinnerTime}
                onChange={e => setHealthForm(prev => ({ ...prev, dinnerTime: e.target.value }))}
                style={inputStyle}
              />
              <div style={{ fontSize: 10, color: "#3d3228", opacity: 0.5, marginTop: 6 }}>
                推奨：16:00（塩・タンパク質・海産物中心）
              </div>
            </div>

            {/* 朝の体調 */}
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ ...fieldLabelStyle, marginBottom: 0 }}>朝の体調</div>
                <span style={{ fontSize: 16, fontWeight: "bold", color: "#c17f4a" }}>{healthForm.morningCondition}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={healthForm.morningCondition}
                onChange={e => setHealthForm(prev => ({ ...prev, morningCondition: Number(e.target.value) }))}
                style={{ width: "100%", accentColor: "#c17f4a" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#3d3228", opacity: 0.5, marginTop: 4 }}>
                <span>悪い</span>
                <span>良い</span>
              </div>
            </div>

            {/* 便通：状態 + 回数 */}
            <div style={cardStyle}>
              <div style={fieldLabelStyle}>便通の状態</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {BOWEL_OPTIONS.map(opt => (
                  <ChipButton
                    key={opt}
                    selected={healthForm.bowelType === opt}
                    onClick={() => setHealthForm(prev => ({ ...prev, bowelType: opt }))}
                  >
                    {opt}
                  </ChipButton>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.6, marginBottom: 8 }}>回数</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {COUNT_OPTIONS.map(opt => {
                  const selected = healthForm.bowelCount === opt;
                  return (
                    <ChipButton
                      key={String(opt)}
                      selected={selected}
                      onClick={() => setHealthForm(prev => ({ ...prev, bowelCount: opt }))}
                    >
                      {opt === "5回以上" ? opt : `${opt}回`}
                    </ChipButton>
                  );
                })}
              </div>
            </div>

            {/* 気分 */}
            <div style={cardStyle}>
              <div style={fieldLabelStyle}>気分（各10段階）</div>
              {MOOD_ITEMS.map(item => (
                <MoodSlider
                  key={item.key}
                  moodKey={item.key}
                  label={item.label}
                  value={healthForm.mood[item.key]}
                  onChange={(key, val) => setHealthForm(prev => ({
                    ...prev,
                    mood: { ...prev.mood, [key]: val },
                  }))}
                />
              ))}
            </div>

            {/* 血圧 */}
            {isFieldEnabled("bloodPressure") && (
              <div style={cardStyle}>
                <div style={fieldLabelStyle}>血圧</div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.6, marginBottom: 6 }}>収縮期</div>
                    <input
                      type="number"
                      placeholder="120"
                      value={healthForm.bloodPressure.systolic}
                      onChange={e => setHealthForm(prev => ({
                        ...prev,
                        bloodPressure: { ...prev.bloodPressure, systolic: e.target.value },
                      }))}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 12, color: "#c17f4a", fontSize: 12 }}>/</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.6, marginBottom: 6 }}>拡張期</div>
                    <input
                      type="number"
                      placeholder="80"
                      value={healthForm.bloodPressure.diastolic}
                      onChange={e => setHealthForm(prev => ({
                        ...prev,
                        bloodPressure: { ...prev.bloodPressure, diastolic: e.target.value },
                      }))}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div style={{ fontSize: 10, color: "#3d3228", opacity: 0.5, marginTop: 6 }}>mmHg</div>
              </div>
            )}

            {/* 生理関連 */}
            {isFieldEnabled("menstrual") && (
              <div style={cardStyle}>
                <div style={fieldLabelStyle}>生理関連（各10段階）</div>
                {MENSTRUAL_ITEMS.map(item => (
                  <LevelSlider
                    key={item.key}
                    label={item.label}
                    value={healthForm.menstrual[item.key]}
                    onChange={val => setHealthForm(prev => ({
                      ...prev,
                      menstrual: { ...prev.menstrual, [item.key]: val },
                    }))}
                    min={1}
                    max={10}
                    minLabel="軽い"
                    maxLabel="強い"
                  />
                ))}
              </div>
            )}

            {/* アレルギー */}
            {isFieldEnabled("allergy") && (
              <div style={cardStyle}>
                <div style={fieldLabelStyle}>アレルギー（各5段階）</div>
                {ALLERGY_ITEMS.map(item => (
                  <LevelSlider
                    key={item.key}
                    label={item.label}
                    value={healthForm.allergy[item.key]}
                    onChange={val => setHealthForm(prev => ({
                      ...prev,
                      allergy: { ...prev.allergy, [item.key]: val },
                    }))}
                    min={1}
                    max={5}
                    minLabel="なし"
                    maxLabel="強い"
                  />
                ))}
              </div>
            )}

            {/* 飲酒 */}
            {isFieldEnabled("alcohol") && (
              <div style={cardStyle}>
                <div style={fieldLabelStyle}>飲酒</div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.6, marginBottom: 6 }}>種類</div>
                  <input
                    type="text"
                    placeholder="例：日本酒・ビール"
                    value={healthForm.alcohol.type}
                    onChange={e => setHealthForm(prev => ({
                      ...prev,
                      alcohol: { ...prev.alcohol, type: e.target.value },
                    }))}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.6, marginBottom: 6 }}>量</div>
                  <input
                    type="text"
                    placeholder="例：1合・350ml"
                    value={healthForm.alcohol.amount}
                    onChange={e => setHealthForm(prev => ({
                      ...prev,
                      alcohol: { ...prev.alcohol, amount: e.target.value },
                    }))}
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            {/* 漢方・薬 */}
            {isFieldEnabled("kampo") && (
              <div style={cardStyle}>
                <div style={fieldLabelStyle}>漢方・薬の内服（複数選択可）</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {KAMPO_OPTIONS.map(item => (
                    <ChipButton
                      key={item}
                      selected={healthForm.kampoTaken.includes(item)}
                      onClick={() => toggleKampo(item)}
                      variant="dark"
                    >
                      {item}
                    </ChipButton>
                  ))}
                </div>
              </div>
            )}

            {/* 携帯使用時間 */}
            {isFieldEnabled("phoneTime") && (
              <div style={cardStyle}>
                <div style={fieldLabelStyle}>携帯使用時間</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number"
                    min={0}
                    max={1440}
                    placeholder="120"
                    value={healthForm.phoneTimeMinutes}
                    onChange={e => setHealthForm(prev => ({ ...prev, phoneTimeMinutes: e.target.value }))}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <span style={{ fontSize: 13, color: "#3d3228", flexShrink: 0 }}>分/日</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={480}
                  step={15}
                  value={Number(healthForm.phoneTimeMinutes) || 0}
                  onChange={e => setHealthForm(prev => ({ ...prev, phoneTimeMinutes: e.target.value }))}
                  style={{ width: "100%", marginTop: 12, accentColor: "#c17f4a" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#3d3228", opacity: 0.5, marginTop: 4 }}>
                  <span>0分</span>
                  <span>8時間</span>
                </div>
              </div>
            )}

            {/* 体重・体温 */}
            {isFieldEnabled("weightTemp") && (
              <div style={cardStyle}>
                <div style={fieldLabelStyle}>体重・体温</div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.6, marginBottom: 6 }}>体重</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="55.0"
                        value={healthForm.weight}
                        onChange={e => setHealthForm(prev => ({ ...prev, weight: e.target.value }))}
                        style={inputStyle}
                      />
                      <span style={{ fontSize: 12, color: "#3d3228", flexShrink: 0 }}>kg</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#3d3228", opacity: 0.6, marginBottom: 6 }}>体温</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="36.5"
                        value={healthForm.temperature}
                        onChange={e => setHealthForm(prev => ({ ...prev, temperature: e.target.value }))}
                        style={inputStyle}
                      />
                      <span style={{ fontSize: 12, color: "#3d3228", flexShrink: 0 }}>℃</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 主な症状 */}
            <div style={cardStyle}>
              <div style={fieldLabelStyle}>主な症状（複数選択可）</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SYMPTOM_OPTIONS.map(symptom => (
                  <ChipButton
                    key={symptom}
                    selected={healthForm.symptoms.includes(symptom)}
                    onClick={() => toggleSymptom(symptom)}
                    variant="dark"
                  >
                    {symptom}
                  </ChipButton>
                ))}
              </div>
              {healthForm.symptoms.includes("その他") && (
                <input
                  type="text"
                  placeholder="その他の症状を入力..."
                  value={healthForm.otherSymptom}
                  onChange={e => setHealthForm(prev => ({ ...prev, otherSymptom: e.target.value }))}
                  style={{ ...inputStyle, marginTop: 10, fontSize: 13 }}
                />
              )}
            </div>

            {/* 一言日記 */}
            <div style={cardStyle}>
              <div style={fieldLabelStyle}>今日の一言日記</div>
              <textarea
                placeholder="今日の体調や気づきを自由に..."
                value={healthForm.diary}
                onChange={e => setHealthForm(prev => ({ ...prev, diary: e.target.value }))}
                rows={4}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7, fontFamily: "sans-serif" }}
              />
            </div>

            <button
              type="button"
              onClick={handleHealthSave}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 12,
                border: "none",
                background: "#1a1410",
                color: "#f5f0e8",
                fontSize: 15,
                fontWeight: "bold",
                cursor: "pointer",
                marginBottom: 24,
              }}
            >
              保存する
            </button>

            <div style={{ fontSize: 15, fontWeight: "bold", color: "#3d3228", marginBottom: 12, paddingTop: 8, borderTop: "1px solid rgba(60,40,20,0.12)" }}>過去の記録</div>
            {[
              { date: "5月29日（木）", diagnosis: "水滞", wake: "06:00", sleep: "22:30" },
              { date: "5月28日（水）", diagnosis: "血熱", wake: "06:30", sleep: "22:00" },
              { date: "5月27日（火）", diagnosis: "腎虚", wake: "06:00", sleep: "22:30" },
            ].map((h, i) => (
              <div key={i} style={cardStyle}>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>{h.date}</div>
                <div style={{ display: "inline-block", background: "#fdf0e4", color: "#c17f4a", borderRadius: 12, padding: "3px 10px", fontSize: 11, marginBottom: 6 }}>{h.diagnosis}</div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, opacity: 0.7 }}>
                  <span>起床 {h.wake}</span>
                  <span>{h.sleep}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "sound" && (
          <div style={{ background: "#1a1410", minHeight: "100%" }}>
            <SoundSystemPanel
              diagnosis={MOCK_SCHEDULE.diagnosis}
              scheduleRemainingSec={scheduleRemainingSec}
              initialMode={soundPanelMode}
            />
          </div>
        )}

      </div>

      {scheduleEdit && (
        <ScheduleEditModal
          draft={scheduleEdit}
          onChange={item => setScheduleEdit(prev => (prev ? { ...prev, item } : null))}
          onSave={saveScheduleEdit}
          onDelete={scheduleEdit.mode === "edit" ? deleteScheduleEdit : undefined}
          onClose={() => setScheduleEdit(null)}
        />
      )}

      {templateScheduleEdit && (
        <ScheduleEditModal
          draft={templateScheduleEdit}
          onChange={item => setTemplateScheduleEdit(prev => (prev ? { ...prev, item } : null))}
          onSave={saveTemplateScheduleEdit}
          onDelete={templateScheduleEdit.mode === "edit" ? deleteTemplateScheduleEdit : undefined}
          onClose={() => setTemplateScheduleEdit(null)}
        />
      )}

      {showBinauralPanel && (
        <BinauralBeatsPanel
          diagnosis={MOCK_SCHEDULE.diagnosis}
          initialPanelMode={binauralPanelMode}
          onClose={() => setShowBinauralPanel(false)}
        />
      )}

      {pendingVoiceTask && (
        <VoiceTaskConfirmModal
          task={pendingVoiceTask}
          loading={voiceSaving}
          onConfirm={() => void confirmVoiceTask()}
          onCancel={() => setPendingVoiceTask(null)}
        />
      )}

      <ScheduleReflectionModal
        reflection={pendingReflection}
        open={reflectModalOpen}
        applying={reflectingSchedule}
        onConfirm={() => void confirmScheduleReflection()}
        onCancel={() => {
          setReflectModalOpen(false);
          setPendingReflection(null);
        }}
      />

      {reflectNotice && (
        <div
          style={{
            position: "fixed",
            bottom: 100,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10001,
            background: "#4a6741",
            color: "#f5f0e8",
            padding: "10px 16px",
            borderRadius: 12,
            fontSize: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            maxWidth: "90%",
            textAlign: "center",
          }}
        >
          {reflectNotice}
        </div>
      )}

      <PwaInstallGuideModal open={showPwaGuide} onClose={() => setShowPwaGuide(false)} />

      <BinauralGlobalAlarm />

      <RadioMiniPlayer />

      {/* ボトムナビ（モバイル） */}
      <div className="app-bottom-nav" style={themeNavStyle}>
        {[
          { key: "home", icon: "🏠", labelKey: "tabs.home" },
          { key: "chat", icon: "💬", labelKey: "tabs.chat" },
          { key: "sound", icon: "🎵", labelKey: "tabs.sound" },
          { key: "history", icon: "📋", labelKey: "tabs.history" },
          { key: "display", icon: "", labelKey: "tabs.display" },
          { key: "settings", icon: "⚙️", labelKey: "tabs.settings" },
        ].map(item => (
          <button key={item.key} onClick={() => setTab(item.key as Tab)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0 12px", gap: 4, cursor: "pointer", border: "none", background: "none",
            color: tab === item.key ? "var(--t-nav-active)" : "var(--t-nav-inactive)", fontSize: "var(--t-font-size-sm)", fontFamily: "var(--t-font-family)"
          }}>
            {item.icon ? <div style={{ fontSize: 20 }}>{item.icon}</div> : null}
            {t(item.labelKey)}
          </button>
        ))}
      </div>
      </div>
    </div>
  );
}
