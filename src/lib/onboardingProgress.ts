import type { OnboardingFlowData, OnboardingStep } from "./onboarding";

export const ONBOARDING_PROGRESS_KEY = "tuyukusa-onboarding-progress";
export const ONBOARDING_QUESTION_ORDER: OnboardingStep[] = [
  "goal", "birthdate", "gender", "name", "return_home", "dinner", "bath", "wake",
];

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
  return {
    flowData: (d.flowData && typeof d.flowData === "object" ? d.flowData : {}) as OnboardingFlowData,
    answered: d.answered && typeof d.answered === "object" ? d.answered : {},
    deferCounts: d.deferCounts && typeof d.deferCounts === "object" ? d.deferCounts : {},
    pausedAtStep: typeof d.pausedAtStep === "string" ? (d.pausedAtStep as OnboardingStep) : undefined,
    integrationsPhase: d.integrationsPhase === true,
    currentStep: typeof d.currentStep === "string" ? (d.currentStep as OnboardingStep) : undefined,
  };
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
    case "name": return !!(data.nickname?.trim() || data.name?.trim());
    case "return_home": return !!data.returnHome?.trim();
    case "dinner": return !!data.dinner?.trim();
    case "bath": return !!data.bath?.trim();
    case "wake": return !!data.wake?.trim();
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
  return ONBOARDING_QUESTION_ORDER.filter(s => !isQuestionAnswered(progress, s) && !shouldSuppressQuestion(progress, s));
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

export function buildProgressFromFlowData(data: OnboardingFlowData): OnboardingProgress {
  const progress: OnboardingProgress = { ...INITIAL_ONBOARDING_PROGRESS, flowData: { ...data } };
  for (const step of ONBOARDING_QUESTION_ORDER) {
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
