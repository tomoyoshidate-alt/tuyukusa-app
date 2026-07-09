import type { LifestyleKnowledge } from "../chatKnowledge";
import type { PollenLevel, WeatherSnapshot } from "../environment/types";
import { POLLEN_LEVEL_LABELS } from "../environment/types";
import type { TraitsLocation, UserTraits } from "../traits";

export type BriefingTaskItem = {
  text: string;
  time?: string;
  category?: string;
};

export type BriefingScheduleItem = {
  time: string;
  label: string;
  sub?: string;
};

export type BriefingClientContext = {
  displayName?: string;
  location: TraitsLocation;
  traits?: Pick<UserTraits, "constitution">;
  lifestyle?: LifestyleKnowledge;
  todayTasks?: BriefingTaskItem[];
  todaySchedule?: BriefingScheduleItem[];
};

export type BriefingEnvironmentData = {
  weather: WeatherSnapshot;
  pollenLevel: PollenLevel;
};

const DEPARTURE_PREP_ITEMS = ["財布", "鍵", "スマホ", "薬", "マスク", "身分証"];

function formatLifestyle(lifestyle: LifestyleKnowledge | undefined): string {
  if (!lifestyle) return "生活リズム設定: 未設定";
  const lines: string[] = [];
  if (lifestyle.wake) lines.push(`起床: ${lifestyle.wake}`);
  if (lifestyle.dinner) lines.push(`食事（夕）: ${lifestyle.dinner}`);
  if (lifestyle.bath) lines.push(`入浴: ${lifestyle.bath}`);
  if (lifestyle.bedtime) lines.push(`就寝: ${lifestyle.bedtime}`);
  if (lifestyle.sleepDuration) lines.push(`睡眠時間: ${lifestyle.sleepDuration}`);
  return lines.length ? lines.join("\n") : "生活リズム設定: 未設定";
}

function formatTasks(tasks: BriefingTaskItem[] | undefined): string {
  if (!tasks?.length) return "本日のタスク: なし";
  return tasks.map(t => (t.time ? `- ${t.time} ${t.text}` : `- ${t.text}`)).join("\n");
}

function formatSchedule(schedule: BriefingScheduleItem[] | undefined): string {
  if (!schedule?.length) return "本日の予定: なし";
  return schedule.map(s => `- ${s.time} ${s.label}${s.sub ? `（${s.sub}）` : ""}`).join("\n");
}

function detectTaskOverload(tasks: BriefingTaskItem[] | undefined): boolean {
  return (tasks?.length ?? 0) >= 5;
}

function weatherSummary(env: BriefingEnvironmentData): string {
  return [
    `気温: ${env.weather.temperature}℃`,
    `湿度: ${env.weather.humidity}%`,
    `風速: ${env.weather.windSpeed}m/s`,
    `降水: ${env.weather.precipitation}mm`,
  ].join(" / ");
}

export function buildBriefingDataContext(
  moduleId: string,
  ctx: BriefingClientContext,
  env: BriefingEnvironmentData
): string {
  const sections: string[] = [`【モジュール】${moduleId}`];

  if (ctx.displayName) sections.push(`【ユーザー】${ctx.displayName}`);
  sections.push(`【地域】${ctx.location.city}（${ctx.location.lat}, ${ctx.location.lon}）`);

  switch (moduleId) {
    case "date-general-v1":
      sections.push(`【生活リズム】\n${formatLifestyle(ctx.lifestyle)}`);
      sections.push(`【本日のタスク】\n${formatTasks(ctx.todayTasks)}`);
      break;

    case "date-adhd-v1": {
      sections.push(`【本日のタスク】\n${formatTasks(ctx.todayTasks)}`);
      sections.push(`【本日の予定（おでかけ含む）】\n${formatSchedule(ctx.todaySchedule)}`);
      if (detectTaskOverload(ctx.todayTasks)) {
        sections.push("【注意】タスクが5件以上あり、過多の可能性があります。優先1〜3件への絞り込みを提案してください。");
      }
      sections.push(`【出発前チェックリスト候補】${DEPARTURE_PREP_ITEMS.join("、")}`);
      break;
    }

    case "date-kafun-v1":
      sections.push(`【天気】${weatherSummary(env)}`);
      sections.push(`【花粉推定】${POLLEN_LEVEL_LABELS[env.pollenLevel]}（${env.pollenLevel}）`);
      if (ctx.traits?.constitution) {
        sections.push(`【体質メモ】${ctx.traits.constitution}`);
      }
      break;

    default:
      sections.push(`【生活リズム】\n${formatLifestyle(ctx.lifestyle)}`);
      sections.push(`【本日のタスク】\n${formatTasks(ctx.todayTasks)}`);
  }

  return sections.join("\n\n");
}

export const BRIEFING_GENERATION_INSTRUCTION = `ともせんせいとして、穏やかに・押し付けず・具体的に。
挨拶1行＋今日のポイント2〜3個＋ひとこと養生。
「たい・いい」の言葉づかいで、命令形は使わない。絵文字は最大2個。
300字以内の日本語で。`;
