import type { OnboardingFlowData, OnboardingStep } from "./onboarding";
import {
  ONBOARDING_ALCOHOL_CHOICES,
  ONBOARDING_BATH_CHOICES,
  ONBOARDING_BEDTIME_CHOICES,
  ONBOARDING_HOBBIES_CHOICES,
  ONBOARDING_MEAL_PORTION_CHOICES,
  ONBOARDING_MEAL_VALUES_CHOICES,
  ONBOARDING_SLEEP_DURATION_CHOICES,
  ONBOARDING_TIME_BALANCE_CHOICES,
  ONBOARDING_WAKE_CHOICES,
} from "./onboarding";

export type QuestionnaireCourse = "short" | "standard" | "detailed";

export const ONBOARDING_COURSE_STORAGE_KEY = "tuyukusa-onboarding-course";

export const ONBOARDING_COURSE_CHOICES: Record<QuestionnaireCourse, { label: string; description: string }> = {
  short: { label: "5問程度（約2分）", description: "シンプルな基本リズムを設定します" },
  standard: {
    label: "15問程度（約10分）",
    description: "休日と仕事の日の違いも設定。\nGoogleカレンダー・Supabase連携も含みます",
  },
  detailed: {
    label: "30問程度（約30分）",
    description: "趣味・食事・人間関係まで含む綿密な設定。\nNotion・Asana・Slack連携も含みます",
  },
};

export function formatCourseChoice(course: QuestionnaireCourse): string {
  const item = ONBOARDING_COURSE_CHOICES[course];
  return `${item.label}\n${item.description}`;
}

export function getCourseChoiceLabels(): string[] {
  return (["short", "standard", "detailed"] as const).map(formatCourseChoice);
}

export function parseCourseChoice(text: string): QuestionnaireCourse | null {
  const trimmed = text.trim();
  if (trimmed.startsWith("5問程度")) return "short";
  if (trimmed.startsWith("15問程度")) return "standard";
  if (trimmed.startsWith("30問程度")) return "detailed";
  return null;
}

export function saveQuestionnaireCourse(course: QuestionnaireCourse): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_COURSE_STORAGE_KEY, course);
  } catch {
    /* ignore */
  }
}

export function loadQuestionnaireCourse(): QuestionnaireCourse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ONBOARDING_COURSE_STORAGE_KEY);
    if (raw === "short" || raw === "standard" || raw === "detailed") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function getEffectiveCourse(flowData: OnboardingFlowData): QuestionnaireCourse | null {
  return flowData.questionnaireCourse ?? loadQuestionnaireCourse();
}

const BASE_QUESTION_ORDER: OnboardingStep[] = ["goal", "birthdate", "gender", "course", "name"];
const SHORT_LIFESTYLE_STEPS: OnboardingStep[] = ["bedtime", "wake", "bath", "sleep_duration"];
const EXTENDED_LIFESTYLE_STEPS: OnboardingStep[] = [
  "weekday_wake", "weekday_bedtime", "weekend_wake", "weekend_bedtime", "bath", "sleep_duration",
  "hobbies", "time_balance", "alcohol", "meal_breakfast", "meal_lunch", "meal_dinner", "meal_values",
];

export function getQuestionOrder(course: QuestionnaireCourse | null | undefined): OnboardingStep[] {
  if (!course || course === "short") return [...BASE_QUESTION_ORDER, ...SHORT_LIFESTYLE_STEPS];
  return [...BASE_QUESTION_ORDER, ...EXTENDED_LIFESTYLE_STEPS];
}

export function getNextStepInCourse(fromStep: OnboardingStep, flowData: OnboardingFlowData): OnboardingStep | "proposal" {
  const order = getQuestionOrder(getEffectiveCourse(flowData));
  const idx = order.indexOf(fromStep);
  if (idx < 0) return "proposal";
  for (let i = idx + 1; i < order.length; i++) return order[i];
  return "proposal";
}

export const ONBOARDING_KNOWLEDGE_TIPS: Partial<Record<OnboardingStep, string>> = {
  sleep_duration:
    "理想の睡眠時間は年齢や体質によって異なります。22時〜2時は深い眠りにつきやすい時間帯です。",
  bath: "就寝90〜120分前の入浴は、深部体温が下がるタイミングで自然な眠気を促します。",
  meal_dinner: "東洋医学では朝食をしっかり、夕食は軽めにする「朝主夕従」が基本です。",
  meal_values: "食事のこだわりは、続けやすい生活リズムづくりの大切なヒントになります。",
  alcohol: "アルコールは入眠を早めますが、睡眠後半を浅くしやすいです。就寝3時間前までが理想です。",
};

export function getOnboardingKnowledgeTip(step: OnboardingStep): string | null {
  return ONBOARDING_KNOWLEDGE_TIPS[step] ?? null;
}

type StepConfig = { question: string; choices: string[]; field: keyof OnboardingFlowData };

export function getStructuredStepConfig(step: OnboardingStep): StepConfig | null {
  switch (step) {
    case "bedtime":
      return { question: "就寝時間はいつ頃が理想ですか？", choices: [...ONBOARDING_BEDTIME_CHOICES], field: "bedtime" };
    case "wake":
      return { question: "起床時間はいつ頃が理想ですか？", choices: [...ONBOARDING_WAKE_CHOICES], field: "wake" };
    case "weekday_wake":
      return { question: "仕事の日の起床時間はいつ頃が理想ですか？", choices: [...ONBOARDING_WAKE_CHOICES], field: "weekdayWake" };
    case "weekday_bedtime":
      return { question: "仕事の日の就寝時間はいつ頃が理想ですか？", choices: [...ONBOARDING_BEDTIME_CHOICES], field: "weekdayBedtime" };
    case "weekend_wake":
      return { question: "休日の起床時間はいつ頃が理想ですか？", choices: [...ONBOARDING_WAKE_CHOICES], field: "weekendWake" };
    case "weekend_bedtime":
      return { question: "休日の就寝時間はいつ頃が理想ですか？", choices: [...ONBOARDING_BEDTIME_CHOICES], field: "weekendBedtime" };
    case "bath":
      return { question: "入浴は何時頃が理想ですか？", choices: [...ONBOARDING_BATH_CHOICES], field: "bath" };
    case "sleep_duration":
      return { question: "睡眠時間はどのくらい取りたいですか？", choices: [...ONBOARDING_SLEEP_DURATION_CHOICES], field: "sleepDuration" };
    case "hobbies":
      return { question: "趣味や、好きな時間の過ごし方を教えてください。", choices: [...ONBOARDING_HOBBIES_CHOICES], field: "hobbies" };
    case "time_balance":
      return { question: "一人の時間と人と過ごす時間、どちらを大切にしたいですか？", choices: [...ONBOARDING_TIME_BALANCE_CHOICES], field: "timeBalance" };
    case "alcohol":
      return { question: "お酒は飲みますか？飲む場合は頻度と量を教えてください。", choices: [...ONBOARDING_ALCOHOL_CHOICES], field: "alcohol" };
    case "meal_breakfast":
      return { question: "朝食はどのくらい食べたいですか？", choices: [...ONBOARDING_MEAL_PORTION_CHOICES], field: "mealBreakfast" };
    case "meal_lunch":
      return { question: "昼食はどのくらい食べたいですか？", choices: [...ONBOARDING_MEAL_PORTION_CHOICES], field: "mealLunch" };
    case "meal_dinner":
      return { question: "夕食はどのくらい食べたいですか？", choices: [...ONBOARDING_MEAL_PORTION_CHOICES], field: "mealDinner" };
    case "meal_values":
      return { question: "食事で大切にしていることを教えてください。", choices: [...ONBOARDING_MEAL_VALUES_CHOICES], field: "mealValues" };
    default:
      return null;
  }
}

export function isStructuredOnboardingStep(step: OnboardingStep): boolean {
  return getStructuredStepConfig(step) !== null;
}

export const COURSE_SELECTION_MESSAGE =
  "これから生活リズムの考案を一緒に行なっていきます。\nどの程度の質問数で構築したいですか？\n（後からいつでも変更できます）";
