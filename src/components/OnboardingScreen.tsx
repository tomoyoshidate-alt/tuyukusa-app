"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { handleAiChatEnterSendKeyDown } from "@/src/lib/chatSubmitKeyboard";
import {
  buildOnboardingProposalPrompt,
  ONBOARDING_GOAL_FREE_LABEL,
  ONBOARDING_LIFESTYLE_STEPS,
  parseOnboardingGoalChoice,
  type OnboardingFlowData,
  type OnboardingStep,
} from "@/src/lib/onboarding";
import {
  buildOnboardingTransition,
  buildWelcomeMessage,
  getOnboardingStepPrompt,
} from "@/src/lib/onboardingResponses";
import {
  buildProgressFromFlowData,
  hasVoiceHintBeenShown,
  loadOnboardingProgress,
  markVoiceHintShown,
  recordAnswer,
  recordDefer,
  recordSkipToHome,
  resolveOnboardingResumeStep,
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

function buildInitialMessages(step: OnboardingStep, t: (k: string) => string): OnboardingMessage[] {
  if (step === "goal" || step === "proposal") return buildWelcomeMessages(t);
  const prompt = getOnboardingStepPrompt(step, t);
  if (!prompt.question) return buildWelcomeMessages(t);
  return [{ type: "ai", text: prompt.question, choices: prompt.choices }];
}

export function OnboardingScreen({ fetchProposal, onQuestionnaireDone, onDeferToHome }: Props) {
  const { t } = useTranslation();
  const savedProgress = loadOnboardingProgress();
  const initialStep = resolveOnboardingResumeStep(savedProgress);
  const initialProgress = savedProgress ?? buildProgressFromFlowData({});

  const [step, setStep] = useState<OnboardingStep>(initialStep);
  const [flowData, setFlowData] = useState<OnboardingFlowData>(initialProgress.flowData ?? {});
  const [progress, setProgress] = useState<OnboardingProgress>(initialProgress);
  const [messages, setMessages] = useState<OnboardingMessage[]>(() => buildInitialMessages(initialStep, t));
  const [input, setInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVoiceHint, setShowVoiceHint] = useState(() => !hasVoiceHintBeenShown());
  const endRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false);

  const stepRef = useRef(step);
  const progressRef = useRef(progress);
  const flowDataRef = useRef(flowData);
  const messagesRef = useRef(messages);
  const isLoadingRef = useRef(isLoading);

  stepRef.current = step;
  progressRef.current = progress;
  flowDataRef.current = flowData;
  messagesRef.current = messages;
  isLoadingRef.current = isLoading;

  const persist = useCallback((nextProgress: OnboardingProgress, nextStep: OnboardingStep, nextData: OnboardingFlowData) => {
    const merged = { ...nextProgress, flowData: nextData, currentStep: nextStep };
    setProgress(merged);
    progressRef.current = merged;
    saveOnboardingProgress(merged);
  }, []);

  useEffect(() => {
    const saved = loadOnboardingProgress();
    if (saved) saveOnboardingProgress(saved);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (showVoiceHint) markVoiceHintShown();
  }, [showVoiceHint]);

  const pushUser = useCallback((text: string) => {
    setMessages(prev => {
      const next = [...prev, { type: "user" as const, text }];
      messagesRef.current = next;
      return next;
    });
  }, []);

  const pushAi = useCallback((text: string, choices?: string[]) => {
    setMessages(prev => {
      const next = [...prev, { type: "ai" as const, text, choices }];
      messagesRef.current = next;
      return next;
    });
  }, []);

  const pushTransition = useCallback(
    (fromStep: OnboardingStep, answer: string, toStep: OnboardingStep, data: OnboardingFlowData) => {
      const { text, choices } = buildOnboardingTransition(fromStep, answer, toStep, data, t);
      pushAi(text, choices);
    },
    [pushAi, t],
  );

  const goToLifestyle = useCallback(
    (nextStep: OnboardingStep, fromStep: OnboardingStep, answer: string, data: OnboardingFlowData) => {
      setStep(nextStep);
      stepRef.current = nextStep;
      pushTransition(fromStep, answer, nextStep, data);
    },
    [pushTransition],
  );

  const handleLifestyleAnswer = useCallback(
    async (answer: string, currentStep: keyof typeof ONBOARDING_LIFESTYLE_STEPS) => {
      const config = ONBOARDING_LIFESTYLE_STEPS[currentStep];
      const currentProgress = progressRef.current;
      const currentFlow = flowDataRef.current;
      const nextProgress = recordAnswer(currentProgress, currentStep, { [config.field]: answer });
      const updated = { ...currentFlow, [config.field]: answer };
      setFlowData(updated);
      flowDataRef.current = updated;
      persist(nextProgress, currentStep, updated);
      pushUser(answer);

      if (config.next === "proposal") {
        setStep("proposal");
        stepRef.current = "proposal";
        const empathy = t("onboarding.empathyLifestyleAnswer", { answer });
        pushAi(`${empathy}\n\n${t("onboarding.timeDetailLater")}\n\n${t("onboarding.generating")}`);
        setIsLoading(true);
        isLoadingRef.current = true;
        try {
          const reply = await fetchProposal(buildOnboardingProposalPrompt(updated));
          const aiMsg = createAiChatMessageFromReply(reply.content, reply);
          setMessages(prev => {
            const next = [...prev.slice(0, -1), { type: "ai" as const, text: aiMsg.text, scheduleReflection: aiMsg.scheduleReflection }];
            messagesRef.current = next;
            return next;
          });
          setMessages(prev => {
            const next: OnboardingMessage[] = [
              ...prev,
              {
                type: "ai",
                text: aiMsg.scheduleReflection ? t("onboarding.applyPrompt") : t("onboarding.completeFallback"),
                choices: aiMsg.scheduleReflection ? [t("onboarding.applyAndContinue")] : [t("onboarding.continueToIntegrations")],
              },
            ];
            messagesRef.current = next;
            return next;
          });
        } catch (err) {
          console.error("[Onboarding] proposal fetch failed:", err);
          setMessages(prev => {
            const next: OnboardingMessage[] = [
              ...prev.slice(0, -1),
              { type: "ai", text: t("onboarding.proposalFailed"), choices: [t("onboarding.continueToIntegrations")] },
            ];
            messagesRef.current = next;
            return next;
          });
        } finally {
          setIsLoading(false);
          isLoadingRef.current = false;
        }
        return;
      }

      setStep(config.next);
      stepRef.current = config.next;
      pushTransition(currentStep, answer, config.next, updated);
    },
    [fetchProposal, persist, pushAi, pushTransition, pushUser, t],
  );

  const processAnswer = useCallback(
    async (answer: string) => {
      const text = answer.trim();
      if (!text || isLoadingRef.current || processingRef.current) return;

      processingRef.current = true;
      try {
        const currentStep = stepRef.current;
        const currentProgress = progressRef.current;
        const currentFlow = flowDataRef.current;
        const currentMessages = messagesRef.current;

        if (text === t("onboarding.applyAndContinue") || text === t("onboarding.continueToIntegrations")) {
          onQuestionnaireDone(
            currentFlow,
            [...currentMessages].reverse().find(m => m.scheduleReflection)?.scheduleReflection ?? null,
          );
          return;
        }
        if (text === t("onboarding.deferQuestion")) {
          const nextProgress = recordDefer(currentProgress, currentStep);
          persist(nextProgress, currentStep, currentFlow);
          pushUser(text);
          pushAi(t("onboarding.deferredAck"));
          window.setTimeout(() => onDeferToHome(flowDataRef.current), 1800);
          return;
        }
        if (text === t("onboarding.skipQuestionnaire")) {
          const nextProgress = recordSkipToHome(currentProgress, currentStep);
          persist(nextProgress, currentStep, currentFlow);
          pushUser(text);
          pushAi(t("onboarding.skippedAck"));
          window.setTimeout(() => onDeferToHome(flowDataRef.current), 1200);
          return;
        }
        if (currentStep === "gender") {
          const updated = { ...currentFlow, gender: text };
          const nextProgress = recordAnswer(currentProgress, "gender", { gender: text });
          setFlowData(updated);
          flowDataRef.current = updated;
          persist(nextProgress, "name", updated);
          pushUser(text);
          setStep("name");
          stepRef.current = "name";
          pushTransition("gender", text, "name", updated);
          return;
        }
        if (currentStep === "goal") {
          if (text === ONBOARDING_GOAL_FREE_LABEL) {
            pushUser(text);
            pushAi(t("onboarding.goalFreeHint"));
            return;
          }
          const goal = parseOnboardingGoalChoice(text) ?? text;
          if (!goal) return;
          const updated = { ...currentFlow, goal };
          const nextProgress = recordAnswer(currentProgress, "goal", { goal });
          setFlowData(updated);
          flowDataRef.current = updated;
          persist(nextProgress, "birthdate", updated);
          pushUser(text);
          setStep("birthdate");
          stepRef.current = "birthdate";
          pushTransition("goal", text, "birthdate", updated);
          return;
        }
        if (currentStep === "birthdate") {
          const updated = { ...currentFlow, birthDate: text };
          const nextProgress = recordAnswer(currentProgress, "birthdate", { birthDate: text });
          setFlowData(updated);
          flowDataRef.current = updated;
          persist(nextProgress, "gender", updated);
          pushUser(text);
          setStep("gender");
          stepRef.current = "gender";
          pushTransition("birthdate", text, "gender", updated);
          return;
        }
        if (currentStep === "name") {
          if (text === t("onboarding.skip")) {
            const nextProgress = recordAnswer(currentProgress, "name", currentFlow);
            persist(nextProgress, "bedtime", currentFlow);
            pushUser(text);
            goToLifestyle("bedtime", "name", text, currentFlow);
            return;
          }
          const updated = { ...currentFlow, nickname: text, name: text };
          const nextProgress = recordAnswer(currentProgress, "name", { nickname: text, name: text });
          setFlowData(updated);
          flowDataRef.current = updated;
          persist(nextProgress, "bedtime", updated);
          pushUser(text);
          goToLifestyle("bedtime", "name", text, updated);
          return;
        }
        if (
          currentStep === "bedtime" ||
          currentStep === "wake" ||
          currentStep === "bath" ||
          currentStep === "sleep_duration"
        ) {
          await handleLifestyleAnswer(text, currentStep);
          return;
        }

        if (currentStep === "proposal") {
          // 自由入力はAIに渡す
          pushUser(text);
          setIsLoading(true);
          isLoadingRef.current = true;
          try {
            const reply = await fetchProposal(text);
            const aiMsg = createAiChatMessageFromReply(reply.content, reply);
            pushAi(aiMsg.text, [t("onboarding.continueToIntegrations")]);
          } catch {
            pushAi(t("onboarding.proposalFailed"), [t("onboarding.continueToIntegrations")]);
          } finally {
            setIsLoading(false);
            isLoadingRef.current = false;
          }
          return;
        }

        console.warn("[Onboarding] Unhandled step:", currentStep, "answer:", text);
      } catch (err) {
        console.error("[Onboarding] processAnswer failed:", err);
      } finally {
        processingRef.current = false;
      }
    },
    [fetchProposal, goToLifestyle, handleLifestyleAnswer, onDeferToHome, onQuestionnaireDone, persist, pushAi, pushTransition, pushUser, t],
  );

  const handleChoice = useCallback(
    (choice: string) => {
      void processAnswer(choice);
    },
    [processAnswer],
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isLoadingRef.current) return;
    setInput("");
    void processAnswer(text);
  }, [input, processAnswer]);

  const handleDeferQuestion = useCallback(() => {
    void processAnswer(t("onboarding.deferQuestion"));
  }, [processAnswer, t]);

  const handleSkipQuestionnaire = useCallback(() => {
    void processAnswer(t("onboarding.skipQuestionnaire"));
  }, [processAnswer, t]);

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
                  <button
                    key={j}
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleChoice(c)}
                    style={{ background: "#ede5d4", border: "1.5px solid rgba(60,40,20,0.12)", borderRadius: 20, padding: "8px 16px", fontSize: 13, cursor: isLoading ? "default" : "pointer", color: "#3d3228", opacity: isLoading ? 0.6 : 1 }}
                  >
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

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 16,
          padding: "8px 20px 10px",
          background: "#f5f0e8",
          borderTop: "1px solid rgba(60,40,20,0.08)",
        }}
      >
        <button
          type="button"
          onClick={handleDeferQuestion}
          disabled={isLoading}
          style={{
            background: "none",
            border: "none",
            color: "#8b7355",
            fontSize: 12,
            cursor: isLoading ? "default" : "pointer",
            textDecoration: "underline",
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          {t("onboarding.deferQuestion")}
        </button>
        <button
          type="button"
          onClick={handleSkipQuestionnaire}
          disabled={isLoading}
          style={{
            background: "none",
            border: "none",
            color: "#8b7355",
            fontSize: 12,
            cursor: isLoading ? "default" : "pointer",
            textDecoration: "underline",
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          {t("onboarding.skipQuestionnaire")}
        </button>
      </div>

      <div style={{ padding: "12px 16px 24px", background: "white", borderTop: "1px solid rgba(60,40,20,0.1)", display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t("onboarding.messagePlaceholder")}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onKeyDown={e => handleAiChatEnterSendKeyDown(e, handleSend, isComposing)}
          rows={2}
          disabled={isLoading}
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
          onClick={handleSend}
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
          {t("chat.send")}
        </button>
      </div>
    </div>
  );
}
