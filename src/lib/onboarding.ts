import type { LifestyleKnowledge } from "./chatKnowledge";

export const ONBOARDING_WELCOME_MESSAGE = `こんにちは。
「つゆくさアプリ」です。
このアプリは、あなたが
実現したい生活リズムの
サポートと健康相談が
できるアプリです。`;

export const ONBOARDING_GOAL_FREE_LABEL = "④ 自由に入力する";

export const ONBOARDING_GOAL_CHOICES = [
  "① 睡眠の質を上げたい",
  "② 集中力を高めたい",
  "③ 心身を整えたい",
  ONBOARDING_GOAL_FREE_LABEL,
];

export type OnboardingStep =
  | "welcome"
  | "birthdate"
  | "gender"
  | "goal"
  | "name"
  | "return_home"
  | "dinner"
  | "bath"
  | "wake"
  | "proposal";

export type OnboardingFlowData = LifestyleKnowledge & {
  birthDate?: string;
  gender?: string;
  name?: string;
  nickname?: string;
};

export const GENDER_CHOICES = ["男性", "女性", "回答しない"] as const;

export function parseOnboardingGoalChoice(choice: string): string | null {
  if (choice === ONBOARDING_GOAL_FREE_LABEL || choice === "💬 自由に入力する" || choice.includes("自由に入力")) return null;
  const numbered = choice.match(/^[①②③④]\s*(.+)$/);
  if (numbered) return numbered[1].trim() || null;
  return choice.trim() || null;
}

export const ONBOARDING_LIFESTYLE_STEPS: Record<
  Exclude<OnboardingStep, "welcome" | "birthdate" | "gender" | "goal" | "name" | "proposal">,
  { question: string; choices: string[]; field: keyof OnboardingFlowData; hint: string; next: OnboardingStep }
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

export function buildOnboardingProposalPrompt(data: OnboardingFlowData): string {
  return [
    "【初回問診】以下の情報をもとに、漢方・養生（気血水・陰陽・塩清療法）の観点からアドバイスを交え、最適な1日のスケジュールを提案してください。",
    "",
    `・生年月日: ${data.birthDate ?? "未設定"}`,
    `・性別: ${data.gender ?? "未設定"}`,
    `・お名前: ${data.nickname ?? data.name ?? "未設定"}`,
    `・実現したい生活: ${data.goal ?? "未設定"}`,
    `・帰宅時間: ${data.returnHome ?? "未設定"}`,
    `・夕食時間: ${data.dinner ?? "未設定"}`,
    `・入浴時間: ${data.bath ?? "未設定"}`,
    `・起床時間: ${data.wake ?? "未設定"}`,
    "",
    "起床・朝食・塩湯・夕食・入浴・就寝前塩湯・就寝の時刻を含め、",
    "最終的にREFLECT_SCHEDULE形式のJSONで5〜7項目返してください（ユーザーが反映できるように）。",
  ].join("\n");
}
