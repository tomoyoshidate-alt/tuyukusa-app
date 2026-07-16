import {
  buildDayStartAssistantMessage,
  CHAT_DAY_START_QUESTION,
  getChatDayStartChoiceLabels,
  isChatDayStartChoice,
  resolvePresetIdForChoice,
} from "./chatDayStart";
import {
  buildRecommendedBathWindow,
  GENDER_CHOICES,
  ONBOARDING_BIRTHDATE_CHOICES,
  ONBOARDING_LIFESTYLE_STEPS,
  type OnboardingFlowData,
  type OnboardingStep,
} from "./onboarding";
import {
  COURSE_SELECTION_MESSAGE,
  getCourseChoiceLabels,
  getStructuredStepConfig,
} from "./onboardingCourse";
import { PSYCH_MODULE_CHOICES } from "./psychTests";
import type { IntroDraft } from "./introStorage";

type Translate = (key: string, options?: Record<string, unknown>) => string;

function getGoalEmpathy(goal: string, t: Translate): string {
  const trimmed = goal.trim();
  if (isChatDayStartChoice(trimmed)) {
    const presetId = resolvePresetIdForChoice(trimmed);
    if (presetId) return buildDayStartAssistantMessage(trimmed, presetId);
  }
  if (trimmed.includes("睡眠")) return t("onboarding.empathyGoalSleep");
  if (trimmed.includes("集中")) return t("onboarding.empathyGoalFocus");
  if (trimmed.includes("心身")) return t("onboarding.empathyGoalBalance");
  return t("onboarding.empathyGoalCustom", { goal: trimmed });
}

export function getOnboardingStepPrompt(step: OnboardingStep, t: Translate): { question: string; choices: string[] } {
  switch (step) {
    case "goal":
      return { question: CHAT_DAY_START_QUESTION, choices: getChatDayStartChoiceLabels() };
    case "birthdate":
      return { question: t("onboarding.birthdateQuestion"), choices: [...ONBOARDING_BIRTHDATE_CHOICES] };
    case "gender":
      return { question: t("onboarding.genderQuestion"), choices: [...GENDER_CHOICES] };
    case "ai_focus":
      return {
        question:
          "どのアプリで整えていきますか？ 選んだアプリに合わせて、このあと簡単な心理テストと診断から始めます。（あとで設定からいつでも切り替えられます）",
        choices: PSYCH_MODULE_CHOICES.map(c => c.label),
      };
    case "psych":
    case "rhythm":
      // 心理テスト・生活リズム設計は専用UIで表示するため、通常の質問文は出さない
      return { question: "", choices: [] };
    case "course":
      return { question: COURSE_SELECTION_MESSAGE, choices: getCourseChoiceLabels() };
    case "name":
      return {
        question: t("onboarding.nameQuestion"),
        choices: [t("onboarding.defaultNicknameChoice")],
      };
    case "bedtime":
    case "wake":
    case "bath":
    case "sleep_duration": {
      const config = ONBOARDING_LIFESTYLE_STEPS[step];
      return { question: config.question, choices: config.choices };
    }
    default: {
      const structured = getStructuredStepConfig(step);
      if (!structured) return { question: "", choices: [] };
      return { question: structured.question, choices: structured.choices };
    }
  }
}

export function buildOnboardingTransition(
  fromStep: OnboardingStep,
  answer: string,
  toStep: OnboardingStep,
  data: OnboardingFlowData,
  t: Translate,
): { empathyText: string; questionText: string; choices: string[]; binauralPresetId?: string } {
  const next = getOnboardingStepPrompt(toStep, t);
  const parts: string[] = [];

  switch (fromStep) {
    case "goal":
      parts.push(getGoalEmpathy(answer, t));
      break;
    case "birthdate":
      parts.push(t("onboarding.empathyBirthdate"));
      break;
    case "gender":
      parts.push(t("onboarding.empathyGender"));
      break;
    case "ai_focus":
      parts.push("承知しました。では、あなたに合わせた簡単な心理テストから始めましょう。");
      break;
    case "course":
      parts.push(t("onboarding.empathyCourse"));
      break;
    case "name": {
      const name = data.nickname?.trim() || data.name?.trim();
      parts.push(name ? t("onboarding.empathyName", { name }) : t("onboarding.empathyNameSkipped"));
      break;
    }
    case "bath": {
      parts.push(t("onboarding.empathyBathTip"));
      const bathWindow = buildRecommendedBathWindow(data.bedtime);
      if (bathWindow) parts.push(t("onboarding.empathyBathBedtimeHint", { range: bathWindow }));
      break;
    }
    case "bedtime":
    case "wake":
    case "sleep_duration":
    case "weekday_wake":
    case "weekday_bedtime":
    case "weekend_wake":
    case "weekend_bedtime":
    case "hobbies":
    case "time_balance":
    case "alcohol":
    case "meal_breakfast":
    case "meal_lunch":
    case "meal_dinner":
    case "meal_values":
      parts.push(t("onboarding.empathyLifestyleAnswer", { answer }));
      break;
    default:
      break;
  }

  const binauralPresetId =
    fromStep === "goal" && isChatDayStartChoice(answer)
      ? resolvePresetIdForChoice(answer) ?? undefined
      : undefined;

  return {
    empathyText: parts.filter(Boolean).join("\n\n"),
    questionText: next.question,
    choices: next.choices,
    binauralPresetId,
  };
}

export function buildWelcomeMessage(t: Translate): { intro: string; question: string; choices: string[] } {
  return {
    intro: t("onboarding.welcomeBody"),
    question: CHAT_DAY_START_QUESTION,
    choices: getChatDayStartChoiceLabels(),
  };
}

export function buildWelcomeMessageFromIntro(
  draft: IntroDraft,
  t: Translate,
): { intro: string; question: string; choices: string[] } {
  const introParts: string[] = [t("onboarding.welcomeBody")];

  if (!draft.skipNickname && draft.nickname?.trim()) {
    introParts.push(`${draft.nickname.trim()}さん、はじめまして。`);
  }

  return {
    intro: introParts.join("\n\n"),
    question: CHAT_DAY_START_QUESTION,
    choices: getChatDayStartChoiceLabels(),
  };
}
