"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { handleChatTextareaKeyDown, isMacPlatform as detectMacPlatform } from "@/src/lib/chatSubmitKeyboard";
import {
  buildOnboardingProposalPrompt,
  GENDER_CHOICES,
  ONBOARDING_GOAL_CHOICES,
  ONBOARDING_GOAL_FREE_LABEL,
  ONBOARDING_LIFESTYLE_STEPS,
  parseOnboardingGoalChoice,
  type OnboardingFlowData,
  type OnboardingStep,
} from "@/src/lib/onboarding";
import { buildOnboardingTransition, buildWelcomeMessage } from "@/src/lib/onboardingResponses";
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
  onDeferToHome: (data: OnboardingFlowData) => void;
};

function buildWelcomeMessages(t: (k: string) => string): OnboardingMessage[] {
  const welcome = buildWelcomeMessage(t);
  return [{ type: "ai", text: welcome.text, choices: welcome.choices }];
}

export function OnboardingScreen({ fetchProposal, onQuestionnaireDone, onDeferToHome }: Props) {
  const { t } = useTranslation();
  const saved = loadOnboardingProgress();
  const [step, setStep] = useState<OnboardingStep>(saved?.pausedAtStep ?? saved?.currentStep ?? "goal");
  const [flowData, setFlowData] = useState<OnboardingFlowData>(saved?.flowData ?? {});
  const [progress, setProgress] = useState<OnboardingProgress>(() => saved ?? buildProgressFromFlowData({}));
  const [messages, setMessages] = useState<OnboardingMessage[]>(() => buildWelcomeMessages(t));
  const [input, setInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
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

  const pushTransition = (fromStep: OnboardingStep, answer: string, toStep: OnboardingStep, data: OnboardingFlowData) => {
    const { text, choices } = buildOnboardingTransition(fromStep, answer, toStep, data, t);
    pushAi(text, choices);
  };

  const goToLifestyle = (nextStep: OnboardingStep, fromStep: OnboardingStep, answer: string, data: OnboardingFlowData) => {
    setStep(nextStep);
    pushTransition(fromStep, answer, nextStep, data);
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
      const empathy = t("onboarding.empathyLifestyleAnswer", { answer });
      pushAi(`${empathy}\n\n${t("onboarding.timeDetailLater")}\n\n${t("onboarding.generating")}`);
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

    setStep(config.next);
    pushTransition(currentStep, answer, config.next, updated);
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
      window.setTimeout(() => onDeferToHome(flowData), 1800);
      return;
    }
    if (step === "gender") {
      const updated = { ...flowData, gender: choice };
      const nextProgress = recordAnswer(progress, "gender", { gender: choice });
      setFlowData(updated);
      persist(nextProgress, "name", updated);
      pushUser(choice);
      setStep("name");
      pushTransition("gender", choice, "name", updated);
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
        pushTransition("goal", choice, "birthdate", updated);
        return;
      }
    }
    if (step === "name" && choice === t("onboarding.skip")) {
      const nextProgress = recordAnswer(progress, "name", flowData);
      persist(nextProgress, "bedtime", flowData);
      pushUser(choice);
      setStep("bedtime");
      goToLifestyle("bedtime", "name", choice, flowData);
      return;
    }
    if (step === "bedtime" || step === "wake" || step === "bath" || step === "sleep_duration") {
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
      pushTransition("goal", text, "birthdate", updated);
      return;
    }
    if (step === "birthdate") {
      const updated = { ...flowData, birthDate: text };
      const nextProgress = recordAnswer(progress, "birthdate", { birthDate: text });
      setFlowData(updated);
      persist(nextProgress, "gender", updated);
      pushUser(text);
      setStep("gender");
      pushTransition("birthdate", text, "gender", updated);
      return;
    }
    if (step === "name") {
      const updated = { ...flowData, nickname: text, name: text };
      const nextProgress = recordAnswer(progress, "name", { nickname: text, name: text });
      setFlowData(updated);
      persist(nextProgress, "bedtime", updated);
      pushUser(text);
      setStep("bedtime");
      goToLifestyle("bedtime", "name", text, updated);
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
      pushTransition("goal", text, "birthdate", updated);
    }
  };

  const canDefer = step !== "goal" && step !== "birthdate" && step !== "gender" && step !== "proposal";
  const activeChoiceMessageIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (msg.type === "ai" && msg.choices && msg.choices.length > 0) return i;
    }
    return -1;
  })();

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 20000, background: "#f5f0e8", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 22, fontWeight: "bold", color: "#1a1410" }}>{t("common.appName")}</div>
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
            {msg.choices && !isLoading && i === activeChoiceMessageIndex && (
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

      <div style={{ padding: "12px 16px 24px", background: "white", borderTop: "1px solid rgba(60,40,20,0.1)", display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t("onboarding.messagePlaceholder")}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onKeyDown={e => handleChatTextareaKeyDown(e, () => void handleSend(), isComposing)}
          rows={2}
          style={{
            flex: 1,
            padding: "12px 14px",
            borderRadius: 12,
            border: "1.5px solid rgba(60,40,20,0.12)",
            fontSize: 14,
            resize: "none",
            minHeight: 44,
            maxHeight: 100,
            lineHeight: 1.5,
            fontFamily: "inherit",
          }}
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!input.trim() || isLoading}
          style={{
            padding: "12px 14px",
            minHeight: 44,
            borderRadius: 12,
            border: "none",
            background: input.trim() && !isLoading ? "#1a1410" : "#9a8b7a",
            color: "#f5f0e8",
            fontSize: 12,
            fontWeight: "bold",
            cursor: input.trim() && !isLoading ? "pointer" : "default",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {detectMacPlatform() ? t("chat.sendMac") : t("chat.sendWin")}
        </button>
      </div>
    </div>
  );
}
