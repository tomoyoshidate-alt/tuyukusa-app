import type { OnboardingFlowData, OnboardingStep } from "./onboarding";
import { introDraftToFlowData, loadIntroDraft } from "./introStorage";
import { getEffectiveCourse, getQuestionOrder, getNextStepInCourse, isStructuredOnboardingStep, loadQuestionnaireCourse } from "./onboardingCourse";

export const ONBOARDING_PROGRESS_KEY = "tuyukusa-onboarding-progress";
export const ONBOARDING_PROFILE_STEPS: OnboardingStep[] = ["birthdate", "gender", "name"];
export const ONBOARDING_QUESTION_ORDER: OnboardingStep[] = [
  "goal", "birthdate", "gender", "course", "name", "bedtime", "wake", "bath", "sleep_duration",
];

const VALID_ONBOARDING_STEPS = new Set<OnboardingStep>([
  "goal", "birthdate", "gender", "course", "name", "bedtime", "wake",
  "weekday_wake", "weekday_bedtime", "weekend_wake", "weekend_bedtime",
  "bath", "sleep_duration", "hobbies", "time_balance", "alcohol",
  "meal_breakfast", "meal_lunch", "meal_dinner", "meal_values", "proposal",
]);

/** Legacy steps from before hourly time-choice refactor */
const LEGACY_ONBOARDING_STEP_MAP: Record<string, OnboardingStep> = {
  return_home: "bedtime",
  dinner: "wake",
};

export function normalizeOnboardingStep(step: string | undefined): OnboardingStep | undefined {
  if (!step) return undefined;
  const mapped = LEGACY_ONBOARDING_STEP_MAP[step] ?? step;
  return VALID_ONBOARDING_STEPS.has(mapped as OnboardingStep) ? (mapped as OnboardingStep) : undefined;
}

export function resolveOnboardingResumeStep(progress: OnboardingProgress | null): OnboardingStep {
  if (!progress) return "goal";
  const paused = normalizeOnboardingStep(progress.pausedAtStep);
  if (paused) return paused;
  const current = normalizeOnboardingStep(progress.currentStep);
  if (current) return current;
  return getNextUnansweredStep(progress) ?? "goal";
}

function migrateOnboardingProgress(progress: OnboardingProgress): OnboardingProgress {
  const answered: Partial<Record<OnboardingStep, boolean>> & Record<string, boolean> = {
    ...progress.answered,
  };
  if (answered.return_home && !answered.bedtime) answered.bedtime = true;
  if (answered.dinner && !answered.wake) answered.wake = true;
  delete answered.return_home;
  delete answered.dinner;
  return { ...progress, answered };
}

export type OnboardingProgress = {
  flowData: OnboardingFlowData;
  answered: Partial<Record<OnboardingStep, boolean>>;
  deferCounts: Partial<Record<OnboardingStep, number>>;
  pausedAtStep?: OnboardingStep;
  integrationsPhase?: boolean;
  currentStep?: OnboardingStep;
};

export const INITIAL_ONBOARDING_PROGRESS: OnboardingProgress = { flowData: {}, answered: {}, deferCounts: {} };
const MAX_DEFER = 3;

export function normalizeOnboardingProgress(data: unknown): OnboardingProgress | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Partial<OnboardingProgress>;
  const base: OnboardingProgress = {
    flowData: (d.flowData && typeof d.flowData === "object" ? d.flowData : {}) as OnboardingFlowData,
    answered: d.answered && typeof d.answered === "object" ? d.answered : {},
    deferCounts: d.deferCounts && typeof d.deferCounts === "object" ? d.deferCounts : {},
    pausedAtStep: typeof d.pausedAtStep === "string" ? normalizeOnboardingStep(d.pausedAtStep) : undefined,
    integrationsPhase: d.integrationsPhase === true,
    currentStep: typeof d.currentStep === "string" ? normalizeOnboardingStep(d.currentStep) : undefined,
  };
  return migrateOnboardingProgress(base);
}

export function loadStoredOnboardingProfile(): Partial<OnboardingFlowData> {
  if (typeof window === "undefined") return {};
  const fromIntro = introDraftToFlowData(loadIntroDraft());
  const fromProfile: Partial<OnboardingFlowData> = {};
  try {
    const raw = localStorage.getItem("tuyukusa-user-profile");
    if (raw) {
      const profile = JSON.parse(raw) as {
        birthDate?: string;
        gender?: string;
        nickname?: string;
        name?: string;
      };
      if (profile.birthDate?.trim()) fromProfile.birthDate = profile.birthDate.trim();
      if (profile.gender?.trim()) fromProfile.gender = profile.gender.trim();
      if (profile.nickname?.trim()) {
        fromProfile.nickname = profile.nickname.trim();
        fromProfile.name = profile.nickname.trim();
      } else if (profile.name?.trim()) {
        fromProfile.name = profile.name.trim();
      }
    }
  } catch {
    /* ignore */
  }
  return { ...fromIntro, ...fromProfile };
}

export function applyStoredProfileToProgress(progress: OnboardingProgress): OnboardingProgress {
  const storedCourse = loadQuestionnaireCourse();
  const mergedFlow = {
    ...progress.flowData,
    ...loadStoredOnboardingProfile(),
    ...(storedCourse && !progress.flowData.questionnaireCourse ? { questionnaireCourse: storedCourse } : {}),
  };
  return buildProgressFromFlowData(mergedFlow);
}

export function buildOnboardingProfileSystemContext(data: Partial<OnboardingFlowData> = {}): string {
  const merged = { ...loadStoredOnboardingProfile(), ...data };
  const lines: string[] = [];
  if (merged.birthDate?.trim()) lines.push(`生年月日: ${merged.birthDate.trim()}`);
  if (merged.gender?.trim()) lines.push(`性別: ${merged.gender.trim()}`);
  const nickname = merged.nickname?.trim() || merged.name?.trim();
  if (nickname) lines.push(`ニックネーム: ${nickname}`);
  if (!lines.length) return "";
  return [
    "【初回問診：取得済みプロフィール】",
    ...lines,
    "",
    "この情報はすでに取得済みです。絶対に再度聞かないでください。",
    "生年月日・性別・ニックネームについて同じ質問をしないでください。",
  ].join("\n");
}

export function resolveNextStepAfter(fromStep: OnboardingStep, progress: OnboardingProgress): OnboardingStep {
  const next = getNextStepInCourse(fromStep, progress.flowData);
  if (next === "proposal") return "proposal";
  if (ONBOARDING_PROFILE_STEPS.includes(next) && isQuestionAnswered(progress, next)) {
    return resolveNextStepAfter(next, progress);
  }
  return next;
}

export function isLifestyleStep(step: OnboardingStep): boolean {
  return isStructuredOnboardingStep(step);
}

export function loadOnboardingProgress(): OnboardingProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ONBOARDING_PROGRESS_KEY);
    return raw ? normalizeOnboardingProgress(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveOnboardingProgress(progress: OnboardingProgress): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}

export function clearOnboardingProgress(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ONBOARDING_PROGRESS_KEY);
  } catch {
    /* ignore */
  }
}

function fieldAnswered(data: OnboardingFlowData, step: OnboardingStep): boolean {
  switch (step) {
    case "goal": return !!data.goal?.trim();
    case "birthdate": return !!data.birthDate?.trim();
    case "gender": return !!data.gender?.trim();
    case "course": return !!data.questionnaireCourse;
    case "name": return !!(data.nickname?.trim() || data.name?.trim());
    case "bedtime": return !!data.bedtime?.trim();
    case "wake": return !!data.wake?.trim();
    case "weekday_wake": return !!data.weekdayWake?.trim();
    case "weekday_bedtime": return !!data.weekdayBedtime?.trim();
    case "weekend_wake": return !!data.weekendWake?.trim();
    case "weekend_bedtime": return !!data.weekendBedtime?.trim();
    case "bath": return !!data.bath?.trim();
    case "sleep_duration": return !!data.sleepDuration?.trim();
    case "hobbies": return !!data.hobbies?.trim();
    case "time_balance": return !!data.timeBalance?.trim();
    case "alcohol": return !!data.alcohol?.trim();
    case "meal_breakfast": return !!data.mealBreakfast?.trim();
    case "meal_lunch": return !!data.mealLunch?.trim();
    case "meal_dinner": return !!data.mealDinner?.trim();
    case "meal_values": return !!data.mealValues?.trim();
    default: return false;
  }
}

export function isQuestionAnswered(progress: OnboardingProgress, step: OnboardingStep): boolean {
  return progress.answered[step] === true || fieldAnswered(progress.flowData, step);
}

export function shouldSuppressQuestion(progress: OnboardingProgress, step: OnboardingStep): boolean {
  return (progress.deferCounts[step] ?? 0) >= MAX_DEFER;
}

export function getPendingQuestions(progress: OnboardingProgress): OnboardingStep[] {
  const order = getQuestionOrder(getEffectiveCourse(progress.flowData));
  return order.filter(s => !isQuestionAnswered(progress, s) && !shouldSuppressQuestion(progress, s));
}

export function getNextUnansweredStep(progress: OnboardingProgress): OnboardingStep | null {
  return getPendingQuestions(progress)[0] ?? null;
}

export function recordAnswer(progress: OnboardingProgress, step: OnboardingStep, patch: Partial<OnboardingFlowData>): OnboardingProgress {
  return { ...progress, flowData: { ...progress.flowData, ...patch }, answered: { ...progress.answered, [step]: true }, pausedAtStep: undefined, currentStep: step };
}

export function recordDefer(progress: OnboardingProgress, step: OnboardingStep): OnboardingProgress {
  return { ...progress, deferCounts: { ...progress.deferCounts, [step]: (progress.deferCounts[step] ?? 0) + 1 }, pausedAtStep: step, currentStep: step };
}

export function recordSkipToHome(progress: OnboardingProgress, step: OnboardingStep): OnboardingProgress {
  return { ...progress, pausedAtStep: step, currentStep: step };
}

export function buildProgressFromFlowData(data: OnboardingFlowData): OnboardingProgress {
  const progress: OnboardingProgress = { ...INITIAL_ONBOARDING_PROGRESS, flowData: { ...data } };
  const order = getQuestionOrder(getEffectiveCourse(data));
  for (const step of order) {
    if (fieldAnswered(data, step)) progress.answered[step] = true;
  }
  return progress;
}

export const ONBOARDING_RESET_PATTERNS = [/初期設定/, /最初からやり直/, /初回問診/, /問診を最初から/, /セットアップをやり直/];
export function isOnboardingResetIntent(text: string): boolean {
  return ONBOARDING_RESET_PATTERNS.some(p => p.test(text.trim()));
}

export const VOICE_HINT_SHOWN_KEY = "tuyukusa-voice-hint-shown";
export function hasVoiceHintBeenShown(): boolean {
  if (typeof window === "undefined") return true;
  try { return localStorage.getItem(VOICE_HINT_SHOWN_KEY) === "1"; } catch { return true; }
}
export function markVoiceHintShown(): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(VOICE_HINT_SHOWN_KEY, "1"); } catch { /* ignore */ }
}
