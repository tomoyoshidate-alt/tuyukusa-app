/**
 * 生活リズム設計（逆算プラン）＋アラート設定。
 * ひとつの目標（例：8:12の電車に乗る）に対して、
 * 出発前ルーチン・駅までの所要時間から逆算したモーニングプランと、
 * 前夜の持ち物準備・塩湯・就寝前バイノーラルの夜プランを組み立て、
 * それぞれの時刻にアラート（通知）を登録する。
 */

import { registerTodayScheduleAlarms } from "./scheduleAlarms";

export type RoutineItem = {
  id: string;
  label: string;
  minutes: number;
};

export type RhythmPlan = {
  /** 目標の言葉（例：8:12の電車に乗る） */
  goalLabel: string;
  /** 電車・バス・到着などの締切時刻 "8:12" */
  targetTime: string;
  /** 駅（目的地）までの所要分 */
  stationMinutes: number;
  /** 移動手段（徒歩・自転車・バス・車） */
  stationMode: string;
  /** 余裕（分）。ADHD向けには5分前行動を既定に */
  bufferMinutes: number;
  /** 出発前ルーチン（順に実行） */
  routines: RoutineItem[];
  /** 前夜に用意する持ち物リスト（テンプレとして保存） */
  checklist: string[];
  /** 前夜の持ち物準備アラート時刻 "21:30" */
  checklistTime: string;
  /** 塩湯（起床後）時刻。undefined なら設定しない */
  saltMorningTime?: string;
  /** 塩湯（就寝前）時刻。undefined なら設定しない */
  saltNightTime?: string;
  /** 就寝前バイノーラルビート開始時刻。undefined なら設定しない */
  binauralTime?: string;
  updatedAt: number;
};

export const RHYTHM_PLAN_STORAGE_KEY = "tuyukusa-rhythm-plan";
const RHYTHM_PLAN_REGISTERED_KEY = "tuyukusa-rhythm-plan-registered-day";
export const NIGHT_CHECKLIST_STORAGE_KEY = "tuyukusa-night-checklist";

/* ---------- 時刻ユーティリティ ---------- */

export function timeStringToMinutes(time: string): number | null {
  const m = time.trim().match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function minutesToTimeString(total: number): string {
  const norm = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

/** 自由記載やオンボーディングの選択肢から "H:MM" を拾う（例「23:00頃」→"23:00"） */
export function extractTime(text: string | undefined): string | null {
  if (!text) return null;
  const m = text.match(/(\d{1,2}):(\d{2})/);
  return m ? `${parseInt(m[1], 10)}:${m[2]}` : null;
}

/* ---------- 既定値 ---------- */

export const DEFAULT_ROUTINES: RoutineItem[] = [
  { id: "r-wash", label: "洗顔・トイレ", minutes: 10 },
  { id: "r-dress", label: "着替え・身支度", minutes: 10 },
  { id: "r-breakfast", label: "朝ごはん", minutes: 15 },
  { id: "r-teeth", label: "歯みがき", minutes: 5 },
  { id: "r-check", label: "持ち物の最終チェック", minutes: 3 },
];

export const DEFAULT_CHECKLIST: string[] = [
  "財布",
  "鍵",
  "スマホ・充電器",
  "定期券・ICカード",
  "飲み物（水筒）",
  "ハンカチ・ティッシュ",
];

export const STATION_MODES = ["徒歩", "自転車", "バス", "車"] as const;

/** 体質（心理テストの診断）に合わせた塩湯スケジュールのおすすめ */
export function recommendSaltSchedule(
  psychResult: string | undefined,
  wakeTime: string | null,
  bedtime: string | null,
): { morning?: string; night?: string; note: string } {
  const wake = wakeTime ?? "7:00";
  const bed = bedtime ?? "23:00";
  const wakeM = timeStringToMinutes(wake) ?? 7 * 60;
  const bedM = timeStringToMinutes(bed) ?? 23 * 60;
  const morning = minutesToTimeString(wakeM + 10);
  const night = minutesToTimeString(bedM - 30);
  const r = psychResult ?? "";
  if (r.includes("水滞")) {
    return {
      night,
      note: "水滞タイプは、就寝前の塩湯（自然塩3g）で余分な水を動かすのがおすすめです。",
    };
  }
  if (r.includes("気虚")) {
    return {
      morning,
      night,
      note: "気虚タイプは、朝の塩湯で内側から温めてエネルギーを補い、就寝前にも一杯どうぞ。",
    };
  }
  if (r.includes("血熱") || r.includes("肝")) {
    return {
      morning,
      note: "高ぶりやすいタイプは、朝の塩湯で一日を静かに立ち上げるのがおすすめです。",
    };
  }
  return {
    morning,
    night,
    note: "起床後と就寝前の塩湯で、一日のはじまりと終わりを整えましょう。",
  };
}

/* ---------- 逆算タイムライン ---------- */

export type TimelineItem = { time: string; label: string; sub?: string };

/** 目標時刻から逆算した朝のタイムライン（ルーチン開始→出発→目標） */
export function computeMorningTimeline(plan: RhythmPlan): TimelineItem[] {
  const target = timeStringToMinutes(plan.targetTime);
  if (target === null) return [];
  const leave = target - plan.stationMinutes - plan.bufferMinutes;
  const items: TimelineItem[] = [];
  let cursor = leave;
  for (let i = plan.routines.length - 1; i >= 0; i--) {
    cursor -= plan.routines[i].minutes;
  }
  for (const routine of plan.routines) {
    items.push({
      time: minutesToTimeString(cursor),
      label: routine.label,
      sub: `${routine.minutes}分・次の予定に間に合うペースです`,
    });
    cursor += routine.minutes;
  }
  items.push({
    time: minutesToTimeString(leave),
    label: "🏠 出発の時間です",
    sub: `${plan.stationMode}${plan.stationMinutes}分＋余裕${plan.bufferMinutes}分で「${plan.goalLabel}」に間に合います`,
  });
  return items;
}

/** 夜のプラン（前夜準備・塩湯・バイノーラル） */
export function computeEveningItems(plan: RhythmPlan): TimelineItem[] {
  const items: TimelineItem[] = [];
  if (plan.checklistTime) {
    items.push({
      time: plan.checklistTime,
      label: "🎒 明日の持ち物を用意",
      sub: plan.checklist.join("・"),
    });
  }
  if (plan.saltMorningTime) {
    items.push({
      time: plan.saltMorningTime,
      label: "🧂 塩湯の時間（起床後）",
      sub: "自然塩3gをお湯に溶かして、ゆっくりどうぞ",
    });
  }
  if (plan.saltNightTime) {
    items.push({
      time: plan.saltNightTime,
      label: "🧂 塩湯の時間（就寝前）",
      sub: "自然塩3gをお湯に溶かして、ゆっくりどうぞ",
    });
  }
  if (plan.binauralTime) {
    items.push({
      time: plan.binauralTime,
      label: "🌙 おやすみバイノーラルの時間",
      sub: "アプリのバイノーラルで「ねむり」プリセットを再生しましょう",
    });
  }
  return items;
}

export function computeAllAlarmItems(plan: RhythmPlan): TimelineItem[] {
  const all = [...computeMorningTimeline(plan), ...computeEveningItems(plan)];
  return all
    .filter(item => timeStringToMinutes(item.time) !== null)
    .sort((a, b) => (timeStringToMinutes(a.time) ?? 0) - (timeStringToMinutes(b.time) ?? 0));
}

export function buildPlanSummary(plan: RhythmPlan): string {
  const lines: string[] = [`【目標】${plan.goalLabel}（${plan.targetTime}）`];
  const timeline = computeMorningTimeline(plan);
  if (timeline.length) {
    lines.push("", "＜朝の逆算プラン＞");
    for (const item of timeline) lines.push(`${item.time} ${item.label}`);
  }
  const evening = computeEveningItems(plan);
  if (evening.length) {
    lines.push("", "＜夜と養生のプラン＞");
    for (const item of evening) lines.push(`${item.time} ${item.label}`);
  }
  lines.push("", "毎日この時刻にアラートでお知らせします。（アプリを開いた日に自動セットされます）");
  return lines.join("\n");
}

/* ---------- 保存・読み込み ---------- */

export function saveRhythmPlan(plan: RhythmPlan): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RHYTHM_PLAN_STORAGE_KEY, JSON.stringify(plan));
    // 持ち物リストはテンプレとして単独でも保存（他機能から再利用できるように）
    localStorage.setItem(NIGHT_CHECKLIST_STORAGE_KEY, JSON.stringify(plan.checklist));
  } catch {
    /* ignore */
  }
}

export function loadRhythmPlan(): RhythmPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RHYTHM_PLAN_STORAGE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<RhythmPlan>;
    if (!d || typeof d !== "object" || typeof d.targetTime !== "string") return null;
    return {
      goalLabel: typeof d.goalLabel === "string" ? d.goalLabel : "目標",
      targetTime: d.targetTime,
      stationMinutes: typeof d.stationMinutes === "number" ? d.stationMinutes : 10,
      stationMode: typeof d.stationMode === "string" ? d.stationMode : "徒歩",
      bufferMinutes: typeof d.bufferMinutes === "number" ? d.bufferMinutes : 5,
      routines: Array.isArray(d.routines)
        ? d.routines.filter(
            (r): r is RoutineItem =>
              !!r && typeof r === "object" && typeof (r as RoutineItem).label === "string" && typeof (r as RoutineItem).minutes === "number",
          )
        : [],
      checklist: Array.isArray(d.checklist) ? d.checklist.filter((c): c is string => typeof c === "string") : [],
      checklistTime: typeof d.checklistTime === "string" ? d.checklistTime : "21:30",
      saltMorningTime: typeof d.saltMorningTime === "string" ? d.saltMorningTime : undefined,
      saltNightTime: typeof d.saltNightTime === "string" ? d.saltNightTime : undefined,
      binauralTime: typeof d.binauralTime === "string" ? d.binauralTime : undefined,
      updatedAt: typeof d.updatedAt === "number" ? d.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

/* ---------- アラート登録 ---------- */

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** プランのアラートを今日の分だけ登録する（過去時刻はスキップ） */
export async function registerRhythmPlanAlarms(plan: RhythmPlan): Promise<number> {
  const items = computeAllAlarmItems(plan).map(item => ({
    time: item.time,
    label: item.label,
    sub: item.sub,
  }));
  const count = await registerTodayScheduleAlarms(items);
  try {
    localStorage.setItem(RHYTHM_PLAN_REGISTERED_KEY, todayKey());
  } catch {
    /* ignore */
  }
  return count;
}

/** アプリ起動時に1日1回、保存済みプランのアラートを再登録する */
export async function registerRhythmPlanAlarmsForToday(): Promise<void> {
  if (typeof window === "undefined") return;
  const plan = loadRhythmPlan();
  if (!plan) return;
  try {
    if (localStorage.getItem(RHYTHM_PLAN_REGISTERED_KEY) === todayKey()) return;
  } catch {
    /* ignore */
  }
  if (typeof Notification !== "undefined" && Notification.permission !== "granted") return;
  await registerRhythmPlanAlarms(plan);
}
