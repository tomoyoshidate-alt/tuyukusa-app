"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { ChatMarkdown } from "@/src/components/ChatMarkdown";
import { handleAiChatEnterSendKeyDown } from "@/src/lib/chatSubmitKeyboard";
import {
  buildOnboardingProposalPrompt,
  isOnboardingFreeInputChoice,
  parseOnboardingGoalChoice,
  type OnboardingFlowData,
  type OnboardingStep,
} from "@/src/lib/onboarding";
import {
  getStructuredStepConfig,
  isStructuredOnboardingStep,
  parseCourseChoice,
  saveQuestionnaireCourse,
} from "@/src/lib/onboardingCourse";
import {
  buildOnboardingTransition,
  buildWelcomeMessage,
  buildWelcomeMessageFromIntro,
  getOnboardingStepPrompt,
} from "@/src/lib/onboardingResponses";
import { loadIntroDraft } from "@/src/lib/introStorage";
import {
  applyStoredProfileToProgress,
  hasVoiceHintBeenShown,
  INITIAL_ONBOARDING_PROGRESS,
  isQuestionAnswered,
  loadOnboardingProgress,
  markVoiceHintShown,
  ONBOARDING_PROFILE_STEPS,
  recordAnswer,
  resolveActiveQuestionStep,
  resolveNextStepAfter,
  saveOnboardingProgress,
  type OnboardingProgress,
} from "@/src/lib/onboardingProgress";
import type { ScheduleReflection } from "@/src/lib/scheduleReflection";
import { createAiChatMessageFromReply, type ChatReply } from "@/src/lib/chatReply";

type OnboardingMessage = {
  type: "ai" | "user";
  text: string;
  scheduleReflection?: ScheduleReflection;
};

type Props = {
  fetchProposal: (prompt: string) => Promise<ChatReply>;
  onQuestionnaireDone: (data: OnboardingFlowData, reflection: ScheduleReflection | null) => void;
  onDeferToHome: (data: OnboardingFlowData) => void;
};

function buildWelcomeMessages(t: (k: string) => string): OnboardingMessage[] {
  const introDraft = loadIntroDraft();
  const welcome = introDraft
    ? buildWelcomeMessageFromIntro(introDraft, t)
    : buildWelcomeMessage(t);
  return [
    { type: "ai", text: welcome.intro },
    { type: "ai", text: welcome.question },
  ];
}

function buildInitialFlowState(): {
  step: OnboardingStep;
  progress: OnboardingProgress;
  flowData: OnboardingFlowData;
} {
  const savedProgress = loadOnboardingProgress();
  const progress = applyStoredProfileToProgress(savedProgress ?? INITIAL_ONBOARDING_PROGRESS);
  const step = resolveActiveQuestionStep(progress);
  return { step, progress, flowData: progress.flowData };
}

function shouldShowGoalWelcome(
  progress: OnboardingProgress,
  existingMessages: OnboardingMessage[] = [],
): boolean {
  if (isQuestionAnswered(progress, "goal")) return false;
  if (progress.flowData.goal?.trim()) return false;
  if (existingMessages.some(message => message.type === "user")) return false;
  return true;
}

function buildInitialMessages(
  step: OnboardingStep,
  t: (k: string) => string,
  progress: OnboardingProgress,
  existingMessages: OnboardingMessage[] = [],
): OnboardingMessage[] {
  if (step === "goal") {
    if (shouldShowGoalWelcome(progress, existingMessages)) return buildWelcomeMessages(t);
    const prompt = getOnboardingStepPrompt("goal", t);
    return prompt.question ? [{ type: "ai", text: prompt.question }] : [];
  }
  const prompt = getOnboardingStepPrompt(step, t);
  if (!prompt.question) return [];
  return [{ type: "ai", text: prompt.question }];
}

export function OnboardingScreen({ fetchProposal, onQuestionnaireDone, onDeferToHome }: Props) {
  const { t } = useTranslation();
  const initialState = buildInitialFlowState();
  const initialStep = initialState.step;

  const [step, setStep] = useState<OnboardingStep>(initialStep);
  const [flowData, setFlowData] = useState<OnboardingFlowData>(initialState.flowData);
  const [progress, setProgress] = useState<OnboardingProgress>(initialState.progress);
  const [messages, setMessages] = useState<OnboardingMessage[]>(() =>
    buildInitialMessages(initialStep, t, initialState.progress),
  );
  const [input, setInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [proposalReady, setProposalReady] = useState(false);
  const [showVoiceHint, setShowVoiceHint] = useState(() => !hasVoiceHintBeenShown());
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const processingRef = useRef(false);
  const awaitingFreeInputRef = useRef<OnboardingStep | null>(null);
  const profileSyncedRef = useRef(false);

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
    if (profileSyncedRef.current) return;
    profileSyncedRef.current = true;

    const synced = applyStoredProfileToProgress(progressRef.current);
    const goalAnswered = isQuestionAnswered(synced, "goal");
    const hasUserMessages = messagesRef.current.some(message => message.type === "user");

    setProgress(synced);
    progressRef.current = synced;
    setFlowData(synced.flowData);
    flowDataRef.current = synced.flowData;

    if (!goalAnswered && !hasUserMessages) {
      const syncedStep = resolveActiveQuestionStep(synced);
      if (syncedStep !== "goal" || !shouldShowGoalWelcome(synced, messagesRef.current)) {
        setStep(syncedStep);
        stepRef.current = syncedStep;
        if (syncedStep !== initialStep) {
          const nextMessages = buildInitialMessages(syncedStep, t, synced, messagesRef.current);
          setMessages(nextMessages);
          messagesRef.current = nextMessages;
        }
      }
    }

    saveOnboardingProgress({
      ...synced,
      currentStep: stepRef.current,
    });
  }, [initialStep, t]);

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

  const pushAi = useCallback((text: string, extra?: Partial<Pick<OnboardingMessage, "scheduleReflection">>) => {
    setMessages(prev => {
      const next = [...prev, { type: "ai" as const, text, ...extra }];
      messagesRef.current = next;
      return next;
    });
  }, []);

  const appendTransitionMessages = useCallback(
    (
      fromStep: OnboardingStep,
      answer: string,
      toStep: OnboardingStep,
      data: OnboardingFlowData,
      includeUserMessage: boolean,
    ) => {
      const { empathyText, questionText } = buildOnboardingTransition(fromStep, answer, toStep, data, t);
      setMessages(prev => {
        const next: OnboardingMessage[] = [...prev];
        if (includeUserMessage) next.push({ type: "user", text: answer });
        if (empathyText) next.push({ type: "ai", text: empathyText });
        if (questionText) next.push({ type: "ai", text: questionText });
        else {
          const prompt = getOnboardingStepPrompt(toStep, t);
          if (prompt.question) next.push({ type: "ai", text: prompt.question });
        }
        messagesRef.current = next;
        return next;
      });
    },
    [t],
  );

  const advanceAfterAnswer = useCallback(
    (fromStep: OnboardingStep, answer: string, nextProgress: OnboardingProgress, updated: OnboardingFlowData) => {
      const nextStep = resolveNextStepAfter(fromStep, nextProgress);
      if (nextStep === fromStep || nextStep === "proposal") {
        console.error("[Onboarding] Step did not advance after answer:", fromStep, "->", nextStep);
        return;
      }
      persist(nextProgress, nextStep, updated);
      setStep(nextStep);
      stepRef.current = nextStep;
      appendTransitionMessages(fromStep, answer, nextStep, updated, true);
    },
    [appendTransitionMessages, persist],
  );

  const skipAnsweredProfileStep = useCallback(
    (currentStep: OnboardingStep, currentProgress: OnboardingProgress, currentFlow: OnboardingFlowData) => {
      if (!ONBOARDING_PROFILE_STEPS.includes(currentStep)) return false;
      if (!isQuestionAnswered(currentProgress, currentStep)) return false;
      const nextStep = resolveNextStepAfter(currentStep, currentProgress);
      if (nextStep === currentStep || nextStep === "proposal") return false;
      persist(currentProgress, nextStep, currentFlow);
      setStep(nextStep);
      stepRef.current = nextStep;
      const prompt = getOnboardingStepPrompt(nextStep, t);
      if (prompt.question) {
        setMessages(prev => {
          const next: OnboardingMessage[] = [...prev, { type: "ai", text: prompt.question }];
          messagesRef.current = next;
          return next;
        });
      }
      return true;
    },
    [persist, t],
  );

  const startProposalGeneration = useCallback(
    async (answer: string, updated: OnboardingFlowData) => {
      awaitingFreeInputRef.current = null;
      setStep("proposal");
      stepRef.current = "proposal";
      setProposalReady(false);
      pushAi(t("onboarding.generating"));
      setIsLoading(true);
      isLoadingRef.current = true;
      try {
        const reply = await fetchProposal(buildOnboardingProposalPrompt(updated));
        const aiMsg = createAiChatMessageFromReply(reply.content, reply);
        const reflection = aiMsg.scheduleReflection ?? null;
        setMessages(prev => {
          const next: OnboardingMessage[] = [
            ...prev.slice(0, -1),
            {
              type: "ai",
              text: aiMsg.text,
              scheduleReflection: reflection ?? undefined,
            },
            {
              type: "ai",
              text: reflection ? t("onboarding.applyPrompt") : t("onboarding.completeFallback"),
            },
          ];
          messagesRef.current = next;
          return next;
        });
        setProposalReady(true);
      } catch (err) {
        console.error("[Onboarding] proposal fetch failed:", err);
        setMessages(prev => {
          const next: OnboardingMessage[] = [
            ...prev.slice(0, -1),
            { type: "ai", text: t("onboarding.proposalFailed") },
          ];
          messagesRef.current = next;
          return next;
        });
        setProposalReady(true);
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    },
    [fetchProposal, pushAi, t],
  );

  const handleStructuredStepAnswer = useCallback(
    async (answer: string, currentStep: OnboardingStep) => {
      const config = getStructuredStepConfig(currentStep);
      if (!config) return;
      if (isOnboardingFreeInputChoice(answer) && awaitingFreeInputRef.current !== currentStep) return;

      awaitingFreeInputRef.current = null;
      const currentProgress = progressRef.current;
      const currentFlow = flowDataRef.current;
      const patch = { [config.field]: answer } as Partial<OnboardingFlowData>;
      const nextProgress = recordAnswer(currentProgress, currentStep, patch);
      const updated = { ...currentFlow, ...patch };
      setFlowData(updated);
      flowDataRef.current = updated;

      const nextStep = resolveNextStepAfter(currentStep, nextProgress);
      if (nextStep === currentStep) {
        console.error("[Onboarding] Structured step did not advance:", currentStep);
        return;
      }
      if (nextStep === "proposal") {
        await startProposalGeneration(answer, updated);
        return;
      }

      persist(nextProgress, nextStep, updated);
      setStep(nextStep);
      stepRef.current = nextStep;
      appendTransitionMessages(currentStep, answer, nextStep, updated, true);
    },
    [appendTransitionMessages, persist, startProposalGeneration],
  );

  const processAnswer = useCallback(
    async (answer: string) => {
      const text = answer.trim();
      if (!text || isLoadingRef.current || processingRef.current) return;

      processingRef.current = true;
      try {
        const currentProgress = progressRef.current;
        const currentFlow = flowDataRef.current;
        let currentStep = stepRef.current;
        if (isQuestionAnswered(currentProgress, "goal")) {
          if (currentStep === "goal") {
            currentStep = resolveActiveQuestionStep(currentProgress);
            setStep(currentStep);
            stepRef.current = currentStep;
          }
        } else {
          currentStep = "goal";
        }
        if (skipAnsweredProfileStep(currentStep, currentProgress, currentFlow)) return;
        if (currentStep === "goal") {
          if (isOnboardingFreeInputChoice(text) && awaitingFreeInputRef.current !== "goal") return;
          awaitingFreeInputRef.current = null;
          const goal = parseOnboardingGoalChoice(text) ?? text;
          const updated = { ...currentFlow, goal };
          const nextProgress = recordAnswer(currentProgress, "goal", { goal });
          const nextStep = resolveNextStepAfter("goal", nextProgress);
          if (nextStep === "goal" || nextStep === "proposal") {
            console.error("[Onboarding] Goal answer did not advance:", nextStep);
            return;
          }
          setFlowData(updated);
          flowDataRef.current = updated;
          progressRef.current = { ...nextProgress, flowData: updated, currentStep: nextStep };
          setStep(nextStep);
          stepRef.current = nextStep;
          persist(nextProgress, nextStep, updated);
          appendTransitionMessages("goal", text, nextStep, updated, true);
          return;
        }
        if (currentStep === "gender") {
          const updated = { ...currentFlow, gender: text };
          const nextProgress = recordAnswer(currentProgress, "gender", { gender: text });
          setFlowData(updated);
          flowDataRef.current = updated;
          advanceAfterAnswer("gender", text, nextProgress, updated);
          return;
        }
        if (currentStep === "birthdate") {
          if (isOnboardingFreeInputChoice(text) && awaitingFreeInputRef.current !== "birthdate") return;
          awaitingFreeInputRef.current = null;
          const updated = { ...currentFlow, birthDate: text };
          const nextProgress = recordAnswer(currentProgress, "birthdate", { birthDate: text });
          setFlowData(updated);
          flowDataRef.current = updated;
          advanceAfterAnswer("birthdate", text, nextProgress, updated);
          return;
        }
        if (currentStep === "course") {
          const course = parseCourseChoice(text) ?? "standard";
          saveQuestionnaireCourse(course);
          const updated = { ...currentFlow, questionnaireCourse: course };
          const nextProgress = recordAnswer(currentProgress, "course", { questionnaireCourse: course });
          setFlowData(updated);
          flowDataRef.current = updated;
          advanceAfterAnswer("course", text, nextProgress, updated);
          return;
        }
        if (currentStep === "name") {
          if (text === t("onboarding.defaultNicknameChoice")) {
            const nickname = "あなた";
            const updated = { ...currentFlow, nickname, name: nickname };
            const nextProgress = recordAnswer(currentProgress, "name", { nickname, name: nickname });
            setFlowData(updated);
            flowDataRef.current = updated;
            advanceAfterAnswer("name", text, nextProgress, updated);
            return;
          }
          if (text === t("onboarding.skip")) {
            const nextProgress = recordAnswer(currentProgress, "name", currentFlow);
            advanceAfterAnswer("name", text, nextProgress, currentFlow);
            return;
          }
          const updated = { ...currentFlow, nickname: text, name: text };
          const nextProgress = recordAnswer(currentProgress, "name", { nickname: text, name: text });
          setFlowData(updated);
          flowDataRef.current = updated;
          advanceAfterAnswer("name", text, nextProgress, updated);
          return;
        }
        if (isStructuredOnboardingStep(currentStep)) {
          await handleStructuredStepAnswer(text, currentStep);
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
            pushAi(aiMsg.text, { scheduleReflection: aiMsg.scheduleReflection });
            setProposalReady(true);
          } catch {
            pushAi(t("onboarding.proposalFailed"));
            setProposalReady(true);
          } finally {
            setIsLoading(false);
            isLoadingRef.current = false;
          }
          return;
        }

        if (isStructuredOnboardingStep(currentStep)) {
          await handleStructuredStepAnswer(text, currentStep);
          return;
        }
        console.warn("[Onboarding] Unhandled step:", currentStep, "answer:", text);
      } catch (err) {
        console.error("[Onboarding] processAnswer failed:", err);
      } finally {
        processingRef.current = false;
      }
    },
    [advanceAfterAnswer, appendTransitionMessages, fetchProposal, handleStructuredStepAnswer, persist, pushAi, pushUser, skipAnsweredProfileStep, t],
  );

  const handleChoice = useCallback(
    (choice: string) => {
      if (isOnboardingFreeInputChoice(choice)) {
        awaitingFreeInputRef.current = stepRef.current;
        window.setTimeout(() => inputRef.current?.focus(), 0);
        return;
      }
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

  const handleSaveAndDefer = useCallback(() => {
    const currentStep = stepRef.current;
    const currentProgress = progressRef.current;
    const currentFlow = flowDataRef.current;
    const merged: OnboardingProgress = {
      ...currentProgress,
      flowData: currentFlow,
      pausedAtStep: currentStep,
      currentStep,
    };
    saveOnboardingProgress(merged);
    onDeferToHome(currentFlow);
  }, [onDeferToHome]);

  const handleGoToIntegrations = useCallback(() => {
    const currentFlow = flowDataRef.current;
    const reflection =
      [...messagesRef.current].reverse().find(m => m.scheduleReflection)?.scheduleReflection ?? null;
    onQuestionnaireDone(currentFlow, reflection);
  }, [onQuestionnaireDone]);

  const currentStepPrompt = getOnboardingStepPrompt(step, t);
  const lastMessage = messages[messages.length - 1];
  const showStepChoices =
    !isLoading &&
    !proposalReady &&
    step !== "proposal" &&
    !isQuestionAnswered(progress, step) &&
    currentStepPrompt.choices.length > 0 &&
    lastMessage?.type !== "user";

  const footerButtonStyle = (enabled: boolean): CSSProperties => ({
    flex: 1,
    minWidth: 0,
    padding: "10px 8px",
    borderRadius: 10,
    border: "1.5px solid rgba(60,40,20,0.12)",
    background: enabled ? "#ede5d4" : "#f0ebe3",
    color: "#3d3228",
    fontSize: 11,
    fontWeight: "bold",
    cursor: enabled && !isLoading ? "pointer" : "default",
    opacity: enabled && !isLoading ? 1 : 0.45,
    lineHeight: 1.35,
    whiteSpace: "pre-line",
    textAlign: "center",
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 20000, background: "#f5f0e8", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 22, fontWeight: "bold", color: "#1a1410" }}>{t("common.appName")}</div>
        </div>
        {messages.map((msg, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: msg.type === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "88%", padding: "12px 14px", borderRadius: 18, fontSize: 14, lineHeight: 1.75, background: msg.type === "user" ? "#1a1410" : "white", color: msg.type === "user" ? "#f5f0e8" : "#1a1410", border: msg.type === "ai" ? "1px solid rgba(60,40,20,0.1)" : "none" }}>
                {msg.type === "ai" ? <ChatMarkdown text={msg.text} variant="ai" /> : msg.text}
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
          </div>
        ))}
        {showStepChoices && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {currentStepPrompt.choices.map((c, j) => (
              <button
                key={`step-choice-${j}`}
                type="button"
                disabled={isLoading}
                onClick={() => handleChoice(c)}
                style={{ background: "#ede5d4", border: "1.5px solid rgba(60,40,20,0.12)", borderRadius: 20, padding: "8px 16px", fontSize: 13, cursor: isLoading ? "default" : "pointer", color: "#3d3228", opacity: isLoading ? 0.6 : 1, whiteSpace: "pre-line", textAlign: "left", maxWidth: "100%" }}
              >
                {c}
              </button>
            ))}
          </div>
        )}
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
          gap: 8,
          padding: "10px 16px",
          background: "#f5f0e8",
          borderTop: "1px solid rgba(60,40,20,0.1)",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={handleSaveAndDefer}
          disabled={isLoading}
          style={footerButtonStyle(true)}
        >
          {t("onboarding.saveAndDefer")}
        </button>
        <button
          type="button"
          onClick={handleGoToIntegrations}
          disabled={isLoading}
          style={footerButtonStyle(true)}
        >
          {t("onboarding.goToIntegrations")}
        </button>
      </div>

      <div style={{ padding: "12px 16px 24px", background: "white", borderTop: "1px solid rgba(60,40,20,0.1)", display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea
          ref={inputRef}
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
