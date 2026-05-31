"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  buildOnboardingProposalPrompt,
  GENDER_CHOICES,
  ONBOARDING_GOAL_CHOICES,
  ONBOARDING_GOAL_FREE_LABEL,
  ONBOARDING_LIFESTYLE_STEPS,
  ONBOARDING_WELCOME_MESSAGE,
  parseOnboardingGoalChoice,
  type OnboardingFlowData,
  type OnboardingStep,
} from "@/src/lib/onboarding";
import {
  buildProgressFromFlowData,
  hasVoiceHintBeenShown,
  loadOnboardingProgress,
  markVoiceHintShown,
  recordAnswer,
  recordDefer,
  saveOnboardingProgress,
  type OnboardingProgress,
} from "@/src/lib/onboardingProgress";
import type { ScheduleReflection } from "@/src/lib/scheduleReflection";
import { createAiChatMessageFromReply, type ChatReply } from "@/src/lib/chatReply";

type OnboardingMessage = {
  type: "ai" | "user";
  text: string;
  choices?: string[];
  scheduleReflection?: ScheduleReflection;
};

type Props = {
  fetchProposal: (prompt: string) => Promise<ChatReply>;
  onQuestionnaireDone: (data: OnboardingFlowData, reflection: ScheduleReflection | null) => void;
};

function buildWelcomeMessages(t: (k: string) => string): OnboardingMessage[] {
  return [
    {
      type: "ai",
      text: `${ONBOARDING_WELCOME_MESSAGE}\n\n${t("onboarding.goalQuestionShort")}`,
      choices: [...ONBOARDING_GOAL_CHOICES],
    },
  ];
}

export function OnboardingScreen({ fetchProposal, onQuestionnaireDone }: Props) {
  const { t } = useTranslation();
  const saved = loadOnboardingProgress();
  const [step, setStep] = useState<OnboardingStep>(saved?.pausedAtStep ?? saved?.currentStep ?? "goal");
  const [flowData, setFlowData] = useState<OnboardingFlowData>(saved?.flowData ?? {});
  const [progress, setProgress] = useState<OnboardingProgress>(() => saved ?? buildProgressFromFlowData({}));
  const [messages, setMessages] = useState<OnboardingMessage[]>(() => buildWelcomeMessages(t));
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [freeGoalMode, setFreeGoalMode] = useState(false);
  const [showVoiceHint, setShowVoiceHint] = useState(() => !hasVoiceHintBeenShown());
  const endRef = useRef<HTMLDivElement>(null);
  const resumedRef = useRef(false);

  const persist = (nextProgress: OnboardingProgress, nextStep: OnboardingStep, nextData: OnboardingFlowData) => {
    const merged = { ...nextProgress, flowData: nextData, currentStep: nextStep };
    setProgress(merged);
    saveOnboardingProgress(merged);
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (showVoiceHint) markVoiceHintShown();
  }, [showVoiceHint]);

  useEffect(() => {
    if (resumedRef.current || !saved?.pausedAtStep) return;
    resumedRef.current = true;
    const s = saved.pausedAtStep;
    if (s === "goal") {
      setMessages(buildWelcomeMessages(t));
      return;
    }
    if (s === "birthdate") {
      pushAiOnly(t("onboarding.birthdateQuestion"));
    } else if (s === "gender") {
      pushAiOnly(t("onboarding.genderQuestion"), [...GENDER_CHOICES]);
    } else if (s === "name") {
      pushAiOnly(t("onboarding.nameQuestion"), [t("onboarding.skip")]);
    } else if (s in ONBOARDING_LIFESTYLE_STEPS) {
      const cfg = ONBOARDING_LIFESTYLE_STEPS[s as keyof typeof ONBOARDING_LIFESTYLE_STEPS];
      pushAiOnly(cfg.question, cfg.choices);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushUser = (text: string) => setMessages(prev => [...prev, { type: "user", text }]);
  const pushAiOnly = (text: string, choices?: string[]) => setMessages(prev => [...prev, { type: "ai", text, choices }]);
  const pushAi = (text: string, choices?: string[]) => setMessages(prev => [...prev, { type: "ai", text, choices }]);

  const goToLifestyle = (nextStep: OnboardingStep) => {
    const config = ONBOARDING_LIFESTYLE_STEPS[nextStep as keyof typeof ONBOARDING_LIFESTYLE_STEPS];
    if (!config) return;
    setStep(nextStep);
    pushAi(config.question, config.choices);
  };

  const handleLifestyleAnswer = async (answer: string, currentStep: keyof typeof ONBOARDING_LIFESTYLE_STEPS) => {
    const config = ONBOARDING_LIFESTYLE_STEPS[currentStep];
    const nextProgress = recordAnswer(progress, currentStep, { [config.field]: answer });
    const updated = { ...flowData, [config.field]: answer };
    setFlowData(updated);
    persist(nextProgress, currentStep, updated);
    pushUser(answer);

    if (config.next === "proposal") {
      setStep("proposal");
      pushAi(`${config.hint}\n\n${t("onboarding.generating")}`);
      setIsLoading(true);
      try {
        const reply = await fetchProposal(buildOnboardingProposalPrompt(updated));
        const aiMsg = createAiChatMessageFromReply(reply.content, reply);
        setMessages(prev => [...prev.slice(0, -1), { type: "ai", text: aiMsg.text, scheduleReflection: aiMsg.scheduleReflection }]);
        setMessages(prev => [
          ...prev,
          {
            type: "ai",
            text: aiMsg.scheduleReflection ? t("onboarding.applyPrompt") : t("onboarding.completeFallback"),
            choices: aiMsg.scheduleReflection ? [t("onboarding.applyAndContinue")] : [t("onboarding.continueToIntegrations")],
          },
        ]);
      } catch {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { type: "ai", text: t("onboarding.proposalFailed"), choices: [t("onboarding.continueToIntegrations")] },
        ]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const nextConfig = ONBOARDING_LIFESTYLE_STEPS[config.next as keyof typeof ONBOARDING_LIFESTYLE_STEPS];
    setStep(config.next);
    pushAi(`${config.hint}\n\n${nextConfig.question}`, nextConfig.choices);
  };

  const handleChoice = async (choice: string) => {
    if (choice === t("onboarding.applyAndContinue") || choice === t("onboarding.continueToIntegrations")) {
      onQuestionnaireDone(flowData, [...messages].reverse().find(m => m.scheduleReflection)?.scheduleReflection ?? null);
      return;
    }
    if (choice === t("onboarding.deferQuestion")) {
      const nextProgress = recordDefer(progress, step);
      persist(nextProgress, step, flowData);
      pushUser(choice);
      pushAi(t("onboarding.deferredAck"));
      return;
    }
    if (step === "gender") {
      const updated = { ...flowData, gender: choice };
      const nextProgress = recordAnswer(progress, "gender", { gender: choice });
      setFlowData(updated);
      persist(nextProgress, "name", updated);
      pushUser(choice);
      setStep("name");
      pushAi(t("onboarding.nameQuestion"), [t("onboarding.skip")]);
      return;
    }
    if (step === "goal" && !freeGoalMode) {
      if (choice === ONBOARDING_GOAL_FREE_LABEL) {
        pushUser(choice);
        setFreeGoalMode(true);
        pushAi(t("onboarding.goalFreeHint"));
        return;
      }
      const goal = parseOnboardingGoalChoice(choice);
      if (goal) {
        const updated = { ...flowData, goal };
        const nextProgress = recordAnswer(progress, "goal", { goal });
        setFlowData(updated);
        persist(nextProgress, "birthdate", updated);
        pushUser(choice);
        setStep("birthdate");
        pushAi(t("onboarding.birthdateQuestion"));
        return;
      }
    }
    if (step === "name" && choice === t("onboarding.skip")) {
      const nextProgress = recordAnswer(progress, "name", flowData);
      persist(nextProgress, "return_home", flowData);
      pushUser(choice);
      setStep("return_home");
      goToLifestyle("return_home");
      return;
    }
    if (step === "return_home" || step === "dinner" || step === "bath" || step === "wake") {
      await handleLifestyleAnswer(choice, step);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");

    if (step === "goal" && freeGoalMode) {
      const updated = { ...flowData, goal: text };
      const nextProgress = recordAnswer(progress, "goal", { goal: text });
      setFlowData(updated);
      persist(nextProgress, "birthdate", updated);
      pushUser(text);
      setFreeGoalMode(false);
      setStep("birthdate");
      pushAi(t("onboarding.birthdateQuestion"));
      return;
    }
    if (step === "birthdate") {
      const updated = { ...flowData, birthDate: text };
      const nextProgress = recordAnswer(progress, "birthdate", { birthDate: text });
      setFlowData(updated);
      persist(nextProgress, "gender", updated);
      pushUser(text);
      setStep("gender");
      pushAi(t("onboarding.genderQuestion"), [...GENDER_CHOICES]);
      return;
    }
    if (step === "name") {
      const updated = { ...flowData, nickname: text, name: text };
      const nextProgress = recordAnswer(progress, "name", { nickname: text, name: text });
      setFlowData(updated);
      persist(nextProgress, "return_home", updated);
      pushUser(text);
      setStep("return_home");
      goToLifestyle("return_home");
      return;
    }
    if (step === "goal") {
      const goal = parseOnboardingGoalChoice(text) ?? text;
      if (!goal) return;
      const updated = { ...flowData, goal };
      const nextProgress = recordAnswer(progress, "goal", { goal });
      setFlowData(updated);
      persist(nextProgress, "birthdate", updated);
      pushUser(text);
      setStep("birthdate");
      pushAi(t("onboarding.birthdateQuestion"));
    }
  };

  const canDefer = step !== "goal" && step !== "birthdate" && step !== "gender" && step !== "proposal";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 20000, background: "#f5f0e8", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 22, fontWeight: "bold", color: "#1a1410" }}>🌿 {t("common.appName")}</div>
        </div>
        {messages.map((msg, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: msg.type === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "88%", padding: "12px 14px", borderRadius: 18, fontSize: 14, lineHeight: 1.75, background: msg.type === "user" ? "#1a1410" : "white", color: msg.type === "user" ? "#f5f0e8" : "#1a1410", border: msg.type === "ai" ? "1px solid rgba(60,40,20,0.1)" : "none", whiteSpace: "pre-line" }}>
                {msg.text}
              </div>
            </div>
            {msg.scheduleReflection && (
              <div style={{ marginTop: 10, maxWidth: "88%" }}>
                {msg.scheduleReflection.schedule.map((item, j) => (
                  <div key={`${item.time}-${j}`} style={{ background: "#fdf0e4", border: "1.5px solid #c17f4a", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#8b5a2b", marginBottom: 6 }}>
                    <div style={{ fontWeight: "bold" }}>{item.time} {item.title}</div>
                    {item.memo && <div style={{ opacity: 0.75, marginTop: 2 }}>{item.memo}</div>}
                  </div>
                ))}
              </div>
            )}
            {msg.choices && !isLoading && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {msg.choices.map((c, j) => (
                  <button key={j} type="button" onClick={() => void handleChoice(c)} style={{ background: "#ede5d4", border: "1.5px solid rgba(60,40,20,0.12)", borderRadius: 20, padding: "8px 16px", fontSize: 13, cursor: "pointer", color: "#3d3228" }}>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {isLoading && <div style={{ fontSize: 13, color: "#8b7355", padding: "8px 0" }}>{t("onboarding.generating")}</div>}
        <div ref={endRef} />
      </div>

      {showVoiceHint && (
        <div style={{ padding: "0 20px 8px", fontSize: 12, color: "#6b5c4a", textAlign: "center" }} onClick={() => setShowVoiceHint(false)}>
          {t("onboarding.voiceHint")}
        </div>
      )}

      {canDefer && !isLoading && (
        <div style={{ textAlign: "center", padding: "0 20px 8px" }}>
          <button type="button" onClick={() => void handleChoice(t("onboarding.deferQuestion"))} style={{ background: "none", border: "none", color: "#8b7355", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
            {t("onboarding.deferQuestion")}
          </button>
        </div>
      )}

      <div style={{ padding: "12px 16px 24px", background: "white", borderTop: "1px solid rgba(60,40,20,0.1)", display: "flex", gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t("onboarding.messagePlaceholder")}
          onKeyDown={e => { if (e.key === "Enter") void handleSend(); }}
          style={{ flex: 1, padding: "12px 14px", borderRadius: 12, border: "1.5px solid rgba(60,40,20,0.12)", fontSize: 14 }}
        />
        <button type="button" onClick={() => void handleSend()} disabled={!input.trim() || isLoading} style={{ padding: "12px 18px", borderRadius: 12, border: "none", background: input.trim() && !isLoading ? "#1a1410" : "#9a8b7a", color: "#f5f0e8", fontSize: 14, fontWeight: "bold", cursor: input.trim() && !isLoading ? "pointer" : "default" }}>
          {t("onboarding.next")}
        </button>
      </div>
    </div>
  );
}
