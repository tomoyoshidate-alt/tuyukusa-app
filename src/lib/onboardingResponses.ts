import {
  GENDER_CHOICES,
  ONBOARDING_GOAL_CHOICES,
  ONBOARDING_LIFESTYLE_STEPS,
  type OnboardingFlowData,
  type OnboardingStep,
} from "./onboarding";
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
      return { question: t("onboarding.birthdateQuestion") };
    case "gender":
      return { question: t("onboarding.genderQuestion"), choices: [...GENDER_CHOICES] };
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
    default:
      return { question: "" };
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
    case "name": {
      const name = data.nickname?.trim() || data.name?.trim();
      parts.push(name ? t("onboarding.empathyName", { name }) : t("onboarding.empathyNameSkipped"));
      break;
    }
    case "bedtime":
    case "wake":
    case "bath":
    case "sleep_duration": {
      parts.push(t("onboarding.empathyLifestyleAnswer", { answer }));
      parts.push(t("onboarding.timeDetailLater"));
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
