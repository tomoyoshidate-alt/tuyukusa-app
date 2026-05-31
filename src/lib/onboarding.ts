import type { LifestyleKnowledge } from "./chatKnowledge";

export const ONBOARDING_WELCOME_MESSAGE = `こんにちは。
「つゆくさアプリ」です。
このアプリは、あなたが
実現したい生活リズムの
サポートと健康相談が
できるアプリです。`;

export const ONBOARDING_GOAL_FREE_LABEL = "自由に入力する";

export const ONBOARDING_GOAL_CHOICES = [
  "睡眠の質を上げたい",
  "集中力を高めたい",
  "心身を整えたい",
  ONBOARDING_GOAL_FREE_LABEL,
];

export type OnboardingStep =
  | "welcome"
  | "birthdate"
  | "gender"
  | "goal"
  | "name"
  | "bedtime"
  | "wake"
  | "bath"
  | "sleep_duration"
  | "proposal";

export type OnboardingFlowData = LifestyleKnowledge & {
  birthDate?: string;
  gender?: string;
  name?: string;
  nickname?: string;
};

export const GENDER_CHOICES = ["男性", "女性", "回答しない"] as const;

export const ONBOARDING_BEDTIME_CHOICES = [
  "21時",
  "22時",
  "23時",
  "24時",
  "1時",
  "2時以降",
  "不規則",
] as const;

export const ONBOARDING_WAKE_CHOICES = [
  "4時",
  "5時",
  "6時",
  "7時",
  "8時",
  "9時",
  "10時以降",
  "不規則",
] as const;

export const ONBOARDING_BATH_CHOICES = [
  "17時",
  "18時",
  "19時",
  "20時",
  "21時",
  "22時以降",
  "朝シャワー派",
  "入浴しない",
] as const;

export const ONBOARDING_SLEEP_DURATION_CHOICES = [
  "5時間",
  "6時間",
  "7時間",
  "8時間",
  "8時間以上",
] as const;

export const ONBOARDING_TIME_DETAIL_LATER = "詳細な時刻は後ほど一緒に決めていきましょう。";

export function parseOnboardingGoalChoice(choice: string): string | null {
  if (choice === ONBOARDING_GOAL_FREE_LABEL || choice.includes("自由に入力")) return null;
  return choice.trim() || null;
}

export const ONBOARDING_LIFESTYLE_STEPS: Record<
  Exclude<OnboardingStep, "welcome" | "birthdate" | "gender" | "goal" | "name" | "proposal">,
  { question: string; choices: string[]; field: keyof OnboardingFlowData; next: OnboardingStep }
> = {
  bedtime: {
    question: "就寝時間はいつ頃が理想ですか？",
    choices: [...ONBOARDING_BEDTIME_CHOICES],
    field: "bedtime",
    next: "wake",
  },
  wake: {
    question: "起床時間はいつ頃が理想ですか？",
    choices: [...ONBOARDING_WAKE_CHOICES],
    field: "wake",
    next: "bath",
  },
  bath: {
    question: "入浴は何時頃が理想ですか？",
    choices: [...ONBOARDING_BATH_CHOICES],
    field: "bath",
    next: "sleep_duration",
  },
  sleep_duration: {
    question: "睡眠時間はどのくらい取りたいですか？",
    choices: [...ONBOARDING_SLEEP_DURATION_CHOICES],
    field: "sleepDuration",
    next: "proposal",
  },
};

export function buildOnboardingProposalPrompt(data: OnboardingFlowData): string {
  return [
    "【初回問診】以下の情報をもとに、漢方・養生（気血水・陰陽・塩清療法）の観点からアドバイスを交え、最適な1日のスケジュールを提案してください。",
    "",
    `・生年月日: ${data.birthDate ?? "未設定"}`,
    `・性別: ${data.gender ?? "未設定"}`,
    `・お名前: ${data.nickname ?? data.name ?? "未設定"}`,
    `・実現したい生活: ${data.goal ?? "未設定"}`,
    `・就寝時間: ${data.bedtime ?? "未設定"}`,
    `・起床時間: ${data.wake ?? "未設定"}`,
    `・入浴時間: ${data.bath ?? "未設定"}`,
    `・睡眠時間: ${data.sleepDuration ?? "未設定"}`,
    "",
    "起床・朝食・塩湯・夕食・入浴・就寝前塩湯・就寝の時刻を含め、",
    "最終的にREFLECT_SCHEDULE形式のJSONで5〜7項目返してください（ユーザーが反映できるように）。",
  ].join("\n");
}
