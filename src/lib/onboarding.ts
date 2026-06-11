import type { LifestyleKnowledge } from "./chatKnowledge";

export const ONBOARDING_WELCOME_MESSAGE = `こんにちは。
「つゆくさアプリ」です。
このアプリは、あなたが
実現したい生活リズムの
サポートと健康相談が
できるアプリです。`;

export const ONBOARDING_GOAL_FREE_LABEL = "自由に入力する";

export const ONBOARDING_BIRTHDATE_CHOICES = [
  "1960年以前",
  "1960〜1979年",
  "1980〜1999年",
  "2000年以降",
  ONBOARDING_GOAL_FREE_LABEL,
] as const;

export const ONBOARDING_HOBBIES_CHOICES = [
  "運動",
  "音楽・映画",
  "読書",
  "創作",
  "自然・散歩",
  ONBOARDING_GOAL_FREE_LABEL,
] as const;

export const ONBOARDING_MEAL_VALUES_CHOICES = [
  "栄養バランス",
  "量を控えめに",
  "旬のもの",
  "特にない",
  ONBOARDING_GOAL_FREE_LABEL,
] as const;

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
  | "course"
  | "name"
  | "bedtime"
  | "wake"
  | "weekday_wake"
  | "weekday_bedtime"
  | "weekend_wake"
  | "weekend_bedtime"
  | "bath"
  | "sleep_duration"
  | "hobbies"
  | "time_balance"
  | "alcohol"
  | "meal_breakfast"
  | "meal_lunch"
  | "meal_dinner"
  | "meal_values"
  | "proposal";

export type QuestionnaireCourse = "short" | "standard" | "detailed";

export type OnboardingFlowData = LifestyleKnowledge & {
  birthDate?: string;
  gender?: string;
  name?: string;
  nickname?: string;
  questionnaireCourse?: QuestionnaireCourse;
  weekdayWake?: string;
  weekdayBedtime?: string;
  weekendWake?: string;
  weekendBedtime?: string;
  hobbies?: string;
  timeBalance?: string;
  alcohol?: string;
  mealBreakfast?: string;
  mealLunch?: string;
  mealDinner?: string;
  mealValues?: string;
};

export const GENDER_CHOICES = ["男性", "女性", "回答しない"] as const;

export const ONBOARDING_BEDTIME_CHOICES = [
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
  "23:30",
  "24:00",
  "それ以降",
] as const;

export const ONBOARDING_WAKE_CHOICES = [
  "5:00",
  "5:30",
  "6:00",
  "6:30",
  "7:00",
  "7:30",
  "8:00",
  "それ以降",
] as const;

export const ONBOARDING_BATH_CHOICES = [
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "朝シャワー派",
] as const;

export const ONBOARDING_SLEEP_DURATION_CHOICES = [
  "4時間",
  "4.5時間",
  "5時間",
  "5.5時間",
  "6時間",
  "6.5時間",
  "7時間",
  "7.5時間",
  "8時間",
  "8.5時間",
  "9時間",
  "10時間以上",
] as const;

export const ONBOARDING_MEAL_PORTION_CHOICES = ["軽め", "普通", "しっかり"] as const;

export const ONBOARDING_ALCOHOL_CHOICES = [
  "飲まない",
  "週1〜2回（1合未満）",
  "週1〜2回（1〜2合）",
  "週3回以上",
] as const;

export const ONBOARDING_TIME_BALANCE_CHOICES = [
  "一人の時間を大切にしたい",
  "人と過ごす時間を大切にしたい",
  "バランスよく両方ほしい",
] as const;

export function isOnboardingFreeInputChoice(choice: string): boolean {
  return choice === ONBOARDING_GOAL_FREE_LABEL || choice.includes("自由に入力");
}

export function parseOnboardingGoalChoice(choice: string): string | null {
  if (isOnboardingFreeInputChoice(choice)) return null;
  return choice.trim() || null;
}

export function getOnboardingStepChoices(step: OnboardingStep): string[] {
  switch (step) {
    case "goal":
      return [...ONBOARDING_GOAL_CHOICES];
    case "birthdate":
      return [...ONBOARDING_BIRTHDATE_CHOICES];
    case "gender":
      return [...GENDER_CHOICES];
    case "name":
      return [];
    case "bedtime":
      return [...ONBOARDING_BEDTIME_CHOICES];
    case "wake":
      return [...ONBOARDING_WAKE_CHOICES];
    case "bath":
      return [...ONBOARDING_BATH_CHOICES];
    case "sleep_duration":
      return [...ONBOARDING_SLEEP_DURATION_CHOICES];
    case "hobbies":
      return [...ONBOARDING_HOBBIES_CHOICES];
    case "time_balance":
      return [...ONBOARDING_TIME_BALANCE_CHOICES];
    case "alcohol":
      return [...ONBOARDING_ALCOHOL_CHOICES];
    case "meal_breakfast":
    case "meal_lunch":
    case "meal_dinner":
      return [...ONBOARDING_MEAL_PORTION_CHOICES];
    case "meal_values":
      return [...ONBOARDING_MEAL_VALUES_CHOICES];
    default:
      return [];
  }
}

export function getOnboardingFreeInputHint(step: OnboardingStep): string {
  switch (step) {
    case "goal":
      return "実現したい生活を自由にお書きください。";
    case "birthdate":
      return "生年月日を教えてください。（例：1980年5月15日）";
    case "hobbies":
      return "趣味や、好きな時間の過ごし方を自由にお書きください。";
    case "meal_values":
      return "食事で大切にしていることを自由にお書きください。";
    default:
      return "自由にお書きください。";
  }
}

export type OnboardingLifestyleStep = "goal" | "bedtime" | "wake" | "bath" | "sleep_duration";

export const ONBOARDING_STEPS_AFTER_GOAL: OnboardingStep[] = ["birthdate", "gender", "course", "name"];

export const ONBOARDING_LIFESTYLE_STEPS: Record<
  OnboardingLifestyleStep,
  { question: string; choices: string[]; field: keyof OnboardingFlowData; next: OnboardingStep | "proposal" }
> = {
  goal: {
    question: "",
    choices: [...ONBOARDING_GOAL_CHOICES],
    field: "goal",
    next: "bedtime",
  },
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

export function isOnboardingLifestyleStep(step: OnboardingStep): step is OnboardingLifestyleStep {
  return step in ONBOARDING_LIFESTYLE_STEPS;
}

export function getLifestyleChainNext(fromStep: OnboardingLifestyleStep): OnboardingStep | "proposal" {
  return ONBOARDING_LIFESTYLE_STEPS[fromStep].next;
}

export function buildOnboardingProposalPrompt(data: OnboardingFlowData): string {
  const lines = [
    "【初回問診】以下の情報をもとに、漢方・養生（気血水・陰陽・塩清療法）の観点からアドバイスを交え、最適な1日のスケジュールを提案してください。",
    "",
    `・生年月日: ${data.birthDate ?? "未設定"}`,
    `・性別: ${data.gender ?? "未設定"}`,
    `・お名前: ${data.nickname ?? data.name ?? "未設定"}`,
    `・問診コース: ${data.questionnaireCourse ?? "未設定"}`,
    `・実現したい生活: ${data.goal ?? "未設定"}`,
    `・就寝時間: ${data.bedtime ?? data.weekdayBedtime ?? "未設定"}`,
    `・起床時間: ${data.wake ?? data.weekdayWake ?? "未設定"}`,
    `・入浴時間: ${data.bath ?? "未設定"}`,
    `・睡眠時間: ${data.sleepDuration ?? "未設定"}`,
  ];
  if (data.weekdayWake || data.weekdayBedtime) {
    lines.push(`・仕事日 起床/就寝: ${data.weekdayWake ?? "未設定"} / ${data.weekdayBedtime ?? "未設定"}`);
  }
  if (data.weekendWake || data.weekendBedtime) {
    lines.push(`・休日 起床/就寝: ${data.weekendWake ?? "未設定"} / ${data.weekendBedtime ?? "未設定"}`);
  }
  if (data.hobbies) lines.push(`・趣味・好きな過ごし方: ${data.hobbies}`);
  if (data.timeBalance) lines.push(`・一人/人との時間: ${data.timeBalance}`);
  if (data.alcohol) lines.push(`・お酒: ${data.alcohol}`);
  if (data.mealBreakfast || data.mealLunch || data.mealDinner) {
    lines.push(`・食事量 朝/昼/夕: ${data.mealBreakfast ?? "-"} / ${data.mealLunch ?? "-"} / ${data.mealDinner ?? "-"}`);
  }
  if (data.mealValues) lines.push(`・食事で大切にしていること: ${data.mealValues}`);
  lines.push("", "起床・朝食・塩湯・夕食・入浴・就寝前塩湯・就寝の時刻を含め、", "最終的にREFLECT_SCHEDULE形式のJSONで5〜7項目返してください（ユーザーが反映できるように）。");
  return lines.join("\n");
}
