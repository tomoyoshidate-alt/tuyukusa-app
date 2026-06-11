import {
  GENDER_CHOICES,
  ONBOARDING_BIRTHDATE_CHOICES,
  ONBOARDING_GOAL_CHOICES,
  ONBOARDING_LIFESTYLE_STEPS,
  type OnboardingFlowData,
  type OnboardingStep,
} from "./onboarding";
import {
  COURSE_SELECTION_MESSAGE,
  getCourseChoiceLabels,
  getOnboardingKnowledgeTip,
  getStructuredStepConfig,
} from "./onboardingCourse";
import type { IntroDraft } from "./introStorage";

type Translate = (key: string, options?: Record<string, unknown>) => string;

function getGoalEmpathy(goal: string, t: Translate): string {
  const trimmed = goal.trim();
  if (trimmed.includes("睡眠")) return t("onboarding.empathyGoalSleep");
  if (trimmed.includes("集中")) return t("onboarding.empathyGoalFocus");
  if (trimmed.includes("心身")) return t("onboarding.empathyGoalBalance");
  return t("onboarding.empathyGoalCustom", { goal: trimmed });
}

export function getOnboardingStepPrompt(step: OnboardingStep, t: Translate): { question: string; choices?: string[] } {
  switch (step) {
    case "birthdate":
      return { question: t("onboarding.birthdateQuestion"), choices: [...ONBOARDING_BIRTHDATE_CHOICES] };
    case "gender":
      return { question: t("onboarding.genderQuestion"), choices: [...GENDER_CHOICES] };
    case "course":
      return { question: COURSE_SELECTION_MESSAGE, choices: getCourseChoiceLabels() };
    case "name":
      return {
        question: t("onboarding.nameQuestion"),
        choices: [
          t("onboarding.defaultNicknameChoice"),
          t("onboarding.skip"),
          t("onboarding.deferQuestion"),
          t("onboarding.skipQuestionnaire"),
        ],
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
      if (!structured) return { question: "" };
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
): { text: string; choices?: string[] } {
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
    case "course":
      parts.push(t("onboarding.empathyCourse"));
      break;
    case "name": {
      const name = data.nickname?.trim() || data.name?.trim();
      parts.push(name ? t("onboarding.empathyName", { name }) : t("onboarding.empathyNameSkipped"));
      break;
    }
    case "bedtime":
    case "wake":
    case "bath":
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
    case "meal_values": {
      parts.push(t("onboarding.empathyLifestyleAnswer", { answer }));
      const tip = getOnboardingKnowledgeTip(fromStep);
      if (tip) parts.push(tip);
      break;
    }
    default:
      break;
  }

  if (next.question) parts.push(next.question);
  return { text: parts.filter(Boolean).join("\n\n"), choices: next.choices };
}

export function buildWelcomeMessage(t: Translate): { text: string; choices: string[] } {
  return {
    text: `${t("onboarding.welcomeBody")}\n\n${t("onboarding.goalQuestionShort")}`,
    choices: [...ONBOARDING_GOAL_CHOICES],
  };
}

export function buildWelcomeMessageFromIntro(
  draft: IntroDraft,
  t: Translate,
): { text: string; choices: string[] } {
  const parts: string[] = [];

  if (draft.skipNickname || !draft.nickname?.trim()) {
    parts.push("はじめまして。");
  } else {
    parts.push(`${draft.nickname.trim()}さん、はじめまして。`);
  }

  const interests = draft.featureInterests.filter(Boolean);
  if (interests.length === 1) {
    parts.push(`「${interests[0]}」に興味があるとのこと、承知しました。`);
  } else if (interests.length > 1) {
    parts.push(`次の機能に興味があるとのこと、承知しました。\n${interests.map(i => `・${i}`).join("\n")}`);
  }

  if (draft.featureOther?.trim()) {
    parts.push(`その他のご希望：「${draft.featureOther.trim()}」`);
  }

  const profileBits: string[] = [];
  if (draft.birthDate?.trim()) profileBits.push(`生年月日：${draft.birthDate.trim()}`);
  if (draft.gender?.trim()) profileBits.push(`身体的な性別：${draft.gender.trim()}`);
  if (profileBits.length) {
    parts.push(`いただいたプロフィール（${profileBits.join(" / ")}）をもとに、あなたに合ったサポートをします。`);
  }

  parts.push(t("onboarding.goalQuestionShort"));

  return {
    text: parts.join("\n\n"),
    choices: [...ONBOARDING_GOAL_CHOICES],
  };
}
