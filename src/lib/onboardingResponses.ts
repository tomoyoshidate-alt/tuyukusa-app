import {
  GENDER_CHOICES,
  ONBOARDING_GOAL_CHOICES,
  ONBOARDING_LIFESTYLE_STEPS,
  type OnboardingFlowData,
  type OnboardingStep,
} from "./onboarding";

type Translate = (key: string, options?: Record<string, unknown>) => string;

function getGoalEmpathy(goal: string, t: Translate): string {
  const trimmed = goal.trim();
  if (trimmed.includes("睡眠")) return t("onboarding.empathyGoalSleep");
  if (trimmed.includes("集中")) return t("onboarding.empathyGoalFocus");
  if (trimmed.includes("心身")) return t("onboarding.empathyGoalBalance");
  return t("onboarding.empathyGoalCustom", { goal: trimmed });
}

function getStepPrompt(step: OnboardingStep, t: Translate): { question: string; choices?: string[] } {
  switch (step) {
    case "birthdate":
      return { question: t("onboarding.birthdateQuestion") };
    case "gender":
      return { question: t("onboarding.genderQuestion"), choices: [...GENDER_CHOICES] };
    case "name":
      return { question: t("onboarding.nameQuestion"), choices: [t("onboarding.skip")] };
    case "return_home":
    case "dinner":
    case "bath":
    case "wake": {
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
  const next = getStepPrompt(toStep, t);
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
    case "return_home":
    case "dinner":
    case "bath": {
      const config = ONBOARDING_LIFESTYLE_STEPS[fromStep];
      parts.push(t("onboarding.empathyLifestyleAnswer", { answer }));
      parts.push(config.hint);
      break;
    }
    case "wake": {
      const config = ONBOARDING_LIFESTYLE_STEPS.wake;
      parts.push(t("onboarding.empathyLifestyleAnswer", { answer }));
      parts.push(config.hint);
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
